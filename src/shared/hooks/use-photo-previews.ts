import { useEffect, useRef, useState } from 'react'
import type { Photo } from '@/domain/memory'
import type { EntityId } from '@/domain/shared'
import { getRepositories } from '@/stores'

export interface PhotoPreview {
  id: EntityId
  url: string
  caption?: string
}

/**
 * Blob-URL previews for already-persisted photos (Epic 5), revoked
 * automatically when the photo list changes or the component unmounts —
 * object URLs are a browser resource with their own lifecycle, not app
 * state, so they live in a hook rather than a store.
 */
export function usePhotoPreviews(photos: readonly Photo[]): PhotoPreview[] {
  const [previews, setPreviews] = useState<PhotoPreview[]>([])
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const repos = getRepositories()
      const loaded = await Promise.all(
        photos.map(async (photo): Promise<PhotoPreview | null> => {
          const blob = await repos.photos.getBlob(photo.blobRef)
          return blob
            ? { id: photo.id, url: URL.createObjectURL(blob), caption: photo.caption }
            : null
        })
      )
      const resolved = loaded.filter((p): p is PhotoPreview => p !== null)
      if (cancelled) {
        resolved.forEach((p) => URL.revokeObjectURL(p.url))
        return
      }
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = resolved.map((p) => p.url)
      setPreviews(resolved)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [photos])

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return previews
}
