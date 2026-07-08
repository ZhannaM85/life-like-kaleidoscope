import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/ui/button'
import { TextField } from '@/shared/ui/text-field'
import { Textarea } from '@/shared/ui/textarea'
import { memoryFormSchema, type MemoryFormValues } from './memory-form'

interface MemoryFormProps {
  defaultValues: MemoryFormValues
  submitLabel: string
  savingLabel: string
  saving: boolean
  /** Where "Cancel" leads — back to the detail view or the list. */
  cancelTo: string
  onSubmit: (values: MemoryFormValues) => void
}

/**
 * The full memory form (Epic 4), shared by the new and edit pages. React Hook
 * Form + Zod; only the story is required — everything else is an invitation,
 * not a demand.
 */
export function MemoryForm({
  defaultValues,
  submitLabel,
  savingLabel,
  saving,
  cancelTo,
  onSubmit,
}: MemoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemoryFormValues>({
    resolver: zodResolver(memoryFormSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <TextField
        label="Title"
        hint="Optional — a few words to find this memory by later."
        error={errors.title?.message}
        disabled={saving}
        {...register('title')}
      />
      <Textarea
        label="The memory"
        hint="There is no wrong way to remember."
        placeholder="I remember…"
        className="min-h-48"
        error={errors.story?.message}
        disabled={saving}
        {...register('story')}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="About how old were you?"
          hint="Optional — a rough guess is fine."
          inputMode="numeric"
          error={errors.approxAge?.message}
          disabled={saving}
          {...register('approxAge')}
        />
        <TextField
          label="Around what year?"
          hint="Optional — a rough guess is fine."
          inputMode="numeric"
          error={errors.approxYear?.message}
          disabled={saving}
          {...register('approxYear')}
        />
      </div>
      <TextField
        label="People"
        hint="Names separated by commas, e.g. Mom, Aunt Vera."
        error={errors.people?.message}
        disabled={saving}
        {...register('people')}
      />
      <TextField
        label="Places"
        hint="Separated by commas."
        error={errors.places?.message}
        disabled={saving}
        {...register('places')}
      />
      <TextField
        label="Tags"
        hint="Separated by commas."
        error={errors.tags?.message}
        disabled={saving}
        {...register('tags')}
      />
      <div className="flex items-center justify-end gap-3">
        <Link to={cancelTo} className={cn(buttonVariants({ variant: 'ghost' }))}>
          Cancel
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? savingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
