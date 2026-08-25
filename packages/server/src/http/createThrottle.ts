/**
 * HOW OFTEN WE ARE ALLOWED TO ASK SOMEBODY ELSE'S SERVER.
 *
 * The politeness half of outbound HTTP. Four gates, and they are
 * four DIFFERENT things — the fleet has a live example of each,
 * and collapsing them into one "rate limit" number loses
 * information every time:
 *
 * | Gate | Means | In the fleet |
 * | --- | --- | --- |
 * | `minIntervalMs` | The minimum gap between two starts. | AniDB publishes 1 request per 2 s; mux-magic waits 2500 ms. board-game-picker waits 1000 ms for BGG. |
 * | `maxConcurrent` | How many may be in flight at once. | rip-deck allows 3 poster lookups. |
 * | `maxPerWindow` + `windowMs` | A budget that refills. | GitHub's anonymous 60 an hour, per source address. |
 * | `cooldownMs` | Everything stops after a failure. | rip-deck stops all lookups for 5 minutes when OMDb is unreachable. |
 *
 * A gap is not a budget: 1 request per second permits 3600 an
 * hour and a 60-an-hour budget permits three in the first second.
 * A concurrency cap is neither — it bounds sockets, not time.
 *
 * ## The queue is a queue, not a timestamp check
 *
 * The obvious implementation reads a `lastStartedAt` and sleeps
 * the difference. It is wrong under concurrency, and mux-magic
 * has the comment explaining why: several callers read the same
 * stale timestamp before any of them writes it, all compute
 * "no wait needed", and all fire in the same tick — straight past
 * a published cap, and AniDB bans for that. A slot here is
 * CLAIMED before the task starts, so N concurrent callers are
 * spaced exactly like N sequential ones.
 *
 * ## `run` waits. `tryRun` gives up.
 *
 * Both are needed and the difference is the caller's deadline.
 * `run` queues, which is what a CLI walking 900 board games
 * wants. `tryRun` returns null the moment a slot is not free,
 * which is what rip-deck wants: its `request` is called from a
 * five-second poll loop over nine bays, so a task that cannot
 * start now should be dropped and picked up by the next poll
 * rather than queued nine deep.
 */

export type ThrottleOptions = {
  /**
   * How long a `startCooldown` stops everything, by default.
   *
   * Zero means the caller must pass a duration each time.
   */
  cooldownMs?: number
  /** How many tasks may be in flight at once. */
  maxConcurrent?: number
  /**
   * How many tasks may START inside `windowMs`. Requires
   * `windowMs`; ignored without it.
   */
  maxPerWindow?: number
  /** The minimum gap between two starts. */
  minIntervalMs?: number
  /** Injected for tests. */
  now?: () => number
  /** Injected for tests. */
  setTimer?: (run: () => void, delayMs: number) => unknown
  /** The width of the `maxPerWindow` budget. */
  windowMs?: number
}

export type Throttle = {
  /** Cancel a cooldown early — the origin answered after all. */
  readonly clearCooldown: () => void
  /**
   * True while a `startCooldown` is in force. Every gate is shut,
   * `tryRun` returns null and `run` waits it out.
   */
  readonly getIsCoolingDown: () => boolean
  /** How many tasks are waiting for a slot. */
  readonly getPendingCount: () => number
  /**
   * When the current cooldown ends, epoch milliseconds. Null when
   * there is none.
   */
  readonly getResumesAt: () => number | null
  /** Run this task as soon as every gate allows, and not before. */
  readonly run: <Value>(
    task: () => Promise<Value>,
  ) => Promise<Value>
  /**
   * Stop everything for a while, because the origin is unhappy.
   *
   * A provider-wide circuit breaker rather than a per-key one:
   * when a host is unreachable or angry, the next key's request
   * will fail the same way, and finding that out costs the same
   * as the first one did.
   */
  readonly startCooldown: (input?: {
    durationMs?: number
  }) => void
  /**
   * Start this task only if a slot is free RIGHT NOW. Null when
   * one is not, and nothing is queued.
   */
  readonly tryRun: <Value>(
    task: () => Promise<Value>,
  ) => Promise<Value> | null
}

