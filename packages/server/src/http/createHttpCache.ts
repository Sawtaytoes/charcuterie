import type { Throttle } from "./createThrottle.ts"
import {
  type CacheLifetime,
  type CacheRecord,
  resolveCacheDecision,
  resolveExpiresAt,
  type Timestamp,
} from "./lifetime.ts"

/**
 * THE CHEAPEST REQUEST IS THE ONE THAT IS NEVER MADE.
 *
 * This joins the lifetime policy to a politeness throttle over a
 * read/write pair the CALLER supplies. **The library never owns
 * storage.** That is the one design decision everything else
 * follows from, and it is not squeamishness: the five apps that
 * do this today store their answers in a SQLite table, a second
 * SQLite table with five schemas, a directory of JSON files, a
 * second directory of JSON files, and a memory `Map` written
 * through to one file. Every one of those is right where it sits.
 * A `host_responses` table in the library would fit two of them
 * and force three migrations that buy nothing.
 *
 * So the substrate stays in the app, and what moves here is the
 * part that was written five times: when an answer stops being
 * true, how often we may ask, and the four-way branch that a
 * conditional request turns into.
 *
 * ## ⚠️ A 304 saves bandwidth. It does NOT save budget.
 *
 * Measured against the live GitHub API on 2026-08-24, from a
 * fleet address, unauthenticated:
 *
 * | Request | Code | `x-ratelimit-remaining` |
 * | --- | --- | --- |
 * | `GET /repos/…` | 200 | 52 |
 * | `GET` + `If-None-Match` | 304 | 51 |
 * | `GET` + `If-None-Match` | 304 | 50 |
 * | `GET` + `If-None-Match` | 304 | 49 |
 *
 * `x-ratelimit-used` rose by one on every 304. GitHub documents a
 * 304 as free against the **primary** rate limit, and the
 * unauthenticated per-address limit is not that limit. An agent
 * has already read the documentation and concluded the opposite,
 * so it is written down here: an `ETag` buys the BODY back, never
 * the budget. Only a `"use"` decision saves budget, and that is
 * what the lifetime is for.
 *
 * Revalidation is still worth having where the bodies are large
 * and the budget is absent — a self-hosted Forgejo serving whole
 * files is exactly that case.
 */

/**
 * What the origin said, in the four shapes that need different
 * handling. The caller does the actual HTTP, so this module never
 * owns a `fetch`, a header, an auth scheme or a URL template.
 *
 * - `"payload"` — an answer, and the validator to store with it.
 * - `"unchanged"` — a 304. The stored body stands and its
 *   lifetime restarts.
 * - `"missing"` — the origin answered, and the answer was "no
 *   such thing". A 404, or an empty search result. Cacheable, and
 *   `missLifetime` says for how long.
 * - `"unavailable"` — no answer at all: a socket error, a 5xx, a
 *   spent budget. **Never cached**, because caching one
 *   unreachable minute is how a week goes by without posters.
 *   Starts the throttle's cooldown instead.
 */
export type OriginResponse<Payload> =
  | { readonly outcome: "missing" }
  | {
      readonly etag?: string | null
      readonly outcome: "payload"
      readonly payload: Payload
    }
  | { readonly outcome: "unavailable" }
  | { readonly outcome: "unchanged" }

/**
 * A record as this module writes it: epoch milliseconds, and
 * every field decided.
 *
 * A store whose columns are ISO text converts on the way in —
 * `new Date(record.fetchedAt).toISOString()` — which is one line
 * in the adapter rather than a `Timestamp` union in the schema.
 */
export type StoredRecord<Payload> = {
  readonly etag: string | null
  /** Null means never — an `"immutable"` lifetime. */
  readonly expiresAt: number | null
  readonly fetchedAt: number
  readonly isMiss: boolean
  readonly payload: Payload | null
}

/**
 * The caller's substrate, as two functions.
 *
 * Both may be synchronous: a `better-sqlite3` read is, and
 * awaiting a plain value costs a microtask. Returning `null` or
 * `undefined` from `read` is a miss.
 */
export type CacheStore<Payload> = {
  readonly read: (input: {
    key: string
  }) =>
    | CacheRecord<Payload>
    | null
    | undefined
    | Promise<CacheRecord<Payload> | null | undefined>
  readonly write: (input: {
    key: string
    record: StoredRecord<Payload>
  }) => Promise<void> | void
}

/** Where an answer came from, and what it cost. */
export type CacheSource =
  /** Nothing to give. No stored answer, and the origin had none
   * or could not be reached. */
  | "none"
  /** The origin sent a body. One request spent. */
  | "origin"
  /** Served from the store. **No request was made.** */
  | "stored"
  /** The origin confirmed the stored body with a 304. One
   * request spent, no transfer. */
  | "unchanged"

