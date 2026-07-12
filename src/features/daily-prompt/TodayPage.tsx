import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDailyPromptStore, useLocaleStore } from '@/stores'
import { localeTag, type Locale } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { TextField } from '@/shared/ui/text-field'
import { Card, CardContent } from '@/shared/ui/card'
import { intInRangeError } from '@/features/memory-entry/memory-form'

function todayLabel(locale: Locale) {
  return new Date().toLocaleDateString(localeTag(locale), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function TodayPage() {
  const {
    prompt,
    todaysMemories,
    draft,
    draftApproxAge,
    draftApproxYear,
    status,
    error,
    load,
    setDraft,
    setDraftApproxAge,
    setDraftApproxYear,
    save,
  } = useDailyPromptStore()
  const t = useLocaleStore((s) => s.dictionary)
  const locale = useLocaleStore((s) => s.locale)
  const [showWhen, setShowWhen] = useState(() => Boolean(draftApproxAge || draftApproxYear))

  useEffect(() => {
    void load()
  }, [load])

  const ageError = intInRangeError(draftApproxAge, 0, 120, t.memoryForm.ageRange)
  const yearError = intInRangeError(draftApproxYear, 1000, 9999, t.memoryForm.yearFourDigit)

  if (status === 'loading' || (status === 'idle' && !prompt)) {
    return <p className="py-24 text-center text-muted-foreground">{t.today.opening}</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        {t.today.errorOpening(error ?? '')}
      </p>
    )
  }

  if (!prompt) return null

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center gap-2 pt-6 text-center">
        <p className="font-sans text-sm text-muted-foreground">
          {todayLabel(locale)} {t.today.wordSuffix}
        </p>
        <h1 className="text-5xl font-medium tracking-tight text-foreground">{prompt.word}</h1>
      </section>

      <section aria-label={t.today.writeSectionLabel} className="flex flex-col gap-4">
        <Textarea
          label={t.today.textareaLabel}
          hint={t.today.textareaHint}
          placeholder={t.common.placeholderIRemember}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={status === 'saving'}
          className="min-h-48"
        />

        {showWhen ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label={t.memoryForm.approxAgeLabel}
              hint={t.memoryForm.approxHint}
              inputMode="numeric"
              value={draftApproxAge}
              onChange={(e) => setDraftApproxAge(e.target.value)}
              error={ageError}
              disabled={status === 'saving'}
            />
            <TextField
              label={t.memoryForm.approxYearLabel}
              hint={t.memoryForm.approxHint}
              inputMode="numeric"
              value={draftApproxYear}
              onChange={(e) => setDraftApproxYear(e.target.value)}
              error={yearError}
              disabled={status === 'saving'}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowWhen(true)}
            className="self-start font-sans text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t.today.whenToggle}
          </button>
        )}

        <div className="flex items-center justify-end gap-4">
          <Link
            to="/memories/new"
            className="font-sans text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t.today.openFullForm}
          </Link>
          <Button
            onClick={() => void save()}
            disabled={status === 'saving' || !draft.trim() || Boolean(ageError) || Boolean(yearError)}
          >
            {status === 'saving' ? t.common.saving : t.common.keepThisMemory}
          </Button>
        </div>
      </section>

      {todaysMemories.length > 0 && (
        <section aria-label={t.today.savedTodaySectionLabel} className="flex flex-col gap-3">
          <p className="font-sans text-sm text-muted-foreground">
            {t.today.keptTodayPrefix}{' '}
            <Link to="/memories" className="underline underline-offset-2 hover:text-foreground">
              {t.common.seeAllMemories}
            </Link>
          </p>
          {todaysMemories.map((memory) => (
            <Card key={memory.id}>
              <CardContent className="pt-6">
                <p className="whitespace-pre-wrap leading-relaxed">{memory.story}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}
