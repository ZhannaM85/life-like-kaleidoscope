import { describe, it, expect } from 'vitest'
import type { Memory } from '@/domain/memory'
import { onThisDayMemories, pickRandomMemory } from './index'

function makeMemory(id: string, createdAt: string): Memory {
  return {
    id,
    promptId: 'prompt-1',
    story: `story-${id}`,
    peopleIds: [],
    placeIds: [],
    tagIds: [],
    photoIds: [],
    authoredBy: 'user-1',
    aboutWhom: 'user-1',
    createdAt,
    updatedAt: createdAt,
    currentVersionId: `v-${id}`,
  }
}

const today = new Date(2026, 6, 5, 9, 0) // 2026-07-05, local

describe('onThisDayMemories', () => {
  it('matches the same month/day from an earlier year', () => {
    const match = makeMemory('a', new Date(2020, 6, 5, 10, 0).toISOString())
    expect(onThisDayMemories([match], today)).toEqual([match])
  })

  it('excludes a memory written today itself', () => {
    const writtenToday = makeMemory('a', new Date(2026, 6, 5, 8, 0).toISOString())
    expect(onThisDayMemories([writtenToday], today)).toEqual([])
  })

  it('excludes a memory from a different month/day', () => {
    const different = makeMemory('a', new Date(2020, 6, 6, 10, 0).toISOString())
    expect(onThisDayMemories([different], today)).toEqual([])
  })

  it('matches across multiple past years', () => {
    const y1 = makeMemory('a', new Date(2019, 6, 5).toISOString())
    const y2 = makeMemory('b', new Date(2021, 6, 5).toISOString())
    expect(onThisDayMemories([y1, y2], today).map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('pickRandomMemory', () => {
  it('prefers an "on this day" match over the random fallback', () => {
    const onDay = makeMemory('a', new Date(2020, 6, 5).toISOString())
    const other = makeMemory('b', new Date(2020, 3, 1).toISOString())
    const pick = pickRandomMemory([onDay, other], today)
    expect(pick).toEqual({ memory: onDay, onThisDay: true })
  })

  it('falls back to a random past memory when nothing matches "on this day"', () => {
    const other = makeMemory('a', new Date(2020, 3, 1).toISOString())
    const pick = pickRandomMemory([other], today)
    expect(pick).toEqual({ memory: other, onThisDay: false })
  })

  it('returns undefined when nothing else exists in the archive', () => {
    const writtenToday = makeMemory('a', today.toISOString())
    expect(pickRandomMemory([writtenToday], today)).toBeUndefined()
  })

  it('excludes ids already surfaced elsewhere (e.g. the annual-reflection callback)', () => {
    const onDay = makeMemory('a', new Date(2020, 6, 5).toISOString())
    const fallback = makeMemory('b', new Date(2020, 3, 1).toISOString())
    const pick = pickRandomMemory([onDay, fallback], today, new Set(['a']))
    expect(pick).toEqual({ memory: fallback, onThisDay: false })
  })

  it('is deterministic for the same day', () => {
    const memories = [
      makeMemory('a', new Date(2019, 3, 1).toISOString()),
      makeMemory('b', new Date(2020, 3, 2).toISOString()),
      makeMemory('c', new Date(2021, 3, 3).toISOString()),
    ]
    expect(pickRandomMemory(memories, today)).toEqual(pickRandomMemory(memories, today))
  })
})
