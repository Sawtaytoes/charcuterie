---
"@charcuterie/server": patch
---

A miss under `immutablePathPrefixes` never gets the SPA shell, with or without `serverPathPrefixes`. Before, without `serverPathPrefixes`, an extensionless miss such as `/assets/gone` or `/manage/assets/` got the shell, and because the cache bucket follows the request path, that HTML went out `public, max-age=31536000, immutable`. It is now a 404 that falls through to the app, like a missing hashed file. `getIsShellPath` applies the same rule.
