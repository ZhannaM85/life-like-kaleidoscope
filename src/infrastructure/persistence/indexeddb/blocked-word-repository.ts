import type { EntityId } from '@/domain/shared'
import type { BlockedWord, BlockedWordRepository } from '@/domain/prompt'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbBlockedWordRepository implements BlockedWordRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async save(blockedWord: BlockedWord): Promise<void> {
    await this.db.blockedWords.put(blockedWord)
  }

  async remove(id: EntityId): Promise<void> {
    await this.db.blockedWords.delete(id)
  }

  getAll(): Promise<BlockedWord[]> {
    return this.db.blockedWords.toArray()
  }
}
