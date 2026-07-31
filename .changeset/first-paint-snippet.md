---
"@charcuterie/tokens": minor
---

Ship the first-paint (anti-flash) snippet, as a `var()` fallback.

`buildFirstPaintRule(variant, scheme)` returns the one line an entry HTML needs before any
stylesheet has parsed; `buildFirstPaintCss(variant)` wraps both schemes into the new
`dist/first-paint.css`, exported as `@charcuterie/tokens/first-paint.css`. **Copy it into an
inline `<style>` — never `<link>` it**: a stylesheet request is the round-trip the rule
exists to beat.

The `var()` is the point, not the packaging. An inline `<style>` is unlayered, unlayered CSS
beats every `@layer`, and Tailwind v4's utilities live in `@layer utilities` — so the bare
form every consumer had hand-copied (`html, body { background-color: #131822 }`) outranked
`bg-surface-base` on `<body>` and pinned the canvas dark permanently, making
`data-scheme="light"` unreachable. gallery-downloader, rip-deck and mux-magic all carried it.

Consumers gate their own copy with
`expect(indexHtml).toContain(buildFirstPaintRule(daylight, "dark"))`.
[Decision](../docs/decisions/2026-07-31-tokens-ships-the-first-paint-snippet.md).
