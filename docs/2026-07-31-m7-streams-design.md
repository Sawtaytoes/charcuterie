# M7 — `@charcuterie/streams`, the push-transport kit

**Date:** 2026-07-31
**Status:** **Design only. No code, no package, no placeholder publish.** This milestone's
deliverable is this document and the four decision records it points at.
**Was called:** `@charcuterie/rx` — renamed, see
[the rename ADR](decisions/2026-07-31-the-rxjs-kit-is-named-streams-not-rx.md).

**Supersedes the plan where they disagree.** The plan's M7 sketch is four bullets written
before anyone read the transport code. Three of the four survive contact with it. One does
not, and the package's runtime is not what the sketch assumed.

## What the plan asked for, and what the code says

The plan
(`agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`, "M7 sketch")
proposed four candidate contents and one seed:

| Plan's candidate | Verdict after reading the fleet |
| --- | --- |
| SSE + WebSocket → Observable adapters | ✅ **The whole package.** Six hand-rolled clients across four repos, no two alike. |
| Retry/backoff, cancellation, progress streams | ✅ **Keep retry/backoff and cancellation.** Four independent backoff schedules. *Progress* is not transport — drop it. |
| Pipeline operators generalizing mux-magic's sequence-step model | ❌ **Not extractable, and not duplicated.** See below. |
| An MQTT `cmd/*` / `resp/*` request-response operator | ⚠️ **Right idea, wrong package.** MQTT in this fleet is server-side only. It cannot live in a browser package. |
| `@mux-magic/tools` is the seed | ❌ **It is the *counterexample*.** It already solves the Node half, cross-repo, today. |

## The duplication that is real

### Six browser clients, four repos, no two alike

| # | Repo | File | Transport | What it does that the others don't |
| --- | --- | --- | --- | --- |
| 1 | mux-magic | `packages/web/src/hooks/useTolerantEventSource.ts` (78 lines) + `useSseStream.ts` (35) | SSE | A 5 s **grace timer** so a blip never reaches the UI; callback refs so handler identity doesn't resubscribe |
| 2 | mux-magic | `packages/web/src/hooks/useLogStream.ts` (158 lines) | SSE | **`lastEventId` dedup** against server replay-from-0; connects on demand, not on mount; closes itself on a terminal frame |
| 3 | plex-channels | `web/app.js:2394` | SSE | **Three named events** (`data`, `now`, `state`) rather than `onmessage`; defers repaint while a drag is in flight |
| 4 | gallery-downloader | `packages/web-server/public/jobs/script.js:150` | SSE | Shows a disconnect banner on the first `error` |
| 5 | gallery-downloader | `packages/web-server/public/reload-on-restart.js:104` | SSE | Treats reconnect itself as the signal — a changed `bootId` means reload the page |
| 6 | castkit | `packages/slatecast/src/state.ts` | WebSocket | Everything above, hand-rolled: retry loop, `isStopped` teardown flag, a `try/catch` around `new WebSocket` because the constructor throws synchronously offline |

Each one is a defensible local decision. Together they are six answers to the same four
questions — *when am I disconnected, when do I say so, what do I do about it, and how do I
stop* — and the differences are not preferences, they are **bugs the others still have**:

- Only #2 dedups on `lastEventId`. #1, #3, #4 and #5 will re-append replayed frames if their
  server ever replays.
- Only #1 has a grace window. #4 shows "Disconnected" on a blip that `EventSource` has
  already recovered from by the time the banner paints.
- Only #6 guards a synchronously-throwing constructor. Its own comment says why: left
  unhandled, the throw escapes the retry timer's callback and **the reconnect loop dies for
  good** — on a wall display nobody can reach.
- #1, #3, #4 and #5 inherit `EventSource`'s built-in reconnect, which is unconfigurable;
  #6 had to write its own because `WebSocket` has none. That asymmetry is invisible at every
  call site and is exactly what an adapter should erase.

### Four backoff schedules

| Where | Schedule |
| --- | --- |
| `castkit/packages/slatecast/src/state.ts` | 1 000 ms, doubling, capped at 15 000 ms, **forever** — a kiosk must self-heal |
| `mux-magic/packages/core/src/api/jobErrorDeliveryStateMachine.ts` | An explicit `BACKOFF_SCHEDULE_MS` array, capped at 60 minutes |
| `rip-deck/packages/contracts/src/supervision.ts` | `SUPERVISION.restartBackoffMs`, indexed by attempt |
| `rip-deck/packages/daemon/src/rip/identifyDisc.ts` | Flat 1 500 ms |

