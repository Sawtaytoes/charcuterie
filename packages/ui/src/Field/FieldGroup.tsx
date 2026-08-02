import { useUniqueId } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"

export type FieldGroupProps = {
  /**
   * The controls. **Rendered as-is, not cloned** — that is the whole
   * difference from `Field`, and it is why this is a separate
   * component rather than a boolean on that one.
   */
  children: ReactNode
  className?: string
  /** Standing help for the group as a whole. */
  description?: ReactNode
  /** Present means the group is invalid. */
  error?: ReactNode
  isRequired?: boolean
  label: ReactNode
}

/**
 * A label over **several** controls.
 *
 * `Field` mints one id and clones it onto one child, which is the
 * right shape for a text input and the wrong shape the moment there
 * are two of them: an `id` can only name one element, and a
 * `<label htmlFor>` can only point at one. Six of mux-magic's sixteen
 * field components are in that position — `RegexWithFlagsField`
 * (pattern, flags, sample, and a checkbox), `NumberWithLookupField`
 * (three inputs), `LanguageCodeField`, `LanguageCodesField`,
 * `SubtitleTypesField` (a tag input beside a dropdown) and
 * `RenameRegexField` (a row per rule) — and every one of them renders
 * a `FieldLabel` whose `htmlFor` names, at best, one of them.
 *
 * ### `<fieldset>` and `<legend>`, not a `<label>`
 *
 * This is the one place in the library where `<fieldset>` is right.
 * `AccordionSection` rejected it for its panel and said why — it is a
 * *form-control grouping*, and dragging `<legend>` semantics onto
 * prose is wrong. Here the content **is** a form-control grouping,
 * so the element means what it says, `<legend>` names the group
 * natively, and no `role="group"` and no `aria-labelledby` are
 * needed.
 *
 * A `<label>` here would be the mux-magic defect deliberately: a
 * label pointing at one control, or at none.
 *
 * ### What a group cannot carry
 *
 * `aria-invalid` has no group form — it belongs on the control that
 * is actually invalid, and this component does not know which one
 * that is. So `error` here is *described*, not *asserted*: it joins
 * `aria-describedby` on the `<fieldset>`, which screen readers read
 * as focus enters the group. A control inside that is itself invalid
 * should say so itself, in its own `Field`.
 *
 * That is a real limitation and it is stated rather than papered
 * over — the alternative was to clone `aria-invalid` onto every
 * child, which marks the valid ones invalid.
 */
export const FieldGroup = ({
  children,
  className,
  description,
  error,
  isRequired = false,
  label,
}: FieldGroupProps): ReactNode => {
  const baseId = useUniqueId()

  const descriptionId = `${baseId}-description`

  const errorId = `${baseId}-error`

  // Description first, error second, for the reason `Field` gives:
  // a screen reader reads the list in order and the two sentences
  // are not interchangeable.
  const describedBy = [
    description === undefined ? null : descriptionId,
    error === undefined ? null : errorId,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <fieldset
      aria-describedby={
        describedBy === "" ? undefined : describedBy
      }
      className={toClassName(
        // A `<fieldset>` arrives with a border, an inline margin, a
        // block padding, and `min-inline-size: min-content` — the
        // last of which makes it refuse to shrink inside a flex or
        // grid parent, which is the reason design systems avoid the
        // element. All four are cleared here, once.
        "m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0",
        className,
      )}
    >
      <legend className="mb-1.5 p-0 font-medium text-content-primary text-sm">
        {label}

        {isRequired ? (
          <span
            // Decoration, as in `Field`. An asterisk announced as
            // "asterisk" is noise; the controls inside carry their
            // own `required`.
            aria-hidden="true"
            className="ms-1 text-intent-danger-content"
          >
            *
          </span>
        ) : null}
      </legend>

      {children}

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
    </fieldset>
  )
}
