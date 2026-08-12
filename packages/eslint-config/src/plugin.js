/**
 * The one plugin object this package registers, composed from the
 * rule modules.
 *
 * **Why one object and not one per rule family.** ESLint's flat
 * config throws `Cannot redefine plugin "charcuterie"` when two
 * config blocks register that namespace with two different
 * objects — and the two factories below are *designed* to be
 * enabled independently, in separate blocks, over different globs.
 * A consumer that turns on component choice for `packages/web` and
 * flex overflow for everything would hit that error on the first
 * `eslint .`. Composing here means both factories hand ESLint the
 * same reference, so the pairing simply works.
 *
 * The alternative — a second namespace like `charcuterie-layout` —
 * was rejected: the consumer would then have to remember which
 * prefix each rule takes when writing a disable comment, and a
 * wrong prefix in an `eslint-disable` is silently a no-op.
 */

import { COMPONENT_CHOICE_RULES } from "./componentChoice.js"
import { FLEX_OVERFLOW_RULES } from "./flexOverflow.js"

export { CHARCUTERIE_NAMESPACE } from "./namespace.js"

export const charcuteriePlugin = {
  meta: {
    /**
     * The **plugin object's** version, not the package's — the
     * same convention the 1.1.0 `componentChoicePlugin` used, and
     * the reason it read `1.0.0` while the package was `1.1.0`. A
     * package version copied in here is a string that silently
     * goes stale on the next release.
     */
    name: "@charcuterie/eslint-config",
    version: "1.0.0",
  },
  rules: {
    ...COMPONENT_CHOICE_RULES,
    ...FLEX_OVERFLOW_RULES,
  },
}

/**
 * The name this object shipped under in 1.1.0, kept as an alias so
 * a consumer that registered the plugin by hand does not break.
 * It is the **same reference**, which is the only thing that
 * matters to flat config's redefinition check.
 */
export const componentChoicePlugin = charcuteriePlugin
