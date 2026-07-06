import type { EntityId } from '@/domain/shared'
import type { Photo, PhotoRepository } from '@/domain/memory'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbPhotoRepository implements PhotoRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async save(photo: Photo, blob: Blob): Promise<void> {
    const bytes = await blob.arrayBuffer()
    await this.db.transaction('rw', this.db.photos, this.db.photoBlobs, async () => {
      await this.db.photoBlobs.put({ blobRef: photo.blobRef, bytes, type: blob.type })
      await this.db.photos.put(photo)
    })
  }

  getById(id: EntityId): Promise<Photo | undefined> {
    return this.db.photos.get(id)
  }

  getByMemoryId(memoryId: EntityId): Promise<Photo[]> {
    return this.db.photos.where('memoryId').equals(memoryId).toArray()
  }

  async getBlob(blobRef: string): Promise<Blob | undefined> {
    const row = await this.db.photoBlobs.get(blobRef)
    if (!row) return undefined
    return new Blob([row.bytes], { type: row.type })
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.transaction('rw', this.db.photos, this.db.photoBlobs, async () => {
      const photo = await this.db.photos.get(id)
      if (!photo) return
      await this.db.photoBlobs.delete(photo.blobRef)
      await this.db.photos.delete(id)
    })
  }
}
