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
import { getRepositories, setRepositories, useMemoriesStore } from '@/stores'
import { MemoriesPage } from './MemoriesPage'

let dbCounter = 0
let dbName: string

beforeEach(() => {
  dbName = `memories-page-db-${++dbCounter}`
  setRepositories(createIndexedDbRepositories(dbName))
  useMemoriesStore.setState({ memories: [], promptsById: {}, status: 'idle', error: null })
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
  await repos.prompts.save({ id: 'prompt-3', word: 'Rain', createdAt: now })

  const dated1991 = createMemory(
    { promptId: 'prompt-1', story: 'The red bicycle summer.', approxYear: 1991, authoredBy: 'u1' },
    { generateId: defaultGenerateId, now: () => '2026-07-01T10:00:00.000Z' }
  )
  const dated1994 = createMemory(
    { promptId: 'prompt-2', story: 'Grandmother kept jam on the shelf.', approxYear: 1994, authoredBy: 'u1' },
    { generateId: defaultGenerateId, now: () => '2026-07-02T10:00:00.000Z' }
  )
  const undated = createMemory(
    { promptId: 'prompt-3', story: 'A rainy afternoon, no date remembered.', authoredBy: 'u1' },
    { generateId: defaultGenerateId, now: () => '2026-07-03T10:00:00.000Z' }
  )
  await repos.memories.create(dated1991)
  await repos.memories.create(dated1994)
  await repos.memories.create(undated)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MemoriesPage />
    </MemoryRouter>
  )
}

describe('MemoriesPage — timeline view (Epic 7)', () => {
  it('defaults to the list view, newest first', async () => {
    await seed()
    renderPage()
    expect(await screen.findByText('A rainy afternoon, no date remembered.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true')
  })

  it('groups memories by approx year, oldest first, with an undated section', async () => {
    await seed()
    renderPage()
    await screen.findByText('A rainy afternoon, no date remembered.')

    await userEvent.click(screen.getByRole('radio', { name: 'Timeline' }))

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['1991', '1994', 'Undated'])

    // Oldest year's memory appears before the newer year's in document order.
    const bodyText = document.body.textContent ?? ''
    expect(bodyText.indexOf('The red bicycle summer.')).toBeLessThan(
      bodyText.indexOf('Grandmother kept jam on the shelf.')
    )
    expect(screen.getByText('A rainy afternoon, no date remembered.')).toBeInTheDocument()
  })

  it('switches back to the list view', async () => {
    await seed()
    renderPage()
    await screen.findByText('A rainy afternoon, no date remembered.')

    await userEvent.click(screen.getByRole('radio', { name: 'Timeline' }))
    expect(screen.getByText('1991')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'List' }))
    expect(screen.queryByText('1991')).not.toBeInTheDocument()
  })
})
