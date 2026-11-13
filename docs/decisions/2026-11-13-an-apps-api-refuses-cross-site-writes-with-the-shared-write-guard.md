# An app's API refuses cross-site writes with the shared write guard

- **Status:** Accepted
- **Date:** 2026-11-13
- **Type:** Security / scope
- **Supersedes:** —
- **Superseded by:** —
- **Related:** [MQTT cmd/resp lives at `@charcuterie/server/mqtt`](2026-08-16-mqtt-cmd-resp-is-charcuterie-server-mqtt.md)

## Decision

`@charcuterie/server` exports `createWriteGuard` and `createBodyLimit`. Every fleet app whose
API changes state mounts the guard ahead of its API routes, and gives each write route a
body limit sized for that route.

The guard's rules:

1. **`Host` is checked against an allowlist**, loopback plus `allowedHosts`. With a list,
   every request on a host not in it gets `421`, reads included, because DNS rebinding
   reads as well as writes.
2. **An empty list fails closed for writes.** Reads still pass, so a missing setting does
   not hide the app, but a write from a non-loopback host gets `421` naming the setting.
   A development server opts out with `isEmptyHostListWritable`.
3. **On a write, `Origin` must be the request's own host or a listed origin**, and
   `Origin: null` is refused. **`Sec-Fetch-Site` must be `same-origin` or `none`**, unless
   the `Origin` is explicitly listed.
4. **A write body must be JSON** (`application/json` or `application/<x>+json`), or the
   request must carry the app's `clientHeader`, which marks a deliberate non-JSON body
   such as a multipart upload. A `text/plain` body is refused, even when it parses as
   JSON.
5. **A bodiless `PUT`, `PATCH`, or `DELETE` passes**, because every browser preflights it.
   **A bodiless `POST` passes only with proof**: the client header, a JSON
   `Content-Type`, a matching `Origin`, or `Sec-Fetch-Site: same-origin`.
6. **A refusal is `{ error }` JSON.** `createBodyLimit` answers `413` in the same shape.

Non-browser clients, such as `curl` with a JSON body, scripts, and Home Assistant, send no
`Origin` and no `Sec-Fetch-*`, and pass.

## Context

The 2026-11-12 fleet audit found cross-site writes with no `Origin` check in four apps,
and five hand-written guards that had already drifted apart. Docket's was the most
complete. House Announcements required an `Origin` on every write. Crowbar checked the
host only when its host setting was non-empty, so an unset setting turned the rebinding
defense off without a sign. The same audit found uploads that read the whole body into
memory before checking its size.

## Why

- **One guard, tested once, cannot drift.** Each app had copied the idea and changed a
  rule, and the differences were not decisions.
- **A `Host` allowlist is the only defense against DNS rebinding** on a plain-HTTP port.
  The rebinding page is same-origin, so `Origin` and `Sec-Fetch-Site` look clean.
- **Failing closed on an empty list for writes, but not reads,** keeps the app visible
  and makes the missing setting obvious, instead of silently allowing rebinding writes.
- **The bodiless-`POST` rule is looser than Docket's.** Docket requires its client header
  on a bodiless `POST`. An app's own page sends a bodiless `POST` for actions like "reset",
  and the browser already proves it is same-origin with `Origin`. A cross-site page cannot
  forge either header.
- **A body limit is middleware ahead of the handler, not a size check after it.** A check
  after `await c.req.arrayBuffer()` runs when the body is already in memory.
  `hono/body-limit` refuses a request with `Content-Length` from the header and counts a
  chunked one as it streams.

This is not authentication. Anything that can open a connection to the port can still
write.

## Evidence

The audit record is `docs/research/2026-11-12-fleet-code-and-docket-audit.md` in the
workspace repository, under "Security", items 7 and 8. The owner's direction for the
round was: "Fix all those issues."
