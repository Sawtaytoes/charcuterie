---
"@charcuterie/server": minor
---

Add `rewriteRequestPath` to `createStaticHandler`, for a mount whose URL prefix is not a
real directory under `rootDir`.

`board-games` serves `/images/*` out of `$BOARD_GAMES_IMAGES`, which is nowhere near its
web root, so the prefix has to come off before the lookup:

```ts
app.use("/images/*", createStaticHandler({
  immutablePathPrefixes: ["/images/"],
  rewriteRequestPath: (path) => path.replace(/^\/images/, ""),
  rootDir: imagesDirectory(),
}))
```

The cache bucket is still decided on the **request** path rather than the rewritten one,
so `immutablePathPrefixes` keeps naming URLs as a caller sees them — rewriting is about
where bytes live on disk, caching is about what the browser was promised. The SPA fallback
is deliberately not rewritten: `serveStatic` ignores `rewriteRequestPath` whenever `path`
is set, so the shell always resolves against `rootDir` and a rewrite cannot misdirect it.

Came out of the consumer rather than the plan — the migration doctrine working as
intended.
