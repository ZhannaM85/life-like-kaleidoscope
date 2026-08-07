import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/shared/ui/page-header'
import { useDailyPromptStore, useLocaleStore, effectiveWordPool } from '@/stores'
import { localeTag } from '@/i18n'

/**
 * "…or choose a word yourself" (#31): every word in today's effective pool
 * (curated + custom, minus hidden — #27/#28), alphabetical, plain text, no
 * used/unused indicators. Picking one makes it today's word and returns to
 * Today — browsing here is opt-in, so the daily surprise is never spoiled
 * by accident.
 */
export function WordGalleryPage() {
  const t = useLocaleStore((s) => s.dictionary)
  const locale = useLocaleStore((s) => s.locale)
  const chooseWord = useDailyPromptStore((s) => s.chooseWord)
  const skipping = useDailyPromptStore((s) => s.skipping)
  const navigate = useNavigate()
  const [words, setWords] = useState<string[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void effectiveWordPool(locale).then((pool) => {
      if (cancelled) return
      setWords([...pool].sort((a, b) => a.localeCompare(b, localeTag(locale))))
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  async function handlePick(word: string) {
    await chooseWord(word)
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.wordGallery.title} description={t.wordGallery.description} />
      <Link
        to="/"
        className="self-start font-sans text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {t.common.backToTodaysWord}
      </Link>
      {words === null ? (
        <p className="py-12 text-center text-muted-foreground">{t.wordGallery.loading}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {words.map((word) => (
            <li key={word}>
              <button
                type="button"
                onClick={() => void handlePick(word)}
                disabled={skipping}
                className="font-serif text-base text-foreground underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground disabled:opacity-50"
              >
                {word}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
