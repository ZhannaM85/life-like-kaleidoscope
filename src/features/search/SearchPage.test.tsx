import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { createMemory } from '@/domain/memory'
import { defaultGenerateId } from '@/domain/shared'
import {
  createIndexedDbRepositories,
  LifeLikeKaleidoscopeDb,
} from '@/infrastructure/persistence/indexeddb'
import { getRepositories, setRepositories } from '@/stores'
import { SearchPage } from './SearchPage'

let dbCounter = 0
let dbName: string

beforeEach(() => {
  dbName = `search-test-db-${++dbCounter}`
  setRepositories(createIndexedDbRepositories(dbName))
})

afterEach(async () => {
  setRepositories(null)
  await new LifeLikeKaleidoscopeDb(dbName).delete()
})

async function seed() {
  const repos = getRepositories()
  const now = new Date().toISOString()
  await repos.prompts.save({ id: 'prompt-1', word: 'Bicycle', createdAt: now })
  await repos.prompts.save({ id: 'prompt-2', word: 'Kitchen', createdAt: now })
  await repos.people.save({ id: 'person-1', name: 'Aunt Vera' })
  await repos.places.save({ id: 'place-1', name: 'The dacha' })
  await repos.tags.save({ id: 'tag-1', label: 'childhood' })

  const withPerson = createMemory(
    {
      promptId: 'prompt-1',
      story: 'The red bicycle leaned against the fence all summer.',
      peopleIds: ['person-1'],
      authoredBy: 'user-1',
    },
    { generateId: defaultGenerateId, now: () => now }
  )
  await repos.memories.create(withPerson)

  const withPlaceAndTag = createMemory(
    {
      promptId: 'prompt-2',
      story: 'Grandmother kept jam on the top shelf.',
      placeIds: ['place-1'],
      tagIds: ['tag-1'],
      authoredBy: 'user-1',
    },
    { generateId: defaultGenerateId, now: () => now }
  )
  await repos.memories.create(withPlaceAndTag)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>
  )
}

describe('SearchPage', () => {
  it('invites typing before any query is entered', async () => {
    await seed()
    renderPage()
    expect(
      await screen.findByText(/Start typing to search across every word/)
    ).toBeInTheDocument()
  })

  it('matches a story by substring, case-insensitively', async () => {
    await seed()
    renderPage()
    await userEvent.type(await screen.findByLabelText('Search'), 'BICYCLE')

    expect(await screen.findByText(/The red bicycle leaned/)).toBeInTheDocument()
    expect(screen.queryByText(/Grandmother kept jam/)).not.toBeInTheDocument()
  })

  it('matches a linked person, place, or tag', async () => {
    await seed()
    renderPage()
    const input = await screen.findByLabelText('Search')

    await userEvent.type(input, 'Vera')
    expect(await screen.findByText(/The red bicycle leaned/)).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, 'dacha')
    expect(await screen.findByText(/Grandmother kept jam/)).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, 'childhood')
    expect(await screen.findByText(/Grandmother kept jam/)).toBeInTheDocument()
  })

  it('shows a calm empty state for a query that matches nothing', async () => {
    await seed()
    renderPage()
    await userEvent.type(await screen.findByLabelText('Search'), 'zeppelin')

    expect(await screen.findByText('Nothing found')).toBeInTheDocument()
  })

  it('shows the prompt to search headline with no memories yet', async () => {
    renderPage()
    expect(
      await screen.findByText(/Start typing to search across every word/)
    ).toBeInTheDocument()
  })
})
