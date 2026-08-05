---
"@charcuterie/ui": minor
---

Menu: `items` accepts non-item entries. It is now a union — a `MenuItem` (a bare
`{ key, label, onSelect }` still type-checks), a `MenuSeparator` (`{ type:
"separator" }` → `role="separator"`), or a `MenuGroup` (`{ type: "group", label,
items }` → `role="group"` named by its label). Plus a new `emptyState?: ReactNode`
prop, rendered as a disabled `menuitem` when there is nothing to show (a `role="menu"`
must own a `menuitem`, so the note is one — `aria-disabled`, out of the roving group).
Backward compatible: existing `MenuItem[]` arrays need no change. The keyboard model
is unchanged — separators and group headings register nothing, so the arrow keys skip
them the same way a disabled item is skipped.
