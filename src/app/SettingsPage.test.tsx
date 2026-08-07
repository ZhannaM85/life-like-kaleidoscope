import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'
import { getStorageStatus } from '@/infrastructure/persistence/storage-persistence'
import { useLocaleStore, getRepositories } from '@/stores'
import { getDictionary } from '@/i18n'

vi.mock('@/infrastructure/persistence/storage-persistence', () => ({
  getStorageStatus: vi.fn(),
}))

const mockedGetStorageStatus = vi.mocked(getStorageStatus)

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  mockedGetStorageStatus.mockReset()
  useLocaleStore.setState({ locale: 'en', dictionary: getDictionary('en') })
})

afterEach(async () => {
  // This file never sets up a per-test db, so the fake-indexeddb-backed
  // singleton persists across tests — clean up anything a test wrote.
  const repos = getRepositories()
  const [blocked, custom] = await Promise.all([repos.blockedWords.getAll(), repos.customWords.getAll()])
  await Promise.all([
    ...blocked.map((w) => repos.blockedWords.remove(w.id)),
    ...custom.map((w) => repos.customWords.remove(w.id)),
  ])
})

describe('SettingsPage', () => {
  it('shows storage protection and space used when persistence is granted', async () => {
    mockedGetStorageStatus.mockResolvedValue({
      persisted: true,
      usage: 2 * 1024 * 1024,
      quota: 500 * 1024 * 1024,
    })
    renderSettings()

    expect(await screen.findByText(/On — this browser has agreed/)).toBeInTheDocument()
    expect(screen.getByText('2.0 MB of 500 MB available')).toBeInTheDocument()
    // Granted persistence — no backup suggestion needed.
    expect(screen.queryByText('A gentle suggestion')).not.toBeInTheDocument()
  })

  it('stays calm when the browser reports nothing', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: null, usage: null, quota: null })
    renderSettings()

    const answers = await screen.findAllByText("This browser doesn't say.")
    expect(answers).toHaveLength(2)
    expect(screen.queryByText('A gentle suggestion')).not.toBeInTheDocument()
  })

  it('suggests backing up when persistence is not granted, dismissibly', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: false, usage: 1024, quota: null })
    renderSettings()

    expect(await screen.findByText('A gentle suggestion')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Export page' })).toHaveAttribute('href', '/export')

    await userEvent.click(screen.getByRole('button', { name: 'Okay, noted' }))
    expect(screen.queryByText('A gentle suggestion')).not.toBeInTheDocument()
  })

  it('switches the interface to Russian and remembers the choice (#18)', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: true, usage: null, quota: null })
    renderSettings()

    expect(screen.getByText('Settings')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Русский' }))

    expect(screen.getByText('Настройки')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Русский' })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('life-like-kaleidoscope.locale')).toBe('ru')
    expect(document.documentElement.lang).toBe('ru')
  })

  it('remembers the dismissal across visits', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: false, usage: null, quota: null })
    const first = renderSettings()
    await userEvent.click(await screen.findByRole('button', { name: 'Okay, noted' }))
    first.unmount()

    renderSettings()
    expect(await screen.findByText(/Not granted yet/)).toBeInTheDocument()
    expect(screen.queryByText('A gentle suggestion')).not.toBeInTheDocument()
  })

  it('adds a custom word to "Your words" and lists it (#28)', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: true, usage: null, quota: null })
    renderSettings()
    await screen.findByText('Your words')

    await userEvent.type(screen.getByLabelText('Add a word'), 'Zeppelin')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Zeppelin')).toBeInTheDocument()
    expect(screen.getByLabelText('Add a word')).toHaveValue('')
    expect((await getRepositories().customWords.getAll()).map((w) => w.word)).toContain('Zeppelin')
  })

  it('silently drops a duplicate of the curated pool, no error copy (#28)', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: true, usage: null, quota: null })
    renderSettings()
    await screen.findByText('Your words')

    await userEvent.type(screen.getByLabelText('Add a word'), 'Bicycle')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByLabelText('Add a word')).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await getRepositories().customWords.getAll()).toHaveLength(0)
  })

  it('removes a custom word', async () => {
    mockedGetStorageStatus.mockResolvedValue({ persisted: true, usage: null, quota: null })
    await getRepositories().customWords.save({
      id: 'custom-1',
      word: 'Dacha',
      createdAt: '2026-07-02T08:00:00.000Z',
    })
    renderSettings()

    expect(await screen.findByText('Dacha')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Dacha')).not.toBeInTheDocument()
    })
    expect(await getRepositories().customWords.getAll()).toHaveLength(0)
  })
})
