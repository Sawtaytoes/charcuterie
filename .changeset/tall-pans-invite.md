---
"@charcuterie/server": minor
---

Add `@charcuterie/server/http` — outbound HTTP cache policy and a politeness throttle,
over a read/write pair the caller supplies.

Five owned apps fetch third-party HTTP and cache the responses, and no two of them share a
substrate. So the library takes the **policy** and never the store: `createHttpCache` reads
and writes through two functions the app provides, which may be synchronous.

- `resolveCacheDecision` — a pure function. `"use"` (no request, the only outcome that
  saves a rate-limit budget), `"revalidate"`, or `"fetch"`.
- Lifetime is `"immutable" | "none" | number`, set per call site.
- `createThrottle` — `minIntervalMs`, `maxConcurrent`, `maxPerWindow` + `windowMs`, and a
  provider-wide `cooldownMs`. `run` queues for a slot; `tryRun` returns `null` instead, for
  a caller on a poll loop. A slot is claimed before the task starts, so concurrent callers
  are spaced like sequential ones.
- Conditional revalidation, negative caching (`missLifetime`), stale-while-revalidate,
  single flight, and store errors that degrade to a miss rather than throwing.

⚠️ A 304 saves the transfer and **not** the budget. Measured against the live GitHub API:
`x-ratelimit-remaining` falls on every conditional request. GitHub's documented exemption
is for the *primary* limit, and the unauthenticated per-address limit is not that limit.
