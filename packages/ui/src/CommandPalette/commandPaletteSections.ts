import {
  parsePrefixCommand,
  rankWordPrefixMatches,
  type TextMatchRange,
} from "@charcuterie/logic"
import type { ReactNode } from "react"

/**
 * One thing the palette can open or run.
 *
 * A folder's members are items like any other: the caller flattens
 * them into `items`, and puts the folder's name in `description` so a
 * hit inside a folder still says where it lives.
 */
export type CommandPaletteItem = {
  /** Secondary text after the title — a folder, a section, a host. Matched, never highlighted. */
  description?: string
  /** Shown under this heading when the palette lists matches. Items without one share `ungroupedLabel`. */
  group?: string
  /** Opens as a link: a real `<a href>`, routed through `RouterLinkProvider`. */
  href?: string
  /** The app's own glyph or image. Decorative; the title is the name. */
  icon?: ReactNode
  /** Matched as extra words and never shown: an old name, an abbreviation, a product the app hosts. */
  keywords?: readonly string[]
  /** Unique within the list it is in. */
  key: string
  /** Trailing text at the end of the row: a kind ("Bookmark") or a status. */
  hint?: ReactNode
  /** Runs on choice. With an `href` too, it runs as well as the navigation — a place to record a visit. */
  onSelect?: () => void
  /** Passed to the link. `_blank` opens a new tab on a plain Enter or click. */
  target?: string
  /** What is typed for and highlighted. */
  title: string
  /** Breaks a tie inside a match tier, higher first: an open count, say. */
  weight?: number
}

/** A heading and its items, shown before anything is typed. */
export type CommandPaletteGroup = {
  items: readonly CommandPaletteItem[]
  key: string
  label: string
}

/**
 * A short prefix that sends the rest of the query to one target:
 * `{ prefix: "au", label: "Auction Site", getHref: (query) => … }`
 * turns `au lego` into one row that searches that site.
 */
export type CommandPalettePrefix = {
  /** The link the row opens, given what follows the prefix. */
  getHref?: (query: string) => string
  icon?: ReactNode
  /** The target's name, in the row's title and in the footer. */
  label: string
  /** Runs instead of, or as well as, the link. */
  onSelect?: (query: string) => void
  /** What is typed before the space: `au`. Matched without case. */
  prefix: string
}

export type CommandPaletteRow = {
  item: CommandPaletteItem
  /** Where the query matched the title; empty for a suggestion. */
  titleRanges: readonly TextMatchRange[]
}

export type CommandPaletteSection = {
  key: string
  label: string
  rows: readonly CommandPaletteRow[]
}

export type CommandPaletteSectionsOptions = {
  formatPrefixTitle: (
    label: string,
    query: string,
  ) => string
  getFallbackItem?: (
    query: string,
  ) => CommandPaletteItem | null | undefined
  items: readonly CommandPaletteItem[]
  maxResultsPerGroup?: number
  prefixGroupLabel: string
  prefixes: readonly CommandPalettePrefix[]
  query: string
  suggestions: readonly CommandPaletteGroup[]
  ungroupedLabel: string
}

/**
 * What the palette lists for a query, as headed sections in order.
 *
 * Three cases, decided in this order:
 *
 * 1. **A prefix command** (`au lego`) lists one row, for that target.
 * 2. **Nothing typed** lists the caller's `suggestions` — the shape
 *    the palette exists for: something to choose the moment it opens.
 * 3. **Anything else** lists the word-prefix matches from `items`,
 *    under each item's `group`, and then the caller's fallback row.
 *
 * Matched groups are ordered by their best member, so the first row
 * — the one Enter opens — is always the best match, whichever group
 * it belongs to.
 */
export const buildCommandPaletteSections = ({
  formatPrefixTitle,
  getFallbackItem,
  items,
  maxResultsPerGroup,
  prefixGroupLabel,
  prefixes,
  query,
  suggestions,
  ungroupedLabel,
}: CommandPaletteSectionsOptions): CommandPaletteSection[] => {
  const command = parsePrefixCommand(query, prefixes)

  if (command !== null) {
    const { query: commandQuery, target } = command

    return [
      {
        key: "prefix",
        label: prefixGroupLabel,
        rows: [
          {
            item: {
              href: target.getHref?.(commandQuery),
              icon: target.icon,
              key: `prefix-${target.prefix}`,
              onSelect:
                target.onSelect === undefined
                  ? undefined
                  : () => target.onSelect?.(commandQuery),
              title: formatPrefixTitle(
                target.label,
                commandQuery,
              ),
            },
            titleRanges: [],
          },
        ],
      },
    ]
  }

  const trimmedQuery = query.trim()

  if (trimmedQuery.length === 0) {
    return suggestions
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        key: `suggestion-${group.key}`,
        label: group.label,
        rows: group.items.map((item) => ({
          item,
          titleRanges: [],
        })),
      }))
  }

  const ranked = rankWordPrefixMatches(
    items,
    trimmedQuery,
    (item) => ({
      extra: [
        ...(item.description === undefined
          ? []
          : [item.description]),
        ...(item.keywords ?? []),
      ],
      title: item.title,
      weight: item.weight,
    }),
  )

  const sectionsByLabel = new Map<
    string,
    CommandPaletteRow[]
  >()

  for (const { item, match } of ranked) {
    const label = item.group ?? ungroupedLabel
    const rows = sectionsByLabel.get(label) ?? []

    if (
      maxResultsPerGroup === undefined ||
      rows.length < maxResultsPerGroup
    ) {
      rows.push({ item, titleRanges: match.titleRanges })
    }

    sectionsByLabel.set(label, rows)
  }

  const sections: CommandPaletteSection[] = [
    ...sectionsByLabel,
  ].map(([label, rows]) => ({
    key: `group-${label}`,
    label,
    rows,
  }))

  const fallbackItem = getFallbackItem?.(trimmedQuery)

  return fallbackItem == null
    ? sections
    : [
        ...sections,
        {
          key: "fallback",
          label: fallbackItem.group ?? ungroupedLabel,
          rows: [{ item: fallbackItem, titleRanges: [] }],
        },
      ]
}
