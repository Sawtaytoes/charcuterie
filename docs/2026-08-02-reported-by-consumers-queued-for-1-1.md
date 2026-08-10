# Reported by consumers, queued for 1.1

Everything the M6 consumer migrations hit that **1.0.1 deliberately did not fix**. 1.0.1 is
one behaviour fix (the ref merge) plus one type widening, and that narrowness is the point —
this file is what keeps the rest from being lost by being out of scope.

Nothing here is started. Each entry says what the consumer hit, what it costs today, and the
workaround that exists in the meantime, because a workaround that works is the reason an
item can wait.

## Shipped in 1.0.1, listed so the line is clear

| Fixed | Where |
| --- | --- |
| `Menu` and `Tooltip` could not share a trigger — the second clone's `ref` replaced the first's | `mergeSlotWiring`, `mergeClonedProps` |
| A clone replaced the **caller's own** `ref` and handlers on the element they wrote | `useClonedChild`, both bindings |
| `SelectProps.options` rejected a `readonly` array (`TS4104`) | `Select` |

## Queued — API additions, all `minor`

### `Field` overwrites the child's own `id`

> **Shipped 2026-08-05** — precedence is now `<Field id>` → child's own `id` → generated; the
> `Field` prop wins when both are set. See the
> [decision](decisions/2026-08-05-field-adopts-the-childs-own-id.md). `@charcuterie/ui` patch.

`Field` generates `<baseId>-control` and clones it onto its child, so a control that already
had an `id` loses it:

```tsx
<Field label="Rename pattern">
  <input id="rename-pattern" />   {/* becomes `_r_3_-control` */}
</Field>
```

A caller's `id` **is** honoured — but only when it is passed to the `Field`, not to the
control (`receivedSlotProps.id ?? …`), which is the opposite of where an author writing that
snippet puts it. Everything downstream still works, because `<label htmlFor>` follows
whatever `Field` wrote; what breaks is anything *outside* pointing in — a deep link, an
autofill hint, a server-rendered error summary, an existing selector in a consumer's own
tests.

**Workaround:** move the `id` up — `<Field id="rename-pattern" label="…">`. Documented in
`SlotProps`, and it is exactly what the prop is for.

