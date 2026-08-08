import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, PenLine } from 'lucide-react'
import type { Memory } from '@/domain/memory'
import type { Prompt } from '@/domain/prompt'
import { buildTimeline } from '@/domain/timeline'
import { useMemoriesStore, useLocaleStore } from '@/stores'
import { localeTag, type Dictionary, type Locale } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'

type MemoriesView = 'list' | 'timeline'

function writtenOn(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(localeTag(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface MemoryCardProps {
  memory: Memory
  word?: string
  /** Replaces the default "written on" line — used by the timeline view, where the group heading already carries the year. */
  subtitle?: string
}

function MemoryCard({ memory, word, subtitle }: MemoryCardProps) {
  return (
    <Link
      to={`/memories/${memory.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
    >
      <Card className="transition-colors hover:bg-muted/40">
        <CardHeader className="pb-3">
          {word && <CardTitle className="text-base">{word}</CardTitle>}
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed">{memory.story}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

interface TimelineViewProps {
  memories: Memory[]
  promptsById: Record<string, Prompt>
  t: Dictionary
}

/** Epic 7: grouped by the event's approx year, oldest first — "a life reads forward". */
function TimelineView({ memories, promptsById, t }: TimelineViewProps) {
  const timeline = useMemo(() => buildTimeline(memories), [memories])

  return (
    <div className="flex flex-col gap-10">
      {timeline.byYear.map((group) => (
        <section key={group.year} aria-label={String(group.year)}>
          <h2 className="mb-4 font-sans text-lg font-medium text-foreground">{group.year}</h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {group.memories.map((memory) => (
              <li key={memory.id}>
                <MemoryCard
                  memory={memory}
                  word={promptsById[memory.promptId]?.word}
                  subtitle={
                    memory.approxAge !== undefined
                      ? t.memoryDetail.aroundAge(memory.approxAge)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {timeline.undated.length > 0 && (
        <section aria-label={t.memories.undatedHeading}>
          <h2 className="mb-4 font-sans text-lg font-medium text-foreground">
            {t.memories.undatedHeading}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {timeline.undated.map((memory) => (
              <li key={memory.id}>
                <MemoryCard
                  memory={memory}
                  word={promptsById[memory.promptId]?.word}
                  subtitle={
                    memory.approxAge !== undefined
                      ? t.memoryDetail.aroundAge(memory.approxAge)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function MemoriesPage() {
  const { memories, promptsById, status, error, load } = useMemoriesStore()
  const t = useLocaleStore((s) => s.dictionary)
  const locale = useLocaleStore((s) => s.locale)
  const [view, setView] = useState<MemoriesView>('list')

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'loading' || status === 'idle') {
    return <p className="py-24 text-center text-muted-foreground">{t.memories.loading}</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.memories.errorLoading(error ?? '')}
      </p>
    )
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t.memories.emptyTitle}
        description={t.memories.emptyDescription}
        action={
          <Link
            to="/"
            className="font-sans text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            {t.common.goToTodaysWord}
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={t.memories.title}
        description={t.memories.description}
        action={
          <Link to="/memories/new" className={cn(buttonVariants({ variant: 'outline' }))}>
            <PenLine aria-hidden />
            {t.memories.writeAction}
          </Link>
        }
      />
      <div role="radiogroup" aria-label={t.memories.viewToggleLabel} className="mb-6 flex gap-2">
        <Button
          type="button"
          role="radio"
          aria-checked={view === 'list'}
          variant={view === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('list')}
        >
          {t.memories.viewList}
        </Button>
        <Button
          type="button"
          role="radio"
          aria-checked={view === 'timeline'}
          variant={view === 'timeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('timeline')}
        >
          {t.memories.viewTimeline}
        </Button>
      </div>
      {view === 'timeline' ? (
        <TimelineView memories={memories} promptsById={promptsById} t={t} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {memories.map((memory) => (
            <li key={memory.id}>
              <MemoryCard
                memory={memory}
                word={promptsById[memory.promptId]?.word}
                subtitle={writtenOn(memory.createdAt, locale)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
