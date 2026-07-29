# `@charcuterie/docs`

The Storybook host. **Private** — the fleet reads it, nobody installs it.

```bash
yarn storybook          # dev server on :6006
yarn build:storybook    # → storybook-static/
yarn vitest run --project storybook   # from the repo root: every story, every play, axe
```

## Stories live in `@charcuterie/ui`, not here

`.storybook/main.ts` globs `../../ui/src/**/*.stories.tsx` and `../../ui/src/**/*.mdx`, so a
component's `Component.tsx` / `.stories.tsx` / `.mdx` stay siblings — matching mux-magic.
This package is the *host*: the three toolbars, the a11y gate, and the token stylesheet.

That stylesheet, `src/styles/tokens.css`, also carries two lines M3 added and nothing else
would have: `@import "@charcuterie/ui/src/styles.css"` (the looping animations, imported from
source so Storybook works before anything is built) and `@source "../../../ui/src"` —
without which Tailwind never scans the components and every one of them renders unstyled with
no error.

## The three toolbars are the production mechanism

`data-scheme`, `data-density`, and `data-variant` are written straight onto `<html>` —
scheme by `@storybook/addon-themes`' `withThemeByDataAttribute`, the other two by a
decorator doing the same thing by hand.

That is not a Storybook convenience. It is exactly what an app does, exercised. Nothing
in React observes those attributes, so switching one re-themes the whole canvas with
zero re-render. **If a component ever needs a `useTheme()` to respond correctly, the
token layer has failed, and this toolbar is where it shows up first.**

The default scheme is **dark**, deliberately. `daylight` won M0 as a light-first
*visual direction*; that is not the same as flipping the fleet to light, and the kiosk
Pis stay pinned to dark — a light kiosk in a dark room is a lamp.

## Accessibility is enforced, not reported

`parameters.a11y = { test: "error" }` in `.storybook/preview.tsx` makes axe violations
**fail the run** rather than fill a panel nobody opens. Verified working: the first run
failed seven stories over one real issue.

That issue is worth recording, because it is the shape of mistake this gate exists to
catch. `content.disabled` was rendered as a paragraph of prose, and axe flagged it at
2.6:1. The token was not wrong — WCAG 1.4.3 exempts *inactive controls*, which is why
the contrast audit exempts that role too — but the **specimen** was, because prose is
not an inactive control. The exemption is only honest where the role is actually used,
so the specimen now shows it on a genuinely `disabled` button.

Opting a story out requires `a11y: { test: "todo" }` with a comment linking an issue.

## `TokenSpecimen` is throwaway

It is not a library component and not a candidate to become one. It exists to prove the
substrate before M3 builds anything real on it — which it now has, so this is history
rather than the only board here.

Two things it demonstrates on purpose:

- **Colours come from Tailwind utilities** — `bg-surface-raised`, `text-content-muted`,
  `bg-intent-danger-solid`. Those exist only because `@charcuterie/tokens/theme.css` put
  `--color-*` into an `@theme` block, which is the identical mechanism mux-magic picks
  up in its four-line swap.
- **Radius, spacing, and type come through `var()`** rather than a utility. That was the
  known gap at M1, and **M3 closed it**: `theme.css` now publishes `--text-*`,
  `--leading-*`, `--shadow-*`, `--ease-*`, and `--spacing`, so `@charcuterie/ui` writes
  `text-md` / `shadow-low` / `p-3` directly
  ([decision](../../docs/decisions/2026-07-29-theme-css-bridges-tailwind-namespaces.md)).
  The `var()` calls here are left as-is, as the before-picture.

Every class name is written out in full. Tailwind v4 scans source text for *complete*
class strings, so `` `bg-intent-${intent}-solid` `` generates nothing at all and fails
silently — the element just renders unstyled, which reads as "the token layer is broken"
rather than "the scanner never saw it".

## Sandbox note: Playwright browsers

The story tests run in `@vitest/browser` + chromium, and **need no environment override**.
`/opt/pw-browsers` now holds both chromium **1234** and `chromium_headless_shell-1234`,
which is what this workspace's Playwright wants:

```bash
yarn vitest run --project storybook
```

Corrected 2026-07-29 (M3). M1 and M2 both documented a
`PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` workaround for an image that
shipped build 1228; that directory no longer exists, so following the old instruction now
*causes* the "Playwright was just installed" banner instead of avoiding it.
