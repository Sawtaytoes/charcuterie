# Breadcrumbs are a library shape, and a rung is read off its fields

Status: Accepted
Date: 2026-09-28
Type: Component ownership
Supersedes: None
Superseded by: None

## Decision

`Breadcrumbs` owns the path back up a hierarchy: a named `<nav>` (default `"Breadcrumb"`)
around an `<ol>`, one `<li>` per rung, a decorative separator between rungs. Items are
`{ label, href?, onSelect?, key? }` and a rung's kind is read off its fields, never declared:

- `href` → a `TextLink` (`appearance="standalone"`), so an in-app path goes through
  `RouterLinkProvider` like every other link and the library never imports a router.
- `onSelect` with no `href` → a `<button>` painted exactly as the link rung.
- neither → text. On the **last** rung that is the current page, `aria-current="page"`.

A trail whose rungs all link has **no** current rung. That is the Whereabouts case: the
trail sits above a heading that already names the page, and the page is named once.

Labels wrap (`wrap-anywhere`) and are never truncated. The default separator is a chevron
drawn with two logical borders and a direction-aware rotation, not a `›` character.
`separator` overrides it and is always `aria-hidden`.

## Context

Folio (`<nav>` of bare links and `/` spans, no list), image-viewer (a `<div>` of buttons,
`›` glyph, no `aria-current`) and mux-magic (a `<div>` of buttons, current segment
`truncate`d) each hand-rolled a trail. Whereabouts needs a fourth. Under the fleet rule a
shape that several apps share is built here first.

## Why

- **The `onSelect` rung is not the `<button onClick={navigate}>` the guide forbids.** That
  rule is about a route that has a URL. image-viewer and mux-magic walk a disk inside one
  screen with no address to link to; forcing them to invent URLs to adopt the component
  would keep them on their hand-rolled versions. Painting the button as the link keeps the
  trail reading as one thing.
- **Reading the kind off the fields** means a caller maps a path to items and says only
  where each rung goes; there is no `isCurrent` to keep in step with the data.
- **No truncation**: the segment a trail would cut is the one the reader came to find.
- **No glyph** in the default, per the 2026-07-29 no-symbol-glyphs record.

## Evidence

Requested for Whereabouts ("Places › Office › Office Shelves") with the three hand-rolled
versions named as the shapes to cover: folio `packages/web/src/components/Breadcrumbs.tsx`,
image-viewer `src/components/fileBrowser/DirectoryControls.tsx`, mux-magic
`packages/web/src/components/FileExplorerModal/FileExplorerModal.tsx`. Workspace rule:
`agentic/docs/decisions/2026-08-22-a-shared-component-is-built-in-charcuterie-first-not-fixed-per-app.md`.
