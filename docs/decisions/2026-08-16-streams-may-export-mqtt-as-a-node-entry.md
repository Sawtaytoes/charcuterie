# `streams` may export MQTT as a Node entry

**Status:** Accepted
**Date:** 2026-08-16
**Type:** Scope
**Supersedes:**
- the "MQTT, in any form → not in `streams`, now or later" row of
  [`streams` is a browser package, and push-only](2026-07-31-streams-is-a-browser-package-and-push-only.md)
- the "MQTT is still not in `streams`" clause of
  [MQTT cmd/resp lives at `@charcuterie/server/mqtt`](2026-08-16-mqtt-cmd-resp-is-charcuterie-server-mqtt.md)
**Superseded by:** —

## Decision

MQTT is allowed on `@charcuterie/streams` as a **Node export**
(`@charcuterie/streams/mqtt`), next to the browser/push export. A
separate export is how the package spans two runtimes without dragging
`mqtt` into a Vite bundle.

That is what the owner meant. The 2026-07-31 table that banned MQTT from
`streams` "now or later" was an agent's reading of "no browser caller,"
not an owner denial.

**Today's published client is still `@charcuterie/server/mqtt@0.3.0`.**
`@charcuterie/streams` has no package yet (M7 was design-only). Do not
block consumers on creating it. When `streams` is created, `./mqtt` is
an honest home; `server/mqtt` can re-export or move then.

The cmd/resp contract does not change: never retain commands or
responses; overlapping commands reject with `already-running`; TLS
defaults on at port 8883.

## Context

Owner, 2026-08-16, after `@charcuterie/server/mqtt` landed:

> "Also, MQTT could be part of streams as a different export. I don't
> remember denying it."

## Why

A subpath is already how this repo says what a thing costs
(`logic/query`, `logic/openapi`, `server/vite`, `server/mqtt`). The
bundler argument against a two-runtime package is about a **single**
entry that imports both sides, not about two exports.

## Evidence

Owner quote above. `packages/streams` is absent on `master`.
`@charcuterie/server@0.3.0` is on npm with `./mqtt`.
