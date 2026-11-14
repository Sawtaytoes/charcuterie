/**
 * `@charcuterie/server` — the fleet's Hono static-asset handler,
 * and the same-origin write guard and body limit every app's API
 * mounts in front of its routes.
 *
 * The build-time counterpart lives at `@charcuterie/server/vite`.
 * It imports nothing from Vite, so the package declares no Vite
 * dependency and a server's production install never installs it.
 *
 * The static handler's path rules alone live at
 * `@charcuterie/server/paths`, which loads no framework, for a
 * server that is not Hono.
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
export {
  createDeploymentHandler,
  DEFAULT_DEPLOYMENT_EVENTS_PATH,
  DEFAULT_DEPLOYMENT_PATH,
  type DeploymentHandlerOptions,
  type DeploymentInfo,
} from "./deployment.ts"
export {
  getIsServerPath,
  getIsShellPath,
} from "./paths/shellPath.ts"
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
