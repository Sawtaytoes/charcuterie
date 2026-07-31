# `@charcuterie/tokens` ships the first-paint snippet, and it is a `var()` fallback

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Token API / consumer contract
**Supersedes:** —
**Superseded by:** —

## Decision

The anti-flash rule every consumer puts in its entry HTML is **generated here**, not
hand-copied between apps:

```css
html, body { background-color: var(--color-surface-base, #131822); color-scheme: dark; }
```

Three pieces ship:

| | What |
| --- | --- |
| `buildFirstPaintRule(variant, scheme)` | The rule **alone** — one line, no comment, no trailing newline. |
| `buildFirstPaintCss(variant)` | `dist/first-paint.css`: both schemes' rules under a header that says *paste, do not link*. |
| `@charcuterie/tokens/first-paint.css` | The `package.json` export for that artifact. |

**The literal is written as a `var()` fallback, and that is the substance of this decision,
not a formatting preference.** A bare `background-color: #131822` in an inline `<style>` is
forbidden in every consumer.

**It is a copy-me file, not a linkable stylesheet.** A `<link rel="stylesheet">` is a
network round-trip, and beating that round-trip is the rule's entire job — linking it would
reintroduce the flash it exists to prevent while looking like the tidier option. The file
exists so the snippet has a single generated source and an answerable provenance, not so it
can be referenced at runtime.

Consumers gate their own copy with one assertion:

```ts
expect(indexHtml).toContain(buildFirstPaintRule(daylight, "dark"))
```

## Context

Found during gallery-downloader's M6e port, in an app that had just adopted
`@charcuterie/tokens@0.2.0`: `data-scheme="light"` rendered every card, pill and border
light and left the page canvas at `#131822`.

The rule it had copied from rip-deck's `packages/web/index.html` was:

```html
<style>
  html, body { background-color: #131822; color-scheme: dark; }
</style>
```

An inline `<style>` is **unlayered**, and unlayered author CSS beats **every** `@layer`
regardless of specificity. Tailwind v4 emits utilities into `@layer utilities`. So that
rule silently outranks `bg-surface-base` on `<body>`, and there is no way for the scheme
attribute to reach the page background at all — not by adding specificity, not by ordering,
not by `!important` on a utility that is still in a losing layer.

Reproduced in rip-deck before touching it, because a grep hit is not a bug. With
`data-scheme="light"` forced on the running dashboard:

| | Before | After |
| --- | --- | --- |
| `--color-surface-base` | `#F5F7FA` | `#F5F7FA` |
| computed `<html>` background | `rgb(19, 24, 34)` | `rgb(245, 247, 250)` |
| computed `<body>` background | `rgb(19, 24, 34)` | `rgb(245, 247, 250)` |

The visible symptom is worse than a wrong colour: the header text is a light-scheme
*content* colour, so "Rip Deck" and the host name render near-black on the pinned dark
canvas and **disappear**. Screenshots: `rip-deck/__screenshots__/2026-07-31-ripdeck-light-{before,after}.png`.

Fleet sweep, all four Tailwind consumers:

| Repo | Carried it | Outcome |
| --- | --- | --- |
| gallery-downloader | yes | fixed at M6e (`1b5e7ba`) |
| rip-deck | yes, **and it was the original** | fixed (`fb2a143`) |
| mux-magic | yes, `#0f172a`, **latent** | fixed ahead of M6b (`76dcf55e`) |
| castkit | no — `packages/web` is an ePaper dev-preview with no stylesheet at all | nothing to do |

mux-magic is the instructive one. Its inline rule and its `@layer base` body rule are the
same slate-900, so there is no visible symptom **today** — and its comment says *"Keep in
sync with the body rule there"*, which describes the two rules as duplicates when in fact
the inline one outranks the layered one. It would have become the same bug the moment M6b
added tokens and a `data-scheme`, in a migration that would have had no reason to look at
`index.html`.

## Why

**Because a copy is what made three apps wrong at once.** The rule is unavoidably a
literal — it exists for the instant before any custom property is declared — so the choice
is not *copy vs. no copy*, it is *an unreviewed copy vs. a generated one*. Generated, the
hex comes from `daylight.schemes[scheme].surface.base`, the same token `variables.css`
reads, and `distFreshness.test.ts` fails if the built artifact drifts from the generator.

**Because the `var()` is not discoverable.** Nothing about the bare form looks wrong. The
CSS is valid, the class is emitted, Tailwind's build is correct, and the utility simply
loses — so typecheck, build and unit tests are all silent, and rip-deck's own
`firstPaintColour.test.ts` was actively *asserting the broken form* (`toContain("background-color: #131822")`),
holding the bug in place while looking like diligence. The only thing that catches it is
flipping the attribute on a running page and looking, which is exactly the kind of check
that does not happen on a file nobody edits. Encoding the reason where the snippet is
generated is the only place it survives being copied.

**Because it makes the gate writable.** No individual app could assert the fix — each owned
only its own hex, and "does this literal contain a `var()`" is a rule about a *shared
pattern*, not about one file. Exporting the rule as a string turns every consumer's drift
test into one `toContain`, which pins the `var()` and the hex together. rip-deck's test now
does locally what it will do through this export once `tokens` publishes.

**Why a snippet and not a component or a `<link>`.** Both alternatives lose to the same
constraint: the rule must be in the document before any request completes. A React
component runs after the bundle; a stylesheet link is the round-trip being beaten. There is
no delivery mechanism other than "text in the HTML", so the package's job is to *generate
and explain* that text, not to own its execution.

**Why `color-scheme` gets no equivalent treatment.** `variables.css`'s `[data-scheme]`
block is unlayered too, so it competes with the inline rule on specificity — and an
attribute selector beats a type selector. It wins on its own; wrapping it would be cargo
cult.

## Evidence

The gallery-downloader M6e handoff (`docs/2026-07-31-m6e-react-tailwind-frontend.md`),
which found it and named the follow-up this record answers:

> **rip-deck carries the same rule and, on reading, the same bug.** Not fixed here — it is
> one line in a repo this branch does not touch — but it belongs in the charcuterie
> milestone, and it is **an argument for the first-paint rule being something
> `@charcuterie/tokens` documents rather than something each consumer copies**.

And, on why nothing caught it:

> Neither a typecheck nor a build nor a test can see it: the CSS is valid, the class is
> emitted, and the utility just loses. It took flipping the attribute on a running page.

Measured in rip-deck at `packages/web` on `fix/first-paint-var-fallback`, `data-scheme`
set to `light` on the running dev server: `{ htmlBg: "rgb(19, 24, 34)", bodyBg: "rgb(19, 24, 34)",
tokenSurfaceBase: "#F5F7FA" }` before, `{ htmlBg: "rgb(245, 247, 250)", bodyBg: "rgb(245, 247, 250)" }`
after.

The bare form was already contradicted by this repo's own reasoning about the sibling
property — `buildCss.ts` on why `color-scheme` is emitted at all:

> rip-deck hand-wrote `:root { color-scheme: dark }` and so did every other app in the fleet
> — which is also why none of them could switch scheme at runtime without a second edit.

Same failure, same three words: *hand-wrote*, *every app*, *cannot switch at runtime*. That
one was fixed by generating it here; this one is fixed the same way.
