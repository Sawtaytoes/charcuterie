import {
  selectTabIndex,
  useRovingFocus,
  useUniqueId,
  useVisibilityGroup,
} from "@charcuterie/logic"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { toClassName } from "../toClassName.ts"
import { TabTrigger } from "./TabTrigger.tsx"

export type TabsActivation = "automatic" | "manual"

export type TabsOrientation = "horizontal" | "vertical"

export type TabItem = {
  content: ReactNode
  /**
   * A disabled tab is simply **not registered** with the roving
   * group. Registration is membership, so the arrow keys skip it
   * without any command in `RovingFocus` having to know what
   * "disabled" means.
   */
  isDisabled?: boolean
  key: string
  label: ReactNode
}

export type TabsProps = {
  /** **Initial** only. Charcuterie owns it from then on. */
  activeKey?: string
  /**
   * `automatic` — the ARIA Authoring Practices default — shows a
   * panel as soon as the arrow keys reach its tab. `manual` moves
   * focus only, and Enter or Space commits.
   *
   * The distinction exists because **focus is not selection**, and
   * it is the entire reason `RovingFocus` is its own state kind. A
   * tab whose panel costs a network request wants `manual`, and
   * the two modes differ by one line below — because two kinds are
   * composed rather than one kind doing both jobs badly.
   */
  activation?: TabsActivation
  className?: string
  /** The tablist's accessible name. Required. */
  label: string
  onChange?: (activeKey: string | null) => void
  orientation?: TabsOrientation
  tabs: TabItem[]
}

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
 * Kept at P0 as the **state layer's falsification test**, not on
 * duplication grounds — the fifteen ad-hoc tab bars that used to
 * justify it were in the withdrawn evidence. What it has to prove
 * is that `VisibilityGroup` and `RovingFocus` compose: one says
 * which panel is shown, the other says which tab is tabbable, and
 * a tab bar needs both at once *and* needs them to disagree on
 * purpose while a user arrows around in `manual` mode.
 *
 * The composition is two hooks and one decision:
 *
 * ```ts
 * const panels = useVisibilityGroup({ visibleKey: initialKey })
 * const focus = useRovingFocus({ activeValue: initialKey })
 *
 * // `automatic` is this line, and `manual` is its absence.
 * if (activation === "automatic") panels.show(focus.activeValue)
 * ```
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
export const Tabs = ({
  activation = "automatic",
  activeKey,
  className,
  label,
  onChange,
  orientation = "horizontal",
  tabs,
}: TabsProps): ReactNode => {
  const baseId = useUniqueId()

  const tablistRef = useRef<HTMLDivElement>(null)

  const tabElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const initialKey =
    activeKey ??
    tabs.find((one) => !one.isDisabled)?.key ??
    null

  const panels = useVisibilityGroup<string>({
    onChange,
    visibleKey: initialKey,
  })

  const focus = useRovingFocus<string>({
    activeValue: initialKey,
  })

  const { show } = panels

  const { activeValue, setActiveValue } = focus

  /**
   * Visible **or** pending, and the fallback is load-bearing.
   *
   * Members register from an effect, so on the first paint
   * `visibleKey` is still null and the intent lives in
   * `pendingKey` — a tab bar reading only the former renders with
   * no tab selected and no panel shown, then corrects itself a
   * frame later. It is a flash on a fast machine and a visible
   * blank on a kiosk Pi.
   *
   * The core distinguishes the two on purpose (`selectIsKeyPending`
   * exists so a `Modal` can decide whether to render children at
   * all), which is why this belongs here rather than in the
   * selector — unlike `RovingFocus`, where the equivalent
   * first-paint hole was in `selectTabIndex` itself and got fixed
   * there.
   */
  const shownKey = panels.visibleKey ?? panels.pendingKey

  const selectTab = useCallback(
    (key: string) => {
      // Both, because a pointer press moves focus *and* chooses.
      // Only showing would leave `automatic`'s effect below to
      // put the old panel straight back.
      setActiveValue(key)

      show(key)
    },
    [setActiveValue, show],
  )

  useEffect(() => {
    // Automatic activation, and the only behaviour that differs
    // between the two modes. `show` is idempotent, so this is a
    // no-op on every render where focus did not actually move.
    if (
      activation === "automatic" &&
      activeValue !== null
    ) {
      show(activeValue)
    }
  }, [activation, activeValue, show])

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
        className={toClassName(
          "flex gap-1 border-border-subtle",
          orientation === "horizontal"
            ? "flex-row border-b"
            : "flex-col items-stretch border-e",
        )}
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

            show(activeValue)
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
            registerPanel={panels.register}
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
