# MediaTile owns its interactive states — do not wrap it in a bare button

- **Status:** Accepted
- **Date:** 2026-08-16
- **Type:** UX / API
- **Supersedes:** —
- **Superseded by:** —

## Decision

A clickable `MediaTile` is a first-class mode. Pass `onClick` (button) or
`href` (link). Both get `cursor-pointer`, `hover:opacity-90`, and the
focus-visible ring.

Do **not** wrap `MediaTile` in a raw `<button>` or `<a>`. Tailwind
preflight resets the button cursor to `default`, and none of the hover /
focus chrome lives on the wrapper, so the tile looks inert.

Interactive states belong on the Charcuterie control, not in the consumer.

## Context

Board Game Picker's Collection cover thumbnail is a `MediaTile` inside
`<button className="block w-full">`. The owner hovered it and got a text
cursor:

> "I'd like the hover state to exist here. It just has a regular pointer
> icon. We should be always putting accessibility states like that in
> Charcuterie."

`href` already had the chrome. There was no button equivalent, so the
app invented a wrapper.

## Why

A poster that does something must look like it does something, in every
app, without each consumer rediscovering `cursor-pointer`. Same reason
`Button` ships its hover and focus ring instead of asking the caller to
add them.

## Evidence

> "I'd like the hover state to exist here. It just has a regular pointer
> icon. We should be always putting accessibility states like that in
> Charcuterie. Are we not using Charcuterie for the thumbnail? That
> might be why."

— owner, 2026-08-16, on the Collection cover thumbnail
