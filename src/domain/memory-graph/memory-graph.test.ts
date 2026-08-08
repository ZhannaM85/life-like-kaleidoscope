import { describe, it, expect } from 'vitest'
import type { Memory } from '@/domain/memory'
import type { Person } from '@/domain/person'
import type { Place } from '@/domain/place'
import type { Tag } from '@/domain/tag'
import { buildMemoryGraph } from './index'

function makeMemory(id: string, overrides: Partial<Memory> = {}): Memory {
  return {
    id,
    promptId: 'prompt-1',
    story: `story-${id}`,
    peopleIds: [],
    placeIds: [],
    tagIds: [],
    photoIds: [],
    authoredBy: 'user-1',
    aboutWhom: 'user-1',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    currentVersionId: `v-${id}`,
    ...overrides,
  }
}

const words = new Map([['prompt-1', 'Bicycle']])
const vera: Person = { id: 'p1', name: 'Aunt Vera' }
const dacha: Place = { id: 'pl1', name: 'The dacha' }
const childhood: Tag = { id: 't1', label: 'childhood' }

describe('buildMemoryGraph', () => {
  it('adds a node for every memory, even one with no shared references', () => {
    const memory = makeMemory('a')
    const graph = buildMemoryGraph([memory], words, [], [], [])

    expect(graph.nodes).toEqual([{ id: 'memory:a', type: 'memory', label: 'Bicycle' }])
    expect(graph.edges).toEqual([])
  })

  it('falls back to the title, then a story excerpt, when no prompt word is found', () => {
    const untitled = makeMemory('a', { promptId: 'missing-prompt' })
    const titled = makeMemory('b', { promptId: 'missing-prompt', title: 'The jam shelf' })
    const graph = buildMemoryGraph([untitled, titled], words, [], [], [])

    expect(graph.nodes.find((n) => n.id === 'memory:a')?.label).toBe('story-a')
    expect(graph.nodes.find((n) => n.id === 'memory:b')?.label).toBe('The jam shelf')
  })

  it('connects a memory to its people, places, and tags with an edge each way', () => {
    const memory = makeMemory('a', { peopleIds: ['p1'], placeIds: ['pl1'], tagIds: ['t1'] })
    const graph = buildMemoryGraph([memory], words, [vera], [dacha], [childhood])

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        { id: 'memory:a', type: 'memory', label: 'Bicycle' },
        { id: 'person:p1', type: 'person', label: 'Aunt Vera' },
        { id: 'place:pl1', type: 'place', label: 'The dacha' },
        { id: 'tag:t1', type: 'tag', label: 'childhood' },
      ])
    )
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { source: 'memory:a', target: 'person:p1' },
        { source: 'memory:a', target: 'place:pl1' },
        { source: 'memory:a', target: 'tag:t1' },
      ])
    )
  })

  it('omits a person/place/tag no memory actually references', () => {
    const memory = makeMemory('a')
    const graph = buildMemoryGraph([memory], words, [vera], [dacha], [childhood])

    expect(graph.nodes.some((n) => n.type === 'person')).toBe(false)
    expect(graph.nodes.some((n) => n.type === 'place')).toBe(false)
    expect(graph.nodes.some((n) => n.type === 'tag')).toBe(false)
  })

  it('shares one hub node across multiple memories, one edge per memory', () => {
    const a = makeMemory('a', { peopleIds: ['p1'] })
    const b = makeMemory('b', { peopleIds: ['p1'] })
    const graph = buildMemoryGraph([a, b], words, [vera], [], [])

    expect(graph.nodes.filter((n) => n.id === 'person:p1')).toHaveLength(1)
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { source: 'memory:a', target: 'person:p1' },
        { source: 'memory:b', target: 'person:p1' },
      ])
    )
  })

  it('returns an empty graph for no memories', () => {
    expect(buildMemoryGraph([], words, [vera], [dacha], [childhood])).toEqual({
      nodes: [],
      edges: [],
    })
  })
})
