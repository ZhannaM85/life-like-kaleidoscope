import { describe, it, expect } from 'vitest'
import type { Prompt } from './prompt'
import type { PromptRepository } from './repository'
import {
  chooseDailyWord,
  getOrCreateTodaysPrompt,
  skipTodaysPrompt,
  localDateKey,
  DEFAULT_NO_REPEAT_WINDOW_DAYS,
} from './daily-prompt'
import { WORD_POOL } from './words'

class InMemoryPromptRepository implements PromptRepository {
  prompts: Prompt[] = []
  async save(prompt: Prompt) {
    // Upsert by id, matching the real repository's Dexie `put` semantics —
    // skipTodaysPrompt re-saves an already-issued prompt to flag it skipped.
    const index = this.prompts.findIndex((p) => p.id === prompt.id)
    if (index === -1) this.prompts.push(prompt)
    else this.prompts[index] = prompt
  }
  async getById(id: string) {
    return this.prompts.find((p) => p.id === id)
  }
  async getAll() {
    return [...this.prompts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  async getByWord(word: string) {
    return this.prompts.filter((p) => p.word === word)
  }
}

function deps(iso: string) {
  let n = 0
  return { generateId: () => `id-${++n}`, now: () => iso }
}

describe('chooseDailyWord', () => {
  it('is deterministic for the same date', () => {
    const a = chooseDailyWord({ dateKey: '2026-07-05', lastUsed: new Map() })
    const b = chooseDailyWord({ dateKey: '2026-07-05', lastUsed: new Map() })
    expect(a).toBe(b)
    expect(WORD_POOL).toContain(a)
  })

  it('varies across dates', () => {
    const words = new Set(
      ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'].map((dateKey) =>
        chooseDailyWord({ dateKey, lastUsed: new Map() })
      )
    )
    expect(words.size).toBeGreaterThan(1)
  })

  it('never picks a word used within the window', () => {
    const pool = ['Rain', 'Bicycle', 'Kitchen']
    const lastUsed = new Map([
      ['Rain', '2026-07-01T08:00:00.000Z'],
      ['Bicycle', '2026-06-20T08:00:00.000Z'],
    ])
    const word = chooseDailyWord({ dateKey: '2026-07-05', lastUsed, windowDays: 30, wordPool: pool })
    expect(word).toBe('Kitchen')
  })

  it('allows a word again once the window has passed', () => {
    const pool = ['Rain']
    const lastUsed = new Map([['Rain', '2026-01-01T08:00:00.000Z']])
    const word = chooseDailyWord({ dateKey: '2026-07-05', lastUsed, windowDays: 30, wordPool: pool })
    expect(word).toBe('Rain')
  })

  it('falls back to the least-recently-used word when everything is inside the window', () => {
    const pool = ['Rain', 'Bicycle', 'Kitchen']
    const lastUsed = new Map([
      ['Rain', '2026-07-03T08:00:00.000Z'],
      ['Bicycle', '2026-07-01T08:00:00.000Z'], // oldest
      ['Kitchen', '2026-07-04T08:00:00.000Z'],
    ])
    const word = chooseDailyWord({ dateKey: '2026-07-05', lastUsed, windowDays: 30, wordPool: pool })
    expect(word).toBe('Bicycle')
  })

  it('the default pool comfortably outlasts the default window', () => {
    expect(WORD_POOL.length).toBeGreaterThan(DEFAULT_NO_REPEAT_WINDOW_DAYS)
    expect(new Set(WORD_POOL).size).toBe(WORD_POOL.length) // no duplicate words
  })
})

describe('getOrCreateTodaysPrompt', () => {
  it('creates a prompt on first call and returns the same one within the day', async () => {
    const repo = new InMemoryPromptRepository()
    // local wall-clock times so the "same day" boundary holds in any timezone
    const morning = new Date(2026, 6, 5, 9, 0).toISOString()
    const night = new Date(2026, 6, 5, 23, 30).toISOString()
    const first = await getOrCreateTodaysPrompt(repo, { ...deps(morning), generateId: () => 'a' })
    const second = await getOrCreateTodaysPrompt(repo, { ...deps(night), generateId: () => 'b' })

    expect(first.word).toBeTruthy()
    expect(second.id).toBe(first.id)
    expect(repo.prompts).toHaveLength(1)
  })

  it('issues a new prompt on a new day without repeating recent words', async () => {
    const repo = new InMemoryPromptRepository()
    const pool = ['Rain', 'Bicycle', 'Kitchen', 'Letter', 'Snow']
    const seen = new Set<string>()
    for (let day = 1; day <= 5; day++) {
      const iso = new Date(2026, 6, day, 9, 0).toISOString()
      const prompt = await getOrCreateTodaysPrompt(repo, {
        ...deps(iso),
        generateId: () => `d${day}`,
        wordPool: pool,
        windowDays: 30,
      })
      expect(seen.has(prompt.word)).toBe(false)
      seen.add(prompt.word)
    }
    expect(repo.prompts).toHaveLength(5)
  })
})

describe('skipTodaysPrompt', () => {
  it('marks the current prompt skipped and issues a fresh word for the same day', async () => {
    const repo = new InMemoryPromptRepository()
    const morning = new Date(2026, 6, 5, 9, 0).toISOString()
    const later = new Date(2026, 6, 5, 9, 5).toISOString()
    const pool = ['Rain', 'Bicycle', 'Kitchen']

    const current = await getOrCreateTodaysPrompt(repo, {
      ...deps(morning),
      generateId: () => 'first',
      wordPool: pool,
    })
    const replacement = await skipTodaysPrompt(repo, current, {
      ...deps(later),
      generateId: () => 'second',
      wordPool: pool,
    })

    expect(replacement.id).toBe('second')
    expect(replacement.word).not.toBe(current.word)
    expect(replacement.skipped).toBeFalsy()

    const stored = await repo.getById(current.id)
    expect(stored?.skipped).toBe(true)
  })

  it('never re-picks the just-skipped word (its issuance keeps it inside the window)', async () => {
    const repo = new InMemoryPromptRepository()
    const morning = new Date(2026, 6, 5, 9, 0).toISOString()
    const pool = ['Rain', 'Bicycle']

    const current = await getOrCreateTodaysPrompt(repo, {
      ...deps(morning),
      generateId: () => 'first',
      wordPool: pool,
    })
    const replacement = await skipTodaysPrompt(repo, current, {
      ...deps(morning),
      generateId: () => 'second',
      wordPool: pool,
    })

    expect(pool).toContain(replacement.word)
    expect(replacement.word).not.toBe(current.word)
  })

  it('getOrCreateTodaysPrompt returns the replacement, not the skipped original, on reload', async () => {
    const repo = new InMemoryPromptRepository()
    const morning = new Date(2026, 6, 5, 9, 0).toISOString()
    const noon = new Date(2026, 6, 5, 12, 0).toISOString()

    const current = await getOrCreateTodaysPrompt(repo, { ...deps(morning), generateId: () => 'first' })
    const replacement = await skipTodaysPrompt(repo, current, { ...deps(noon), generateId: () => 'second' })

    const reloaded = await getOrCreateTodaysPrompt(repo, { ...deps(noon), generateId: () => 'third' })
    expect(reloaded.id).toBe(replacement.id)
    expect(repo.prompts).toHaveLength(2)
  })
})

describe('localDateKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 6, 5, 23, 59))).toBe('2026-07-05')
    expect(localDateKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })
})
