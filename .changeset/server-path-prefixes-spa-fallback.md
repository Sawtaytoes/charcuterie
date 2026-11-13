---
"@charcuterie/server": minor
---

Add `serverPathPrefixes` to `createStaticHandler`. When it is set, the SPA fallback serves the shell for every GET or HEAD miss outside those prefixes and outside `immutablePathPrefixes`, even a path with an extension, so a client route such as `/docs/README.md` survives a reload. A miss under a server prefix falls through to the app's 404, and a missing hashed asset stays a 404. This replaces the second, hand-written shell handler in Folio, Foyer, and Plinth. `getIsServerPath` exports the same segment-boundary test.
