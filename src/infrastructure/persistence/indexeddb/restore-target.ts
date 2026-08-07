import { base64ToBytes, type BackupFile, type RestoreTarget } from '@/domain/export'
import type { Photo } from '@/domain/memory'
import type { LifeLikeKaleidoscopeDb, PhotoBlobRow } from './db'

/**
 * Implements restore as one Dexie transaction that clears every table and
 * writes the backup's rows — all-or-nothing, and the resulting database is
 * exactly what export read, which is what makes the round-trip identical.
 */
export class IndexedDbRestoreTarget implements RestoreTarget {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async hasUserData(): Promise<boolean> {
    // Deliberately not counting prompts or profiles: the app auto-creates
    // today's prompt on load and a default profile on first save, and those
    // must not block restoring into an otherwise fresh browser. Blocked words
    // (#27) are always a deliberate user action, so they do count.
    const [memories, people, places, tags, photos, blockedWords] = await Promise.all([
      this.db.memories.count(),
      this.db.people.count(),
      this.db.places.count(),
      this.db.tags.count(),
      this.db.photos.count(),
      this.db.blockedWords.count(),
    ])
    return memories + people + places + tags + photos + blockedWords > 0
  }

  async replaceAll(backup: BackupFile): Promise<void> {
    // Rows are built before the transaction — Dexie aborts a transaction that
    // waits on anything other than its own database work.
    const photos: Photo[] = []
    const photoBlobs: PhotoBlobRow[] = []
    for (const { content, ...photo } of backup.data.photos) {
      photos.push(photo)
      // A photo exported with content: null had already lost its bytes; storing
      // only its metadata reproduces that state instead of inventing a blob.
      if (content) {
        photoBlobs.push({
          blobRef: photo.blobRef,
          bytes: base64ToBytes(content.base64).buffer,
          type: content.mediaType,
        })
      }
    }

    const tables = [
      this.db.prompts,
      this.db.memories,
      this.db.memoryVersions,
      this.db.people,
      this.db.places,
      this.db.tags,
      this.db.photos,
      this.db.photoBlobs,
      this.db.userProfiles,
      this.db.blockedWords,
    ]
    await this.db.transaction('rw', tables, async () => {
      await Promise.all(tables.map((table) => table.clear()))
      await Promise.all([
        this.db.prompts.bulkAdd(backup.data.prompts),
        this.db.memories.bulkAdd(backup.data.memories),
        this.db.memoryVersions.bulkAdd(backup.data.memoryVersions),
        this.db.people.bulkAdd(backup.data.people),
        this.db.places.bulkAdd(backup.data.places),
        this.db.tags.bulkAdd(backup.data.tags),
        this.db.photos.bulkAdd(photos),
        this.db.photoBlobs.bulkAdd(photoBlobs),
        this.db.blockedWords.bulkAdd(backup.data.blockedWords),
        ...(backup.data.userProfile ? [this.db.userProfiles.add(backup.data.userProfile)] : []),
      ])
    })
  }
}
