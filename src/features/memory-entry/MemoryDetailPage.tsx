import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, History, Pencil } from 'lucide-react'
import { getRepositories, useLocaleStore } from '@/stores'
import { localeTag, type Locale } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { usePhotoPreviews } from '@/shared/hooks'
import type { Photo } from '@/domain/memory'
import { Button, buttonVariants } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { loadMemoryContext, type MemoryContext } from './memory-context'

const NO_PHOTOS: Photo[] = []

function onDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(localeTag(locale), {
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
  const t = useLocaleStore((s) => s.dictionary)
  const locale = useLocaleStore((s) => s.locale)
  const [context, setContext] = useState<MemoryContext | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const photoPreviews = usePhotoPreviews(context?.photos ?? NO_PHOTOS)

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
    return <p className="py-24 text-center text-muted-foreground">{t.common.findingPage}</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.memoryDetail.errorOpening(error ?? '')}
      </p>
    )
  }

  if (status === 'missing' || !context) {
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

  const { memory, word, peopleNames, placeNames, tagLabels } = context
  const edited = memory.updatedAt !== memory.createdAt
  const when = [
    memory.approxAge !== undefined ? t.memoryDetail.aroundAge(memory.approxAge) : null,
    memory.approxYear !== undefined ? t.memoryDetail.aroundYear(memory.approxYear) : null,
  ].filter((part): part is string => part !== null)
  const hasDetails =
    when.length > 0 ||
    memory.mood !== undefined ||
    peopleNames.length > 0 ||
    placeNames.length > 0 ||
    tagLabels.length > 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={memory.title ?? word ?? t.memoryDetail.untitled}
        description={t.memoryDetail.description(
          onDate(memory.createdAt, locale),
          edited ? onDate(memory.updatedAt, locale) : null,
          word && memory.title ? word : null
        )}
        action={
          <Link
            to={`/memories/${memory.id}/edit`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <Pencil aria-hidden />
            {t.common.edit}
          </Link>
        }
      />

      <p className="m-0 whitespace-pre-wrap leading-relaxed">{memory.story}</p>

      {photoPreviews.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {photoPreviews.map((photo) => (
            <li key={photo.id}>
              <img
                src={photo.url}
                alt={photo.caption ?? ''}
                className="h-40 w-40 rounded-md border border-border object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {hasDetails && (
        <dl className="m-0 flex flex-col gap-1.5 border-t border-border pt-4 font-sans text-sm text-muted-foreground">
          {when.length > 0 && <DetailRow label={t.memoryDetail.whenLabel} value={when.join(', ')} />}
          {memory.mood !== undefined && (
            <DetailRow label={t.memoryDetail.moodLabel} value={t.mood[memory.mood]} />
          )}
          {peopleNames.length > 0 && <DetailRow label={t.common.people} value={peopleNames.join(', ')} />}
          {placeNames.length > 0 && <DetailRow label={t.common.places} value={placeNames.join(', ')} />}
          {tagLabels.length > 0 && <DetailRow label={t.common.tags} value={tagLabels.join(', ')} />}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 font-sans text-sm">
        <Link
          to={`/memories/${memory.id}/history`}
          className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          <History aria-hidden className="size-4" />
          {t.memoryDetail.versionHistory}
        </Link>
        <Link
          to="/memories"
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t.common.allMemories}
        </Link>
        <div className="ml-auto">
          {confirmingDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{t.memoryDetail.deleteWarning}</span>
              <Button variant="destructive" size="sm" onClick={() => void deleteMemory()}>
                {t.common.delete}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                {t.memoryDetail.keepIt}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              {t.memoryDetail.deleteThisMemory}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
