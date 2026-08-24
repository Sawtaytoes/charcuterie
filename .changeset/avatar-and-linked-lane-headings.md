---
"@charcuterie/ui": minor
---

Add `Avatar`, and let a `BoardLane` heading be a link.

`Avatar` is a person as a coloured chip — a glyph or an initial on the categorical scale,
with the name in `aria-label` and `title` and never printed as visible text. Unassigned
renders `null` rather than a grey placeholder. The colour comes from `getCategoricalIndex`
when no `categorical` is passed, so the same person is the same colour on every machine
and every reload; pass `categoricalKey` with the user's id so a rename does not repaint
them. `imageUrl` falls back to the initials when it is absent or fails to load. The circle
is 1.9 x its own type size, so it moves with the density axis instead of clipping at one
end of it.

`BoardLane.href` makes a column title navigate. It is a link **inside** the heading, so
the heading keeps its level, its id and its role as the lane group's name. `label` stays a
`string` and every existing consumer is unaffected — a lane with no `href` renders exactly
what it rendered before. A consumer that was putting a link in `BoardLane.actions` as a
stopgap can take it out.
