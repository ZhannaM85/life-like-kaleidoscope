import { describe, it, expect } from 'vitest'
import type { Memory } from '@/domain/memory'
import { buildTimeline } from './index'

function makeMemory(id: string, overrides: Partial<Memory> = {}): Memory {
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
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    currentVersionId: `v-${id}`,
    ...overrides,
  }
}

describe('buildTimeline', () => {
  it('groups memories by approxYear, ascending', () => {
    const m1994 = makeMemory('a', { approxYear: 1994 })
    const m1991 = makeMemory('b', { approxYear: 1991 })
    const timeline = buildTimeline([m1994, m1991])

    expect(timeline.byYear.map((g) => g.year)).toEqual([1991, 1994])
    expect(timeline.byYear[0].memories).toEqual([m1991])
    expect(timeline.byYear[1].memories).toEqual([m1994])
  })

  it('groups multiple memories under the same year, ordered by write date', () => {
    const first = makeMemory('a', { approxYear: 1994, createdAt: '2026-07-01T10:00:00.000Z' })
    const second = makeMemory('b', { approxYear: 1994, createdAt: '2026-07-02T10:00:00.000Z' })
    const timeline = buildTimeline([second, first])

    expect(timeline.byYear).toHaveLength(1)
    expect(timeline.byYear[0].memories).toEqual([first, second])
  })

  it('puts memories with no approxYear into undated, never dropping them', () => {
    const dated = makeMemory('a', { approxYear: 1994 })
    const ageOnly = makeMemory('b', { approxAge: 8 })
    const bare = makeMemory('c')
    const timeline = buildTimeline([dated, ageOnly, bare])

    expect(timeline.byYear).toEqual([{ year: 1994, memories: [dated] }])
    expect(timeline.undated.map((m) => m.id)).toEqual(['b', 'c'])
  })

  it('orders undated memories by approxAge ascending, age-known before age-unknown', () => {
    const older = makeMemory('a', { approxAge: 12 })
    const younger = makeMemory('b', { approxAge: 5 })
    const noAge = makeMemory('c')
    const timeline = buildTimeline([older, noAge, younger])

    expect(timeline.undated.map((m) => m.id)).toEqual(['b', 'a', 'c'])
  })

  it('returns empty groups for no memories', () => {
    expect(buildTimeline([])).toEqual({ byYear: [], undated: [] })
  })
})
