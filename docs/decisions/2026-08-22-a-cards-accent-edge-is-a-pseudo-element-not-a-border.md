# A card's accent edge is a pseudo-element, not a border

**Status:** Accepted
**Date:** 2026-08-22
**Type:** Component / API shape
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-07-30-a-consumer-milestone-adds-components.md](2026-07-30-a-consumer-milestone-adds-components.md)

## Decision

`Card` takes `accentEdge`, and the bar is drawn by a **pseudo-element that inherits the
card's radius** — never by a border, and never by a `box-shadow` on the card itself.

```ts
accentEdge?:
  | { categorical: CategoricalIndex }
  | { color: string }
```

Two arms, and `intent` is deliberately absent.

## Context

Three apps in the fleet had grown the same card independently:

| App | How it drew the bar | On what |
| --- | --- | --- |
| Folio | `border-inline-start: 3px` on a **wrapper around** the card | `rounded-lg` `Card` |
| mail-sifter | `borderInlineStartWidth: 4` inline | `rounded-xl` `<a>` |
| spoolbuddy | `rounded-lg border-l-3` | its own div |

All three are square-cornered against a rounded box, because a border is painted on the
border box and cannot follow a curve. The owner reported it as a defect in Folio, and the
first fix was made in Folio — which is the wrong repo. The library owns the shape.

Docket is the fourth app with the same colour problem and a different answer: it does not
draw an edge at all, it paints a `Badge` with a `categorical` index. That is why the API has
two arms rather than one.

## Why

- **`border-radius: inherit` on an overlay is the only version that follows the corner.** A
  border cannot. A 3px-wide pseudo-element with its own radius cannot either — the browser
  clamps a `0.5rem` radius to fit a 3px box, which caps the bar instead of curving it.
- **The shadow belongs to the pseudo-element, not the card.** `Card` carries `shadow-low`
  from the elevation scale. An app stylesheet is unlayered while Tailwind's utilities sit in
  `@layer utilities`, so a `box-shadow` written at the call site outranks the utility and
  takes the elevation away with it. That is the version of the fix that was written first,
  and nothing about it looks wrong until you compare the two cards side by side.
- **Two colour arms, because the fleet genuinely has two sources.** A categorical index is a
  colour a user picked, from ten contrast-audited roles. A hashed hue is 360 answers and
  cannot be an index — it exists so that a repo added tomorrow already has a colour and
  nobody maintains a palette.
- **`intent` is absent on purpose.** An intent is a claim the design system makes — `danger`
  says what happens if you press the thing — and no card in this fleet wants its edge to make
  one. A third arm is a new decision, not a guess made at the call site.
- **The colour goes through one custom property, not an interpolated class.** Tailwind scans
  source text for complete class strings, so `` `shadow-[inset_3px_0_0_${colour}]` ``
  generates nothing, paints nothing and reports nothing. One literal reading
  `var(--charcuterie-accent-edge)` covers every colour an app can compute.
- **`box-shadow` has no logical form**, so the offset is physical and an `rtl:` twin carries
  the bar to the other side. A single `inset 3px` puts it on the trailing edge of an Arabic
  page.

## Evidence

The owner, on the first fix being made in Folio rather than here:

> "We literally have the same card in Mail Sifter and Docket, possibly others too. This needs
> to be in Charcuterie. It does look good, we just need to do all component development in
> Charcuterie first."

Chat: T3 Code thread `2aa1405e`, 2026-08-22.

Three tests hold the parts that fail invisibly, and all three drive a browser rather than
reading a class name: the bar takes the card's radius on `rounded-lg` **and** on an
overridden `rounded-3xl`; the card's own elevation shadow survives; and a button inside the
card still receives a click, because the overlay covers the whole card.
