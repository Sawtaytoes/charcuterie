# The type ramp is built around a 17px body, and `sm` is pinned to 1rem

**Status:** Accepted
**Date:** 2026-08-10
**Type:** Tokens + Components
**Supersedes:** —
**Superseded by:** —

## Decision

Every variant's type ramp is rebuilt around a **17px body**, with the `sm` step pinned to
exactly **1rem**:

| step | rem | px |
| --- | --- | --- |
| `xs` | `0.9375rem` | 15px |
| `sm` | `1rem` | **16px** |
| `md` | `1.0625rem` | **17px** |
| `lg` | `1.1875rem` | 19px |
| `xl` | `1.5rem` | 24px |
| `2xl` | `1.875rem` | 30px |

This lives in `defaultTypography` and is the ramp for all four variants. `daylight` and
`legible` lose their `fontSize` overrides outright — those restated a ramp a step below
the default, and a variant file is meant to be a list of *deliberate* differences.
`layered` keeps an override for its two **display** steps only (`xl` 25px, `2xl` 32px);
its body steps are the shared ramp.

Line height moves with it: `1.28 / 1.55 / 1.7`, slightly tighter in relative terms
because the absolute leading grew with the size. Leading and size are one decision.

**Control heights do not move.** Not in this change and not as a follow-on.

Separately, and in the same change, three groups of `text-xs` in `packages/ui/src` are
reclassified to `text-sm`, because they are content rather than fine print:

- the **Tooltip** body (`Tooltip.tsx`) — the entire tooltip,
- **Field** and **FieldGroup** descriptions *and error messages*,
- the **SortableTableHeader** label.

## Context

The owner reported the whole fleet reading too small, at every window size:

> "Looks like Charcuterie in general is SUPER small. I dunno why. It's all rem fonts, but
> it's ridiculously small on all window sizes. I'd like to bump that up a lot."

and gave the calibration directly:

> "I often zoom sites, but if you look at Home Assistant, it's only at 125% zoom. That
> means 100% is pretty close to usable, whereas Charcuterie sites I have at 200% zoom in
> most cases. That's way too much."

He supplied a devtools screenshot of mail-sifter showing `div.text-xs.text-content-muted`
("Click to open this queue") computing to **12px**.

No decision record had ever settled the ramp. Nothing justified `md: 0.9375rem` or the
`densityFontScale` multipliers; they were carried from M0 and never revisited.

Four candidates were mocked up as the same mail-sifter "Queues" screen at 100% zoom and
served for the owner to pick from — current, 16px body, 17px body, 19px body. The preview
is committed at `docs/previews/2026-08-10-type-scale-candidates.html`. He picked the
17px body.

## Why

**The old ramp sat a full step below the browser default.** `daylight` — the default
variant, at `:root` — ran 12 · 13 · 15 · 17 · 21 · 26px. Nothing reached 16px until `lg`.
Charcuterie's `md` was Tailwind's `text-sm`. There is no `html { font-size }` override
anywhere in the repo, so 1rem genuinely is 16px and the ramp was the entire defect.

**The step that decided the shape is `sm`, not `md`.** Counted in `packages/ui/src`,
source only:

| class | uses | files |
| --- | --- | --- |
| `text-sm` | **34** | 24 |
| `text-xs` | 15 | 11 |
| `text-md` | 11 | 9 |
| `text-base` / `text-xl` / `text-2xl` | 0 | 0 |

`text-sm` is used roughly **3x** more than `text-md`. The library's de-facto body step is
`sm`, not `md` — it carries form labels, menu items, listbox and combobox option rows, tab
labels, accordion copy and popover body. This is the reason the 17px candidate beat the
16px one: a ramp that fixes `md` and leaves `sm` at 13px fixes the step almost nothing
uses. Pinning `sm` to exactly 1rem puts the library's most-used text on the browser
default, and everything else follows from that.

**The 200%-vs-125% gap should not be read literally.** A true 2x equivalence would put
body text near 30px, which no desktop app wants. The owner was at 200% because he was
sizing for the *12px muted text* to become legible, not for the body — compensation for
the floor rather than a preference. Raising the floor removes most of the need. 17px body
with a 15px floor is about where Home Assistant sits at his 125%, with no zoom.

**Why the three reclassifications are part of the same change.** The ramp alone would have
left a field's error message, a tooltip's entire body and a table's column headers as the
smallest text on the page — a form error is the one thing a stuck user must read, and
`SortableTableHeader` combined `text-xs` with `uppercase tracking-wide`, which strips the
word shapes readers rely on at small sizes. These are content. Splitting them into a second
PR would have shipped a ramp whose most-quoted symptom was still present.

**Control heights stay put.** The owner's own read was that the Storybook button is
already "somewhat reasonable", 40px against 17px body leaves comfortable padding, and
`2026-08-05-controls-share-one-height-no-per-component-touch-floor.md` settled control
height five days earlier. Text and control sizing are two dials; only one needed turning.

## Evidence

Owner, on the problem and the calibration (chat 2026-08-10):

> "Looks like Charcuterie in general is SUPER small. I dunno why. It's all rem fonts, but
> it's ridiculously small on all window sizes. I'd like to bump that up a lot."

> "Even Storybook looks really small to me, but at least the default button is a somewhat
> reasonable size there."

> "I often zoom sites, but if you look at Home Assistant, it's only at 125% zoom. That
> means 100% is pretty close to usable, whereas Charcuterie sites I have at 200% zoom in
> most cases. That's way too much."

Measured, not assumed:

- The preview's "current" panel reproduces the reported symptom exactly — the muted
  hint computes to **12px**, matching his screenshot.
- Rendering the real Storybook stories before the change and bucketing every leaf
  element's computed size: **13px was the single most common size in all four** of the
  Field, SortableTableHeader, Tooltip and Card stories.
- The generated `variables.css` before the change confirmed the full variant x density
  matrix; the 12 combinations are generated from four authored ramps via
  `densityFontScale`, so density moves with this automatically.

## Consequences

- **The contrast gate is unaffected, in either direction.** `getContrast` takes two
  colours and nothing else; every threshold in `contrastAudit.ts` is a literal chosen by
  role, never by measured size. There is no `18.66` / `24` / `largeText` logic. Growing
  the text neither breaks the gate nor earns WCAG's 3:1 large-text allowance.
- **`vrt` diffs essentially every shot.** That is the deliberate outcome of a global type
  change, not a regression. `vrt` is not a required check.
- **`AdaptiveGrid` calibration goes stale.** `chooseColumns` spends height first, so
  taller text means taller cards means *fewer* columns. The same card measures 147px on
  the old ramp and 163px on this one, so any caller's `itemBlockSize` is 16px light until
  re-measured. This is the reason the ramp lands before anyone tunes those numbers in an
  app.
- It retires the "body copy at 13px" premise in
  [`2026-07-30-the-shipped-fonts-are-baloo-outfit-victor-mono.md`](2026-07-30-the-shipped-fonts-are-baloo-outfit-victor-mono.md).
  That decision — `display` is a separate face from `sans` — stands unchanged; only the
  size it cites has moved. The same phrasing in `types.ts` is updated with it.

## Open, deliberately not settled here

- **`legible` still buys legibility with colour and weight, not size.** Its body step has
  always been identical to `daylight`'s, despite a docstring selling it for "a kiosk across
  a room". Whether the high-legibility variant should also carry a larger ramp is a real
  question, left open because the owner picked *one* ramp for the fleet and inventing a
  fifth on top of it would not be that.
- **Compact density is now snug at the small control size**: a 26px `sm` control against
  15px text. Measured, not acted on.
