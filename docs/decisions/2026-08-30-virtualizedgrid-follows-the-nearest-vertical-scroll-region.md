# `VirtualizedGrid` follows the nearest vertical scroll region

- **Status:** Accepted
- **Date:** 2026-08-30
- **Type:** Component contract / defect
- **Supersedes:** point 5 of
  [VirtualizedGrid windows AdaptiveGrid's layout rather than forking it](2026-08-21-virtualizedgrid-windows-adaptivegrids-layout-rather-than-forking-it.md)
- **Superseded by:** —

## Decision

`VirtualizedGrid` follows the nearest ancestor whose computed `overflow-y` is `auto` or
`scroll`. It falls back to the browser window when it has no such ancestor.

The component never creates a vertical scroll region of its own. Inside `Shell`, `Main`
remains the app frame's one vertical scroll region. A standalone grid remains a
window-virtualized page.

The lookup uses the computed overflow value and does not require the ancestor to overflow
yet. The virtual spacer is what makes the ancestor overflow, so a `scrollHeight >
clientHeight` gate would miss the owner on the first commit and create a document scrollbar.

## Context

`Main` became the app shell's vertical scroll region on 2026-08-29. `VirtualizedGrid` still
used `useWindowVirtualizer`, so its spacer enlarged `Main` while its observer listened to the
window. QueuePilot's Pending page then had two scrollbars. Scrolling `Main` never advanced the
virtual rows, so the first mounted rows stayed above a spacer tens of thousands of pixels
tall.

The owner reported:

> "QueuePilot virtualized list for Pending items has some serious scrolling issues. 2
> scrollbars, and one has a bunch of blank space underneath. It should be 1 scrollbar with no
> blank space randomly padded for tens of thousands of pixels."

## Why

The scroll owner is an ancestor's layout decision. It is not a prop every consumer should
repeat, especially when both `Main` and `VirtualizedGrid` are Charcuterie components.
Following the nearest owner makes the two component contracts compose and also supports a
grid in another deliberate scroll region.

There are two virtualizer implementations because TanStack observes a window and an element
through different adapters. They share the row measurement and markup, so the semantic list,
padding window and adaptive columns still have one implementation.

## Evidence

- Live QueuePilot at 1920 × 1080 before the fix: the document measured 1,160px high while
  `Main` measured 29,232px of scroll content in a 982px viewport. The grid carried 26,484px
  of end padding and kept rows 0–5 mounted while `Main` scrolled.
- The browser regression story mounts 2,000 items in `Shell` / `Main`. It asserts that
  scrolling `Main` replaces the mounted rows, the 2,000th item reaches the viewport, and the
  end padding becomes 0px.
- The existing standalone story continues to assert that window scrolling replaces its
  mounted rows.
