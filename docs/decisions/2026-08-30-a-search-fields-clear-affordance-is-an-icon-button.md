# A search field's clear affordance is an icon button

Status: Accepted
Date: 2026-08-30
Type: UI component
Supersedes: None
Superseded by: [2026-08-31](2026-08-31-a-search-field-is-never-a-small-clear-target.md)

## Decision

`SearchInput` owns the fleet's clearable search-field shape. It suppresses the native
platform cancel widget and renders the app's clear glyph inside a labelled Charcuterie
`IconButton`. The button uses the same density-aware size as the field and returns focus to
the field after it clears. Apps own the query and the icon.

## Context

QueuePilot implemented this once in its asynchronous add search. Its other search and filter
fields still used the browser's cancel widget. The browser widget cannot use Charcuterie
tokens and provides a smaller pointer target.

## Why

The action is an icon-only action, so it is an `IconButton`. One component keeps the target,
accessible label, field padding, native-widget suppression, and focus behavior consistent.
Requiring the glyph preserves the library rule that apps own icons.

## Evidence

Owner, chat `t3code-95952451`: “All search boxes with an X inside should probably have that
as an icon button. We did it in QueuePilot in one place, but all the other filter boxes don't
use it. I don't like one-offs like that. I like to make changes like that fleet-wide.”
