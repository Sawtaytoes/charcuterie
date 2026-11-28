import { useUniqueId } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { SearchInput } from "../SearchInput/SearchInput.tsx"
import { toClassName } from "../toClassName.ts"
import { CatalogPickerOption } from "./CatalogPickerOption.tsx"
import { CatalogPickerRail } from "./CatalogPickerRail.tsx"
import {
  buildCatalogSections,
  buildCatalogTabs,
  type CatalogPickerGroup,
  type CatalogPickerItem,
  pickInitialTabKey,
  toQueryWords,
} from "./catalogPickerView.ts"

export type CatalogPickerPanelProps = {
  /** The glyph inside the search field's clear button. Without one there is no clear button; Escape clears. */
  clearIcon?: ReactNode
  /** The query the panel opens with. For the stories' boards; `CatalogPicker` always opens empty. */
  defaultQuery?: string
  emptyLabel: string
  favorites: readonly string[]
  favoritesLabel: string
  groups: readonly CatalogPickerGroup[]
  /** The search field, for the overlay's initial focus. */
  inputRef?: RefObject<HTMLInputElement | null>
  /** Already stepped down for a short window by `usePanelItemSize`. */
  itemSize: ControlSize
  items: readonly CatalogPickerItem[]
  /** What the picker is for. Names the search field and the list, and (as "<label> groups") the rail. */
  label: string
  /** Escape on an empty query. */
  onDismiss: () => void
  onSelect: (value: string) => void
  searchPlaceholder: string
  value?: string
}

const SEARCH_SIZE: Record<ControlSize, "lg" | "md"> = {
  lg: "lg",
  md: "md",
  sm: "md",
}

const GROUP_HEADING_INSET_CLASS: Record<
  ControlSize,
  string
> = {
  lg: "px-(--control-padding-inline-lg)",
  md: "px-(--control-padding-inline-md)",
  sm: "px-(--control-padding-inline-sm)",
}

/**
 * How many frames the panel waits for its height cap before it gives
 * up on centring the chosen row. `useAnchoredOverlay` writes the cap
 * onto the element inside floating-ui's `size` middleware, a frame or
 * two after mount, and until then the list has nothing to scroll.
 */
const SCROLL_ATTEMPTS = 5

const nextEnabledIndex = (
  rows: readonly { item: CatalogPickerItem }[],
  from: number,
  step: number,
) => {
  for (
    let index = from + step;
    index >= 0 && index < rows.length;
    index += step
  ) {
    if (rows[index]?.item.isDisabled !== true) {
      return index
    }
  }

  return from
}

/**
 * The panel's contents: the rail, the search field, and the grouped
 * listbox. `CatalogPicker` renders it inside its anchored overlay, and
 * it mounts fresh on every open, so the tab, the query and the
 * highlight all start from the chosen value each time.
 *
 * ### The ARIA shape
 *
 * - The **search field** is the `role="combobox"` and keeps focus,
 *   exactly as in `Combobox`: arrows move `aria-activedescendant`
 *   through the options, Enter chooses, Escape clears a query and then
 *   closes.
 * - The **list** is one `role="listbox"`. Search results sit in
 *   labelled `role="group"`s, one per group, the APG grouped-listbox
 *   shape `CommandPalette` uses.
 * - The **rail** is a vertical `role="toolbar"` of toggle buttons
 *   (`aria-pressed`). See `CatalogPickerRail` for why it is not a
 *   `tablist`.
 *
 * Tab and Shift+Tab move between the search field and the rail and
 * nowhere else, so the panel is two tab stops however long the rail is.
 */
