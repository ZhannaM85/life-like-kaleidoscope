import { z } from 'zod'
import type { IsoDateString } from '@/domain/shared'
import { BACKUP_SCHEMA_VERSION, type BackupFile } from './backup'

// The Zod mirror of BackupFile, so a file from outside the app is validated
// field-by-field before anything is written. parseBackup's return type pins
// the schema to BackupFile at compile time — they cannot silently drift.

const entityIdSchema = z.string().min(1)
const isoDateStringSchema = z.string().min(1)

const memorySnapshotSchema = z.object({
  id: entityIdSchema,
  promptId: entityIdSchema,
  title: z.string().optional(),
  story: z.string(),
  approxAge: z.number().optional(),
  approxYear: z.number().optional(),
  mood: z.enum(['happy', 'bittersweet', 'neutral', 'sad']).optional(),
  peopleIds: z.array(entityIdSchema),
  placeIds: z.array(entityIdSchema),
  tagIds: z.array(entityIdSchema),
  photoIds: z.array(entityIdSchema),
  authoredBy: entityIdSchema,
  aboutWhom: entityIdSchema,
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
})

const memorySchema = memorySnapshotSchema.extend({ currentVersionId: entityIdSchema })

const memoryVersionSchema = z.object({
  id: entityIdSchema,
  memoryId: entityIdSchema,
  snapshot: memorySnapshotSchema,
  editedAt: isoDateStringSchema,
})

const backupPhotoSchema = z.object({
  id: entityIdSchema,
  memoryId: entityIdSchema,
  blobRef: z.string().min(1),
  caption: z.string().optional(),
  content: z.object({ base64: z.base64(), mediaType: z.string() }).nullable(),
})

const promptSchema = z.object({
  id: entityIdSchema,
  word: z.string(),
  createdAt: isoDateStringSchema,
  skipped: z.boolean().optional(),
})

const blockedWordSchema = z.object({
  id: entityIdSchema,
  word: z.string(),
  locale: z.enum(['en', 'ru']),
  blockedAt: isoDateStringSchema,
})

const customWordSchema = z.object({
  id: entityIdSchema,
  word: z.string(),
  createdAt: isoDateStringSchema,
})

const personSchema = z.object({
  id: entityIdSchema,
  name: z.string(),
  notes: z.string().optional(),
})

const placeSchema = z.object({
  id: entityIdSchema,
  name: z.string(),
  notes: z.string().optional(),
})

const tagSchema = z.object({ id: entityIdSchema, label: z.string() })

const userProfileSchema = z.object({
  id: entityIdSchema,
  displayName: z.string(),
  legacyContact: z.object({ name: z.string(), contactInfo: z.string() }).optional(),
})

export const backupFileSchema = z.object({
  app: z.literal('life-like-kaleidoscope'),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: isoDateStringSchema,
  data: z.object({
    userProfile: userProfileSchema.nullable(),
    prompts: z.array(promptSchema),
    memories: z.array(memorySchema),
    memoryVersions: z.array(memoryVersionSchema),
    people: z.array(personSchema),
    places: z.array(placeSchema),
    tags: z.array(tagSchema),
    photos: z.array(backupPhotoSchema),
    blockedWords: z.array(blockedWordSchema),
    customWords: z.array(customWordSchema),
  }),
})

/**
 * Parse and validate the text of a backup file. Throws an Error whose message
 * is written for the user — the UI shows it verbatim. The checks go from the
 * outside in (JSON → is it ours → format version → full shape) so the message
 * names the most useful problem, not the first schema mismatch.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file could not be read as JSON — is it the right file?')
  }

  const probe = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
  if (probe?.app !== 'life-like-kaleidoscope') {
    throw new Error("This doesn't look like a Life Like Kaleidoscope backup file.")
  }
  if (probe.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `This backup uses format version ${String(probe.schemaVersion)}, but this app reads version ${BACKUP_SCHEMA_VERSION} — it was probably made by a newer version of the app.`
    )
  }

  const result = backupFileSchema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue.path.length > 0 ? issue.path.join('.') : 'file'
    throw new Error(`This backup file is damaged or incomplete (${where}: ${issue.message}).`)
  }
  const backup: BackupFile = result.data
  return backup
}

/** What a backup holds — shown to the user before anything is written. */
export interface BackupSummary {
  exportedAt: IsoDateString
  memories: number
  memoryVersions: number
  prompts: number
  people: number
  places: number
  tags: number
  photos: number
  /** Photos whose bytes were already missing when the backup was made. */
  photosWithoutBytes: number
  hasProfile: boolean
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const { data } = backup
  return {
    exportedAt: backup.exportedAt,
    memories: data.memories.length,
    memoryVersions: data.memoryVersions.length,
    prompts: data.prompts.length,
    people: data.people.length,
    places: data.places.length,
    tags: data.tags.length,
    photos: data.photos.length,
    photosWithoutBytes: data.photos.filter((photo) => photo.content === null).length,
    hasProfile: data.userProfile !== null,
  }
}

/**
 * The write half of restore — implemented by the persistence layer (the
 * contract lives in domain, same as the repository interfaces). It sits
 * beside, not inside, the per-entity repositories because restoring replaces
 * storage wholesale, which no per-entity contract should offer.
 */
export interface RestoreTarget {
  /**
   * True when user-authored data exists: memories, people, places, tags, or
   * photos. Rows the app creates on its own — today's prompt, the default
   * profile — must not count, or restoring into a freshly-opened browser
   * would be impossible: just visiting the Today page already issues a prompt.
   */
  hasUserData(): Promise<boolean>
  /** Atomically replace everything in storage with the backup's contents. */
  replaceAll(backup: BackupFile): Promise<void>
}

/**
 * MVP merge strategy: restore only into an empty app (id-collision handling
 * for non-empty databases is a follow-up). Auto-created rows are replaced
 * along with everything else, so the result is exactly the backup — the
 * export → clear site data → import round-trip.
 */
export async function restoreBackup(backup: BackupFile, target: RestoreTarget): Promise<void> {
  if (await target.hasUserData()) {
    throw new Error(
      'This app already holds memories, so restoring would overwrite them. A backup can only be restored into an empty app — export the current data first if you need to keep it.'
    )
  }
  await target.replaceAll(backup)
}

/** Inverse of the export's base64 encoding — rebuilds photo bytes on restore. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
