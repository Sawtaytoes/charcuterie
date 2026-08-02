# `SortableTableHeader`, `Toast`/`ToastRegion` and `FileDropZone` ship in 1.0.0

**Status:** Accepted
**Date:** 2026-08-02
**Type:** Release scope
**Supersedes:** —
**Superseded by:** —

## Decision

All three ship in `@charcuterie/ui@1.0.0`. **Kevin's call**, made when the question was put
to him as "these three have no consumer, do they go in the stability promise":

> We talked about this already. They do have consumers, but they're in other spots.

Nothing is deferred, nothing is marked experimental, and no `@alpha` tag is used. A 1.0.0
that ships them promises their APIs like every other component's.

What follows is the factual state on the day of the cut, recorded because the case for two
of the three is *not* "a consumer needed it" and saying otherwise would be manufacturing
agreement with a decision that does not need it.

## Context

### What each one actually has, measured 2026-08-02

Swept across every sibling repo in `/mnt/TrueNAS-Apps/Repos` with `rg -uu` and explicit
`node_modules` / `dist` / `.git` exclusions, because a plain `rg` from a parent directory
returns zero hits across nested repos and reads identically to "nothing in the fleet does
this".

| Component | Importers of `@charcuterie/ui` | Where |
| --- | --- | --- |
| `SortableTableHeader` | **1** | `mux-magic/packages/web/src/components/FileExplorerModal/FileExplorerModal.tsx`, 4 columns, on `feat/mux-magic-revamp` |
| `Toast` | **2** | `image-viewer/src/components/fileBrowser/FileBrowser.tsx`, `image-viewer/src/components/imageViewer/PaneGallery.tsx`, on `feat/m6c-charcuterie-ui` |
| `ToastRegion` | **1** | `gallery-downloader/packages/web/src/components/ToastProvider.tsx`, on `feat/m6e-react-tailwind` |
| `FileDropZone` | **0** | nowhere, in any repo |

So the "three consumer-less components" framing this decision was opened with is **already
out of date, and was out of date by two components.** M6b gave `SortableTableHeader` a real
migrated consumer. M6c and M6e — both in flight and unmerged as this is written — gave the
toast pair three between them. The count that survives is **`FileDropZone`, alone, at
zero.**

Both toast consumers are worth reading rather than counting. image-viewer imports `Toast`
**without** `ToastRegion` and supplies its own `<ul>`, deliberately and with the reason in
the file: `ToastRegion` takes `ToastRecord`s, which carry a `description` and nothing that
could hold the "Open N folders" control, so the region can render a notification and not an
action bar. That is a component being adopted at exactly the seam it was designed to have —
`Toast` renders an `<li>` and does not care whose list it is in — and it is better evidence
for the split than a consumer that took both would have been.

### `FileDropZone` is at zero, and the fleet's demand is real but elsewhere

The two drop targets `FileDropZone` was written from are both text, not files:

- gallery-downloader's `packages/web/src/hooks/usePageDropTarget.ts:90` reads
  `event.dataTransfer?.getData("text")` — a URL — and never touches `dataTransfer.files`.
  There is no `.files` read anywhere in that repo.
- mux-magic's YAML path is **paste-only**: `LoadModal.tsx:74` reads
  `clipboardData.getData("text")`. It is not a drop target at all.

Real file drops exist in the fleet — eight sites, `dataTransfer.files`, all of them in
`bambuddy-src` (`hooks/usePageFileDrop.ts`, `pages/PrintersPage.tsx`,
`pages/ProfilesPage.tsx`, `components/UploadModal.tsx`, `components/FileUploadModal.tsx`,
`components/SpoolCsvImportModal.tsx`, `components/LocalProfilesView.tsx`,
`components/BugReportBubble.tsx`). bambuddy is not a charcuterie consumer and is not on any
milestone's list to become one. The demand is real; it is in a repo the library does not
reach.

### The sortable-header defect class, stated at the right size

The claim this decision was drafted with — *"four independent hand-rolled sortable headers
across bambuddy/spoolbuddy/uc-research, none with a `<button>` or `aria-sort`"* — is **an
over-count, and one of the three named repos does not belong.** Measured:

