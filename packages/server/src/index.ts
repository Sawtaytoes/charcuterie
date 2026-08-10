/**
 * `@charcuterie/server` — the fleet's Hono static-asset handler.
 *
 * The build-time counterpart lives at `@charcuterie/server/vite`,
 * kept behind its own entry point so a server never resolves Vite.
 */

export {
  DEFAULT_IMMUTABLE_PATH_PREFIXES,
  getIsImmutablePath,
  IMMUTABLE_CACHE_CONTROL,
  IMMUTABLE_MAX_AGE_SECONDS,
  REVALIDATE_CACHE_CONTROL,
  resolveCacheControl,
} from "./cachePolicy.ts"
export {
  createStaticHandler,
  type StaticHandlerOptions,
} from "./createStaticHandler.ts"
