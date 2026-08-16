# MQTT cmd/resp lives at `@charcuterie/server/mqtt`

**Status:** Accepted
**Date:** 2026-08-16
**Type:** Scope
**Supersedes:** the "MQTT, in any form → Node, still one implementation" row of
[`streams` is a browser package, and push-only](2026-07-31-streams-is-a-browser-package-and-push-only.md)
(that decision otherwise stands: MQTT is still **not** in `streams`, still Node-only)
**Superseded by:** —
**Related:** [prefer an existing package over a new one](2026-08-11-unify-app-shared-logic-into-charcuterie.md),
[HA MQTT is the scheduler](https://forgejo.octen.dev/sawtaytoes/agentic/src/branch/main/docs/decisions/2026-08-16-ha-mqtt-schedules-over-truenas-cron.md)

## Decision

The fleet's Node MQTT cmd/resp client lives on the already-published
`@charcuterie/server` package, under a new `./mqtt` subpath:

- `createMqttService({ base, host, … })` — connect (TLS by default on port 8883),
  subscribe `<base>/cmd/+`, reply on `<base>/resp/<action>`.
- Command and response publishes are **not retained**.
- A second command for an action that is already running is rejected with
  `{ ok: false, reason: "already-running" }`, not queued.
- `mqtt` is an **optional peer**. Apps that only import `createStaticHandler` never
  resolve it. Same packaging as `./vite` and `vite`.

**Not a new `@charcuterie/mqtt` package.** A new publish needs the owner's manual
OIDC seed. The fit is honest: `@charcuterie/server` is the Node-side fleet kit,
`streams` is the browser-side one, and MQTT has no browser caller.

**Not `@charcuterie/streams`.** That package is browser and push-only. The 2026-07-31
record already said MQTT was "right idea, wrong package" and belonged Node-side
once a second caller existed. The second caller is Board Game Picker's nightly
sync, scheduled from Home Assistant.

`truenas-mqtt`'s `truenas/<task>/trigger` + `truenas/<task>/status` tree is a
legacy special case. New apps use `cmd`/`resp`. Do not "fix" the runner.

## Context

The owner, moving TrueNAS cron onto HA MQTT: *"If Charcuterie doesn't have an
MQTT setup, we should add it there."* An earlier note claimed `@charcuterie/server`
was an unmerged Hono static handler. That was wrong — `server@0.2.0` is on
`master` and already consumed by board-games, queuepilot, ai-usage, mail-sifter.

The 2026-07-31 streams record left MQTT as "one implementation, not yet
duplication." That is no longer true: ai-usage, queuepilot, castkit, rip-deck,
truenas-mqtt and the picker nightly all speak the same cmd/resp shape by hand.

## Why

- One blessed import so the next app does not hand-roll `mqtt.connect` and
  guess at retain flags.
- A subpath on an existing package so the owner does not have to seed a new
  npm name.
- Optional peer so the static-handler consumers do not grow a broker client.

## Evidence

Owner, 2026-08-16: *"If Charcuterie doesn't have an MQTT setup, we should add
it there."*

[Unify decision](2026-08-11-unify-app-shared-logic-into-charcuterie.md):
*"If you create a new package, that'll require me, so it's best to use
existing ones."*
