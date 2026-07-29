/**
 * The M0 gate.
 *
 * A visual direction that cannot clear WCAG 2.2 AA does not get to
 * win the bake-off, and finding that out from a script takes
 * seconds where finding it out from a built component library
 * takes a repaint of twenty components.
 *
 * Exits non-zero on any non-exempt failure, so it is already the
 * CI check it becomes at M1 — the only thing that changes then is
 * that Vitest wraps it.
 */

import {
  auditScheme,
  getAliasDrift,
  getFailures,
} from "../src/contrastAudit.ts"
import type { Scheme } from "../src/types.ts"
import { variants } from "../src/variants/index.ts"

const SCHEMES: Scheme[] = ["light", "dark"]

const formatLc = (lc: number) =>
  `${lc < 0 ? "" : "+"}${lc.toFixed(1)}`

let failureCount = 0

for (const variant of variants) {
  for (const scheme of SCHEMES) {
    const checks = auditScheme(variant.schemes[scheme])

    const failures = getFailures(checks)
    const drift = getAliasDrift(variant.schemes[scheme])

    failureCount += failures.length + drift.length

    const worst = checks
      .filter((entry) => !entry.isExempt)
      .reduce((lowest, entry) =>
        entry.result.ratio < lowest.result.ratio
          ? entry
          : lowest,
      )

    console.log(
      `\n${variant.name} / ${scheme} — ${checks.length} pairs, ${
        failures.length
      } failing`,
    )

    console.log(
      `  tightest passing margin: ${worst.label} ` +
        `${worst.result.ratio.toFixed(2)}:1 ` +
        `(needs ${worst.threshold}, APCA Lc ${formatLc(
          worst.result.lc,
        )})`,
    )

    for (const message of drift) {
      console.log(`  DRIFT ${message}`)
    }

    for (const failure of failures) {
      console.log(
        `  FAIL ${failure.label} — ` +
          `${failure.foreground} on ${failure.background} = ` +
          `${failure.result.ratio.toFixed(2)}:1, ` +
          `needs ${failure.threshold}:1 ` +
          `(APCA Lc ${formatLc(failure.result.lc)})`,
      )
    }
  }
}

console.log(
  `\n${
    failureCount === 0
      ? "All variants clear WCAG 2.2 AA."
      : `${failureCount} contrast failures.`
  }`,
)

process.exit(failureCount === 0 ? 0 : 1)
