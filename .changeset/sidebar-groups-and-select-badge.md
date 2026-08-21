---
"@charcuterie/ui": patch
---

Story titles now place each component in a grouped sidebar — `Components/Actions`,
`Controls`, `Overlays`, `Layout`, `Data`, `Feedback`, with `VisuallyHidden` moving to
`Utilities` beside `Scrollbar`. Three roots used to hold exactly one entry each while
`Components` held forty-eight in one alphabetical column.

`Select` moves back out of the `Deprecated/` root it briefly occupied and sits in
`Components/Controls` with a `deprecated` badge, two rows from the `Picker` it should be
converted to. Its `@deprecated` JSDoc is unchanged — the badge is a second signal, not a
replacement.

No component's rendering changes. Story **ids** do change with their titles, so a bookmarked
`?path=/docs/components-<name>--docs` needs updating.
