// Epic 9 — pure detection of "this word came around about a year ago too".
// The daily draw isn't deliberately tied to the calendar (words.ts: "Words
// may repeat across years — that recurrence is what powers the annual
// reflection"), so a same-word issuance landing near the anniversary is
// coincidental, not guaranteed. This module only decides whether one did.
import type { Prompt } from '@/domain/prompt'

/** How far from exactly one year ago a same-word issuance still counts as "the" anniversary. */
export const ANNUAL_REFLECTION_TOLERANCE_DAYS = 14

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Among `pastIssuances` of the same word, returns the one closest to
 * exactly one year before `today`, if any fall within the tolerance window.
 * Callers pass every issuance of today's word except today's own — but
 * today's issuance would never match anyway (it's ~365 days outside the
 * window), so no exclusion is required for correctness.
 */
export function findAnniversaryPrompt(
  pastIssuances: readonly Prompt[],
  today: Date,
  toleranceDays: number = ANNUAL_REFLECTION_TOLERANCE_DAYS
): Prompt | undefined {
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  let closest: Prompt | undefined
  let closestDiffDays = Infinity
  for (const prompt of pastIssuances) {
    const diffDays = Math.abs(
      (new Date(prompt.createdAt).getTime() - oneYearAgo.getTime()) / MS_PER_DAY
    )
    if (diffDays <= toleranceDays && diffDays < closestDiffDays) {
      closest = prompt
      closestDiffDays = diffDays
    }
  }
  return closest
}
