import type { EntityId } from '@/domain/shared'
import type { CustomWord, CustomWordRepository } from '@/domain/prompt'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbCustomWordRepository implements CustomWordRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async save(customWord: CustomWord): Promise<void> {
    await this.db.customWords.put(customWord)
  }

  async remove(id: EntityId): Promise<void> {
    await this.db.customWords.delete(id)
  }

  getAll(): Promise<CustomWord[]> {
    return this.db.customWords.toArray()
  }
}
