// Positioning is a presentation concern, deliberately kept out of
// domain/memory-graph — the data model shouldn't know about pixels.
import type { GraphEdge, GraphNode, MemoryGraph } from '@/domain/memory-graph'

export interface PositionedNode extends GraphNode {
  x: number
  y: number
}

export interface GraphLayout {
  nodes: PositionedNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

const WIDTH = 600
const HEIGHT = 600
const HUB_RADIUS = 140
const MEMORY_RADIUS = 260

function ring(nodes: GraphNode[], radius: number, cx: number, cy: number): PositionedNode[] {
  return nodes.map((node, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2
    return { ...node, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  })
}

/**
 * Deterministic two-ring layout — shared people/places/tags (the "hubs") on
 * an inner ring, memories on an outer ring, straight-line edges between
 * them. No physics simulation: the issue explicitly defers rich interactive
 * exploration to a later milestone, so legible-without-overlap-avoidance is
 * the bar for this basic pass, not a polished force-directed graph.
 */
export function layoutMemoryGraph(graph: MemoryGraph): GraphLayout {
  const cx = WIDTH / 2
  const cy = HEIGHT / 2
  const hubs = graph.nodes.filter((n) => n.type !== 'memory')
  const memories = graph.nodes.filter((n) => n.type === 'memory')

  return {
    nodes: [...ring(hubs, HUB_RADIUS, cx, cy), ...ring(memories, MEMORY_RADIUS, cx, cy)],
    edges: graph.edges,
    width: WIDTH,
    height: HEIGHT,
  }
}
