import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/shared/ui/page-header'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  getStorageStatus,
  type StorageStatus,
} from '@/infrastructure/persistence/storage-persistence'

// Key prefix predates the rename to "Life Like Kaleidoscope"; kept so existing
// dismissals survive.
const BACKUP_SUGGESTION_DISMISSED_KEY = 'life-kaleidoscope.backup-suggestion-dismissed'

// localStorage can throw (privacy modes); a lost dismissal just means the
// suggestion reappears next visit — never an error the user sees.
function readSuggestionDismissed(): boolean {
  try {
    return localStorage.getItem(BACKUP_SUGGESTION_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

function saveSuggestionDismissed(): void {
  try {
    localStorage.setItem(BACKUP_SUGGESTION_DISMISSED_KEY, 'true')
  } catch {
    // dismissed for this session only — fine
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  let value = bytes
  let unit = 'B'
  for (const next of ['KB', 'MB', 'GB', 'TB']) {
    if (value < 1024) break
    value /= 1024
    unit = next
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${unit}`
}

function protectionLabel(status: StorageStatus | null): string {
  if (!status) return 'Checking…'
  if (status.persisted === true)
    return 'On — this browser has agreed to keep your memories through its storage cleanups.'
  if (status.persisted === false)
    return 'Not granted yet — this browser may reclaim the space if the device runs low.'
  return "This browser doesn't say."
}

function spaceUsedLabel(status: StorageStatus | null): string {
  if (!status) return 'Checking…'
  if (status.usage === null) return "This browser doesn't say."
  const used = formatBytes(status.usage)
  return status.quota === null ? used : `${used} of ${formatBytes(status.quota)} available`
}

export function SettingsPage() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [suggestionDismissed, setSuggestionDismissed] = useState(readSuggestionDismissed)

  useEffect(() => {
    let cancelled = false
    void getStorageStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function dismissSuggestion() {
    saveSuggestionDismissed()
    setSuggestionDismissed(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Everything you write is stored in this browser, on this device — it never leaves it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-4 font-sans text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Storage protection</dt>
              <dd>{protectionLabel(status)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Space used</dt>
              <dd>{spaceUsedLabel(status)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {status?.persisted === false && !suggestionDismissed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">A gentle suggestion</CardTitle>
            <CardDescription>
              Since this browser hasn't promised to keep the data forever, an occasional backup from
              the{' '}
              <Link to="/export" className="underline underline-offset-2 hover:text-foreground">
                Export page
              </Link>{' '}
              is a good habit. No rush — whenever it crosses your mind.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={dismissSuggestion}>
              Okay, noted
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