export type CacheResult<Payload> = {
  /** When the answer being returned was received. */
  readonly fetchedAt: Timestamp | null
  /** The origin's answer was "no such thing". */
  readonly isMiss: boolean
  /**
   * This body is past its lifetime and is being served anyway —
   * either behind a background refresh, or because the origin
   * could not be reached and a stale answer beats none.
   */
  readonly isStale: boolean
  readonly payload: Payload | null
  readonly source: CacheSource
}

export type HttpCacheOptions<Payload> = {
  /**
   * Make the request. Replay `etag` as `If-None-Match` and return
   * `"unchanged"` on a 304.
   */
  fetchFromOrigin: (input: {
    etag: string | null
    key: string
  }) => Promise<OriginResponse<Payload>>
  /**
   * Serve a stale body immediately and refresh behind it.
   *
   * queuepilot's section listings do this: a 5-minute soft TTL,
   * the payload returned at once, and a warmer kicked off in the
   * background. Off by default — a caller that has not thought
   * about it should get the correct answer, not the fast one.
   */
  isStaleWhileRevalidate?: boolean
  /** The default lifetime. Overridable per call. */
  lifetime: CacheLifetime
  /**
   * How long "no such thing" is believed.
   *
   * Defaults to `"none"`, which is "do not remember a miss at
   * all" — the conservative choice, and what a git host wants,
   * where a 404 usually means a link is wrong rather than a
   * lookup failed. rip-deck sets a week.
   */
  missLifetime?: CacheLifetime
  /** Injected for tests. */
  now?: () => number
  /**
   * Every failure this module swallows, so it is visible without
   * being fatal. A cache must never be the reason a page fails to
   * render, and a silent `catch` must never be the reason a bug
   * takes a week to find.
   */
  onError?: (input: {
    error: unknown
    key: string
    phase: "origin" | "read" | "write"
  }) => void
  store: CacheStore<Payload>
  /**
   * The politeness bound. Optional: a cache in front of a server
   * with no published limit needs none.
   */
  throttle?: Throttle
  /**
   * How long an `"unavailable"` answer stops every request to
   * this origin. Needs a `throttle` to have any effect.
   */
  unavailableCooldownMs?: number
}

export type HttpCache<Payload> = {
  /**
   * The answer, from the store or from the origin.
   *
   * Concurrent calls for the same key collapse into ONE request:
   * the second caller awaits the first's promise rather than
   * racing it to the network and then racing it to write the same
   * row.
   */
  readonly get: (input: {
    key: string
    lifetime?: CacheLifetime
    missLifetime?: CacheLifetime
  }) => Promise<CacheResult<Payload>>
  /** How many keys are being fetched right now. */
  readonly getInFlightCount: () => number
}

const NOTHING: CacheResult<never> = {
  fetchedAt: null,
  isMiss: false,
  isStale: false,
  payload: null,
  source: "none",
}

