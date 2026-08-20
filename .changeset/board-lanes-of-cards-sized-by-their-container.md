---
"@charcuterie/ui": minor
---

`Board` — lanes of cards, sized by their container, moved by keyboard or by pointer

The library's first component whose own operation is a **write**. Three lanes with honest
counts, priority bars, metadata chips, a per-card footer for a live run line, real empty
states, and a `+ n more` overflow that tells the truth about what it is not painting.

**Everything is a container query; there is no media query in it.** Two facts make window
width useless here and they compound: a lane in a three-up board is ~500px on a maximised
1600px window, and a browser at 175% zoom reports ~860 effective CSS pixels for a 1500px
window. So two nested containers do the work — the board's own box decides whether the lanes
are three-up or one-at-a-time behind a segmented control, and each **lane's** box decides
whether a card is two lines, one line, or a card of its own. The `Responsive` story is three
fixed widths inside one browser window that never moves, which is the only honest way to show
it.

**Moving a card takes no drag-and-drop dependency.** Every card carries one handle with two
drivers: pressing it opens a `Menu` of the other lanes, dragging it moves the card directly,
and both commit through the same `onMove`. The menu is the primary path rather than an
accessible alternative — it is the only one that works from the keyboard, the only one a
screen reader can drive, and the only one available in the Narrow View where the other lanes
are not on screen to drop onto. The pointer half is Pointer Events (mouse, touch and pen in
one code path) at **1.4 KB gzipped**, against 7.0 KB for the smallest library candidate and
31.6 KB for the most popular one — measured, not estimated
([decision](https://github.com/Sawtaytoes/charcuterie/blob/master/docs/decisions/2026-08-19-the-board-owns-the-move-and-takes-no-drag-and-drop-dependency.md)).

Every move is announced in a `role="status"` region naming the destination **and the position
within it**, and `onMove`'s `toIndex` arrives already corrected for the card's own removal — so
a consumer's handler is a splice out and a splice in with no arithmetic.

```tsx
<Board
  headingLevel={2}
  label="Today"
  lanes={[
    { items: todo, key: "todo", label: "Todo" },
    { items: doing, key: "doing", label: "In Progress" },
    { itemCount: 19, items: review.slice(0, 8), key: "review", label: "Needs Review" },
  ]}
  moveIcon={<GripIcon />}
  onMove={applyMove}
/>
```

Deliberately **not** in scope, each with a reason on the docs page: data, sorting and
filtering (operations on the array you pass in); virtualisation (a lane truncates by
construction, so there is nothing left to window); and the cross-lane "needs attention" panel,
which is an `Alert` above the board rather than a fourth lane inside it. The `InBoardScreen`
story is the copy-wholesale template for that composition.

Two things worth knowing before you use it. A lane is a `role="group"`, not a landmark — a
board with four `region`s buries a page's real ones — so query it with
`getByRole("group", { name: "Todo" })`. And `accentIntent` is typed as `IntentName` on
purpose: the colour families are `--color-intent-<intent>-<role>` and there is no numeric
scale, so a Radix-style `danger-9` is a compile error here rather than a bar that renders
transparent while every "is it rendered" assertion passes.
