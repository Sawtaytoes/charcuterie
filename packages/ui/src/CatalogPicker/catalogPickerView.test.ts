import { expect, test } from "vitest"

import {
  buildCatalogSections,
  buildCatalogTabs,
  type CatalogPickerGroup,
  type CatalogPickerItem,
  FAVORITES_TAB_KEY,
  isCatalogItemMatch,
  pickInitialTabKey,
  resolveFavoriteItems,
  toGroupTabKey,
  toInitials,
} from "./catalogPickerView.ts"

const GROUPS: readonly CatalogPickerGroup[] = [
  { id: "alpha", label: "Alpha" },
  // `"favorites"` as a group id must not collide with the Favorites tab.
  { id: "favorites", label: "Beta Works" },
  { id: "empty", label: "Empty" },
]

const ITEMS: readonly CatalogPickerItem[] = [
  {
    groupId: null,
    label: "Default",
    pinned: "start",
    value: "default",
  },
  { groupId: "alpha", label: "One", value: "a1" },
  {
    description: "slug-two",
    groupId: "alpha",
    label: "Two",
    value: "a2",
  },
  { groupId: "favorites", label: "Three", value: "b3" },
  {
    groupId: "favorites",
    isDisabled: true,
    label: "Four",
    value: "b4",
  },
  { groupId: null, label: "Loose", value: "loose" },
  // Pinned rows do not give a group a tab.
  {
    groupId: "empty",
    label: "Last",
    pinned: "end",
    value: "last",
  },
]

const tabKeys = (favorites: readonly string[]) =>
  buildCatalogTabs({
    favorites,
    favoritesLabel: "Favorites",
    groups: GROUPS,
    items: ITEMS,
  }).map((tab) => tab.key)

const names = (
  sections: ReturnType<typeof buildCatalogSections>,
) =>
  sections.map((section) => ({
    heading: section.heading,
    values: section.items.map((item) => item.value),
  }))

test("the rail is Favorites, then each group with an unpinned row, in order", () => {
  expect(tabKeys(["b3"])).toEqual([
    FAVORITES_TAB_KEY,
    toGroupTabKey("alpha"),
    toGroupTabKey("favorites"),
  ])

  expect(tabKeys([])).toEqual([
    toGroupTabKey("alpha"),
    toGroupTabKey("favorites"),
  ])

  // A favorite that names nothing, or only a pinned row, is no Favorites tab.
  expect(tabKeys(["missing", "default"])).toEqual([
    toGroupTabKey("alpha"),
    toGroupTabKey("favorites"),
  ])
})

test("favorites resolve in their own order, once each, without pinned rows", () => {
  expect(
    resolveFavoriteItems({
      favorites: ["b3", "missing", "a1", "b3", "default"],
      items: ITEMS,
    }).map((item) => item.value),
  ).toEqual(["b3", "a1"])
})

test("opening picks Favorites, then the chosen group, then Favorites, then the first group", () => {
  const tabs = buildCatalogTabs({
    favorites: ["b3"],
    favoritesLabel: "Favorites",
    groups: GROUPS,
    items: ITEMS,
  })

  const pick = (
    value: string | undefined,
    favorites: readonly string[] = ["b3"],
  ) =>
    pickInitialTabKey({
      favorites,
      items: ITEMS,
      tabs:
        favorites.length === 0
          ? tabs.filter((tab) => tab.kind === "group")
          : tabs,
      value,
    })

  expect(pick("b3")).toBe(FAVORITES_TAB_KEY)
  expect(pick("default")).toBe(FAVORITES_TAB_KEY)
  expect(pick("a2")).toBe(toGroupTabKey("alpha"))
  expect(pick("loose")).toBe(FAVORITES_TAB_KEY)
  expect(pick(undefined)).toBe(FAVORITES_TAB_KEY)
  expect(pick("default", [])).toBe(toGroupTabKey("alpha"))
  expect(pick("b4", [])).toBe(toGroupTabKey("favorites"))
  expect(pick("unknown", [])).toBe(toGroupTabKey("alpha"))
})

test("browsing a tab frames its rows with the pinned rows", () => {
  const [, alphaTab] = buildCatalogTabs({
    favorites: ["b3", "a2"],
    favoritesLabel: "Favorites",
    groups: GROUPS,
    items: ITEMS,
  })

  expect(
    names(
      buildCatalogSections({
        favorites: ["b3", "a2"],
        groups: GROUPS,
        items: ITEMS,
        query: "   ",
        tab: alphaTab,
      }),
    ),
  ).toEqual([
    { heading: undefined, values: ["default"] },
    { heading: undefined, values: ["a1", "a2"] },
    { heading: undefined, values: ["last"] },
  ])
})

test("the Favorites tab lists favorites in favorites order", () => {
  const [favoritesTab] = buildCatalogTabs({
    favorites: ["b3", "a2"],
    favoritesLabel: "Favorites",
    groups: GROUPS,
    items: ITEMS,
  })

  expect(
    names(
      buildCatalogSections({
        favorites: ["b3", "a2"],
        groups: GROUPS,
        items: ITEMS,
        query: "",
        tab: favoritesTab,
      }),
    )[1],
  ).toEqual({ heading: undefined, values: ["b3", "a2"] })
})

test("an empty rail browses every unpinned row", () => {
  expect(
    names(
      buildCatalogSections({
        favorites: [],
        groups: [],
        items: ITEMS,
        query: "",
        tab: undefined,
      }),
    )[1]?.values,
  ).toEqual(["a1", "a2", "b3", "b4", "loose"])
})

test("a search crosses every group, headed in rail order, pinned rows outside", () => {
  expect(
    names(
      buildCatalogSections({
        favorites: ["b3"],
        groups: GROUPS,
        items: ITEMS,
        query: "o",
        tab: undefined,
      }),
    ),
  ).toEqual([
    { heading: undefined, values: ["loose"] },
    { heading: "Alpha", values: ["a1", "a2"] },
    // "Three" matches on its group's label, "Beta Works".
    { heading: "Beta Works", values: ["b3", "b4"] },
  ])
})

test("every word must match the label, description or group label, in any case", () => {
  const match = (query: string, item: CatalogPickerItem) =>
    isCatalogItemMatch({
      groupLabel: "Contoso (Work)",
      item,
      words: query
        .toLowerCase()
        .split(/\s+/u)
        .filter(Boolean),
    })

  const item: CatalogPickerItem = {
    description: "ct-lumen-4",
    groupId: "contoso-work",
    label: "Lumen 4",
    value: "x",
  }

  expect(match("LUMEN", item)).toBe(true)
  expect(match("work lumen", item)).toBe(true)
  expect(match("ct-lum", item)).toBe(true)
  expect(match("lumen prism", item)).toBe(false)
})

test("initials are the first letter or digit of the first two words", () => {
  expect(toInitials("Northwind")).toBe("N")
  expect(toInitials("tailspin labs inc")).toBe("TL")
  expect(toInitials("  Contoso (Work) ")).toBe("CW")
  expect(toInitials("4 Seasons")).toBe("4S")
})
