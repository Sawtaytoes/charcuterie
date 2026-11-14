---
"@charcuterie/server": minor
---

`@charcuterie/server` no longer names Vite as a dependency of any kind. `vite` was an
optional peer for the `/vite` entry point, and pnpm links an optional peer to the
workspace's own Vite and records it in the lockfile, so a `pnpm install --prod` of an app's
server installed Vite, Rolldown, and their native binaries, about 20 to 30 MB the server
never loads. `precompressAssets()` now returns its own `PrecompressAssetsPlugin` type, which
the app's `vite.config.ts` still checks against Vite's `Plugin`. The import path and the
plugin are unchanged, so an app's dev server and build need no change. After the upgrade, an
app can delete any Dockerfile step that removed Vite from the runtime image by hand.
