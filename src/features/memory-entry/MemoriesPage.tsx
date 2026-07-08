import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, PenLine } from 'lucide-react'
import { useMemoriesStore } from '@/stores'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'

function writtenOn(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function MemoriesPage() {
  const { memories, promptsById, status, error, load } = useMemoriesStore()

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'loading' || status === 'idle') {
    return <p className="py-24 text-center text-muted-foreground">Turning the pages…</p>
  }

  if (status === 'error') {
    return (
      <p role="alert" className="py-24 text-center text-muted-foreground">
        Something went wrong loading your memories. {error}
      </p>
    )
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No memories yet"
        description="Today's word is waiting on the first page."
        action={
          <Link
            to="/"
            className="font-sans text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            Go to today's word
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Memories"
        description="Everything you have kept, newest first."
        action={
          <Link to="/memories/new" className={cn(buttonVariants({ variant: 'outline' }))}>
            <PenLine aria-hidden />
            Write a memory
          </Link>
        }
      />
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {memories.map((memory) => {
          const word = promptsById[memory.promptId]?.word
          return (
            <li key={memory.id}>
              <Link to={`/memories/${memory.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader className="pb-3">
                    {word && <CardTitle className="text-base">{word}</CardTitle>}
                    <CardDescription>{writtenOn(memory.createdAt)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed">{memory.story}</p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
