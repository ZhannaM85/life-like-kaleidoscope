import 'fake-indexeddb/auto'
import { describe, it, expect, afterEach } from 'vitest'
import { createMemory, editMemory } from '@/domain/memory'
import { getOrCreateTodaysPrompt } from '@/domain/prompt'
import { ensureUserProfile } from '@/domain/user'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { collectBackup, parseBackup, restoreBackup, serializeBackup } from '@/domain/export'
import { LifeLikeKaleidoscopeDb } from './db'
import { createIndexedDbRepositories, type Repositories } from './index'

const EXPORT_NOW = '2026-07-07T12:00:00.000Z'

let dbCounter = 0
const openedDbNames: string[] = []

function freshRepos(): Repositories {
  const name = `restore-test-db-${++dbCounter}`
  openedDbNames.push(name)
  return createIndexedDbRepositories(name)
}

function fixedDeps(prefix: string, at: string) {
  let counter = 0
  return { generateId: () => `${prefix}-${++counter}`, now: () => at }
}

/** A source database with every entity populated, including an edit (two versions) and a photo blob. */
async function seedFullApp(repos: Repositories): Promise<void> {
  await repos.userProfile.save({ id: 'user-1', displayName: 'Zh' })
  await repos.prompts.save({ id: 'prompt-1', word: 'Bicycle', createdAt: '2026-07-01T06:00:00.000Z' })
  await repos.people.save({ id: 'person-1', name: 'Mom' })
  await repos.places.save({ id: 'place-1', name: 'The old kitchen' })
  await repos.tags.save({ id: 'tag-1', label: 'childhood' })

  const created = createMemory(
    {
      promptId: 'prompt-1',
      story: 'The red bicycle leaned against the fence.',
      approxAge: 8,
      peopleIds: ['person-1'],
      placeIds: ['place-1'],
      tagIds: ['tag-1'],
      photoIds: ['photo-1'],
      authoredBy: 'user-1',
    },
    fixedDeps('a', '2026-07-01T10:00:00.000Z')
  )
  await repos.memories.create(created)
  const edited = editMemory(
    created.memory,
    { story: 'The red bicycle leaned against the fence all summer.' },
    fixedDeps('b', '2026-07-02T09:00:00.000Z')
  )
  await repos.memories.update(edited)

  await repos.photos.save(
    { id: 'photo-1', memoryId: created.memory.id, blobRef: 'blob-1', caption: 'The fence' },
    new Blob(['hello'], { type: 'image/png' })
  )
  await repos.blockedWords.save({
    id: 'blocked-1',
    word: 'Divorce',
    locale: 'en',
    blockedAt: '2026-07-03T08:00:00.000Z',
  })
}

afterEach(async () => {
  await Promise.all(openedDbNames.splice(0).map((name) => new LifeLikeKaleidoscopeDb(name).delete()))
})

describe('IndexedDbRestoreTarget', () => {
  it('round-trips: export → fresh browser → import → identical app state', async () => {
    const source = freshRepos()
    await seedFullApp(source)
    const exported = await collectBackup(source, { now: () => EXPORT_NOW })
    const fileText = serializeBackup(exported)

    // "Cleared site data": a brand-new database that the app has already been
    // opened in once — today's prompt and a default profile self-created.
    const restored = freshRepos()
    await getOrCreateTodaysPrompt(restored.prompts, { generateId: defaultGenerateId, now: nowIso })
    await ensureUserProfile(restored.userProfile, { generateId: defaultGenerateId })

    await restoreBackup(parseBackup(fileText), restored.restore)

    const reexported = await collectBackup(restored, { now: () => EXPORT_NOW })
    expect(reexported).toEqual(exported)
  })

  it('restores photo bytes readable as the original blob', async () => {
    const source = freshRepos()
    await seedFullApp(source)
    const exported = await collectBackup(source, { now: () => EXPORT_NOW })

    const restored = freshRepos()
    await restoreBackup(exported, restored.restore)

    const blob = await restored.photos.getBlob('blob-1')
    expect(blob?.type).toBe('image/png')
    expect(await blob?.text()).toBe('hello')
  })

  it('counts auto-created rows as an empty app, but any memory/person/place/tag/photo as data', async () => {
    const repos = freshRepos()
    await getOrCreateTodaysPrompt(repos.prompts, { generateId: defaultGenerateId, now: nowIso })
    await ensureUserProfile(repos.userProfile, { generateId: defaultGenerateId })
    expect(await repos.restore.hasUserData()).toBe(false)

    await repos.people.save({ id: 'person-1', name: 'Mom' })
    expect(await repos.restore.hasUserData()).toBe(true)
  })

  it('counts a blocked word (a deliberate user action) as data too', async () => {
    const repos = freshRepos()
    await getOrCreateTodaysPrompt(repos.prompts, { generateId: defaultGenerateId, now: nowIso })
    expect(await repos.restore.hasUserData()).toBe(false)

    await repos.blockedWords.save({
      id: 'blocked-1',
      word: 'Hospital',
      locale: 'en',
      blockedAt: '2026-07-03T08:00:00.000Z',
    })
    expect(await repos.restore.hasUserData()).toBe(true)
  })

  it('refuses to restore over existing memories and leaves them untouched', async () => {
    const source = freshRepos()
    await seedFullApp(source)
    const exported = await collectBackup(source, { now: () => EXPORT_NOW })

    const occupied = freshRepos()
    const existing = createMemory(
      { promptId: 'prompt-x', story: 'Already written here.', authoredBy: 'user-x' },
      fixedDeps('x', '2026-07-05T10:00:00.000Z')
    )
    await occupied.memories.create(existing)

    await expect(restoreBackup(exported, occupied.restore)).rejects.toThrow(/already holds/)
    expect(await occupied.memories.getAll()).toEqual([existing.memory])
  })
})
