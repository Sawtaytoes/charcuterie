---
"@charcuterie/ci": minor
---

`charcuterie-requirements` now hashes whole files, found through esbuild's import graph,
instead of resolving imports by hand and hashing single declarations. The lock moves to
version 2: files every scenario loads are listed once under `shared`, and each
requirement lists only the files its step files add. Adding a component no longer marks
existing requirements as changed. The `packages` config field is gone, because workspace
packages are followed through `node_modules`. The `quickpickle` hook ban and the glob,
JSX pragma, and `import()` rules now apply to every loaded file. `which` prints the
helpers a definition calls and the files its step file loads. A version 1 lock on the base
branch is still read by `diff`. Run `charcuterie-requirements lock` once to upgrade.
