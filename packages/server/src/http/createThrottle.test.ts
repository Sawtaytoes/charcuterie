import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import { createThrottle } from "./createThrottle.ts"

/** Let every already-resolved promise settle. */
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
}

describe("createThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("runs a task straight through when nothing is configured", async () => {
    await expect(
      createThrottle().run(async () => "done"),
    ).resolves.toBe("done")
  })

  test("spaces starts by minIntervalMs", async () => {
    const throttle = createThrottle({
      minIntervalMs: 1_000,
    })

    const startedAt: number[] = []

    const record = async (): Promise<void> => {
      startedAt.push(Date.now())
    }

    void throttle.run(record)
    void throttle.run(record)
    void throttle.run(record)

    await vi.advanceTimersByTimeAsync(2_500)

    expect(startedAt).toEqual([0, 1_000, 2_000])
  })

  test("spaces CONCURRENT callers too — the bug a bare timestamp check has", async () => {
    // Several callers reading one stale `lastStartedAt` before any
    // of them writes it is how a published cap gets passed. The
    // slot is claimed before the task starts, so this cannot
    // happen.
    const throttle = createThrottle({
      minIntervalMs: 2_500,
    })

    const startedAt: number[] = []

    await Promise.all([
      throttle.run(async () => {
        startedAt.push(Date.now())
      }),
      throttle.run(async () => {
        startedAt.push(Date.now())
      }),
      vi.advanceTimersByTimeAsync(5_000),
    ])

    expect(startedAt).toEqual([0, 2_500])
  })

  test("holds maxConcurrent tasks in flight and no more", async () => {
    const throttle = createThrottle({ maxConcurrent: 3 })

    let inFlightCount = 0
    let peakCount = 0

    const tasks = Array.from({ length: 9 }, () =>
      throttle.run(async () => {
        inFlightCount += 1
        peakCount = Math.max(peakCount, inFlightCount)

        await new Promise((resolve) => {
          setTimeout(resolve, 10)
        })

        inFlightCount -= 1
      }),
    )

    await vi.advanceTimersByTimeAsync(100)
    await Promise.all(tasks)

    expect(peakCount).toBe(3)
  })

  test("spends a window budget and then waits for it to refill", async () => {
    const throttle = createThrottle({
      maxPerWindow: 3,
      windowMs: 1_000,
    })

    const startedAt: number[] = []

    for (let index = 0; index < 5; index += 1) {
      void throttle.run(async () => {
        startedAt.push(Date.now())
      })
    }

    await vi.advanceTimersByTimeAsync(0)

    // Three at once is exactly what a budget permits and a
    // minimum interval does not.
    expect(startedAt).toEqual([0, 0, 0])

    await vi.advanceTimersByTimeAsync(1_000)

    expect(startedAt).toEqual([0, 0, 0, 1_000, 1_000])
  })

  test("stops everything for the cooldown, then carries on", async () => {
    const throttle = createThrottle({
      cooldownMs: 300_000,
    })

    throttle.startCooldown()

    expect(throttle.getIsCoolingDown()).toBe(true)
    expect(throttle.getResumesAt()).toBe(300_000)

    let hasRun = false

    void throttle.run(async () => {
      hasRun = true
    })

    await vi.advanceTimersByTimeAsync(299_000)

    expect(hasRun).toBe(false)

    await vi.advanceTimersByTimeAsync(2_000)

    expect(hasRun).toBe(true)
    expect(throttle.getIsCoolingDown()).toBe(false)
  })

  test("never shortens a cooldown already running", () => {
    const throttle = createThrottle()

    throttle.startCooldown({ durationMs: 300_000 })
    throttle.startCooldown({ durationMs: 1_000 })

    expect(throttle.getResumesAt()).toBe(300_000)
  })

  test("releases a cooldown early when the origin answers after all", async () => {
    const throttle = createThrottle({
      cooldownMs: 300_000,
    })

    throttle.startCooldown()

    let hasRun = false

    void throttle.run(async () => {
      hasRun = true
    })

    await flush()

    expect(hasRun).toBe(false)

    throttle.clearCooldown()

    await flush()

    expect(hasRun).toBe(true)
  })

  test("tryRun gives up instead of queueing — rip-deck's poll loop", async () => {
    const throttle = createThrottle({ maxConcurrent: 2 })

    const hold = async (): Promise<void> => {
      await new Promise((resolve) => {
        setTimeout(resolve, 50)
      })
    }

    expect(throttle.tryRun(hold)).not.toBeNull()
    expect(throttle.tryRun(hold)).not.toBeNull()
    expect(throttle.tryRun(hold)).toBeNull()
    expect(throttle.getPendingCount()).toBe(0)

    await vi.advanceTimersByTimeAsync(60)

    expect(throttle.tryRun(hold)).not.toBeNull()
  })

  test("tryRun refuses while a run caller is queued, so waiting work is never starved", async () => {
    const throttle = createThrottle({
      minIntervalMs: 1_000,
    })

    void throttle.run(async () => undefined)
    void throttle.run(async () => undefined)

    await flush()

    expect(throttle.getPendingCount()).toBe(1)
    expect(throttle.tryRun(async () => "jumped")).toBeNull()
  })

  test("tryRun refuses during a cooldown", () => {
    const throttle = createThrottle()

    throttle.startCooldown({ durationMs: 1_000 })

    expect(throttle.tryRun(async () => 1)).toBeNull()
  })

  test("frees the slot when a task throws", async () => {
    const throttle = createThrottle({ maxConcurrent: 1 })

    await expect(
      throttle.run(async () => {
        throw new Error("origin exploded")
      }),
    ).rejects.toThrow("origin exploded")

    await expect(
      throttle.run(async () => "next"),
    ).resolves.toBe("next")
  })
})
