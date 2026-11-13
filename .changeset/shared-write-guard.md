---
"@charcuterie/server": minor
---

Add `createWriteGuard` and `createBodyLimit`. The guard refuses cross-site writes: it checks `Host` against an allowlist (an empty list refuses writes), requires a same-origin `Origin` and `Sec-Fetch-Site` on writes, and refuses `text/plain` and other non-JSON bodies unless the app's client header is present. `createBodyLimit` wraps `hono/body-limit` with a JSON `413`, so a route never reads more than its limit.
