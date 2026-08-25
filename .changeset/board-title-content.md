---
"@charcuterie/ui": minor
---

`BoardItem.titleContent` — a board card's title can be a `ReactNode`

`title` stays a required plain string and stays the name every control on the card is
announced by; `titleContent` is what gets drawn, inside the card's own clamping box, so a
rich title still truncates the way every other card does.

It exists so a board card's title can be a `MarkdownLine`. `titleContent` is typed as a
union against `href` and `onSelect` rather than as a third loose optional, because the two
halves genuinely cannot coexist: `href` wraps the title in a `TextLink` and `onSelect` wraps
it in a `<button>`, so a `titleContent` carrying its own anchor would be an anchor inside an
anchor (silently un-nested by the parser, dropping the rest of the card's link) or an anchor
inside a button (invalid, and unreachable by keyboard). Both look completely correct on
screen. A caller that needs a rich title takes the navigation with it.

Nothing here is breaking. A `BoardItem` with no `titleContent` renders exactly the markup it
did before.
