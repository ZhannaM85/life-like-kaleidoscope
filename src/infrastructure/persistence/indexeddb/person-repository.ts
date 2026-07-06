import type { EntityId } from '@/domain/shared'
import type { Person, PersonRepository } from '@/domain/person'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbPersonRepository implements PersonRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async save(person: Person): Promise<void> {
    await this.db.people.put(person)
  }

  getById(id: EntityId): Promise<Person | undefined> {
    return this.db.people.get(id)
  }

  getAll(): Promise<Person[]> {
    return this.db.people.orderBy('name').toArray()
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.people.delete(id)
  }
}
