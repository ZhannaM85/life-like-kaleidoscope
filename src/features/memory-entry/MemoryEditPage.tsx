import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { editMemory, type MemoryEdit } from '@/domain/memory'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { getRepositories, useLocaleStore } from '@/stores'
import { allocatePhotos, persistPhotos, type PhotoChanges } from '@/features/photos'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { MemoryForm } from './MemoryForm'
import { loadMemoryContext, type MemoryContext } from './memory-context'
import { memoryFieldsFromValues, resolveEntityIds, type MemoryFormValues } from './memory-form'

/**
 * Edit an existing memory (Epic 4). Saving never mutates in place — it goes
 * through `editMemory`, which appends a brand-new immutable MemoryVersion.
 */
export function MemoryEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useLocaleStore((s) => s.dictionary)
  const [context, setContext] = useState<MemoryContext | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'missing' | 'error'>(
    'loading'
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = id ? await loadMemoryContext(id) : undefined
        if (cancelled) return
        setContext(loaded ?? null)
        setStatus(loaded ? 'ready' : 'missing')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  async function save(values: MemoryFormValues, photoChanges: PhotoChanges) {
    if (!context) return
    setStatus('saving')
    setError(null)
    try {
      const repos = getRepositories()
      const fields = memoryFieldsFromValues(values)
      const { peopleIds, placeIds, tagIds } = await resolveEntityIds(
        fields,
        repos,
        defaultGenerateId
      )
      // New blobs are saved before the memory update, and removed ones only
      // deleted after it succeeds — a failed update never leaves the memory
      // referencing a photo id that's already gone.
      const photoAllocations = allocatePhotos(photoChanges.newFiles, defaultGenerateId)
      await persistPhotos(repos.photos, context.memory.id, photoAllocations)
      const keptPhotoIds = context.photos
        .map((p) => p.id)
        .filter((id) => !photoChanges.removedPhotoIds.includes(id))
      const edit: MemoryEdit = {
        title: fields.title,
        story: fields.story,
        approxAge: fields.approxAge,
        approxYear: fields.approxYear,
        mood: fields.mood,
        peopleIds,
        placeIds,
        tagIds,
        photoIds: [...keptPhotoIds, ...photoAllocations.map((a) => a.id)],
      }
      const updated = editMemory(context.memory, edit, {
        generateId: defaultGenerateId,
        now: nowIso,
      })
      await repos.memories.update(updated)
      await Promise.all(photoChanges.removedPhotoIds.map((id) => repos.photos.delete(id)))
      navigate(`/memories/${context.memory.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return <p className="py-24 text-center text-muted-foreground">{t.common.findingPage}</p>
  }

  if (status === 'missing') {
    return (
      <EmptyState
        icon={BookOpen}
        title={t.common.memoryNotFoundTitle}
        description={t.common.memoryNotFoundDescription}
        action={
          <Link
            to="/memories"
            className="font-sans text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            {t.common.backToAllMemories}
          </Link>
        }
      />
    )
  }

  if (!context) {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.memoryDetail.errorOpening(error ?? '')}
      </p>
    )
  }

  const { memory, word } = context

  return (
    <div>
      <PageHeader title={t.memoryEdit.title} description={t.memoryEdit.description(word)} />
      {error && (
        <p role="alert" className="mb-6 font-sans text-sm text-destructive">
          {t.common.errorSaving(error)}
        </p>
      )}
      <MemoryForm
        defaultValues={{
          title: memory.title ?? '',
          story: memory.story,
          approxAge: memory.approxAge?.toString() ?? '',
          approxYear: memory.approxYear?.toString() ?? '',
          mood: memory.mood ?? '',
          people: context.peopleNames.join(', '),
          places: context.placeNames.join(', '),
          tags: context.tagLabels.join(', '),
        }}
        initialPhotos={context.photos}
        submitLabel={t.memoryEdit.saveChanges}
        savingLabel={t.common.saving}
        saving={status === 'saving'}
        cancelTo={`/memories/${memory.id}`}
        onSubmit={(values, photoChanges) => void save(values, photoChanges)}
      />
    </div>
  )
}
