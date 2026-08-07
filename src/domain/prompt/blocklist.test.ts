import { describe, it, expect } from 'vitest'
import type { BlockedWord } from './blocklist'
import { excludeBlocked } from './blocklist'

describe('excludeBlocked', () => {
  it('removes blocked words from the pool for the given locale', () => {
    const pool = ['Rain', 'Bicycle', 'Hospital']
    const blocked: BlockedWord[] = [
      { id: 'b1', word: 'Hospital', locale: 'en', blockedAt: '2026-07-03T08:00:00.000Z' },
    ]
    expect(excludeBlocked(pool, blocked, 'en')).toEqual(['Rain', 'Bicycle'])
  })

  it('keeps a word blocked in one locale untouched in another (#18 pools are separate)', () => {
    const pool = ['Больница', 'Дождь']
    const blocked: BlockedWord[] = [
      { id: 'b1', word: 'Hospital', locale: 'en', blockedAt: '2026-07-03T08:00:00.000Z' },
    ]
    expect(excludeBlocked(pool, blocked, 'ru')).toEqual(['Больница', 'Дождь'])
  })

  it('is a no-op when nothing is blocked', () => {
    const pool = ['Rain', 'Bicycle']
    expect(excludeBlocked(pool, [], 'en')).toEqual(pool)
  })
})
