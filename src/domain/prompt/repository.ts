import type { EntityId } from '@/domain/shared'
import type { Prompt } from './prompt'

export interface PromptRepository {
  save(prompt: Prompt): Promise<void>
  getById(id: EntityId): Promise<Prompt | undefined>
  /** All prompts ever issued, oldest first. */
  getAll(): Promise<Prompt[]>
  /** Every time this word was issued as a prompt (annual reflection needs the history). */
  getByWord(word: string): Promise<Prompt[]>
}
