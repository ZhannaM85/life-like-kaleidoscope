import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  createIndexedDbRepositories,
  LifeLikeKaleidoscopeDb,
} from '@/infrastructure/persistence/indexeddb'
import { setRepositories, useDailyPromptStore, useMemoriesStore } from '@/stores'
import { TodayPage } from './TodayPage'
import { MemoriesPage } from '@/features/memory-entry/MemoriesPage'

let dbCounter = 0
let dbName: string

beforeEach(() => {
  dbName = `slice-db-${++dbCounter}`
  setRepositories(createIndexedDbRepositories(dbName))
  useDailyPromptStore.setState({
    prompt: null,
    todaysMemories: [],
    draft: '',
    status: 'idle',
    error: null,
  })
  useMemoriesStore.setState({ memories: [], promptsById: {}, status: 'idle', error: null })
})

afterEach(async () => {
  setRepositories(null)
  await new LifeLikeKaleidoscopeDb(dbName).delete()
})

describe('vertical slice: prompt → write → save → memories list', () => {
  it('shows a word, saves a written memory, and lists it on the memories page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )

    // a daily word appears
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading.textContent).toBeTruthy()

    // write and save
    await user.type(
      screen.getByLabelText('A memory this word brings back'),
      'My grandmother kept raspberry jam on the top shelf.'
    )
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    // wait for the save to land, then the memory is echoed back on the Today page
    await waitFor(() => {
      expect(useDailyPromptStore.getState().todaysMemories).toHaveLength(1)
    })
    expect(useDailyPromptStore.getState().draft).toBe('')
    expect(screen.getByText(/Kept today/)).toBeInTheDocument()

    // ...and appears in the memories list with its word
    render(
      <MemoryRouter>
        <MemoriesPage />
      </MemoryRouter>
    )
    const entries = await screen.findAllByText('My grandmother kept raspberry jam on the top shelf.')
    expect(entries.length).toBeGreaterThan(0)
    expect(screen.getByText('Memories')).toBeInTheDocument()
  })

  it('shows the calm empty state when nothing has been written', async () => {
    render(
      <MemoryRouter>
        <MemoriesPage />
      </MemoryRouter>
    )
    expect(await screen.findByText('No memories yet')).toBeInTheDocument()
  })

  it('creates only one prompt when load() is invoked concurrently (StrictMode)', async () => {
    const { load } = useDailyPromptStore.getState()
    await Promise.all([load(), load()])

    const { getRepositories } = await import('@/stores')
    const prompts = await getRepositories().prompts.getAll()
    expect(prompts).toHaveLength(1)
  })

  it('shows memories attached to a duplicate same-day prompt (healing path)', async () => {
    const { getRepositories } = await import('@/stores')
    const repos = getRepositories()
    // simulate legacy duplicate-prompt data: memory hangs off a second prompt
    const now = new Date().toISOString()
    await repos.prompts.save({ id: 'dup-1', word: 'Rain', createdAt: now })
    await repos.prompts.save({ id: 'dup-2', word: 'Rain', createdAt: now })
    const { createMemory } = await import('@/domain/memory')
    const created = createMemory(
      { promptId: 'dup-2', story: 'Memory on the duplicate prompt.', authoredBy: 'u1' },
      { generateId: () => `m-${Math.random()}`, now: () => now }
    )
    await repos.memories.create(created)

    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Memory on the duplicate prompt.')).toBeInTheDocument()
  })

  it('keeps the same word across a reload within the same day', async () => {
    const first = render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    const word1 = (await screen.findByRole('heading', { level: 1 })).textContent
    first.unmount()

    useDailyPromptStore.setState({ prompt: null, status: 'idle' })
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    const word2 = (await screen.findByRole('heading', { level: 1 })).textContent
    expect(word2).toBe(word1)
  })
})
