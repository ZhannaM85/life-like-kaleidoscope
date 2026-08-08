import { create } from 'zustand'
import type { Prompt, PromptRepository } from '@/domain/prompt'
import type { Memory, MemoryRepository, Mood } from '@/domain/memory'
import {
  getOrCreateTodaysPrompt,
  skipTodaysPrompt,
  pickTodaysWord,
  getWordPool,
  wordBelongsToLocale,
  localDateKey,
  excludeBlocked,
} from '@/domain/prompt'
import { createMemory } from '@/domain/memory'
import { ensureUserProfile } from '@/domain/user'
import { findAnniversaryPrompt } from '@/domain/annual-reflection'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { intInRangeError, optionalNumber } from '@/features/memory-entry/memory-form'
import { getRepositories } from './repositories'
import { useLocaleStore } from './locale-store'
import type { Locale } from '@/domain/prompt'

/**
 * "This word came around about a year ago, too" (#9): every memory written
 * against the same word's closest issuance to exactly one year before
 * today, if one exists. Cheap to call even on the common no-match day —
 * `getByPromptId` only runs when an anniversary issuance was actually found.
 */
async function loadAnnualReflection(
  prompts: PromptRepository,
  memories: MemoryRepository,
  word: string,
  currentPromptId: string
): Promise<Memory[]> {
  const pastIssuances = (await prompts.getByWord(word)).filter((p) => p.id !== currentPromptId)
  const anniversary = findAnniversaryPrompt(pastIssuances, new Date())
  return anniversary ? memories.getByPromptId(anniversary.id) : []
}

/**
 * The active locale's curated pool plus "Your words" (#28), minus anything
 * blocked (#27) — the same effective pool both the daily draw and the word
 * gallery (#31) work from.
 */
export async function effectiveWordPool(locale: Locale): Promise<readonly string[]> {
  const { blockedWords, customWords } = getRepositories()
  const [blocked, custom] = await Promise.all([blockedWords.getAll(), customWords.getAll()])
  const pool = [...getWordPool(locale), ...custom.map((c) => c.word)]
  return excludeBlocked(pool, blocked, locale)
}

interface DailyPromptState {
  prompt: Prompt | null
  /** Memories already written for today's prompt (there may be several). */
  todaysMemories: Memory[]
  /** Last year's memories for this same word (#9) — populated only once `todaysMemories` is non-empty. */
  lastYearMemories: Memory[]
  draft: string
  /** Optional, quiet "when was this, roughly?" guesses (#25) — raw strings, same shape as the full form. */
  draftApproxAge: string
  draftApproxYear: string
  /** Optional mood chip (#26) — unset until tapped. */
  draftMood: Mood | undefined
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  /** True while a skip/never-again action (#27) is in flight. */
  skipping: boolean
  error: string | null
  load: () => Promise<void>
  setDraft: (text: string) => void
  setDraftApproxAge: (text: string) => void
  setDraftApproxYear: (text: string) => void
  setDraftMood: (mood: Mood | undefined) => void
  save: () => Promise<void>
  /** "Skip this word for now" (#27) — issues a replacement, clears the in-progress draft. */
  skipPrompt: () => Promise<void>
  /** "Never show this word again" (#27) — blocks the current word, then skips to a replacement. */
  blockWord: () => Promise<void>
  /** "…or choose a word yourself" (#31) — makes `word` today's word, clears the in-progress draft. */
  chooseWord: (word: string) => Promise<void>
}

