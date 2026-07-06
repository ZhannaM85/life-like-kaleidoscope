import Dexie, { type Table } from 'dexie'
import type { Memory, MemoryVersion, Photo } from '@/domain/memory'
import type { Prompt } from '@/domain/prompt'
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

  // The persisted database name predates the rename to "Life Like Kaleidoscope"
  // and must stay 'life-kaleidoscope': changing it would open a fresh empty
  // database and orphan every existing user's data.
  constructor(name = 'life-kaleidoscope') {
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
  }
}
