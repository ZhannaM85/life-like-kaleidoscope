// Orchestrates photo additions/removals for MemoryForm's save flow (Epic 5).
// Mirrors memory-form.ts's resolveEntityIds: pure allocation + persistence
// helpers shared by MemoryNewPage and MemoryEditPage.
import type { EntityId, GenerateId } from '@/domain/shared'
import type { PhotoRepository } from '@/domain/memory'

/** What MemoryForm's photo section produced on submit. */
export interface PhotoChanges {
  newFiles: File[]
  removedPhotoIds: EntityId[]
}

export interface PhotoAllocation {
  id: EntityId
  file: File
}

/**
 * Pre-allocates ids for newly added files, before the memory itself is
 * created — so a brand-new memory's first version can carry the final
 * `photoIds` list from the start, the same way resolveEntityIds resolves
 * people/place/tag ids before `createMemory` runs.
 */
export function allocatePhotos(files: File[], generateId: GenerateId): PhotoAllocation[] {
  return files.map((file) => ({ id: generateId(), file }))
}

/** Saves each allocated photo's blob under `memoryId`. blobRef reuses the photo's own id. */
export async function persistPhotos(
  photos: PhotoRepository,
  memoryId: EntityId,
  allocations: PhotoAllocation[]
): Promise<void> {
  await Promise.all(
    allocations.map((a) => photos.save({ id: a.id, memoryId, blobRef: a.id }, a.file))
  )
}
