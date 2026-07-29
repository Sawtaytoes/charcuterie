# ePaper is a separate token profile, not a `data-scheme` value

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

The three theme axes — `data-scheme` (light | dark), `data-density` (comfortable |
compact | kiosk), `data-variant` — all compose freely.

**ePaper is not one of them.** It ships as a separate export,
`@charcuterie/tokens/epaper`, exposing `epaperColours.spectra6` and `epaperColours.mono`
plus `epaperMotion`. It is selected instead of the axes, not alongside them.

## Context

The household runs ePaper displays driven by `castkit/packages/views`, which renders JSX
to PNG through Satori. The panels are **E Ink Corporation Spectra 6** (black, white, red,
yellow, blue, green) and older two-colour units.

The obvious modelling — `data-scheme="epaper"` — was considered and rejected.

## Why

**A scheme restyles; ePaper removes capabilities.** Light and dark are the same UI in
different colours: every shadow, hover, transition, and opacity value still means
something. On ePaper none of them exist. There is no hover because there is no pointer.
There is no transition because the panel refreshes in whole seconds. There is no shadow
and no opacity because the hardware renders six colours and dithers everything else — and
a dithered 1px border is a smeared grey line.

**Modelling it as a scheme would imply a variant still applies.** `data-scheme` and
`data-variant` compose by construction, so `data-scheme="epaper"` invites
`data-variant="layered"` — a direction whose entire premise is separating surfaces with
shadow. On ePaper that produces surfaces with no separation at all. The type system should
make that unrepresentable rather than merely inadvisable.

**There is no grey, which changes what the roles mean.** `content.secondary` and
`content.muted` both resolve to black; the hierarchy has to be carried by weight and size
instead of lightness. That is a different design contract, not a different palette, and
giving it its own export is what makes it obvious to the person implementing against it.

**Satori needs literals anyway.** It cannot evaluate `var()`, so it consumes resolved
values through `resolveTokens()` regardless. ePaper was never going to travel down the
CSS-custom-property path that makes the other three axes free.

One concrete consequence is visible on the M0 board: `warning` uses yellow as a *fill it
puts black on top of* and says its piece in black text, because Spectra 6 yellow on white
is unreadable as text at any size.

## Evidence

The plan drew this line before implementation:

> Plus one **non-composing** profile: **ePaper**, a separate export
> (`@charcuterie/tokens/epaper`), not a scheme value — no shadows, no opacity, no hover, 2 or 6
> colours. `castkit/packages/views/src/viewStyles.ts` already collapses accents to `#000000` on
> mono.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo.

Implemented in `packages/tokens/src/epaper.ts`. The M0 specimen board renders an 800×480
Spectra 6 frame that deliberately does **not** follow the axis toolbar, which is what makes
the non-composition visible rather than merely documented.
