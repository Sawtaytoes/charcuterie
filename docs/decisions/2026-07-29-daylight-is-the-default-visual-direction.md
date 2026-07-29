# `daylight` is Charcuterie's default visual direction

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Design
**Supersedes:** —
**Superseded by:** —

## Decision

**`daylight` wins M0** and becomes the default `data-variant` for every app in the fleet.

Light-first, cool neutrals, a blue-violet accent (`#3E38C4` light / `#5A54E8` dark),
8–14px radii, roomier control heights (2.5rem md against the 2.25rem baseline), and the
restrained default motion ramp — 120/200/320ms, no overshoot.

`hairline`, `layered`, and `legible` are **kept**, not deleted. Each remains a working
`data-variant` value, already contrast-gated in CI. `legible` in particular stays useful
as the contrast benchmark `daylight` gets judged against.

**The default scheme stays `dark`**, which is not a contradiction — see below.

## Context

M0 ran as the runbook requires ([mock in HTML, serve, `devshare`, owner picks, *then*
build](../../../agentic/docs/runbooks/ui-design-previews.md)), with one addition that
changed what the exercise was worth: the comparison artifact was **generated from
candidate token files** rather than drawn. Four directions, ~250 lines of tokens each,
rendered against real ripdeck verdict text, real mux-magic command names and
`statusClassMap` keys, and real plex-channels queue rows — with several rows deliberately
in states the system was not in, and both current UIs shown alongside as controls.

Because the artifact came from the token files, **the winner needed no porting**. Adopting
it was a one-line change to `DEFAULT_VARIANT`.

Archived: [`docs/previews/2026-07-29-m0-visual-directions.html`](../previews/2026-07-29-m0-visual-directions.html)
(self-contained; open it directly) plus three PNGs in the same directory.

## Why

**It was the owner's call, made against the real thing.** That is the whole point of M0
and it does not need further justification. What follows is the reasoning the direction
was built on, recorded so the next person understands what they are working within.

`daylight` was the only candidate designed light-first and then darkened. The bet it
encoded: every app in the fleet is permanently dark today **not because dark was chosen**,
but because `mux-magic/packages/web/src/styles/tailwindStyles.css` hardcodes `#0f172a` in
four lines and no `dark:` variant exists anywhere in the fleet. Nobody ever had the
option. Picking this direction is what makes light a real, tested, contrast-gated
alternative rather than a hypothetical.

Its stated risks stand and should be watched:

- **Roomy rows are the opposite of what a 16-bay list wants.** Mitigated by the density
  axis: `compact` exists precisely for bay and queue lists and is a per-surface attribute,
  not a global one. If ripdeck's bay list feels loose at M5, the fix is `data-density`,
  not a retheme.
- **A light kiosk in a dark room is a lamp.** The kiosk Pis and xander should stay on
  `data-scheme="dark"`; nothing forces a surface to follow the fleet default.

## Why the default scheme stays `dark`

Choosing a light-first *direction* is not the same as flipping the fleet to light, and
conflating the two would break M1's proof.

M1's whole test is that mux-magic's hardcoded `#0f172a`/`#f1f5f9` can be replaced with
`@import "@charcuterie/tokens/theme.css"` and **look identical**, then gain a working
non-white light mode from one attribute flip. That only demonstrates anything if the
default scheme is dark. `daylight`'s dark surfaces (`#131822` base, `#EDF0F5` content) are
close cousins of the slate-900/slate-100 pair being replaced, which is what makes the
"looks identical" claim plausible rather than aspirational.

So: `data-variant="daylight"` + `data-scheme="dark"` is the default. Light is a first-class,
gated, one-attribute switch — which is the thing the fleet has never had.

## Evidence

> I like Daylight.

— the owner, 2026-07-29, after reviewing the served board at
`charcuterie-visual-directions-e233.temp.t3code.octen.dev`.

The plan required this record and required the pick to come first:

> **M0** | Pick the look. Generate the specimen board from 3–4 variant files, devshare,
> owner picks. **Nothing else starts first** — every component's state palette is
> theme-dependent and repainting twenty components is the expensive mistake. | Decision
> record + `variants/<winner>.ts`

> **After the pick:** the winner's file *is already* `variants/<name>.ts` — it becomes the
> default `variant`, and the losers stay as alternate variants for free.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo.

All four directions cleared WCAG 2.2 AA before the pick (280 gated pairs), so this was a
choice between four readable options rather than a trade of legibility for looks.
`daylight` light-scheme accent text measures 8.18:1 against a 4.5:1 requirement.
