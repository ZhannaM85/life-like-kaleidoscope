// IndexedDB / Dexie repository implementations.
// Nothing outside this folder should import Dexie directly.
import { LifeLikeKaleidoscopeDb } from './db'
import { IndexedDbMemoryRepository } from './memory-repository'
import { IndexedDbPhotoRepository } from './photo-repository'
import { IndexedDbPromptRepository } from './prompt-repository'
import { IndexedDbPersonRepository } from './person-repository'
import { IndexedDbPlaceRepository } from './place-repository'
import { IndexedDbTagRepository } from './tag-repository'
import { IndexedDbUserProfileRepository } from './user-profile-repository'
import type { MemoryRepository, PhotoRepository } from '@/domain/memory'
import type { PromptRepository } from '@/domain/prompt'
import type { PersonRepository } from '@/domain/person'
import type { PlaceRepository } from '@/domain/place'
import type { TagRepository } from '@/domain/tag'
import type { UserProfileRepository } from '@/domain/user'

export { LifeLikeKaleidoscopeDb } from './db'
export { IndexedDbMemoryRepository } from './memory-repository'
export { IndexedDbPhotoRepository } from './photo-repository'
export { IndexedDbPromptRepository } from './prompt-repository'
export { IndexedDbPersonRepository } from './person-repository'
export { IndexedDbPlaceRepository } from './place-repository'
export { IndexedDbTagRepository } from './tag-repository'
export { IndexedDbUserProfileRepository } from './user-profile-repository'

/** Everything the app needs to talk to persistence, behind domain interfaces. */
export interface Repositories {
  memories: MemoryRepository
  photos: PhotoRepository
  prompts: PromptRepository
  people: PersonRepository
  places: PlaceRepository
  tags: TagRepository
  userProfile: UserProfileRepository
}

/**
 * Single composition point for the IndexedDB persistence layer. A future
 * remote backend swaps this factory for one returning Api*Repository
 * implementations — no store or feature code changes.
 */
export function createIndexedDbRepositories(dbName?: string): Repositories {
  const db = new LifeLikeKaleidoscopeDb(dbName)
  return {
    memories: new IndexedDbMemoryRepository(db),
    photos: new IndexedDbPhotoRepository(db),
    prompts: new IndexedDbPromptRepository(db),
    people: new IndexedDbPersonRepository(db),
    places: new IndexedDbPlaceRepository(db),
    tags: new IndexedDbTagRepository(db),
    userProfile: new IndexedDbUserProfileRepository(db),
  }
}
