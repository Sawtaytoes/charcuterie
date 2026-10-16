# A command palette matches word prefixes and initials, not subsequences

Status: Accepted
Date: 2026-10-16
Type: Behavior
Supersedes: None
Superseded by: None

## Decision

`CommandPalette` filters by **word prefix**: every typed word must be the start of a word in
the item's title, `description` or `keywords`, in any order. Two extensions and nothing else:

- **Initials.** A single typed word of two or more letters matches when the title's initials
  start with it (`ha` → `Home Automation`, `rpm` → `Reverse Proxy Manager`).
- **Camel-case steps start a word** (`bit` → `qBitTracker`), while the whole run still
  matches across the step (`qbit`). Case and accents are folded per code point, with a map
  back to the original string so highlight ranges point at the rendered characters.

Ranking is four fixed tiers, best first — the title starts with the query; every word starts a
title word; the title's initials; every word starts a word anywhere — then the caller's
`weight` (an open count), then the caller's order. Matched groups are ordered by their best
member, so the first row, which Enter opens, is always the best match.

The pure logic is `matchWordPrefixes` / `rankWordPrefixMatches` / `parsePrefixCommand` in
`@charcuterie/logic/core`, beside the other pure helpers (`selectPriorityLayout`,
`applySelectionClick`).

## Context

The reference mockup scored a title prefix, then a word prefix, then a substring anywhere,
then an in-order-letters (subsequence) fallback, so `ha` could find `Home Assistant`. That
fallback is what produced the reference's one good abbreviation, and also the noise.

## Why

- **Subsequence matching lets in most of the list.** On a 60-entry launcher, `ha` is in order
  inside `Chat`, `Shared Files` and `Phone Charger`; the ranker then has to undo noise the
  matcher admitted. Word starts are what people type into a launcher.
- **Initials keep the case subsequence is defended with** — the abbreviation — without
  letters scattered through a word. They need two letters so `a` does not read as initials.
- **Substring matching is dropped for the same reason.** `serv` inside `Reverse` is a match
  nobody meant.
- **Best-member group order** keeps Enter on the best match. Fixed group order (apps, then
  bookmarks) would put Enter on a worse app when a bookmark matched better.
- **Deterministic tiers** are testable as rules (`wordPrefixMatch.test.ts` names one rule per
  test); a numeric fuzzy score is not.

## Evidence

The owner's complaint about the third-party launcher this replaces, in the T3 Code chat of
2026-10-16: *"The search at the top doesn't filter my apps, it searches the web."* and
*"CTRL SPACE works for this, but nothing appears when you press it. You first have to type."*
The coordinator brief for this component: *"Filters caller-supplied items as you type (fuzzy
or prefix-word match — pick one, justify it, test it)."*
