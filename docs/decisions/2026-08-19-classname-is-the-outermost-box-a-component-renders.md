# `className` is the outermost box a component renders

- **Status:** Accepted
- **Date:** 2026-08-19
- **Type:** Component contract
- **Supersedes:** —
- **Superseded by:** —

## Decision

A component's `className` goes on the **outermost element it renders**, never on an inner
one, even when the inner element is "the real control". If an inner element needs its own
escape hatch, it gets a **second, named** prop — `controlClassName` on `Select` — and that
prop is documented as *not* for sizing.

`Select` was the one component in the package breaking this, and this is the record of the
fix ([#112](https://github.com/Sawtaytoes/charcuterie/issues/112)). Every other component
already did it: `Button`, `Card`, `Alert`, `Badge`, `Field`, `LogViewer`, `MediaTile`,
`EmptyState` — the last of which restructured *specifically* to keep `className` outermost
when its container query needed an inner wrapper
([container-query decision](2026-07-29-container-query-variants-are-generated.md)).
`Listbox`/`Combobox` are not exceptions: their `className` is the floating panel, which is
the outermost element *they* render — the trigger is the caller's own node.

## Context

`Select` renders `<div class="relative inline-grid w-full items-center">` around the native
`<select>` because the chevron needs a positioning context, and it forwarded `className` to
the `<select>` only. So the caller's width moved the control while the wrapper — and with
it the `absolute end-3` chevron — stayed full-width. Measured in mux-magic's DSL rules
builder:

```
wrapper: left 55     right 1128.7   width 1073.6
select:  left 55     right 231      width 176
chevron: left 1100.7 right 1116.7
```

**869.6px** between a control and its own chevron, plus the control's text clipping
(`setScriptInfo` → `setScriptInfc`). There was no way to size a `Select` at all — not by
`className`, not by any prop.

This is not a `ui@2.16.0` regression. Before `tailwind-merge`, the caller's `w-44` and the
base `w-full` both landed on the `<select>` and source order picked `w-full`: the width
silently did nothing, and the two elements agreed *because neither had moved*. 2.16.0 made
the caller's half work, which is the only reason the missing half became visible.

## Why

- **It is what callers already believe.** The fleet's real call sites are `w-32`, `w-40`,
  `w-44`, and `ms-auto` — three widths and a margin, every one of them a statement about
  the outer box. `ms-auto` on a `w-full` inner `<select>` did precisely nothing, and had
  been sitting there unnoticed.
- **A component's box is the thing you can compose with.** Width, margin, `display`,
  `position`, grid/flex placement are all properties of the element a parent lays out. A
  prop that reaches past that element into a child cannot express any of them.
- **The alternatives are worse.** A `width` prop (option 2 in #112) adds API for the one
  thing `className` is universally expected to do, and covers only one of the properties
  above. Dropping `w-full` from the wrapper (option 3) changes the default for every
  existing consumer — including every `Select` inside a `Field`, which is most of them.
- **Consistency is the whole point of the package.** One component with an inverted
  `className` is a trap that each consumer pays for once, silently.

## Evidence

Asserted as a **measurement**, in `Select.test.tsx`, because that is the only form of the
claim that could have caught it:

```ts
await expect(wrapperBox.width).toBe(176)
await expect(selectBox.width).toBe(wrapperBox.width)
await expect(selectBox.right - chevronBox.right).toBeCloseTo(12, 1)
```

Every class-name assertion this could have been would have **passed** the whole time —
`w-44` really was in the DOM, on the element nobody was looking at. Verified failing
against the pre-fix component (`expected 414 to be 176`) and passing after.

The breaking half is narrow and mechanical: an inner-element class moves to
`controlClassName`.

```diff
-<Select className="w-44 font-mono" … />
+<Select className="w-44" controlClassName="font-mono" … />
```

> mux-magic worked around it by moving the width to a wrapping `<div>` and dropping it from
> `className` — that is a workaround, not a fix — every future caller will hit the same wall.
>
> — [#112](https://github.com/Sawtaytoes/charcuterie/issues/112)
