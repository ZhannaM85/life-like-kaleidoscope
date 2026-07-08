// The full memory form (Epic 4): its Zod schema, and the conversions between
// raw form strings and domain fields. People/places/tags are typed as
// comma-separated names and resolved to entities on save — existing ones are
// reused (case-insensitively), new ones are created on the fly.
import { z } from 'zod'
import type { EntityId, GenerateId } from '@/domain/shared'
import type { PersonRepository } from '@/domain/person'
import type { PlaceRepository } from '@/domain/place'
import type { TagRepository } from '@/domain/tag'

/** Raw form values — all strings; `memoryFieldsFromValues` does the conversion. */
export interface MemoryFormValues {
  title: string
  story: string
  approxAge: string
  approxYear: string
  people: string
  places: string
  tags: string
}

function optionalIntInRange(min: number, max: number, message: string) {
  return z.string().refine((value) => {
    const trimmed = value.trim()
    if (trimmed === '') return true
    const n = Number(trimmed)
    return Number.isInteger(n) && n >= min && n <= max
  }, message)
}

/**
 * Validation stays gentle on purpose — only the story is required, and the
 * two date guesses just need to be plausible numbers when given at all.
 */
export const memoryFormSchema = z.object({
  title: z.string(),
  story: z.string().refine((value) => value.trim().length > 0, 'A memory needs at least a few words.'),
  approxAge: optionalIntInRange(0, 120, 'If you give an age, make it a whole number between 0 and 120.'),
  approxYear: optionalIntInRange(1000, 9999, 'If you give a year, make it a four-digit year.'),
  people: z.string(),
  places: z.string(),
  tags: z.string(),
})

/** Split "Mom, Aunt Vera" into trimmed names, dropping blanks and case-insensitive duplicates. */
export function parseNameList(raw: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const part of raw.split(',')) {
    const name = part.trim()
    const key = name.toLowerCase()
    if (name === '' || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

/** Form values converted to the shapes `MemoryDraft`/`MemoryEdit` want. */
export interface MemoryFormFields {
  title?: string
  story: string
  approxAge?: number
  approxYear?: number
  peopleNames: string[]
  placeNames: string[]
  tagLabels: string[]
}

function optionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  return trimmed === '' ? undefined : Number(trimmed)
}

export function memoryFieldsFromValues(values: MemoryFormValues): MemoryFormFields {
  const title = values.title.trim()
  return {
    title: title === '' ? undefined : title,
    story: values.story.trim(),
    approxAge: optionalNumber(values.approxAge),
    approxYear: optionalNumber(values.approxYear),
    peopleNames: parseNameList(values.people),
    placeNames: parseNameList(values.places),
    tagLabels: parseNameList(values.tags),
  }
}

export interface ResolvedEntityIds {
  peopleIds: EntityId[]
  placeIds: EntityId[]
  tagIds: EntityId[]
}

async function resolveOrCreate<T extends { id: EntityId }>(
  names: string[],
  existing: T[],
  nameOf: (entity: T) => string,
  make: (name: string) => T,
  save: (entity: T) => Promise<void>
): Promise<EntityId[]> {
  const idByName = new Map(existing.map((entity) => [nameOf(entity).toLowerCase(), entity.id]))
  const ids: EntityId[] = []
  for (const name of names) {
    const key = name.toLowerCase()
    let id = idByName.get(key)
    if (id === undefined) {
      const entity = make(name)
      await save(entity)
      id = entity.id
      idByName.set(key, id)
    }
    ids.push(id)
  }
  return ids
}

/**
 * Turn typed names into entity ids, reusing existing people/places/tags by
 * name (case-insensitive) and creating the rest — graph nodes stay stable
 * across memories, per the brief.
 */
export async function resolveEntityIds(
  fields: Pick<MemoryFormFields, 'peopleNames' | 'placeNames' | 'tagLabels'>,
  repos: { people: PersonRepository; places: PlaceRepository; tags: TagRepository },
  generateId: GenerateId
): Promise<ResolvedEntityIds> {
  const [allPeople, allPlaces, allTags] = await Promise.all([
    repos.people.getAll(),
    repos.places.getAll(),
    repos.tags.getAll(),
  ])
  return {
    peopleIds: await resolveOrCreate(
      fields.peopleNames,
      allPeople,
      (p) => p.name,
      (name) => ({ id: generateId(), name }),
      (p) => repos.people.save(p)
    ),
    placeIds: await resolveOrCreate(
      fields.placeNames,
      allPlaces,
      (p) => p.name,
      (name) => ({ id: generateId(), name }),
      (p) => repos.places.save(p)
    ),
    tagIds: await resolveOrCreate(
      fields.tagLabels,
      allTags,
      (t) => t.label,
      (label) => ({ id: generateId(), label }),
      (t) => repos.tags.save(t)
    ),
  }
}
