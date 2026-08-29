# `Main` is the app shell's vertical scroll region

**Status:** Accepted
**Date:** 2026-08-29
**Type:** Layout contract
**Supersedes:** —
**Superseded by:** —

## Decision

`Shell` fills the viewport. `Main` is the only vertical scroll region in the app shell.
`Header` and `Rail` remain in the viewport while a page scrolls.

The shell middle row is `minmax(0, 1fr)`. `Main` has `min-block-size: 0` and
`overflow-y: auto`. A rail also has `min-block-size: 0`, so a long main view cannot stretch
the shared grid row and move a rail action below the viewport.

The navigation rail keeps its own existing width behaviour. `useNavLayout` still responds to
window width and its manual control still collapses or expands the rail. This decision does
not add a second vertical scroll region to the rail.

## Context

QueuePilot let the document scroll. Its long Rules queues page stretched the navigation rail
to the page height, leaving unused rail space and pushing the rail-collapse control below the
viewport.

The owner reported:

> "can we make only the app area scrollable… It's scrolling the sidebar, so there's this
> empty space where I can't click anything. I thought we wanted to make that able to be
> resizing and allow us to close it if we wanted. This should all be done in Charcuterie
> where it's created."

## Why

The scroll owner is part of the shell shape. Fixing QueuePilot alone would repeat the same
fault in every app that adopts `Shell`, `Rail` and `Main`.

The default puts the active page in the scrollport and preserves the frame controls. The
browser test mounts a tall page, verifies that `Main` overflows and scrolls, and verifies the
rail stays at scroll position zero.
