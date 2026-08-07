import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useLocaleStore } from '@/stores'
import { usePhotoPreviews } from '@/shared/hooks'
import type { Photo } from '@/domain/memory'
import type { EntityId } from '@/domain/shared'
import type { PhotoChanges } from '@/features/photos'
import { Button, buttonVariants } from '@/shared/ui/button'
import { TextField } from '@/shared/ui/text-field'
import { Textarea } from '@/shared/ui/textarea'
import { ChipGroup } from '@/shared/ui/chip-group'
import { PhotoUpload } from '@/shared/ui/photo-upload'
import { makeMemoryFormSchema, type MemoryFormValues } from './memory-form'

const NO_PHOTOS: Photo[] = []

interface NewPhotoDraft {
  key: string
  file: File
  previewUrl: string
}

interface MemoryFormProps {
  defaultValues: MemoryFormValues
  /** Already-saved photos to preview and allow removing (edit only — new memories start with none). */
  initialPhotos?: Photo[]
  submitLabel: string
  savingLabel: string
  saving: boolean
  /** Where "Cancel" leads — back to the detail view or the list. */
  cancelTo: string
  onSubmit: (values: MemoryFormValues, photoChanges: PhotoChanges) => void
}

/**
 * The full memory form (Epic 4), shared by the new and edit pages. React Hook
 * Form + Zod; only the story is required — everything else is an invitation,
 * not a demand.
 */
export function MemoryForm({
  defaultValues,
  initialPhotos = NO_PHOTOS,
  submitLabel,
  savingLabel,
  saving,
  cancelTo,
  onSubmit,
}: MemoryFormProps) {
  const t = useLocaleStore((s) => s.dictionary)
  const schema = useMemo(() => makeMemoryFormSchema(t.memoryForm), [t])
  const moodOptions = useMemo(
    () => [
      { value: 'happy', label: t.mood.happy },
      { value: 'bittersweet', label: t.mood.bittersweet },
      { value: 'neutral', label: t.mood.neutral },
      { value: 'sad', label: t.mood.sad },
    ],
    [t]
  )
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MemoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const existingPreviews = usePhotoPreviews(initialPhotos)
  const [removedExistingIds, setRemovedExistingIds] = useState<Set<EntityId>>(new Set())
  const [newDrafts, setNewDrafts] = useState<NewPhotoDraft[]>([])
  const newDraftsRef = useRef(newDrafts)
  newDraftsRef.current = newDrafts

  // Newly added (not-yet-saved) previews are this component's own object
  // URLs — revoke them on unmount; `usePhotoPreviews` handles the ones for
  // already-saved photos.
  useEffect(() => {
    return () => {
      newDraftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl))
    }
  }, [])

  function addPhotos(files: File[]) {
    setNewDrafts((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ])
  }

  function removeExistingPhoto(id: EntityId) {
    setRemovedExistingIds((prev) => new Set(prev).add(id))
  }

  function removeNewPhoto(key: string) {
    setNewDrafts((prev) => {
      const draft = prev.find((d) => d.key === key)
      if (draft) URL.revokeObjectURL(draft.previewUrl)
      return prev.filter((d) => d.key !== key)
    })
  }

  function handleFormSubmit(values: MemoryFormValues) {
    onSubmit(values, {
      newFiles: newDrafts.map((d) => d.file),
      removedPhotoIds: Array.from(removedExistingIds),
    })
  }

  const visibleExisting = existingPreviews.filter((p) => !removedExistingIds.has(p.id))

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-6">
      <TextField
        label={t.memoryForm.titleLabel}
        hint={t.memoryForm.titleHint}
        error={errors.title?.message}
        disabled={saving}
        {...register('title')}
      />
      <Textarea
        label={t.memoryForm.storyLabel}
        hint={t.memoryForm.storyHint}
        placeholder={t.common.placeholderIRemember}
        className="min-h-48"
        error={errors.story?.message}
        disabled={saving}
        {...register('story')}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label={t.memoryForm.approxAgeLabel}
          hint={t.memoryForm.approxHint}
          inputMode="numeric"
          error={errors.approxAge?.message}
          disabled={saving}
          {...register('approxAge')}
        />
        <TextField
          label={t.memoryForm.approxYearLabel}
          hint={t.memoryForm.approxHint}
          inputMode="numeric"
          error={errors.approxYear?.message}
          disabled={saving}
          {...register('approxYear')}
        />
      </div>
      <Controller
        control={control}
        name="mood"
        render={({ field }) => (
          <ChipGroup
            legend={t.mood.question}
            options={moodOptions}
            value={field.value === '' ? undefined : field.value}
            onChange={(value) => field.onChange(value ?? '')}
            disabled={saving}
          />
        )}
      />
      <TextField
        label={t.common.people}
        hint={t.memoryForm.peopleHint}
        error={errors.people?.message}
        disabled={saving}
        {...register('people')}
      />
      <TextField
        label={t.common.places}
        hint={t.memoryForm.placesHint}
        error={errors.places?.message}
        disabled={saving}
        {...register('places')}
      />
      <TextField
        label={t.common.tags}
        hint={t.memoryForm.tagsHint}
        error={errors.tags?.message}
        disabled={saving}
        {...register('tags')}
      />
      <div className="flex flex-col gap-3">
        <span className="font-sans text-sm font-medium text-foreground">
          {t.memoryForm.photosLabel}
        </span>
        <p className="font-sans text-sm text-muted-foreground">{t.memoryForm.photosHint}</p>
        {(visibleExisting.length > 0 || newDrafts.length > 0) && (
          <ul className="flex flex-wrap gap-3">
            {visibleExisting.map((photo) => (
              <li key={photo.id} className="relative">
                <img
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  className="size-24 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(photo.id)}
                  disabled={saving}
                  aria-label={t.memoryForm.removePhoto}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
            {newDrafts.map((draft) => (
              <li key={draft.key} className="relative">
                <img
                  src={draft.previewUrl}
                  alt=""
                  className="size-24 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(draft.key)}
                  disabled={saving}
                  aria-label={t.memoryForm.removePhoto}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <PhotoUpload
          onSelect={addPhotos}
          multiple
          label={t.memoryForm.addPhotos}
          disabled={saving}
          className="w-fit"
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        <Link to={cancelTo} className={cn(buttonVariants({ variant: 'ghost' }))}>
          {t.common.cancel}
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? savingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
