# A tile that acts is its own component, and shares only the box

**Status:** Accepted
**Date:** 2026-09-01
**Type:** Component / API shape
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-08-25-a-choice-tile-is-a-radiogroup-shape-not-a-third-component.md](2026-08-25-a-choice-tile-is-a-radiogroup-shape-not-a-third-component.md)

## Decision

A tile that **presses or navigates** is `ActionTiles`, a component beside `RadioGroup`. A
tile that **holds a value** stays `RadioGroup itemShape="tile"`.

```ts
// on ActionTilesProps
items: readonly ActionTileItem[]
label: string                     // the set's accessible name, required
minTileInlineSize?: number        // CSS px, default 200
onChoose?: (value: string) => void

// on ActionTileItem
label: ReactNode
value: string                     // the key, and what onChoose is handed
hint?: ReactNode
icon?: ReactNode
href?: string                     // makes this tile a real <a href>
isDisabled?: boolean
isExternal?: boolean
```

The two share **the box and nothing else**. `packages/ui/src/tileStyles.ts` holds the
padding, the border, the radius, the surface, the type ramp, the hint ramp, the gap and the
grid formula; `RadioGroupOption` and `ActionTiles` both read it. Those constants were
`RadioGroup`'s private ones and no value changed on the way out.

This is the opposite call to the 2026-08-25 record, on purpose, and the rule it settles is
the one that decides between them: **what does a press do?** If only the box changes, it is
a shape. If the control changes, it is a component.

## Context

The 2026-08-25 record made the choice tile `RadioGroup`'s second *shape* and closed with
three things it deliberately did not cover. This is the second of them, verbatim:

> **A tile that navigates.** mux-magic's "Pick a tool" tiles are `<a href>` and
> points-market's are `<Link>`. A link is not a radio, and giving one `aria-checked` would be
> worse than the paint it replaced.

QueuePilot then supplied the third call site and the failure that motivated the work. Its
"Queue type" modal — *Picks* or *Rules*, and the editor for the one you press opens
immediately — was two Charcuterie `Button`s deformed by an app rule:

```css
.queue-type-options button { height: auto; flex-direction: column; }
```

A `Button` is sized by `h-(--control-height-md)` and carries **no block padding at all**;
`px-*` is its whole padding, because a one-line control on a form row is sized by the
density axis. So `height: auto` computed to `padding: 0px 17px`. The card's title sat flush
against its top border and the description flush against its bottom one. The owner reported
it as *"Missing padding and sizing that's typical of Charcuterie."*

Nothing could have caught it. The class really was in the DOM, so a class-name assertion
passes; TypeScript never reads the CSS; and unstyled-but-present markup passes axe. The app
repo's own `AGENTS.md` already bans exactly this — *"A `className` on a Charcuterie component
is a smell… It is never a tweak; it is a silent override"* — and the rule did not save it,
because the alternative the rule points at did not exist.

## Why

**"Only the box changes" was the 08-25 test, and here it is false.** That record refused a
`ChoiceTile` / `ChoiceTileGroup` pair because the element, the `radio` role, the roving
tabindex, selection-follows-focus, `isReadOnly` and the first-paint `pendingValue`
correction were all unchanged — a border is not worth forking a control over. Invert each
of those and you get this component: no role to borrow, no roving tabindex, no selection to
follow focus, no read-only state, no pending value. What is left in common is the border,
which is the one thing that *is* shared here.

**A press that acts and a press that records are different affordances, not different
paints.** A radio tile stays lit because the value persists and something below reads it. An
action tile does not, because the page moved on — QueuePilot's press opens the next modal
and the tiles cease to exist. Fusing them would need a mode prop that turns off the role,
the keyboard model and the selected state, which is a second component wearing the first
one's name.

**`role="group"` and no roving tabindex.** These are ordinary `<button>`s and `<a href>`s,
so the platform owns the keyboard: Tab reaches each tile, Enter and Space press it, and
ctrl-click opens a link in a new tab. A radio group borrows one tab stop and moves its
choice with the arrow keys because exactly one of its options is true at a time. Nothing
here is true, so imposing that model would only cost a keyboard user the ability to Tab to
the second tile. `label` is still required, because a set of unnamed tiles is a pile of
buttons.

**`href` renders a real anchor, through the existing seam.** Middle-click, ctrl-click, "open
in a new tab", "copy link address" and the status bar all come from the element rather than
from the paint — the standing
[buttons are actions, links are navigation](2026-08-10-buttons-are-actions-links-are-navigation.md)
rule. The destination test and the disabled-link behaviour are `ButtonLink`'s, unchanged: a
same-origin non-fragment href goes through the injected `RouterLink`, and `isDisabled` drops
the `href` entirely rather than shipping a focusable anchor that silently ignores clicks.

**The shared box is asserted, not trusted.** `ActionTiles.test.tsx` mounts an action tile
and a *resting* radio tile in one story and compares `getComputedStyle` — padding, border
width, border colour, radius, surface, font size. A class-name assertion would pass while
the paint was wrong, which is the mistake the 08-25 gates already refused to make. The same
test pins `paddingTop > 0`, which is the exact assertion the QueuePilot bug would have
failed.

**One grid formula, in one place.** `auto-fill` and not `auto-fit`, `min(…, 100%)`, and the
floor arriving as a custom property rather than an interpolated class — all three reasons
are the 08-25 record's and none of them is weaker for an action set. Duplicating the string
into a second component is how the two grids come to disagree about a 2560px window.

## What this deliberately does not cover

- **A selected action tile.** There is no such thing. If a tile should stay lit, the value
  is being held and it is a `RadioGroup`.
- **A multi-select tile.** Still `MultiplePicker`, still a different record.
- **A tile with artwork.** Still `MediaTile`.
- **An intent.** An action tile is neutral at rest and takes its border to
  `border-border-strong` on hover, exactly as the radio tile does. A destructive first step
  is a question for a `Dialog`, not a red card.

## Evidence

The owner chose this over the two cheaper options when asked. The alternatives put to him
were a `RadioGroup itemShape="tile"` plus a Continue button — the library shape at the cost
of a second click and a pre-selected first tile — and adding block padding to the app's own
CSS rule. He picked *"New Charcuterie pressable choice tile"*, keeping the one-click press
and moving the shape into the library.

Gates on the change: `lint` clean, `typecheck` clean, 508 `ui-dom` tests and 322
`ui`/`node` tests pass, 375 storybook tests pass, 113 contrast pairs clear AA in every
variant and scheme, and `smoke:storybook` renders 442 entries clean. Ten of those tests are
this component's.

`sourceRules.test.ts`'s component ledger goes 61 → 62.
