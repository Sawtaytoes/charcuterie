/**
 * `@charcuterie/server/http` — outbound HTTP cache policy and
 * politeness, over a store the caller owns.
 *
 * Zero dependencies and no `fetch` of its own, so it runs
 * anywhere the app already runs. Its own subpath because it
 * shares nothing with the static handler in the main barrel —
 * and because `../cachePolicy.ts` there is about the
 * `Cache-Control` header we SEND, which is the opposite
 * direction and would be confusing beside these names.
 */

export {
  type CacheResult,
  type CacheSource,
  type CacheStore,
  createHttpCache,
  type HttpCache,
  type HttpCacheOptions,
  type OriginResponse,
  type StoredRecord,
} from "./createHttpCache.ts"
export {
  createThrottle,
  type Throttle,
  type ThrottleOptions,
} from "./createThrottle.ts"
export {
  type CacheDecision,
  type CacheLifetime,
  type CacheRecord,
  getIsFresh,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_MINUTE_MS,
  ONE_WEEK_MS,
  resolveCacheDecision,
  resolveExpiresAt,
  type StoredLifetime,
  type Timestamp,
  toEpochMs,
} from "./lifetime.ts"
