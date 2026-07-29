# The library ships no icons — and no symbol glyphs in a default either

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Components / API
**Supersedes:** —
**Superseded by:** —

## Decision

1. **`@charcuterie/ui` contains zero SVG assets and zero icon components.**
   `IconButton`, `Badge`, `EmptyState`, and `MediaTile` take a `ReactNode`; lucide (ISC)
   stays the fleet recommendation, unadopted here.
2. **A component's own default may not be a symbol character either.** `MediaTile`'s
   error fallback is the words *"Image unavailable"*, not `▨`.
3. Story boards use `src/icons.storyHelpers.tsx` — hand-drawn inline SVGs, excluded from the
   package build. `IconButton`'s `RawGlyph` story keeps plex-channels' actual `↶` on
   purpose, to show that the glyph is unchanged and the *name* is what the component adds.

## Context

Point 1 is the plan's, and unchanged: three repos have three icon strategies, and owning a
set means owning its updates for every consumer.

Point 2 came out of M3's screenshots. `⚙`, `↶`, `▨`, and `⚠` all render as **nothing** in
this repo's headless chromium — each measures blank, because the sandbox has no font
covering those code points. A board of icon buttons screenshots as a row of empty squares,
and a reviewer cannot tell a missing font from a broken component.

The fleet's targets make that more than a CI curiosity: the kiosk Pis and the ePaper
displays are minimal Linux images, and "the icon is invisible on the device the component
was built for" is the same bug with a worse audience.

## Why

**A glyph is a font dependency dressed up as content.** An SVG carries its own geometry; a
character asks the platform for it. For a *library default* — the one thing a consumer gets
without choosing it — that dependency has to be zero, so the default is text, which every
font has.

**Shipping an SVG to fix it would trade a small problem for the one point 1 exists to
avoid.** One inline path in `MediaTile` is one path the library owns, versions, and repaints
per variant, and it starts the argument about which set the fleet uses inside the library
instead of in each app.

**Words are also better here.** "Image unavailable" says what happened; `▨` needs a legend.
An app with an icon set passes `fallback` and gets both.

## Consequences

- `EmptyState`'s `icon` prop stays optional and unstyled beyond `text-content-muted`.
- Story helpers are the only SVGs in the repo, and they never reach `dist` — the build
  excludes `*.storyHelpers.tsx`.
- `Badge`'s glyph example uses a story SVG rather than `●`.
- Screenshot proofs are legible in headless environments, which is what makes them proofs.

## Evidence

> **Icons: do not own them.** Three strategies exist today — mux-magic hand-writes five SVG
> components, castkit uses an `ICON_PATHS` map, plex-channels uses raw glyphs (`↶`, `↷`, `▶`,
> `⚙`, `≡`). Pick **one** set — lucide (ISC, community fork of Feather) is the default
> recommendation — have `IconButton`/`EmptyState`/`Badge` accept `ReactNode`, and ship zero
> SVGs.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo,
under "Package layout".

Measured in this repo's chromium, at 16px, in the token font stack:

| Text | Advance width |
| --- | --- |
| `M` | 13.33px |
| `⚙` | 4.45px (blank) |
| `↶` | 4.45px (blank) |
| `▨` | 4.45px (blank) |
| `⚠` | 4.45px (blank) |
