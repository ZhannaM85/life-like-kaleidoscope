interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({
  title,
  description = 'Coming in a future epic.',
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-3">{title}</h1>
      <p className="text-muted-foreground text-sm max-w-xs">{description}</p>
    </div>
  )
}
