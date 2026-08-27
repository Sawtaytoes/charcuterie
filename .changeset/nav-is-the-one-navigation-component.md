---
"@charcuterie/ui": minor
---

`Nav` — one navigation component, and `NavBar` is deprecated

`Nav` takes the app's destinations and the current address, and draws them in one of five
layouts: `bar` (a header row), `rail`, `railIcons` (collapsed to glyphs), `bottom` (a
Narrow-View strip) and `menu` (a panel behind a control the app supplies). `useNavLayout`
owns the rail's width rule — `rail` at `64rem`, `railIcons` at `48rem`, `menu` below — plus
the manual override and where the override is remembered.

**`NavBar` is `@deprecated` and is removed in the next major.** It is now a thin adapter over
`Nav` and keeps every behaviour it shipped with, under the same prop names: the measured
whole-row fold, `menuAlign`, `menuIcon`, `menuLabel`, `menuPlacement` and `size`. The
migration is one line, because `bar` is `Nav`'s default layout:

```tsx
- <NavBar currentHref={pathname} items={DESTINATIONS} label="Main" />
+ <Nav activeHref={pathname} items={DESTINATIONS} label="Main" />
```

`currentHref` becomes `activeHref`. Nothing else changes.

**One behaviour does change, and it is a fix.** `NavBar` asked its current-path question once
per item, so a bar holding both `/settings` and `/settings/labels` marked **both** of them
`aria-current="page"` while the reader was on the deeper one — against its own decision
record, which says a nav with two current items has stopped saying anything. There was no
test for the case. `resolveActiveKey` now takes the deepest match, by path rather than by
array position, so the order a product lists its destinations in never decides which one
lights up. An app relying on the parent also lighting up was relying on a defect.

`bar` keeps `NavBar`'s measured fold rather than a breakpoint: it reads the width its links
actually have, so a longer label, a tenth destination, a `data-density="kiosk"` or a reader
at 175% zoom each move the fold on their own. It folds **whole**, because a nav's order is
the shape of the product and half of it behind a button is a rule no reader can learn.

Every item is a real `<a href>` through the injected `RouterLinkProvider`, in the bar and in
the panel — never a `<button onClick={navigate}>`, which is identical in a screenshot and
loses middle-click, ctrl-click, "open in a new tab", the status bar and "copy link address".
An `isExternal` item is a plain anchor with `target="_blank"` and `rel="noopener noreferrer"`,
and is never current.

`icon` is optional on `NavItem` and **required** on `NavRailItem`: a `bar` never takes the
label away, but `railIcons` does, so an item with no glyph is a blank square that still
navigates. `items` is deliberately not discriminated on `layout` — the main call site passes
`layout={navLayout.layout}` from `useNavLayout`, which is a variable and not a literal.

`layout="menu"` and the folded `bar`'s panel are both a `Popover` rather than a `Menu`,
because a `Menu`'s items are `onSelect` callbacks on `<button>`s. That is right for undo,
redo and a scheme cycle, and wrong for a destination.
