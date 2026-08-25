import { describe, expect, test, vi } from "vitest"

import {
  type CacheStore,
  createHttpCache,
  type OriginResponse,
  type StoredRecord,
} from "./createHttpCache.ts"
import { createThrottle } from "./createThrottle.ts"
import {
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_WEEK_MS,
} from "./lifetime.ts"

const NOW = Date.parse("2026-08-25T12:00:00.000Z")

/** A memory substrate, standing in for any of the five real ones. */
const createMemoryStore = <
  Payload,
>(): CacheStore<Payload> & {
  readonly rows: Map<string, StoredRecord<Payload>>
} => {
  const rows = new Map<string, StoredRecord<Payload>>()

  return {
    read: ({ key }) => rows.get(key) ?? null,
    rows,
    write: ({ key, record }) => {
      rows.set(key, record)
    },
  }
}

describe("createHttpCache", () => {
  test("fetches on a miss and stores the answer with its etag", async () => {
    const store = createMemoryStore<string>()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        etag: 'W/"1"',
        outcome: "payload",
        payload: "body",
      }),
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      store,
    })

    await expect(cache.get({ key: "/a" })).resolves.toEqual(
      {
        fetchedAt: NOW,
        isMiss: false,
        isStale: false,
        payload: "body",
        source: "origin",
      },
    )

    expect(store.rows.get("/a")).toEqual({
      etag: 'W/"1"',
      expiresAt: NOW + ONE_HOUR_MS,
      fetchedAt: NOW,
      isMiss: false,
      payload: "body",
    })
  })

  test("serves a fresh answer WITHOUT a request — the only saving that counts", async () => {
    const store = createMemoryStore<string>()

    const fetchFromOrigin = vi.fn(
      async (): Promise<OriginResponse<string>> => ({
        outcome: "payload",
        payload: "body",
      }),
    )

    const cache = createHttpCache<string>({
      fetchFromOrigin,
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      store,
    })

    await cache.get({ key: "/a" })
    const second = await cache.get({ key: "/a" })

    expect(fetchFromOrigin).toHaveBeenCalledTimes(1)
    expect(second.source).toBe("stored")
    expect(second.isStale).toBe(false)
  })

  test("replays the etag and keeps the stored body on a 304", async () => {
    const store = createMemoryStore<string>()

    let nowMs = NOW

    const fetchFromOrigin = vi.fn(
      async ({
        etag,
      }: {
        etag: string | null
      }): Promise<OriginResponse<string>> =>
        etag == null
          ? {
              etag: 'W/"1"',
              outcome: "payload",
              payload: "body",
            }
          : { outcome: "unchanged" },
    )

    const cache = createHttpCache<string>({
      fetchFromOrigin,
      lifetime: ONE_HOUR_MS,
      now: () => nowMs,
      store,
    })

    await cache.get({ key: "/a" })

    nowMs = NOW + ONE_DAY_MS

    const revalidated = await cache.get({ key: "/a" })

    expect(fetchFromOrigin).toHaveBeenLastCalledWith({
      etag: 'W/"1"',
      key: "/a",
    })

    expect(revalidated).toEqual({
      fetchedAt: nowMs,
      isMiss: false,
      isStale: false,
      payload: "body",
      source: "unchanged",
    })

    // The lifetime restarts from the 304, so the next read is
    // served from the store.
    expect(store.rows.get("/a")?.expiresAt).toBe(
      nowMs + ONE_HOUR_MS,
    )
  })

  test("never expires an immutable answer", async () => {
    const store = createMemoryStore<string>()

    const fetchFromOrigin = vi.fn(
      async (): Promise<OriginResponse<string>> => ({
        outcome: "payload",
        payload: "bytes at a commit hash",
      }),
    )

    let nowMs = NOW

    const cache = createHttpCache<string>({
      fetchFromOrigin,
      lifetime: "immutable",
      now: () => nowMs,
      store,
    })

    await cache.get({ key: "/blob/abc" })

    nowMs = NOW + ONE_WEEK_MS * 520

    const later = await cache.get({ key: "/blob/abc" })

    expect(fetchFromOrigin).toHaveBeenCalledTimes(1)
    expect(later.source).toBe("stored")
  })

  test("does not read or write when the lifetime is none", async () => {
    const store = createMemoryStore<string>()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        outcome: "payload",
        payload: "body",
      }),
      lifetime: "none",
      now: () => NOW,
      store,
    })

    await cache.get({ key: "/a" })
    await cache.get({ key: "/a" })

    expect(store.rows.size).toBe(0)
  })

  test("remembers a miss for missLifetime — rip-deck's negative cache", async () => {
    const store = createMemoryStore<string>()

    const fetchFromOrigin = vi.fn(
      async (): Promise<OriginResponse<string>> => ({
        outcome: "missing",
      }),
    )

    let nowMs = NOW

    const cache = createHttpCache<string>({
      fetchFromOrigin,
      lifetime: "immutable",
      missLifetime: ONE_WEEK_MS,
      now: () => nowMs,
      store,
    })

    const first = await cache.get({ key: "TROY BONUS" })

    expect(first).toEqual({
      fetchedAt: NOW,
      isMiss: true,
      isStale: false,
      payload: null,
      source: "origin",
    })

    nowMs = NOW + ONE_DAY_MS

    const second = await cache.get({ key: "TROY BONUS" })

    expect(fetchFromOrigin).toHaveBeenCalledTimes(1)
    expect(second.isMiss).toBe(true)
    expect(second.source).toBe("stored")

    // Bounded the other way: the normaliser will grow, so a label
    // it cannot parse today may parse next month.
    nowMs = NOW + ONE_WEEK_MS + 1

    await cache.get({ key: "TROY BONUS" })

    expect(fetchFromOrigin).toHaveBeenCalledTimes(2)
  })

  test("does not remember a miss by default", async () => {
    const store = createMemoryStore<string>()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        outcome: "missing",
      }),
      lifetime: "immutable",
      now: () => NOW,
      store,
    })

    await cache.get({ key: "/gone" })

    expect(store.rows.size).toBe(0)
  })

  test("returns a stale body at once and refreshes behind it", async () => {
    const store = createMemoryStore<string>()

    let nowMs = NOW
    let originBody = "first"

    const fetchFromOrigin = vi.fn(
      async (): Promise<OriginResponse<string>> => ({
        outcome: "payload",
        payload: originBody,
      }),
    )

    const cache = createHttpCache<string>({
      fetchFromOrigin,
      isStaleWhileRevalidate: true,
      lifetime: 5 * 60_000,
      now: () => nowMs,
      store,
    })

    await cache.get({ key: "/sections" })

    nowMs = NOW + ONE_HOUR_MS
    originBody = "second"

    const stale = await cache.get({ key: "/sections" })

    expect(stale).toEqual({
      fetchedAt: NOW,
      isMiss: false,
      isStale: true,
      payload: "first",
      source: "stored",
    })

    // The refresh landed behind the answer that was already given.
    await vi.waitFor(() => {
      expect(store.rows.get("/sections")?.payload).toBe(
        "second",
      )
    })
  })

  test("serves the stale body when the origin cannot be reached, and says so", async () => {
    const store = createMemoryStore<string>()

    let nowMs = NOW
    let isOriginUp = true

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () =>
        isOriginUp
          ? {
              outcome: "payload",
              payload: "body",
            }
          : { outcome: "unavailable" },
      lifetime: ONE_HOUR_MS,
      now: () => nowMs,
      store,
    })

    await cache.get({ key: "/a" })

    nowMs = NOW + ONE_DAY_MS
    isOriginUp = false

    expect(await cache.get({ key: "/a" })).toEqual({
      fetchedAt: NOW,
      isMiss: false,
      isStale: true,
      payload: "body",
      source: "stored",
    })

    // An unreachable minute is never written down. Caching it is
    // how a week goes by with no answers.
    expect(store.rows.get("/a")?.payload).toBe("body")
    expect(store.rows.get("/a")?.fetchedAt).toBe(NOW)
  })

  test("starts the throttle's cooldown when the origin is unavailable", async () => {
    const throttle = createThrottle({ now: () => NOW })

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        outcome: "unavailable",
      }),
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      store: createMemoryStore<string>(),
      throttle,
      unavailableCooldownMs: 300_000,
    })

    expect(await cache.get({ key: "/a" })).toEqual({
      fetchedAt: null,
      isMiss: false,
      isStale: false,
      payload: null,
      source: "none",
    })

    expect(throttle.getIsCoolingDown()).toBe(true)
    expect(throttle.getResumesAt()).toBe(NOW + 300_000)
  })

  test("treats a throw as unavailable, and reports it rather than hiding it", async () => {
    const onError = vi.fn()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => {
        throw new Error("ECONNREFUSED")
      },
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      onError,
      store: createMemoryStore<string>(),
    })

    expect((await cache.get({ key: "/a" })).source).toBe(
      "none",
    )

    expect(onError).toHaveBeenCalledWith({
      error: expect.any(Error),
      key: "/a",
      phase: "origin",
    })
  })

  test("degrades to a miss when the store cannot be read", async () => {
    const onError = vi.fn()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        outcome: "payload",
        payload: "body",
      }),
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      onError,
      store: {
        read: () => {
          throw new Error("no such table")
        },
        write: () => undefined,
      },
    })

    expect((await cache.get({ key: "/a" })).payload).toBe(
      "body",
    )

    expect(onError).toHaveBeenCalledWith({
      error: expect.any(Error),
      key: "/a",
      phase: "read",
    })
  })

  test("keeps the answer when the store cannot be written", async () => {
    const onError = vi.fn()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        outcome: "payload",
        payload: "body",
      }),
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      onError,
      store: {
        read: () => null,
        write: () => {
          throw new Error("read-only mount")
        },
      },
    })

    expect((await cache.get({ key: "/a" })).payload).toBe(
      "body",
    )

    expect(onError).toHaveBeenCalledWith({
      error: expect.any(Error),
      key: "/a",
      phase: "write",
    })
  })

  test("collapses concurrent reads of one key into a single request", async () => {
    const fetchFromOrigin = vi.fn(
      async (): Promise<OriginResponse<string>> => {
        await Promise.resolve()

        return { outcome: "payload", payload: "body" }
      },
    )

    const cache = createHttpCache<string>({
      fetchFromOrigin,
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      store: createMemoryStore<string>(),
    })

    const results = await Promise.all([
      cache.get({ key: "/a" }),
      cache.get({ key: "/a" }),
      cache.get({ key: "/a" }),
    ])

    expect(fetchFromOrigin).toHaveBeenCalledTimes(1)
    expect(results.map((result) => result.payload)).toEqual(
      ["body", "body", "body"],
    )
    expect(cache.getInFlightCount()).toBe(0)
  })

  test("takes a per-call lifetime, because only the call site knows how fast its answer moves", async () => {
    const store = createMemoryStore<string>()

    const cache = createHttpCache<string>({
      fetchFromOrigin: async () => ({
        outcome: "payload",
        payload: "body",
      }),
      lifetime: ONE_HOUR_MS,
      now: () => NOW,
      store,
    })

    await cache.get({ key: "/a", lifetime: "immutable" })

    expect(store.rows.get("/a")?.expiresAt).toBeNull()
  })

  test("runs its requests through the throttle", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    try {
      const startedAt: number[] = []

      const cache = createHttpCache<string>({
        fetchFromOrigin: async () => {
          startedAt.push(Date.now())

          return { outcome: "payload", payload: "body" }
        },
        lifetime: "none",
        store: createMemoryStore<string>(),
        throttle: createThrottle({
          minIntervalMs: 2_500,
        }),
      })

      void cache.get({ key: "/a" })
      void cache.get({ key: "/b" })

      await vi.advanceTimersByTimeAsync(5_000)

      expect(startedAt).toEqual([0, 2_500])
    } finally {
      vi.useRealTimers()
    }
  })
})
