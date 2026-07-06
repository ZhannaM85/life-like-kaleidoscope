import type { EntityId } from '@/domain/shared'
import type { Place, PlaceRepository } from '@/domain/place'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbPlaceRepository implements PlaceRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async save(place: Place): Promise<void> {
    await this.db.places.put(place)
  }

  getById(id: EntityId): Promise<Place | undefined> {
    return this.db.places.get(id)
  }

  getAll(): Promise<Place[]> {
    return this.db.places.orderBy('name').toArray()
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.places.delete(id)
  }
}
