import { describe, it, expect } from 'vitest'
import type { EntityId, GenerateId } from '@/domain/shared'
import type { Person, PersonRepository } from '@/domain/person'
import type { Place, PlaceRepository } from '@/domain/place'
import type { Tag, TagRepository } from '@/domain/tag'
import {
  memoryFieldsFromValues,
  memoryFormSchema,
  parseNameList,
  resolveEntityIds,
  type MemoryFormValues,
} from './memory-form'

function values(overrides: Partial<MemoryFormValues> = {}): MemoryFormValues {
  return {
    title: '',
    story: 'The dacha smelled of raspberries.',
    approxAge: '',
    approxYear: '',
    people: '',
    places: '',
    tags: '',
    ...overrides,
  }
}

describe('memoryFormSchema', () => {
  it('requires a non-blank story and nothing else', () => {
    expect(memoryFormSchema.safeParse(values()).success).toBe(true)
    expect(memoryFormSchema.safeParse(values({ story: '   ' })).success).toBe(false)
  })

  it('accepts blank or plausible ages and years, rejects the rest', () => {
    expect(memoryFormSchema.safeParse(values({ approxAge: '', approxYear: '' })).success).toBe(true)
    expect(memoryFormSchema.safeParse(values({ approxAge: ' 6 ', approxYear: '1991' })).success).toBe(true)
    expect(memoryFormSchema.safeParse(values({ approxAge: '130' })).success).toBe(false)
    expect(memoryFormSchema.safeParse(values({ approxAge: '6.5' })).success).toBe(false)
    expect(memoryFormSchema.safeParse(values({ approxYear: '91' })).success).toBe(false)
    expect(memoryFormSchema.safeParse(values({ approxYear: 'abc' })).success).toBe(false)
  })
})

describe('parseNameList', () => {
  it('trims, drops blanks, and dedupes case-insensitively keeping the first spelling', () => {
    expect(parseNameList(' Mom ,, Aunt Vera, mom ,MOM')).toEqual(['Mom', 'Aunt Vera'])
    expect(parseNameList('')).toEqual([])
  })
})

describe('memoryFieldsFromValues', () => {
  it('turns blank optional fields into undefined and parses the numbers', () => {
    const fields = memoryFieldsFromValues(values({ title: '  ', approxAge: ' 6 ' }))
    expect(fields.title).toBeUndefined()
    expect(fields.approxAge).toBe(6)
    expect(fields.approxYear).toBeUndefined()
    expect(fields.peopleNames).toEqual([])
  })
})

class FakeRepo<T extends { id: EntityId }> {
  items: T[] = []
  save = async (item: T) => {
    this.items.push(item)
  }
  getById = async (id: EntityId) => this.items.find((i) => i.id === id)
  getAll = async () => [...this.items]
  delete = async (id: EntityId) => {
    this.items = this.items.filter((i) => i.id !== id)
  }
}

describe('resolveEntityIds', () => {
  it('reuses existing entities case-insensitively and creates the rest', async () => {
    const people = new FakeRepo<Person>() satisfies PersonRepository
    const places = new FakeRepo<Place>() satisfies PlaceRepository
    const tags = new FakeRepo<Tag>() satisfies TagRepository
    await people.save({ id: 'p-mom', name: 'Mom' })

    let n = 0
    const generateId: GenerateId = () => `id-${++n}`
    const resolved = await resolveEntityIds(
      { peopleNames: ['mom', 'Aunt Vera'], placeNames: ['The dacha'], tagLabels: [] },
      { people, places, tags },
      generateId
    )

    expect(resolved.peopleIds[0]).toBe('p-mom')
    expect(people.items).toHaveLength(2)
    expect(places.items.map((p) => p.name)).toEqual(['The dacha'])
    expect(resolved.tagIds).toEqual([])
  })
})
