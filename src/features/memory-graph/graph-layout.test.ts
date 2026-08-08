import { describe, it, expect } from 'vitest'
import type { MemoryGraph } from '@/domain/memory-graph'
import { layoutMemoryGraph } from './graph-layout'

describe('layoutMemoryGraph', () => {
  it('positions every node exactly once, preserving id/type/label', () => {
    const graph: MemoryGraph = {
      nodes: [
        { id: 'memory:a', type: 'memory', label: 'Bicycle' },
        { id: 'person:p1', type: 'person', label: 'Aunt Vera' },
      ],
      edges: [{ source: 'memory:a', target: 'person:p1' }],
    }
    const layout = layoutMemoryGraph(graph)

    expect(layout.nodes).toHaveLength(2)
    expect(layout.edges).toBe(graph.edges)
    for (const node of layout.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(layout.width)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(layout.height)
    }
    const memoryNode = layout.nodes.find((n) => n.id === 'memory:a')
    expect(memoryNode).toMatchObject({ type: 'memory', label: 'Bicycle' })
  })

  it('is deterministic for the same graph', () => {
    const graph: MemoryGraph = {
      nodes: [
        { id: 'memory:a', type: 'memory', label: 'A' },
        { id: 'memory:b', type: 'memory', label: 'B' },
        { id: 'tag:t1', type: 'tag', label: 'childhood' },
      ],
      edges: [],
    }
    expect(layoutMemoryGraph(graph)).toEqual(layoutMemoryGraph(graph))
  })

  it('handles an empty graph', () => {
    const layout = layoutMemoryGraph({ nodes: [], edges: [] })
    expect(layout.nodes).toEqual([])
    expect(layout.edges).toEqual([])
  })

  it('places hub nodes on a smaller ring than memory nodes', () => {
    const cx = 300
    const cy = 300
    const graph: MemoryGraph = {
      nodes: [
        { id: 'memory:a', type: 'memory', label: 'A' },
        { id: 'tag:t1', type: 'tag', label: 'childhood' },
      ],
      edges: [],
    }
    const layout = layoutMemoryGraph(graph)
    const distanceFromCenter = (n: { x: number; y: number }) =>
      Math.hypot(n.x - cx, n.y - cy)

    const memoryNode = layout.nodes.find((n) => n.type === 'memory')!
    const tagNode = layout.nodes.find((n) => n.type === 'tag')!
    expect(distanceFromCenter(tagNode)).toBeLessThan(distanceFromCenter(memoryNode))
  })
})
