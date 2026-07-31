import {
  useMultiplePicker,
  useUniqueId,
  useVisibilityGroup,
} from "@charcuterie/logic"
import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"
import { AccordionSection } from "./AccordionSection.tsx"

export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6

export type AccordionItem = {
  content: ReactNode
  isDisabled?: boolean
  key: string
  label: ReactNode
}

export type AccordionProps = {
  className?: string
  /** **Initial** only. Charcuterie owns it from then on. */
  expandedKeys?: string[]
  /**
   * The heading level the triggers sit at. An accordion inside a
   * `Card` that already has an `<h2>` needs `3`, and getting this
   * wrong is a document-outline break that no gate here can see —
   * it depends entirely on the page.
   */
  headingLevel?: AccordionHeadingLevel
  /**
   * Several sections open at once. The default is **exclusive**,
   * because that is what every one of the fleet's disclosure groups
   * does today.
   */
  isMultiple?: boolean
  items: AccordionItem[]
  onChange?: (expandedKeys: string[]) => void
}

/**
 * Eleven sites in the fleet, and the plan called it "nearly free
 * once `Tabs` exists". It is — the exclusive mode is
 * `VisibilityGroup` and nothing else — but the reason it is worth
 * shipping is not the saving.
 *
 * ### The two-owners bug, live, in the app this milestone migrates
 *
 * mux-magic's `JobStepsDisclosure` is built on `<details>`, and
 * `<details>` **owns `open`**. It also wants the state in a Jotai
 * atom so a job can be expanded from elsewhere. Reconciling the two
 * takes three separate mechanisms:
 *
 * ```tsx
 * const detailsRef = useRef<HTMLDetailsElement>(null)
 * const skipNextToggleRef = useRef(isOpen)
 *
 * useEffect(() => {
 *   if (detailsRef.current) detailsRef.current.open = isOpen
 * }, [isOpen])
 *
 * const handleToggle = (event) => {
 *   if (skipNextToggleRef.current) {
 *     skipNextToggleRef.current = false
 *     return          // ← swallow the toggle our own write just fired
 *   }
 *   setStepsOpen(…)
 * }
 * ```
 *
 * That is the Radix argument from `Popover` pointed at the platform:
 * a ref to reach past React, an effect to push state into the DOM,
 * and a guard to stop the DOM's echo coming back. Every one of the
 * three exists only because two things hold one fact.
 *
 * So this is a `<button aria-expanded>` and a `role="region"` — the
 * ARIA Authoring Practices accordion — with `VisibilityGroup`
 * holding the state alone. `<details name="…">` is the platform's
 * own exclusive accordion and was rejected for the same reason, plus
 * one it cannot fix: **a `<summary>` cannot be disabled**, and four
 * of the fleet's eleven sites have a section that is unreachable
 * until a job produces it.
 *
 * ### Two kinds, one component, and both hooks always run
 *
 * `isMultiple` picks between `VisibilityGroup` and `MultiplePicker`,
 * and hooks cannot be conditional — so both are created and one is
 * consulted. That is two empty stores and no DOM, which is cheaper
 * than the alternative: reimplementing exclusivity on top of
 * `MultiplePicker` by deselecting the others, which is precisely the
 * logic `VisibilityGroup` exists to own once.
 */
export const Accordion = ({
  className,
  expandedKeys,
  headingLevel = 3,
  isMultiple = false,
  items,
  onChange,
}: AccordionProps): ReactNode => {
  const baseId = useUniqueId()

  const [initialKey] = expandedKeys ?? []

  const group = useVisibilityGroup<string>({
    onChange: (visibleKey) => {
      if (!isMultiple) {
        onChange?.(visibleKey === null ? [] : [visibleKey])
      }
    },
    visibleKey: initialKey ?? null,
  })

  const picker = useMultiplePicker<string>({
    onChange: (selectedValues) => {
      if (isMultiple) {
        onChange?.([...selectedValues])
      }
    },
    selectedValues: expandedKeys,
  })

  /**
   * Visible **or** pending, the same load-bearing fallback `Tabs`
   * needs and for the same reason: members register from an effect,
   * so on the first paint the intent still lives in the pending
   * field. Reading only the settled one renders every section
   * collapsed and corrects itself a frame later — a flash on a
   * desktop and a visible jump on the kiosk Pi.
   *
   * **And only until something registers**, which `Tabs` never had
   * to say because it seeds itself from the first *enabled* tab. A
   * key that can never register — a disabled section's — stays
   * pending forever, so an unqualified fallback renders it expanded
   * permanently and `isDisabled` quietly stops meaning anything.
   * Found by the story that passes a disabled key on purpose.
   *
   * Every member registers in one commit, so this really is "before
   * the first effects ran" rather than a race between them.
   */
  const hasRegistered = isMultiple
    ? picker.registeredValues.length > 0
    : group.registeredKeys.length > 0

  const expanded = isMultiple
    ? new Set([
        ...picker.selectedValues,
        ...(hasRegistered ? [] : picker.pendingValues),
      ])
    : new Set(
        [
          group.visibleKey ??
            (hasRegistered ? null : group.pendingKey),
        ].filter((key) => key !== null),
      )

  return (
    <div
      className={toClassName(
        "flex flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle",
        className,
      )}
    >
      {items.map((item, index) => (
        <AccordionSection
          headingLevel={headingLevel}
          id={`${baseId}-trigger-${index}`}
          isExpanded={expanded.has(item.key)}
          item={item}
          key={item.key}
          onToggle={
            isMultiple ? picker.toggle : group.toggle
          }
          panelId={`${baseId}-panel-${index}`}
          register={
            isMultiple ? picker.register : group.register
          }
        />
      ))}
    </div>
  )
}
