import type { ReactNode } from "react"

/**
 * One rail tab's subject: a provider, a vendor, an account — whatever
 * the catalog is browsed by.
 */
export type CatalogPickerGroup = {
  /**
   * Draws the initials badge (when the group has no `icon`) and rings
   * the icon. Any CSS color. It is a ring, never the text or the fill
   * behind text, so it cannot fail the contrast gate.
   */
  accentColor?: string
  /** The app's own icon. Charcuterie ships none; without one the group gets an initials badge. */
  icon?: ReactNode
  id: string
  /** The rail tab's accessible name and tooltip, and the heading over this group's search results. */
  label: string
}

export type CatalogPickerItem = {
  /** Secondary text beside the label — an account, a slug. Searched. */
  description?: string
  /** The group this item is browsed under, or `null` for none. */
  groupId: string | null
  /** Overrides the group's icon or badge for this row. */
  icon?: ReactNode
  isDisabled?: boolean
  /** The row's name and the trigger's text. Searched. */
  label: string
  /**
   * Shown at the top (`"start"`) or the bottom (`"end"`) of every rail
   * view, and of the search results when it matches — a "Default"
   * choice that belongs to no tab.
   */
  pinned?: "end" | "start"
  value: string
}

/**
 * A tab on the rail. Keys are prefixed so a group whose `id` is
 * `"favorites"` cannot collide with the favorites tab.
 */
export type CatalogPickerTab =
  | {
      key: typeof FAVORITES_TAB_KEY
      kind: "favorites"
      label: string
    }
  | {
      group: CatalogPickerGroup
      key: string
      kind: "group"
      label: string
    }

/**
 * One run of rows. A section with a `heading` is a labelled
 * `role="group"` inside the listbox; one without is a plain run of
 * options (pinned rows, and a browsing tab's own rows).
 */
export type CatalogPickerSection = {
  heading?: string
  items: readonly CatalogPickerItem[]
  key: string
}

export const FAVORITES_TAB_KEY = "favorites:"

export const toGroupTabKey = (groupId: string) =>
  `group:${groupId}`

/**
 * The words of a query, lowercased. Whitespace separates them; an
 * all-space query has none, and is treated as no query.
 */
export const toQueryWords = (query: string) =>
  query
    .toLowerCase()
    .split(/\s+/u)
    .filter((word) => word.length > 0)

/**
 * Substring match, case-insensitive, every word required: "opus 5"
 * finds "Claude Opus 5.5", and so does "5 opus". The text searched is
 * the label, the description and the group's label, so typing a
 * provider name lists that provider's rows.
 */
export const isCatalogItemMatch = ({
  groupLabel,
  item,
  words,
}: {
  groupLabel: string | undefined
  item: CatalogPickerItem
  words: readonly string[]
}) => {
  const haystack = [
    item.label,
    item.description ?? "",
    groupLabel ?? "",
  ]
    .join("\n")
    .toLowerCase()

  return words.every((word) => haystack.includes(word))
}

/**
 * The favorites, resolved to items in `favorites` order. A value that
 * names no item is skipped, and so is a pinned item: it is already on
 * every tab, and listing it twice would give one value two rows.
 */
export const resolveFavoriteItems = ({
  favorites,
  items,
}: {
  favorites: readonly string[]
  items: readonly CatalogPickerItem[]
}) => {
  const byValue = new Map(
    items.map((item) => [item.value, item] as const),
  )

  const seen = new Set<string>()

  return favorites.flatMap((value) => {
    const item = byValue.get(value)

    if (
      item === undefined ||
      item.pinned !== undefined ||
      seen.has(value)
    ) {
      return []
    }

    seen.add(value)

    return [item]
  })
}

/**
 * The rail, top to bottom: the favorites tab when any favorite
 * resolves, then one tab per group that has a row of its own, in
 * `groups` order.
 */
export const buildCatalogTabs = ({
  favorites,
  favoritesLabel,
  groups,
  items,
}: {
  favorites: readonly string[]
  favoritesLabel: string
  groups: readonly CatalogPickerGroup[]
  items: readonly CatalogPickerItem[]
}): CatalogPickerTab[] => {
  const groupIdsWithRows = new Set(
    items
      .filter((item) => item.pinned === undefined)
      .map((item) => item.groupId),
  )

  const groupTabs = groups
    .filter((group) => groupIdsWithRows.has(group.id))
    .map(
      (group): CatalogPickerTab => ({
        group,
        key: toGroupTabKey(group.id),
        kind: "group",
        label: group.label,
      }),
    )

  const hasFavorites =
    resolveFavoriteItems({ favorites, items }).length > 0

  return hasFavorites
    ? [
        {
          key: FAVORITES_TAB_KEY,
          kind: "favorites",
          label: favoritesLabel,
        },
        ...groupTabs,
      ]
    : groupTabs
}

