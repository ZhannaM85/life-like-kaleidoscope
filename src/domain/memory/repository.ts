import type { EntityId } from '@/domain/shared'
import type { Memory, MemoryVersion, Photo } from './memory'
import type { MemoryWithVersion } from './versioning'

export interface MemoryRepository {
  /** Persist a newly created memory together with its initial version, atomically. */
  create(data: MemoryWithVersion): Promise<void>
  /**
   * Persist an edited memory together with the new version produced by the
   * edit, atomically. Existing versions must never be modified or removed.
   */
  update(data: MemoryWithVersion): Promise<void>
  getById(id: EntityId): Promise<Memory | undefined>
  /** All memories, most recently written first. */
  getAll(): Promise<Memory[]>
  getByPromptId(promptId: EntityId): Promise<Memory[]>
  /** Full version history of a memory, oldest first. */
  getVersions(memoryId: EntityId): Promise<MemoryVersion[]>
  /** Deletes the memory and its whole version history. Distinct from editing. */
  delete(id: EntityId): Promise<void>
}

export interface PhotoRepository {
  /** Store photo metadata and its binary content under photo.blobRef, atomically. */
  save(photo: Photo, blob: Blob): Promise<void>
  getById(id: EntityId): Promise<Photo | undefined>
  getByMemoryId(memoryId: EntityId): Promise<Photo[]>
  getBlob(blobRef: string): Promise<Blob | undefined>
  delete(id: EntityId): Promise<void>
}
