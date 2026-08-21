import type { InputHTMLAttributes } from "react"

import { mergeSlotWiring } from "./slotWiring.ts"

/**
 * The props a **cloning ancestor** injects into the control below it.
 *
 * `Field` and `Tooltip` both take one child and `cloneElement` onto
 * it — "cloned, not wrapped", which is what lets a `Field` go around
 * an `<input>`, a `Select`, or an app's own control without changing
 * that control's layout. The contract has a hole in it the moment two
 * of them are nested:
 *
 * ```tsx
 * <Field label="Pattern" isRequired>
 *   <Tooltip label="A JavaScript regular expression">
 *     <input />
 *   </Tooltip>
 * </Field>
 * ```
 *
 * `Field` clones onto the **`Tooltip` element**, so `id`,
 * `aria-describedby`, `aria-invalid` and `required` are handed to a
 * component that declares none of them — and `cloneElement` does not
 * care. React drops them without a warning, TypeScript never sees
 * them (`Children.only` returns a `ReactElement` with `any` props),
 * every test still passes, and the render is pixel-identical. The
 * `<label>` then points at an `id` that is nowhere in the document.
 *
 * **Silent prop-dropping is the worst version of this**, so the rule
 * is: *a slot component is a pass-through*. Anything in `SlotProps`
 * that arrives from above is forwarded to the child this component
 * clones onto, so a chain of slots behaves like the one control at
 * the bottom of it.
 *
 * ### The list is closed, the forwarding is not
 *
 * Worth being exact, because the two are easy to conflate. This type
 * is a closed list of five keys rather than an index signature: it is
 * exactly the wiring `Field` writes plus the wiring `Tooltip` writes,
 * it is greppable, and it is the set whose **merge semantics are
 * defined** — which for four of them is last-write-wins and for
 * `aria-describedby` is a join.
 *
 * The *runtime* forwards everything. Both components collect their
 * received props with a rest spread and `mergeSlotProps` starts from
 * `...receivedProps`, so an ancestor's `onPointerEnter`, its
 * `onFocus`, its `ref` — none of which are named here — reach the
 * control at the bottom too. That is not an oversight, it is load
 * bearing: a `Tooltip` around a `Field` hands down `useHover`,
 * `useFocus`, `useDismiss` and `refs.setReference`, and a `Field`
 * that forwarded only the five keys below would leave the tip with no
 * trigger and no anchor. A closed *runtime* filter would be
 * mux-magic's `FieldTooltip` defect rebuilt inside the fix for it.
 *
 * The five keys, and who writes them:
 *
 * | Key | Written by |
 * | --- | --- |
 * | `aria-describedby` | `Field` (its description and its error) **and** `Tooltip` (its tip) — the one key that is a list, and the reason `mergeSlotProps` exists |
 * | `aria-invalid` | `Field`, derived from `error` being present |
 * | `aria-required` | `Field`, from `isRequired` — the announced constraint, for a composite control the browser does not validate |
 * | `id` | `Field`, so its `<label htmlFor>` has something to point at. A caller may also pass one directly, which is how a consumer pins a stable id for a deep link or an autofill hint |
 * | `required` | `Field`, from `isRequired` — the constraint the browser validates |
 *
 * ### Why these are `Pick`ed and not written out
 *
 * Three of the five are booleans whose names cannot start with `is`
 * or `has`, because they are not our names — they are the DOM's, and
 * they are spread onto a DOM node verbatim. The house rule has
 * [no carve-out](../../../docs/decisions/2026-07-29-is-has-rule-has-no-external-api-carve-out.md)
 * for that: a *type property* is a shape we own, an object literal
 * key is someone else's contract, and no `eslint-disable` is
 * available because unused disable directives are themselves an
 * error.
 *
 * So this type does not declare a shape. It **selects** one out of
 * React's own `InputHTMLAttributes`, which is the honest description
 * of what it is: five keys of the props React already types for an
 * `<input>`, forwarded unchanged. The same reasoning as the
 * `Record<string, boolean>` in `createReactAdapter` — we are not
 * describing React's shape, we are naming the keys of it we touch —
 * and it has the side benefit that `aria-invalid` gets React's real
 * type (`"grammar"` and `"spelling"` are legal values) rather than
 * the `boolean` a hand-written version would have narrowed it to.
 */
