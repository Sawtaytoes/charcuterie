import type { ControlSize } from "@charcuterie/tokens"
import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type {
  ReactElement,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from "react"
import { useEffect, useRef, useState } from "react"

import { PANEL_ITEM_SIZE_CLASS } from "../controlStyles.ts"
import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
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
  /**
   * Attached-input mode. Supply the consumer's own `<input>` and
   * Combobox stops rendering its internal input/chip bar: it anchors the
   * popup to this element, drives arrow/Enter/Tab/Escape off it, and
   * mirrors the active option onto it for a screen reader. The consumer
   * owns the input's `value`/`onChange` (wire them to the controlled
   * `query`, which is then required) **and** `isVisible` — so a select
   * does NOT auto-dismiss in this mode; staying open (a folder-picker
   * drilling in) or closing (`onSelect` calls the consumer's own close)
   * is the consumer's call. Options arrive pre-filtered (as with
   * `onQueryChange`). Single-select only; `isMultiple` is not supported
   * here.
   */
  inputRef?: RefObject<HTMLInputElement | null>
  /** Enter commits the raw query as a value (`AssFieldPicker`). */
  isCreatable?: boolean
  /** The loading panel state. */
  isLoading?: boolean
  /** Multi-select, rendered as removable chips (`LanguageCodeField`). */
  isMultiple?: boolean
  /** Windowing. Auto-on above ~100 options when left undefined. */
  isVirtualized?: boolean
  isVisible: boolean
  /**
   * How tall each option — and the search field above them — is, from
   * the same density-aware tokens a `Button` reads.
   *
   * It covers the search row deliberately. The owner's report was that
   * the panel's own field was visibly bigger than the options under it
   * (*"the button is huge, but the options don't match it"*), and two
   * sizes inside one panel is the defect. One prop drives both.
   *
   * A short window steps it back down on its own (`usePanelItemSize`).
   */
  itemSize?: ControlSize
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
  /**
   * The control the popup hangs off. **Cloned, not wrapped.** Omit only
   * in attached-input mode (`inputRef`), where the consumer's `<input>`
   * is the anchor.
   */
  trigger?: ReactElement
}

const AUTO_VIRTUALIZE_THRESHOLD = 100

/**
 * The virtualizer's pre-measurement guess per row size, in px at
 * `comfortable` density — `--control-height-*` plus the row's own
 * `py-*`. Hardcoded because a virtualizer wants a number before the
 * first paint, which is the one place a token cannot reach; every row
 * is measured immediately afterwards, so a density that disagrees
 * costs a frame rather than a wrong layout.
 */
const ROW_ESTIMATE_PX: Record<ControlSize, number> = {
  sm: 40,
  md: 48,
  lg: 60,
}

/**
 * How many frames the open seed will wait for the panel to be capped
 * before it gives up on centring the chosen row. A few is all
 * floating-ui's `size` middleware needs.
 */
