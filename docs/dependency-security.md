# Dependency security mitigations

The workspace lockfile and the independently pnpm-installed VRT tools both receive security
updates. The standalone tools have their own `pnpm-workspace.yaml`, lockfile, overrides and
`patchedDependencies`; they receive the same braces patch without an install script. CI installs both
and runs `pnpm test:security` to check the actual installed code.

## Temporary patches

- **braces 3.0.3 — GHSA-vfj7-8cjw-p6xm, high severity.** Its recursive AST walkers can
  exhaust the stack on nested patterns shorter than its existing character limit. The pnpm
  patch bounds parsed brace and parenthesis nesting to 100, rejecting deeper input with a
  `SyntaxError`, matching the existing oversized-input rejection. Escapes, quoted strings,
  character classes and ordinary globs retain their behavior. The same patch is applied
  to the standalone VRT installation. Remove it when an official release supplies a depth
  guard, after the regression tests pass against that release.
- **http-cache-semantics 4.3.0 — GHSA-ch52-4w7c-c8xp, high severity.** The new 4.3.0
  release still fails the max-stale regression despite fixing other cache issues. The pnpm
  patch applies the implementation proposed in
  [upstream PR #58](https://github.com/kornelski/http-cache-semantics/pull/58): distinguish
  reuse prohibitions from ordinary expiry and enforce them before honoring request cache
  directives. Tests cover cookies, proxy-revalidate, no-cache, ordinary max-stale reuse,
  explicit public cookie caching and private caches. Remove this patch after an official
  release passes these tests.

In this repository these packages are reached through tooling: micromatch/reg-suit and
cacheable-request respectively. The advisories describe serious impacts when those APIs
accept hostile input or implement a shared HTTP cache; a dependency alert alone does not
establish that a deployed app exposes those paths. The patches cover the vulnerable code
without depending on that distinction.

## Compatibility overrides

`external-editor/tmp` resolves to 0.2.7 and `reg-publish-s3-plugin/uuid` to 11.1.1. Their
parents still require older vulnerable lines. These are deliberately scoped overrides,
not a global uuid major upgrade. Regression tests exercise tmp creation/cleanup, rejection
of traversal prefixes, CommonJS loading of the S3 publisher and UUID generation/buffer
bounds. The standalone VRT manifest uses equivalent pnpm overrides.

Audit tools compare package versions with advisory metadata; they do not inspect pnpm
patches. A remaining braces alert against 3.0.3 does not mean the mitigation failed, and
it is kept visible until an official release is installed.
