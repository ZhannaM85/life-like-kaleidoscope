import type { EntityId, IsoDateString } from '@/domain/shared'

/**
 * One written memory, inspired by a daily prompt.
 *
 * Occurrence dates are deliberately approximate and optional (approxAge /
 * approxYear) — many memories are "I was maybe 8, sometime in the 90s".
 */
export interface Memory {
  id: EntityId
  promptId: EntityId
  title?: string
  story: string
  approxAge?: number
  approxYear?: number
  peopleIds: EntityId[]
  placeIds: EntityId[]
  tagIds: EntityId[]
  photoIds: EntityId[]
  /**
   * Defaults to the single MVP user's id; not exposed in any UI yet. Exists so
   * a future "someone else writes on your behalf" caregiver mode is purely
   * additive, not a data-model rewrite.
   */
  authoredBy: EntityId
  /** Defaults to the same user as authoredBy, same reasoning as above. */
  aboutWhom: EntityId
  createdAt: IsoDateString
  updatedAt: IsoDateString
  currentVersionId: EntityId
}

/** The immutable content of a memory at one point in time. */
export type MemorySnapshot = Omit<Memory, 'currentVersionId'>

/**
 * An immutable record of one save of a memory. Every save — including the
 * first — produces a version; past versions are never overwritten or deleted
 * by a normal edit.
 */
export interface MemoryVersion {
  id: EntityId
  memoryId: EntityId
  snapshot: MemorySnapshot
  editedAt: IsoDateString
}

/** A photo attached to a memory. The binary lives in blob storage under blobRef. */
export interface Photo {
  id: EntityId
  memoryId: EntityId
  blobRef: string
  caption?: string
}
