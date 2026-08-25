---
"@charcuterie/ui": minor
---

`Menu`, `Listbox` and `Combobox` take an `itemSize`, and a panel row is sized by the same
tokens as a `Button`.

Panel rows were a hardcoded `px-2 py-1.5 text-sm` — a size no control in the library
shares — so an option was always visibly the smaller thing beside the control that opened
it. They now read one shared map over `--control-height-*`, `--control-padding-inline-*`
and `--control-gap-*`, through an `itemSize` prop taking the same `sm` / `md` / `lg` a
`Button` takes. It is a `min-h-` rather than an `h-`, so a rich option with a second line
or a trailing `Badge` still grows past the floor.

**Two visual defaults change.** `Menu` defaults to `lg` (2.75rem, 44px at `comfortable`
density) — a menu item is a pointer target before it is a list row. `Listbox` and
`Combobox` default to `md` (2.25rem), the height their trigger already takes. Pass
`itemSize="sm"` for the previous rows.

A `Combobox`'s `itemSize` drives its **search field as well as** its options: two sizes
inside one panel was the defect. The row's hand-picked `px-3` is retired for the list's own
`p-1`, so the caret and the option labels cannot drift apart again.

A window shorter than 40rem steps every panel row down one size, and one shorter than 30rem
takes it to `sm`. `Menu`'s panel is now also clamped to the space the viewport left it and
scrolls inside that — it had no clamp at all before, which was survivable at a 32px row and
is not at 44px.

A `Menu`'s panel is also clamped to the viewport's **width**. A portalled panel is
`position: fixed`, so its shrink-to-fit width stopped at the window rather than at the
space `shift` left it — a long label produced a panel exactly as wide as a 390px viewport
at `left: 8`, with 8px of itself off the right edge. Pre-existing and size-independent, but
a `lg` row's larger type is what makes a real label reach it.

`MenuAction`'s hover tint moves to `intent-neutral-surface-hover` and loses its base
`bg-transparent`, the correction already applied to `ListboxOption` and `ComboboxOption`.
