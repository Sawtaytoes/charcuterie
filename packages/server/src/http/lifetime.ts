/**
 * WHEN AN ANSWER FROM SOMEBODY ELSE'S SERVER STOPS BEING TRUE.
 *
 * This module is the POLICY half of outbound HTTP caching, and it
 * owns no storage at all. Five apps in this fleet cache third-party
 * responses and every one of them picked a different substrate —
 * two SQLite tables, two directories of JSON files, one memory
 * `Map` backed by a file. Each choice is right where it sits, so
 * lifting any one of them into the library would fit two apps and
 * force three pointless migrations.
 *
 * What actually repeats is two questions, and neither of them
 * touches a disk:
 *
 * 1. **How long is this answer still true?** — this file.
 * 2. **How often may we ask?** — `createThrottle.ts`.
 *
 * `createHttpCache.ts` joins the two over a read/write pair the
 * CALLER supplies.
 *
 * ## Not to be confused with `../cachePolicy.ts`
 *
 * That module is about the `Cache-Control` header this fleet's
 * servers SEND to a browser. This module is about the responses
 * this fleet's servers RECEIVE from somebody else. Opposite
 * directions, no shared code.
 */

/**
 * A moment in time, in whichever spelling the caller's store
 * already holds.
 *
 * A number is epoch milliseconds. A string is anything
 * `Date.parse` accepts, which in practice means ISO 8601.
 *
 * The union exists so that one policy reads a SQLite `TEXT`
 * column and a JSON number without either app converting on
 * every row. It is also why these fields carry **no `Ms`
 * suffix**: `fetchedAt` names a moment, and the unit belongs to
 * the value rather than to the name. Durations are the other
 * case and do keep the suffix — `minIntervalMs` is genuinely
 * ambiguous without it.
 */
export type Timestamp = number | string

/**
 * How long an answer stays true.
 *
 * - `"immutable"` is a CLAIM about the URL, not a hint. Only a
 *   content-addressed answer — a file at a 40-character commit
 *   hash — or a verdict that cannot change back may make it.
 * - `"none"` keeps a read out of the store altogether, for a body
 *   that is already persisted somewhere with a name and a meaning.
 * - A number is milliseconds.
 */
export type CacheLifetime = "immutable" | "none" | number

/**
 * What may actually be written down. `"none"` is a decision not to
 * write, so it can never reach a record.
 */
export type StoredLifetime = Exclude<CacheLifetime, "none">

/** One minute. */
export const ONE_MINUTE_MS = 60 * 1000

/** One hour. */
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

/** One day. */
export const ONE_DAY_MS = 24 * ONE_HOUR_MS

/** One week. */
export const ONE_WEEK_MS = 7 * ONE_DAY_MS

/**
 * A stored answer, in the shape this policy reads it.
 *
 * The caller's store holds whatever else it likes; these are the
 * four fields the policy needs, and the names are the fleet's:
 * `fetched_at` / `expires_at` / `etag` in a database, `fetchedAt`
 * / `expiresAt` / `etag` in JavaScript.
 */
export type CacheRecord<Payload> = {
  /**
   * The validator the origin gave us, replayed as
   * `If-None-Match`. Null when it gave none.
   */
  readonly etag?: string | null
  /** When this answer stops being trusted. Null means never. */
  readonly expiresAt?: Timestamp | null
  /** When the response was received. */
  readonly fetchedAt: Timestamp
  /**
   * This record remembers that the origin had NOTHING, rather
   * than remembering an answer.
   *
   * A cached miss is a real cache entry and one app already
   * depends on it: rip-deck remembers "OMDb has never heard of
   * this disc" for a week, because re-asking every five seconds
   * is a rate limit. A helper that only caches successes would
   * leave that app hand-rolling the interesting half.
   */
  readonly isMiss?: boolean
  /** The answer itself. Null on a cached miss. */
  readonly payload: Payload | null
}

/**
 * Epoch milliseconds, or null when the value cannot be read as a
 * time at all.
 *
 * A store that has been hand-edited, or written by an older
 * schema, must degrade to a cache miss and never to a crash.
 */
