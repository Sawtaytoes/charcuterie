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
 *
 * **Interactive states are audited, not just resting ones.** A
 * pointer sitting on a button is a state the user reads text in,
 * so `solidHover` and `surfaceHover` are gated exactly as `solid`
 * and `surface` are. Auditing only the resting state let
 * `daylight`'s dark accent button ship at 4.47:1 while hovered
 * with the gate green for the library's whole life
 * ([decision](../../../docs/decisions/2026-08-10-interactive-states-are-audited-not-just-resting-states.md)).
 *
 * The state tokens are enumerated from `IntentRole`: today that is
 * `surfaceHover` and `solidHover` and nothing else. There is no
 * pressed/active/selected token — selection is drawn with the
 * resting `surface` tint, which the resting pairs already cover.
 * A new state role added to `IntentRole` must be paired here in
 * the same change; `contrast.test.ts` fails if one is not.
 */

import type { ContrastResult } from "./contrast.ts"
import { getContrast } from "./contrast.ts"
import type {
  Density,
  IntentName,
  IntentRole,
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

/**
 * Which intent roles are **states** of another role, and which are
 * resting values in their own right. `null` is "this one is a
 * resting value".
 *
 * Keyed by every member of `IntentRole` rather than listing only
 * the states, so adding a `solidPressed` to that type is a
 * typecheck error here until somebody classifies it — and once
 * classified, `contrast.test.ts` fails until `auditScheme` pairs
 * it with a foreground. Between them that is the thing that was
 * missing: `solidHover` existed for the library's whole life and
 * the gate never once looked at it.
 */
export const RESTING_ROLE_BY_INTENT_ROLE: Record<
  IntentRole,
  IntentRole | null
> = {
  border: null,
  content: null,
  onSolid: null,
  solid: null,
  solidHover: "solid",
  surface: null,
  surfaceHover: "surface",
}

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
  //
  // Each fill is checked in both the state it rests in and the
  // state a pointer puts it in. Same foreground, same threshold —
  // hovering does not make text optional.
  ...INTENT_NAMES.flatMap((intent) => [
    check({
      label: `intent.${intent}.content on intent.${intent}.surface`,
      foreground: colour.intent[intent].content,
      background: colour.intent[intent].surface,
      threshold: 4.5,
    }),
    check({
      label: `intent.${intent}.content on intent.${intent}.surfaceHover`,
      foreground: colour.intent[intent].content,
      background: colour.intent[intent].surfaceHover,
      threshold: 4.5,
    }),
    check({
      label: `intent.${intent}.onSolid on intent.${intent}.solid`,
      foreground: colour.intent[intent].onSolid,
      background: colour.intent[intent].solid,
      threshold: 4.5,
    }),
    check({
      label: `intent.${intent}.onSolid on intent.${intent}.solidHover`,
      foreground: colour.intent[intent].onSolid,
      background: colour.intent[intent].solidHover,
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
  check({
    label: "content.onAccent on intent.accent.solidHover",
    foreground: colour.content.onAccent,
    background: colour.intent.accent.solidHover,
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
