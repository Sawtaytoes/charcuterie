# `streams` ships Observables and injected bindings, not hooks

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/streams`' main entry point is **framework-free**: functions returning
Observables, and operators over them. React and Preact reach it through thin subpath
bindings — `@charcuterie/streams/react`, `@charcuterie/streams/signals` — exactly as
`@charcuterie/logic` does.

The package must not import React, Preact, or `@charcuterie/ui` from its core entry point.
The CI-enforced dependency direction extends to `tokens ← logic ← streams`, and `ui` never
imports `streams`.

Its first consumer, when it is eventually built, is **slatecast**.

## Context

M5b's finding, in its own words:

> **The component layer did not reach it**: `@charcuterie/ui` is React, slatecast is Preact,
> so every shape it duplicates is one it cannot consume — M5b therefore added **zero**
> components, which is the finding.

`streams`' single worst-behaved candidate consumer is **that same package**.
`castkit/packages/slatecast/src/state.ts` hand-rolls a WebSocket reconnect loop: a doubling
backoff capped at 15 s, an `isStopped` teardown flag, an idempotence guard so a socket firing
both `onerror` and `onclose` schedules only one retry, and a `try`/`catch` around
`new WebSocket` because the constructor throws synchronously when offline — with a comment
recording that, left unhandled, the throw escapes the retry timer's callback and *the
reconnect loop dies for good*.

That is the most transport code in the fleet, the most correct transport code in the fleet,
and it is in the package `ui` could not reach.

If `streams` ships as React hooks, M7 will have designed the M5b failure a second time,
knowing the outcome in advance.

## Why

**The seam already exists and is already proven.** `@charcuterie/logic` reaches slatecast
through store injection rather than a framework dependency
([ADR](2026-07-29-store-injection-not-a-jotai-dependency.md)), and slatecast uses it today:
`createStatus({ createStore: createStoreFromSignals, initialState: "disconnected",
transitions: connectionTransitions })`. `streams` is not inventing a pattern, it is
following the one that survived the consumer that broke the other one.

**The states are already named.** `logic/core` defines `ConnectionStatus` and
`connectionTransitions`, and its ADR predicted precisely the collapse M5b found — four repos
spelling connection state four ways, every one losing the difference between *connecting*
and *reconnecting*. `streams` should **produce** that machine's states rather than invent a
parallel vocabulary. It should also carry the guard castkit had to write by hand: the shared
table has no self-transition on `reconnecting` — correctly, since a state that does not
change is not a transition — but a kiosk retries forever, so the second consecutive failure
would ask to re-enter `reconnecting` and `transitionTo` would throw, taking the display down.
That guard is transport behaviour, not consumer behaviour, and it belongs in the package.

**Hooks are the smallest part and the least portable.** Strip React from mux-magic's
`useTolerantEventSource` and what remains — the grace timer, the JSON-parse-and-drop, the
teardown — is the whole value; the `useRef` callback-identity dance and the `useEffect`
dependency array are React tax. `logic`'s hooks are already uncontrolled for a related
reason ([ADR](2026-07-29-logic-hooks-are-uncontrolled.md)). A stream is a value that outlives
a render, so a package whose primitive is a hook cannot be used by anything that does not
render.

**It costs nothing.** An Observable is already the framework-free representation; a binding
that subscribes on mount and unsubscribes on teardown is a few lines per framework. The
inversion is cheap in the direction that works and impossible in the direction that doesn't.

## Evidence

M5b handoff: [`docs/2026-07-31-m5b-castkit-the-second-consumer.md`](../2026-07-31-m5b-castkit-the-second-consumer.md)
— *"the component layer did not reach it"*, zero components added, slatecast at 19.7 KB gz
of 60.

slatecast's transport and its use of `logic`: `castkit/packages/slatecast/src/state.ts` —
the `ConnectionStatus` wiring and its `enterConnectionStatus` guard, and the reconnect loop
with `INITIAL_RETRY_DELAY_MS` 1 000 / `MAX_RETRY_DELAY_MS` 15 000, the `isStopped` flag, and
the synchronous-constructor `try`/`catch` with its comment.

mux-magic's React-bound equivalent:
`mux-magic/packages/web/src/hooks/useTolerantEventSource.ts` (78 lines, three `useRef`s
purely to stop handler identity from resubscribing).

Related: [store injection, not a Jotai dependency](2026-07-29-store-injection-not-a-jotai-dependency.md) ·
[logic hooks are uncontrolled](2026-07-29-logic-hooks-are-uncontrolled.md) ·
[tokens is a separate zero-dependency package](2026-07-29-tokens-is-a-separate-zero-dependency-package.md) ·
[the M7 design doc](../2026-07-31-m7-streams-design.md).
