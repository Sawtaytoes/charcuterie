/**
 * `@charcuterie/server` — the fleet's Hono static-asset handler,
 * and the same-origin write guard and body limit every app's API
 * mounts in front of its routes.
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
  getIsServerPath,
  type StaticHandlerOptions,
} from "./createStaticHandler.ts"
export {
  createDeploymentHandler,
  DEFAULT_DEPLOYMENT_EVENTS_PATH,
  DEFAULT_DEPLOYMENT_PATH,
  type DeploymentHandlerOptions,
  type DeploymentInfo,
} from "./deployment.ts"
export {
  type BodyLimitOptions,
  createBodyLimit,
  createWriteGuard,
  getIsAllowedHost,
  judgeWriteRequest,
  parseHostList,
  type WriteGuardOptions,
  type WriteGuardVerdict,
} from "./writeGuard.ts"
