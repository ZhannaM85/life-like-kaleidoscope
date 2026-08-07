import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMemory } from '@/domain/memory'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { ensureUserProfile } from '@/domain/user'
import { getRepositories, useDailyPromptStore, useLocaleStore } from '@/stores'
import { allocatePhotos, persistPhotos, type PhotoChanges } from '@/features/photos'
import { PageHeader } from '@/shared/ui/page-header'
import { MemoryForm } from './MemoryForm'
import { memoryFieldsFromValues, resolveEntityIds, type MemoryFormValues } from './memory-form'

/**
 * The full create form (Epic 4) — the roomier sibling of the Today quick
 * entry, with title, approximate dates, people, places, and tags. New
 * memories attach to today's prompt, reusing the daily-prompt store so its
 * StrictMode-safe load guard keeps the day to a single prompt.
 */
export function MemoryNewPage() {
  const navigate = useNavigate()
  const { prompt, status: promptStatus, error: promptError, load } = useDailyPromptStore()
  const t = useLocaleStore((s) => s.dictionary)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  async function save(values: MemoryFormValues, photoChanges: PhotoChanges) {
    if (!prompt) return
    setSaving(true)
    setError(null)
    try {
      const repos = getRepositories()
      const fields = memoryFieldsFromValues(values)
      const { peopleIds, placeIds, tagIds } = await resolveEntityIds(
        fields,
        repos,
        defaultGenerateId
      )
      const profile = await ensureUserProfile(repos.userProfile, { generateId: defaultGenerateId })
      // Photo ids are allocated before creation so the memory's very first
      // version already carries the final photoIds — same reasoning as
      // resolving people/place/tag ids before createMemory runs.
      const photoAllocations = allocatePhotos(photoChanges.newFiles, defaultGenerateId)
      const created = createMemory(
        {
          promptId: prompt.id,
          title: fields.title,
          story: fields.story,
          approxAge: fields.approxAge,
          approxYear: fields.approxYear,
          mood: fields.mood,
          peopleIds,
          placeIds,
          tagIds,
          photoIds: photoAllocations.map((a) => a.id),
          authoredBy: profile.id,
        },
        { generateId: defaultGenerateId, now: nowIso }
      )
      await repos.memories.create(created)
      await persistPhotos(repos.photos, created.memory.id, photoAllocations)
      navigate(`/memories/${created.memory.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  if (promptStatus === 'loading' || (promptStatus === 'idle' && !prompt)) {
    return <p className="py-24 text-center text-muted-foreground">{t.memoryNew.opening}</p>
  }

  if (!prompt) {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.memoryNew.errorOpening(promptError ?? '')}
      </p>
    )
  }

  return (
    <div>
      <PageHeader title={t.memoryNew.title} description={t.memoryNew.description(prompt.word)} />
      {error && (
        <p role="alert" className="mb-6 font-sans text-sm text-destructive">
          {t.common.errorSaving(error)}
        </p>
      )}
      <MemoryForm
        defaultValues={{
          title: '',
          story: '',
          approxAge: '',
          approxYear: '',
          mood: '',
          people: '',
          places: '',
          tags: '',
        }}
        submitLabel={t.common.keepThisMemory}
        savingLabel={t.common.saving}
        saving={saving}
        cancelTo="/memories"
        onSubmit={(values, photoChanges) => void save(values, photoChanges)}
      />
    </div>
  )
}