export const useDailyPromptStore = create<DailyPromptState>()((set, get) => ({
  prompt: null,
  todaysMemories: [],
  lastYearMemories: [],
  draft: '',
  draftApproxAge: '',
  draftApproxYear: '',
  draftMood: undefined,
  status: 'idle',
  skipping: false,
  error: null,

  async load() {
    // Guard against concurrent loads (StrictMode double-invokes effects in
    // dev) — without this, two racing getOrCreateTodaysPrompt calls can both
    // see "no prompt today" and each create one.
    if (get().status === 'loading') return

    const { memories, prompts, customWords } = getRepositories()
    set({ status: 'loading', error: null })
    try {
      // A prompt already issued today is returned as-is by default — a
      // language switch mid-day never rewrites a word a memory was already
      // written against (#18).
      const locale = useLocaleStore.getState().locale
      let prompt = await getOrCreateTodaysPrompt(prompts, {
        generateId: defaultGenerateId,
        now: nowIso,
        wordPool: await effectiveWordPool(locale),
      })
      // Collect memories across *all* of today's prompts, not just the
      // canonical one — tolerates duplicate same-day prompts from older
      // versions or racing tabs, so no memory ever silently disappears.
      const todayKey = localDateKey(new Date())
      const todaysPromptIds = (await prompts.getAll())
        .filter((p) => localDateKey(new Date(p.createdAt)) === todayKey)
        .map((p) => p.id)
      const lists = await Promise.all(todaysPromptIds.map((id) => memories.getByPromptId(id)))
      const todaysMemories = lists.flat().sort((a, b) => a.createdAt.localeCompare(b.createdAt))

      // #34: the freeze above protects a written memory, not the word
      // display itself — until one exists, a locale switch since the word
      // was issued may safely redraw it from the now-active pool.
      if (todaysMemories.length === 0) {
        const custom = (await customWords.getAll()).map((c) => c.word)
        if (!wordBelongsToLocale(prompt.word, locale, custom)) {
          prompt = await skipTodaysPrompt(prompts, prompt, {
            generateId: defaultGenerateId,
            now: nowIso,
            wordPool: await effectiveWordPool(locale),
          })
        }
      }

      const lastYearMemories =
        todaysMemories.length > 0
          ? await loadAnnualReflection(prompts, memories, prompt.word, prompt.id)
          : []

      set({ prompt, todaysMemories, lastYearMemories, status: 'ready' })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },

  setDraft(text) {
    set({ draft: text })
  },

  setDraftApproxAge(text) {
    set({ draftApproxAge: text })
  },

  setDraftApproxYear(text) {
    set({ draftApproxYear: text })
  },

  setDraftMood(mood) {
    set({ draftMood: mood })
  },

  async save() {
    const { prompt, draft, draftApproxAge, draftApproxYear, draftMood } = get()
    const story = draft.trim()
    if (!prompt || !story) return
    if (intInRangeError(draftApproxAge, 0, 120, '') || intInRangeError(draftApproxYear, 1000, 9999, ''))
      return

    const { memories, prompts, userProfile } = getRepositories()
    set({ status: 'saving', error: null })
    try {
      const profile = await ensureUserProfile(userProfile, { generateId: defaultGenerateId })
      const created = createMemory(
        {
          promptId: prompt.id,
          story,
          approxAge: optionalNumber(draftApproxAge),
          approxYear: optionalNumber(draftApproxYear),
          mood: draftMood,
          authoredBy: profile.id,
        },
        { generateId: defaultGenerateId, now: nowIso }
      )
      await memories.create(created)
      // Only surfaced once a memory exists for today's word — never before,
      // so the reflection is a reward for having written, not a preview.
      const lastYearMemories = await loadAnnualReflection(prompts, memories, prompt.word, prompt.id)
      set((state) => ({
        todaysMemories: [...state.todaysMemories, created.memory],
        lastYearMemories,
        draft: '',
        draftApproxAge: '',
        draftApproxYear: '',
        draftMood: undefined,
        status: 'ready',
      }))
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },

  async skipPrompt() {
    const { prompt } = get()
    if (!prompt) return
    const { prompts } = getRepositories()
    const locale = useLocaleStore.getState().locale
    set({ skipping: true, error: null })
    try {
      const next = await skipTodaysPrompt(prompts, prompt, {
        generateId: defaultGenerateId,
        now: nowIso,
        wordPool: await effectiveWordPool(locale),
      })
      set({
        prompt: next,
        draft: '',
        draftApproxAge: '',
        draftApproxYear: '',
        draftMood: undefined,
        lastYearMemories: [],
        skipping: false,
      })
    } catch (e) {
      set({ skipping: false, error: e instanceof Error ? e.message : String(e) })
    }
  },

  async blockWord() {
    const { prompt } = get()
    if (!prompt) return
    const { blockedWords } = getRepositories()
    const locale = useLocaleStore.getState().locale
    set({ skipping: true, error: null })
    try {
      await blockedWords.save({
        id: defaultGenerateId(),
        word: prompt.word,
        locale,
        blockedAt: nowIso(),
      })
    } catch (e) {
      set({ skipping: false, error: e instanceof Error ? e.message : String(e) })
      return
    }
    await get().skipPrompt()
  },

  async chooseWord(word) {
    const { prompt } = get()
    if (!prompt || word === prompt.word) return
    const { prompts } = getRepositories()
    set({ skipping: true, error: null })
    try {
      const next = await pickTodaysWord(prompts, prompt, word, {
        generateId: defaultGenerateId,
        now: nowIso,
      })
      set({
        prompt: next,
        draft: '',
        draftApproxAge: '',
        draftApproxYear: '',
        draftMood: undefined,
        lastYearMemories: [],
        skipping: false,
      })
    } catch (e) {
      set({ skipping: false, error: e instanceof Error ? e.message : String(e) })
    }
  },
}))
