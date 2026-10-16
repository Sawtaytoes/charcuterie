import { useUniqueId } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
import { SearchInput } from "../SearchInput/SearchInput.tsx"
import { toClassName } from "../toClassName.ts"
import { CommandPaletteFooter } from "./CommandPaletteFooter.tsx"
import { CommandPaletteOption } from "./CommandPaletteOption.tsx"
import {
  buildCommandPaletteSections,
  type CommandPaletteGroup,
  type CommandPaletteItem,
  type CommandPalettePrefix,
  type CommandPaletteRow,
} from "./commandPaletteSections.ts"

export type CommandPalettePanelProps = {
  /** The glyph inside the clear button. Without one, there is no clear button — Escape closes. */
  clearIcon?: ReactNode
  /** The query the palette opens with, when the caller does not own `query`. Read once per open. */
  defaultQuery?: string
  /** Shown when a query matches nothing and there is no fallback row. Default "No matches". */
  emptyLabel?: string
  /**
   * The strip under the list. Default: the keys, and each prefix
   * with its target. `null` draws none.
   */
  footer?: ReactNode
  /** The title of a prefix command's row. Default `Search <label> for "<query>"`. */
  formatPrefixTitle?: (
    label: string,
    query: string,
  ) => string
  /** The last row for any query that is not a prefix command — the "search the web" row. */
  getFallbackItem?: (
    query: string,
  ) => CommandPaletteItem | null | undefined
  /** Ref to the search field, for the dialog's initial focus. */
  inputRef?: RefObject<HTMLInputElement | null>
  /** How tall each row is — and the search field. Default `lg`, stepped down on a short window. */
  itemSize?: ControlSize
  /** Everything a query can match. Folder members included, flattened. */
  items: readonly CommandPaletteItem[]
  /** The accessible name of the search field and the list. Default "Search". */
  label?: string
  /** At most this many matches under one heading. Default: no cap. */
  maxResultsPerGroup?: number
  /** After a row is chosen. `CommandPalette` closes here. */
  onChoose?: () => void
  /** Every change to the query. With `query`, the caller owns it. */
  onQueryChange?: (query: string) => void
  placeholder?: string
  /** The heading over a prefix command's row. Default "Search a site". */
  prefixGroupLabel?: string
  prefixes?: readonly CommandPalettePrefix[]
  /** Controlled query. Uncontrolled (from `defaultQuery`) when absent. */
  query?: string
  /** What the palette lists before anything is typed — "Pinned", "Recently opened". */
  suggestions?: readonly CommandPaletteGroup[]
  /** The heading over matches whose item has no `group`. Default "Results". */
  ungroupedLabel?: string
}

const defaultFormatPrefixTitle = (
  label: string,
  query: string,
) => `Search ${label} for “${query}”`

const GROUP_HEADING_INSET_CLASS: Record<
  ControlSize,
  string
> = {
  lg: "px-(--control-padding-inline-lg)",
  md: "px-(--control-padding-inline-md)",
  sm: "px-(--control-padding-inline-sm)",
}

const SEARCH_SIZE: Record<ControlSize, "lg" | "md"> = {
  lg: "lg",
  md: "md",
  sm: "md",
}

type IndexedRow = CommandPaletteRow & {
  id: string
  index: number
}

/**
 * The palette's contents — the search field, the grouped listbox and
 * the footer — without the dialog around them. `CommandPalette` is
 * this inside a `Modal`; the stories also lay it out inline, so every
 * state can sit on one board.
 */
