import type { EntityId } from '@/domain/shared'

/** A free-form label attached to memories — a node in the future memory graph. */
export interface Tag {
  id: EntityId
  label: string
}

export interface TagRepository {
  save(tag: Tag): Promise<void>
  getById(id: EntityId): Promise<Tag | undefined>
  getAll(): Promise<Tag[]>
  delete(id: EntityId): Promise<void>
}
