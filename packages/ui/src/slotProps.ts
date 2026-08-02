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
 * The list is deliberately closed rather than an index signature. It
 * is exactly the wiring `Field` writes plus the wiring `Tooltip`
 * writes, it is greppable, and an open `Record<string, unknown>`
 * would forward a caller's typo onto a DOM node just as silently as
 * the bug it replaces.
 */
export type SlotProps = {
  /**
   * A **space-separated list of ids**, which is why this module
   * exists at all — see `mergeSlotProps`.
   */
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  "aria-required"?: boolean
  /**
   * Set by an ancestor `Field` so its `<label htmlFor>` has something
   * to point at. A caller may also pass one directly, which is how a
   * consumer pins a stable id for a deep link or an autofill hint.
   */
  id?: string
  required?: boolean
}

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
 */
export const mergeSlotProps = <
  OwnProps extends Record<string, unknown>,
>(
  receivedProps: SlotProps,
  ownProps: OwnProps,
): OwnProps & SlotProps => {
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
  }
}