export const createHttpCache = <Payload>({
  fetchFromOrigin,
  isStaleWhileRevalidate = false,
  lifetime: defaultLifetime,
  missLifetime: defaultMissLifetime = "none",
  now = () => Date.now(),
  onError,
  store,
  throttle,
  unavailableCooldownMs,
}: HttpCacheOptions<Payload>): HttpCache<Payload> => {
  const inFlightByKey = new Map<
    string,
    Promise<CacheResult<Payload>>
  >()

  const report = (
    error: unknown,
    key: string,
    phase: "origin" | "read" | "write",
  ): void => {
    onError?.({ error, key, phase })
  }

  const persist = async (
    key: string,
    record: StoredRecord<Payload>,
  ): Promise<void> => {
    try {
      await store.write({ key, record })
    } catch (error) {
      // A state directory that has gone read-only costs the
      // memory of what we fetched, never the answer itself.
      report(error, key, "write")
    }
  }

  const askOrigin = async ({
    etag,
    key,
  }: {
    etag: string | null
    key: string
  }): Promise<OriginResponse<Payload>> => {
    const ask = async (): Promise<
      OriginResponse<Payload>
    > => await fetchFromOrigin({ etag, key })

    try {
      return throttle == null
        ? await ask()
        : await throttle.run(ask)
    } catch (error) {
      // A throw is the same event as an `"unavailable"` — the
      // origin did not answer — so it takes the same path,
      // cooldown included, and is reported rather than hidden.
      report(error, key, "origin")

      return { outcome: "unavailable" }
    }
  }

  const refresh = async ({
    key,
    lifetime,
    missLifetime,
    record,
  }: {
    key: string
    lifetime: CacheLifetime
    missLifetime: CacheLifetime
    record: CacheRecord<Payload> | null
  }): Promise<CacheResult<Payload>> => {
    const response = await askOrigin({
      etag: record?.etag ?? null,
      key,
    })

    const fetchedAt = now()

    if (response.outcome === "unavailable") {
      throttle?.startCooldown(
        unavailableCooldownMs == null
          ? undefined
          : { durationMs: unavailableCooldownMs },
      )

      return record == null
        ? NOTHING
        : {
            fetchedAt: record.fetchedAt,
            isMiss: record.isMiss === true,
            isStale: true,
            payload: record.payload,
            source: "stored",
          }
    }

    if (response.outcome === "unchanged") {
      // A 304 with nothing stored means we sent no validator and
      // got one anyway. Nothing to confirm, so nothing is claimed.
      if (record == null) {
        return NOTHING
      }

      if (lifetime !== "none") {
        await persist(key, {
          etag: record.etag ?? null,
          expiresAt: resolveExpiresAt({
            fetchedAt,
            lifetime,
          }),
          fetchedAt,
          isMiss: false,
          payload: record.payload,
        })
      }

      return {
        fetchedAt,
        isMiss: false,
        isStale: false,
        payload: record.payload,
        source: "unchanged",
      }
    }

    if (response.outcome === "missing") {
      if (missLifetime !== "none") {
        await persist(key, {
          etag: null,
          expiresAt: resolveExpiresAt({
            fetchedAt,
            lifetime: missLifetime,
          }),
          fetchedAt,
          isMiss: true,
          payload: null,
        })
      }

      return {
        fetchedAt,
        isMiss: true,
        isStale: false,
        payload: null,
        source: "origin",
      }
    }

    if (lifetime !== "none") {
      await persist(key, {
        etag: response.etag ?? null,
        expiresAt: resolveExpiresAt({
          fetchedAt,
          lifetime,
        }),
        fetchedAt,
        isMiss: false,
        payload: response.payload,
      })
    }

    return {
      fetchedAt,
      isMiss: false,
      isStale: false,
      payload: response.payload,
      source: "origin",
    }
  }

  const refreshOnce = ({
    key,
    lifetime,
    missLifetime,
    record,
  }: {
    key: string
    lifetime: CacheLifetime
    missLifetime: CacheLifetime
    record: CacheRecord<Payload> | null
  }): Promise<CacheResult<Payload>> => {
    const inFlight = inFlightByKey.get(key)

    if (inFlight !== undefined) {
      return inFlight
    }

    const request = refresh({
      key,
      lifetime,
      missLifetime,
      record,
    }).finally(() => {
      inFlightByKey.delete(key)
    })

    inFlightByKey.set(key, request)

    return request
  }

  /**
   * An unreadable store is a miss, never a crash. The `try`
   * wraps the CALL as well as the promise: a synchronous
   * `better-sqlite3` read throws before there is a promise to
   * attach a `catch` to.
   */
  const load = async (
    key: string,
  ): Promise<CacheRecord<Payload> | null> => {
    try {
      return (await store.read({ key })) ?? null
    } catch (error) {
      report(error, key, "read")

      return null
    }
  }

  return {
    get: async ({
      key,
      lifetime = defaultLifetime,
      missLifetime = defaultMissLifetime,
    }) => {
      const record =
        lifetime === "none" ? null : await load(key)

      const decision = resolveCacheDecision({
        lifetime,
        missLifetime,
        now: now(),
        record,
      })

      if (decision.action === "use") {
        return {
          fetchedAt: decision.record.fetchedAt,
          isMiss: decision.record.isMiss === true,
          isStale: false,
          payload: decision.record.payload,
          source: "stored",
        }
      }

      if (
        isStaleWhileRevalidate &&
        decision.action === "revalidate"
      ) {
        // Nothing awaits this: the refresh exists so the NEXT
        // read is current, and this read must not wait on
        // somebody else's server.
        void refreshOnce({
          key,
          lifetime,
          missLifetime,
          record: decision.record,
        }).catch(() => undefined)

        return {
          fetchedAt: decision.record.fetchedAt,
          isMiss: decision.record.isMiss === true,
          isStale: true,
          payload: decision.record.payload,
          source: "stored",
        }
      }

      return await refreshOnce({
        key,
        lifetime,
        missLifetime,
        record: decision.record,
      })
    },

    getInFlightCount: () => inFlightByKey.size,
  }
}
