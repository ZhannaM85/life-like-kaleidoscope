// Epic 10 — serendipitous surfacing: "on this day N years ago" when the
// archive has one, a deterministic-per-day random pick otherwise.
import type { Memory } from '@/domain/memory'
import { localDateKey } from '@/domain/prompt'

/** FNV-1a — same small deterministic hash the daily word draw uses, so a reload never reshuffles the pick. */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function monthDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

/**
 * Memories written on the same calendar month/day as `today`, from any
 * earlier year — excludes anything written today itself, since the
 * callback looks backward, not sideways.
 */
export function onThisDayMemories(memories: readonly Memory[], today: Date): Memory[] {
  const todayKey = localDateKey(today)
  const targetMonthDay = monthDay(today)
  return memories.filter((memory) => {
    const created = new Date(memory.createdAt)
    return localDateKey(created) !== todayKey && monthDay(created) === targetMonthDay
  })
}

export interface RandomMemoryPick {
  memory: Memory
  /** Whether this was an "on this day" match, vs. the random fallback. */
  onThisDay: boolean
}

/**
 * "On this day" if the archive has one, else a random memory from
 * everything else (excluding today's own new entries and any id already
 * shown elsewhere, e.g. the annual-reflection callback, #10). Both the
 * "on this day" and fallback picks are hash-based on the local date, so
 * the choice is stable across reloads within the same day but changes
 * day to day — the same determinism the daily word draw already relies on.
 */
export function pickRandomMemory(
  memories: readonly Memory[],
  today: Date,
  excludeIds: ReadonlySet<string> = new Set()
): RandomMemoryPick | undefined {
  const todayKey = localDateKey(today)
  const eligible = memories.filter(
    (memory) => !excludeIds.has(memory.id) && localDateKey(new Date(memory.createdAt)) !== todayKey
  )

  const onThisDay = onThisDayMemories(eligible, today)
  if (onThisDay.length > 0) {
    return { memory: onThisDay[hash(todayKey) % onThisDay.length]!, onThisDay: true }
  }
  if (eligible.length === 0) return undefined
  return { memory: eligible[hash(`random-${todayKey}`) % eligible.length]!, onThisDay: false }
}
