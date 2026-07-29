# `@charcuterie/tokens`

The design-token layer. **Zero dependencies, no React.**

`castkit/packages/views` renders to ePaper PNGs through Satori and needs colour and
spacing values without pulling in a React tree; `slatecast` has a 60 KB gz budget. Both
are why this is a separate package from `@charcuterie/ui`. React consumers never see two
names — they import `@charcuterie/ui/tokens`. It is a build-graph split, not an API split.

## Running it

Node 24 runs the TypeScript directly, so **nothing needs installing** to use any of this:

```bash
node scripts/checkContrast.ts   # the WCAG 2.2 AA gate — exits non-zero on failure
node scripts/buildTokens.ts     # → dist/variables.css, dist/theme.css, dist/tokens.json
node scripts/buildPreview.ts    # → preview/index.html, the M0 bake-off board
```

The repo root is still charcuterie v1's `package.json`; converting it to a Yarn 4
workspace root happens at M1, along with Vitest, Biome, and ESLint. Until then these
three commands are the whole build.

## The two tiers

**Tier 1** is raw ramps (`neutral.50…950`). A component may never reference one. They
exist so a variant author has something to build tier 2 out of.

**Tier 2** is semantic roles, and it is the only tier components may name:

| Group | Roles |
| --- | --- |
| `surface` | `base`, `raised`, `sunken`, `overlay`, `inverse` |
| `content` | `primary`, `secondary`, `muted`, `disabled`, `onAccent` |
| `border` | `subtle`, `default`, `strong`, `focus` |
| `intent` | `{neutral, accent, success, warning, danger, info}` × `{surface, surfaceHover, border, content, solid, solidHover, onSolid}` |
| `focus` | `ring`, `ringOffset`, and `focusRing.width` / `.offset` |

`intent` is the generalization of ripdeck's `TONE_CLASS` map — the one it currently
declares identically in both `VerdictBadge.tsx` and `TowerAlerts.tsx`.

### Why intents carry a *solid* as well as a *surface*

The plan named four intent roles. Building the specimen board surfaced a fifth need
immediately. `surface` is the **tinted** treatment the fleet already uses for status
pills (`bg-blue-950 text-blue-300`); a primary button is a **saturated fill** with its own
text colour. Deriving one from the other is exactly the guesswork this layer exists to
delete, so both are stated — and `onSolid` is stated too, because whether white or
near-black wins on a given fill genuinely varies per intent (in `layered`, white fails on
the coral accent and near-black passes at 5.4:1).

## The three axes, and the one profile

`data-scheme` (light | dark) · `data-density` (comfortable | compact | kiosk) ·
`data-variant` (the visual direction) — all three are `<html>` attributes and all three
compose. One attribute flip re-themes everything with **zero re-render**, because nothing
in React ever observes the change.

**ePaper is not a fourth axis.** It is a separate export (`@charcuterie/tokens/epaper`)
because it removes capabilities rather than restyling them: no hover, no opacity, no
shadow, no transition, and a fixed six-colour (or two-colour) palette. Modelling it as
`data-scheme="epaper"` would imply a `data-variant` still applies to it, which it cannot.

## `colour` in TypeScript, `--color-*` in CSS

This split is deliberate and **must not be "fixed"**.

TS identifiers use `colour`, matching `e6Colour` / `colourMode` / `getAccentColour` in
`castkit/packages/views/src/viewStyles.ts`, per the house rule about matching existing
nomenclature. CSS custom properties use `--color-*` because **Tailwind v4's `@theme` only
generates `bg-*` / `text-*` / `border-*` utilities from the `--color-` namespace**.
Renaming them to `--colour-*` silently produces a stylesheet with no utilities.

## Logical properties only

Every spatial value is consumed as a logical property — `padding-inline`, `margin-block`,
`inset-inline-start`, `border-inline-start`, `text-align: start`. Never `left`/`right`.
In Tailwind that means `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`border-s`/`border-e`.

This costs nothing now and makes RTL nearly free later, which is why it is a rule rather
than a preference. `scripts/previewStyles.ts` is written entirely this way and is the
first fixture the eventual ESLint rule will be tested against.

## Contrast is a test, not a guideline

`scripts/checkContrast.ts` walks every content-on-surface and intent pair across every
(variant × scheme) and exits non-zero below threshold.

- **WCAG 2.2 is the gate** — 4.5:1 for text (1.4.3), 3:1 for control boundaries and focus
  indicators (1.4.11). It is normative and it is what an audit will use.
- **APCA is reported alongside** — it models perceived contrast far better on dark UI,
  but WCAG 3 is still a working draft, so gating on it means gating on a moving target.

Two categories are reported but never gated, each with a stated reason:

- `content.disabled`, because WCAG explicitly exempts inactive controls, and gating it
  would force disabled text to look enabled.
- Decorative lines — `border.subtle`, `border.default`, and badge outlines. 1.4.11 covers
  boundaries *required to identify a control*, not every line on screen. `border.strong`
  **is** gated, because that is the role a text input, checkbox, and switch track draw
  themselves with.

Getting that scoping wrong is not harmless: gating decoration at 3:1 produced 65 "failures"
on the first run, which is precisely how a contrast gate gets switched off.

The audit also asserts **alias drift**: `content.onAccent` must equal
`intent.accent.onSolid`, and `border.focus` must equal `focus.ring`. Two names for one
value is a bug waiting for the first person who tunes only one of them.

## Adding a variant

Copy any file in `src/variants/`, change the values, add it to `src/variants/index.ts`,
then run `node scripts/checkContrast.ts`. If it exits zero, run `buildPreview.ts` and look
at it. Both steps are required — the gate proves it is *readable*, not that it is *good*.
