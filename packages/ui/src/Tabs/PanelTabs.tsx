import {
  selectTabIndex,
  useRovingFocus,
  useSinglePicker,
  useUniqueId,
} from "@charcuterie/logic"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { toClassName } from "../toClassName.ts"
import type { TabsPanelProps } from "./Tabs.tsx"
import { TabTrigger } from "./TabTrigger.tsx"
import type { TabsOrientation } from "./tabItems.ts"
import { toTabListClass } from "./tabStyles.ts"

const ORIENTATION_KEYS: Record<
  TabsOrientation,
  { next: string; previous: string }
> = {
  horizontal: {
    next: "ArrowRight",
    previous: "ArrowLeft",
  },
  vertical: { next: "ArrowDown", previous: "ArrowUp" },
}

/**
 * The panel bar — every tab a `<button>`, every section a
 * `role="tabpanel"` this component renders and hides. See `Tabs`
 * for which of the two bars a screen wants.
 *
 * The composition is two hooks and one decision:
 *
 * ```ts
 * const selection = useSinglePicker({ selectedValue: initialKey })
 * const focus = useRovingFocus({ activeValue: initialKey })
 *
 * // `automatic` is this line, and `manual` is its absence.
 * if (activation === "automatic") selection.select(focus.activeValue)
 * ```
 *
 * ### Selection, not visibility — and the difference is not cosmetic
 *
 * M4 built this on `VisibilityGroup`, and the panels do end up
 * one-at-a-time either way, because the two cores are the same
 * shape. But the thing that **registers** here is the tab, not the
 * panel, and what a tab bar is asking is *which one did you pick*.
 * `SinglePicker` is the kind that answers that; the panel's
 * `hidden` is derived from the answer.
 *
 * Reading it the other way round cost something concrete: it made
 * `aria-selected` a report about a *panel's* visibility, so a
 * consumer wanting a tab bar with no panels at all — a segmented
 * filter, a view switcher that swaps a route — had to model its
 * choice as a group of visibilities it did not have. `Alert`'s
 * sibling `SegmentedControl` is exactly that consumer, and it now
 * shares this component's core rather than hand-rolling a fourth
 * one.
 * [Decision](../../../../docs/decisions/2026-07-30-tab-selection-is-a-single-picker.md).
 *
 * ### What it does not use, and why that is the right answer
 *
 * The plan expected `createLinkedIds` here as well. It does not
 * fit, and forcing it would have been the wrong call: that kind
 * exists for a **dynamic** trigger↔target pair — a `Popover` whose
 * panel mounts and unmounts, where the multiset is what stops
 * `aria-controls` pointing at a node React has already removed. A
 * tab bar's pairing is static and known at render, so the ids come
 * from one `useUniqueId` and cannot get out of step at all.
 *
 * ### Focus is moved deliberately, and only then
 *
 * `RovingFocus` is state; something still has to call `.focus()`.
 * That happens only while the tablist already contains the focused
 * element — otherwise mounting a tab bar, or any parent re-render
 * that moved `activeValue`, yanks the caret out of whatever the
 * user was actually doing.
 */
export const PanelTabs = ({
  activation = "automatic",
  activeKey,
  className,
  label,
  onChange,
  orientation = "horizontal",
  tabs,
}: TabsPanelProps): ReactNode => {
  const baseId = useUniqueId()

  const tablistRef = useRef<HTMLDivElement>(null)

  const tabElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const initialKey =
    activeKey ??
    tabs.find((one) => !one.isDisabled)?.key ??
    null

  const selection = useSinglePicker<string>({
    onChange,
    selectedValue: initialKey,
  })

  const focus = useRovingFocus<string>({
    activeValue: initialKey,
  })

  const { select } = selection

  const { activeValue, setActiveValue } = focus

  /**
   * Selected **or** pending, and the fallback is load-bearing.
   *
   * Members register from an effect, so on the first paint
   * `selectedValue` is still null and the intent lives in
   * `pendingValue` — a tab bar reading only the former renders with
   * no tab selected and no panel shown, then corrects itself a
   * frame later. It is a flash on a fast machine and a visible
   * blank on a kiosk Pi.
   *
   * The core distinguishes the two on purpose, which is why this
   * belongs here rather than in the selector — unlike
   * `RovingFocus`, where the equivalent first-paint hole was in
   * `selectTabIndex` itself and got fixed there.
   */
  const shownKey =
    selection.selectedValue ?? selection.pendingValue

  const selectTab = useCallback(
    (key: string) => {
      // Both, because a pointer press moves focus *and* chooses.
      // Only selecting would leave `automatic`'s effect below to
      // put the old panel straight back.
      setActiveValue(key)

      select(key)
    },
    [select, setActiveValue],
  )

  useEffect(() => {
    // Automatic activation, and the only behaviour that differs
    // between the two modes. `select` is idempotent, so this is a
    // no-op on every render where focus did not actually move.
    if (
      activation === "automatic" &&
      activeValue !== null
    ) {
      select(activeValue)
    }
  }, [activation, activeValue, select])

  useEffect(() => {
    const tablist = tablistRef.current

    if (
      !tablist ||
      activeValue === null ||
      !tablist.contains(document.activeElement)
    ) {
      return
    }

    tabElements.current.get(activeValue)?.focus()
  }, [activeValue])

  const keys = ORIENTATION_KEYS[orientation]

  return (
    <div
      className={toClassName(
        "flex flex-col gap-3",
        className,
      )}
    >
      <div
        aria-label={label}
        aria-orientation={orientation}
        className={toTabListClass(orientation)}
        onKeyDown={(keyEvent) => {
          const commands: Record<string, () => void> = {
            [keys.next]: focus.next,
            [keys.previous]: focus.previous,
            End: focus.last,
            Home: focus.first,
          }

          const command = commands[keyEvent.key]

          if (command) {
            // Arrow keys scroll the page by default, and a tab bar
            // that scrolls the window while it moves focus is the
            // hand-rolled version of this component.
            keyEvent.preventDefault()

            command()

            return
          }

          // `manual`'s commit. In `automatic` the panel is showing
          // already, so this is the no-op that makes Enter behave
          // identically in both modes.
          if (
            (keyEvent.key === "Enter" ||
              keyEvent.key === " ") &&
            activeValue !== null
          ) {
            keyEvent.preventDefault()

            select(activeValue)
          }
        }}
        ref={tablistRef}
        role="tablist"
      >
        {tabs.map((tab, index) => (
          <TabTrigger
            id={`${baseId}-tab-${index}`}
            isSelected={shownKey === tab.key}
            key={tab.key}
            onSelect={selectTab}
            panelId={`${baseId}-panel-${index}`}
            registerFocus={focus.register}
            orientation={orientation}
            registerSelection={selection.register}
            tab={tab}
            // The roving-tabindex rule read from the core rather
            // than restated here: exactly one member is in the tab
            // order, so Tab enters and leaves the bar once while
            // the arrow keys move inside it.
            tabIndex={selectTabIndex(focus, tab.key)}
            trackElement={(key, element) => {
              if (element) {
                tabElements.current.set(key, element)
              } else {
                tabElements.current.delete(key)
              }
            }}
          />
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          aria-labelledby={`${baseId}-tab-${index}`}
          hidden={shownKey !== tab.key}
          id={`${baseId}-panel-${index}`}
          key={tab.key}
          role="tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