export const CatalogPickerPanel = ({
  clearIcon,
  defaultQuery = "",
  emptyLabel,
  favorites,
  favoritesLabel,
  groups,
  inputRef: externalInputRef,
  itemSize,
  items,
  label,
  onDismiss,
  onSelect,
  searchPlaceholder,
  value,
}: CatalogPickerPanelProps): ReactNode => {
  const listId = useUniqueId()

  const ownInputRef = useRef<HTMLInputElement>(null)

  const inputRef = externalInputRef ?? ownInputRef

  const listRef = useRef<HTMLDivElement>(null)

  const railRef = useRef<HTMLDivElement>(null)

  const tabs = useMemo(
    () =>
      buildCatalogTabs({
        favorites,
        favoritesLabel,
        groups,
        items,
      }),
    [favorites, favoritesLabel, groups, items],
  )

  const [tabKey, setTabKey] = useState(() =>
    pickInitialTabKey({ favorites, items, tabs, value }),
  )

  const [query, setQuery] = useState(defaultQuery)

  const isSearching = toQueryWords(query).length > 0

  // A tab that has since left the rail (its last row went away) falls
  // back to the first one rather than browsing nothing.
  const currentTab =
    tabs.find((tab) => tab.key === tabKey) ?? tabs[0]

  const sections = useMemo(
    () =>
      buildCatalogSections({
        favorites,
        groups,
        items,
        query,
        tab: currentTab,
      }),
    [currentTab, favorites, groups, items, query],
  )

  const groupById = useMemo(
    () =>
      new Map(
        groups.map((group) => [group.id, group] as const),
      ),
    [groups],
  )

  const favoriteValues = useMemo(
    () => new Set(favorites),
    [favorites],
  )

  const indexedSections = useMemo(() => {
    let index = 0

    return sections.map((section) => ({
      ...section,
      headingId: `${listId}-${section.key}`,
      rows: section.items.map((item) => ({
        id: `${listId}-option-${index}`,
        index: index++,
        item,
      })),
    }))
  }, [listId, sections])

  const rows = indexedSections.flatMap(
    (section) => section.rows,
  )

  /**
   * Where the highlight lands for a fresh view: the chosen row when the
   * view shows it, else the first enabled row. A live query always
   * takes the top match — the 2026-08-25 `Combobox` rule, a filter
   * owns the highlight.
   */
  const toSeedIndex = (
    viewRows: readonly { item: CatalogPickerItem }[],
    isQueryLive: boolean,
  ) => {
    if (!isQueryLive && value !== undefined) {
      const chosenIndex = viewRows.findIndex(
        (row) =>
          row.item.value === value &&
          row.item.isDisabled !== true,
      )

      if (chosenIndex >= 0) {
        return chosenIndex
      }
    }

    return nextEnabledIndex(viewRows, -1, 1)
  }

  const [activeIndex, setActiveIndex] = useState(() =>
    toSeedIndex(rows, isSearching),
  )

  /**
   * The scroll a fresh view still owes: centre the chosen row, or go
   * back to the top. A new object per view change, so asking twice for
   * the same row is never a no-op.
   */
  const [pendingScroll, setPendingScroll] =
    useState<null | {
      attempt: number
      isCentred: boolean
    }>({ attempt: 0, isCentred: !isSearching })

  const resolvedActiveIndex =
    rows[activeIndex] !== undefined &&
    rows[activeIndex]?.item.isDisabled !== true
      ? activeIndex
      : -1

  const activeRow =
    resolvedActiveIndex < 0
      ? undefined
      : rows[resolvedActiveIndex]

  const reseed = (
    nextRows: readonly { item: CatalogPickerItem }[],
    isQueryLive: boolean,
  ) => {
    setActiveIndex(toSeedIndex(nextRows, isQueryLive))

    setPendingScroll({
      attempt: 0,
      isCentred: !isQueryLive,
    })
  }

  const toRows = (nextQuery: string, nextTabKey?: string) =>
    buildCatalogSections({
      favorites,
      groups,
      items,
      query: nextQuery,
      tab:
        tabs.find((tab) => tab.key === nextTabKey) ??
        tabs[0],
    }).flatMap((section) =>
      section.items.map((item) => ({ item })),
    )

  const changeQuery = (nextQuery: string) => {
    setQuery(nextQuery)

    reseed(
      toRows(nextQuery, tabKey),
      toQueryWords(nextQuery).length > 0,
    )
  }

  const showTab = (nextTabKey: string) => {
    setTabKey(nextTabKey)

    // A tab is a request to see that group, so a search in progress
    // gives way to it rather than leaving the click with no effect.
    setQuery("")

    reseed(toRows("", nextTabKey), false)
  }

  // The scroll lives in an effect because the list has to exist, and
  // be capped, before it can move. Writing `scrollTop` on the list
  // itself (rather than `scrollIntoView`) keeps the page behind the
  // panel from scrolling along with it.
  useEffect(() => {
    if (pendingScroll === null) {
      return
    }

    const list = listRef.current

    if (list === null) {
      setPendingScroll(null)

      return
    }

    if (!pendingScroll.isCentred) {
      list.scrollTop = 0

      setPendingScroll(null)

      return
    }

    const row =
      activeRow === undefined
        ? null
        : document.getElementById(activeRow.id)

    if (row === null) {
      list.scrollTop = 0

      setPendingScroll(null)

      return
    }

    if (
      pendingScroll.attempt < SCROLL_ATTEMPTS &&
      (pendingScroll.attempt === 0 ||
        list.scrollHeight <= list.clientHeight)
    ) {
      const frame = requestAnimationFrame(() => {
        setPendingScroll({
          attempt: pendingScroll.attempt + 1,
          isCentred: true,
        })
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }

    const listBox = list.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()

    list.scrollTop +=
      rowBox.top -
      listBox.top -
      (list.clientHeight - rowBox.height) / 2

    setPendingScroll(null)
  }, [activeRow, pendingScroll])

  // Keep the highlight in view as the arrows move it, by the least
  // scroll that shows it.
  useEffect(() => {
    if (pendingScroll !== null || activeRow === undefined) {
      return
    }

    const list = listRef.current
    const row = document.getElementById(activeRow.id)

    if (list === null || row === null) {
      return
    }

    const listBox = list.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()

    if (rowBox.top < listBox.top) {
      list.scrollTop -= listBox.top - rowBox.top
    } else if (rowBox.bottom > listBox.bottom) {
      list.scrollTop += rowBox.bottom - listBox.bottom
    }
  }, [activeRow, pendingScroll])

  const focusRail = () => {
    const rail = railRef.current

    if (rail === null) {
      return false
    }

    const target = rail.querySelector<HTMLElement>(
      '[tabindex="0"]',
    )

    target?.focus()

    return target !== null
  }

  const handleEscape = (
    keyboardEvent: ReactKeyboardEvent<HTMLElement>,
  ) => {
    keyboardEvent.preventDefault()

    if (query.length > 0) {
      changeQuery("")

      return
    }

    onDismiss()
  }

  const handleSearchKeyDown = (
    keyboardEvent: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    const lastIndex = rows.length - 1

    switch (keyboardEvent.key) {
      case "ArrowDown": {
        keyboardEvent.preventDefault()
        setActiveIndex(
          nextEnabledIndex(rows, resolvedActiveIndex, 1),
        )

        return
      }
      case "ArrowUp": {
        keyboardEvent.preventDefault()
        setActiveIndex(
          resolvedActiveIndex < 0
            ? nextEnabledIndex(rows, rows.length, -1)
            : nextEnabledIndex(
                rows,
                resolvedActiveIndex,
                -1,
              ),
        )

        return
      }
      case "Home": {
        keyboardEvent.preventDefault()
        setActiveIndex(nextEnabledIndex(rows, -1, 1))

        return
      }
      case "End": {
        keyboardEvent.preventDefault()
        setActiveIndex(
          nextEnabledIndex(rows, lastIndex + 1, -1),
        )

        return
      }
      case "Enter": {
        if (activeRow === undefined) {
          return
        }

        keyboardEvent.preventDefault()
        onSelect(activeRow.item.value)

        return
      }
      case "Escape": {
        handleEscape(keyboardEvent)

        return
      }
      case "Tab": {
        if (focusRail()) {
          keyboardEvent.preventDefault()
        }

        return
      }
      default:
    }
  }

  const hasRows = rows.length > 0

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {tabs.length > 0 ? (
        <CatalogPickerRail
          currentTabKey={
            isSearching ? undefined : currentTab?.key
          }
          itemSize={itemSize}
          label={`${label} groups`}
          onEscape={handleEscape}
          onLeave={() => {
            inputRef.current?.focus()
          }}
          onShowTab={showTab}
          ref={railRef}
          tabs={tabs}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-border-subtle border-b p-1.5">
          <SearchInput
            aria-activedescendant={activeRow?.id}
            aria-autocomplete="list"
            aria-controls={hasRows ? listId : undefined}
            aria-expanded={hasRows}
            aria-label={label}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            clearIcon={clearIcon ?? null}
            isClearVisible={
              clearIcon !== undefined && query.length > 0
            }
            onChange={(changeEvent) => {
              changeQuery(changeEvent.currentTarget.value)
            }}
            onClear={() => {
              changeQuery("")
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            ref={inputRef}
            role="combobox"
            size={SEARCH_SIZE[itemSize]}
            spellCheck={false}
            value={query}
          />
        </div>

        {hasRows ? (
          <div
            aria-label={label}
            className="charcuterie-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
            id={listId}
            ref={listRef}
            role="listbox"
          >
            {indexedSections.map((section) => {
              const options = section.rows.map((row) => (
                <CatalogPickerOption
                  group={
                    row.item.groupId === null
                      ? undefined
                      : groupById.get(row.item.groupId)
                  }
                  id={row.id}
                  isActive={
                    row.index === resolvedActiveIndex
                  }
                  isFavorite={favoriteValues.has(
                    row.item.value,
                  )}
                  isSelected={row.item.value === value}
                  item={row.item}
                  itemSize={itemSize}
                  key={row.id}
                  onChoose={onSelect}
                  onPoint={() => {
                    if (
                      row.index !== resolvedActiveIndex &&
                      row.item.isDisabled !== true
                    ) {
                      setActiveIndex(row.index)
                    }
                  }}
                />
              ))

              return section.heading === undefined ? (
                <div
                  className="not-first:mt-1"
                  key={section.key}
                  role="presentation"
                >
                  {options}
                </div>
              ) : (
                // biome-ignore lint/a11y/useSemanticElements: a listbox group is `role="group"` (ARIA APG); a `<fieldset>` is invalid content inside `role="listbox"`.
                <div
                  aria-labelledby={section.headingId}
                  className="not-first:mt-1"
                  key={section.key}
                  role="group"
                >
                  <div
                    className={toClassName(
                      GROUP_HEADING_INSET_CLASS[itemSize],
                      "pt-1.5 pb-0.5 font-medium text-content-secondary text-xs",
                    )}
                    id={section.headingId}
                  >
                    {section.heading}
                  </div>

                  {options}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="m-0 px-4 py-6 text-center text-content-muted text-sm">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  )
}
