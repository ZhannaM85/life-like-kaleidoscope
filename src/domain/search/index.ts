// Epic 6 — pure, storage-free search over an already-loaded set of memories.
// The UI is responsible for loading memories plus the name/label lookups;
// this module only decides which memories match a query.
import type { Memory } from '@/domain/memory'
import type { EntityId } from '@/domain/shared'

/** Name/label lookups a memory's ids resolve through — built once per search session. */
export interface SearchContext {
  wordByPromptId: ReadonlyMap<EntityId, string>
  nameByPersonId: ReadonlyMap<EntityId, string>
  nameByPlaceId: ReadonlyMap<EntityId, string>
  labelByTagId: ReadonlyMap<EntityId, string>
}

function matches(memory: Memory, query: string, ctx: SearchContext): boolean {
  const haystacks: (string | undefined)[] = [
    ctx.wordByPromptId.get(memory.promptId),
    memory.title,
    memory.story,
    ...memory.peopleIds.map((id) => ctx.nameByPersonId.get(id)),
    ...memory.placeIds.map((id) => ctx.nameByPlaceId.get(id)),
    ...memory.tagIds.map((id) => ctx.labelByTagId.get(id)),
  ]
  return haystacks.some((text) => text?.toLowerCase().includes(query))
}

/**
 * Case-insensitive substring match across a memory's prompt word, title,
 * story, and its people/place/tag names — an empty (or all-whitespace)
 * query returns no results rather than the whole archive, so the page can
 * distinguish "nothing typed yet" from "typed and found nothing".
 */
export function searchMemories(
  memories: readonly Memory[],
  query: string,
  ctx: SearchContext
): Memory[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') return []
  return memories.filter((memory) => matches(memory, normalized, ctx))
}
