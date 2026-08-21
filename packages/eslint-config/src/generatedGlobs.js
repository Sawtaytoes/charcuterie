/**
 * The canonical globs for generated API schemas — the
 * `openapi-typescript` output a `@charcuterie/logic/query`
 * consumer commits to the repo.
 *
 * Its own module rather than a `const` in `index.js` because
 * `appConfig.js` needs it **at module-evaluation time** (it goes
 * into `APP_IGNORES`) while also being re-exported *from*
 * `index.js`. That cycle is fine for the rule factories, which
 * `createAppConfig` only calls later — but a value read at the top
 * level would be in the temporal dead zone and throw. Splitting
 * the constant out is the fix that does not depend on anyone
 * noticing the ordering.
 *
 * `.gen.ts` for a single generated module (`api.gen.ts`) and
 * `__generated__/` for a directory of them.
 */
export const GENERATED_SCHEMA_GLOBS = [
  "**/*.gen.ts",
  "**/*.gen.tsx",
  "**/__generated__/**",
]

/**
 * Generated schemas are committed but never linted — hand rules
 * have no say over machine output, and type-aware linting a
 * 10k-line `paths` type is pure cost. Spread this into a
 * consumer's flat config so the type-aware pass skips them:
 *
 * ```js
 * export default defineConfig(createGeneratedIgnores(), ...rest)
 * ```
 */
export const createGeneratedIgnores = ({
  ignores = GENERATED_SCHEMA_GLOBS,
} = {}) => ({
  ignores,
})
