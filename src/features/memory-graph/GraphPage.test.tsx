import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemory } from '@/domain/memory'
import { defaultGenerateId } from '@/domain/shared'
import {
  createIndexedDbRepositories,
  LifeLikeKaleidoscopeDb,
} from '@/infrastructure/persistence/indexeddb'
import { getRepositories, setRepositories } from '@/stores'
import { GraphPage } from './GraphPage'

let dbCounter = 0
let dbName: string

beforeEach(() => {
  dbName = `graph-test-db-${++dbCounter}`
  setRepositories(createIndexedDbRepositories(dbName))
})

afterEach(async () => {
  setRepositories(null)
  await new LifeLikeKaleidoscopeDb(dbName).delete()
})

describe('GraphPage', () => {
  it('shows a calm empty state before any memories exist', async () => {
    render(<GraphPage />)
    expect(await screen.findByText('Nothing to graph yet')).toBeInTheDocument()
  })

  it('renders a node for every memory plus each shared person/place, and an edge per reference', async () => {
    const repos = getRepositories()
    const now = new Date().toISOString()
    await repos.prompts.save({ id: 'prompt-1', word: 'Bicycle', createdAt: now })
    await repos.people.save({ id: 'person-1', name: 'Aunt Vera' })
    await repos.places.save({ id: 'place-1', name: 'The dacha' })

    await repos.memories.create(
      createMemory(
        {
          promptId: 'prompt-1',
          story: 'Summer with Vera.',
          peopleIds: ['person-1'],
          placeIds: ['place-1'],
          authoredBy: 'u1',
        },
        { generateId: defaultGenerateId, now: () => now }
      )
    )

    render(<GraphPage />)
    const graph = await screen.findByRole('img', { name: 'Memory Graph' })
    expect(graph.querySelectorAll('circle')).toHaveLength(3)
    expect(graph.querySelectorAll('line')).toHaveLength(2)
    expect(graph.querySelector('title')?.textContent).toBeTruthy()
  })

  it('renders no edges for a memory that shares nothing yet', async () => {
    const repos = getRepositories()
    const now = new Date().toISOString()
    await repos.prompts.save({ id: 'prompt-1', word: 'Rain', createdAt: now })
    await repos.memories.create(
      createMemory(
        { promptId: 'prompt-1', story: 'A quiet rainy day.', authoredBy: 'u1' },
        { generateId: defaultGenerateId, now: () => now }
      )
    )

    render(<GraphPage />)
    const graph = await screen.findByRole('img', { name: 'Memory Graph' })
    expect(graph.querySelectorAll('circle')).toHaveLength(1)
    expect(graph.querySelectorAll('line')).toHaveLength(0)
  })
})
