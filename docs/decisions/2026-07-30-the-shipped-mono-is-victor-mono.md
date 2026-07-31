# The shipped mono is Victor Mono, because Dank Mono cannot be redistributed

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Packaging + Licensing
**Supersedes:** —
**Superseded by:** —

## Decision

`fontFamily.mono` ships **Victor Mono** (SIL OFL). Apps that want **Dank Mono** — the
owner's editor font, and his stated preference — override `--font-mono` locally and load
their own licensed copy.

No part of Dank Mono enters this repository: not the woff2, not the otf, not a base64
inline. This was checked against the branch history before pushing, not just at the tip.

## Context

Asked which mono to use, the owner named Dank Mono: *"I like Dank Mono for Monospace.
Yours is good, but I'd prefer what I've chosen in VSCode. It even has ligatures!"* He
holds a licence, and the purchased archive is on the NAS at
`/mnt/Bunnies/Kevin/Apps/Fonts/Development/DankMono/`, including a `Web-PS/` woff2 build
ready for exactly this use.

So the blocker is not "can we use it". Reading the EULA that ships with the archive, the
*use* grant is generous:

> The licensee may install and use the font on any number of devices, websites, or use
> the font on any other media, as long as they are solely responsible for said media.

That covers every app in this fleet, personally-licensed, with no upgrade needed. The
blocker is the next clause:

> The licensee may not make a copy of the font, with the exception of personal archival
> purposes only […] The licensee agrees not to modify, edit, alter, reverse engineer,
> re-license, re-distribute, create derivatives of, or sell the font.

`Sawtaytoes/charcuterie` is a **public** GitHub repository, and `@charcuterie/tokens` is
published with `access: public`. Committing the woff2 would put a paid font in front of
anyone who clones or installs — redistribution regardless of intent.

## What was rejected

- **Commit it anyway.** Breaches the EULA. Offered explicitly and declined.
- **Buy the commercial licence.** Does not help: the restriction on copying and
  redistribution is separate from the personal-versus-commercial split, so a commercial
  licence still would not permit shipping the file in a public package.
- **Make the repo private.** Solves it outright, but the repo being public OSS is worth
  more than the mono choice.
- **Ship Dank Mono only in a private consumer and leave `fontFamily.mono` as the system
  stack.** Rejected as a non-answer — it leaves every app that does *not* override with
  no ligatures and no opinion, which is the state M5 exists to end.

## Why Victor Mono specifically

It is the closest open-licence analogue to what was actually being asked for. Dank Mono's
two distinguishing features are ligatures and a genuinely **cursive** italic; Victor Mono
has both. Fira Code has the larger ligature set but its italic is an obliqued roman, and
JetBrains Mono — the previous default — already had ligatures, which is worth recording
because it means ligatures alone were never the reason to switch.

## How to honour it

A consumer wanting Dank Mono sets, in its own CSS, from its own licensed copy:

```css
@font-face {
  font-family: "Dank Mono";
  src: url("/fonts/DankMono-Regular.woff2") format("woff2");
}

:root {
  --font-mono: "Dank Mono", "Victor Mono", ui-monospace, monospace;
}
```

That is the whole override — one custom property, because `--font-mono` is a runtime
variable rather than a build-time constant. Keep Victor Mono in the stack so the app
degrades to a ligature mono rather than to the system default.

**Do not add Dank Mono to `packages/tokens/fonts/` or to any `.gitignore`-plus-script
arrangement in this repo.** The preview used exactly such a script during the bake-off;
it was deleted with the rest of the scaffolding, and reintroducing it would put the
question one careless `git add -f` away from being answered wrongly.

## Related

[The shipped fonts are Baloo 2, Outfit and Victor
Mono](2026-07-30-the-shipped-fonts-are-baloo-outfit-victor-mono.md) ·
`docs/2026-07-30-m5-font-candidates.md`
