# ePaper removes animation outright; zeroing a duration is not enough

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Architecture / Bug postmortem
**Supersedes:** —
**Superseded by:** —
**Related:** [ePaper is a profile, not a scheme](2026-07-29-epaper-is-a-profile-not-a-scheme.md) ·
[`packages/conformance` is not a package](2026-07-31-conformance-is-not-a-package.md)

## Decision

Three rules, all of which exist because the first implementation got this wrong:

1. **Loop durations are tokens.** `--duration-loop-fast` and `--duration-loop-slow` sit
   alongside the transition ramp. No component may write a literal animation duration,
   even one that feels like implementation detail.
2. **Under the ePaper profile and under `prefers-reduced-motion`, `animation` is set to
   `none`** — not merely given a zero duration.
3. **Any component with a moving affordance owes a static fallback that still reads
   correctly**, and that fallback may not depend on opacity, because ePaper has none.

## Context

The ePaper profile sets every duration to `0ms`, which handles transitions correctly. The
M0 specimen board's *looping* animations — spinner, skeleton shimmer, indeterminate
progress sweep, live-status pulse — were written with literal durations (`700ms`,
`1300ms`, `1400ms`, `1200ms`) on the reasoning that a spinner's speed is an implementation
detail rather than a theme decision.

The owner caught it on the served board: the 800×480 Spectra 6 frame had a sweeping
progress bar on a panel that repaints in whole seconds.

Two distinct faults, and the second is the more interesting one:

- The literals were simply beyond the profile's reach. `--duration-*: 0ms` could never
  affect a value that was never a variable.
- **Even after tokenising them, zeroing was still wrong.** A transition with a `0ms`
  duration genuinely does nothing, but an *animation* with a `0ms` duration still holds
  keyframe zero. For `ch-sweep`, keyframe zero is `translateX(-100%)` — a bar parked
  off-screen. The result is an empty track, which is precisely the "wedged drive"
  misreading that ripdeck's `ProgressBar` comment says the indeterminate state exists to
  avoid. Zeroing the duration would have replaced a visible bug with an invisible one.

The static fallback is a 45° hatch built from hard colour stops (`repeating-linear-gradient`
with no interpolation), because Spectra 6 renders six colours and dithers anything between
them into a smear. It reads as "indefinite" where an empty bar reads as "stalled" and a
full bar reads as "done".

## Why

**"No literal values" needs no carve-out for things that feel like implementation detail.**
That was the exact reasoning that produced the bug. A spinner's speed looks like a
component concern right up until a profile needs to switch it off, and by then the value
is unreachable. The cost of tokenising it is two lines; the cost of not doing so was a
defect on real hardware that only a human looking at the panel would catch.

**Absence of motion is a design state, not the absence of a design.** Reduced-motion and
ePaper both remove the moving thing, and both then need something to be *there*. Treating
them as "same UI, motion off" is how you ship an empty progress bar. This is why rule 3
exists as a standing obligation on components rather than as a fix to one bar.

**Reduced-motion gets the same fallback, deliberately.** A user with vestibular sensitivity
and an ePaper panel have different reasons for the same requirement, and maintaining one
static treatment rather than two is what keeps the ePaper path from silently rotting —
the screen path is exercised constantly, the panel path is not.

## Consequences for later milestones

- **M3** — `Spinner`, `Skeleton`, `ProgressBar`, and `LiveStatusIndicator` each ship a
  static fallback, and each gets a story asserting it. Storybook's toolbar should carry a
  reduced-motion global so it is checked rather than assumed.
- **M5b** — the `packages/conformance` Satori profile should assert **no animation
  properties survive** into an ePaper render, not just that it builds.

  *Resolved 2026-07-31, elsewhere:* there is no package and no Satori render to inspect —
  the ePaper profile emits **zero** CSS by design, being resolved literals for a consumer
  that cannot evaluate `var()`. The assertion lives as `epaper.test.ts`'s *"there is no
  motion at all"* (six `0ms` durations, four `linear` easings), and the CSS half of rule 2
  is gated under `prefers-reduced-motion` in `buildCss.test.ts` and
  `tailwindCandidates.test.ts`. See
  [`packages/conformance` is not a package](2026-07-31-conformance-is-not-a-package.md).
- `@media print` is a genuine future consumer of this profile. Print shares nearly the
  whole constraint set (no hover, no animation, no shadow, restricted colour), so a print
  block emitted *from* the ePaper tokens is close to free. It is **not** how ePaper itself
  is delivered — `castkit/packages/views` renders through Satori, which never evaluates
  media queries, and `slatecast` on the Pi is a normal screen render that never enters
  print context.

## Evidence

> Just wanting to note that. […] it had some animations in there, and that will cause
> problems.

— the owner, 2026-07-29, reviewing the served M0 board.

Verified after the fix by computing styles in the rendered page: the ePaper frame reports
**zero** elements with a running animation, while the rest of the board reports 14 on
token-driven durations. The indeterminate bar inside the frame reports
`animation-name: none`, full inline size, `opacity: 1`, and the hatch background image.
