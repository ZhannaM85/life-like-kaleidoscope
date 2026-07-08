import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { createMemory } from '@/domain/memory'
import { defaultGenerateId } from '@/domain/shared'
import {
  createIndexedDbRepositories,
  LifeLikeKaleidoscopeDb,
} from '@/infrastructure/persistence/indexeddb'
import { getRepositories, setRepositories, useDailyPromptStore, useMemoriesStore } from '@/stores'
import { MemoriesPage } from './MemoriesPage'
import { MemoryDetailPage } from './MemoryDetailPage'
import { MemoryEditPage } from './MemoryEditPage'
import { MemoryNewPage } from './MemoryNewPage'
import { VersionHistoryPage } from '@/features/version-history/VersionHistoryPage'

let dbCounter = 0
let dbName: string

beforeEach(() => {
  dbName = `crud-db-${++dbCounter}`
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

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/memories', element: <MemoriesPage /> },
      { path: '/memories/new', element: <MemoryNewPage /> },
      { path: '/memories/:id', element: <MemoryDetailPage /> },
      { path: '/memories/:id/edit', element: <MemoryEditPage /> },
      { path: '/memories/:id/history', element: <VersionHistoryPage /> },
    ],
    { initialEntries: [initialPath] }
  )
  return render(<RouterProvider router={router} />)
}

async function seedMemory(story = 'The dacha smelled of raspberries.') {
  const repos = getRepositories()
  const now = new Date().toISOString()
  await repos.prompts.save({ id: 'seed-prompt', word: 'Raspberry', createdAt: now })
  const created = createMemory(
    { promptId: 'seed-prompt', story, authoredBy: 'seed-user' },
    { generateId: defaultGenerateId, now: () => now }
  )
  await repos.memories.create(created)
  return created.memory
}

describe('memory CRUD & version history (Epic 4)', () => {
  it('creates a memory through the full form and lands on its detail page', async () => {
    const user = userEvent.setup()
    renderAt('/memories/new')

    await screen.findByText('New memory')
    await user.type(screen.getByLabelText('Title'), 'The jam shelf')
    await user.type(
      screen.getByLabelText('The memory'),
      'My grandmother kept raspberry jam on the top shelf.'
    )
    await user.type(screen.getByLabelText('About how old were you?'), '6')
    await user.type(screen.getByLabelText('Around what year?'), '1991')
    await user.type(screen.getByLabelText('People'), 'Mom, Aunt Vera')
    await user.type(screen.getByLabelText('Places'), 'The dacha')
    await user.type(screen.getByLabelText('Tags'), 'summer')
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    // the detail page shows the story and every detail row
    expect(
      await screen.findByText('My grandmother kept raspberry jam on the top shelf.')
    ).toBeInTheDocument()
    expect(screen.getByText('The jam shelf')).toBeInTheDocument()
    expect(screen.getByText('around age 6, around 1991')).toBeInTheDocument()
    expect(screen.getByText('Mom, Aunt Vera')).toBeInTheDocument()
    expect(screen.getByText('The dacha')).toBeInTheDocument()
    expect(screen.getByText('summer')).toBeInTheDocument()

    const repos = getRepositories()
    expect(await repos.people.getAll()).toHaveLength(2)
    expect(await repos.memories.getAll()).toHaveLength(1)
  })

  it('asks for at least a few words of story before saving', async () => {
    const user = userEvent.setup()
    renderAt('/memories/new')

    await screen.findByText('New memory')
    await user.click(screen.getByRole('button', { name: 'Keep this memory' }))

    expect(await screen.findByText('A memory needs at least a few words.')).toBeInTheDocument()
    expect(await getRepositories().memories.getAll()).toHaveLength(0)
  })

  it('saves an edit as a brand-new version and shows every save in the history', async () => {
    const user = userEvent.setup()
    const memory = await seedMemory()
    renderAt(`/memories/${memory.id}/edit`)

    const storyField = await screen.findByLabelText('The memory')
    expect(storyField).toHaveValue('The dacha smelled of raspberries.')
    await user.clear(storyField)
    await user.type(storyField, 'Actually, it was blackcurrant jam.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // back on the detail page with the new story
    expect(await screen.findByText('Actually, it was blackcurrant jam.')).toBeInTheDocument()
    expect(await getRepositories().memories.getVersions(memory.id)).toHaveLength(2)

    // the history lists both versions, newest first, old text kept as written
    await user.click(screen.getByRole('link', { name: /Version history/ }))
    expect(await screen.findByText('Version 2')).toBeInTheDocument()
    expect(screen.getByText('— current')).toBeInTheDocument()
    expect(screen.getByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText('The dacha smelled of raspberries.')).toBeInTheDocument()
  })

  it('deletes only after a quiet confirmation, taking the whole history along', async () => {
    const user = userEvent.setup()
    const memory = await seedMemory()
    renderAt(`/memories/${memory.id}`)

    await screen.findByText('The dacha smelled of raspberries.')
    await user.click(screen.getByRole('button', { name: 'Delete this memory' }))
    expect(screen.getByText('This removes the memory and its whole history.')).toBeInTheDocument()

    // stepping back keeps the memory
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete this memory' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // lands on the (now empty) memories list; nothing lingers in storage
    expect(await screen.findByText('No memories yet')).toBeInTheDocument()
    expect(await getRepositories().memories.getById(memory.id)).toBeUndefined()
    expect(await getRepositories().memories.getVersions(memory.id)).toHaveLength(0)
  })

  it('shows the calm not-found state for a memory that does not exist', async () => {
    const detail = renderAt('/memories/does-not-exist')
    expect(await screen.findByText("This memory isn't here")).toBeInTheDocument()
    detail.unmount()

    renderAt('/memories/does-not-exist/history')
    expect(await screen.findByText("This memory isn't here")).toBeInTheDocument()
  })
})
