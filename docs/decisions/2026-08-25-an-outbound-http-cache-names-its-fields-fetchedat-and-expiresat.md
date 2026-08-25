# An outbound HTTP cache names its fields `fetchedAt` and `expiresAt`

**Status:** Accepted
**Date:** 2026-08-25
**Type:** Naming / API shape
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/server/http` uses one vocabulary, and every app that adopts it uses the same
one. The database spelling and the JavaScript spelling are both fixed, and the mapping
between them is `snake_case` to `camelCase` with no other change.

| Concept | DB column | JS field | Why this word |
| --- | --- | --- | --- |
| When the response was received | `fetched_at` | `fetchedAt` | It is an HTTP **fetch**. |
| When the answer stops being trusted | `expires_at` | `expiresAt` | The standard word, and already in use. |
| The validator | `etag` | `etag` | A protocol term. It keeps the protocol's spelling. |

Two rules decide every field not in that table:

1. **No `Ms` suffix on a `*At` field.** `_at` already means "a moment in time" throughout
   this fleet, and the unit belongs to the type rather than to the name. `fetchedAtMs` and
   `lookedUpAtMs` are both wrong and both are migrating to `fetchedAt`.
2. **A duration keeps its `Ms` suffix.** A duration is not a timestamp and its unit is
   genuinely ambiguous: `minIntervalMs`, `windowMs`, `cooldownMs`, `missLifetime` in
   milliseconds.

The three politeness bounds are three different measurements and keep three different
names. They are never collapsed into one "rate limit":

- `minIntervalMs` — the minimum gap between two requests.
- `maxConcurrent` — how many may be in flight at once.
- `maxPerWindow` + `windowMs` — a budget that refills.

`Lifetime` keeps its three cases — `"immutable"`, a number of milliseconds, and `"none"` —
as a discriminated value rather than as three booleans.

Booleans take the fleet's `is` / `has` prefix, which is why a stale-while-revalidate read
returns `isStale` and not `stale`.

## Context

Five owned apps fetch third-party HTTP and cache the responses: docket, queuepilot,
mux-magic, board-game-picker and rip-deck. Four of them hand-rolled it before the fifth
did, and Charcuterie had nothing for it. The fleet rule is that a shared shape is built
here first, so the policy is moving into `@charcuterie/server/http`.

The five apps had five vocabularies for the same two facts:

| App | "when we got it" | "how long it lasts" |
| --- | --- | --- |
| docket | `fetched_at` / `fetchedAt` | `expires_at`, `"immutable"` / ms / `"none"` |
| queuepilot | `fetched_at` | `LEAVES_TTL_MS`, `SECTION_SOFT_MS`, `stale` |
| mux-magic | the file's `mtime` | `ANIME_TTL_MS` |
| board-game-picker | the file's existence | forever, plus a `--force` flag |
| rip-deck | `lookedUpAtMs` | `negativeTtlMs`, `unavailableCooldownMs` |

A library cannot carry five. The owner settled which one:

> "Is this a DB field? I think those use underscores. If it's a JS field, it should be
> camelCase."

Both, and the mapping is the one docket already does. He also settled why the choice is
worth writing down rather than just making:

> "If I ever wanna change it, we change it."

That is a request for the reasoning, not only the answer — a record that says *what* is
chosen cannot be argued with later, and a record that says *why* can.

## Why

**`fetchedAt` says what happened.** The alternatives each say something slightly false.
`lookedUpAt` sounds like a local lookup, in a field whose entire purpose is to record that
we went out to somebody else's server. `cachedAt` describes our storage rather than the
answer's age, and the age is the thing every consumer computes from it. `cachedAtMtime`
leaks the substrate — it is only meaningful for the two apps that store a file per key,
and the library is deliberately substrate-free.

**`_at` is already the fleet's word for a timestamp, and the sample is large.** Docket's
own schema carries `archived_at`, `created_at`, `deleted_at`, `done_at`, `due_at`,
`expires_at`, `fetched_at`, `stale_at`, `start_at` and `updated_at`. Ten columns, one
convention, no `Ms` anywhere. A library that introduced `fetchedAtMs` would make itself the
odd one out in the schema of its own first consumer.

**The unit belongs to the type.** `fetchedAt` is typed `Timestamp`, which is
`number | string` — epoch milliseconds, or an ISO string, whichever spelling the caller's
store already holds. That union is what lets one policy read a SQLite `TEXT` column and a
JSON number without either app converting on every row. A name that pins the unit would be
false for half the callers.

**A duration is the opposite case, so it gets the opposite rule.** `minInterval` alone
gives no clue whether it is seconds or milliseconds, and the fleet has both — AniDB's
published cap is stated in seconds and implemented in milliseconds. `Ms` earns its place
there and does not on a `*At`.

**Three bounds, three names, because they are three different quantities.** One request per
second permits 3600 an hour. A 60-an-hour budget permits three in the first second. A
concurrency cap of three permits neither number and bounds sockets instead of time. Every
one of the three exists in the fleet today — mux-magic waits 2500 ms between AniDB calls,
rip-deck allows three poster lookups at once, GitHub gives docket 60 an hour per source
address — so a single `rateLimit` field would have to be reinterpreted per app, which is
the state the library exists to end.

## Evidence

- Owner, 2026-08-25, on the field spelling: *"Is this a DB field? I think those use
  underscores. If it's a JS field, it should be camelCase."*
- Owner, 2026-08-25, on recording the reasoning: *"If I ever wanna change it, we change
  it."*
- The `<verb>_at` convention, counted in docket's schema: `archived_at`, `created_at`,
  `deleted_at`, `done_at`, `due_at`, `expires_at`, `fetched_at`, `stale_at`, `start_at`,
  `updated_at`.
- The two field names being retired: mux-magic and board-game-picker infer the fetch time
  from a file `mtime`; rip-deck's `posterCache.ts` stores `lookedUpAtMs`.
- The `is` / `has` rule is already binding here
  ([2026-07-29](2026-07-29-is-has-rule-has-no-external-api-carve-out.md)), which is why
  queuepilot's `{ payload, stale }` becomes `isStale`.
