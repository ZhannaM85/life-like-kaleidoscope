import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDailyPromptStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Card, CardContent } from '@/shared/ui/card'

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function TodayPage() {
  const { prompt, todaysMemories, draft, status, error, load, setDraft, save } =
    useDailyPromptStore()

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'loading' || (status === 'idle' && !prompt)) {
    return <p className="py-24 text-center text-muted-foreground">Opening today's page…</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        Something went wrong opening today's page. {error}
      </p>
    )
  }

  if (!prompt) return null

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center gap-2 pt-6 text-center">
        <p className="font-sans text-sm text-muted-foreground">{todayLabel()} — today's word</p>
        <h1 className="text-5xl font-medium tracking-tight text-foreground">{prompt.word}</h1>
      </section>

      <section aria-label="Write today's memory" className="flex flex-col gap-4">
        <Textarea
          label="A memory this word brings back"
          hint="A few sentences are plenty. There is no wrong way to remember."
          placeholder="I remember…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={status === 'saving'}
          className="min-h-48"
        />
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/memories/new"
            className="font-sans text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            More to add? Open the full form
          </Link>
          <Button onClick={() => void save()} disabled={status === 'saving' || !draft.trim()}>
            {status === 'saving' ? 'Saving…' : 'Keep this memory'}
          </Button>
        </div>
      </section>

      {todaysMemories.length > 0 && (
        <section aria-label="Saved today" className="flex flex-col gap-3">
          <p className="font-sans text-sm text-muted-foreground">
            Kept today —{' '}
            <Link to="/memories" className="underline underline-offset-2 hover:text-foreground">
              see all memories
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
