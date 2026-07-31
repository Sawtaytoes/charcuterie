import {
  useClonedChild,
  useUniqueId,
} from "@charcuterie/logic"
import type { ReactElement, ReactNode } from "react"

import { toClassName } from "../toClassName.ts"

export type FieldProps = {
  /**
   * The control. **Cloned, not wrapped** — the same slot contract
   * as `Popover`'s trigger, so a `Field` can go around an `<input>`,
   * a `<textarea>`, a `Select`, or an app's own control without
   * changing that control's layout.
   */
  children: ReactElement
  className?: string
  /**
   * Standing help — units, a format, a warning about what the value
   * does. Announced with the control, before any error.
   */
  description?: ReactNode
  /**
   * Present means invalid. There is no separate `isInvalid`, because
   * two sources for one fact is how a control ends up
   * `aria-invalid="true"` with nothing saying why — which is what
   * `RegexWithFlagsField` does in mux-magic today.
   */
  error?: ReactNode
  isRequired?: boolean
  label: ReactNode
}

/**
 * Sixteen files in the fleet spell a label, a control, and a hint,
 * and no two spell the wiring the same way. `FieldLabel` in
 * mux-magic renders a `<label>` with no `htmlFor` at all — which
 * looks correct, reads correctly to a sighted user, and gives a
 * screen reader an unnamed textbox.
 *
 * ### The ids are static, and that is why `createLinkedIds` is not here
 *
 * The plan expected `useLinkedIds` to do this wiring. It does not
 * fit, for the same reason it did not fit `Tabs`: that kind exists
 * for a **dynamic** pairing, where the registration multiset is what
 * stops an `aria-describedby` naming a node React has already
 * removed. A field renders its own description and its own error, so
 * it knows at render which of them exist — the ids come from one
 * `useUniqueId` and a conditional join, and they cannot get out of
 * step at all.
 *
 * That leaves `createLinkedIds` with **no consumer in this package
 * across twenty-five components**, which is worth saying plainly
 * rather than manufacturing a use for. It is the one state kind the
 * component layer has never needed.
 *
 * ### Order matters inside `aria-describedby`
 *
 * Description first, error second. A screen reader reads the list in
 * order, and "millisecondsonly — required" is a different sentence
 * from "required — milliseconds only". Nothing enforces this but the
 * order of the array below, which is why it is not built from an
 * object.
 *
 * ### The error is described, not announced
 *
 * No `role="alert"` and no live region here, deliberately. An error
 * bound through `aria-describedby` is read when the control takes
 * focus, which is when the user can act on it; a live region on the
 * same text announces it a second time, from nowhere, while the
 * caret is elsewhere. A form that fails on submit should say so
 * once, at the top, with the `Alert` this library already ships —
 * and then the user tabs into the field and hears the specific
 * reason.
 */
export const Field = ({
  children,
  className,
  description,
  error,
  isRequired = false,
  label,
}: FieldProps): ReactNode => {
  const baseId = useUniqueId()

  const controlId = `${baseId}-control`

  const descriptionId = `${baseId}-description`

  const errorId = `${baseId}-error`

  const describedBy = [
    description === undefined ? null : descriptionId,
    error === undefined ? null : errorId,
  ]
    .filter(Boolean)
    .join(" ")

  const clonedControl = useClonedChild(children, {
    "aria-describedby":
      describedBy === "" ? undefined : describedBy,
    // `aria-invalid` is derived from the error's presence, never
    // passed. A control marked invalid with no described reason is
    // a screen reader saying "invalid" and stopping.
    "aria-invalid": error === undefined ? undefined : true,
    // Both, and they are not redundant: `required` is the
    // constraint the browser validates and `aria-required` is the
    // one it announces on a control the browser does not validate
    // — a `role="combobox"`, or anything composite.
    "aria-required": isRequired || undefined,
    id: controlId,
    required: isRequired || undefined,
  })

  return (
    <div
      className={toClassName(
        "flex flex-col gap-1.5",
        className,
      )}
    >
      <label
        className="font-medium text-content-primary text-sm"
        htmlFor={controlId}
      >
        {label}

        {isRequired ? (
          <span
            // Decoration beside a real `aria-required`. An asterisk
            // announced as "asterisk" is noise; announced as
            // nothing, with the control already saying "required",
            // is correct.
            aria-hidden="true"
            className="ms-1 text-intent-danger-content"
          >
            *
          </span>
        ) : null}
      </label>

      {clonedControl}

      {description === undefined ? null : (
        <p
          className="text-content-secondary text-xs"
          id={descriptionId}
        >
          {description}
        </p>
      )}

      {error === undefined ? null : (
        <p
          className="text-intent-danger-content text-xs"
          id={errorId}
        >
          {error}
        </p>
      )}
    </div>
  )
}
