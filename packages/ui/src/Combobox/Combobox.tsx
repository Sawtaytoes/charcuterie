import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { ReactElement, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import { toClassName } from "../toClassName.ts"
import { ComboboxOption } from "./ComboboxOption.tsx"

export type ComboboxProps = {
  className?: string
  /** Shown when nothing matches. Default "No matches". */
  emptyLabel?: string
  /** The error panel state (`PathPicker`). */
  error?: ReactNode
  /** A sticky footer hint (`LinkPicker`'s "type a path directly"). */
  footer?: ReactNode
  /** Enter commits the raw query as a value (`AssFieldPicker`). */
  isCreatable?: boolean
  /** The loading panel state. */
  isLoading?: boolean
  /** Multi-select, rendered as removable chips (`LanguageCodeField`). */
  isMultiple?: boolean
  /** Windowing. Auto-on above ~100 options when left undefined. */
  isVirtualized?: boolean
  isVisible: boolean
  onDismiss: () => void
  onSelect: (value: string) => void
  /**
   * Omit to filter internally by `textValue`; supply to own the query
   * (a react-query search, say), in which case `options` arrives
   * pre-filtered.
   */
  onQueryChange?: (query: string) => void
  options: readonly ListboxItem[]
  placeholder?: string
  /** Controlled query; uncontrolled when absent. */
  query?: string
  selectedValue?: readonly string[] | string
  /** The control the popup hangs off. **Cloned, not wrapped.** */
  trigger: ReactElement
}

const AUTO_VIRTUALIZE_THRESHOLD = 100

const getOptionText = (item: ListboxItem) =>
  (
    item.textValue ??
    (typeof item.label === "string" ? item.label : "")
  ).toLowerCase()

const nextEnabledIndex = (
  options: readonly ListboxItem[],
  from: number,
  step: number,
) => {
  for (
    let index = from + step;
    index >= 0 && index < options.length;
    index += step
  ) {
    if (!options[index]?.isDisabled) {
      return index
    }
  }

  return from
}

/**
 * The searchable, filtering, virtualized picker — the other half of
 * the picker family, and the one that consolidates the fleet's
 * hand-rolled dropdowns.
 *
 * The ARIA contract differs from `Listbox` and the difference is
 * forced, not stylistic: **focus stays in the text input**, so the
 * active option is tracked with `aria-activedescendant`, not roving
 * tabindex. The input is the `role="combobox"`; the popup is a
 * `role="listbox"`. Arrows move the active descendant while the caret
 * stays put; Enter selects; Escape clears the query before it closes.
 *
 * Filtering is the consumer's when `onQueryChange` is supplied (the
 * `options` then arrive pre-filtered — a react-query search owns the
 * debounce, the request token, the cache), and internal on `textValue`
 * otherwise.
 */
export const Combobox = ({
  className,
  emptyLabel = "No matches",
  error,
  footer,
  isCreatable = false,
  isLoading = false,
  isMultiple = false,
  isVirtualized,
  isVisible,
  onDismiss,
  onQueryChange,
  onSelect,
  options,
  placeholder = "Search…",
  query,
  selectedValue,
  trigger,
}: ComboboxProps): ReactNode => {
  const inputElement = useRef<HTMLInputElement>(null)

  const listElement = useRef<HTMLDivElement>(null)

  const isQueryControlled = query !== undefined

  const [internalQuery, setInternalQuery] = useState("")

  const currentQuery = query ?? internalQuery

  const [activeIndex, setActiveIndex] = useState(0)

  const [selected, setSelected] = useState<string[]>(
    selectedValue === undefined
      ? []
      : typeof selectedValue === "string"
        ? [selectedValue]
        : [...selectedValue],
  )

  // The consumer owns filtering when it owns the query; otherwise it is
  // a plain `textValue` contains-match.
  const filtered =
    onQueryChange === undefined
      ? options.filter((option) =>
          getOptionText(option).includes(
            currentQuery.toLowerCase(),
          ),
        )
      : options

  const isWindowed =
    isVirtualized ??
    filtered.length > AUTO_VIRTUALIZE_THRESHOLD

  const {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    setFloating,
    triggerId,
  } = useAnchoredOverlay({
    // Escape is handled here so it can clear the query before closing.
    isEscapeDismissable: false,
    isVisible,
    maxHeightPx: 384,
    offsetValue: 4,
    onDismiss,
    role: "listbox",
    trigger,
  })

  // The panel wraps an input *and* a listbox, so the wrapper is a
  // plain div: the `role="listbox"`/`id` `useRole` produced go on the
  // inner list, which is what the trigger's and input's `aria-controls`
  // then resolve to.
  const {
    id: listboxId,
    role: _discardedPanelRole,
    ...floatingProps
  } = getFloatingProps() as {
    id: string
    role?: string
  } & Record<string, unknown>

  const setQuery = (nextQuery: string) => {
    if (!isQueryControlled) {
      setInternalQuery(nextQuery)
    }

    setActiveIndex(0)

    onQueryChange?.(nextQuery)
  }

  useEffect(() => {
    if (isVisible) {
      inputElement.current?.focus()
    }
  }, [isVisible])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    estimateSize: () => 36,
    getScrollElement: () => listElement.current,
    overscan: 8,
  })

  const optionDomId = (value: string) =>
    `${listboxId}-opt-${value}`

  // `activeIndex` is seeded at 0 on open and on every query reset, which
  // can land on a disabled option; arrowing skips disabled but the seed
  // does not. Resolve to the nearest enabled row and drive the highlight,
  // `aria-activedescendant`, arrow moves and commit off *this* — never the
  // raw index — so a disabled option is neither announced nor committable.
  const resolvedActiveIndex =
    filtered.length === 0
      ? -1
      : filtered[activeIndex] !== undefined &&
          !filtered[activeIndex]?.isDisabled
        ? activeIndex
        : nextEnabledIndex(filtered, -1, 1)

  const activeValue =
    resolvedActiveIndex < 0
      ? undefined
      : filtered[resolvedActiveIndex]?.value

  const commitValue = (value: string) => {
    if (isMultiple) {
      setSelected((previous) =>
        previous.includes(value)
          ? previous.filter((one) => one !== value)
          : [...previous, value],
      )

      onSelect(value)

      // Multi-select stays open and clears the query for the next one.
      setQuery("")

      inputElement.current?.focus()

      return
    }

    setSelected([value])

    onSelect(value)

    onDismiss()
  }

  const handleKeyDown = (
    keyEvent: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (keyEvent.key === "ArrowDown") {
      keyEvent.preventDefault()

      setActiveIndex(
        nextEnabledIndex(filtered, resolvedActiveIndex, 1),
      )

      return
    }

    if (keyEvent.key === "ArrowUp") {
      keyEvent.preventDefault()

      setActiveIndex(
        nextEnabledIndex(filtered, resolvedActiveIndex, -1),
      )

      return
    }

    if (
      keyEvent.key === "Enter" ||
      // Tab-to-accept (`PathPicker`): the active suggestion is taken.
      // Single-select only — in multi-select `commitValue` refocuses the
      // input, so accepting on Tab would trap forward focus in the field.
      (keyEvent.key === "Tab" &&
        !keyEvent.shiftKey &&
        !isMultiple &&
        activeValue !== undefined)
    ) {
      if (activeValue !== undefined) {
        keyEvent.preventDefault()

        commitValue(activeValue)

        return
      }

      // Creatable: Enter on a query with no match commits it raw.
      if (
        isCreatable &&
        keyEvent.key === "Enter" &&
        currentQuery.trim().length > 0
      ) {
        keyEvent.preventDefault()

        commitValue(currentQuery.trim())
      }

      return
    }

    if (keyEvent.key === "Escape") {
      // Clears the query first, closes only when it is already empty.
      if (currentQuery.length > 0) {
        keyEvent.preventDefault()

        setQuery("")

        return
      }

      onDismiss()
    }
  }

  // Keep the active row in view — a real bug in every fleet picker:
  // arrowing past the panel edge did not scroll.
  useEffect(() => {
    if (!isVisible) {
      return
    }

    if (isWindowed) {
      rowVirtualizer.scrollToIndex(resolvedActiveIndex)

      return
    }

    if (activeValue !== undefined) {
      listElement.current
        ?.querySelector(
          `#${CSS.escape(`${listboxId}-opt-${activeValue}`)}`,
        )
        ?.scrollIntoView({ block: "nearest" })
    }
  }, [
    resolvedActiveIndex,
    activeValue,
    isVisible,
    isWindowed,
    listboxId,
    rowVirtualizer.scrollToIndex,
  ])

  const renderOption = (
    option: ListboxItem,
    index: number,
  ) => (
    <ComboboxOption
      id={optionDomId(option.value)}
      isActive={index === resolvedActiveIndex}
      isSelected={selected.includes(option.value)}
      item={option}
      key={option.value}
      onSelect={commitValue}
      posInSet={isWindowed ? index + 1 : undefined}
      setSize={isWindowed ? filtered.length : undefined}
    />
  )

  return (
    <>
      {clonedTrigger}

      {isVisible ? (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            initialFocus={inputElement}
            modal={false}
          >
            <div
              {...floatingProps}
              className={toClassName(
                PANEL_SURFACE_CLASS,
                "z-[var(--layer-modal)] flex min-w-64 flex-col overflow-hidden",
                className,
              )}
              ref={setFloating}
              style={floatingStyles}
            >
              <div className="flex flex-wrap items-center gap-1 border-border-subtle border-b p-2">
                {isMultiple
                  ? selected.map((value) => {
                      const chip = options.find(
                        (option) => option.value === value,
                      )

                      return (
                        <span
                          className="inline-flex items-center gap-1 rounded-sm bg-intent-neutral-surface px-1.5 py-0.5 text-content-primary text-xs"
                          key={value}
                        >
                          {chip?.textValue ?? value}

                          <button
                            aria-label={`Remove ${chip?.textValue ?? value}`}
                            className="cursor-pointer text-content-secondary hover:text-content-primary"
                            onClick={() => {
                              setSelected((previous) =>
                                previous.filter(
                                  (one) => one !== value,
                                ),
                              )

                              // Mirror the list toggle-off: the parent
                              // tracks selection through `onSelect`, so a
                              // chip removal must report the same value.
                              onSelect(value)
                            }}
                            type="button"
                          >
                            ✕
                          </button>
                        </span>
                      )
                    })
                  : null}

                <input
                  aria-activedescendant={
                    activeValue === undefined
                      ? undefined
                      : optionDomId(activeValue)
                  }
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded="true"
                  aria-labelledby={triggerId}
                  className="min-w-24 flex-1 bg-transparent text-content-primary text-sm outline-none placeholder:text-content-muted"
                  onChange={(changeEvent) => {
                    setQuery(changeEvent.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  ref={inputElement}
                  role="combobox"
                  type="text"
                  value={currentQuery}
                />
              </div>

              <div
                aria-labelledby={triggerId}
                className="min-h-0 flex-1 overflow-auto p-1"
                id={listboxId}
                ref={listElement}
                role="listbox"
              >
                {isLoading ? (
                  <p className="px-2 py-3 text-center text-content-secondary text-sm">
                    Loading…
                  </p>
                ) : error ? (
                  <div className="px-2 py-3 text-center text-intent-danger-content text-sm">
                    {error}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="px-2 py-3 text-center text-content-secondary text-sm">
                    {emptyLabel}
                  </p>
                ) : isWindowed ? (
                  <div
                    className="relative w-full"
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                    }}
                  >
                    {rowVirtualizer
                      .getVirtualItems()
                      .map((virtualRow) => {
                        const option =
                          filtered[virtualRow.index]

                        if (!option) {
                          return null
                        }

                        return (
                          <div
                            className="absolute start-0 top-0 w-full"
                            key={option.value}
                            style={{
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            {renderOption(
                              option,
                              virtualRow.index,
                            )}
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  filtered.map((option, index) =>
                    renderOption(option, index),
                  )
                )}
              </div>

              {footer ? (
                <div className="shrink-0 border-border-subtle border-t p-2 text-content-secondary text-xs">
                  {footer}
                </div>
              ) : null}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}