export const toEpochMs = (
  timestamp: Timestamp | null | undefined,
): number | null => {
  if (timestamp == null) {
    return null
  }

  const milliseconds =
    typeof timestamp === "number"
      ? timestamp
      : Date.parse(timestamp)

  return Number.isNaN(milliseconds) ? null : milliseconds
}

/**
 * When a record written now would stop being true.
 *
 * Null for `"immutable"`, which is the same null the record
 * stores — "no expiry" and "never expires" are one state, so
 * there is nothing to tell apart later.
 */
export const resolveExpiresAt = ({
  fetchedAt,
  lifetime,
}: {
  fetchedAt: Timestamp
  lifetime: StoredLifetime
}): number | null => {
  if (lifetime === "immutable") {
    return null
  }

  const fetchedAtMs = toEpochMs(fetchedAt)

  return fetchedAtMs == null ? null : fetchedAtMs + lifetime
}

/**
 * Whether a record may be used without asking the origin.
 *
 * An unreadable `expiresAt` counts as expired rather than as
 * permanent: getting a stale answer once is cheap, and treating
 * a corrupt row as immutable is forever.
 */
export const getIsFresh = ({
  expiresAt,
  now,
}: {
  expiresAt?: Timestamp | null
  now: number
}): boolean => {
  if (expiresAt == null) {
    // Immutable. The record claimed its URL can only ever name
    // these bytes, and that claim does not decay.
    return true
  }

  const expiresAtMs = toEpochMs(expiresAt)

  return expiresAtMs != null && expiresAtMs > now
}

/**
 * What to do about a stored record, before any I/O happens.
 *
 * - `"use"` — still true. Return it and make no request. **This
 *   is the only outcome that saves a rate-limit budget**, which
 *   is why the whole module exists.
 * - `"revalidate"` — past its lifetime, but we still hold a body
 *   and a validator. Ask again with `If-None-Match`; a 304 buys
 *   the transfer back.
 * - `"fetch"` — nothing usable. Ask outright.
 */
export type CacheDecision<Payload> =
  | {
      readonly action: "fetch"
      readonly etag: null
      readonly record: null
    }
  | {
      readonly action: "revalidate"
      readonly etag: string | null
      readonly record: CacheRecord<Payload>
    }
  | {
      readonly action: "use"
      readonly etag: string | null
      readonly record: CacheRecord<Payload>
    }

/**
 * The policy, as one pure function.
 *
 * Separate from `createHttpCache` on purpose: this is the part
 * with all the rules and none of the I/O, so a test for "does a
 * 40-character commit hash ever expire" is three lines and needs
 * no fake server.
 *
 * `missLifetime` is what a cached miss is judged against, so a
 * negative answer can be believed for a different — usually
 * shorter — time than a real one. It defaults to `lifetime`.
 */
export const resolveCacheDecision = <Payload>({
  lifetime,
  missLifetime = lifetime,
  now,
  record,
}: {
  lifetime: CacheLifetime
  missLifetime?: CacheLifetime
  now: number
  record: CacheRecord<Payload> | null | undefined
}): CacheDecision<Payload> => {
  const NOTHING_STORED = {
    action: "fetch",
    etag: null,
    record: null,
  } as const

  if (record == null) {
    return NOTHING_STORED
  }

  const isMiss = record.isMiss === true

  const applicableLifetime = isMiss
    ? missLifetime
    : lifetime

  if (applicableLifetime === "none") {
    // The caller said not to store this kind of answer, so
    // whatever is on disk is somebody else's row and is not read.
    return NOTHING_STORED
  }

  if (
    getIsFresh({ expiresAt: record.expiresAt, now: now })
  ) {
    return {
      action: "use",
      etag: record.etag ?? null,
      record,
    }
  }

  // A stale MISS carries no body to revalidate against — there is
  // nothing an `If-None-Match` could confirm — so it is a plain
  // refetch.
  if (isMiss) {
    return NOTHING_STORED
  }

  return {
    action: "revalidate",
    etag: record.etag ?? null,
    record,
  }
}