| Site | `<button>` | `aria-sort` |
| --- | --- | --- |
| `bambuddy-src/frontend/src/components/ForecastPanel.tsx` (`SortableTh`, 4 columns) | no | no |
| `bambuddy-src/frontend/src/pages/InventoryPage.tsx` (inline header map) | no | no |
| `spoolbuddy-src/frontend/src/components/inventory/SpoolsTable.tsx` | no | no |

**Three, not four.** uc-research's sortable columns are PrimeNG's `pSortableColumn` /
`<p-sortIcon>` directives — a library doing the job, and PrimeNG emits `aria-sort` itself,
so it is not an instance of the defect. Counting it inflated a finding that is strong
enough without it: `aria-sort` appears in **zero** hand-rolled sites fleet-wide, and the
only source occurrences anywhere are this library's own component and mux-magic's consumer.
Every one of the three conveys sort direction by an icon alone and puts `onClick` on the
`<th>`, so there is no keyboard path to it either.

## Why

**A 1.0.0 that ships only what has a caller is a different promise from the one this
library made.** The stated payoff of `SortableTableHeader`, in the M6a findings doc, was
never duplication — it is *"a class of failure invisible to every gate the fleet has"*,
because axe has no rule for a missing `aria-sort`: a table without one is simply not sorted
as far as the accessibility tree knows, and nothing goes red. Three live tables in the
fleet are in that state right now. Withholding the component until one of those repos is
migrated would be gating the fix on the thing the fix is for.

**`FileDropZone`'s reason is the strongest of the three and has the fewest callers**, which
is the shape worth naming rather than smoothing over. Its whole design is that there is no
keyboard gesture for dragging (WCAG 2.5.7), so the zone is a `<label>` around a real
`<input type="file">` and the drop handlers are an *enhancement on a control that already
works without them* — and building it the other way round is how the fleet's version ended
up with an `alert()` as its error channel. That ordering is not something a consumer
discovers under deadline; it is the thing a library exists to have decided in advance. The
component also produced [a decision of its own](2026-07-31-a-file-input-has-no-role.md) —
that a file input has no ARIA role at all, so it is the one component exempt from
`expectAgentDrivable` — which is knowledge the fleet now has because the component was
built, not because it was used.

**Shipping it is also cheap in the only currency 1.0.0 spends: API stability.** These are
three of twenty-five components, they are additive, and holding them back would not shrink
the promise — it would mean adding them in a later minor with less evidence behind them
than they have today, since the migrations that would have exercised them are the ones
running right now.

**The count moving under us while this was being written is the argument, not a footnote.**
This decision was opened as "three components with zero consumers" and by the time it was
measured, two of the three had four consumers between them, on branches that did not exist
when the question was asked. That is precisely why the answer is not "wait for a consumer".

## Evidence

Kevin, when the three were put to him as consumer-less and therefore deferrable:

> We talked about this already. They do have consumers, but they're in other spots.

`docs/2026-07-31-m6a-the-p1-components.md`, on `SortableTableHeader`:

> **axe has no rule for a missing `aria-sort`**, because a table with none is simply not
> sorted as far as the accessibility tree knows. `SortableTableHeader` is therefore the one
> component here whose payoff is not duplication but a class of failure invisible to every
> gate the fleet has.

`image-viewer/src/components/fileBrowser/FileBrowser.tsx:68-69`, on taking `Toast` without
`ToastRegion`:

> `Toast` renders an `<li>` — it is built to sit in `ToastRegion`'s `<ul>`, and this bar
> supplies its own instead. Not `ToastRegion` itself: that component takes `ToastRecord`s,
> which carry a `description` and nothing that could hold the "Open N folders" control, so
> the region can render a notification and not an action bar.

Sweep method: `rg -uu` from `/mnt/TrueNAS-Apps/Repos` with
`--glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/.git/**'`. Without `-uu` the
nested sibling repos are swallowed by the parent's ignore rules and every query returns
zero, which is indistinguishable from the answer this decision would otherwise have
recorded.
