import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMemory, editMemory, type VersioningDeps } from '@/domain/memory'
import { LifeLikeKaleidoscopeDb } from './db'
import { createIndexedDbRepositories, type Repositories } from './index'

let dbCounter = 0
let dbName: string
let repos: Repositories

function makeDeps(): VersioningDeps {
  let idCounter = 0
  return {
    generateId: () => `id-${++idCounter}-${Math.random().toString(36).slice(2)}`,
    now: () => new Date().toISOString(),
  }
}

const draft = {
  promptId: 'prompt-1',
  story: 'The kitchen always smelled of cinnamon on Sundays.',
  authoredBy: 'user-1',
}

beforeEach(() => {
  dbName = `test-db-${++dbCounter}`
  repos = createIndexedDbRepositories(dbName)
})

afterEach(async () => {
  await new LifeLikeKaleidoscopeDb(dbName).delete()
})

describe('IndexedDbMemoryRepository', () => {
  it('round-trips a created memory and its initial version', async () => {
    const created = createMemory(draft, makeDeps())
    await repos.memories.create(created)

    const loaded = await repos.memories.getById(created.memory.id)
    expect(loaded).toEqual(created.memory)

    const versions = await repos.memories.getVersions(created.memory.id)
    expect(versions).toEqual([created.version])
  })

  it('appends a version on update and preserves earlier versions untouched', async () => {
    const deps = makeDeps()
    const created = createMemory(draft, deps)
    await repos.memories.create(created)

    const edited = editMemory(created.memory, { story: 'Cinnamon and coffee, actually.' }, deps)
    await repos.memories.update(edited)

    const loaded = await repos.memories.getById(created.memory.id)
    expect(loaded?.story).toBe('Cinnamon and coffee, actually.')
    expect(loaded?.currentVersionId).toBe(edited.version.id)

    const versions = await repos.memories.getVersions(created.memory.id)
    expect(versions).toHaveLength(2)
    expect(versions[0]).toEqual(created.version)
    expect(versions[1]).toEqual(edited.version)
  })

  it('rejects an update that reuses an existing version id instead of rewriting history', async () => {
    const deps = makeDeps()
    const created = createMemory(draft, deps)
    await repos.memories.create(created)

    const tampered = {
      memory: { ...created.memory, story: 'Rewritten past.' },
      version: {
        ...created.version,
        snapshot: { ...created.version.snapshot, story: 'Rewritten past.' },
      },
    }

    await expect(repos.memories.update(tampered)).rejects.toThrow()

    const versions = await repos.memories.getVersions(created.memory.id)
    expect(versions).toEqual([created.version])
    const loaded = await repos.memories.getById(created.memory.id)
    expect(loaded?.story).toBe(draft.story)
  })

  it('lists memories by prompt id', async () => {
    const deps = makeDeps()
    const a = createMemory({ ...draft, promptId: 'prompt-a' }, deps)
    const b = createMemory({ ...draft, promptId: 'prompt-b' }, deps)
    await repos.memories.create(a)
    await repos.memories.create(b)

    const forA = await repos.memories.getByPromptId('prompt-a')
    expect(forA.map((m) => m.id)).toEqual([a.memory.id])
  })

  it('deletes a memory together with its version history', async () => {
    const deps = makeDeps()
    const created = createMemory(draft, deps)
    await repos.memories.create(created)
    await repos.memories.update(editMemory(created.memory, { story: 'Edited once.' }, deps))

    await repos.memories.delete(created.memory.id)

    expect(await repos.memories.getById(created.memory.id)).toBeUndefined()
    expect(await repos.memories.getVersions(created.memory.id)).toEqual([])
  })
})

describe('IndexedDbPromptRepository', () => {
  it('saves and retrieves prompts by id and by word', async () => {
    await repos.prompts.save({ id: 'p1', word: 'Bicycle', createdAt: '2025-07-05T08:00:00.000Z' })
    await repos.prompts.save({ id: 'p2', word: 'Bicycle', createdAt: '2026-07-05T08:00:00.000Z' })
    await repos.prompts.save({ id: 'p3', word: 'Rain', createdAt: '2026-07-04T08:00:00.000Z' })

    expect((await repos.prompts.getById('p3'))?.word).toBe('Rain')
    const bicycle = await repos.prompts.getByWord('Bicycle')
    expect(bicycle.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(await repos.prompts.getAll()).toHaveLength(3)
  })
})

describe('people, places, and tags repositories', () => {
  it('supports basic save/get/delete round-trips', async () => {
    await repos.people.save({ id: 'person-1', name: 'Grandmother', notes: 'Mother’s side' })
    await repos.places.save({ id: 'place-1', name: 'Kitchen' })
    await repos.tags.save({ id: 'tag-1', label: 'childhood' })

    expect((await repos.people.getById('person-1'))?.name).toBe('Grandmother')
    expect((await repos.places.getById('place-1'))?.name).toBe('Kitchen')
    expect((await repos.tags.getById('tag-1'))?.label).toBe('childhood')

    await repos.people.delete('person-1')
    expect(await repos.people.getById('person-1')).toBeUndefined()
    expect(await repos.places.getAll()).toHaveLength(1)
  })
})

describe('IndexedDbPhotoRepository', () => {
  it('stores photo metadata with its blob and deletes both together', async () => {
    const photo = { id: 'photo-1', memoryId: 'memory-1', blobRef: 'blob-1', caption: 'The yard' }
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })

    await repos.photos.save(photo, blob)

    expect(await repos.photos.getById('photo-1')).toEqual(photo)
    expect((await repos.photos.getByMemoryId('memory-1')).map((p) => p.id)).toEqual(['photo-1'])
    const storedBlob = await repos.photos.getBlob('blob-1')
    expect(storedBlob).toBeDefined()
    expect(storedBlob!.type).toBe('image/png')
    expect(await storedBlob!.text()).toBe('fake-image-bytes')

    await repos.photos.delete('photo-1')
    expect(await repos.photos.getById('photo-1')).toBeUndefined()
    expect(await repos.photos.getBlob('blob-1')).toBeUndefined()
  })
})

describe('IndexedDbUserProfileRepository', () => {
  it('returns undefined before any profile is saved, then the saved profile', async () => {
    expect(await repos.userProfile.get()).toBeUndefined()

    const profile = {
      id: 'user-1',
      displayName: 'Zhanna',
      legacyContact: { name: 'Family member', contactInfo: 'family@example.com' },
    }
    await repos.userProfile.save(profile)

    expect(await repos.userProfile.get()).toEqual(profile)
  })
})
