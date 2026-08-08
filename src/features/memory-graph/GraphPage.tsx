import { useEffect, useMemo, useState } from 'react'
import { Share2 } from 'lucide-react'
import { getRepositories, useLocaleStore } from '@/stores'
import { buildMemoryGraph, type MemoryGraph } from '@/domain/memory-graph'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { layoutMemoryGraph } from './graph-layout'

/**
 * Epic 8 (basic) — a static, non-interactive rendering of `layoutMemoryGraph`:
 * shared people/places/tags on an inner ring, memories on an outer ring.
 * Rich exploration (zoom, drag, click-through) is explicitly deferred by the
 * issue to a later milestone; this is the data model plus a legible render.
 */
export function GraphPage() {
  const t = useLocaleStore((s) => s.dictionary)
  const [graph, setGraph] = useState<MemoryGraph | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const repos = getRepositories()
        const [memories, prompts, people, places, tags] = await Promise.all([
          repos.memories.getAll(),
          repos.prompts.getAll(),
          repos.people.getAll(),
          repos.places.getAll(),
          repos.tags.getAll(),
        ])
        if (cancelled) return
        const wordByPromptId = new Map(prompts.map((p) => [p.id, p.word]))
        setGraph(buildMemoryGraph(memories, wordByPromptId, people, places, tags))
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

  const layout = useMemo(() => (graph ? layoutMemoryGraph(graph) : null), [graph])

  if (status === 'loading') {
    return <p className="py-24 text-center text-muted-foreground">{t.graphPage.loading}</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.graphPage.errorLoading(error ?? '')}
      </p>
    )
  }

  return (
    <div>
      <PageHeader title={t.graphPage.title} description={t.graphPage.description} />
      {!layout || layout.nodes.length === 0 ? (
        <EmptyState
          icon={Share2}
          title={t.graphPage.emptyTitle}
          description={t.graphPage.emptyDescription}
        />
      ) : (
        <svg
          role="img"
          aria-label={t.graphPage.title}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="mx-auto w-full max-w-xl"
        >
          <g>
            {layout.edges.map((edge, i) => {
              const source = layout.nodes.find((n) => n.id === edge.source)
              const target = layout.nodes.find((n) => n.id === edge.target)
              if (!source || !target) return null
              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className="stroke-muted-foreground/25"
                  strokeWidth={1}
                />
              )
            })}
          </g>
          <g>
            {layout.nodes.map((node) => (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <title>{node.label}</title>
                {node.type === 'memory' ? (
                  <circle r={5} className="fill-foreground/70" />
                ) : (
                  <circle r={7} className="fill-background stroke-foreground" strokeWidth={1.5} />
                )}
                <text
                  y={node.type === 'memory' ? 16 : 20}
                  textAnchor="middle"
                  className="fill-muted-foreground font-sans text-[10px]"
                >
                  {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
