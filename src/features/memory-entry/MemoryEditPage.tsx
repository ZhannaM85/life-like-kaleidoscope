import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { editMemory, type MemoryEdit } from '@/domain/memory'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { getRepositories } from '@/stores'
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

  async function save(values: MemoryFormValues) {
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
      const edit: MemoryEdit = {
        title: fields.title,
        story: fields.story,
        approxAge: fields.approxAge,
        approxYear: fields.approxYear,
        peopleIds,
        placeIds,
        tagIds,
      }
      const updated = editMemory(context.memory, edit, {
        generateId: defaultGenerateId,
        now: nowIso,
      })
      await repos.memories.update(updated)
      navigate(`/memories/${context.memory.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return <p className="py-24 text-center text-muted-foreground">Finding that page…</p>
  }

  if (status === 'missing') {
    return (
      <EmptyState
        icon={BookOpen}
        title="This memory isn't here"
        description="It may have been deleted, or the link is old."
        action={
          <Link
            to="/memories"
            className="font-sans text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            Back to all memories
          </Link>
        }
      />
    )
  }

  if (!context) {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        Something went wrong opening this memory. {error}
      </p>
    )
  }

  const { memory, word } = context

  return (
    <div>
      <PageHeader
        title="Edit memory"
        description={`Every save is kept — the earlier versions stay in this memory's history.${
          word ? ` Inspired by the word “${word}”.` : ''
        }`}
      />
      {error && (
        <p role="alert" className="mb-6 font-sans text-sm text-destructive">
          Something went wrong saving. {error}
        </p>
      )}
      <MemoryForm
        defaultValues={{
          title: memory.title ?? '',
          story: memory.story,
          approxAge: memory.approxAge?.toString() ?? '',
          approxYear: memory.approxYear?.toString() ?? '',
          people: context.peopleNames.join(', '),
          places: context.placeNames.join(', '),
          tags: context.tagLabels.join(', '),
        }}
        submitLabel="Save changes"
        savingLabel="Saving…"
        saving={status === 'saving'}
        cancelTo={`/memories/${memory.id}`}
        onSubmit={(values) => void save(values)}
      />
    </div>
  )
}
