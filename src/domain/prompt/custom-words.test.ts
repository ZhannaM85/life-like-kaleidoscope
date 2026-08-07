import { describe, it, expect } from 'vitest'
import type { CustomWord } from './custom-words'
import { isDuplicateWord, prepareCustomWord } from './custom-words'

describe('isDuplicateWord', () => {
  it('matches the curated English pool case-insensitively', () => {
    expect(isDuplicateWord('bicycle', [])).toBe(true)
    expect(isDuplicateWord('BICYCLE', [])).toBe(true)
  })

  it('matches the curated Russian pool too', () => {
    expect(isDuplicateWord('велосипед', [])).toBe(true)
  })

  it('matches an already-added custom word', () => {
    const existing: CustomWord[] = [{ id: '1', word: 'Dacha', createdAt: '2026-07-01T00:00:00.000Z' }]
    expect(isDuplicateWord('dacha', existing)).toBe(true)
  })

  it('is false for a genuinely new word', () => {
    expect(isDuplicateWord('Zeppelin', [])).toBe(false)
  })
})

describe('prepareCustomWord', () => {
  it('trims whitespace', () => {
    expect(prepareCustomWord('  Zeppelin  ', [])).toBe('Zeppelin')
  })

  it('returns null for blank input', () => {
    expect(prepareCustomWord('   ', [])).toBeNull()
  })

  it('returns null for a duplicate, curated or custom', () => {
    expect(prepareCustomWord('Bicycle', [])).toBeNull()
    const existing: CustomWord[] = [{ id: '1', word: 'Dacha', createdAt: '2026-07-01T00:00:00.000Z' }]
    expect(prepareCustomWord('dacha', existing)).toBeNull()
  })
})
