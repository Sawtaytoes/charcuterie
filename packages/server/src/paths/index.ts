/**
 * `@charcuterie/server/paths` — the static handler's path rules,
 * with no framework behind them.
 *
 * `createStaticHandler` is Hono middleware, and the package's main
 * entry loads `@hono/node-server`. A server built on plain
 * `node:http` still wants the same answer to "does this miss get
 * the shell?", so this entry exports the rules alone. It imports
 * nothing but this package's own pure modules, and a test keeps it
 * that way.
 */

export {
  DEFAULT_IMMUTABLE_PATH_PREFIXES,
  getIsImmutablePath,
  IMMUTABLE_CACHE_CONTROL,
  REVALIDATE_CACHE_CONTROL,
  resolveCacheControl,
} from "../cachePolicy.ts"
export {
  getIsServerPath,
  getIsShellPath,
} from "./shellPath.ts"
