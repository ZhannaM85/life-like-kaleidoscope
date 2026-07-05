// Domain-wide primitives. Pure TS — no React, Zustand, or Dexie imports.

/** Stable unique identifier for a domain entity. */
export type EntityId = string

/** ISO 8601 timestamp string (e.g. from `new Date().toISOString()`). */
export type IsoDateString = string

/** Produces a new unique EntityId. Injected so domain logic stays deterministic in tests. */
export type GenerateId = () => EntityId

/** Returns the current moment as an ISO string. Injected for testability. */
export type Now = () => IsoDateString

export function defaultGenerateId(): EntityId {
  return crypto.randomUUID()
}

export function nowIso(): IsoDateString {
  return new Date().toISOString()
}
