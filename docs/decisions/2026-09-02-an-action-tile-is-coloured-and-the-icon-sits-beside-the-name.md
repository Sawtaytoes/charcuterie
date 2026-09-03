# An action tile is coloured, the icon sits beside the name, and a portrait is its own component

**Status:** Accepted
**Date:** 2026-09-02
**Type:** Design / Component
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-09-01-a-tile-that-acts-is-its-own-component-and-shares-only-the-box.md](2026-09-01-a-tile-that-acts-is-its-own-component-and-shares-only-the-box.md)

## Decision

Three things, from one round of review with the owner.

**1. `ActionTiles` is coloured by default.** A tile wears a bar down its leading edge, its
icon takes the same hue, and the box hovers in it. The hue comes from the ten-wide
`categorical` palette, walked **in order** by position.

```ts
// on ActionTilesProps
accent?: "auto" | "none"          // default "auto"

// on ActionTileItem
categorical?: CategoricalIndex    // overrides the positional hue
```

**2. The icon sits BESIDE the name, not above it.** `icon` and `label` are one head row;
`hint` is a second line under both.

**3. `PortraitTiles` is a new component** — a round picture, a name and one big number, each
subject in its own hue, reflowing from a row to a column on a container query.

```ts
// on PortraitTilesProps
items: readonly PortraitTileItem[]
label: string                     // the set's accessible name, required
layout?: "auto" | "column" | "row"   // default "auto"
minTileInlineSize?: number        // CSS px, default 200
onChoose?: (value: string) => void
size?: ControlSize

// on PortraitTileItem
label: ReactNode                  // the name
value: string
categorical?: CategoricalIndex    // a hue from the palette …
color?: string                    // … or one from data. Never both.
hint?: ReactNode                  // the unit under the number — "points"
href?: string
imageSrc?: string
initials?: string                 // the fallback, and what a 404 falls back TO
isDisabled?: boolean
isExternal?: boolean
stat?: ReactNode                  // the one number
```

The shared box widens on one axis: `TILE_PADDING_CLASS.lg` grows from `px-4 py-3.5` to
`px-6 py-5`, because `lg` **is** the landing-page tile and was carrying a control's padding
under a card's name. `RadioGroup itemShape="tile"` gets the same growth, which is the shared
box working rather than a side effect of it.

## Context

`ActionTiles` shipped neutral on 2026-09-01. The owner's verdict, in full:

> "mux-magic, points-market, and gallery-downloader have nice tiles. I'd like those to exist
> in Charcuterie. I don't like what we built for QueuePilot. It's not as flashy. Very boring,
> not colorful."

Three apps had grown this card independently, and every one of them had coloured it by hand.

| App | The shape | Its colour |
| --- | --- | --- |
| mux-magic | `ToolCard` — `p-7`, `rounded-xl`, icon **left** of a `text-2xl` title, description under | `text-intent-accent-content` / `text-intent-success-content` on the glyph |
| gallery-downloader | Two `<Link>` cards — `p-6`, icon **left** of the title | a per-card hover border, `intent-info` and `intent-success` |
| points-market | `KidPicker` — `rounded-3xl`, a round photo, a name, a big number | a colour stored **per person**, on the photo ring and the number |

That is the same defect the 2026-09-01 record was written about, one layer up. The library
owned the box and left the paint to the call site, so the paint drifted three ways — and the
one app that did the correct thing and used the library got the version with no colour in it
at all.

## The variants, in the order they were drawn

The owner asked for these to be written down: *"Mark down all the variants we went through."*
Both rounds were served as token-accurate HTML over `devshare` before any component code
existed, per the fleet's mock-up-first rule. **Every one of the nine is reachable from the
tokens that shipped**, so any of them can be revisited without new colour work.

### Round 1 — where does the colour go?

All five put the icon **above** the name, which is what the neutral component already did.

| | Paint | Verdict |
| --- | --- | --- |
| **0** | What shipped. No colour, no mark, `px-3.5 py-3`. | The thing being replaced. |
| **A** | Neutral card; the icon in a **soft tinted square** that fills solid on hover, card washes in the hue. | Rejected. |
| **B** | The **whole card tinted** — hue surface, hue border, title in the hue. Flat, no lift. | Rejected. |
| **C** | Neutral card; the icon in a **solid-filled square**; the card lifts and shadows on hover. | Rejected. |
| **D** | A **bar down the leading edge** plus a gradient fading into the card. | Chosen, minus the gradient. |
| **E** | The **card is the colour** — fully solid, `on-solid` text. | *"I like the idea of Option E with those bold-colored cards"*, but not chosen. |

