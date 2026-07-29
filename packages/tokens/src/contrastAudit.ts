/**
 * Which pairs get checked, and against what.
 *
 * The audit is enumerated here rather than inside the test so the
 * M0 preview generator and CI ask the *same* question. A board
 * that prints numbers CI doesn't gate on is decoration.
 *
 * Thresholds come from WCAG 2.2:
 *
 *  - **1.4.3 Contrast (Minimum)** — 4.5:1 for normal-size text.
 *  - **1.4.11 Non-text Contrast** — 3:1 for UI component
 *    boundaries and focus indicators.
 *  - Both explicitly **exempt disabled/inactive controls**, so
 *    `content.disabled` is reported but never gated. Gating it
 *    would force disabled text to look enabled, which is worse
 *    for everyone than the exemption.
 */

import type { ContrastResult } from "./contrast.ts"
import { getContrast } from "./contrast.ts"
import type {
  Density,
  IntentName,
  Scheme,
  SchemeColours,
} from "./types.ts"

export const INTENT_NAMES: IntentName[] = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
]

export type ContrastCheck = {
  label: string
  foreground: string
  background: string
  /** WCAG minimum this pair must clear. */
  threshold: number
  /** Reported but never gated (WCAG exempts these). */
  isExempt: boolean
  /** Why it is exempt. Printed on the board next to the number. */
  exemptReason: string
  result: ContrastResult
}

const check = ({
  background,
  exemptReason = "",
  foreground,
  label,
  threshold,
}: {
  background: string
  exemptReason?: string
  foreground: string
  label: string
  threshold: number
}): ContrastCheck => ({
  label,
  foreground,
  background,
  threshold,
  isExempt: exemptReason !== "",
  exemptReason,
  result: getContrast(foreground, background),
})

export const auditScheme = (
  colour: SchemeColours,
): ContrastCheck[] => [
  // --- Text on surfaces -------------------------------------
  ...(["base", "raised", "overlay"] as const).flatMap(
    (surfaceRole) =>
      (["primary", "secondary", "muted"] as const).map(
        (contentRole) =>
          check({
            label: `content.${contentRole} on surface.${surfaceRole}`,
            foreground: colour.content[contentRole],
            background: colour.surface[surfaceRole],
            threshold: 4.5,
          }),
      ),
  ),

  check({
    label: "content.disabled on surface.base",
    foreground: colour.content.disabled,
    background: colour.surface.base,
    threshold: 4.5,
    exemptReason:
      "WCAG 1.4.3 exempts inactive controls; gating this would force disabled text to look enabled",
  }),

  // --- Intents: tinted pill, and solid fill -----------------
  ...INTENT_NAMES.flatMap((intent) => [
    check({
      label: `intent.${intent}.content on intent.${intent}.surface`,
      foreground: colour.intent[intent].content,
      background: colour.intent[intent].surface,
      threshold: 4.5,
    }),
    check({
      label: `intent.${intent}.onSolid on intent.${intent}.solid`,
      foreground: colour.intent[intent].onSolid,
      background: colour.intent[intent].solid,
      threshold: 4.5,
    }),
    check({
      label: `intent.${intent}.border on surface.raised`,
      foreground: colour.intent[intent].border,
      background: colour.surface.raised,
      threshold: 3,
      exemptReason:
        "a badge outline is decorative — the meaning is carried by its text, which is gated at 4.5:1",
    }),
  ]),

  // --- Non-text: boundaries and the focus ring --------------
  //
  // 1.4.11 applies to boundaries *required to identify a
  // control*, not to every line drawn on screen. Separating the
  // two is what keeps this gate honest: gate it everywhere and it
  // fires on decoration until somebody switches it off.
  check({
    label: "border.subtle on surface.base",
    foreground: colour.border.subtle,
    background: colour.surface.base,
    threshold: 3,
    exemptReason:
      "decorative hairline — identifies nothing on its own",
  }),
  check({
    label: "border.default on surface.base",
    foreground: colour.border.default,
    background: colour.surface.base,
    threshold: 3,
    exemptReason:
      "structural separator between rows/panels, not a control boundary",
  }),
  // This one is not exempt: `border.strong` is the role a text
  // input, checkbox, and switch track draw themselves with, and
  // that is precisely what 1.4.11 exists for.
  check({
    label: "border.strong on surface.raised",
    foreground: colour.border.strong,
    background: colour.surface.raised,
    threshold: 3,
  }),
  check({
    label: "border.strong on surface.base",
    foreground: colour.border.strong,
    background: colour.surface.base,
    threshold: 3,
  }),
  check({
    label: "focus.ring on surface.base",
    foreground: colour.focus.ring,
    background: colour.surface.base,
    threshold: 3,
  }),
  check({
    label: "focus.ring on surface.raised",
    foreground: colour.focus.ring,
    background: colour.surface.raised,
    threshold: 3,
  }),

  // `content.onAccent` is the plan's name for text on the accent
  // fill. Asserting it against `intent.accent.onSolid` is what
  // stops the two drifting apart once someone edits one of them.
  check({
    label: "content.onAccent on intent.accent.solid",
    foreground: colour.content.onAccent,
    background: colour.intent.accent.solid,
    threshold: 4.5,
  }),
]

/**
 * Two roles in the plan's tier-2 list are aliases of another role
 * rather than independent values:
 *
 *  - `content.onAccent` is text on the accent fill, which is what
 *    `intent.accent.onSolid` already is.
 *  - `border.focus` is the focus indicator, which is what
 *    `focus.ring` already is.
 *
 * Keeping both names is worth it — they read correctly at their
 * call sites — but two names for one value is a drift bug waiting
 * to happen the first time somebody tunes one of them. So the
 * equality is asserted rather than trusted.
 */
export const getAliasDrift = (
  colour: SchemeColours,
): string[] => [
  ...(colour.content.onAccent ===
  colour.intent.accent.onSolid
    ? []
    : [
        `content.onAccent (${colour.content.onAccent}) !== intent.accent.onSolid (${colour.intent.accent.onSolid})`,
      ]),
  ...(colour.border.focus === colour.focus.ring
    ? []
    : [
        `border.focus (${colour.border.focus}) !== focus.ring (${colour.focus.ring})`,
      ]),
]

export const getFailures = (checks: ContrastCheck[]) =>
  checks.filter(
    (entry) =>
      !entry.isExempt &&
      entry.result.ratio < entry.threshold,
  )

export type SchemeAudit = {
  variant: string
  scheme: Scheme
  checks: ContrastCheck[]
}

/**
 * Density does not change colour, so the contrast matrix is
 * (variant × scheme) rather than (variant × scheme × density).
 * Density is still enumerated by the *board*, because it changes
 * text size — and 4.5:1 vs 3:1 turns on size.
 */
export const DENSITIES: Density[] = [
  "comfortable",
  "compact",
  "kiosk",
]
