---
"@charcuterie/server": minor
---

Add `@charcuterie/server/paths`, a framework-free entry with `getIsShellPath`, `getIsServerPath`, and the cache-policy helpers. `getIsShellPath({ pathname, serverPathPrefixes, immutablePathPrefixes })` is the rule `createStaticHandler` applies to a GET or HEAD miss, so a plain `node:http` server can share the SPA fallback without loading Hono. `createStaticHandler` now uses it, with no change in behavior. The main entry also exports `getIsShellPath`.