The owner's reply named the miss the five had in common and picked between the rest:

> "I don't like any of the examples. I like how Mux-Magic looks today with the icon to the
> left of the title."

> "I like the idea of Option E with those bold-colored cards, but I believe D matches more
> what we do without the background gradient. I think that left-side border line color is
> fine. And if I don't like what we end up with, we can always change it."

### Round 2 — how heavy is the bar?

Four rows, all with the icon beside the name and a solid bar with no gradient.

| | Bar | Mark | Hover | Verdict |
| --- | --- | --- | --- | --- |
| **V1** | 3px, the width `Card` already draws | bare coloured glyph | border and surface take the hue | **Chosen.** |
| **V2** | 5px | bare coloured glyph | the card lifts | Rejected — a bar that does not match `Card`'s. |
| **V3** | 3px | solid-filled block behind the glyph | the card lifts | Rejected. |
| **V4** | 3px | soft block that fills solid on hover | border and surface take the hue | Rejected. |

## Why

**The bar is `Card`'s accent edge, not a second one.** `getAccentEdgeClassName` already
exists, already covers all ten hues, is already RTL-aware, and is already a pseudo-element
that inherits the card's radius. Drawing a second bar would have re-made the exact mistake
the [2026-08-22 record](2026-08-22-a-cards-accent-edge-is-a-pseudo-element-not-a-border.md)
was written about: three apps with three nearly-matching bars, all of them square against a
rounded box. V1 is 3px for the same reason — a tile and a card on one page have to be the
same bar, and "nearly" is how the fleet got here.

**A bar is an overlay, so the tile pays for it in padding.** The pseudo-element occupies
nothing in the box model. A tile that did not widen its leading padding would draw the bar
straight through the first letter of its own name — and nothing could report that. A
pseudo-element is not in the DOM, so no query can miss it, and axe has nothing to say about a
glyph with a stripe on it. Hence `TILE_ACCENT_EDGE_PADDING_CLASS`, applied only when an edge
is drawn, and a test that asserts the difference in computed pixels.

**`categorical` and not `intent`.** An intent is a claim the design system makes: `danger`
says what happens if you press the thing. "Builder" beside "Jobs" makes no claim about
either, and neither does a person. Ten numbered hues say only *these are different from each
other*, which is what a tile set means and what
[the categorical record](2026-08-19-categorical-is-a-curated-palette-not-ungoverned-colour.md)
established the family for. It also means the colour cannot be unreadable: every hue is
contrast-gated in both schemes and against its neighbours.

**Positional by default, nameable per item.** A positional hue costs a call site nothing,
which is the only way five tiles get five colours in an app that was never going to maintain
a palette. It is also the wrong default for anything that persists — add a sixth tile above
the fifth and the fifth changes colour — so `categorical` on an item pins it while the rest
go on walking from their own positions.

Position rather than `getCategoricalIndex(value)`, which is the hash the fleet uses for a
label. That helper exists so a row in a list nobody controls the order of keeps its colour
forever; here the set is short, ordered and written out in the source, and a hash of two tile
values can collide and hand a two-tile set the same colour twice.

**`accent="none"` stays.** The neutral paint is right inside something already carrying a
colour of its own, where a second palette is noise. Keeping it is also what lets the
shared-box test assert an exact match on all four sides, so *"the boxes match"* cannot
quietly come to mean *"the boxes match apart from whatever changed last"*.

**A radio tile gets no bar.** A checked one already says so by turning its whole border
`intent-accent-solid`. A coloured stripe on the same box would be one card carrying two
claims — *this one is selected* and *this one is the blue one* — in the same place.

**`PortraitTiles` is separate because the question is different.** `ActionTiles` asks *what
do you want to do*: a name, a line of help, an icon illustrating a verb. A portrait asks *who
is this*: a face, and one number that decides it. There is no description, because a person
is not explained. Collapsing them would have meant one component whose `icon` is sometimes a
20px glyph beside the title and sometimes a 144px circle above it, with `hint` meaning "what
this does" in one mode and "points" in the other — two components wearing one name, which is
the mistake the
[2026-08-25 record](2026-08-25-a-choice-tile-is-a-radiogroup-shape-not-a-third-component.md)
warns about from the other direction. The owner said the same thing in his own words:
*"Similar, but separate."*

