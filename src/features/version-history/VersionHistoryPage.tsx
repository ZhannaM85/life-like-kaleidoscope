import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import type { Memory, MemoryVersion } from '@/domain/memory'
import { getRepositories } from '@/stores'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

function savedOn(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
}

interface HistoryData {
  memory: Memory
  /** Oldest first, as the repository returns them. */
  versions: MemoryVersion[]
}

/**
 * Read-only version history of a memory (Epic 4). Every save — including the
 * first — is here; nothing can be changed or removed from this page, which is
 * the point.
 */
export function VersionHistoryPage() {
  const { id } = useParams()
  const [data, setData] = useState<HistoryData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { memories } = getRepositories()
        const memory = id ? await memories.getById(id) : undefined
        const versions = memory ? await memories.getVersions(memory.id) : []
        if (cancelled) return
        setData(memory ? { memory, versions } : null)
        setStatus(memory ? 'ready' : 'missing')
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

  if (status === 'loading') {
    return <p className="py-24 text-center text-muted-foreground">Leafing back…</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        Something went wrong opening this history. {error}
      </p>
    )
  }

  if (status === 'missing' || !data) {
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

  const { memory, versions } = data
  const newestFirst = [...versions].reverse()

  return (
    <div>
      <PageHeader
        title="Version history"
        description="Every saved version of this memory, newest first. Past versions are kept as written — they can be read here, never changed."
        action={
          <Link
            to={`/memories/${memory.id}`}
            className="font-sans text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            Back to the memory
          </Link>
        }
      />
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {newestFirst.map((version, index) => {
          const number = versions.length - index
          const isCurrent = version.id === memory.currentVersionId
          return (
            <li key={version.id}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Version {number}
                    {isCurrent && (
                      <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                        — current
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Saved {savedOn(version.editedAt)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {version.snapshot.title && (
                    <p className="m-0 font-medium">{version.snapshot.title}</p>
                  )}
                  <p className="m-0 whitespace-pre-wrap leading-relaxed">
                    {version.snapshot.story}
                  </p>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
