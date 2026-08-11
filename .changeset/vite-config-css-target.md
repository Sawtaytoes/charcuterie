---
"@charcuterie/vite-config": patch
---

Stop forcing `build.target: "esnext"`, which was silently dropping the `-webkit-` prefixes Safari needs.

Vite derives `build.cssTarget` from `build.target` when `cssTarget` is not given, so that one line made the CSS target `esnext` too — and at that level lightningcss stops emitting `-webkit-user-select` (so `select-none` does nothing), `-webkit-backdrop-filter` (blurred surfaces render flat) and `-webkit-text-decoration`. Every consumer lost them on adoption, with no build error.

Pinning `cssTarget` on its own is not possible: it takes esbuild-style browser strings and rejects Vite's keyword outright. So the base no longer sets `target` at all, and Vite's own browser-safe default applies to both JS and CSS. An app that genuinely wants `esnext` (an Electron renderer, say) sets it in its own override, where the choice is visible.

**Consumers should rebuild and confirm the prefixes are back** — `mux-magic` and `gallery-downloader` are the affected browser apps; `image-viewer`'s renderer is Chromium-only so it is unaffected in practice.
