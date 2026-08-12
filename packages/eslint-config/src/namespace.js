/**
 * The one plugin namespace this package registers.
 *
 * It lives in its own module because two rule modules
 * (`componentChoice.js`, `flexOverflow.js`) both need it and both
 * are composed into a **single** plugin object by `plugin.js`.
 * ESLint's flat config throws `Cannot redefine plugin` when two
 * config blocks register the same namespace with two *different*
 * objects, so the composition has to happen in one place and the
 * rule modules must not import each other to get there.
 */
export const CHARCUTERIE_NAMESPACE = "charcuterie"
