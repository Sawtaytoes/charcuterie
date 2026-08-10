# Buttons are for on-page actions, links are for navigation — and there are two link components

**Status:** Accepted
**Date:** 2026-08-10
**Type:** Components / API
**Supersedes:** —
**Superseded by:** —

## Decision

1. **A control that navigates is an `<a href>`. A control that changes something on the
   page is a `<button>`.** Not a style preference — the element decides whether
   middle-click, ctrl-click, "open in new tab", "copy link address", "save link as", and
   the browser's status bar exist at all, and none of them can be added to a `<button>`
   afterwards.
2. **The library ships two link components, `TextLink` and `ButtonLink`, not one `Link`
   with an `appearance` prop.** Both render a real `<a href>`; they differ in **paint, not
   semantics**.
   - `TextLink` — navigation that looks like a link. `appearance="inline"` (in prose,
     permanently underlined, inherits the surrounding type) and `appearance="standalone"`
     (a back-link, a nav item; underlines on hover).
   - `ButtonLink` — navigation that looks like a button. Takes `Button`'s visual props
     (`intent`, `appearance`, `size`, `iconStart`, `iconEnd`, `isFullWidth`) and paints
     through the same `getControlClassName`, so it is `Button`'s pixels on an anchor.
3. **`Button` does not grow an `href` or an `asChild`.** Making one component able to be
   either element is what turns the choice above into an implementation detail nobody is
   forced to make.
4. **`isLoading` does not exist on `ButtonLink`.** A navigation has no pending state the
   component owns.
5. **A disabled link is built out of the two things the platform has**: `href` is dropped —
   which is what makes an anchor inert and removes it from the tab order — and
   `aria-disabled` with an explicit `role="link"` keeps it announced. Never a focusable
   `<a href>` whose handler returns early.

## Context

Charcuterie shipped no link component at all, and `Button` is strictly `<button>` — no
`href`, no `asChild`. Measured across the fleet:

- **Seven repos** hand-roll a back-link with a literal `←`, each with its own hover and
  focus rules.
- **mux-magic** declares react-router v8 and has **zero** `<Link>` or `useNavigate`. It
  navigates through **14 raw `<a href="/…">`**, every one of which forces a full page
  reload through its own SPA router.
- **plex-channels** navigates entirely with `<button onClick={() => navigate("#/…")}>` —
  including "Configure ›", which is the primary action on a channel card.
- **points-market** already consumes `@charcuterie/ui`, and its header title — a home link
  — is a `<Button appearance="ghost" intent="neutral" onClick={() => navigate("/")}>`,
  because there was nothing else to reach for
  (`packages/web/src/components/AppShell.tsx:22`). This is the clearest evidence for the
  decision: a consumer that *wants* to be correct still ships a button doing navigation
  when the library has no link.

So both failure directions are already shipped: buttons doing navigation, and anchors
bypassing the router. Agents building these apps had nothing correct to reach for, so they
made text clickable.

## Why

**The distinction is behavioural, and the browser enforces it.** "It looks like a button"
is a paint problem with a one-line answer. "It can be opened in a new tab" is not
implementable on a `<button>` at any length. Choosing the element by *what the control
does* is therefore the only version of this rule that survives contact with a design that
wants a navigation to look prominent — which is exactly Plex Channels' "Configure".

**Two named components beat one component with a prop, because of who is choosing.** An
agent picking between `TextLink` and `ButtonLink` is making a decision the name already
describes. An agent picking `<Link appearance="solid">` has to know that `appearance` means
"look like a button" — and the failure mode of not knowing is reaching for `Button` with an
`onClick` instead, which is the bug this decision exists to remove. The owner's call, and
the reason the split is in the API rather than in a doc.

**`ButtonLink` must share `Button`'s class maps, not copy them.** Both assemble through
`getControlClassName`, so `INTENT_APPEARANCE_CLASS` / `CONTROL_SIZE_CLASS` /
`FOCUS_RING_CLASS` are read once; `ButtonLink.test.tsx` compares the two elements' computed
styles in the real browser. Two copies of one class string is a promise that survives
exactly one edit.

**`isLoading` on a navigation would be a lie.** The wait after a link is pressed belongs to
the destination — a router transition, a `Suspense` boundary, a `ProgressBar` on the page
being entered — and none of it is state this component can observe.

**A "disabled link" is not a platform concept**, so the honest build of one is the
platform's own inertness. Shipping a focusable `<a href>` that ignores clicks is worse than
having no disabled state: it is reachable by Tab, pressable, announced as a working link,
and does nothing.

## Consequences

- Both components render through an injected router seam (`RouterLinkProvider`), defaulting
  to a plain `<a>` — see `Guides/Routing` and the `@charcuterie/ui/react-router` subpath
  export. The library takes no router dependency.
- `isExternal` sets `target="_blank"`, `rel="noopener noreferrer"`, and announces "(opens
  in a new tab)". The trailing `↗` the fleet already uses stays the **caller's** `iconEnd`,
  per
  [ship no icons and no symbol glyphs](2026-07-29-ship-no-icons-and-no-symbol-glyphs.md) —
  the glyph measures blank in this repo's headless Chromium and on the kiosk Pis.
- `Button`'s className assembly moved into `getControlClassName` in `controlStyles.ts`, and
  `ARIA_DISABLED_CLASS` landed beside `DISABLED_CLASS`. Both are exported for an app
  building a control the library does not have.
- `TextLink` has no `size` prop: text takes the size of the text around it.
- The seven hand-rolled back-links, plex-channels' `navigate()` buttons, mux-magic's 14 raw
  anchors, and points-market's clickable `<div>` each have one thing to become.

## Evidence

> Typically, I reserve buttons for on-page actions and links for navigation.

> We should probably have 2 kinds of links then. A ButtonLink and a TextLink.

— the owner, settling both halves of this in the same conversation: the rule, and the
shape of the API that encodes it.
