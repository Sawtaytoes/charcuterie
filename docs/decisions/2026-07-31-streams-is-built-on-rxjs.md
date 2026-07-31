# `streams` is built on RxJS, and the budget objection was measured

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Dependency
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/streams` takes **`rxjs@^7.8.2`** as a real dependency and exposes Observables
in its public API. It does not hand-roll an Observable, and it does not hide RxJS behind a
callback façade.

`^7.8.2` is not a fresh choice — it is the exact range the other 12 declarations in the
fleet already use. Do not introduce a second range.

This is the one place `streams` diverges from `@charcuterie/tokens`' zero-dependency rule,
and deliberately: `tokens` is zero-dep because Satori and a 60 KB Preact kiosk both need
values without a runtime. `streams` **is** a runtime.

## Context

The package is going into browsers that today contain no RxJS at all —
`mux-magic/packages/web`, `castkit/packages/slatecast`, `castkit/packages/web` and
`rip-deck/packages/web` import it in zero files between them. The obvious objection is
bundle size, and the obvious victim is slatecast, which is
[the intended first consumer](2026-07-31-streams-ships-observables-and-injected-bindings.md)
and lives under a 60 KB gz ceiling.

That objection was measured rather than argued. RxJS 7.8.2, bundled with esbuild
(`--bundle --minify --format=esm`), `gzip -9`:

| Import surface | gz |
| --- | --- |
| `Observable, timer, retry, map, filter, switchMap` | **5 952 B** |
| A realistic transport set — 20 symbols incl. `Subject`, `switchMap`, `share`, `timeout`, `takeUntil`, `finalize` | **8 342 B** (26 822 B raw) |
| `import * as rxjs` — the whole library, nothing shaken | **18 465 B** |

slatecast is **19.7 KB gz of 60** — 40.3 KB of headroom. Every row fits, including the
un-shaken one.

## Why

**The budget argument is the only serious argument against, and it loses to its own numbers.**
The figure that matters is 18 465 B, not 5 952 B: it is the worst case if a consumer's
bundler shakes nothing at all, and it still leaves slatecast 21 KB of room. Guessing at this
number is exactly how the ePaper palette got invented
([ADR](2026-07-31-epaper-is-exempt-from-the-contrast-gate.md)) — plausible values nobody
measured, five of six unrenderable. Transport is cheaper to measure than ink, and there was
no excuse not to.

**Cancellation is the thing every hand-rolled client gets wrong, and it is what Observables
are for.** castkit needs an `isStopped` flag and a nulled timer id to stop a loop that
retries forever by design; mux-magic needs an `unmountedRef` plus a nulled `EventSource` ref
so a closed stream doesn't resurrect; `jobRunner.ts` carries a comment explaining that RxJS
does *not* fire `complete` on external unsubscribe, so it hangs a `subscription.add()` on
teardown — *"without this teardown the sequenceRunner would await a child forever after an
umbrella cancel."* Unsubscription is a first-class concept in exactly one of these
approaches.

**The fleet already speaks it, at one version.** Twelve declarations across five repos, all
`^7.8.2`, no drift. image-viewer's renderer runs a hand-rolled redux-observable — 20 files,
epics, a `createStateObservable` — so a browser RxJS consumer already exists. Choosing
anything else means the fleet's Node code and the fleet's stream package disagree about what
a stream is, and a `switchMap` means one thing on one side of a `fetch` and another on the
other.

**Exposing it beats wrapping it.** A callback façade over RxJS pays the bundle cost and
throws away composition — `retryWithBackoff` and `withGrace` only compose because they are
operators. Consumers who want no Observable in their own code use the bindings and never see
one; consumers who want to compose can.

## Evidence

Measured 2026-07-31 with `esbuild` from `mux-magic/node_modules` against `rxjs@7.8.2`, three
entry files, `gzip -9`. Reproduce:

```sh
cd $(mktemp -d) && ln -s /mnt/TrueNAS-Apps/Repos/mux-magic/node_modules node_modules
printf 'import{Observable,timer}from"rxjs";import{retry,map,filter,switchMap}from"rxjs/operators";console.log(Observable,timer,retry,map,filter,switchMap)' > a.js
/mnt/TrueNAS-Apps/Repos/mux-magic/node_modules/.bin/esbuild a.js --bundle --minify --format=esm --outfile=out.js
gzip -9 -c out.js | wc -c
```

slatecast's budget: 19.7 KB gz of 60, recorded in
[the M5b handoff](../2026-07-31-m5b-castkit-the-second-consumer.md).

Declarations, all `^7.8.2`: mux-magic `core`/`api`/`tools`/`cli`; gallery-downloader
`shared-tools`/`web-server`/`sync-scheduler`/`sync-manga`/`download-web-images`; rip-deck
`daemon`; castkit `server`; image-viewer root.

Teardown comments quoted: `mux-magic/packages/api/src/api/jobRunner.ts` (the
`subscription.add()` block); `castkit/packages/slatecast/src/state.ts` (`isStopped`, and the
synchronous-constructor `try`/`catch`); `mux-magic/packages/web/src/hooks/useLogStream.ts`
(`unmountedRef`).

image-viewer's browser RxJS: `src/components/imageLoader/reduxObservable.js` and 19 sibling
epics.

Full inventory: [the M7 design doc](../2026-07-31-m7-streams-design.md).
