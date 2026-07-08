// One load for everything the memory pages show: the memory itself plus its
// prompt word and people/place/tag names resolved from ids.
import type { Memory } from '@/domain/memory'
import type { EntityId } from '@/domain/shared'
import { getRepositories } from '@/stores'

export interface MemoryContext {
  memory: Memory
  word?: string
  peopleNames: string[]
  placeNames: string[]
  tagLabels: string[]
}

function namesFor(ids: EntityId[], nameById: Map<EntityId, string>): string[] {
  return ids.map((id) => nameById.get(id)).filter((name): name is string => name !== undefined)
}

/** Resolves a memory and its display names, or `undefined` when no such memory exists. */
export async function loadMemoryContext(id: EntityId): Promise<MemoryContext | undefined> {
  const repos = getRepositories()
  const memory = await repos.memories.getById(id)
  if (!memory) return undefined

  const [prompt, people, places, tags] = await Promise.all([
    repos.prompts.getById(memory.promptId),
    repos.people.getAll(),
    repos.places.getAll(),
    repos.tags.getAll(),
  ])

  return {
    memory,
    word: prompt?.word,
    peopleNames: namesFor(memory.peopleIds, new Map(people.map((p) => [p.id, p.name]))),
    placeNames: namesFor(memory.placeIds, new Map(places.map((p) => [p.id, p.name]))),
    tagLabels: namesFor(memory.tagIds, new Map(tags.map((t) => [t.id, t.label]))),
  }
}
