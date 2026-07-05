import { describe, it, expect } from 'vitest'
import { createMemory, editMemory, type VersioningDeps } from './versioning'

function makeDeps(): VersioningDeps & { tick: () => void } {
  let idCounter = 0
  let time = new Date('2026-07-05T10:00:00.000Z').getTime()
  return {
    generateId: () => `id-${++idCounter}`,
    now: () => new Date(time).toISOString(),
    tick: () => {
      time += 60_000
    },
  }
}

const draft = {
  promptId: 'prompt-1',
  story: 'My grandmother taught me to ride a bicycle in her yard.',
  authoredBy: 'user-1',
}

describe('createMemory', () => {
  it('creates a memory with an initial version whose snapshot matches the memory', () => {
    const { memory, version } = createMemory(draft, makeDeps())

    expect(memory.story).toBe(draft.story)
    expect(memory.currentVersionId).toBe(version.id)
    expect(version.memoryId).toBe(memory.id)
    const { currentVersionId: _cv, ...memoryWithoutVersionPointer } = memory
    expect(version.snapshot).toEqual(memoryWithoutVersionPointer)
    expect('currentVersionId' in version.snapshot).toBe(false)
    expect(version.editedAt).toBe(memory.createdAt)
  })

  it('defaults aboutWhom to the author and collections to empty arrays', () => {
    const { memory } = createMemory(draft, makeDeps())

    expect(memory.aboutWhom).toBe('user-1')
    expect(memory.peopleIds).toEqual([])
    expect(memory.placeIds).toEqual([])
    expect(memory.tagIds).toEqual([])
    expect(memory.photoIds).toEqual([])
  })

  it('respects an explicit aboutWhom', () => {
    const { memory } = createMemory({ ...draft, aboutWhom: 'user-2' }, makeDeps())
    expect(memory.aboutWhom).toBe('user-2')
  })

  it('leaves occurrence dates undefined when not provided — dates are optional', () => {
    const { memory } = createMemory(draft, makeDeps())
    expect(memory.approxAge).toBeUndefined()
    expect(memory.approxYear).toBeUndefined()
  })
})

describe('editMemory', () => {
  it('produces a new version and points currentVersionId at it', () => {
    const deps = makeDeps()
    const created = createMemory(draft, deps)
    deps.tick()

    const edited = editMemory(created.memory, { story: 'Actually it was my mother.' }, deps)

    expect(edited.memory.story).toBe('Actually it was my mother.')
    expect(edited.version.id).not.toBe(created.version.id)
    expect(edited.memory.currentVersionId).toBe(edited.version.id)
    expect(edited.version.snapshot.story).toBe('Actually it was my mother.')
  })

  it('does not mutate the original memory or any prior version', () => {
    const deps = makeDeps()
    const created = createMemory(draft, deps)
    const memoryBefore = structuredClone(created.memory)
    const versionBefore = structuredClone(created.version)
    deps.tick()

    editMemory(created.memory, { story: 'Changed.', title: 'New title' }, deps)

    expect(created.memory).toEqual(memoryBefore)
    expect(created.version).toEqual(versionBefore)
  })

  it('updates updatedAt but preserves createdAt and identity fields', () => {
    const deps = makeDeps()
    const created = createMemory(draft, deps)
    deps.tick()

    const edited = editMemory(created.memory, { story: 'Changed.' }, deps)

    expect(edited.memory.id).toBe(created.memory.id)
    expect(edited.memory.promptId).toBe(created.memory.promptId)
    expect(edited.memory.authoredBy).toBe(created.memory.authoredBy)
    expect(edited.memory.createdAt).toBe(created.memory.createdAt)
    expect(edited.memory.updatedAt).not.toBe(created.memory.updatedAt)
  })

  it('supports a chain of edits, each snapshotting its own state', () => {
    const deps = makeDeps()
    const v1 = createMemory(draft, deps)
    deps.tick()
    const v2 = editMemory(v1.memory, { story: 'Second telling.' }, deps)
    deps.tick()
    const v3 = editMemory(v2.memory, { story: 'Third telling.', approxAge: 8 }, deps)

    expect(v1.version.snapshot.story).toBe(draft.story)
    expect(v2.version.snapshot.story).toBe('Second telling.')
    expect(v3.version.snapshot.story).toBe('Third telling.')
    expect(v3.version.snapshot.approxAge).toBe(8)
    expect(new Set([v1.version.id, v2.version.id, v3.version.id]).size).toBe(3)
  })
})
