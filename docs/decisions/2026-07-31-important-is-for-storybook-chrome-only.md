# `!important` is for Storybook's chrome only, and it needs the exact `biome-ignore`

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Convention
**Supersedes:** the "`!important` is not available" sub-claim in
[The whole docs page is themed by our tokens](2026-07-31-the-docs-page-is-themed-by-our-tokens.md)
**Superseded by:** —

## Decision

Kevin, on reading that claim:

> *"We shouldn't need `!important` in our own library unless you're talking about
> overwriting Storybook docs styles. Then I understand, and we need to do a Biome disable
> for that rule or simply make it slightly more specific."*

Two rules, and the line between them is *whose CSS is being beaten*:

- **In `@charcuterie/ui` and `@charcuterie/tokens` — never.** We own every rule in play,
  so anything that looks like it needs priority is a selector, a layer, or a token that is
  wrong. Fix that instead.
- **In `packages/docs/src/styles/tokens.css` — allowed, with the ignore comment.** That
  file exists to override Storybook's own docs chrome, which is emotion, injected at
  runtime, and not ours to edit.

Currently three declarations qualify, all on the props table:

```css
.docblock-argstable :is(thead, tbody) > tr > * {
  /* biome-ignore lint/complexity/noImportantStyles: beats Storybook's runtime-injected emotion rule, which specificity alone cannot do stably */
  background-color: transparent !important;
  border-color: var(--color-border-subtle);
}
```

## Why priority rather than another repetition

Storybook's own rule is `.css-ssfv87.css-ssfv87 tbody > tr > *` — it **doubles its own
emotion class**, which is the trick every other rule in this stylesheet uses to win.
Matching it exactly loses: emotion injects at runtime and we are a static stylesheet, so
at equal specificity source order decides and source order is theirs.

Three repetitions beat two, and that shipped. But it is a race whose next round is a
Storybook bump adding a fourth — and the count is invisible to anyone reading the
selector, which is why the previous version needed a paragraph explaining that "the count
is not arbitrary". `!important` has no next round. The selectors are back to one class,
so they now say what they match.

The narrowness is the point: the same argument would license `!important` on any rule
anywhere, and it does not, because everywhere else the losing rule is one of ours.

## What the earlier note got wrong, and how

The previous record concluded `!important` was **not available** here, on the evidence
that `yarn lint` deleted it. The evidence was real; the conclusion was not.

`lint/complexity/noImportantStyles` is recommended and its fix is classed **unsafe**, so
`biome check --write --unsafe` — which is exactly what `yarn lint` runs — strips the
`!important` and leaves the declaration behind. Nothing is reported, and the source keeps
reading correct while the built CSS has no priority on it. That is a suppressible lint
rule behaving normally, not a missing CSS feature.

Verified both directions on Biome 2.4.15, through `--stdin-file-path` so the repo config
applied:

| Input | After `biome check --write --unsafe` |
| --- | --- |
| bare `!important` | **deleted**, declaration kept |
| `/* biome-ignore lint/nursery/noImportantStyles: … */` (wrong id) | **deleted**, declaration kept, no complaint about the id |
| `/* biome-ignore lint/complexity/noImportantStyles: … */` | **kept** |

**The middle row is the trap worth naming.** A plausible-looking wrong rule id fails
exactly like no comment at all, silently, and now with a comment above it asserting that
it is handled. `biome explain <ruleName>` prints the diagnostic category; use it rather
than guessing the group.

## The gate

Neither failure mode has to be caught by reading. `smoke:storybook` measures the resolved
contrast of a props-table cell on every docs page, so a stripped `!important` — however it
got stripped — comes back as a red contrast number rather than as a table nobody looked
at closely.
