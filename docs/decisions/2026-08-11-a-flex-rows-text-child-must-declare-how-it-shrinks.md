# A flex row's text child must declare how it shrinks, and the lint rule warns rather than errors

**Status:** Accepted
**Date:** 2026-08-11
**Type:** Convention + tooling
**Supersedes:** —
**Superseded by:** —

## Decision

A text-bearing child of a flex **row** carries one of `min-w-0` (paired with a wrapping
class), `wrap-anywhere` / `break-all`, `truncate` / `line-clamp-*` / `overflow-hidden`,
an explicit `w-*` / `max-w-*` / `basis-*` / `size-*`, or `shrink-0` / `flex-none`. Any
one of them is enough. **Nothing** is not enough.

`shrink-0` and `flex-wrap` never appear on the same element inside a flex row.

Both are enforced by `@charcuterie/eslint-config`, in the new opt-in
`createFlexOverflowRules({ files })` block:

- `charcuterie/no-unconstrained-flex-text` — **`warn`** by default, promotable with
  `severity: "error"`.
- `charcuterie/no-shrink-0-with-flex-wrap` — **`error`**.

## Context

On 2026-08-11 every `@charcuterie/ui` consumer was bumped to `ui@2.11.0`. The
[17px type ramp](2026-08-10-the-type-ramp-is-built-around-a-17px-body.md) is a ~13%
larger body, and it consumed the slack that had been hiding latent layout bugs. **Five of
the eleven bump PRs carried a layout fix, and four were the same shape** — a flex row
containing one long unbreakable token:

| Repo | Site | Fix that shipped |
| --- | --- | --- |
| gallery-downloader | `ErrorRow` — a `webtoons:<uri>` source span | `min-w-0 wrap-anywhere` |
| points-market | `ShopPage` — the item-name `<h3>`, and the price/Buy row | `min-w-0 wrap-anywhere`; `flex-wrap` + `shrink-0` + `ml-auto` |
| mail-sifter | `LinkCard` — `community.home-assistant.io` | `truncate` + a `title` |
| rip-deck | `RipCard` — the drive-control row | **removed** `shrink-0`, added `min-w-0` |

Three of the four were already wrong before the bump; the ramp is what pushed them past
the window edge. gallery-downloader measured
`document.documentElement.scrollWidth` at **1528px in a 1440px window**.

The mechanism, from gallery-downloader's commit message:

> only `overflow-wrap: anywhere` shrinks the min-content size a flex item's automatic
> minimum resolves against, so `break-word` alone still lets the URI force the row open
> with no element visibly overflowing.

And points-market's, blunter: *"`min-w-0` alone is not enough (the text just spills
instead)."* And rip-deck's, on the secondary trap:

> `shrink-0` pins a flex item at its max-content width, so the row's own `flex-wrap`
> could never engage: the widest single line — `43.0% · Keep trying · Give up · Cancel` —
> set the card's floor.

