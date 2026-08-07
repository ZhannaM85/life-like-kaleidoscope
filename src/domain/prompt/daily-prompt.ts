import type { GenerateId, Now } from '@/domain/shared'
import type { Prompt } from './prompt'
import type { PromptRepository } from './repository'
import { WORD_POOL } from './words'

/**
 * How many days must pass before a word can be issued again.
 * The pool (~200 words) outlasts this window, so there is always at least
 * one eligible word under normal operation.
 */
export const DEFAULT_NO_REPEAT_WINDOW_DAYS = 120

/** Local calendar day (YYYY-MM-DD) — the boundary for "today's" prompt. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** FNV-1a — small, deterministic string hash; no crypto needed. */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface ChooseDailyWordArgs {
  /** The local day being chosen for, e.g. "2026-07-05". Same key ⇒ same word. */
  dateKey: string
  /** word → ISO date of its most recent issuance. */
  lastUsed: ReadonlyMap<string, string>
  windowDays?: number
  wordPool?: readonly string[]
}

/**
 * Pick the day's word deterministically: hashing the date key indexes into
 * the words not used within the window, so a reload never reshuffles today's
 * word. If every word has been used inside the window (tiny custom pools),
 * fall back to the least-recently-used word rather than failing.
 */
export function chooseDailyWord({
  dateKey,
  lastUsed,
  windowDays = DEFAULT_NO_REPEAT_WINDOW_DAYS,
  wordPool = WORD_POOL,
}: ChooseDailyWordArgs): string {
  const cutoff = new Date(`${dateKey}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - windowDays)

  const eligible = wordPool.filter((word) => {
    const used = lastUsed.get(word)
    return !used || new Date(used) < cutoff
  })

  if (eligible.length > 0) {
    return eligible[hash(dateKey) % eligible.length]!
  }

  let lruWord = wordPool[0]!
  let lruDate = Infinity
  for (const word of wordPool) {
    const used = Date.parse(lastUsed.get(word) ?? '')
    const t = Number.isNaN(used) ? -Infinity : used
    if (t < lruDate) {
      lruDate = t
      lruWord = word
    }
  }
  return lruWord
}

export interface DailyPromptDeps {
  generateId: GenerateId
  now: Now
  windowDays?: number
  wordPool?: readonly string[]
}

/**
 * Idempotent per local day: returns the prompt already issued today, or
 * chooses a word, persists a new Prompt, and returns it. When today's word
 * has been skipped (#27), the original issuance stays in history marked
 * `skipped` — the most recently issued *non-skipped* prompt for today is the
 * active one.
 */
export async function getOrCreateTodaysPrompt(
  repository: PromptRepository,
  deps: DailyPromptDeps
): Promise<Prompt> {
  const nowIso = deps.now()
  const todayKey = localDateKey(new Date(nowIso))

  const all = await repository.getAll()
  const existing = all
    .filter((p) => !p.skipped && localDateKey(new Date(p.createdAt)) === todayKey)
    .at(-1)
  if (existing) return existing

  const lastUsed = new Map<string, string>()
  for (const p of all) {
    const prev = lastUsed.get(p.word)
    if (!prev || prev < p.createdAt) lastUsed.set(p.word, p.createdAt)
  }

  const word = chooseDailyWord({
    dateKey: todayKey,
    lastUsed,
    windowDays: deps.windowDays,
    wordPool: deps.wordPool,
  })

  const prompt: Prompt = { id: deps.generateId(), word, createdAt: nowIso }
  await repository.save(prompt)
  return prompt
}

/**
 * "Skip this word for now" (#27): marks `current` skipped and issues a
 * replacement, persisted so a reload keeps the replacement. The skipped
 * word's issuance timestamp is still today, so it naturally stays out of the
 * no-repeat window without any special-casing — the same eligibility logic
 * `chooseDailyWord` already applies to every other recently-used word.
 */
export async function skipTodaysPrompt(
  repository: PromptRepository,
  current: Prompt,
  deps: DailyPromptDeps
): Promise<Prompt> {
  const todayKey = localDateKey(new Date(current.createdAt))
  await repository.save({ ...current, skipped: true })

  const all = await repository.getAll()
  const lastUsed = new Map<string, string>()
  for (const p of all) {
    const prev = lastUsed.get(p.word)
    if (!prev || prev < p.createdAt) lastUsed.set(p.word, p.createdAt)
  }

  const word = chooseDailyWord({
    dateKey: todayKey,
    lastUsed,
    windowDays: deps.windowDays,
    wordPool: deps.wordPool,
  })

  const prompt: Prompt = { id: deps.generateId(), word, createdAt: deps.now() }
  await repository.save(prompt)
  return prompt
}

/**
 * "…or choose a word yourself" (#31): marks `current` skipped and issues the
 * explicitly chosen replacement, persisted — same idempotence-by-persistence
 * as `skipTodaysPrompt`, but the word is given rather than drawn. The chosen
 * word's issuance timestamp still counts toward the no-repeat window like any
 * dealt word, so no special-casing is needed there either.
 */
export async function pickTodaysWord(
  repository: PromptRepository,
  current: Prompt,
  word: string,
  deps: Pick<DailyPromptDeps, 'generateId' | 'now'>
): Promise<Prompt> {
  await repository.save({ ...current, skipped: true })
  const prompt: Prompt = { id: deps.generateId(), word, createdAt: deps.now() }
  await repository.save(prompt)
  return prompt
}