Four schedules is not four too many — a kiosk and a webhook reporter genuinely want
different curves. **Four implementations of the same doubling-and-capping arithmetic is.**

### One file, byte-identical, in two repos that already share a package

`sseKeepalive.ts` — 40 lines — is **byte-identical** in
`mux-magic/packages/api/src/api/` and `gallery-downloader/packages/web-server/src/`.

That is the sharpest fact in this document, because those two repos **already share code**:
gallery-downloader depends on `@mux-magic/tools@^1.2.2` from npm in five of its packages.
The mechanism for not duplicating this file existed, was already wired up, and the file was
copied anyway.

The lesson is not "charcuterie should own SSE keepalive." It is that **a package nobody
reaches for does not prevent duplication**, and M7 has to answer why `streams` would be
reached for when `tools` wasn't.

## The duplication that is not real

### The RxJS pipeline half is mux-magic's architecture, not shared plumbing

RxJS is everywhere in this fleet — `^7.8.2`, no drift, **12 declarations across 5 repos**:

| Repo | Packages declaring `rxjs` | Source files importing it |
| --- | --- | --- |
| mux-magic | `core`, `api`, `tools`, `cli` | 201 (`core` 157, `api` 23, `tools` 18, `cli` 3) |
| gallery-downloader | `shared-tools`, `web-server`, `sync-scheduler`, `sync-manga`, `download-web-images` | 36 |
| rip-deck | `daemon` | 7 |
| image-viewer | root (Electron) | 20 |
| castkit | `server` | 2 — both of them just `timer` |

Read the runtime column instead of the total. **Every one of those 266 files is Node,
except image-viewer's 20, which are the renderer.** `mux-magic/packages/web`,
`castkit/packages/slatecast`, `castkit/packages/web` and `rip-deck/packages/web` import
`rxjs` in **zero** files between them.

So "generalize mux-magic's sequence-step model" means extracting `jobRunner.ts` +
`sequenceRunner.ts` + `taskScheduler.ts` — 1 465 lines that are welded to `jobStore`,
`withJobContext`'s `AsyncLocalStorage`, per-job thread claims and webhook reporting. Not
transport. Not duplicated anywhere. **mux-magic's job engine, correctly living in mux-magic.**

And `taskScheduler.ts` already shows what happens when you try: it carries a comment
explaining that it takes `getActiveJobId` by injection *"to keep `@mux-magic/tools` free of
server imports."* That extraction was attempted, at the right layer, in the right package,
and it cost an injection seam. Doing it again one repo further away buys nothing.

### Request/response already has an owner

`@tanstack/react-query@^5.100.9` is a dependency of both `rip-deck/packages/web` and
`mux-magic/packages/web`. rip-deck has already tuned it — retries off, because its state
feed polls and react-query's backoff *"would keep a stale card on screen for tens of
seconds after the daemon came back."*

A charcuterie package that fetches, caches or retries requests would be a second answer to a
question two of the fleet's apps have already answered, in a library whose entire argument
is that there should be one.

### MQTT is not in the browser

The house rule is that services talk over MQTT, and they do — `plex-channels/server/src/mqttc.js`
is the fleet's only request-response correlator (`plex-channels/cmd/…` published, a reply
topic under `plex-channels/resp/preview` held in a `pendingPreviews` Map keyed by topic),
and castkit publishes through `packages/server/src/mqtt/publisher.ts`. Both are **Node**.

plex-channels' *browser* does not speak MQTT. It speaks SSE to its own server, which speaks
MQTT onward. That is the correct shape and nothing proposes changing it — which means an
MQTT operator in a browser package would have **no callers**. It belongs Node-side, and with
exactly one implementation in existence it is not yet duplication anyway.

## Runtime, budget, and the M5b trap

M5b's finding was *"the component layer does not reach a Preact consumer"* — `@charcuterie/ui`
is React, slatecast is Preact, so every shape slatecast duplicates is one it cannot consume.
`streams`' most likely consumer is **slatecast**, the worst-behaved client in the table. If
the package can't reach it, M7 has designed the same failure twice.

Two things had to be true. Both were measured rather than assumed.

**Budget.** slatecast is 19.7 KB gz of a 60 KB ceiling — 40.3 KB of headroom. RxJS 7.8.2,
bundled with esbuild (`--bundle --minify --format=esm`) and `gzip -9`:

| Import surface | gz |
| --- | --- |
| `Observable, timer, retry, map, filter, switchMap` | **5 952 B** |
| A realistic transport set — 20 symbols incl. `Subject`, `switchMap`, `share`, `timeout`, `takeUntil`, `finalize` | **8 342 B** (26 822 B raw) |
| `import * as rxjs` — the whole library, nothing shaken | **18 465 B** |

