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
 *
 * **Every list of roles in this file is derived from its role
 * union, never typed out.** The interactive-state hole above was
 * one half of a single mistake; the other half was that the
 * surfaces block hand-listed its foregrounds and backgrounds. That
 * hid two more failures for the library's whole life: `content.*`
 * on the intent tints (the highlighted and selected option rows in
 * `Listbox`/`Combobox`/`Menu`), and `content.*` on `surface.sunken`,
 * which was simply never in the list. 48 gated pairs per scheme
 * becomes 63
 * ([decision](../../../docs/decisions/2026-08-10-content-muted-is-strengthened-so-the-highlighted-option-row-clears-aa.md)).
 */

import {
  CATEGORICAL_BORDER_THRESHOLD,
  CATEGORICAL_INDEXES,
} from "./categorical.ts"
import type { ContrastResult } from "./contrast.ts"
import { getContrast } from "./contrast.ts"
import type {
  ContentRole,
  Density,
  IntentName,
  IntentRole,
  Scheme,
  SchemeColours,
  SurfaceRole,
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

/**
 * How each **content** role takes part in the audit.
 *
 * Keyed by every member of `ContentRole` for the same reason
 * `RESTING_ROLE_BY_INTENT_ROLE` is keyed by every `IntentRole`:
 * the hole this closes was not a wrong number, it was a *class of
 * pair nobody had enumerated*. The foreground half had exactly the
 * same weakness — the surfaces block hand-listed
 * `["primary", "secondary", "muted"]`, so a new content role would
 * have been silently unmeasured, and `surface.sunken` was in fact
 * never audited at all because the background half was hand-listed
 * too.
 */
export type ContentRoleAudit =
  | { kind: "surfaces"; threshold: number }
  | { kind: "exemptSample"; exemptReason: string }
  | { kind: "accentFill" }

export const CONTENT_ROLE_AUDIT: Record<
  ContentRole,
  ContentRoleAudit
> = {
  primary: { kind: "surfaces", threshold: 4.5 },
  secondary: { kind: "surfaces", threshold: 4.5 },
  muted: { kind: "surfaces", threshold: 4.5 },
  disabled: {
    kind: "exemptSample",
    exemptReason:
      "WCAG 1.4.3 exempts inactive controls; gating this would force disabled text to look enabled",
  },
  // Not a surface foreground: it is the label on the accent *fill*,
  // and it is checked against `intent.accent.solid`/`solidHover`
  // near the bottom of `auditScheme`.
  onAccent: { kind: "accentFill" },
}

export const SURFACE_CONTENT_ROLES = (
  Object.keys(CONTENT_ROLE_AUDIT) as ContentRole[]
).filter(
  (role) => CONTENT_ROLE_AUDIT[role].kind === "surfaces",
)

/**
 * Which surfaces ordinary content is drawn on.
 *
 * `sunken` is `true` and was **not** in the old hand-written list —
 * it is a real content-bearing surface (inset wells, code blocks),
 * and it went unmeasured for the library's whole life for no reason
 * other than that somebody typed three role names instead of five.
 */
export const SURFACE_ROLE_CARRIES_CONTENT: Record<
  SurfaceRole,
  boolean
> = {
  base: true,
  raised: true,
  sunken: true,
  overlay: true,
  // `inverse` is deliberately the *opposite* scheme's surface — a
  // dark panel in a light scheme. This scheme's `content.*` roles
  // are precisely what must never be drawn on it (they measure
  // 1.0–2.9:1 against it by construction); anything placed there
  // uses the other scheme's content roles. Gating it would demand
  // a colour that is legible on both a near-black and a near-white
  // background, which does not exist.
  inverse: false,
}

/**
 * Which **intent tints** carry ordinary `content.*` text, as
 * opposed to their own `intent.<name>.content` foreground.
 *
 * This is the pair that this file could not see: `Listbox`,
 * `Combobox` and `Menu` paint `text-content-primary` on
 * `bg-intent-neutral-surface-hover` (the highlighted row) and on
 * `bg-intent-accent-surface` (the selected row), so the neutral and
 * accent tints are content-bearing surfaces in everything but name.
 * The audit only ever checked `intent.<name>.content` on them.
 *
 * The four status tints are `false` because they carry their own
 * intent foreground — the one `bg-intent-danger-surface` in the
 * package is paired with `text-intent-danger-content`, which is
 * already gated above. Gating grey body text on a danger tint would
 * constrain a pairing the system does not offer, and the borders
 * block below explains why gating what nothing draws is how a gate
 * stops being believed.
 */
export const INTENT_TINT_CARRIES_PLAIN_CONTENT: Record<
  IntentName,
  boolean
> = {
  neutral: true,
  accent: true,
  success: false,
  warning: false,
  danger: false,
  info: false,
}

/**
 * Which intent roles are **backgrounds a tint draws content on**.
 *
 * `solid`/`solidHover` are backgrounds too, but their foreground is
 * `onSolid` and they are already paired with it; the rest are
 * foregrounds. Keyed by the whole union so a future `surfacePressed`
 * cannot be added without saying which side of this it is on.
 */
export const INTENT_ROLE_IS_TINT_BACKGROUND: Record<
  IntentRole,
  boolean
> = {
  surface: true,
  surfaceHover: true,
  solid: false,
  solidHover: false,
  border: false,
  content: false,
  onSolid: false,
}

export const CONTENT_BEARING_SURFACE_ROLES = (
  Object.keys(SURFACE_ROLE_CARRIES_CONTENT) as SurfaceRole[]
).filter((role) => SURFACE_ROLE_CARRIES_CONTENT[role])

export const CONTENT_BEARING_INTENT_NAMES =
  INTENT_NAMES.filter(
    (intent) => INTENT_TINT_CARRIES_PLAIN_CONTENT[intent],
  )

export const TINT_BACKGROUND_INTENT_ROLES = (
  Object.keys(
    INTENT_ROLE_IS_TINT_BACKGROUND,
  ) as IntentRole[]
).filter((role) => INTENT_ROLE_IS_TINT_BACKGROUND[role])

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
  //
  // Both halves are derived from the role unions rather than typed
  // out, so a new content role or a new surface role is measured
  // the day it is added instead of the day somebody notices.
  ...CONTENT_BEARING_SURFACE_ROLES.flatMap((surfaceRole) =>
    SURFACE_CONTENT_ROLES.map((contentRole) => {
      const audit = CONTENT_ROLE_AUDIT[contentRole]

      return check({
        label: `content.${contentRole} on surface.${surfaceRole}`,
        foreground: colour.content[contentRole],
        background: colour.surface[surfaceRole],
        threshold:
          audit.kind === "surfaces" ? audit.threshold : 4.5,
      })
    }),
  ),

  // --- Text on the content-bearing intent tints -------------
  //
  // An option row in `Listbox`/`Combobox`/`Menu` is `content.*` on
  // `intent.neutral.surfaceHover` (highlighted) or
  // `intent.accent.surface` (selected). Those are content-bearing
  // surfaces that happen to be spelled as intent tints, and until
  // this block existed nothing measured them — `content.muted` on
  // the highlighted row failed AA in four of eight variant/scheme
  // combinations with the gate reporting green
  // ([decision](../../../docs/decisions/2026-08-10-content-muted-is-strengthened-so-the-highlighted-option-row-clears-aa.md)).
  //
  // Resting *and* hover, for the reason the block below the intents
  // gives: hovering does not make text optional.
  ...CONTENT_BEARING_INTENT_NAMES.flatMap((intent) =>
    TINT_BACKGROUND_INTENT_ROLES.flatMap((tintRole) =>
      SURFACE_CONTENT_ROLES.map((contentRole) => {
        const audit = CONTENT_ROLE_AUDIT[contentRole]

        return check({
          label: `content.${contentRole} on intent.${intent}.${tintRole}`,
          foreground: colour.content[contentRole],
          background: colour.intent[intent][tintRole],
          threshold:
            audit.kind === "surfaces"
              ? audit.threshold
              : 4.5,
        })
      }),
    ),
  ),

  // --- The categorical family --------------------------------
  //
  // Enrolled exactly as the intents are, pair for pair, because it
  // is the same seven roles doing the same jobs — and enrolled
  // *derived from `CATEGORICAL_INDEXES`* rather than typed out, for
  // the reason every other list in this file is derived: an
  // eleventh index has to be measured the day it is added, not the
  // day somebody notices.
  //
  // One deliberate difference, and it makes this family **stricter**
  // than `intent`: its `border` is not exempt. The intent exemption
  // reads "a badge outline is decorative — the meaning is carried by
  // its text", which is true of a pill that says `failed` and false
  // of one that says "Homelab". A categorical badge's whole
  // information content is which of ten it is, so its boundary is
  // doing the identification 1.4.11 is about
  // ([decision](../../../docs/decisions/2026-08-19-categorical-borders-are-gated-where-intent-borders-are-exempt.md)).
  ...CATEGORICAL_INDEXES.flatMap((index) => [
    check({
      label: `categorical.${index}.content on categorical.${index}.surface`,
      foreground: colour.categorical[index].content,
      background: colour.categorical[index].surface,
      threshold: 4.5,
    }),
    check({
      label: `categorical.${index}.content on categorical.${index}.surfaceHover`,
      foreground: colour.categorical[index].content,
      background: colour.categorical[index].surfaceHover,
      threshold: 4.5,
    }),
    check({
      label: `categorical.${index}.onSolid on categorical.${index}.solid`,
      foreground: colour.categorical[index].onSolid,
      background: colour.categorical[index].solid,
      threshold: 4.5,
    }),
    check({
      label: `categorical.${index}.onSolid on categorical.${index}.solidHover`,
      foreground: colour.categorical[index].onSolid,
      background: colour.categorical[index].solidHover,
      threshold: 4.5,
    }),
    check({
      label: `categorical.${index}.border on surface.raised`,
      foreground: colour.categorical[index].border,
      background: colour.surface.raised,
      threshold: CATEGORICAL_BORDER_THRESHOLD,
    }),
  ]),

  check({
    label: "content.disabled on surface.base",
    foreground: colour.content.disabled,
    background: colour.surface.base,
    threshold: 4.5,
    exemptReason:
      CONTENT_ROLE_AUDIT.disabled.kind === "exemptSample"
        ? CONTENT_ROLE_AUDIT.disabled.exemptReason
        : "",
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
