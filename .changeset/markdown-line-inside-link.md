---
"@charcuterie/ui": minor
---

`MarkdownLine` gains `isInsideLink` — draw the marks, emit no anchor

The third and last answer to *who owns the link here*: `href` says this component does,
neither says the markdown links do, and `isInsideLink` says nobody.

It exists because a whole-card link is a real and common shape — Docket's triage cards wrap
the title *and* the body, so middle-click opens the proposal — and inside one, an anchor of
any kind is an anchor inside an anchor. The trap has teeth even where no author ever typed a
link: a **bare URL autolinks**, so a captured note whose title ends in `https://…` would nest
one without anybody writing `[]()`.

A markdown link's text still renders with its marks. It simply does not navigate on its own,
and it is not painted as a link either — a word painted as a link that cannot be followed is
worse than plain text.
