import { describe, it, expect } from 'vitest'
import { createMemory } from '@/domain/memory'
import type { Memory, MemoryVersion, Photo } from '@/domain/memory'
import type { Prompt, BlockedWord } from '@/domain/prompt'
import { localDateKey } from '@/domain/prompt'
import type { Person } from '@/domain/person'
import type { Place } from '@/domain/place'
import type { Tag } from '@/domain/tag'
import type { UserProfile } from '@/domain/user'
import { collectBackup, serializeBackup, type BackupSources } from './backup'
import { backupToMarkdown } from './markdown'
import { backupToPrintHtml } from './print-html'

const EXPORT_NOW = '2026-07-07T12:00:00.000Z'

function fixedDeps(prefix: string, at: string) {
  let counter = 0
  return { generateId: () => `${prefix}-${++counter}`, now: () => at }
}

const notUsed = () => Promise.reject(new Error('not used by export'))

function listRepo<T extends { id: string }>(items: T[]) {
  return {
    save: notUsed,
    delete: notUsed,
    getById: (id: string) => Promise.resolve(items.find((item) => item.id === id)),
    getAll: () => Promise.resolve(items),
  }
}

/** In-memory fakes for everything export reads. Newest-first like the real repo. */
function makeSources(data: {
  memories?: Memory[]
  versions?: MemoryVersion[]
  photos?: Photo[]
  blobs?: Record<string, Blob>
  prompts?: Prompt[]
  people?: Person[]
  places?: Place[]
  tags?: Tag[]
  profile?: UserProfile
  blockedWords?: BlockedWord[]
}): BackupSources {
  const memories = [...(data.memories ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const versions = data.versions ?? []
  const photos = data.photos ?? []
  const blobs = data.blobs ?? {}
  const prompts = data.prompts ?? []
  const blockedWords = data.blockedWords ?? []
  return {
    memories: {
      create: notUsed,
      update: notUsed,
      delete: notUsed,
      getById: (id) => Promise.resolve(memories.find((m) => m.id === id)),
      getAll: () => Promise.resolve(memories),
      getByPromptId: (promptId) => Promise.resolve(memories.filter((m) => m.promptId === promptId)),
      getVersions: (memoryId) => Promise.resolve(versions.filter((v) => v.memoryId === memoryId)),
    },
    photos: {
      save: notUsed,
      delete: notUsed,
      getById: (id) => Promise.resolve(photos.find((p) => p.id === id)),
      getByMemoryId: (memoryId) => Promise.resolve(photos.filter((p) => p.memoryId === memoryId)),
      getBlob: (blobRef) => Promise.resolve(blobs[blobRef]),
    },
    prompts: {
      save: notUsed,
      getById: (id) => Promise.resolve(prompts.find((p) => p.id === id)),
      getAll: () => Promise.resolve(prompts),
      getByWord: (word) => Promise.resolve(prompts.filter((p) => p.word === word)),
    },
    people: listRepo(data.people ?? []),
    places: listRepo(data.places ?? []),
    tags: listRepo(data.tags ?? []),
    userProfile: { get: () => Promise.resolve(data.profile), save: notUsed },
    blockedWords: {
      save: notUsed,
      remove: notUsed,
      getAll: () => Promise.resolve(blockedWords),
    },
  }
}

const bicyclePrompt: Prompt = {
  id: 'prompt-1',
  word: 'Bicycle',
  createdAt: '2026-07-01T06:00:00.000Z',
}
const rainPrompt: Prompt = { id: 'prompt-2', word: 'Rain', createdAt: '2026-07-02T06:00:00.000Z' }

const first = createMemory(
  {
    promptId: bicyclePrompt.id,
    story: 'The red bicycle leaned against the fence all summer.',
    approxAge: 8,
    approxYear: 1993,
    mood: 'happy',
    peopleIds: ['person-1'],
    placeIds: ['place-1'],
    tagIds: ['tag-1'],
    authoredBy: 'user-1',
  },
  fixedDeps('a', '2026-07-01T10:00:00.000Z')
)

const second = createMemory(
  {
    promptId: rainPrompt.id,
    title: 'The storm',
    story: 'Rain on the tin roof, and nobody wanted to <leave>.',
    authoredBy: 'user-1',
  },
  fixedDeps('b', '2026-07-02T10:00:00.000Z')
)

const fullSources = () =>
  makeSources({
    memories: [first.memory, second.memory],
    versions: [first.version, second.version],
    prompts: [bicyclePrompt, rainPrompt],
    people: [{ id: 'person-1', name: 'Mom' }],
    places: [{ id: 'place-1', name: 'The old kitchen' }],
    tags: [{ id: 'tag-1', label: 'childhood' }],
    profile: { id: 'user-1', displayName: 'Zh' },
  })

describe('collectBackup', () => {
  it('gathers every entity, version history included, with the injected timestamp', async () => {
    const backup = await collectBackup(fullSources(), { now: () => EXPORT_NOW })

    expect(backup.app).toBe('life-like-kaleidoscope')
    expect(backup.schemaVersion).toBe(1)
    expect(backup.exportedAt).toBe(EXPORT_NOW)
    expect(backup.data.memories).toHaveLength(2)
    expect(backup.data.memoryVersions).toEqual(
      expect.arrayContaining([first.version, second.version])
    )
    expect(backup.data.prompts).toEqual([bicyclePrompt, rainPrompt])
    expect(backup.data.people).toEqual([{ id: 'person-1', name: 'Mom' }])
    expect(backup.data.userProfile).toEqual({ id: 'user-1', displayName: 'Zh' })
  })

  it('reports a missing profile as null, not undefined (JSON would drop the key)', async () => {
    const backup = await collectBackup(makeSources({}), { now: () => EXPORT_NOW })
    expect(backup.data.userProfile).toBeNull()
  })

  it('carries photo bytes inline as base64, and null content for a missing blob', async () => {
    const withPhoto: Photo = { id: 'photo-1', memoryId: first.memory.id, blobRef: 'blob-1' }
    const orphaned: Photo = { id: 'photo-2', memoryId: first.memory.id, blobRef: 'gone' }
    const backup = await collectBackup(
      makeSources({
        memories: [first.memory],
        versions: [first.version],
        photos: [withPhoto, orphaned],
        blobs: { 'blob-1': new Blob(['hello'], { type: 'image/png' }) },
      }),
      { now: () => EXPORT_NOW }
    )

    expect(backup.data.photos).toEqual([
      { ...withPhoto, content: { base64: 'aGVsbG8=', mediaType: 'image/png' } },
      { ...orphaned, content: null },
    ])
  })

  it('round-trips through serializeBackup unchanged', async () => {
    const backup = await collectBackup(fullSources(), { now: () => EXPORT_NOW })
    expect(JSON.parse(serializeBackup(backup))).toEqual(backup)
  })
})

describe('backupToMarkdown', () => {
  it('renders memories oldest first, with word headings and local dates', async () => {
    const backup = await collectBackup(fullSources(), { now: () => EXPORT_NOW })
    const markdown = backupToMarkdown(backup)

    const firstDay = localDateKey(new Date(first.memory.createdAt))
    expect(markdown).toContain('# Life Like Kaleidoscope — Memories')
    expect(markdown).toContain('2 memories.')
    expect(markdown).toContain(`## Bicycle — ${firstDay}`)
    expect(markdown).toContain(first.memory.story)
    expect(markdown).toContain('**The storm**')
    expect(markdown.indexOf('Bicycle —')).toBeLessThan(markdown.indexOf('Rain —'))
  })

  it('lists only the details a memory actually has', async () => {
    const backup = await collectBackup(fullSources(), { now: () => EXPORT_NOW })
    const markdown = backupToMarkdown(backup)

    expect(markdown).toContain('- When: around age 8, around 1993')
    expect(markdown).toContain('- Mood: happy')
    expect(markdown).toContain('- People: Mom')
    expect(markdown).toContain('- Places: The old kitchen')
    expect(markdown).toContain('- Tags: childhood')
    // The second memory has no links, dates, or mood — exactly one of each detail line.
    expect(markdown.match(/- People:/g)).toHaveLength(1)
    expect(markdown.match(/- When:/g)).toHaveLength(1)
    expect(markdown.match(/- Mood:/g)).toHaveLength(1)
  })
})

describe('backupToPrintHtml', () => {
  it('escapes story text and renders one article per memory', async () => {
    const backup = await collectBackup(fullSources(), { now: () => EXPORT_NOW })
    const html = backupToPrintHtml(backup)

    expect(html).toContain('<h2>Bicycle —')
    expect(html.match(/<article>/g)).toHaveLength(2)
    expect(html).toContain('nobody wanted to &lt;leave&gt;.')
    expect(html).not.toContain('<leave>')
  })

  it("keeps the author's paragraph breaks", () => {
    const multi = createMemory(
      {
        promptId: bicyclePrompt.id,
        story: 'First paragraph.\n\nSecond paragraph.\nSame paragraph, new line.',
        authoredBy: 'user-1',
      },
      fixedDeps('c', '2026-07-03T10:00:00.000Z')
    )
    const html = backupToPrintHtml({
      app: 'life-like-kaleidoscope',
      schemaVersion: 1,
      exportedAt: EXPORT_NOW,
      data: {
        userProfile: null,
        prompts: [bicyclePrompt],
        memories: [multi.memory],
        memoryVersions: [multi.version],
        people: [],
        places: [],
        tags: [],
        photos: [],
        blockedWords: [],
      },
    })

    expect(html).toContain('<p>First paragraph.</p>')
    expect(html).toContain('<p>Second paragraph.<br>Same paragraph, new line.</p>')
  })
})
