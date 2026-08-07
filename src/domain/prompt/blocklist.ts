import type { EntityId, IsoDateString } from '@/domain/shared'
import type { Locale } from './words'

/**
 * A word the user has chosen never to be prompted with again (#27). Scoped
 * per locale — each language's pool (#18) is blocked independently, so
 * blocking "Hospital" leaves «Больница» untouched.
 */
export interface BlockedWord {
  id: EntityId
  word: string
  locale: Locale
  blockedAt: IsoDateString
}

export interface BlockedWordRepository {
  save(blockedWord: BlockedWord): Promise<void>
  remove(id: EntityId): Promise<void>
  /** Every word blocked across all locales. */
  getAll(): Promise<BlockedWord[]>
}

/** A word pool with anything blocked for that locale removed — so `chooseDailyWord` never sees it. */
export function excludeBlocked(
  pool: readonly string[],
  blocked: readonly BlockedWord[],
  locale: Locale
): readonly string[] {
  const blockedWords = new Set(
    blocked.filter((entry) => entry.locale === locale).map((entry) => entry.word)
  )
  return pool.filter((word) => !blockedWords.has(word))
}
