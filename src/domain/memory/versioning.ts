import type { GenerateId, Now } from '@/domain/shared'
import type { Memory, MemorySnapshot, MemoryVersion } from './memory'

/** Fields the author provides when first writing a memory. */
export interface MemoryDraft {
  promptId: string
  title?: string
  story: string
  approxAge?: number
  approxYear?: number
  peopleIds?: string[]
  placeIds?: string[]
  tagIds?: string[]
  photoIds?: string[]
  authoredBy: string
  /** Defaults to authoredBy when omitted. */
  aboutWhom?: string
}

/** Fields an edit may change. Everything else (id, promptId, authoredBy, createdAt) is fixed. */
export type MemoryEdit = Partial<
  Pick<
    Memory,
    | 'title'
    | 'story'
    | 'approxAge'
    | 'approxYear'
    | 'peopleIds'
    | 'placeIds'
    | 'tagIds'
    | 'photoIds'
    | 'aboutWhom'
  >
>

export interface VersioningDeps {
  generateId: GenerateId
  now: Now
}

/** A memory paired with the version produced by the save that created/updated it. */
export interface MemoryWithVersion {
  memory: Memory
  version: MemoryVersion
}

function snapshotOf(memory: Memory): MemorySnapshot {
  const { currentVersionId: _currentVersionId, ...snapshot } = memory
  return snapshot
}

/**
 * Create a new memory plus its initial version. The version records the
 * memory as first written, so history is complete from the very first save.
 */
export function createMemory(draft: MemoryDraft, deps: VersioningDeps): MemoryWithVersion {
  const timestamp = deps.now()
  const versionId = deps.generateId()

  const memory: Memory = {
    id: deps.generateId(),
    promptId: draft.promptId,
    title: draft.title,
    story: draft.story,
    approxAge: draft.approxAge,
    approxYear: draft.approxYear,
    peopleIds: draft.peopleIds ?? [],
    placeIds: draft.placeIds ?? [],
    tagIds: draft.tagIds ?? [],
    photoIds: draft.photoIds ?? [],
    authoredBy: draft.authoredBy,
    aboutWhom: draft.aboutWhom ?? draft.authoredBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    currentVersionId: versionId,
  }

  return {
    memory,
    version: {
      id: versionId,
      memoryId: memory.id,
      snapshot: snapshotOf(memory),
      editedAt: timestamp,
    },
  }
}

/**
 * Apply an edit to an existing memory, producing the updated memory and a
 * brand-new immutable version. The input memory is not mutated, and no
 * existing version is touched — persistence must only ever append versions.
 */
export function editMemory(
  current: Memory,
  edit: MemoryEdit,
  deps: VersioningDeps
): MemoryWithVersion {
  const timestamp = deps.now()
  const versionId = deps.generateId()

  const memory: Memory = {
    ...current,
    ...edit,
    updatedAt: timestamp,
    currentVersionId: versionId,
  }

  return {
    memory,
    version: {
      id: versionId,
      memoryId: memory.id,
      snapshot: snapshotOf(memory),
      editedAt: timestamp,
    },
  }
}
