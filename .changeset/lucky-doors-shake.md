---
"@charcuterie/ui": minor
---

`TextLink` and `ButtonLink`, plus a router-agnostic seam.

Buttons are for on-page actions; links are for navigation. Both new components render a
real `<a href>` — so middle-click, ctrl-click, "open in new tab", "copy link address" and
the status bar all work — and they differ in paint, not semantics:

- **`TextLink`** — navigation that looks like a link. `appearance="inline"` (in prose,
  underlined, inherits the surrounding type) and `appearance="standalone"` (a back-link, a
  nav item).
- **`ButtonLink`** — navigation that looks like a button. Takes `Button`'s `intent` /
  `appearance` / `size` / `iconStart` / `iconEnd` / `isFullWidth` and paints through the
  same `getControlClassName`, so the two are the same pixels. No `isLoading`: a navigation
  has no pending state the component owns.

Both take `isExternal` (`target="_blank"`, `rel="noopener noreferrer"`, and a
visually-hidden "opens in a new tab") and `isDisabled`, which drops `href` and sets
`aria-disabled` rather than shipping a focusable anchor that silently does nothing.

**The router is injected, not depended on.** `RouterLinkProvider` takes the app's link
component once at the root; with nothing injected both components render a plain `<a href>`
and everything still works. `@charcuterie/ui/react-router` is a new optional subpath export
shipping `ReactRouterLink`, with `react-router` as an optional peer dependency — so apps
without a router never pay for it. Setup recipe: **Guides/Routing** in Storybook.

Also newly exported for apps building their own controls: `getControlClassName`,
`CONTROL_BASE_CLASS`, `ARIA_DISABLED_CLASS`, `AnchorLink`, `useRouterLink`,
`getIsRoutedHref`, and the `RouterLinkComponent` / `RouterLinkProps` types.
