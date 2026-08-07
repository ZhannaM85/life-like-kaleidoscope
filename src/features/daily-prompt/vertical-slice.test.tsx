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
    draftApproxAge: '',
    draftApproxYear: '',
    draftMood: undefined,
    status: 'idle',
    skipping: false,
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

  it('captures an optional approximate age and year on quick entry (#25)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1 })

    // fields are collapsed behind a quiet toggle until asked for
    expect(screen.queryByLabelText('About how old were you?')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'When was this, roughly?' }))

    await user.type(
      screen.getByLabelText('A memory this word brings back'),
      'The kitchen smelled of dill and fresh bread.'
    )
    await user.type(screen.getByLabelText('About how old were you?'), '8')
    await user.type(screen.getByLabelText('Around what year?'), '1994')
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    await waitFor(() => {
      expect(useDailyPromptStore.getState().todaysMemories).toHaveLength(1)
    })
    const saved = useDailyPromptStore.getState().todaysMemories[0]
    expect(saved.approxAge).toBe(8)
    expect(saved.approxYear).toBe(1994)
    expect(useDailyPromptStore.getState().draftApproxAge).toBe('')
    expect(useDailyPromptStore.getState().draftApproxYear).toBe('')
  })

  it('keeps saving blocked while the approximate age or year is out of range', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: 'When was this, roughly?' }))

    await user.type(
      screen.getByLabelText('A memory this word brings back'),
      'A memory with an implausible age.'
    )
    await user.type(screen.getByLabelText('About how old were you?'), '130')

    expect(
      screen.getByText('If you give an age, make it a whole number between 0 and 120.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep this memory' })).toBeDisabled()
  })

  it('captures an optional mood chip, tap to select, tap again to clear (#26)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1 })

    const bittersweetChip = screen.getByRole('button', { name: 'bittersweet' })
    expect(bittersweetChip).toHaveAttribute('aria-pressed', 'false')
    await user.click(bittersweetChip)
    expect(bittersweetChip).toHaveAttribute('aria-pressed', 'true')

    await user.type(
      screen.getByLabelText('A memory this word brings back'),
      'Packing up the dacha at the end of summer.'
    )
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    await waitFor(() => {
      expect(useDailyPromptStore.getState().todaysMemories).toHaveLength(1)
    })
    expect(useDailyPromptStore.getState().todaysMemories[0].mood).toBe('bittersweet')
    expect(useDailyPromptStore.getState().draftMood).toBeUndefined()
  })

  it('saves with no mood when nothing is tapped', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1 })
    await user.type(
      screen.getByLabelText('A memory this word brings back'),
      'An ordinary afternoon, nothing more.'
    )
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    await waitFor(() => {
      expect(useDailyPromptStore.getState().todaysMemories).toHaveLength(1)
    })
    expect(useDailyPromptStore.getState().todaysMemories[0].mood).toBeUndefined()
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

  it('skips today\'s word for a different one, revealing "never show again" only after that (#27)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    const word1 = (await screen.findByRole('heading', { level: 1 })).textContent

    expect(
      screen.queryByRole('button', { name: 'Never show this word again' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: "This word isn't landing today? Try another" }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(word1)
    })
    // `hasSkipped` is a separate state update after the store's — poll for it
    // rather than assuming it already landed alongside the heading change.
    expect(
      await screen.findByRole('button', { name: 'Never show this word again' })
    ).toBeInTheDocument()
  })

  it('blocks the word behind "never show again" so it is never issued again (#27)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: "This word isn't landing today? Try another" }))
    // The link only appears once `skipPrompt` has resolved and the store has
    // the replacement word — waiting for it avoids reading stale heading text.
    await screen.findByRole('button', { name: 'Never show this word again' })
    const blockedWord = screen.getByRole('heading', { level: 1 }).textContent

    await user.click(screen.getByRole('button', { name: 'Never show this word again' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(blockedWord)
    })

    const { getRepositories } = await import('@/stores')
    const blocked = await getRepositories().blockedWords.getAll()
    expect(blocked.map((w) => w.word)).toContain(blockedWord)
  })

  it('hides the skip and never-again links once a memory has been written today', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1 })
    await user.type(
      screen.getByLabelText('A memory this word brings back'),
      'Written before deciding to skip anything.'
    )
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    await waitFor(() => {
      expect(useDailyPromptStore.getState().todaysMemories).toHaveLength(1)
    })
    expect(
      screen.queryByRole('button', { name: "This word isn't landing today? Try another" })
    ).not.toBeInTheDocument()
  })
})
