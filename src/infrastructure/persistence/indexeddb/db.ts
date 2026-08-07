import Dexie, { type Table } from 'dexie'
import type { Memory, MemoryVersion, Photo } from '@/domain/memory'
import type { Prompt, BlockedWord, CustomWord } from '@/domain/prompt'
import type { Person } from '@/domain/person'
import type { Place } from '@/domain/place'
import type { Tag } from '@/domain/tag'
import type { UserProfile } from '@/domain/user'

/**
 * Row in the photo blob store; binary content is kept out of the Photo entity.
 * Stored as raw bytes + mime type rather than a Blob — Blobs don't survive
 * IndexedDB structured cloning reliably in all environments (notably older
 * Safari), while ArrayBuffers do.
 */
export interface PhotoBlobRow {
  blobRef: string
  bytes: ArrayBuffer
  type: string
}

export class LifeLikeKaleidoscopeDb extends Dexie {
  prompts!: Table<Prompt, string>
  memories!: Table<Memory, string>
  memoryVersions!: Table<MemoryVersion, string>
  people!: Table<Person, string>
  places!: Table<Place, string>
  tags!: Table<Tag, string>
  photos!: Table<Photo, string>
  photoBlobs!: Table<PhotoBlobRow, string>
  userProfiles!: Table<UserProfile, string>
  blockedWords!: Table<BlockedWord, string>
  customWords!: Table<CustomWord, string>

  constructor(name = 'life-like-kaleidoscope') {
    super(name)
    this.version(1).stores({
      prompts: 'id, word, createdAt',
      memories: 'id, promptId, createdAt, updatedAt, *peopleIds, *placeIds, *tagIds',
      memoryVersions: 'id, memoryId, editedAt',
      people: 'id, name',
      places: 'id, name',
      tags: 'id, label',
      photos: 'id, memoryId',
      photoBlobs: 'blobRef',
      userProfiles: 'id',
    })
    // Additive only — unlisted stores from version 1 carry forward untouched.
    this.version(2).stores({
      blockedWords: 'id, word, locale',
    })
    this.version(3).stores({
      customWords: 'id, word',
    })
  }
}
