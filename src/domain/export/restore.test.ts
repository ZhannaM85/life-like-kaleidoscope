import { describe, it, expect, vi } from 'vitest'
import { createMemory, editMemory } from '@/domain/memory'
import type { BackupFile } from './backup'
import { serializeBackup } from './backup'
import { base64ToBytes, parseBackup, restoreBackup, summarizeBackup } from './restore'
import type { RestoreTarget } from './restore'

const EXPORT_NOW = '2026-07-07T12:00:00.000Z'

function fixedDeps(prefix: string, at: string) {
  let counter = 0
  return { generateId: () => `${prefix}-${++counter}`, now: () => at }
}

const created = createMemory(
  {
    promptId: 'prompt-1',
    story: 'The red bicycle leaned against the fence all summer.',
    approxAge: 8,
    mood: 'sad',
    peopleIds: ['person-1'],
    placeIds: ['place-1'],
    tagIds: ['tag-1'],
    photoIds: ['photo-1', 'photo-2'],
    authoredBy: 'user-1',
  },
  fixedDeps('a', '2026-07-01T10:00:00.000Z')
)
const edited = editMemory(
  created.memory,
  { story: 'The red bicycle leaned against the fence all of that summer.' },
  fixedDeps('b', '2026-07-02T09:00:00.000Z')
)

/** A backup exercising every entity, both versions, and both photo-content cases. */
const fullBackup: BackupFile = {
  app: 'life-like-kaleidoscope',
  schemaVersion: 1,
  exportedAt: EXPORT_NOW,
  data: {
    userProfile: { id: 'user-1', displayName: 'Zh' },
    prompts: [{ id: 'prompt-1', word: 'Bicycle', createdAt: '2026-07-01T06:00:00.000Z' }],
    memories: [edited.memory],
    memoryVersions: [created.version, edited.version],
    people: [{ id: 'person-1', name: 'Mom' }],
    places: [{ id: 'place-1', name: 'The old kitchen', notes: 'Torn down in 2001' }],
    tags: [{ id: 'tag-1', label: 'childhood' }],
    photos: [
      {
        id: 'photo-1',
        memoryId: edited.memory.id,
        blobRef: 'blob-1',
        caption: 'The fence',
        content: { base64: 'aGVsbG8=', mediaType: 'image/png' },
      },
      { id: 'photo-2', memoryId: edited.memory.id, blobRef: 'gone', content: null },
    ],
    blockedWords: [
      { id: 'blocked-1', word: 'Hospital', locale: 'en', blockedAt: '2026-07-03T08:00:00.000Z' },
    ],
    customWords: [
      { id: 'custom-1', word: 'Dacha', createdAt: '2026-07-02T08:00:00.000Z' },
    ],
  },
}

describe('parseBackup', () => {
  it('round-trips a serialized backup to an identical value', () => {
    expect(parseBackup(serializeBackup(fullBackup))).toEqual(fullBackup)
  })

  it('rejects text that is not JSON, in words a person can act on', () => {
    expect(() => parseBackup('once upon a time')).toThrow(/could not be read as JSON/)
  })

  it('rejects JSON that is not one of our backups', () => {
    expect(() => parseBackup('{"some": "other file"}')).toThrow(/doesn't look like/)
  })

  it('rejects an unknown format version by naming both versions', () => {
    const newer = serializeBackup({ ...fullBackup, schemaVersion: 2 as never })
    expect(() => parseBackup(newer)).toThrow(/format version 2.*reads version 1/)
  })

  it('names the broken field when the shape is damaged', () => {
    const damaged = JSON.parse(serializeBackup(fullBackup)) as {
      data: { memories: { story?: string }[] }
    }
    delete damaged.data.memories[0].story
    expect(() => parseBackup(JSON.stringify(damaged))).toThrow(
      /damaged or incomplete \(data\.memories\.0\.story/
    )
  })
})

describe('summarizeBackup', () => {
  it('counts every entity, version history and byte-less photos included', () => {
    expect(summarizeBackup(fullBackup)).toEqual({
      exportedAt: EXPORT_NOW,
      memories: 1,
      memoryVersions: 2,
      prompts: 1,
      people: 1,
      places: 1,
      tags: 1,
      photos: 2,
      photosWithoutBytes: 1,
      hasProfile: true,
    })
  })
})

describe('restoreBackup', () => {
  it('refuses to write over existing user data', async () => {
    const target: RestoreTarget = {
      hasUserData: () => Promise.resolve(true),
      replaceAll: vi.fn(() => Promise.resolve()),
    }
    await expect(restoreBackup(fullBackup, target)).rejects.toThrow(/already holds memories/)
    expect(target.replaceAll).not.toHaveBeenCalled()
  })

  it('hands the backup to the target when the app is empty', async () => {
    const target: RestoreTarget = {
      hasUserData: () => Promise.resolve(false),
      replaceAll: vi.fn(() => Promise.resolve()),
    }
    await restoreBackup(fullBackup, target)
    expect(target.replaceAll).toHaveBeenCalledWith(fullBackup)
  })
})

describe('base64ToBytes', () => {
  it("inverts the export's encoding", () => {
    expect(new TextDecoder().decode(base64ToBytes('aGVsbG8='))).toBe('hello')
  })
})
