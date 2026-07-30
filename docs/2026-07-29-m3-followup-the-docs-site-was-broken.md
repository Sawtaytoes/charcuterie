# M3 follow-up: the docs site was broken, and every gate was green

Written after the owner reviewed the M3 build at
`charcuterie-m3-components-f514.temp.t3code.octen.dev` and reported *"some broken
stories and docs pages."* Three defects, all of them invisible to the 278 tests M3
shipped, plus the variant guidance he asked for in the same breath.

The reason all three survived is worth stating once, because it shapes M4: **M3's gates
mount things, and none of them looks at the site.** A story rendered in isolation, with
an axe pass, is a strong assertion about a component and says nothing about page
layout, module load order, or the Markdown pipeline.

## 1. `Illegal invocation` on every docs page

Storybook 10.5.5's `enhanceContext` loader replaces `HTMLElement.prototype.focus` with
an accessor whose getter reads `this.ownerDocument`. React Aria — inside Storybook's own
lazily-loaded docs blocks — reads that property *on the prototype* at module scope, so
`this` is not an element and `ownerDocument` throws.

Pure ordering. Cold-loading a docs page worked; clicking to one after any story did not,
which in practice is every docs page: **all twelve**, not just the `Tokens/Overview` in
the screenshot.

Fixed by importing `@storybook/addon-docs/blocks` from `.storybook/preview.tsx`, so
React Aria's setup runs at bootstrap while `focus` is still a plain function. The import
looks like dead code and is not —
[decision](decisions/2026-07-29-preload-docs-blocks-before-the-focus-patch.md).

## 2. Every Markdown table rendered as literal pipes

MDX is CommonMark; a GitHub-flavoured table is not. `@storybook/addon-docs` had no
`remark-gfm`, so `| Attribute | Values | Changes |` rendered as a paragraph of pipe
characters — including the axes table that has been at the top of `Tokens/Overview`
since M1. Three pages affected.

The source was correct the whole time, and every other block on the page rendered, which
is why it read as a Markdown typo rather than a missing plugin.

## 3. The card in `LiveStatusIndicator › All States` collapsed to one word per line

The component was right; the *story* was wrong. `container-type: inline-size` implies
`contain: inline-size`, which forbids an element from being sized by its own contents.
In a default `StoryCell` — `items-start`, so shrink-to-fit — the card had no width to
shrink to, collapsed to min-content, and wrapped "16 bays · 4 ripping" after every word.

This is the twin of the bug M3 already recorded (*a container query cannot query the
element that declares it*): valid CSS, real classes, no error, nothing for axe to say.
`sourceRules.test.ts` now **derives** the container-declaring components from source and
fails any `StoryCell` holding one without `align="stretch"`, so the component M4 adds
joins the rule the moment it lands.

## The gate that would have caught two of the three

`yarn smoke:storybook` — [`packages/docs/scripts/smokeStorybook.ts`](../packages/docs/scripts/smokeStorybook.ts).
It serves the build, loads the manager **once**, and walks all 78 index entries over the
addons channel, exactly as the sidebar does. Any console error, page error, Storybook
error display, or literal `| --- |` in a rendered docs page fails the run.

The single-page-load part is the whole point. Reloading between entries passes with
defect 1 in place, which is precisely why `--project storybook` could not see it.

Measured, with each fix backed out in turn:

| | |
| --- | --- |
| No blocks preload | 24 problems across 78 entries — all 12 docs pages, nothing else |
| No `remark-gfm` | 3 problems — the three pages with tables |
| Both fixed | `✓ 78 Storybook entries rendered clean under SPA navigation` |

Defect 3 is a source rule instead, because a shrink-to-fit container query is legal CSS
that a browser reports nothing about; there is no runtime signal to smoke for.

## And: where you would actually use `hairline`, `layered`, and `legible`

Asked directly, and a fair question — M0 recorded *why each direction was built* and
never said when to pick one. Now on `Tokens/Overview`, on each variant's story in
`Tokens/Specimen`, and in a `Use it for:` line in each `variants/*.ts` header.

The short version, which is mostly a redirection:

- **Most of the time you want `data-density`, not a different variant.** `compact` is
  per-surface and needs no companions; that is the axis for a list that feels loose.
- `hairline` — a lot of rows at **desk distance**. Not at kiosk distance: hairlines stop
  existing there and they are the only separation it has.
- `layered` — **across a room**, the kiosk Pi and xander, paired with
  `data-density="kiosk"`. Never ePaper, where shadow separation collapses.
- `legible` — **bad conditions** (sun, the garage tablet at 2am) or a user-facing "high
  contrast" switch. Also, unchosen, the upper bound `contrast.test.ts` measures
  `daylight` against, which is most of why the three losers were kept.

One trap documented with it, because it is silent: `data-variant` on a subtree
**half**-applies. The generated selectors pair the axes —
`[data-variant="hairline"][data-scheme="dark"]` — so a lone `data-variant` picks up the
direction's radii and keeps the page's colours and control heights. Verified in the
browser, not inferred:

| Attributes on the element | `--radius-lg` | `--color-surface-raised` | `--control-height-md` |
| --- | --- | --- | --- |
| `<html>`: daylight / dark / comfortable | 10px | `#1D2430` | 2.5rem |
| `data-variant="hairline"` alone | **7px** | `#1D2430` | 2.5rem |
| all three, co-located | **7px** | **`#15171A`** | **2.25rem** |

## Gates after this work

278 → **279** node + browser tests (the new source rule), 66 story tests in chromium
with axe at `test: "error"`, typecheck and lint clean, contrast gate clean, and
`smoke:storybook` green across 78 entries.

One correction to M3's own numbers while here: that handoff says 65 stories; `index.json`
and `--project storybook` both measure **66**.

M4 is unchanged and still next — Modal on native `<dialog>`, Popover, and Tabs as the
falsification point.
