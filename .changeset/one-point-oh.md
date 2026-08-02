---
"@charcuterie/biome-config": major
"@charcuterie/eslint-config": major
"@charcuterie/logic": major
"@charcuterie/tokens": major
"@charcuterie/ui": major
---

1.0.0 — the API has survived contact with the fleet

All five packages go to `1.0.0` together, as their own changeset rather than folded into a
consumer's, so the release that stabilises the API is legible on its own in the changelog.
[Decision](../docs/decisions/2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md).

**Nothing in this bump changes an API.** It is a promise about the ones already here: from
now on `^1.0.0` takes every minor, and a breaking change goes to `2.0.0`, where an install
stops and someone reads this file.

That is not ceremony. Pre-1.0, **the minor is the breaking channel** — `^0.1.0` means
`>=0.1.0 <0.2.0` — and it had already bitten on this very library. `tokens@0.2.0` replaced
five of the six ePaper Spectra 6 values and its own changeset said *"breaking for anyone
reading these literals"*, yet every consumer pinned `^0.1.0`. So the corrected palette, the
entire point of M5b's finding, reached **none** of them, and did so **silently**: the range
resolves happily to the old version instead of failing.

The cut waited for the consumers rather than for a date. `@charcuterie/ui` reached exactly
one app when M6 opened; it is now imported by **five** — mux-magic (28 files), rip-deck
(11), gallery-downloader (19), image-viewer (14) and plex-channels (10) — and the three
modernizations M6 had to do before any of that could happen (image-viewer off `.jsx` +
Emotion; plex-channels and gallery-downloader onto React + Tailwind from no build system at
all) are what it cost. castkit consumes `tokens` and `logic` only, which is M5b's finding
standing rather than a gap: the component layer does not reach a Preact consumer. `xander`
is deliberately not among them either — Kevin's call was to leave it alone
(*"he's doing his own thing. I can have him use Charcuterie once we get this settled"*),
which is why the last-consumer condition resolves here rather than at a fourth migration.

Waiting was the point, and M6 kept proving it. M5b's *"the component layer does not reach a
Preact consumer"* is exactly the kind of finding that must not arrive **after** a stability
promise — and M6f found two more of them, in `Field`/`Tooltip` nesting and in `LogViewer`
inside a collapsed `Accordion`, both invisible to this repo's own suite and both surfaced by
an app actually using the thing. Those are fixed in this release. A 1.0.0 cut a milestone
earlier would have shipped both.

Also folded in, rather than shipped as an intermediate `tokens@0.3.0` no consumer could
have installed: the first-paint (`var()` fallback) snippet and the widened 19-colour ePaper
flat-fill palette. Both are `minor` on a `0.x` line, which is to say both were unreachable
behind every consumer's caret — publishing them as `0.3.0` on the way past would have been
a release with no possible audience.