export const createThrottle = ({
  cooldownMs = 0,
  maxConcurrent = Number.POSITIVE_INFINITY,
  maxPerWindow,
  minIntervalMs = 0,
  now = () => Date.now(),
  setTimer = (run, delayMs) => setTimeout(run, delayMs),
  windowMs,
}: ThrottleOptions = {}): Throttle => {
  /** Start times inside the current window, oldest first. */
  const recentStartTimes: number[] = []

  /** Resolvers waiting for a slot, oldest first. */
  const waiting: (() => void)[] = []

  let inFlightCount = 0
  let lastStartedAtMs = Number.NEGATIVE_INFINITY
  let cooldownUntilMs: number | null = null
  let isTimerScheduled = false

  const hasWindowBudget =
    maxPerWindow != null &&
    maxPerWindow > 0 &&
    windowMs != null &&
    windowMs > 0

  const forgetOldStarts = (nowMs: number): void => {
    if (!hasWindowBudget) {
      // Nothing reads the list, so nothing should grow it.
      recentStartTimes.length = 0

      return
    }

    while (
      recentStartTimes.length > 0 &&
      // biome-ignore lint/style/noNonNullAssertion: the length check above proves the index exists.
      recentStartTimes[0]! <= nowMs - windowMs
    ) {
      recentStartTimes.shift()
    }
  }

  /**
   * How long until the TIME gates open. Zero when they are open.
   *
   * Concurrency is deliberately not counted here: it is released
   * by a task finishing, not by a clock, so a timer for it would
   * be a poll.
   */
  const getDelayMs = (): number => {
    const nowMs = now()

    forgetOldStarts(nowMs)

    const cooldownDelayMs =
      cooldownUntilMs == null ? 0 : cooldownUntilMs - nowMs

    const intervalDelayMs =
      minIntervalMs <= 0
        ? 0
        : lastStartedAtMs + minIntervalMs - nowMs

    const windowDelayMs =
      hasWindowBudget &&
      recentStartTimes.length >= maxPerWindow
        ? // biome-ignore lint/style/noNonNullAssertion: the length check above proves the index exists.
          recentStartTimes[
            recentStartTimes.length - maxPerWindow
          ]! +
          windowMs -
          nowMs
        : 0

    return Math.max(
      0,
      cooldownDelayMs,
      intervalDelayMs,
      windowDelayMs,
    )
  }

  const getHasFreeSlot = (): boolean =>
    inFlightCount < maxConcurrent && getDelayMs() === 0

  const claimSlot = (): void => {
    const nowMs = now()

    inFlightCount += 1
    lastStartedAtMs = nowMs

    if (hasWindowBudget) {
      recentStartTimes.push(nowMs)
    }
  }

  const pump = (): void => {
    while (waiting.length > 0 && getHasFreeSlot()) {
      const release = waiting.shift()

      claimSlot()
      release?.()
    }

    if (waiting.length === 0 || isTimerScheduled) {
      return
    }

    const delayMs = getDelayMs()

    if (delayMs === 0) {
      // Blocked on concurrency alone. `releaseSlot` pumps again
      // when a task finishes, so a timer here would only spin.
      return
    }

    isTimerScheduled = true

    setTimer(() => {
      isTimerScheduled = false
      pump()
    }, delayMs)
  }

  const releaseSlot = (): void => {
    inFlightCount -= 1
    pump()
  }

  const acquireSlot = (): Promise<void> =>
    new Promise<void>((resolve) => {
      waiting.push(resolve)
      pump()
    })

  return {
    clearCooldown: () => {
      cooldownUntilMs = null
      pump()
    },

    getIsCoolingDown: () =>
      cooldownUntilMs != null && cooldownUntilMs > now(),

    getPendingCount: () => waiting.length,

    getResumesAt: () =>
      cooldownUntilMs != null && cooldownUntilMs > now()
        ? cooldownUntilMs
        : null,

    run: async (task) => {
      await acquireSlot()

      try {
        return await task()
      } finally {
        releaseSlot()
      }
    },

    startCooldown: (input) => {
      const durationMs = input?.durationMs ?? cooldownMs

      if (durationMs <= 0) {
        return
      }

      const untilMs = now() + durationMs

      // Never shorten a cooldown already running. Two failures in
      // a row should not add up to less silence than one.
      cooldownUntilMs =
        cooldownUntilMs == null || untilMs > cooldownUntilMs
          ? untilMs
          : cooldownUntilMs
    },

    tryRun: (task) => {
      // A free slot with somebody already queued is not free —
      // taking it would let a `tryRun` caller jump a `run` caller
      // that has been waiting, and starve it.
      if (waiting.length > 0 || !getHasFreeSlot()) {
        return null
      }

      claimSlot()

      return (async () => {
        try {
          return await task()
        } finally {
          releaseSlot()
        }
      })()
    },
  }
}
