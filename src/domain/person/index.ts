import type { EntityId } from '@/domain/shared'

/** A person referenced by memories — a node in the future memory graph. */
export interface Person {
  id: EntityId
  name: string
  notes?: string
}

export interface PersonRepository {
  save(person: Person): Promise<void>
  getById(id: EntityId): Promise<Person | undefined>
  getAll(): Promise<Person[]>
  delete(id: EntityId): Promise<void>
}
