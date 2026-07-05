import type { EntityId } from '@/domain/shared'

/** A place referenced by memories — a node in the future memory graph. */
export interface Place {
  id: EntityId
  name: string
  notes?: string
}

export interface PlaceRepository {
  save(place: Place): Promise<void>
  getById(id: EntityId): Promise<Place | undefined>
  getAll(): Promise<Place[]>
  delete(id: EntityId): Promise<void>
}
