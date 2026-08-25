import { describe, expect, test } from "vitest"

import {
  getIsFresh,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_MINUTE_MS,
  ONE_WEEK_MS,
  resolveCacheDecision,
  resolveExpiresAt,
  toEpochMs,
} from "./lifetime.ts"

const NOW = Date.parse("2026-08-25T12:00:00.000Z")

describe("toEpochMs", () => {
  test("passes a number through", () => {
    expect(toEpochMs(NOW)).toBe(NOW)
  })

  test("parses an ISO string, which is what a SQLite text column holds", () => {
    expect(toEpochMs("2026-08-25T12:00:00.000Z")).toBe(NOW)
  })

  test("returns null for null and undefined", () => {
    expect(toEpochMs(null)).toBeNull()
    expect(toEpochMs(undefined)).toBeNull()
  })

  test("returns null for a hand-edited value, rather than NaN", () => {
    expect(toEpochMs("yesterday")).toBeNull()
  })
})

describe("durations", () => {
  test("are the named windows the fleet already uses", () => {
    expect(ONE_MINUTE_MS).toBe(60_000)
    expect(ONE_HOUR_MS).toBe(3_600_000)
    expect(ONE_DAY_MS).toBe(86_400_000)
    expect(ONE_WEEK_MS).toBe(604_800_000)
  })
})

describe("resolveExpiresAt", () => {
  test("adds the lifetime to the fetch time", () => {
    expect(
      resolveExpiresAt({
        fetchedAt: NOW,
        lifetime: ONE_HOUR_MS,
      }),
    ).toBe(NOW + ONE_HOUR_MS)
  })

  test("is null for immutable, which is the same null the row stores", () => {
    expect(
      resolveExpiresAt({
        fetchedAt: NOW,
        lifetime: "immutable",
      }),
    ).toBeNull()
  })

  test("reads an ISO fetchedAt", () => {
    expect(
      resolveExpiresAt({
        fetchedAt: "2026-08-25T12:00:00.000Z",
        lifetime: ONE_DAY_MS,
      }),
    ).toBe(NOW + ONE_DAY_MS)
  })
})

describe("getIsFresh", () => {
  test("treats a null expiry as immutable", () => {
    expect(getIsFresh({ expiresAt: null, now: NOW })).toBe(
      true,
    )
  })

  test("is fresh up to the expiry and stale after it", () => {
    expect(
      getIsFresh({ expiresAt: NOW + 1, now: NOW }),
    ).toBe(true)

    expect(getIsFresh({ expiresAt: NOW, now: NOW })).toBe(
      false,
    )
  })

  test("counts an unreadable expiry as stale, never as permanent", () => {
    expect(
      getIsFresh({ expiresAt: "whenever", now: NOW }),
    ).toBe(false)
  })
})

describe("resolveCacheDecision", () => {
  const record = {
    etag: 'W/"abc"',
    expiresAt: NOW + ONE_HOUR_MS,
    fetchedAt: NOW,
    payload: "body",
  }

  test("fetches when nothing is stored", () => {
    expect(
      resolveCacheDecision({
        lifetime: ONE_HOUR_MS,
        now: NOW,
        record: null,
      }),
    ).toEqual({
      action: "fetch",
      etag: null,
      record: null,
    })
  })

  test("uses a fresh record, which is the only outcome that saves budget", () => {
    const decision = resolveCacheDecision({
      lifetime: ONE_HOUR_MS,
      now: NOW,
      record,
    })

    expect(decision.action).toBe("use")
    expect(decision.record).toBe(record)
  })

  test("revalidates a stale record, carrying its etag", () => {
    const decision = resolveCacheDecision({
      lifetime: ONE_HOUR_MS,
      now: NOW + ONE_DAY_MS,
      record,
    })

    expect(decision.action).toBe("revalidate")
    expect(decision.etag).toBe('W/"abc"')
  })

  test("never expires an immutable record", () => {
    expect(
      resolveCacheDecision({
        lifetime: "immutable",
        now: NOW + ONE_WEEK_MS * 520,
        record: { ...record, expiresAt: null },
      }).action,
    ).toBe("use")
  })

  test("ignores the store entirely when the lifetime is none", () => {
    expect(
      resolveCacheDecision({
        lifetime: "none",
        now: NOW,
        record,
      }).action,
    ).toBe("fetch")
  })

  test("judges a cached miss against missLifetime, not lifetime", () => {
    const miss = {
      expiresAt: NOW + ONE_WEEK_MS,
      fetchedAt: NOW,
      isMiss: true,
      payload: null,
    }

    expect(
      resolveCacheDecision({
        lifetime: ONE_MINUTE_MS,
        missLifetime: ONE_WEEK_MS,
        now: NOW + ONE_DAY_MS,
        record: miss,
      }).action,
    ).toBe("use")
  })

  test("refetches a stale miss rather than revalidating it, because a miss has no body", () => {
    expect(
      resolveCacheDecision({
        lifetime: ONE_HOUR_MS,
        missLifetime: ONE_HOUR_MS,
        now: NOW + ONE_WEEK_MS,
        record: {
          etag: 'W/"abc"',
          expiresAt: NOW + ONE_HOUR_MS,
          fetchedAt: NOW,
          isMiss: true,
          payload: null,
        },
      }),
    ).toEqual({
      action: "fetch",
      etag: null,
      record: null,
    })
  })

  test("drops a cached miss when missLifetime is none", () => {
    expect(
      resolveCacheDecision({
        lifetime: "immutable",
        missLifetime: "none",
        now: NOW,
        record: {
          expiresAt: null,
          fetchedAt: NOW,
          isMiss: true,
          payload: null,
        },
      }).action,
    ).toBe("fetch")
  })
})
