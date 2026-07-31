import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type {
  AccordionHeadingLevel,
  AccordionItem,
} from "./Accordion.tsx"

/**
 * Written out rather than interpolated into a tag name. React
 * accepts `` `h${level}` `` perfectly well; a reader and a grep do
 * not, and "which heading levels does this component emit" should be
 * answerable by looking.
 */
const HEADING_TAG: Record<
  AccordionHeadingLevel,
  "h2" | "h3" | "h4" | "h5" | "h6"
> = {
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
}

export type AccordionSectionProps = {
  headingLevel: AccordionHeadingLevel
  id: string
  isExpanded: boolean
  item: AccordionItem
  onToggle: (key: string) => void
  panelId: string
  /**
   * `VisibilityGroup.register` or `MultiplePicker.register`,
   * whichever kind the accordion is running. Both have this shape,
   * which is the point of the kinds being separate rather than one
   * configurable one.
   */
  register: (key: string) => () => void
}

/**
 * Its own file for the same reason `TabTrigger` is: **registration
 * is an effect**, and an effect cannot run in a loop.
 *
 * A disabled section stays out of the group entirely — it is not a
 * member, so nothing can expand it, including a consumer passing its
 * key in `expandedKeys`. That is registration-as-membership again,
 * and it is the behaviour a `<summary>` cannot have at all.
 */
export const AccordionSection = ({
  headingLevel,
  id,
  isExpanded,
  item,
  onToggle,
  panelId,
  register,
}: AccordionSectionProps): ReactNode => {
  const { isDisabled = false, key, label } = item

  const Heading = HEADING_TAG[headingLevel]

  useEffect(() => {
    if (isDisabled) {
      return
    }

    return register(key)
  }, [isDisabled, key, register])

  return (
    <div className="bg-surface-raised">
      <Heading className="m-0 text-md">
        <button
          aria-controls={panelId}
          aria-expanded={isExpanded}
          className={toClassName(
            "flex w-full cursor-pointer items-center justify-between gap-3 bg-transparent px-4 py-3 text-start font-medium text-content-primary text-sm transition-colors duration-(--duration-fast) ease-standard",
            "hover:bg-intent-neutral-surface",
            isDisabled &&
              "cursor-not-allowed text-content-disabled hover:bg-transparent",
            FOCUS_RING_CLASS,
          )}
          disabled={isDisabled}
          id={id}
          onClick={() => {
            onToggle(key)
          }}
          type="button"
        >
          {label}

          <svg
            // Decoration. The button already announces
            // `aria-expanded`, which is the same fact said properly.
            aria-hidden="true"
            className={toClassName(
              "size-4 shrink-0 text-content-secondary transition-transform duration-(--duration-fast) ease-standard",
              isExpanded && "rotate-180",
            )}
            fill="none"
            focusable={false}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </Heading>

      {/*
        `group`, not `region`, and the difference is a landmark.

        The APG's accordion pattern says a panel *may* take
        `role="region"` and adds a caveat in the same breath: avoid
        it "in circumstances that create landmark region
        proliferation". A component library has to assume the worst
        case, and the worst case arrived on the first board — four
        accordions produced four landmarks named "Disc", and axe's
        `landmark-unique` failed the story. A real page with a job
        list does exactly that.

        Dropping the role entirely was the first fix and it was
        wrong: `aria-labelledby` on a roleless `<div>` is **inert**,
        so the panel would have lost its name rather than just its
        landmark — caught by `useAriaPropsSupportedByRole`, which is
        the one linter rule in this file that was right.

        `group` is the role the caveat is reaching for: "a set of UI
        objects **not** intended to be included in a page summary".
        It keeps `aria-labelledby` meaningful and stays out of the
        landmark list.
      */}
      {/* biome-ignore lint/a11y/useSemanticElements: the semantic element for `group` is `<fieldset>`, which is a form-control grouping — it drags `<legend>` semantics and form-reset behaviour onto an accordion panel that contains prose. */}
      <div
        aria-labelledby={id}
        className="px-4 pt-1 pb-4 text-content-secondary text-sm"
        // `hidden` rather than unmounting, matching `Tabs`. A panel
        // that unmounts loses a scroll position, a partially typed
        // form, and any subscription its content opened — and the
        // fleet's log panes are exactly that.
        hidden={!isExpanded}
        id={panelId}
        // `group`, not `region`. A `group` is explicitly "a set of
        // UI objects **not** intended to be included in a page
        // summary", so it carries `aria-labelledby` and the
        // trigger↔panel relationship without joining the landmark
        // list — which is exactly the distinction the APG's caveat
        // is reaching for and does not have a role for.
        role="group"
      >
        {item.content}
      </div>
    </div>
  )
}
