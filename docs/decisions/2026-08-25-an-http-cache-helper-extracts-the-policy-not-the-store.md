# An HTTP cache helper extracts the policy, not the store

**Status:** Accepted
**Date:** 2026-08-25
**Type:** Package / API shape
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/server/http` owns **no storage**. It is a lifetime policy plus a politeness
throttle, over a read/write pair the caller supplies:

```ts
store: {
  read: ({ key }) => CacheRecord | null,     // sync or async
  write: ({ key, record }) => void,          // sync or async
}
```

Three pieces, and each is usable alone:

- `resolveCacheDecision` — a pure function. Record in, one of `"use"` / `"revalidate"` /
  `"fetch"` out. No I/O, no clock of its own.
- `createThrottle` — the four politeness gates, with `run` (queues) and `tryRun` (gives up).
- `createHttpCache` — joins the two, and adds conditional revalidation, negative caching,
  stale-while-revalidate, single flight and a provider cooldown.

**Docket adopts it. queuepilot, mux-magic, board-game-picker and rip-deck are not being
migrated** in the same change; each is a separate decision for the owner.

## Context

Five owned apps fetch third-party HTTP and cache the responses. The freshness rules and the
politeness bounds were written five times. The substrates were not the same twice:

| App | Store | Freshness | Politeness bound |
| --- | --- | --- | --- |
| docket | SQLite `host_responses` | `"immutable"` / ms / `"none"` per call site | per-host budget read off the response, replays `if-none-match` |
| queuepilot | SQLite, five tables | validator identity, fixed TTL, soft TTL + stale-while-revalidate | — |
| mux-magic | one JSON file per key, twice | 7-day TTL, off the file's `mtime` | 1 request per 2.5 s, AniDB's published cap |
| board-game-picker | one JSON file per BGG id | forever, manual `--force` | 1 request per second |
| rip-deck | memory `Map` written through to a file | a match never expires; a miss lasts 7 days | max 3 in flight, 5-minute cooldown |

Two SQLite, two file-per-key, one memory-plus-file.

## Why

**The substrate does not repeat, so lifting it would help two apps and hurt three.**
Docket's `host_responses` is the freshest of the five and the obvious thing to promote. It
would fit docket and queuepilot. It would force mux-magic to take on SQLite for a CLI that
today needs nothing but a directory, force board-game-picker to migrate a cache a nightly
cron already writes, and force rip-deck to give up the memory `Map` that exists precisely
so its `/json` handler can stay synchronous — a handler that waits on a database turns nine
bays' telemetry into whatever the query latency is. Three migrations that buy nothing.

**What repeats is two questions, and neither touches a disk.** How long is this answer
still true, and how often may we ask. Every one of the five answers both, in its own words.
That is the shape worth having in one place.

**Each substrate choice is defensible where it sits, and the library should not have an
opinion about it.** rip-deck's file is `posters.json` for a reason its own header gives:
losing it costs one repeat lookup, so an atomic temp-file rename is the whole durability
story it needs. board-game-picker's per-id files are what make a re-run free and a single
game re-fetchable by deleting one file. Neither is a worse choice than a table.

**The pure function is separate on purpose.** `resolveCacheDecision` holds all the rules and
none of the I/O, so a test for *"does a 40-character commit hash ever expire"* is three
lines and needs no fake server. It is also the piece an app can adopt on its own if the
orchestrator does not fit.

**`tryRun` exists because two callers have opposite deadlines.** A CLI walking 900 board
games wants to queue. rip-deck's poll loop, which runs every five seconds over nine bays,
wants to be told "no" and try again next tick — queueing there builds a backlog nine deep
every five seconds. One throttle, two entry points, rather than two throttles.

## Evidence

- The five implementations, read in full on 2026-08-25:
  `docket/packages/server/src/links/hostCache.ts` and `gitHosts.ts`;
  `queuepilot/server/src/cache.ts`;
  `mux-magic/packages/core/src/tools/anidbApi.ts`;
  `board-game-picker/packages/server/src/enrich/cache.ts` and `cli/linkVideos.ts`;
  `rip-deck/packages/daemon/src/metadata/posterStore.ts` and `posterCache.ts`.
- rip-deck's own header states the synchronous constraint: *"`api/router.ts`'s contract is
  that `/json` handlers are SYNCHRONOUS memory reads."*
- mux-magic's throttle comment states why a bare timestamp check is wrong under
  concurrency, and that AniDB bans for it. That reasoning is now the queue in
  `createThrottle`.
- Vocabulary: [2026-08-25](2026-08-25-an-outbound-http-cache-names-its-fields-fetchedat-and-expiresat.md).
