# `Modal` is the base layer; `Dialog` is the chrome component

**Status:** Accepted
**Date:** 2026-08-03
**Type:** Architecture · API
**Supersedes:** —
**Superseded by:** —

## Decision

`Modal` is the **base layer**: a portalled backdrop with dismiss and a focus trap, and no
chrome. `Dialog` is `Modal` plus the heading / Close button / scrolling body / optional
footer / five sizes the old `Modal` shipped. The old chrome-bearing component is renamed to
`Dialog` verbatim (including the `xl` size and the `full` `rounded-none`); a new base `Modal`
takes the generic name. `ModalSize` is removed and becomes `DialogSize`.

This is a **breaking change** — `ui@2.0.0`. The three consumers using the chrome
(`rip-deck`'s `LogModal`, `image-viewer`'s `ConfirmationModal`, one `gallery-downloader`
site) rename `Modal` → `Dialog`; the props are unchanged, so it is mechanical.

## Why

The name was wrong in the way that matters. A dialog is *one kind* of modal — so is a
confirmation, a media lightbox (`Lightbox`, which was a `Modal` and is now a `Dialog`), and
anything else that wants a scrim, an Escape, and a click-outside. By taking the generic name
for the specific thing, the library had **no generic layer** for everything else that needs
backdrop-plus-dismiss. A consumer wanting a bare modal had to either accept a heading and a
Close button it did not want, or hand-roll the portal/scrim/focus-trap the library exists to
provide.

Splitting them gives the base its own name and the chrome its own file. `Dialog` is now
*just* the box's contents and the size it wants — everything modal (the portal, the scrim,
the focus trap, the scroll lock, the stacking) is `Modal`'s, via `OverlayPanel`.

## Evidence

`Lightbox` is the proof the base was missing: it was written as a "skin over `Modal`" and
used the chrome (`heading`, `size="xl"`) only incidentally — it wanted the modal mechanics,
not the header bar. It migrates to `Dialog` with no behaviour change, and a future
image-first overlay could sit directly on the base `Modal` instead.

## Consequences

- `Modal` requires exactly one of `aria-label` / `aria-labelledby` (a `role="dialog"` takes
  no name from its content) — a dev-time warning, not a throw, the lesson `Spinner`,
  `Popover`, and the old `Modal` each learned.
- The one Biome `useKeyWithClickEvents` suppression in the package is deleted: the backdrop
  is a real element now and dismissal is `useDismiss`, not an `onClick` the linter cannot
  see a keyboard route for.
- A lone `Modal`/`Dialog` needs no setup; only **stacking** needs `OverlayStackProvider`.
