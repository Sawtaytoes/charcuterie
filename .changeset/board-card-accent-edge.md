---
"@charcuterie/ui": minor
---

`BoardItem` takes an `accentEdge`, so a board card can carry an identity colour that follows its corner.

`accentIntent` draws a `w-1` pill inside the card — a straight rectangle beside a rounded box, and an intent is a claim about a state (`danger` says what happens if you press the thing). A project, a repo or a source is an identity instead, and it wants the corner.

`accentEdge` is `Card`'s own treatment on the card's own box: the same pseudo-element, taking `border-radius: inherit`. It is correct in both shapes a board card has without being told which one it is in — a straight stripe down a row below `cq-lg`, and a wrapped bar once the row becomes a card.

The two arms are mutually exclusive by type. Both paint a leading bar in the same place, and a card wearing two of them is a card whose leading edge means two things. Either arm pairs with `accentLabel`, which is the only channel a screen reader has.