export type SlotProps = Pick<
  InputHTMLAttributes<HTMLElement>,
  | "aria-describedby"
  | "aria-invalid"
  | "aria-required"
  | "id"
  | "required"
>

/**
 * Merge what arrived from above with what this component writes
 * itself.
 *
 * Everything here is a single value and last-write-wins is correct
 * for it — **except `aria-describedby`, which is a list**. Two slot
 * components each writing their own onto one control is the entire
 * nesting problem in one attribute: a `Field` naming its description
 * and its error, and a `Tooltip` naming its tip. A plain spread keeps
 * one of them and loses the other, which is the same silent drop by a
 * shorter route.
 *
 * **Outer first.** A screen reader reads the list in order, and the
 * field's own description and error are the control's primary
 * explanation; a tip is supplementary by construction. The ordering
 * inside a single `Field` — description, then error — is `Field`'s
 * own concern and is unaffected.
 *
 * `undefined` in `ownProps` is *absence*, not an instruction to
 * clear. Both callers spell their optional wiring as
 * `isRequired || undefined`, so a plain spread would let an inner
 * `Field` with no error erase an outer one's `aria-invalid` — the
 * same silent drop, one level down.
 *
 * ### The wiring is not a value, and does not last-write-win
 *
 * `ref` and the `on*` handlers are merged rather than replaced, by
 * `mergeSlotWiring`. This was the 1.0.0 hole: `mergeSlotProps`
 * settled the five *attributes* and left the two props that are not
 * attributes on last-write-wins, so a `Menu` and a `Tooltip` on one
 * trigger each handed it a floating-ui `refs.setReference` and the
 * inner one won. The outer panel had no anchor and rendered in the
 * corner of the viewport — no error, no failing test, and it looks
 * like a CSS bug.
 *
 * ### A wrapping component uses it too, and keeps its own prop type
 *
 * `receivedProps` is generic in `ReceivedProps extends SlotProps`
 * rather than plain `SlotProps`, so the return type carries whatever
 * the caller actually holds instead of narrowing it to the five keys.
 * `FieldGroup` is the reason: it does not clone, its rest props land
 * on its own `<fieldset>`, and it writes an `aria-describedby` that
 * has to **join** a caller's rather than replace it. Narrowing to
 * `SlotProps` on the way out would have dropped `disabled`, `form`,
 * `name` and every `data-*` from the type of the object it spreads
 * onto that element — the props would still arrive at runtime, and
 * only the type would have lied.
 */
export const mergeSlotProps = <
  ReceivedProps extends SlotProps,
  OwnProps extends Record<string, unknown>,
>(
  receivedProps: ReceivedProps,
  ownProps: OwnProps,
): OwnProps & ReceivedProps => {
  const definedOwnProps = Object.fromEntries(
    Object.entries(ownProps).filter(
      ([, value]) => value !== undefined,
    ),
  ) as OwnProps

  const describedBy = [
    receivedProps["aria-describedby"],
    ownProps["aria-describedby"],
  ]
    .filter(Boolean)
    .join(" ")

  return {
    ...receivedProps,
    ...definedOwnProps,
    "aria-describedby":
      describedBy === "" ? undefined : describedBy,
    // Last, because it is the only merge that has to beat
    // `definedOwnProps` — it is composing what that spread would
    // otherwise have thrown away.
    ...mergeSlotWiring(
      receivedProps as Record<string, unknown>,
      definedOwnProps,
    ),
  }
}