const SEED_SCROLL_ATTEMPTS = 5

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
  inputRef,
  isCreatable = false,
  isLoading = false,
  isMultiple = false,
  isVirtualized,
  isVisible,
  itemSize: requestedItemSize = "md",
  onDismiss,
  onQueryChange,
  onSelect,
  options,
  placeholder = "Search…",
  query,
  selectedValue,
  trigger,
}: ComboboxProps): ReactNode => {
  const itemSize = usePanelItemSize(requestedItemSize)

  // Attached-input mode: the consumer's `<input>` is the reference,
  // query source, focus holder and keyboard target; Combobox renders the
  // list-only panel.
  const isAttached = inputRef !== undefined

  const internalInputElement =
    useRef<HTMLInputElement>(null)

  // The input Combobox drives — the consumer's in attached mode, its own
  // otherwise.
  const inputElement = isAttached
    ? inputRef
    : internalInputElement

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

  // The consumer owns filtering when it owns the query or drives an
  // attached input (the query is a full path, not an option-label match);
  // otherwise it is a plain `textValue` contains-match.
  const filtered =
    onQueryChange === undefined && !isAttached
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
    // Attached mode anchors to the consumer's input; classic mode clones
    // the trigger.
    anchorRef: isAttached ? inputRef : undefined,
    // Escape is handled here so it can clear the query before closing.
    isEscapeDismissable: false,
    isVisible,
    maxHeightPx: 384,
    // Cap the width so an overlong footer sentence or option label wraps
    // instead of dragging the whole panel absurdly wide; the `min-w-64`
    // floor still holds the low end. Content wider than this wraps.
    maxWidthPx: 384,
    offsetValue: 4,
    onDismiss,
    role: "listbox",
    trigger: isAttached ? undefined : trigger,
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
    // In attached mode focus stays where the user is typing (the
    // consumer's input); Combobox never grabs it.
    if (isVisible && !isAttached) {
      inputElement.current?.focus()
    }
  }, [isVisible, isAttached, inputElement])

  // Attached mode's query lives on the consumer's input, so `setQuery`
  // (which reseeds the highlight) never runs on a keystroke — reseed here
  // when the controlled query changes.
  useEffect(() => {
    if (isAttached) {
      setActiveIndex(0)
    }
  }, [isAttached])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    // An *estimate*: every row is re-measured (`measureElement` on the
    // wrapper below), so this only decides how far the scrollbar lies
    // before the first measurement lands. It still has to track
    // `itemSize`, or a `lg` list opens with a scrollbar a third too
    // short and visibly settles.
    estimateSize: () => ROW_ESTIMATE_PX[itemSize],
    getScrollElement: () => listElement.current,
    overscan: 8,
  })

  const optionDomId = (value: string) =>
    `${listboxId}-opt-${value}`

  // ─── Opening lands on the chosen option, not the top of the list ────
  //
  // The APG listbox rule, and the one `Listbox` has always followed: a
  // reopened picker resumes on its current value. Combobox seeded 0
  // instead, so reopening a long list showed its head with the chosen
  // row scrolled out of sight — correcting a misclick meant hunting the
  // list for the value you had just set, and the panel read as though
  // nothing had been chosen at all.
  const seedValue = selected[0]

  // Derived in render, not read from a ref inside the effect, so it
  // recomputes as `options` arrive: a picker that fetches its list when
  // it opens still lands on its value once the rows turn up.
  const openSeedIndex =
    seedValue === undefined
      ? -1
      : filtered.findIndex(
          (option) =>
            option.value === seedValue &&
            !option.isDisabled,
        )

  const hasSeededOnOpen = useRef(false)

  /**
   * The open seed's outstanding scroll — the row to centre, and how many
   * frames it has waited for a panel it can move.
   *
   * **State, and a fresh object on every open.** The obvious build hangs
   * the scroll off `activeIndex` changing, and that is a bug the second
   * time the same picker opens: `activeIndex` still holds the index the
   * *last* open seeded, so setting it again is a no-op, React re-renders
   * nothing, and the effect that would have scrolled never runs. The
   * first open worked and every reopen showed the top of the list.
   *
   * A new object per open cannot be a no-op, so the scroll no longer
   * depends on the highlight having moved.
   *
   * The wait exists because `useAnchoredOverlay` caps the panel's height
   * by writing `style.maxHeight` straight onto the floating element
   * inside floating-ui's `size` middleware — deliberately outside the
   * `floatingStyles` React manages, so a keystroke cannot wipe it. It
   * lands a frame after the seed and re-renders nothing to announce
   * itself, and until it does the list stands at its full content height
   * with **nothing to scroll**, so a scroll issued then is dropped
   * without a trace.
   */
  const [seedScroll, setSeedScroll] = useState<null | {
    attempt: number
    index: number
    value: string
  }>(null)

  useEffect(() => {
    if (!isVisible) {
      hasSeededOnOpen.current = false

      setSeedScroll(null)

      return
    }

    // A live query owns the highlight: its top match, not the old value.
    if (
      hasSeededOnOpen.current ||
      currentQuery.length > 0
    ) {
      return
    }

    if (openSeedIndex < 0) {
      setActiveIndex(0)

      // Nothing chosen means the top of the list is the right seed and
      // there is nothing left to wait for. A chosen value that is not in
      // the list *yet* keeps waiting — this effect reruns when it lands.
      hasSeededOnOpen.current = seedValue === undefined

      return
    }

    hasSeededOnOpen.current = true

    setSeedScroll({
      attempt: 0,
      index: openSeedIndex,
      // Carried rather than looked up in the effect. `filtered` is a new
      // array on every render, and as a dependency it would cancel and
      // reschedule the pending frame each time — a wait that can never
      // end while anything else re-renders.
      value: seedValue,
    })

    setActiveIndex(openSeedIndex)
  }, [
    isVisible,
    currentQuery.length,
    openSeedIndex,
    seedValue,
  ])

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

  // A windowed list only renders its window, and the virtualizer moves
  // that window a tick *after* `scrollToIndex` sets the scroll offset.
  // Naming a row that is not in the DOM leaves `aria-activedescendant`
  // pointing at nothing — an idref a screen reader cannot resolve, and
  // an `aria-valid-attr-value` failure. So the reference waits for its
  // row: the virtualizer re-renders as the range catches up, one frame
  // later, and the announcement is right rather than broken. The
  // highlight and every commit still run off `resolvedActiveIndex`, so
  // only the announcement waits, never the behaviour.
  const activeDescendantId =
    activeValue === undefined ||
    (isWindowed &&
      !rowVirtualizer
        .getVirtualItems()
        .some((row) => row.index === resolvedActiveIndex))
      ? undefined
      : optionDomId(activeValue)

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

    if (isAttached) {
      // The consumer owns the value, the query and `isVisible`: report the
      // pick and let it update the controlled query (→ refetch) and decide
      // whether to stay open (drill-down) or close. No `onDismiss`, no
      // `setQuery` (that would double-fire the consumer's query), no
      // `setSelected` (the picked row leaves the list on refetch).
      onSelect(value)

      // Reseed the highlight for the list that is about to arrive.
      setActiveIndex(0)

      inputElement.current?.focus()

      return
    }

    setSelected([value])

    onSelect(value)

    onDismiss()
  }

  // A chip's face is the option's human label, not its `value` — a
  // language chip reads "English", not "eng". `textValue` (the rich-label
  // fallback) wins, then a plain-string `label`, then the raw value only
  // when the option has since left `options`.
  const chipLabel = (value: string) => {
    const item = options.find(
      (option) => option.value === value,
    )

    if (item === undefined) {
      return value
    }

    return (
      item.textValue ??
      (typeof item.label === "string" ? item.label : value)
    )
  }

  const removeValue = (value: string) => {
    setSelected((previous) =>
      previous.filter((one) => one !== value),
    )

    // The parent tracks selection through `onSelect`, so removing a chip
    // reports the same value the list toggle would — a symmetric toggle.
    onSelect(value)
  }

  // Typed as either event so the same logic serves the classic mode's
  // React `onKeyDown` and attached mode's native `keydown` listener —
  // both carry `key`/`shiftKey`/`preventDefault`.
  const handleKeyDown = (
    keyEvent:
      | ReactKeyboardEvent<HTMLInputElement>
      | KeyboardEvent,
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
      // Attached mode's query lives on the consumer's input, which
      // `setQuery` cannot clear — so Escape closes outright (the
      // `PathPicker` contract).
      if (isAttached) {
        keyEvent.preventDefault()

        onDismiss()

        return
      }

      // Clears the query first, closes only when it is already empty.
      if (currentQuery.length > 0) {
        keyEvent.preventDefault()

        setQuery("")

        return
      }

      onDismiss()
    }
  }

  // The open seed's own scroll, centred, and the only one allowed to run
  // until it lands — an arrow move's `block: "nearest"` would drag the
  // list straight back off the chosen row.
  useEffect(() => {
    if (!isVisible || seedScroll === null) {
      return
    }

    const list = listElement.current

    if (list === null) {
      return
    }

    if (
      seedScroll.attempt < SEED_SCROLL_ATTEMPTS &&
      (seedScroll.attempt === 0 ||
        list.scrollHeight <= list.clientHeight)
    ) {
      // Never scroll on the opening commit. Two separate things are
      // still missing then, and each drops the scroll silently: the
      // panel has no height cap yet, so the list stands at full height
      // with nothing to move; and the virtualizer measures its scroll
      // element in an effect of its own, so `scrollToIndex` has nothing
      // to measure against. One frame settles both.
      //
      // After that, keep waiting only while the list cannot move.
      // Bounded, so a list that genuinely fits its panel stops instead
      // of spinning.
      const frame = requestAnimationFrame(() => {
        setSeedScroll({
          attempt: seedScroll.attempt + 1,
          index: seedScroll.index,
          value: seedScroll.value,
        })
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }

    // Centred, where an arrow move only pulls the next row just into
    // view. "nearest" on open would park the chosen row against the
    // panel's bottom edge with nothing after it, so the neighbours the
    // list was reopened to reach would still be off screen.
    if (isWindowed) {
      rowVirtualizer.scrollToIndex(seedScroll.index, {
        align: "center",
      })
    } else {
      list
        .querySelector(
          `#${CSS.escape(`${listboxId}-opt-${seedScroll.value}`)}`,
        )
        ?.scrollIntoView({ block: "center" })
    }

    setSeedScroll(null)
  }, [
    seedScroll,
    isVisible,
    isWindowed,
    listboxId,
    rowVirtualizer.scrollToIndex,
  ])

  // Keep the active row in view — a real bug in every fleet picker:
  // arrowing past the panel edge did not scroll.
  useEffect(() => {
    // While the seed is outstanding the row it wants is not on screen
    // yet, and pulling the highlight into view with `nearest` would
    // settle the list somewhere the seed then has to undo.
    if (!isVisible || seedScroll !== null) {
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
    seedScroll,
  ])

  // ─── Attached mode: drive the consumer's input ──────────────────────
  //
  // Combobox does not render the input, so its keyboard handler and ARIA
  // are applied to the consumer's element. A ref-to-latest keeps the
  // native listener stable across keystrokes (the `PathPicker` pattern).
  const handleKeyDownRef = useRef(handleKeyDown)
  handleKeyDownRef.current = handleKeyDown

  useEffect(() => {
    if (!isAttached || !isVisible) {
      return
    }

    const element = inputRef.current

    if (!element) {
      return
    }

    const listener = (keyEvent: KeyboardEvent) => {
      handleKeyDownRef.current(keyEvent)
    }

    element.addEventListener("keydown", listener)

    return () => {
      element.removeEventListener("keydown", listener)
    }
  }, [isAttached, isVisible, inputRef])

  // Mirror the combobox ARIA onto the consumer's input. It owns
  // `value`/`onChange`; these attributes are React-unmanaged, so setting
  // them imperatively is stable across the consumer's re-renders.
  useEffect(() => {
    if (!isAttached) {
      return
    }

    const element = inputRef.current

    if (!element) {
      return
    }

    element.setAttribute("role", "combobox")
    element.setAttribute("aria-autocomplete", "list")

    if (isVisible) {
      element.setAttribute("aria-expanded", "true")
      element.setAttribute("aria-controls", listboxId)

      if (activeDescendantId === undefined) {
        element.removeAttribute("aria-activedescendant")
      } else {
        element.setAttribute(
          "aria-activedescendant",
          activeDescendantId,
        )
      }
    } else {
      element.setAttribute("aria-expanded", "false")
      element.removeAttribute("aria-controls")
      element.removeAttribute("aria-activedescendant")
    }
  }, [
    isAttached,
    isVisible,
    activeDescendantId,
    listboxId,
    inputRef,
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
      itemSize={itemSize}
      key={option.value}
      onSelect={commitValue}
      posInSet={isWindowed ? index + 1 : undefined}
      setSize={isWindowed ? filtered.length : undefined}
    />
  )

  return (
    <>
      {/*
        Multi-select chips live *here*, above the trigger and outside the
        `isVisible` gate — so a picked value stays on screen as a removable
        tag after the popup closes. The previous build rendered them inside
        the panel, where they vanished with it and the field read as empty
        (the "no way to see or remove what I picked" report). Attached mode
        is single-select, so it never grows a chip row.
      */}
      {isMultiple && !isAttached && selected.length > 0 ? (
        <div className="mb-1 flex flex-wrap items-center gap-1">
          {selected.map((value) => (
            // The whole chip is the remove control, not just the ✕ — a
            // bigger target, and removal is the chip's only action. One
            // `<button>` (the ✕ is decorative) rather than a chip wrapping
            // a button, so there is no nested interactive element and the
            // accessible name is just "Remove <label>". Hover tints danger
            // to signal the click removes.
            <button
              aria-label={`Remove ${chipLabel(value)}`}
              className="inline-flex cursor-pointer items-center gap-1 rounded-sm bg-intent-neutral-surface-hover px-1.5 py-0.5 text-content-primary text-xs transition-colors duration-(--duration-fast) ease-standard hover:bg-intent-danger-surface hover:text-intent-danger-content"
              key={value}
              onClick={() => {
                removeValue(value)
              }}
              type="button"
            >
              {chipLabel(value)}

              <span
                aria-hidden="true"
                className="text-content-secondary"
              >
                ✕
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {clonedTrigger}

      {isVisible ? (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            // Attached mode keeps focus in the consumer's input — the
            // panel must never grab it.
            disabled={isAttached}
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
              {isAttached ? null : (
                // The `p-1` is the list container's own padding, repeated
                // here so the search caret starts exactly where the option
                // labels below it do — the alignment a hand-picked `px-3`
                // used to approximate, and which broke the moment the row
                // padding became a token. The border stays on the outer
                // element, so it still spans the whole panel.
                <div className="border-border-subtle border-b p-1">
                  <div
                    className={toClassName(
                      "flex items-center",
                      PANEL_ITEM_SIZE_CLASS[itemSize],
                    )}
                  >
                    <input
                      aria-activedescendant={
                        activeDescendantId
                      }
                      aria-autocomplete="list"
                      aria-controls={listboxId}
                      aria-expanded="true"
                      aria-labelledby={triggerId}
                      // No `text-*` of its own: the wrapper's row-size
                      // class sets the font size, and the input inherits
                      // it — so the query reads at exactly the size of
                      // the options it is filtering.
                      className="min-w-24 flex-1 bg-transparent text-content-primary outline-none placeholder:text-content-muted"
                      onChange={(changeEvent) => {
                        setQuery(changeEvent.target.value)
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      ref={internalInputElement}
                      role="combobox"
                      type="text"
                      value={currentQuery}
                    />
                  </div>
                </div>
              )}

              <div
                // Classic mode names the listbox after its trigger;
                // attached mode has no rendered trigger to point at, so it
                // carries its own label.
                aria-label={
                  isAttached ? "Suggestions" : undefined
                }
                aria-labelledby={
                  isAttached ? undefined : triggerId
                }
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
                            // Measured, not fixed-height. A long option
                            // label wraps to two lines (~56px), but the
                            // estimate is 36px — so pinning the row to
                            // `virtualRow.size` clipped it to one line's
                            // worth and stacked the next row on top of it,
                            // and the popup rendered as overlapping text.
                            // `measureElement` + `data-index` let the
                            // virtualizer read each row's real height and
                            // lay the rest out below it.
                            data-index={virtualRow.index}
                            key={option.value}
                            ref={
                              rowVirtualizer.measureElement
                            }
                            style={{
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
                <div className="shrink-0 whitespace-normal break-words border-border-subtle border-t p-2 text-content-secondary text-xs [overflow-wrap:anywhere]">
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
