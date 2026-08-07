import { describe, it, expect, vi } from 'vitest'
import type { Photo, PhotoRepository } from '@/domain/memory'
import { allocatePhotos, persistPhotos } from './photo-changes'

function fakeGenerateId() {
  let n = 0
  return () => `id-${++n}`
}

function fakePhotoRepository(): PhotoRepository & { saved: [Photo, Blob][] } {
  const saved: [Photo, Blob][] = []
  return {
    saved,
    save: vi.fn(async (photo: Photo, blob: Blob) => {
      saved.push([photo, blob])
    }),
    getById: vi.fn(),
    getByMemoryId: vi.fn(),
    getBlob: vi.fn(),
    delete: vi.fn(),
  }
}

describe('allocatePhotos', () => {
  it('assigns a generated id to each file', () => {
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')]
    const allocations = allocatePhotos(files, fakeGenerateId())

    expect(allocations).toEqual([
      { id: 'id-1', file: files[0] },
      { id: 'id-2', file: files[1] },
    ])
  })

  it('returns an empty array for no files', () => {
    expect(allocatePhotos([], fakeGenerateId())).toEqual([])
  })
})

describe('persistPhotos', () => {
  it('saves each allocation under the given memory id, reusing the photo id as blobRef', async () => {
    const repo = fakePhotoRepository()
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')]
    const allocations = allocatePhotos(files, fakeGenerateId())

    await persistPhotos(repo, 'memory-1', allocations)

    expect(repo.saved).toHaveLength(2)
    expect(repo.saved[0][0]).toEqual({ id: 'id-1', memoryId: 'memory-1', blobRef: 'id-1' })
    expect(repo.saved[1][0]).toEqual({ id: 'id-2', memoryId: 'memory-1', blobRef: 'id-2' })
  })

  it('is a no-op for no allocations', async () => {
    const repo = fakePhotoRepository()
    await persistPhotos(repo, 'memory-1', [])
    expect(repo.save).not.toHaveBeenCalled()
  })
})