**The fix is not "the child wins".** `Field`'s whole reason to exist is that the `<label>`
and the control cannot disagree, and value props are last-write-wins on purpose
(`useClonedChild`'s "a value the slot injects still wins" test pins that). The candidate is
for `Field` to **read** the child's `id` and adopt it rather than overwrite it — which needs
a decision about what happens when both are set, and that is a 1.1 conversation.

### `Menu` has no point anchor

`MenuProps` takes a required `trigger` element and anchors to it. A **context menu** —
right-click, anchored at the pointer — has no trigger element, and floating-ui's virtual
reference is the mechanism it would need. image-viewer wants one for its gallery.

**Workaround:** none that is honest. An invisible zero-size element positioned at the
pointer is the hand-rolled version, and it is worse than waiting.

### `Menu` has no non-item states

> **Shipped 2026-08-05** — `items` is now a union (`MenuItem | MenuSeparator | MenuGroup`) with
> `role="separator"` / `role="group"`, plus an `emptyState?` prop (a disabled `menuitem`, since a
> `role="menu"` must own one). Arbitrary interactive nodes were **excluded on purpose** — see the
> [decision](decisions/2026-08-05-menu-items-is-a-discriminated-union.md). `@charcuterie/ui` minor.

`items: MenuItem[]` is the whole content model: every entry is a `menuitem` with a label and
an `onSelect`. There is no separator, no group heading, no "no actions available" empty
state, and no way to put an arbitrary node in the panel.

Each of those is a real ARIA decision rather than a rendering one — a separator is
`role="separator"`, a group is `role="group"` with a name, and an empty menu is a menu a
keyboard user can open and not escape from meaningfully. Worth designing together rather
than one at a time.

**Workaround:** two `Menu`s, or an item with `isDisabled` standing in for a heading. Both
are wrong in the accessibility tree, which is why they are workarounds and not the answer.

### `Badge` has no `asChild`

A `Badge` cannot be a link or a button. Consumers want a clickable status pill — filter by
this tag, jump to this job — and today that means wrapping it, which puts an `<a>` around a
`<span>` and loses the pill's own layout in a flex row.

Directly downstream of
[the deferred `cloneElement` question](decisions/2026-08-02-useclonedchild-keeps-cloneelement-in-1-0-1.md):
`asChild` is the Radix `Slot` spelling, and adopting the *name* while the library's slots
are `cloneElement`-based would be two composition models with one vocabulary. Sequence this
**after** that question is answered, not before.

**Workaround:** a `<button>`/`<a>` styled with the badge classes, or a wrapper with
`display: contents`.

### `EmptyState`'s `headingLevel` stops at 4

> **Shipped 2026-08-05** — widened to `2 | 3 | 4 | 5 | 6` (`@charcuterie/ui` minor). Type-only;
> default stays `2`, `` `h${headingLevel}` `` unchanged. A `DeeplyNested` story + an
> `h6` test guard it.

`headingLevel?: 2 | 3 | 4`. A consumer nesting an empty state inside an already-deep section
needs `5` and `6`; there is nothing in the component that cares — `` `h${headingLevel}` `` is
the whole implementation — so the cap is a guess about document structure that the consumer
knows better than we do.

**Workaround:** none needed for correctness in the reported case; the heading is one level
shallower than ideal, which is a nesting warning in axe rather than a failure.

## Queued — internal, no API change

### The two merge helpers are duplicated

> **Shipped 2026-08-05** — `mergeRefs` / `chainHandlers` / `isMergeableRef` / `isEventHandlerName`
> (+ the `MergeableRef` type) now live in `packages/logic/src/react/mergeRefsAndHandlers.ts` and
> are public exports of `@charcuterie/logic` (`minor`); `slotWiring.ts` imports them and keeps
> only its own `mergeSlotWiring` (`@charcuterie/ui` `patch`, no behaviour change).
>
> **The Preact mirror was deliberately left standalone**, correcting the "plus its Preact
> mirror … delete two copies" framing below. Its `mergeRefs` is genuinely different, not a stale
> copy: React 19's callback ref returns a **cleanup** and the merged ref honours it per-ref;
> Preact has no ref-cleanup return, so its `mergeRefs` is `(node) => void` and calls `setRef(…,
> null)` the legacy way. Sharing that one across bindings would hand Preact a contract it does
> not have. So this was a **react ↔ ui** dedup (one copy deleted); `logic/src/preact/mergeClonedProps.ts`
> stays as-is on purpose. A future agent should not "finish the job" by merging it.

`packages/ui/src/slotWiring.ts` and `packages/logic/src/react/mergeClonedProps.ts` (plus its
Preact mirror) carry near-identical `mergeRefs` / `chainHandlers`. Sharing them means
exporting from `@charcuterie/logic`, which is a `minor` — and 1.0.1 is a patch, so the
duplication was the cheaper of the two wrongs for one release. Export them in 1.1 and delete
two copies; `mergeRefs` is a thing a consumer would use directly anyway, which is an argument
for making it public rather than merely shared.

### `MenuAction`'s hover highlight is the wrong tint for an overlay

Found while fixing the [option-row contrast
failure](decisions/2026-08-10-content-muted-is-strengthened-so-the-highlighted-option-row-clears-aa.md)
(#76). Not a contrast bug — a **visibility** one, and it is already covered by a settled
decision that `MenuAction` was simply never updated to follow.

`MenuAction.tsx` highlights with `hover:bg-intent-neutral-surface`. But `Menu`'s panel uses
the shared `PANEL_SURFACE_CLASS`, which is `bg-surface-overlay` — the same panel `Listbox`
and `Combobox` draw on. [The 2026-08-05
record](decisions/2026-08-05-option-rows-carry-no-base-bg-transparent-and-highlight-with-surface-hover.md)
measured exactly this case: in **every dark scheme** `intent-neutral-surface` is a
*base-surface* tint that sits **darker** than `surface-overlay`, so the highlight reads as
no change at all. Daylight/dark, from that record: panel `#252D3B`, `intent-neutral-surface`
`#222A37` (darker), `intent-neutral-surface-hover` `#2B3442` (lighter, visible).

That record says it applies to `ComboboxOption` and `ListboxOption` "**and to any future row
that lives on the `surface-overlay` panel**". `MenuAction` is such a row and was left on the
old tint.

The fix is one token — `hover:bg-intent-neutral-surface` → `hover:bg-intent-neutral-surface-hover`
— but it is a visible change to every menu, so it wants its own before/after rather than
riding along inside a contrast PR. `MenuAction` also still carries the base `bg-transparent`
the same record removed from the other two rows; it is harmless there today because the only
fill is a `hover:` variant (higher specificity), but it is the identical trap the moment
somebody adds a conditional `isActive` tint.

**Workaround:** none needed in light schemes, where the tint is darker than the panel and
does read. Dark-scheme menus simply have a very weak pointer affordance today.

## Not 1.1 — a major, and open

**Should a slot still be built on `cloneElement`?** Kevin's *"we probably shouldn't anymore,
but i'll leave that for later"*, recorded with its reasoning in
[the decision record](decisions/2026-08-02-useclonedchild-keeps-cloneelement-in-1-0-1.md).
Listed here so it is visible beside the items it blocks (`Badge`'s `asChild`, and arguably
`Field`'s `id`), and marked as **not** a 1.1 item: it changes how a consumer writes the
composition, and five apps are on `^1.0.0`.
