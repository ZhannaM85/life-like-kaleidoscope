// Epic 7 — pure grouping of memories by when the event happened (approx
// year), not when they were written. Kept storage-free so it's testable
// without a browser, same reasoning as domain/search.
import type { Memory } from '@/domain/memory'

export interface TimelineYearGroup {
  year: number
  memories: Memory[]
}

export interface Timeline {
  /** Ascending — oldest year first, "a life reads forward". */
  byYear: TimelineYearGroup[]
  /**
   * No `approxYear` at all — can't be placed on an absolute timeline (an
   * `approxAge` alone would need a birth year this app doesn't collect).
   * Ordered by `approxAge` when given (ascending), then by write date, so
   * even "no information at all" memories land somewhere deterministic.
   */
  undated: Memory[]
}

/** Groups memories by `approxYear`; everything else falls into `undated`. */
export function buildTimeline(memories: readonly Memory[]): Timeline {
  const byYearMap = new Map<number, Memory[]>()
  const undated: Memory[] = []

  for (const memory of memories) {
    if (memory.approxYear === undefined) {
      undated.push(memory)
      continue
    }
    const group = byYearMap.get(memory.approxYear)
    if (group) group.push(memory)
    else byYearMap.set(memory.approxYear, [memory])
  }

  const byYear = [...byYearMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearMemories]) => ({
      year,
      memories: [...yearMemories].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))

  undated.sort((a, b) => {
    if (a.approxAge !== undefined && b.approxAge !== undefined) return a.approxAge - b.approxAge
    if (a.approxAge !== undefined) return -1
    if (b.approxAge !== undefined) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  return { byYear, undated }
}
