import { describe, it, expect } from 'vitest'
import { WORD_POOL, WORD_POOL_RU, getWordPool, wordBelongsToLocale } from './words'

function caseInsensitiveDuplicates(pool: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const word of pool) {
    const key = word.toLowerCase()
    if (seen.has(key)) duplicates.push(word)
    seen.add(key)
  }
  return duplicates
}

describe.each([
  ['English', WORD_POOL],
  ['Russian', WORD_POOL_RU],
])('%s word pool', (_name, pool) => {
  it('has no duplicate words', () => {
    expect(caseInsensitiveDuplicates(pool)).toEqual([])
  })

  it('has no blank or untrimmed entries', () => {
    for (const word of pool) {
      expect(word).toBe(word.trim())
      expect(word.length).toBeGreaterThan(0)
    }
  })

  it('is comfortably larger than the 120-day no-repeat window', () => {
    expect(pool.length).toBeGreaterThan(120)
  })
})

describe('WORD_POOL_RU', () => {
  it('is written in Cyrillic — curated, not leaked English', () => {
    for (const word of WORD_POOL_RU) {
      expect(word).toMatch(/[А-Яа-яЁё]/)
    }
  })
})

describe('getWordPool', () => {
  it('keys the active pool off the locale', () => {
    expect(getWordPool('en')).toBe(WORD_POOL)
    expect(getWordPool('ru')).toBe(WORD_POOL_RU)
  })
})

describe('wordBelongsToLocale', () => {
  it('is true for a word in the locale\'s curated pool', () => {
    expect(wordBelongsToLocale('Bicycle', 'en', [])).toBe(true)
    expect(wordBelongsToLocale('Bicycle', 'ru', [])).toBe(false)
  })

  it('is true for any custom word regardless of locale (#28 is not locale-scoped)', () => {
    expect(wordBelongsToLocale('Dacha', 'en', ['Dacha'])).toBe(true)
    expect(wordBelongsToLocale('Dacha', 'ru', ['Dacha'])).toBe(true)
  })

  it('is false for a word drawn from another locale entirely', () => {
    expect(wordBelongsToLocale('Велосипед', 'en', [])).toBe(false)
  })
})