/**
 * Where a fresh open lands: Favorites when the chosen value is a
 * favorite or a pinned row (and there are favorites), else the chosen
 * row's group, else Favorites, else the first group. `undefined` only
 * for an empty rail.
 */
export const pickInitialTabKey = ({
  favorites,
  items,
  tabs,
  value,
}: {
  favorites: readonly string[]
  items: readonly CatalogPickerItem[]
  tabs: readonly CatalogPickerTab[]
  value: string | undefined
}): string | undefined => {
  const hasFavoritesTab = tabs.some(
    (tab) => tab.kind === "favorites",
  )

  const chosen =
    value === undefined
      ? undefined
      : items.find((item) => item.value === value)

  if (
    hasFavoritesTab &&
    chosen !== undefined &&
    (chosen.pinned !== undefined ||
      favorites.includes(chosen.value))
  ) {
    return FAVORITES_TAB_KEY
  }

  if (chosen?.groupId != null) {
    const groupKey = toGroupTabKey(chosen.groupId)

    if (tabs.some((tab) => tab.key === groupKey)) {
      return groupKey
    }
  }

  return tabs[0]?.key
}

/**
 * The rows the list shows, as sections.
 *
 * **Browsing** (empty query): the pinned-start rows, the tab's own rows
 * (favorites in `favorites` order, a group's rows in `items` order),
 * the pinned-end rows. An empty rail browses every unpinned row.
 *
 * **Searching**: matches across every item, whatever tab is current —
 * the pinned-start matches, the matches that belong to no group, one
 * headed section per group in `groups` order, the pinned-end matches.
 * Favorites are not their own section in search: a favorite is found
 * under its group, once.
 */
export const buildCatalogSections = ({
  favorites,
  groups,
  items,
  query,
  tab,
}: {
  favorites: readonly string[]
  groups: readonly CatalogPickerGroup[]
  items: readonly CatalogPickerItem[]
  query: string
  tab: CatalogPickerTab | undefined
}): CatalogPickerSection[] => {
  const words = toQueryWords(query)

  const groupById = new Map(
    groups.map((group) => [group.id, group] as const),
  )

  const groupLabelOf = (item: CatalogPickerItem) =>
    item.groupId === null
      ? undefined
      : groupById.get(item.groupId)?.label

  const isSearching = words.length > 0

  const shown = isSearching
    ? items.filter((item) =>
        isCatalogItemMatch({
          groupLabel: groupLabelOf(item),
          item,
          words,
        }),
      )
    : items

  const pinnedStart = shown.filter(
    (item) => item.pinned === "start",
  )

  const pinnedEnd = shown.filter(
    (item) => item.pinned === "end",
  )

  const unpinned = shown.filter(
    (item) => item.pinned === undefined,
  )

  const middle: CatalogPickerSection[] = isSearching
    ? [
        {
          items: unpinned.filter(
            (item) =>
              item.groupId === null ||
              !groupById.has(item.groupId),
          ),
          key: "ungrouped",
        },
        ...groups.map(
          (group): CatalogPickerSection => ({
            heading: group.label,
            items: unpinned.filter(
              (item) => item.groupId === group.id,
            ),
            key: toGroupTabKey(group.id),
          }),
        ),
      ]
    : [
        {
          items:
            tab === undefined
              ? unpinned
              : tab.kind === "favorites"
                ? resolveFavoriteItems({ favorites, items })
                : unpinned.filter(
                    (item) => item.groupId === tab.group.id,
                  ),
          key: tab?.key ?? "all",
        },
      ]

  return [
    { items: pinnedStart, key: "pinned-start" },
    ...middle,
    { items: pinnedEnd, key: "pinned-end" },
  ].filter((section) => section.items.length > 0)
}

/**
 * A badge's text: the first letter or digit of each of the first two
 * words that have one, so "Northwind" is "N", "Contoso Labs" is "CL",
 * and "Contoso (Work)" is "CW" rather than "C(".
 */
export const toInitials = (label: string) =>
  label
    .split(/\s+/u)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter((initial) => initial !== undefined)
    .slice(0, 2)
    .join("")
    .toUpperCase()
