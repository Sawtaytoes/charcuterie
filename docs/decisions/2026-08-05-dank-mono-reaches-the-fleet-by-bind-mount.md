# Dank Mono reaches an app by a read-only bind mount, not a font server and not the repo

**Status:** Accepted
**Date:** 2026-08-05
**Type:** Packaging + Licensing + Deployment
**Supersedes:** —
**Superseded by:** —

## Decision

An app that wants **Dank Mono** as its mono (the owner's editor font, and his stated
preference over the shipped Victor Mono) gets the woff2 by **bind-mounting the licensed
copy off the NAS into the container at deploy time** — read-only — and serving it from its
own origin. The font file enters **no git repository** (public or private) and **no CI
image**, and there is **no shared font server**.

The licensed archive lives at
`/mnt/Bunnies/Kevin/Apps/Fonts/Development/DankMono/Web-PS/` (Regular / Italic / Bold
woff2). The mount points it at the path the app already serves static assets from — e.g.
for a TrueNAS custom-compose app:

```yaml
volumes:
  - /mnt/Bunnies/Kevin/Apps/Fonts/Development/DankMono/Web-PS:/app/public/fonts:ro
```

and the app adds, in its own CSS, one `@font-face` and one `--font-mono` line:

```css
@font-face {
  font-family: "Dank Mono";
  src: local("Dank Mono"),
    url("/fonts/DankMono-Regular.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Dank Mono";
  src: local("Dank Mono"), url("/fonts/DankMono-Italic.woff2") format("woff2");
  font-weight: 400; font-style: italic; font-display: swap;
}
@font-face {
  font-family: "Dank Mono";
  src: local("Dank Mono"), url("/fonts/DankMono-Bold.woff2") format("woff2");
  font-weight: 700; font-style: normal; font-display: swap;
}

:root {
  --font-mono: "Dank Mono", "Victor Mono", ui-monospace, monospace;
}
```

Keep Victor Mono in the stack: a machine that never mounts the font (a fresh checkout,
`yarn dev` without the mount, CI) degrades to a ligature mono, not the system default.
`local("Dank Mono")` first means a box that already has the font installed — the owner's
Windows machines — never fetches it at all.

