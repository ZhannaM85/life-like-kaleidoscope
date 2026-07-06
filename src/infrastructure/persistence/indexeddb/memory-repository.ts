import type { EntityId } from '@/domain/shared'
import type { Memory, MemoryRepository, MemoryVersion, MemoryWithVersion } from '@/domain/memory'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbMemoryRepository implements MemoryRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async create(data: MemoryWithVersion): Promise<void> {
    await this.db.transaction('rw', this.db.memories, this.db.memoryVersions, async () => {
      await this.db.memories.add(data.memory)
      await this.db.memoryVersions.add(data.version)
    })
  }

  async update(data: MemoryWithVersion): Promise<void> {
    await this.db.transaction('rw', this.db.memories, this.db.memoryVersions, async () => {
      // Versions are append-only: `add` (not `put`) so an id collision with an
      // existing version fails loudly instead of silently rewriting history.
      await this.db.memoryVersions.add(data.version)
      await this.db.memories.put(data.memory)
    })
  }

  getById(id: EntityId): Promise<Memory | undefined> {
    return this.db.memories.get(id)
  }

  getAll(): Promise<Memory[]> {
    return this.db.memories.orderBy('createdAt').reverse().toArray()
  }

  getByPromptId(promptId: EntityId): Promise<Memory[]> {
    return this.db.memories.where('promptId').equals(promptId).toArray()
  }

  getVersions(memoryId: EntityId): Promise<MemoryVersion[]> {
    return this.db.memoryVersions.where('memoryId').equals(memoryId).sortBy('editedAt')
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.transaction('rw', this.db.memories, this.db.memoryVersions, async () => {
      await this.db.memoryVersions.where('memoryId').equals(id).delete()
      await this.db.memories.delete(id)
    })
  }
}
