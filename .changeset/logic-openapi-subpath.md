---
"@charcuterie/logic": major
---

**Breaking:** the OpenAPI seam moves out of `./query` and onto its own
`./openapi` subpath.

`createApiClient`, `createApiHooks`, and the `ApiClient` / `ApiClientOptions` /
`ApiHooks` / `ApiMiddleware` / `FetchResponse` types are no longer exported from
`@charcuterie/logic/query`. Import them from `@charcuterie/logic/openapi`:

```diff
-import {
-  createApiClient,
-  createApiHooks,
-  QueryProvider,
-} from "@charcuterie/logic/query"
+import { QueryProvider } from "@charcuterie/logic/query"
+import {
+  createApiClient,
+  createApiHooks,
+} from "@charcuterie/logic/openapi"
```

`createQueryClient`, `DEFAULT_QUERY_OPTIONS` and `QueryProvider` stay on
`./query`, unchanged.

Why: `./query`'s barrel re-exported the OpenAPI primitives, whose types
reference `openapi-fetch` and `openapi-react-query`. TypeScript resolves the
whole barrel to typecheck any import from it, so an app with no OpenAPI document
had to install both libraries to typecheck a bare `QueryProvider` — which made
those "optional" peers effectively mandatory. Now `./query` opts into
`@tanstack/react-query` alone and `./openapi` adds the other two. See
[the decision](../docs/decisions/2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md).
