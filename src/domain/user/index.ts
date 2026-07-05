import type { EntityId } from '@/domain/shared'

export interface UserProfile {
  id: EntityId
  displayName: string
  /**
   * UNUSED in MVP. Reserved field only — no access-transfer, verification, or
   * sharing logic is built around this. It exists so a future
   * succession/inheritance feature doesn't require a migration.
   */
  legacyContact?: { name: string; contactInfo: string }
}

export interface UserProfileRepository {
  /** The single MVP user's profile, if one has been created. */
  get(): Promise<UserProfile | undefined>
  save(profile: UserProfile): Promise<void>
}
