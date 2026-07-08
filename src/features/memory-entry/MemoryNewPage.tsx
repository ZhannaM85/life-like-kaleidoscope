import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMemory } from '@/domain/memory'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { ensureUserProfile } from '@/domain/user'
import { getRepositories, useDailyPromptStore } from '@/stores'
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  async function save(values: MemoryFormValues) {
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
      const created = createMemory(
        {
          promptId: prompt.id,
          title: fields.title,
          story: fields.story,
          approxAge: fields.approxAge,
          approxYear: fields.approxYear,
          peopleIds,
          placeIds,
          tagIds,
          authoredBy: profile.id,
        },
        { generateId: defaultGenerateId, now: nowIso }
      )
      await repos.memories.create(created)
      navigate(`/memories/${created.memory.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  if (promptStatus === 'loading' || (promptStatus === 'idle' && !prompt)) {
    return <p className="py-24 text-center text-muted-foreground">Opening a fresh page…</p>
  }

  if (!prompt) {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        Something went wrong opening a fresh page. {promptError}
      </p>
    )
  }

  return (
    <div>
      <PageHeader
        title="New memory"
        description={`Inspired by today's word — “${prompt.word}”. Only the story itself is needed; the rest can wait.`}
      />
      {error && (
        <p role="alert" className="mb-6 font-sans text-sm text-destructive">
          Something went wrong saving. {error}
        </p>
      )}
      <MemoryForm
        defaultValues={{
          title: '',
          story: '',
          approxAge: '',
          approxYear: '',
          people: '',
          places: '',
          tags: '',
        }}
        submitLabel="Keep this memory"
        savingLabel="Saving…"
        saving={saving}
        cancelTo="/memories"
        onSubmit={(values) => void save(values)}
      />
    </div>
  )
}