The gitignored path that receives the mount is committed as an empty target
(`public/fonts/.gitignore` → `*` + `!.gitignore`, or the app's existing convention) so the
mount point exists in a clean tree; **no woff2 is ever added, even with `git add -f`.**

## Context

[The shipped mono is Victor Mono](2026-07-30-the-shipped-mono-is-victor-mono.md) settled
that `@charcuterie/tokens` ships Victor Mono (OFL) and that consumers wanting Dank Mono
"override `--font-mono` locally and load their own licensed copy." What that record did
**not** answer is *how the file gets into the app* — its snippet
(`url("/fonts/DankMono-Regular.woff2")`) silently assumes the file is already sitting in
the app's `public/`, which for most of this fleet it is not and must never be. This record
answers the how.

The constraint that shapes the answer, from the purchased `EULA.txt` in that same archive:

> The licensee may install and use the font on any number of devices, websites, or use the
> font on any other media, as long as they are solely responsible for said media.

…so **serving it from our own sites is squarely the granted use** — every commercial
webfont works this way, and the vendor ships a `dmvendor.css` for exactly it. But:

> The licensee may not make a copy of the font, with the exception of personal archival
> purposes only […] not to modify, edit, alter, reverse engineer, re-license,
> **re-distribute**, create derivatives of, or sell the font.

Half the consumers are **public GitHub** repos (`castkit`, `image-viewer`, `mux-magic`,
`plex-channels` — confirmed with `gh repo view … visibility`); the rest are private
Forgejo. Committing the woff2 would put an installable paid font in front of anyone who
clones — redistribution — and the public/private split means "just commit it to the
private ones" leaves the fleet rendering inconsistently. So the file has to reach the app
**without passing through git at all**, which rules the repo out for every app, not just
the public ones. Buying the **Commercial Licence** (+£35 on Gumroad, still for sale) does
**not** help: it lifts the personal-use limit, which is orthogonal to the copying /
redistribution clause — a commercial licence still would not permit the file in a public
package.

CI is not a factor either, and this is the load-bearing observation: the fleet's images
are built by CI (GitHub for the public apps — **off-LAN**, so a build-time copy off the NAS
is impossible there anyway) but the **volumes are attached on the NAS at `app.create`
time**, not baked into the image (see any consumer's `deploy/docker-compose.yaml`, e.g.
`rip-deck`). The mount is a deploy-host concern, wholly downstream of whoever built the
image.

Everything the fleet runs is already LAN-only — public DNS for `*.octen.dev` hands out
`10.1.0.6` (an RFC1918 address; verified against Google's public resolver). So "the app
hosts it, same-origin" is reachable by the owner's phone on the same LAN, and is never
exposed publicly. That is the owner's stated preference: *"I'd prefer the app hosts it."*

## Why a bind mount and not a font server

A shared font host (`fonts.octen.dev`) would work and is one config point instead of N.
It was rejected: **it stands up a service the fleet otherwise has no need for, just to
serve one font**, and couples every app's mono rendering to that service's uptime and to
cross-origin (`crossorigin` on the `<link>`, CORS headers on the host). The owner's
framing: *"I don't think a font host is gonna be better … we're not tying my personal font
server to this just for Dank Mono. Mounting a volume is something any app can do easily."*
A bind mount adds **no standing service and no new failure mode** — it is a line in a
compose file that every app already knows how to write, and the font is exactly as
available as the app referencing it.

It also sidesteps the copying clause more cleanly than any alternative: a **read-only bind
mount makes zero copies** of the file — the container reads the one archived original in
place. Baking the file into the image would make a copy per build; a font host would make
one on the host. The mount makes none.

## What this looks like per app

- **TrueNAS custom-compose apps** (`rip-deck`, and the shape the others follow): add the
  `:ro` volume line above to `deploy/docker-compose.yaml`, mounting onto whatever path the
  app serves static assets from. Confirm the static server's content-type map answers
  `.woff2` → `font/woff2` (rip-deck's `webAssets.ts` already does).
- **Private Forgejo apps** could technically commit the file, but do **not** — one
  mechanism across the whole fleet is the point, and a public/private carve-out is the
  inconsistency this record exists to prevent.
- **image-viewer is the one exception.** It builds an offline **EXE**; there is no
  container and nothing to bind-mount. It gets the `local("Dank Mono")` half only, **no
  `url()`** — it picks up the owner's installed Windows copy and degrades to Victor Mono on
  any machine without it. No bytes ship, nothing is licensed into the artifact.

## What was rejected

- **Commit the woff2 into each app repo.** Redistribution for the four public repos;
  inconsistent if done only for the private ones. Rejected for the whole fleet.
- **Bake it into the image at build time.** The public apps build on off-LAN GitHub
  runners that cannot reach the NAS; and it makes a copy per build against the copying
  clause. Rejected.
- **Stand up `fonts.octen.dev`.** A standing service and a cross-origin coupling the fleet
  does not otherwise need, for one font. Rejected — see "Why" above. Reachable later if a
  second, unrelated font-hosting need ever appears; the name is right for that, not for
  this.
- **Buy the Commercial Licence to unlock committing it.** Orthogonal to the copying /
  redistribution clause; does not permit the file in a public package. Rejected.
- **Leave every app on Victor Mono.** That is the shipped default and stays the fallback,
  but the owner prefers Dank Mono and holds the licence; declining to deliver it is a
  non-answer.

## Evidence

- *"I'd prefer the app hosts it."* — the owner, on delivery.
- *"I don't think a font host is gonna be better. Also … we're not tying my personal font
  server to this just for Dank Mono. Mounting a volume is something any app can do
  easily."* — the owner, on the mechanism.
- `EULA.txt` in the licensed archive (quoted above): use-on-websites granted;
  copying/redistribution forbidden.
- `gh repo view Sawtaytoes/{castkit,image-viewer,mux-magic,plex-channels} --json
  visibility` → all `PUBLIC`.
- Public DNS for `plex-channels.octen.dev` → `10.1.0.6` via Google's resolver — the fleet
  is LAN-only, so "same-origin, app-hosted" is never a public exposure.

## Related

[The shipped mono is Victor Mono](2026-07-30-the-shipped-mono-is-victor-mono.md) ·
[The shipped fonts are Baloo 2, Outfit and Victor
Mono](2026-07-30-the-shipped-fonts-are-baloo-outfit-victor-mono.md)
