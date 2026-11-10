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

## Forced majors for glob and minimatch

GHSA-3g3m-2fjr-6pw4 (glob, AbortSignal bypass) and GHSA-g3hv-75wg-m249 (minimatch,
globparts amplification) are fixed only in glob 14.0.2 and minimatch 11.0.1; no older line
received a backport. Both lockfiles therefore override every `glob@>=9.0.0 <14.0.2` to
`^14.0.4` and every `minimatch@>=7.0.0 <11.0.1` to `^11.0.5`. The parents still declare
older majors: reg-suit-core's rimraf 5 (glob 10), Storybook's react-docgen plugin (glob 13),
and ESLint, `@eslint/config-array` and `typescript-eslint` (minimatch 10). Their calls are
`glob`/`globSync` (rimraf, the docgen plugin), the `minimatch()` function
(typescript-estree), and `new Minimatch(pattern, { dot: true })` with `.match(path, partial)`
and `flipNegate` (ESLint and `@eslint/config-array`). glob 14 and minimatch 11 keep all of
these. None calls the removed minimatch 11 APIs (`makeRe`, `Minimatch#regexp`, `AST`,
`matchOne`, `slashSplit`, `debug`). Every ESLint `files` and `ignores` pattern in this repo
matched every tracked path identically under minimatch 10.2.6 and 11.0.5.
`pnpm test:security` asserts the patched versions behind reg-suit's rimraf in both installs;
`pnpm lint:eslint` exercises ESLint's matching. Remove each override when its parents declare
the patched major.

Callers of `shared-vrt.yml@workflows-v1` install the VRT tools from the tag's checkout, so a
VRT lockfile fix reaches them only after `workflows-v1` moves to a commit that contains it.

`source-map-js` and `ip-address` are scoped overrides that lift transitive copies to the
patched release within their parents' declared ranges. `undici@>=8.0.0 <8.12.2` is a guard:
its only parent (node-gyp, through the macOS-only optional fsevents) left the lockfile, so no
copy resolves today. `@cucumber/messages>uuid` forces 11.1.1 over that parent's exact
11.0.5 pin, as `reg-publish-s3-plugin>uuid` already does. Remove each once the lockfile
resolves a patched version without it.

Audit tools compare package versions with advisory metadata; they do not inspect pnpm
patches. A remaining braces alert against 3.0.3 does not mean the mitigation failed, and
it is kept visible until an official release is installed.
