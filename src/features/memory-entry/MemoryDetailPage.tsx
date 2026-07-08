import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, History, Pencil } from 'lucide-react'
import { getRepositories } from '@/stores'
import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { loadMemoryContext, type MemoryContext } from './memory-context'

function onDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface DetailRowProps {
  label: string
  value: string
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 font-medium text-foreground">{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  )
}

/** Memory detail view (Epic 4): the full story, its details, edit/history/delete. */
export function MemoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [context, setContext] = useState<MemoryContext | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

  async function deleteMemory() {
    if (!context) return
    try {
      await getRepositories().memories.delete(context.memory.id)
      navigate('/memories')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (status === 'loading') {
    return <p className="py-24 text-center text-muted-foreground">Finding that page…</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        Something went wrong opening this memory. {error}
      </p>
    )
  }

  if (status === 'missing' || !context) {
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

  const { memory, word, peopleNames, placeNames, tagLabels } = context
  const edited = memory.updatedAt !== memory.createdAt
  const when = [
    memory.approxAge !== undefined ? `around age ${memory.approxAge}` : null,
    memory.approxYear !== undefined ? `around ${memory.approxYear}` : null,
  ].filter((part): part is string => part !== null)
  const hasDetails =
    when.length > 0 || peopleNames.length > 0 || placeNames.length > 0 || tagLabels.length > 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={memory.title ?? word ?? 'A memory'}
        description={`Written ${onDate(memory.createdAt)}${
          edited ? `, last edited ${onDate(memory.updatedAt)}` : ''
        }${word && memory.title ? ` — inspired by the word “${word}”` : ''}`}
        action={
          <Link
            to={`/memories/${memory.id}/edit`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <Pencil aria-hidden />
            Edit
          </Link>
        }
      />

      <p className="m-0 whitespace-pre-wrap leading-relaxed">{memory.story}</p>

      {hasDetails && (
        <dl className="m-0 flex flex-col gap-1.5 border-t border-border pt-4 font-sans text-sm text-muted-foreground">
          {when.length > 0 && <DetailRow label="When" value={when.join(', ')} />}
          {peopleNames.length > 0 && <DetailRow label="People" value={peopleNames.join(', ')} />}
          {placeNames.length > 0 && <DetailRow label="Places" value={placeNames.join(', ')} />}
          {tagLabels.length > 0 && <DetailRow label="Tags" value={tagLabels.join(', ')} />}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 font-sans text-sm">
        <Link
          to={`/memories/${memory.id}/history`}
          className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          <History aria-hidden className="size-4" />
          Version history
        </Link>
        <Link
          to="/memories"
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          All memories
        </Link>
        <div className="ml-auto">
          {confirmingDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                This removes the memory and its whole history.
              </span>
              <Button variant="destructive" size="sm" onClick={() => void deleteMemory()}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete this memory
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
