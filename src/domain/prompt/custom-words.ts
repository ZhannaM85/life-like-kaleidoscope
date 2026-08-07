import type { EntityId, IsoDateString } from '@/domain/shared'
import { WORD_POOL, WORD_POOL_RU } from './words'

/**
 * A user-added prompt word (#28) — joins the curated pool as an equal
 * citizen (same daily selection, same no-repeat window, same recurrence
 * across years). Not locale-scoped: unlike the blocklist (#27), a custom
 * word is whatever language the user wrote it in and is offered alongside
 * either curated pool.
 */
export interface CustomWord {
  id: EntityId
  word: string
  createdAt: IsoDateString
}

export interface CustomWordRepository {
  save(customWord: CustomWord): Promise<void>
  remove(id: EntityId): Promise<void>
  getAll(): Promise<CustomWord[]>
}

/** Case-insensitive membership against both curated pools and the user's existing custom words. */
export function isDuplicateWord(word: string, existing: readonly CustomWord[]): boolean {
  const normalized = word.toLowerCase()
  return (
    WORD_POOL.some((w) => w.toLowerCase() === normalized) ||
    WORD_POOL_RU.some((w) => w.toLowerCase() === normalized) ||
    existing.some((c) => c.word.toLowerCase() === normalized)
  )
}

/**
 * Trims and validates a raw "Your words" input. Returns `null` for blank or
 * duplicate input rather than throwing — adding a word is guided, never
 * enforced with error messages (brief's no-guilt stance).
 */
export function prepareCustomWord(raw: string, existing: readonly CustomWord[]): string | null {
  const trimmed = raw.trim()
  if (!trimmed || isDuplicateWord(trimmed, existing)) return null
  return trimmed
}
