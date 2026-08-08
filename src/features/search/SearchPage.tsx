import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { getRepositories, useLocaleStore } from '@/stores'
import { searchMemories, type SearchContext } from '@/domain/search'
import type { Memory } from '@/domain/memory'
import { localeTag, type Locale } from '@/i18n'
import { PageHeader } from '@/shared/ui/page-header'
import { TextField } from '@/shared/ui/text-field'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'

function writtenOn(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(localeTag(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Epic 6 — a single query box filters the full local archive as you type,
 * across prompt words, story text, titles, and linked people/places/tags.
 * No store: search has no state worth sharing with any other screen.
 */
export function SearchPage() {
  const t = useLocaleStore((s) => s.dictionary)
  const locale = useLocaleStore((s) => s.locale)
  const [query, setQuery] = useState('')
  const [memories, setMemories] = useState<Memory[]>([])
  const [context, setContext] = useState<SearchContext | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const repos = getRepositories()
        const [loadedMemories, prompts, people, places, tags] = await Promise.all([
          repos.memories.getAll(),
          repos.prompts.getAll(),
          repos.people.getAll(),
          repos.places.getAll(),
          repos.tags.getAll(),
        ])
        if (cancelled) return
        setMemories(loadedMemories)
        setContext({
          wordByPromptId: new Map(prompts.map((p) => [p.id, p.word])),
          nameByPersonId: new Map(people.map((p) => [p.id, p.name])),
          nameByPlaceId: new Map(places.map((p) => [p.id, p.name])),
          labelByTagId: new Map(tags.map((tag) => [tag.id, tag.label])),
        })
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const results = useMemo(
    () => (context ? searchMemories(memories, query, context) : []),
    [memories, context, query]
  )
  const hasQuery = query.trim() !== ''

  if (status === 'loading') {
    return <p className="py-24 text-center text-muted-foreground">{t.searchPage.loading}</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.searchPage.errorLoading(error ?? '')}
      </p>
    )
  }

  return (
    <div>
      <PageHeader title={t.searchPage.title} description={t.searchPage.description} />
      <TextField
        label={t.searchPage.inputLabel}
        placeholder={t.searchPage.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-8"
      />
      {!hasQuery ? (
        <p className="font-sans text-sm text-muted-foreground">{t.searchPage.prompt}</p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={t.searchPage.emptyTitle}
          description={t.searchPage.emptyDescription}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {results.map((memory) => {
            const word = context?.wordByPromptId.get(memory.promptId)
            return (
              <li key={memory.id}>
                <Link
                  to={`/memories/${memory.id}`}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardHeader className="pb-3">
                      {word && <CardTitle className="text-base">{word}</CardTitle>}
                      <CardDescription>{writtenOn(memory.createdAt, locale)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed">
                        {memory.story}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