**The portrait's scaling is a container query and the density axis, in that order.** His one
requirement was *"that one is meant to scale. I don't wanna lose that functionality."*
points-market switches on a `sm:` **viewport** breakpoint today, which is wrong twice: a
picker in a 320px sidebar on a 2560px monitor gets the big column form, and the same picker
filling a phone gets the small row form. `cq-sm` on the set asks the question that was
actually meant — *does this picker have room to stack* — and the `kiosk` density that
points-market already runs supplies the rest, because every length in the component is a
token. `text-2xl` is 30px at `comfortable` and 38px at `kiosk`.

**A portrait falls back on a 404.** A missing `<img>` is a torn hole where a face was, beside
three that loaded, and this is the one shape that cannot absorb it. `onError` is the only
signal a browser gives, so the fallback the caller already supplied for "no picture" covers
"no picture today" too.

**A portrait takes a colour from DATA as well as from the palette — and the first draft of
this record said it would not.** That draft claimed points-market's per-person CSS colour was
"a contrast guess" that ten audited hues should replace. It was wrong, and the workspace
already held the reason: those colours **match the NFC cards the children physically tap**
([`truenas/docs/decisions/2026-07-20-kid-identity-colors-match-nfc-cards.md`](https://mkdocs.octen.dev/workspace/truenas/docs/decisions/2026-07-20-kid-identity-colors-match-nfc-cards/)).
Swapping in a palette index would have made the picker on the wall disagree with the card in
the child's hand, which is not a theming change — it is the app contradicting a physical
object. `Swatch`'s own doc names this exact class of colour: *"a design system owns
`intent.danger`; it does not own the colour of the dot somebody stuck on a game controller,
and re-theming that would be re-theming the hardware."*

So `PortraitTileItem` carries the same two arms
[`CardAccentEdge`](../../packages/ui/src/Card/cardAccentEdge.ts) already carries, mutually
exclusive in the type. The palette arm stays the default and the recommended one. The data
arm threads the colour through four custom properties on the tile, because Tailwind generates
CSS at build time from source text and a colour out of a database is not in the source. Only
the fill uses it raw: the initials are `getReadableTextColour(color)` — new in
`@charcuterie/tokens`, WCAG, and **total**, because it runs inside a render and a throw on one
bad row would blank the whole picker — and the number is `color-mix`ed toward
`content-primary`, so a pale card colour is readable on a pale surface and moves with the
scheme instead of staying pale.

`ActionTiles` deliberately did **not** get the second arm. An action's colour is a design
choice by construction.

**The lift survives, guarded.** Hovering raises a portrait, which is the thing the owner
pointed at in points-market. It is the only motion in this library, so
`motion-reduce:hover:translate-y-0` turns it off for anyone who asked the OS for less; the
shadow and the coloured border stay, so the hover is still legible without it.

## What this deliberately does not do

- **Colour a `RadioGroup` tile.** Above.
- **Guarantee contrast on a portrait's `color`.** The palette arm is audited in both schemes.
  The data arm cannot be — the colour is not ours. It picks the initials to suit the fill and
  pulls the number toward readable, and that is the whole of what it promises.
- **Colour an `ActionTiles` tile from data.** `ActionTiles` takes `categorical` only. An
  action is a thing the app decided to offer, so its colour is a design choice by
  construction; the data arm exists for a colour that belongs to a *subject*, and an action
  has no subject.
- **Ship any icons.** Unchanged. Apps bring their own, and now state no colour on them.

## Evidence

- The owner's two replies, quoted in full above (chat `t3code/fff82c6b`, 2026-09-01).
- Round 1 and round 2 mock-ups, served from `__screenshots__/tile-mockup/` — `round-1.html`
  holds all five paints, `index.html` the four rows. Both read the real generated
  `variables.css`, so every colour in them is the colour that shipped.
- `packages/ui/src/ActionTiles/ActionTiles.test.tsx` — the palette walk, the named hue, the
  `accent="none"` opt-out, and the leading-padding difference, all read off computed styles
  rather than class names.
- `packages/ui/src/PortraitTiles/PortraitTiles.test.tsx` — the container-driven reflow, the
  404 fallback against a file that really does not exist, the per-subject hue, and the data
  colour reaching the fill exactly while the initials flip to suit it.
- `packages/tokens/src/contrast.test.ts` — `getReadableTextColour` over the three real card
  colours, and over the inputs it cannot measure, where it falls back instead of throwing.
- `packages/ui/src/tileStyles.ts` — `TILE_ACCENT_EDGE_PADDING_CLASS`, and the `lg` growth
  with its reason.
