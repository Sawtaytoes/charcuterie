# `streams` is a browser package, and push-only

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Scope
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/streams` owns exactly one thing: **server-pushed data arriving in a browser** —
SSE and WebSocket adapters, and the operators over them (backoff, grace windows,
connection-state projection, cancellation).

It does **not** own, now or later:

| Not in `streams` | Owner today |
| --- | --- |
| Fetching, caching, request-retry | `@tanstack/react-query@^5.100.9` — already in `rip-deck/packages/web` and `mux-magic/packages/web` |
| Job / sequence / task orchestration | mux-magic's `api` + `@mux-magic/tools` |
| MQTT, in any form | Node. `plex-channels/server/src/mqttc.js`, `castkit/packages/server/src/mqtt/publisher.ts` |
| Server-side SSE *emission* | Belongs in `@mux-magic/tools` |
| Progress semantics | A payload shape, not a transport |

This **revises the plan's M7 sketch**, which proposed pipeline operators and an MQTT
request-response operator. Both are struck.

## Context

The plan's M7 sketch was written before anyone read the transport code. Reading it moved
three facts.

**The fleet's RxJS is Node, not browser.** `rxjs@^7.8.2` is declared in 12 packages across 5
repos and imported by 266 source files — of which **all but image-viewer's 20 renderer files
are server or daemon code**. `mux-magic/packages/web`, `castkit/packages/slatecast`,
`castkit/packages/web` and `rip-deck/packages/web` import it in **zero** files between them.
So "extract the RxJS layer" and "fix the duplicated stream clients" are two different
projects in two different runtimes that happen to share a library.

**The pipeline half isn't duplicated.** It is `jobRunner.ts` + `sequenceRunner.ts` +
`taskScheduler.ts`, 1 465 lines welded to `jobStore`, `withJobContext`'s `AsyncLocalStorage`,
per-job thread claims and webhook reporting. One implementation, one repo, no copies.

**MQTT has no browser caller.** plex-channels' browser speaks SSE to plex-channels' server,
which speaks MQTT onward. That is the correct shape and nothing proposes changing it.

## Why

**A package that spans two runtimes serves neither.** The Node half's constraints are
`AsyncLocalStorage`, process-wide thread pools and file handles; the browser half's are
bundle budget, teardown on unmount and a 60 KB gz ceiling on a Preact kiosk. One package
answering to both would carry every Node import into a bundler, which is the failure
[tokens being a separate zero-dependency package](2026-07-29-tokens-is-a-separate-zero-dependency-package.md)
already exists to prevent.

**Duplicating an existing owner is the opposite of the library's argument.** rip-deck has
already *tuned* react-query — retries off, because its default backoff *"would keep a stale
card on screen for tens of seconds after the daemon came back."* A charcuterie package that
retried requests would be a second answer to a question two apps have answered, inside a
library whose whole premise is that there should be one.

**An operator with no callers is not a design, it's a guess.** The MQTT request-response
correlator exists once — plex-channels publishes to `plex-channels/cmd/…` and holds a
`pendingPreviews` Map keyed by reply topic under `plex-channels/resp/preview`. One
implementation is not duplication, and generalizing from one example produces an abstraction
shaped like that example. If a second Node service needs it, it belongs in a Node package
next to the first one.

**The extraction cost is already documented, in the direction that says don't.**
`taskScheduler.ts` takes `getActiveJobId` by injection with a comment saying it does so *"to
keep `@mux-magic/tools` free of server imports."* That extraction was already attempted at
the right layer in the right package and it cost a seam. Repeating it one repo further away
buys nothing and pays again.

## Evidence

Measured 2026-07-31 across `/mnt/TrueNAS-Apps/Repos`.

`rxjs@^7.8.2` declarations: mux-magic (`core`, `api`, `tools`, `cli`), gallery-downloader
(`shared-tools`, `web-server`, `sync-scheduler`, `sync-manga`, `download-web-images`),
rip-deck (`daemon`), castkit (`server` — two files, both only `timer`), image-viewer (root).
Source-file counts: mux-magic 201, gallery-downloader 36, image-viewer 20, rip-deck 7,
castkit 2. Browser packages: 0.

TanStack Query: `rip-deck/packages/web/package.json:18`,
`mux-magic/packages/web/package.json:29`, both `^5.100.9`. The tuning comment is
`rip-deck/packages/web/src/components/AppProviders.tsx:26-32`.

MQTT: `plex-channels/server/src/mqttc.js:15-17` (topic constants), `:31` and `:72-76` (the
`pendingPreviews` correlation); `castkit/packages/server/src/mqtt/publisher.ts`. Neither
repo's browser code imports an MQTT client.

Pipeline size: `mux-magic/packages/api/src/api/sequenceRunner.ts` 861 lines,
`jobRunner.ts` 192, `mux-magic/packages/tools/src/taskScheduler.ts` 412. The injection
comment is `taskScheduler.ts:14-17`.

Full inventory: [the M7 design doc](../2026-07-31-m7-streams-design.md).
