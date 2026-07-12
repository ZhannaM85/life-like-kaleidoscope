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

function isBlankOrValidInt(value: string, min: number, max: number): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  const n = Number(trimmed)
  return Number.isInteger(n) && n >= min && n <= max
}

function optionalIntInRange(min: number, max: number, message: string) {
  return z.string().refine((value) => isBlankOrValidInt(value, min, max), message)
}

/**
 * Same range check as the full form's Zod schema, exposed standalone so
 * quick-entry surfaces (e.g. the Today screen, #25) can validate the same
 * approx-age/year fields without pulling in the whole form schema.
 */
export function intInRangeError(
  value: string,
  min: number,
  max: number,
  message: string
): string | undefined {
  return isBlankOrValidInt(value, min, max) ? undefined : message
}

/** The validation messages, supplied by the active dictionary (#18). */
export interface MemoryFormMessages {
  storyRequired: string
  ageRange: string
  yearFourDigit: string
}

/**
 * Validation stays gentle on purpose — only the story is required, and the
 * two date guesses just need to be plausible numbers when given at all.
 */
export function makeMemoryFormSchema(messages: MemoryFormMessages) {
  return z.object({
    title: z.string(),
    story: z.string().refine((value) => value.trim().length > 0, messages.storyRequired),
    approxAge: optionalIntInRange(0, 120, messages.ageRange),
    approxYear: optionalIntInRange(1000, 9999, messages.yearFourDigit),
    people: z.string(),
    places: z.string(),
    tags: z.string(),
  })
}

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

export function optionalNumber(raw: string): number | undefined {
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
