# The OpenAPI seam is its own subpath, not part of `./query`

**Status:** Accepted
**Date:** 2026-08-13
**Type:** Packaging
**Supersedes:** the single-barrel packaging of [Charcuterie owns request/response data-fetching](2026-08-11-charcuterie-owns-data-fetching-via-query.md) (that decision otherwise stands)
**Superseded by:** —

## Decision

`@charcuterie/logic` splits the data layer across **two** subpaths:

| Subpath | Exports | Optional peers it opts into |
| --- | --- | --- |
| `./query` | `createQueryClient`, `DEFAULT_QUERY_OPTIONS`, `QueryProvider` | `@tanstack/react-query` |
| `./openapi` | `createApiClient`, `createApiHooks`, and the `ApiClient` / `ApiHooks` / `ApiMiddleware` / `FetchResponse` types | `@tanstack/react-query`, `openapi-fetch`, `openapi-react-query` |

`./query` no longer re-exports the OpenAPI primitives. An OpenAPI consumer imports
both subpaths:

```ts
import { QueryProvider } from "@charcuterie/logic/query"
import { createApiClient, createApiHooks } from "@charcuterie/logic/openapi"
```

The new subpath is named **`./openapi`** — for the library it binds, exactly like the
existing `./jotai` and `./signals` adapters — not `./query-openapi` or `./query/openapi`.

This is a **breaking change** to `./query`, so it ships as `@charcuterie/logic@2.0.0`.
Exactly one repo imports the moved names (mux-magic); its migration is a one-line
import change.

## Context

The 2026-08-11 decision gave the fleet a data layer and put all of it behind one
`./query` barrel: client, provider, *and* the `openapi-fetch` / `openapi-react-query`
re-exports. The three libraries are optional peer dependencies, so the intent was
that a consumer who never touched OpenAPI would pull none of them.

The seven-repo adoption fan-out (2026-08-13) proved the barrel defeated that intent.
Six of the seven apps have no OpenAPI document and wanted only the client and
provider — but `./query`'s barrel re-exports `createApiClient.ts`, whose *types*
reference `openapi-fetch` and `openapi-react-query`. TypeScript resolves the whole
barrel to typecheck any import from it, so those six could not typecheck a bare
`QueryProvider` without installing both libraries. rip-deck shipped the workaround in
its adoption PR: two dependencies added to `package.json` that its source never
imports, present only to satisfy the type graph.

## Why

- **An optional peer that everyone must install is not optional.** The barrel, not the
  peer metadata, was deciding what a consumer had to install. Splitting the entry point
  is what makes the `peerDependenciesMeta` honest.
- **The subpath boundary already models this.** `./core` is the zero-dependency one,
  `./jotai` and `./signals` each opt into one store library, `./preact` into Preact.
  A subpath *is* how this package says "here is a thing, and here is what it costs."
  The OpenAPI seam is a store-adapter-shaped concern and belongs on the same axis.
- **The split is along a real line, not a convenience.** Every frontend needs a query
  client. Only a frontend whose backend publishes an OpenAPI spec — currently one of
  seven — needs the typed seam. Bundling the rarer thing into the universal thing taxed
  the majority for the minority.
- **Cheap to migrate now, expensive later.** One repo imports the moved names today.
  That is the argument for taking the major bump immediately rather than shipping a
  deprecated re-export, which would have kept the type-graph problem it exists to fix.

## Evidence

The owner, on the fan-out report that flagged the barrel as a follow-up
(chat 2026-08-13, "Finish react-query addition via Charcuterie"):

> The barrel split seems like a great idea.

The follow-up it endorsed, from that report:

> **Barrel split** (task #7): the `./query` barrel drags `openapi-fetch`/`openapi-react-query`
> onto client-only consumers (rip-deck had to add unused-but-tree-shaken deps). Worth
> splitting into `./query` (client+provider) vs an openapi subpath.

Live in the fan-out: rip-deck's adoption PR ([#30](https://forgejo.octen.dev/sawtaytoes/rip-deck/pulls/30))
added `openapi-fetch` and `openapi-react-query` to `packages/web/package.json` while
importing neither in source. mux-magic ([#223](https://github.com/Sawtaytoes/mux-magic/pull/223))
is the one repo that genuinely uses them.
