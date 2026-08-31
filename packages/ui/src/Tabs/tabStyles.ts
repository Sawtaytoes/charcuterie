import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { TabsOrientation } from "./tabItems.ts"

/**
 * The selected marker runs along the edge the tab list itself
 * sits on — under a horizontal bar, down the inline-end of a
 * vertical rail — and the negative margin pulls it over the
 * list's own border so the two read as one line rather than two.
 *
 * Logical properties throughout, which is the house rule and also
 * the only way a vertical rail lands on the correct side in RTL.
 */
const ORIENTATION_EDGE_CLASS: Record<
  TabsOrientation,
  { base: string; selected: string }
> = {
  horizontal: {
    base: "-mb-px border-b-2",
    selected: "border-b-intent-accent-solid",
  },
  vertical: {
    base: "-me-px border-e-2 text-start",
    selected: "border-e-intent-accent-solid",
  },
}

/**
 * One tab's paint, shared by the `<button>` a panel tab renders and
 * the `<a href>` a routed tab renders.
 *
 * **This file is the reason the two cannot drift.** Docket's project
 * bar and Docket's Settings bar are the same shape doing the same
 * job, and before the routed mode existed the first was a `Nav`
 * wearing a filled pill while the second was a `Tabs` wearing this
 * underline — two answers to one question, in one app, on adjacent
 * screens
 * ([decision](../../../../docs/decisions/2026-08-31-a-routed-tab-is-a-tab-with-an-href.md)).
 *
 * The caller adds the one class that is genuinely its own: a button
 * needs `cursor-pointer`, an anchor needs `no-underline`.
 */
export const toTabTriggerClass = ({
  isDisabled,
  isSelected,
  orientation,
}: {
  isDisabled: boolean
  isSelected: boolean
  orientation: TabsOrientation
}): string => {
  const edge = ORIENTATION_EDGE_CLASS[orientation]

  return toClassName(
    "border-transparent px-3 py-2 font-medium text-sm whitespace-nowrap transition-colors duration-(--duration-fast) ease-standard",
    edge.base,
    // Two entries rather than one interpolated string:
    // `tailwindCandidates.test.ts` rejects a template literal
    // in a className outright, because Tailwind's scanner
    // cannot see a class that only exists at runtime.
    isSelected && edge.selected,
    isSelected
      ? "text-content-primary"
      : "text-content-secondary hover:text-content-primary",
    isDisabled &&
      "cursor-not-allowed text-content-disabled hover:text-content-disabled",
    FOCUS_RING_CLASS,
  )
}

/**
 * The list's own box — the border the selected marker sits on, and
 * the scroll rule.
 *
 * A tab bar **scrolls**; it does not wrap and it does not paint
 * outside its container. Without an `overflow`, a bar narrower than
 * its tabs simply spilled across whatever sat beside it — visible in
 * the `Responsive` board since M4, and invisible to a test asserting
 * only that `scrollWidth > clientWidth`, which is true of a
 * *spilling* bar too.
 *
 * The scrollbar is hidden rather than thin: a classic scrollbar takes
 * layout space inside the scroll container, so the narrow bar would
 * grow ~15px taller than the wide one and the underline would stop
 * lining up across a board. Keyboard users never need it — a panel
 * bar's `RovingFocus` calls `.focus()`, a routed bar's links are in
 * the tab order, and the browser scrolls a focused element into view.
 */
export const toTabListClass = (
  orientation: TabsOrientation,
): string =>
  toClassName(
    "flex gap-1 border-border-subtle",
    "[scrollbar-width:none]",
    // An `overflow` other than `visible` clips its descendants'
    // **outlines**, and this component's focus ring is an outline
    // sitting 2px *outside* the tab. The tab fills the bar's content
    // box, so the ring would be clipped away on exactly the axis that
    // now scrolls. Re-pointing the shared token inward keeps one ring
    // definition — `FOCUS_RING_CLASS` already reads this variable —
    // rather than appending a competing `outline-offset` utility and
    // letting Tailwind's ordering decide the winner.
    "[--focus-ring-offset:calc(var(--focus-ring-width)*-1)]",
    orientation === "horizontal"
      ? "flex-row overflow-x-auto border-b"
      : "flex-col items-stretch overflow-y-auto border-e",
  )
