import { create } from 'zustand'
import type { Prompt } from '@/domain/prompt'
import type { Memory } from '@/domain/memory'
import { getOrCreateTodaysPrompt, getWordPool, localDateKey } from '@/domain/prompt'
import { createMemory } from '@/domain/memory'
import { ensureUserProfile } from '@/domain/user'
import { defaultGenerateId, nowIso } from '@/domain/shared'
import { intInRangeError, optionalNumber } from '@/features/memory-entry/memory-form'
import { getRepositories } from './repositories'
import { useLocaleStore } from './locale-store'

interface DailyPromptState {
  prompt: Prompt | null
  /** Memories already written for today's prompt (there may be several). */
  todaysMemories: Memory[]
  draft: string
  /** Optional, quiet "when was this, roughly?" guesses (#25) — raw strings, same shape as the full form. */
  draftApproxAge: string
  draftApproxYear: string
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  error: string | null
  load: () => Promise<void>
  setDraft: (text: string) => void
  setDraftApproxAge: (text: string) => void
  setDraftApproxYear: (text: string) => void
  save: () => Promise<void>
}

export const useDailyPromptStore = create<DailyPromptState>()((set, get) => ({
  prompt: null,
  todaysMemories: [],
  draft: '',
  draftApproxAge: '',
  draftApproxYear: '',
  status: 'idle',
  error: null,

  async load() {
    // Guard against concurrent loads (StrictMode double-invokes effects in
    // dev) — without this, two racing getOrCreateTodaysPrompt calls can both
    // see "no prompt today" and each create one.
    if (get().status === 'loading') return

    const { memories, prompts } = getRepositories()
    set({ status: 'loading', error: null })
    try {
      // The pool is read at creation time only — a prompt already issued
      // today is returned as-is, so a language switch mid-day never changes
      // the word already shown (#18).
      const prompt = await getOrCreateTodaysPrompt(prompts, {
        generateId: defaultGenerateId,
        now: nowIso,
        wordPool: getWordPool(useLocaleStore.getState().locale),
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
      set({ prompt, todaysMemories, status: 'ready' })
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

  async save() {
    const { prompt, draft, draftApproxAge, draftApproxYear } = get()
    const story = draft.trim()
    if (!prompt || !story) return
    if (intInRangeError(draftApproxAge, 0, 120, '') || intInRangeError(draftApproxYear, 1000, 9999, ''))
      return

    const { memories, userProfile } = getRepositories()
    set({ status: 'saving', error: null })
    try {
      const profile = await ensureUserProfile(userProfile, { generateId: defaultGenerateId })
      const created = createMemory(
        {
          promptId: prompt.id,
          story,
          approxAge: optionalNumber(draftApproxAge),
          approxYear: optionalNumber(draftApproxYear),
          authoredBy: profile.id,
        },
        { generateId: defaultGenerateId, now: nowIso }
      )
      await memories.create(created)
      set((state) => ({
        todaysMemories: [...state.todaysMemories, created.memory],
        draft: '',
        draftApproxAge: '',
        draftApproxYear: '',
        status: 'ready',
      }))
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
}))
