import type { EntityId } from '@/domain/shared'
import type { Prompt, PromptRepository } from '@/domain/prompt'
import type { LifeLikeKaleidoscopeDb } from './db'

export class IndexedDbPromptRepository implements PromptRepository {
  private readonly db: LifeLikeKaleidoscopeDb

  constructor(db: LifeLikeKaleidoscopeDb) {
    this.db = db
  }

  async save(prompt: Prompt): Promise<void> {
    await this.db.prompts.put(prompt)
  }

  getById(id: EntityId): Promise<Prompt | undefined> {
    return this.db.prompts.get(id)
  }

  getAll(): Promise<Prompt[]> {
    return this.db.prompts.orderBy('createdAt').toArray()
  }

  getByWord(word: string): Promise<Prompt[]> {
    return this.db.prompts.where('word').equals(word).sortBy('createdAt')
  }
}