Even the un-tree-shaken whole library fits in slatecast's headroom twice over. **The budget
objection to RxJS in the browser does not survive measurement**, and the un-shaken figure
is the one that matters: it is the worst case if a consumer's bundler gives up.

**Bindings.** `@charcuterie/logic` already reaches slatecast, through
`createStoreFromSignals` — store injection rather than a framework dependency
([ADR](decisions/2026-07-29-store-injection-not-a-jotai-dependency.md)). castkit's WebSocket
loop already drives `logic`'s shared `ConnectionStatus` machine today. `streams` copies that
seam exactly, and produces the states that machine already names.

## Sketch of the surface

Illustrative, not a spec — the shapes are named after the behaviour observed above so each
one has a citation.

**Core (framework-free, RxJS):**

- `fromEventSource({ url, events, isEnabled })` — named events (#3), `lastEventId` dedup
  (#2), JSON parse that drops malformed frames rather than throwing (#1, #4, #6 all do this
  separately), teardown on unsubscribe.
- `fromWebSocket({ url })` — the same contract over `WebSocket`, including the synchronous
  constructor throw (#6) and an outbound send channel.
- `retryWithBackoff({ initialDelayMs, maxDelayMs, resetAfterConnectedMs })` — one operator,
  every schedule in the table above expressible as arguments.
- `withGrace(ms)` — suppress a disconnect until it has lasted (#1), the difference between
  a banner and a flicker.
- `connectionStatus()` — projects a connection into `ConnectionStatus` from
  `@charcuterie/logic/core`, including the guard castkit had to write by hand because
  `reconnecting → reconnecting` is legitimately not a transition.
- `pauseWhile(isBusy$)` — hold frames while a gesture is in flight (#3). Presentation-only
  streams opt out.

**Bindings, mirroring `logic`:** `@charcuterie/streams/react` and
`@charcuterie/streams/signals`. Nothing framework-specific in the core entry point.

**Dependency direction**, extending the CI-enforced `tokens ← logic ← ui`:
`tokens ← logic ← streams`. `streams` may read `logic/core`; `ui` must not import `streams`,
and `streams` must never import `ui` — a transport package that pulls in a stylesheet is
how the Preact consumer gets locked out again.

## What it does not own

Fetching, caching, request retry (TanStack Query) · job/sequence orchestration
(`@mux-magic/tools`, mux-magic's `api`) · MQTT (Node, and single-implementation) ·
server-side SSE emission — `sseKeepalive.ts` is 40 duplicated lines that belong in
`@mux-magic/tools`, which both repos already depend on · progress semantics, which are a
payload shape, not a transport.

## Open questions for whoever builds it

1. **Why would this get reached for when `@mux-magic/tools` wasn't?** The honest answer is
   probably "because a consumer milestone forces it," which is the same mechanism that got
   `ui` adopted. It should not be assumed.
2. **Does `@charcuterie/ui` gain a `ConnectionIndicator`?** castkit wired `ConnectionStatus`
   and rendered nothing. Four repos compute connection state and three display it
   differently. That is a `ui` question M6 could answer without `streams` existing.
3. **Does image-viewer's hand-rolled redux-observable come along?** 20 renderer files, a
   `createReduxObservable`, hot-reloadable epics. It is the fleet's only real browser RxJS
   architecture and it is either the best evidence for this package or entirely out of scope.
4. **Which consumer proves it?** On the M5/M5b pattern it should be **slatecast** — worst
   client, tightest budget, hardest framework. If `streams` is designed against anything
   else it will not reach it.

## Build it after 1.0.0, not before

1.0.0 is cut at the end of M6
([ADR](decisions/2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md)), and it is a claim that
the API survived contact with every consumer. `streams` has not met a consumer. Building it
inside the milestone that stabilises the others would either delay that claim or extend it to
a package with zero users.

Written, not built, is the right outcome — and now it is written against the code rather than
against a guess.

## Decision records this milestone produced

- [The RxJS kit is named `streams`, not `rx`](decisions/2026-07-31-the-rxjs-kit-is-named-streams-not-rx.md)
- [`streams` is a browser package, and push-only](decisions/2026-07-31-streams-is-a-browser-package-and-push-only.md)
- [`streams` ships Observables and injected bindings, not hooks](decisions/2026-07-31-streams-ships-observables-and-injected-bindings.md)
- [`streams` is built on RxJS, and the budget objection was measured](decisions/2026-07-31-streams-is-built-on-rxjs.md)
