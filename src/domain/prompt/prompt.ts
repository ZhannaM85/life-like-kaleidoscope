import type { EntityId, IsoDateString } from '@/domain/shared'

/** A single-word daily writing cue (e.g. "Bicycle", "Rain", "Grandmother"). */
export interface Prompt {
  id: EntityId
  word: string
  createdAt: IsoDateString
  /** Set when the user chose "skip this word for now" (#27) — no longer today's active prompt. */
  skipped?: boolean
}
