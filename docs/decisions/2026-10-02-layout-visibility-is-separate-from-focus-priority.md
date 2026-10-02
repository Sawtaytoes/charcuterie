# Layout visibility is separate from focus priority

- **Status:** Accepted
- **Date:** 2026-10-02
- **Type:** Shared layout policy
- **Supersedes:** —
- **Superseded by:** —

## Decision

Measured layout sections may declare visibilityPriority separately from priority.
Candidates explicitly hide optional sections with isHidden. Required sections do
not opt in. Visible sections must meet their minimum dimensions; among fitting
layouts, optional content survives in descending visibility order before focus
priority maximizes useful area. Apps measure and enumerate visibility states.

## Context

A composed dashboard at increased scaling clipped essential progress and actions
while preserving less useful details and a large supporting panel.

## Why

The content deserving the most remaining space and the content allowed to
disappear are independent choices. Both belong in shared layout policy.

## Evidence

User, 2026-10-02: “I want something like "this can be hidden if we have no space".”
User: “We shouldn't have the UI be broken at least.”

Chat: T3 Code thread associated with CastKit branch fix/layout-visibility
(chat ID unavailable).
