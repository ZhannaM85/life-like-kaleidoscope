import { describe, it, expect } from 'vitest'
import type { Memory } from '@/domain/memory'
import { searchMemories, type SearchContext } from './index'

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'm1',
    promptId: 'prompt-1',
    story: 'The red bicycle leaned against the fence all summer.',
    peopleIds: [],
    placeIds: [],
    tagIds: [],
    photoIds: [],
    authoredBy: 'user-1',
    aboutWhom: 'user-1',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    currentVersionId: 'v1',
    ...overrides,
  }
}

const emptyContext: SearchContext = {
  wordByPromptId: new Map(),
  nameByPersonId: new Map(),
  nameByPlaceId: new Map(),
  labelByTagId: new Map(),
}

describe('searchMemories', () => {
  it('returns nothing for a blank or whitespace-only query', () => {
    const memories = [makeMemory()]
    expect(searchMemories(memories, '', emptyContext)).toEqual([])
    expect(searchMemories(memories, '   ', emptyContext)).toEqual([])
  })

  it('matches the story, case-insensitively', () => {
    const memory = makeMemory()
    expect(searchMemories([memory], 'BICYCLE', emptyContext)).toEqual([memory])
    expect(searchMemories([memory], 'kitchen', emptyContext)).toEqual([])
  })

  it('matches the title', () => {
    const memory = makeMemory({ title: 'The jam shelf' })
    expect(searchMemories([memory], 'jam shelf', emptyContext)).toEqual([memory])
  })

  it("matches the memory's prompt word via the context lookup", () => {
    const memory = makeMemory({ promptId: 'prompt-1' })
    const ctx: SearchContext = { ...emptyContext, wordByPromptId: new Map([['prompt-1', 'Bicycle']]) }
    expect(searchMemories([memory], 'bicycle', ctx)).toEqual([memory])
  })

  it('matches a linked person, place, or tag by name/label', () => {
    const memory = makeMemory({ peopleIds: ['p1'], placeIds: ['pl1'], tagIds: ['t1'] })
    const ctx: SearchContext = {
      ...emptyContext,
      nameByPersonId: new Map([['p1', 'Aunt Vera']]),
      nameByPlaceId: new Map([['pl1', 'The dacha']]),
      labelByTagId: new Map([['t1', 'childhood']]),
    }
    expect(searchMemories([memory], 'vera', ctx)).toEqual([memory])
    expect(searchMemories([memory], 'dacha', ctx)).toEqual([memory])
    expect(searchMemories([memory], 'childhood', ctx)).toEqual([memory])
  })

  it('excludes memories that match nothing', () => {
    const memory = makeMemory()
    expect(searchMemories([memory], 'zeppelin', emptyContext)).toEqual([])
  })
})
