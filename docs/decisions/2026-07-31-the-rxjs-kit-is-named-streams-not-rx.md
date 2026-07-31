# The RxJS kit is named `streams`, not `rx`

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Naming
**Supersedes:** —
**Superseded by:** —

## Decision

The reserved sixth package is **`@charcuterie/streams`**. It is never `@charcuterie/rx`.

Earlier documents — the component-library plan and
[1.0.0 is cut at the end of M6](2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md) — say
`@charcuterie/rx`. **That is this package.** Those documents are not edited to change their
meaning; this record is the rename.

Nothing has been published under either name, so there is no migration: `0.1.0` shipped five
packages and this is not one of them, and the plan explicitly ruled out a placeholder publish
("scope ownership already reserves the name — no placeholder publish needed").

## Context

Kevin, on being handed M7:

> M7 for Charcuterie; although, I'm not exactly sure why it's called `@charcuterie/rx`

The answer to the literal question: `rx` is **ReactiveX**, the naming convention RxJS
inherits from its family — `rxjs`, `rxjs-hooks`, `@ngrx/*`, `rx-angular`, RxSwift, RxJava,
Rx.NET. It is the ecosystem's shorthand for "this package hands you Observables."

The name has no provenance beyond that. It first appears in
`agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md` at commit `d075eb0`
— an agent's shorthand in a planning document. Kevin never chose it, and no decision record
ever ratified it. Asked to settle it before M7's design doc fixed it in writing, he picked
`streams`.

## Why

**It broke the scheme, and the scheme is a house rule.** `tokens`, `logic`, `ui`,
`eslint-config`, `biome-config` are all plain what-it-is nouns. `rx` names a **dependency**
instead. The workspace rule is to match the existing nomenclature and never reach for a
generic label or a codename, and *"unsure which scheme applies? Ask, don't guess"* — which
is what the plan did not do.

**A name that names the dependency lies as soon as the dependency changes.** The package is
built on RxJS today, and
[deliberately so](2026-07-31-streams-is-built-on-rxjs.md). But `rx` promises Observables
where `streams` promises push data, and only one of those is the reason a consumer reaches
for it. The same argument already settled
[tokens being split from ui](2026-07-29-tokens-is-a-separate-zero-dependency-package.md):
package names describe what a consumer gets, not how it is built.

**`streams` covers the scope and `transport` doesn't.** The package is SSE and WebSocket
adapters *plus* the operators over them — backoff, grace windows, connection-state
projection. "Transport" names only the first half. `streams` names both, and matches what
the code already calls these things (`useLogStream`, `useSseStream`, `openStateStream`,
`/jobs/stream`, `/api/server-id/stream`).

`tools`, the fourth candidate, was rejected for saying nothing: `@mux-magic/tools` is
already a grab-bag of file, logging and scheduling helpers, and copying that name would
import its vagueness along with it.

## Evidence

Kevin, 2026-07-31, this session — quoted above; chose `@charcuterie/streams` from four
options when asked to settle the name before the M7 ADRs were written.

Name's origin: `git log -S"charcuterie/rx"` on the plan document returns exactly one commit,
`d075eb0` *"docs(charcuterie): plan a shared component library for the app fleet"*. No
decision record mentions it before this one.

Registry: nothing published under either name. `npm` scope holds `tokens`, `logic`, `ui`,
`eslint-config`, `biome-config` at `0.1.0`.

Naming rule: `agentic/AGENTS.md`, *"Match the user's existing naming nomenclature — this is
important to him,"* and the sibling precedent
`agentic/docs/decisions/2026-07-16-apps-get-product-name-subdomains.md` (apps get
product-name subdomains). Cited by path, not linked — `agentic` and `charcuterie` are not
siblings on every machine that reads this.
