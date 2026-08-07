import type { IsoDateString, Now } from '@/domain/shared'
import type {
  Memory,
  MemoryRepository,
  MemoryVersion,
  Photo,
  PhotoRepository,
} from '@/domain/memory'
import type {
  Prompt,
  PromptRepository,
  BlockedWord,
  BlockedWordRepository,
  CustomWord,
  CustomWordRepository,
} from '@/domain/prompt'
import type { Person, PersonRepository } from '@/domain/person'
import type { Place, PlaceRepository } from '@/domain/place'
import type { Tag, TagRepository } from '@/domain/tag'
import type { UserProfile, UserProfileRepository } from '@/domain/user'

/** Bumped only if the backup shape ever changes incompatibly; import (#16) checks it. */
export const BACKUP_SCHEMA_VERSION = 1

/** A photo with its binary content carried inline, so one file is a complete backup. */
export interface BackupPhoto extends Photo {
  /** base64-encoded bytes + mime type; null when the blob was missing from storage. */
  content: { base64: string; mediaType: string } | null
}

/**
 * Everything the app knows, as one self-contained JSON-serializable value.
 * This is the format import (#16) round-trips — version histories and photo
 * bytes included, so restoring into a fresh browser loses nothing.
 */
export interface BackupFile {
  app: 'life-like-kaleidoscope'
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  exportedAt: IsoDateString
  data: {
    userProfile: UserProfile | null
    prompts: Prompt[]
    memories: Memory[]
    memoryVersions: MemoryVersion[]
    people: Person[]
    places: Place[]
    tags: Tag[]
    photos: BackupPhoto[]
    blockedWords: BlockedWord[]
    customWords: CustomWord[]
  }
}

/** What a backup reads from — structurally satisfied by the app's `Repositories` bundle. */
export interface BackupSources {
  memories: MemoryRepository
  photos: PhotoRepository
  prompts: PromptRepository
  people: PersonRepository
  places: PlaceRepository
  tags: TagRepository
  userProfile: UserProfileRepository
  blockedWords: BlockedWordRepository
  customWords: CustomWordRepository
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // Chunked so String.fromCharCode never exceeds the argument-count limit on large photos.
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/** Read every entity (and every photo's bytes) out of persistence into one backup value. */
export async function collectBackup(
  sources: BackupSources,
  deps: { now: Now }
): Promise<BackupFile> {
  const [memories, prompts, people, places, tags, userProfile, blockedWords, customWords] =
    await Promise.all([
      sources.memories.getAll(),
      sources.prompts.getAll(),
      sources.people.getAll(),
      sources.places.getAll(),
      sources.tags.getAll(),
      sources.userProfile.get(),
      sources.blockedWords.getAll(),
      sources.customWords.getAll(),
    ])

  const memoryVersions: MemoryVersion[] = []
  const photos: BackupPhoto[] = []
  for (const memory of memories) {
    memoryVersions.push(...(await sources.memories.getVersions(memory.id)))
    for (const photo of await sources.photos.getByMemoryId(memory.id)) {
      const blob = await sources.photos.getBlob(photo.blobRef)
      photos.push({
        ...photo,
        content: blob ? { base64: await blobToBase64(blob), mediaType: blob.type } : null,
      })
    }
  }

  return {
    app: 'life-like-kaleidoscope',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: deps.now(),
    data: {
      userProfile: userProfile ?? null,
      prompts,
      memories,
      memoryVersions,
      people,
      places,
      tags,
      photos,
      blockedWords,
      customWords,
    },
  }
}

/** The JSON export: the backup pretty-printed, so it stays human-inspectable. */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}