export const CommandPalettePanel = ({
  clearIcon,
  defaultQuery = "",
  emptyLabel = "No matches",
  footer,
  formatPrefixTitle = defaultFormatPrefixTitle,
  getFallbackItem,
  inputRef: externalInputRef,
  itemSize: requestedItemSize = "lg",
  items,
  label = "Search",
  maxResultsPerGroup,
  onChoose,
  onQueryChange,
  placeholder = "Search…",
  prefixGroupLabel = "Search a site",
  prefixes = [],
  query,
  suggestions = [],
  ungroupedLabel = "Results",
}: CommandPalettePanelProps): ReactNode => {
  const itemSize = usePanelItemSize(requestedItemSize)

  const listId = useUniqueId()

  const ownInputRef = useRef<HTMLInputElement>(null)
  const inputRef = externalInputRef ?? ownInputRef

  const [internalQuery, setInternalQuery] =
    useState(defaultQuery)

  const currentQuery = query ?? internalQuery

  const [activeIndex, setActiveIndex] = useState(0)

  const sections = useMemo(
    () =>
      buildCommandPaletteSections({
        formatPrefixTitle,
        getFallbackItem,
        items,
        maxResultsPerGroup,
        prefixGroupLabel,
        prefixes,
        query: currentQuery,
        suggestions,
        ungroupedLabel,
      }),
    [
      currentQuery,
      formatPrefixTitle,
      getFallbackItem,
      items,
      maxResultsPerGroup,
      prefixGroupLabel,
      prefixes,
      suggestions,
      ungroupedLabel,
    ],
  )

  const indexedSections = useMemo(() => {
    let index = 0

    return sections.map((section) => ({
      ...section,
      headingId: `${listId}-${section.key}`,
      rows: section.rows.map(
        (row): IndexedRow => ({
          ...row,
          id: `${listId}-${section.key}-${row.item.key}`,
          index: index++,
        }),
      ),
    }))
  }, [listId, sections])

  const rows = indexedSections.flatMap(
    (section) => section.rows,
  )

  const resolvedActiveIndex =
    rows.length === 0
      ? -1
      : Math.min(activeIndex, rows.length - 1)

  const activeRow = rows[resolvedActiveIndex]

  const setQuery = (nextQuery: string) => {
    if (query === undefined) {
      setInternalQuery(nextQuery)
    }

    setActiveIndex(0)

    onQueryChange?.(nextQuery)
  }

  // The arrows can walk the active row out of the scrolled list; bring
  // it back. `nearest` is a no-op for a row the pointer is already on.
  useEffect(() => {
    if (activeRow === undefined) {
      return
    }

    document
      .getElementById(activeRow.id)
      ?.scrollIntoView?.({ block: "nearest" })
  }, [activeRow])

  /**
   * Opening with a typed character puts the caret AFTER it, so the
   * next key extends the query instead of landing in front of it.
   * Once per mount: a later focus (back from the clear button) keeps
   * wherever the person left the caret.
   */
  const hasPlacedCaret = useRef(false)

  const choose = (row: IndexedRow) => {
    onChoose?.()
    row.item.onSelect?.()
  }

  const activate = (row: IndexedRow, isNewTab: boolean) => {
    const { href } = row.item

    if (href === undefined) {
      choose(row)

      return
    }

    if (isNewTab) {
      window.open(href, "_blank", "noopener,noreferrer")
      choose(row)

      return
    }

    // The row is the `<a href>` itself, so clicking it takes the path
    // a mouse would — the injected router link, `target`, all of it —
    // and its `onClick` runs `choose`.
    document.getElementById(row.id)?.click()
  }

  const handleKeyDown = (
    keyboardEvent: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    const lastIndex = rows.length - 1

    switch (keyboardEvent.key) {
      case "ArrowDown": {
        keyboardEvent.preventDefault()
        setActiveIndex(
          Math.min(resolvedActiveIndex + 1, lastIndex),
        )

        return
      }
      case "ArrowUp": {
        keyboardEvent.preventDefault()
        setActiveIndex(Math.max(resolvedActiveIndex - 1, 0))

        return
      }
      case "Home": {
        keyboardEvent.preventDefault()
        setActiveIndex(0)

        return
      }
      case "End": {
        keyboardEvent.preventDefault()
        setActiveIndex(Math.max(lastIndex, 0))

        return
      }
      case "Enter": {
        if (activeRow === undefined) {
          return
        }

        keyboardEvent.preventDefault()
        activate(
          activeRow,
          keyboardEvent.ctrlKey || keyboardEvent.metaKey,
        )

        return
      }
      default:
    }
  }

  const hasRows = rows.length > 0
  const isQueryEmpty = currentQuery.trim().length === 0

  const footerContent =
    footer === undefined ? (
      <CommandPaletteFooter prefixes={prefixes} />
    ) : (
      footer
    )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-border-subtle border-b p-2">
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
          enterKeyHint="go"
          isClearVisible={
            clearIcon !== undefined &&
            currentQuery.length > 0
          }
          onChange={(changeEvent) =>
            setQuery(changeEvent.currentTarget.value)
          }
          onClear={() => setQuery("")}
          onFocus={(focusEvent) => {
            if (hasPlacedCaret.current) {
              return
            }

            hasPlacedCaret.current = true

            const { length } =
              focusEvent.currentTarget.value

            focusEvent.currentTarget.setSelectionRange(
              length,
              length,
            )
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          role="combobox"
          size={SEARCH_SIZE[itemSize]}
          spellCheck={false}
          value={currentQuery}
        />
      </div>

      {hasRows ? (
        <div
          aria-label={label}
          className="charcuterie-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
          id={listId}
          role="listbox"
        >
          {indexedSections.map((section) => (
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
                {section.label}
              </div>

              {section.rows.map((row) => (
                <CommandPaletteOption
                  id={row.id}
                  isActive={
                    row.index === resolvedActiveIndex
                  }
                  item={row.item}
                  itemSize={itemSize}
                  key={row.id}
                  onChoose={() => choose(row)}
                  onPoint={() => {
                    if (row.index !== resolvedActiveIndex) {
                      setActiveIndex(row.index)
                    }
                  }}
                  titleRanges={row.titleRanges}
                />
              ))}
            </div>
          ))}
        </div>
      ) : isQueryEmpty ? null : (
        <p className="m-0 px-4 py-6 text-center text-content-muted text-sm">
          {emptyLabel}
        </p>
      )}

      {footerContent === null ? null : (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-border-subtle border-t px-4 py-2 text-content-muted text-xs">
          {footerContent}
        </div>
      )}
    </div>
  )
}
