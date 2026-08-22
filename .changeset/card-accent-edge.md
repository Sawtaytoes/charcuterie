---
"@charcuterie/ui": minor
---

`Card` takes an `accentEdge` — a coloured bar down the leading edge that follows the card's
own corners.

Three apps had grown this shape independently and all three drew it as a straight border
beside a rounded box, so the bar ran past the curve and stopped square while the card was
round. A border is painted on the border box; it cannot follow a corner. The treatment here
is a pseudo-element that takes `border-radius: inherit`, so it reads the radius off whatever
card it is on.

```tsx
<Card accentEdge={{ categorical: 3 }}>…</Card>   // a colour a user picked
<Card accentEdge={{ color: hue }}>…</Card>       // one the app computed
```

Two arms because the fleet has two answers: Docket picks from the ten-wide contrast-audited
categorical family, while Folio and mail-sifter hash a name into a hue so a repo added
tomorrow already has a colour and nobody maintains a palette — 360 answers, not ten.
