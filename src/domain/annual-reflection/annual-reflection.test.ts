import { describe, it, expect } from 'vitest'
import type { Prompt } from '@/domain/prompt'
import { findAnniversaryPrompt, ANNUAL_REFLECTION_TOLERANCE_DAYS } from './index'

function makePrompt(id: string, createdAt: string): Prompt {
  return { id, word: 'Bicycle', createdAt }
}

describe('findAnniversaryPrompt', () => {
  it('finds a same-word issuance exactly one year before today', () => {
    const today = new Date(2026, 6, 5) // 2026-07-05, local
    const lastYear = makePrompt('a', new Date(2025, 6, 5).toISOString())
    expect(findAnniversaryPrompt([lastYear], today)).toBe(lastYear)
  })

  it('finds one within the tolerance window either side of the anniversary', () => {
    const today = new Date(2026, 6, 5)
    const aWeekEarlier = makePrompt('a', new Date(2025, 5, 28).toISOString())
    expect(findAnniversaryPrompt([aWeekEarlier], today)).toBe(aWeekEarlier)
  })

  it('ignores an issuance outside the tolerance window', () => {
    const today = new Date(2026, 6, 5)
    const twoMonthsOff = makePrompt('a', new Date(2025, 4, 1).toISOString())
    expect(findAnniversaryPrompt([twoMonthsOff], today)).toBeUndefined()
  })

  it("ignores today's own issuance (~365 days outside any reasonable window)", () => {
    const today = new Date(2026, 6, 5)
    const todaysOwn = makePrompt('today', today.toISOString())
    expect(findAnniversaryPrompt([todaysOwn], today)).toBeUndefined()
  })

  it('picks the closest match when more than one falls in the window', () => {
    const today = new Date(2026, 6, 5)
    const near = makePrompt('near', new Date(2025, 6, 3).toISOString())
    const closer = makePrompt('closer', new Date(2025, 6, 6).toISOString())
    expect(findAnniversaryPrompt([near, closer], today)).toBe(closer)
  })

  it('returns undefined for no past issuances', () => {
    expect(findAnniversaryPrompt([], new Date(2026, 6, 5))).toBeUndefined()
  })

  it('respects a custom tolerance', () => {
    const today = new Date(2026, 6, 5)
    const twentyDaysOff = makePrompt('a', new Date(2025, 5, 15).toISOString())
    expect(findAnniversaryPrompt([twentyDaysOff], today, 30)).toBe(twentyDaysOff)
    expect(findAnniversaryPrompt([twentyDaysOff], today, 5)).toBeUndefined()
  })

  it('the default tolerance is 14 days', () => {
    expect(ANNUAL_REFLECTION_TOLERANCE_DAYS).toBe(14)
  })
})
