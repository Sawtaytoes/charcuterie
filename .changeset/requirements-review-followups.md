---
"@charcuterie/ci": patch
---

`charcuterie-requirements` skips files git ignores, such as a workspace package's `dist`
build, so a checkout that ran `pnpm build` no longer reports a stale lock. It rejects
`new Worker()` without an inline `new URL(…, import.meta.url)` script, unless `Worker` is
a `?worker` import, and treats a CSS `url()` as an asset whatever its query.