Four independent rediscoveries of one CSS rule in one day is the definition of something
that should be mechanised, not written down again. It is the same lesson the
[UI-unification program](2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
already drew for component choice — *a convention that was documented but not
mechanised* — applied to CSS.

## Why

**Why the rule flags the shape and accepts any escape.** The four fixes are four
different fixes, and that is the finding, not an inconsistency. `min-w-0` alone lets the
text spill; `wrap-anywhere` is the fix when the value should stay readable; `truncate` is
right when the full value already lives in an `href` or a `title`, as it did in
mail-sifter; and in rip-deck the fix was *deleting* a class. A rule that demanded one
specific class would be wrong in three cases out of four and would be disabled in a week.

**Why `no-unconstrained-flex-text` warns.** It is a heuristic and says so. It can see
that a row's text child declares nothing about how it shrinks; it cannot know whether
`{status}` is `"OK"` or a 300-character URL. Measured across five repos it fires on 6/49
files in gallery-downloader, 5/11 in points-market, 8/12 in mail-sifter, 6/36 in rip-deck
and 33/341 in mux-magic — low volume, but a judgement call every time. **A rule that
fires constantly gets disabled, which is worse than no rule**, and the same reasoning
keeps [the logical-properties rule scoped to `className`](2026-07-29-logical-properties-only-enforced-on-classname.md)
and the component-choice block opt-in. An app that has swept itself sets
`severity: "error"` and keeps the finding.

**Why `no-shrink-0-with-flex-wrap` errors.** It is not a judgement call. The two classes
contradict each other outright, and a contradiction has no acceptable instance. It
earned the severity on its first run: pointed at rip-deck it found the known `RipCard`
bug *and* the identical uncaught shape in `HeldBayCard` and `QuarantinedBayCard`.

**Why the precision guards are where they are.** `<div>` is excluded because it is the
generic box and the most common flex child by a wide margin. Static text is excluded
because `Cancel` is never 300 characters — the bug arrives with data. `tabular-nums` is
excluded because it marks a bounded digit run, and without it the rule warns on
rip-deck's three-character `{percentText}` *after* the shipped fix; the one number that
took part in a real overflow (points-market's five-digit price) was fixed on the parent
row, not on the span. A `className` the rule cannot read statically is skipped, because
the escape may be inside the `clsx(…)` it cannot see. And `shrink-0` + `flex-wrap`
requires a flex-**row** parent: inside a `flex-col`, `shrink-0` resists shrinking down
the block axis and says nothing about the element's own wrap — mux-magic's
`FileExplorerModal` title bar is exactly that, and would have been the rule's first false
positive on the first real file it saw.

**What it does not catch, on purpose.** mail-sifter's `LinkCard` host is a block inside a
grid column, not a flex item; the flex row above it was already correctly constrained. No
flex rule can see it, and inventing a grid heuristic to reach one case would cost far
more precision than it buys.

## Evidence

`packages/eslint-config/src/houseRules.test.ts` runs the real `ESLint` class over
`__fixtures__/appPackage/unconstrainedFlexText.tsx` and `constrainedFlexText.tsx` — the
four rows copied verbatim from the shipping commits (gallery-downloader `81e2c2a`,
points-market `e6438b7`, mail-sifter `8ed11f4`, rip-deck `ce66aab`), before and after. 3
warnings + 1 error on the before, **zero** on the after, and zero on the near misses.

Run against the real files pulled straight out of those four repositories at both sides
of each fix:

| File | Before | After |
| --- | --- | --- |
| gallery-downloader `ErrorRow.tsx` | warn on line 36 — the source span | the source span is clean |
| points-market `ShopPage.tsx` | warn on 102 (`<h3>`) and 395 (chip name) | **clean** |
| rip-deck `RipCard.tsx` | **error** on 313 — the control row | the control row is clean |
| mail-sifter `LinkCard.tsx` | not detected — not a flex item | not detected |

Two residual warnings survive on unrelated rows in gallery-downloader and rip-deck (a
timestamp, an activity label). They are the heuristic being a heuristic, and they are the
reason the default is `warn`.

Re-confirmed on 2026-08-12 against each app's **live default branch**, now that all four
fixes have merged: identical result — every one of the motivating findings is gone, the
same two residual warnings remain.

**Pointed at Charcuterie's own `packages/ui`, it produces two findings across 155 `.tsx`
files, and both are in `.stories.tsx`** — `Combobox.stories.tsx:160` (an option label's
`<span>{name}</span>` beside a tag chip in a `flex flex-1 justify-between` row, which is
the points-market shape exactly) and `Swatch.stories.tsx:169`. **Zero in any shipped
component**, including `Toolbar`, `QueryBuilder` and `Shell`. The rules are therefore
*not* wired into this repo's own `eslint.config.js` — the same scoping decision the
component-choice block made, and now with a measurement behind it rather than an
assumption. The two story findings are left standing rather than silenced: a story is a
demo, and neither is a defect in shipped markup.

## Related

- [The type ramp is built around a 17px body](2026-08-10-the-type-ramp-is-built-around-a-17px-body.md)
  — the change that exposed all four.
- [Logical properties only, enforced on `className`](2026-07-29-logical-properties-only-enforced-on-classname.md)
  — the precedent for a narrow scope over a wide one.
- [Comments in `index.html` must not shadow Vite's injection anchors](2026-08-11-index-html-comments-must-not-shadow-vites-injection-anchors.md)
  — the same day's other mechanised bug.
