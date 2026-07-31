# A docs `<Canvas>` block carries our surface; the rest of the page stays Storybook's

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Docs / tooling
**Supersedes:** —
**Superseded by:** —

## Decision

1. **`.sbdocs-preview` and its actions bar take `--color-surface-base` /
   `--color-surface-raised`**, so a `<Canvas>` block follows `data-scheme` the way the story
   canvas does.
2. **Storybook's prose chrome is left alone.** Headings, paragraphs, tables, and the sidebar
   keep Storybook's own theme.
3. **Not `parameters.docs.theme`.**

## Context

Reported as "dark mode doesn't seem to be activated for any stories… it's missing on Docs".
The measurement said otherwise — dark mode was fully on:

| | |
| --- | --- |
| `<html data-scheme>` | `dark` |
| `--color-surface-base` | `#131822` |
| `body` background | `rgb(19, 24, 34)` |
| **`.sbdocs-wrapper` background** | **`rgb(255, 255, 255)`** |
| tab label colour | `rgb(237, 240, 245)` |

So the components were correct and the page underneath them was not: `#EDF0F5` text on
`#FFFFFF`, about 1.1:1, on every docs page at once. The story canvas was always right, which
is why it reads as "dark mode is missing" rather than as a contrast bug.

## Why

**A docs page is two things wearing one background.** The prose is Storybook's document —
its own component, its own theme, dark text on white, perfectly readable, and not ours to
restyle. A `<Canvas>` block is *our* canvas embedded in that document, and it is the only
part where our tokens are supposed to win. Splitting on that line is the smallest change
that is also the correct one.

**`parameters.docs.theme` cannot work here.** A parameter is static per story and cannot
read a global, so setting the docs theme to dark would fix the default scheme and break its
mirror — light components on a dark page — the moment anyone touches the Light toggle.
Scoping to the preview block follows the scheme in *both* directions, which is verified in
both.

**Feeding `var()` into Storybook's theme object was considered and rejected.**
`create({ appBg: "var(--color-surface-base)" })` would have themed the whole page from our
tokens, but Storybook's theming runs some values through `polished` colour maths
(`transparentize`, `lighten`), which throws on a `var()` string. A cosmetic win is not worth
a runtime that fails on an internal we do not control.

**The actions bar had to move with it.** Darkening only the preview left Storybook's grey
`Show code` / `Copy code` labels at about 2.4:1 — trading one contrast failure for another.
Both now measure above 7:1, in both schemes.

## Consequences

- Two rules reaching into Storybook's class names, which is a coupling that could break on a
  Storybook major. `smoke:storybook` compares the block's background against the token's
  **resolved** value through a probe — the same technique M4's `::backdrop` test uses — so
  a rule that stops matching fails 14 docs pages loudly rather than quietly going white.
- Written outside `@layer` so Tailwind's utilities cannot demote it, and two class names
  deep to beat the emotion class it overrides.
- If the whole docs page should ever go dark, that is a different decision and needs the
  theme object, not more of these rules.

## Evidence

> Dark mode doesn't seem to be activated for any stories. Maybe it's just the dark
> background? But it's missing on Docs.

— Kevin. The hedge is the accurate part: it *was* just the background.
