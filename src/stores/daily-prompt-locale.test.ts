import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createIndexedDbRepositories,
  LifeLikeKaleidoscopeDb,
} from '@/infrastructure/persistence/indexeddb'
import { WORD_POOL, WORD_POOL_RU } from '@/domain/prompt'
import { getDictionary } from '@/i18n'
import { setRepositories, useDailyPromptStore, useLocaleStore } from '@/stores'

let dbCounter = 0
let dbName: string

function resetDailyPromptStore() {
  useDailyPromptStore.setState({
    prompt: null,
    todaysMemories: [],
    draft: '',
    status: 'idle',
    error: null,
  })
}

beforeEach(() => {
  dbName = `locale-prompt-db-${++dbCounter}`
  setRepositories(createIndexedDbRepositories(dbName))
  resetDailyPromptStore()
  useLocaleStore.setState({ locale: 'en', dictionary: getDictionary('en') })
})

afterEach(async () => {
  setRepositories(null)
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en', dictionary: getDictionary('en') })
  await new LifeLikeKaleidoscopeDb(dbName).delete()
})

describe('daily prompt × locale (#18)', () => {
  it("draws today's word from the Russian pool when Russian is active", async () => {
    useLocaleStore.getState().setLocale('ru')
    await useDailyPromptStore.getState().load()

    const prompt = useDailyPromptStore.getState().prompt
    expect(prompt).not.toBeNull()
    expect(WORD_POOL_RU).toContain(prompt!.word)
  })

  it('regenerates today\'s word for the new locale on reload, if nothing has been written yet (#34)', async () => {
    await useDailyPromptStore.getState().load()
    const issued = useDailyPromptStore.getState().prompt
    expect(issued).not.toBeNull()
    expect(WORD_POOL).toContain(issued!.word)

    // Switch to Russian and reload as if the page were reopened — the freeze
    // exists to protect a written memory, not the word display, so with
    // nothing written yet the word may safely redraw from the new pool.
    useLocaleStore.getState().setLocale('ru')
    resetDailyPromptStore()
    await useDailyPromptStore.getState().load()

    const reloaded = useDailyPromptStore.getState().prompt
    expect(reloaded).not.toBeNull()
    expect(reloaded!.id).not.toBe(issued!.id)
    expect(WORD_POOL_RU).toContain(reloaded!.word)

    // The English issuance stays in history, just marked skipped — nothing
    // is deleted, only superseded (same mechanic as #27's skip).
    const { getRepositories } = await import('@/stores')
    const originalStillStored = await getRepositories().prompts.getById(issued!.id)
    expect(originalStillStored?.skipped).toBe(true)
  })

  it("keeps today's word frozen across a language switch once a memory has been written (#34)", async () => {
    await useDailyPromptStore.getState().load()
    const issued = useDailyPromptStore.getState().prompt!

    const { getRepositories } = await import('@/stores')
    const { createMemory } = await import('@/domain/memory')
    const { defaultGenerateId } = await import('@/domain/shared')
    const created = createMemory(
      { promptId: issued.id, story: 'Written before switching languages.', authoredBy: 'u1' },
      { generateId: defaultGenerateId, now: () => new Date().toISOString() }
    )
    await getRepositories().memories.create(created)

    useLocaleStore.getState().setLocale('ru')
    resetDailyPromptStore()
    await useDailyPromptStore.getState().load()

    const reloaded = useDailyPromptStore.getState().prompt
    expect(reloaded!.id).toBe(issued.id)
    expect(reloaded!.word).toBe(issued.word)
  })
})
