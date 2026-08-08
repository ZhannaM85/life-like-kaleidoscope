// Epic 8 (basic) — the graph's data model: pure, storage-free, no layout or
// rendering concerns (those are presentation and live in features/memory-graph).
import type { Memory } from '@/domain/memory'
import type { Person } from '@/domain/person'
import type { Place } from '@/domain/place'
import type { Tag } from '@/domain/tag'
import type { EntityId } from '@/domain/shared'

export type GraphNodeType = 'memory' | 'person' | 'place' | 'tag'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
}

export interface GraphEdge {
  source: string
  target: string
}

export interface MemoryGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Type-prefixed so a node's kind is readable from its id alone, without a lookup. */
function nodeId(type: GraphNodeType, id: EntityId): string {
  return `${type}:${id}`
}

/**
 * A node for every memory (even one sharing nothing yet — it's still part
 * of the archive) plus every person/place/tag that at least one memory
 * actually references (an unreferenced one would just be clutter). An edge
 * connects a memory to each of its own people/places/tags — that's the
 * whole "shared reference" relationship for this basic pass; entities are
 * never linked to each other directly, only through the memories between them.
 */
export function buildMemoryGraph(
  memories: readonly Memory[],
  wordByPromptId: ReadonlyMap<EntityId, string>,
  people: readonly Person[],
  places: readonly Place[],
  tags: readonly Tag[]
): MemoryGraph {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const referencedPersonIds = new Set<EntityId>()
  const referencedPlaceIds = new Set<EntityId>()
  const referencedTagIds = new Set<EntityId>()

  for (const memory of memories) {
    const memoryNodeId = nodeId('memory', memory.id)
    nodes.push({
      id: memoryNodeId,
      type: 'memory',
      label: wordByPromptId.get(memory.promptId) ?? memory.title ?? memory.story.slice(0, 24),
    })
    for (const id of memory.peopleIds) {
      referencedPersonIds.add(id)
      edges.push({ source: memoryNodeId, target: nodeId('person', id) })
    }
    for (const id of memory.placeIds) {
      referencedPlaceIds.add(id)
      edges.push({ source: memoryNodeId, target: nodeId('place', id) })
    }
    for (const id of memory.tagIds) {
      referencedTagIds.add(id)
      edges.push({ source: memoryNodeId, target: nodeId('tag', id) })
    }
  }

  for (const person of people) {
    if (referencedPersonIds.has(person.id)) {
      nodes.push({ id: nodeId('person', person.id), type: 'person', label: person.name })
    }
  }
  for (const place of places) {
    if (referencedPlaceIds.has(place.id)) {
      nodes.push({ id: nodeId('place', place.id), type: 'place', label: place.name })
    }
  }
  for (const tag of tags) {
    if (referencedTagIds.has(tag.id)) {
      nodes.push({ id: nodeId('tag', tag.id), type: 'tag', label: tag.label })
    }
  }

  return { nodes, edges }
}
