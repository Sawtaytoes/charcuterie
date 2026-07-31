# The whole docs page is themed by our tokens, in CSS

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Docs / tooling
**Supersedes:** [A docs `<Canvas>` block carries our surface; the rest of the page stays
Storybook's](2026-07-30-docs-canvas-blocks-carry-our-surface.md)
**Superseded by:** —

## Decision

**The docs page is ours.** Prose, headings, links, inline code, the props table, the
`Show code` panel and its syntax highlighting all read `--color-*`, so a docs page follows
`data-scheme` × `data-variant` exactly as the story canvas does.

Done in **CSS**, in `packages/docs/src/styles/tokens.css`. Not `parameters.docs.theme`, and
not a custom `DocsContainer` — see below.

The handles are the container classes (`sbdocs-wrapper`, `sbdocs-content`, `docblock-*`)
plus plain element selectors and Prism's own token names. **No rule targets an emotion hash
class.**

## Context

Kevin, looking at a Modal docs page that was white with a dark canvas embedded in it:

> *"I wonder if we can make Docs view have a dark mode too. That way, it'd all match. In
> fact, why don't we theme the docs page like the component library?"*

The superseded record drew the line at the `<Canvas>` block on the argument that "a docs
page is Storybook's document… not ours to restyle", and closed with:

> If the whole docs page should ever go dark, that is a different decision and needs the
> theme object, not more of these rules.

That is the decision, and **the theme-object half of it was wrong**.

## Why CSS, and why the earlier record had it backwards

**A theme object cannot read a custom property.** That much the earlier record got right:
Storybook runs theme values through `polished` (`transparentize`, `lighten`), which throws
on a `var()` string. What it missed is the consequence — a theme object would have to
restate our palette as **literal hexes**, and there are **four variants × two schemes =
eight** of them, all live on the toolbar. Eight palettes duplicated into JS is eight things
to keep in sync with `packages/tokens`, and the first one to drift does so silently.

A `var()` is **zero**. By the time these rules apply, `[data-variant][data-scheme]` on
`<html>` has already resolved every token — the same mechanism every component uses. All
eight combinations work without naming any of them.

**And a parameter still cannot read a global**, which is the other half of the earlier
record and stands unchanged: a static `docs.theme` fixes one scheme and breaks its mirror.
A custom `DocsContainer` reading globals could swap between two theme objects, but that
buys the eight-palette duplication above in exchange for solving a problem CSS does not
have.

**The prose was never really Storybook's.** Its colour already came from our `body` rule —
that is *why* the original bug was near-white text on white. Only the background belonged
to Storybook. Splitting the page at the `<Canvas>` boundary described the bug's blast
radius, not a real ownership line.

## What this cost, and the three things worth knowing

**1. `:not(.sb-unstyled *)` is the wrong guard; `:not(.sb-story *)` is the right one.**
Prose rules must not reach inside a rendered demo and restyle the components being
documented. `.sb-unstyled` looks like the marker for that and is not — Storybook also puts
it on **heading anchors** and on the arg tables. Using it left every `<code>` inside an
`<h2>` at Storybook's dark grey on our dark page: the original bug, in a smaller box.

**2. Storybook doubles its own emotion class.** `.css-ssfv87.css-ssfv87 tbody > tr > *`
paints every props-table cell white. That is the same specificity trick this file uses, so
matching it exactly still loses — emotion injects at runtime, we are a static stylesheet,
and equal specificity goes to source order. The props-table rules therefore repeat their
class **three** times. It is a race a future Storybook could win back by adding a
repetition, which is what the gate below is for.

> **Corrected 2026-07-31.** Those three rules no longer repeat at all — they are one class
> plus `!important`, per
> [`!important` is for Storybook's chrome only](2026-07-31-important-is-for-storybook-chrome-only.md).
> The finding about emotion doubling its own class still holds; the response to it changed.

**3. `!important` is not available in this repo, and it fails silently.**
`biome check --write --unsafe` — which is what `yarn lint` runs — **deletes the `!important`
and keeps the declaration**. The rule stays in the source looking correct while the built
CSS has no priority on it. This cost a round of "the rule is right there and the output
does not have it", and it is worth knowing before reaching for `!important` anywhere here.

> **Corrected 2026-07-31 — "not available" was wrong.** The deletion is real, but it is
> `lint/complexity/noImportantStyles` (recommended, unsafe fix) doing its job, and an
> exact `biome-ignore` suppresses it. Kevin's call on where that is allowed, and the trap
> that a *wrong* rule id fails identically and silently, are in
> [`!important` is for Storybook's chrome only](2026-07-31-important-is-for-storybook-chrome-only.md).

## The gate

`smoke:storybook` no longer compares one block's background against one token. It measures
**WCAG contrast** on six representative pairs — prose, heading, inline code, both kinds of
table cell, and the canvas actions bar — on **every docs page**, against the first ancestor
that actually paints.

Contrast rather than a colour list, because that is the property that matters and it
catches *any* of these rules ceasing to match without needing to enumerate them. Verified by
deleting one rule: **64 problems across 109 entries**, where the previous gate would have
reported none of them. It also caught a failure this change introduced and the author had
not seen — props-table cells at **1.14:1** on 16 pages.

Measured, after: nothing below **8.32:1** in dark or **6.77:1** in light. AA is 4.5, so the
threshold has real headroom and a failure means something genuinely broke.

## Consequences

- Storybook's syntax highlighting is Prism's **light** theme and Storybook does not swap it
  with the scheme: `keyword` was `#0000FF`, about **1.3:1** on our sunken surface. The
  tokens are mapped onto the **intent** scale — accent, info, warning, success, danger —
  so every syntax colour is one the contrast gate already checks against our surfaces, in
  every variant and both schemes, rather than an invented hex.
- More rules reaching into Storybook's class names than the superseded record was
  comfortable with. That trade is accepted deliberately: the coupling is real, and the
  contrast gate turns it from a silent regression into a red build.
- The **manager** chrome — sidebar, toolbar — is a separate document and is untouched. It
  is Storybook's own dark theme and already reads correctly against this page.

## Evidence

Kevin, 2026-07-31, quoted above, with a screenshot of the Modal docs page: white document,
dark `<Canvas>`, dark sidebar.
