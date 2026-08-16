---
"@charcuterie/server": minor
---

Add `@charcuterie/server/mqtt` — Node cmd/resp over the house broker.

`createMqttService({ base, host })` subscribes `<base>/cmd/+` and replies on
`<base>/resp/<action>`. Command and response publishes are never retained; a
second command for an action that is already running is rejected with
`{ ok: false, reason: "already-running" }`. `mqtt` is an optional peer, so a
static-only app never resolves it.

Not a new package (those need a manual first publish) and not
`@charcuterie/streams` (browser, push-only).
