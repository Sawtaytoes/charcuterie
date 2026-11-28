import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useState } from "react"

import type {
  CatalogPickerGroup,
  CatalogPickerItem,
} from "./CatalogPicker.tsx"
import { CatalogPicker } from "./CatalogPicker.tsx"
import { CatalogPickerPanel } from "./CatalogPickerPanel.tsx"

/**
 * Story-only fixtures for `CatalogPicker`. **Nothing here ships**, and
 * every provider, model and account below is invented.
 *
 * The icons are hand-drawn shapes, as in `icons.storyHelpers.tsx`: an
 * app passes its own provider logos, and a shape inheriting
 * `currentColor` is the honest stand-in for one.
 */
const iconProps = {
  className: "size-[1.15em] shrink-0",
  fill: "currentColor",
  focusable: false,
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
} as const

export const TriangleIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M12 3 22 20H2z" />
  </svg>
)

export const HexagonIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="m12 2 8.66 5v10L12 22l-8.66-5V7z" />
  </svg>
)

export const DiamondIcon = (): ReactNode => (
  <svg {...iconProps} aria-hidden="true">
    <path d="m12 2 10 10-10 10L2 12z" />
  </svg>
)

/** The clear button's glyph, drawn: `✕` measures blank in this Chromium. */
export const ClearIcon = (): ReactNode => (
  <svg
    {...iconProps}
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth={2}
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

/**
 * Six groups: three with icons, two on initials badges, and a second
 * account of one provider told apart by an accent ring.
 */
export const CATALOG_GROUPS: readonly CatalogPickerGroup[] =
  [
    {
      icon: <TriangleIcon />,
      id: "northwind",
      label: "Northwind",
    },
    {
      icon: <HexagonIcon />,
      id: "contoso",
      label: "Contoso",
    },
    {
      accentColor: "var(--color-categorical-6-solid)",
      icon: <HexagonIcon />,
      id: "contoso-work",
      label: "Contoso (Work)",
    },
    {
      icon: <DiamondIcon />,
      id: "fabrikam",
      label: "Fabrikam",
    },
    { id: "tailspin", label: "Tailspin Labs" },
    {
      accentColor: "var(--color-categorical-2-solid)",
      id: "litware",
      label: "Litware",
    },
    // No rows: left off the rail.
    { id: "adatum", label: "Adatum" },
  ]

const toModels = (
  groupId: string,
  prefix: string,
  names: readonly string[],
  description?: (slug: string) => string,
): CatalogPickerItem[] =>
  names.map((name) => {
    const slug = `${prefix}-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/-$/u, "")}`

    return {
      description:
        description === undefined
          ? slug
          : description(slug),
      groupId,
      label: name,
      value: `${groupId}/${slug}`,
    }
  })

const CONTOSO_MODELS = [
  "Lumen 4",
  "Lumen 4 Mini",
  "Lumen 3.5",
  "Prism 2",
  "Prism 2 Fast",
  "Beacon 1",
  "Beacon 1 Long Context",
]

/** Forty-two invented models across six groups, plus a pinned default. */
export const CATALOG_ITEMS: readonly CatalogPickerItem[] = [
  {
    description: "Whatever the app picks",
    groupId: null,
    label: "Default",
    pinned: "start",
    value: "default",
  },
  ...toModels("northwind", "nw", [
    "Swift 3",
    "Swift 3 Mini",
    "Swift 2.5",
    "Atlas 2",
    "Atlas 2 Reasoning",
    "Atlas 1",
    "Harbor 5",
    "Harbor 5 Turbo",
    "Harbor 4",
  ]),
  ...toModels("contoso", "ct", CONTOSO_MODELS),
  ...toModels(
    "contoso-work",
    "ct",
    CONTOSO_MODELS,
    () => "Work account",
  ),
  ...toModels("fabrikam", "fb", [
    "Loom 7",
    "Loom 7 Small",
    "Loom 6",
    "Weave Code 2",
    "Weave Code 1",
    "Spindle Vision",
  ]),
  {
    ...toModels("fabrikam", "fb", ["Loom 5 (retired)"])[0],
    isDisabled: true,
  } as CatalogPickerItem,
  ...toModels("tailspin", "ts", [
    "Glide 2",
    "Glide 2 Nano",
    "Glide 1",
    "Updraft 3",
    "Updraft 3 Instruct",
    "Tailwind Research Preview With A Very Long Name",
  ]),
  ...toModels("litware", "lw", [
    "Quill 4",
    "Quill 4 Lite",
    "Margin 2",
    "Folio 1",
    "Ledger Experimental",
  ]),
  {
    description: "Ask every time",
    groupId: null,
    label: "Choose per task",
    pinned: "end",
    value: "per-task",
  },
]

export const CATALOG_FAVORITES: readonly string[] = [
  "contoso/ct-lumen-4",
  "northwind/nw-swift-3",
  "contoso-work/ct-lumen-4",
  "tailspin/ts-glide-2",
]

/** A picker whose value is the story's own state, so choosing updates the trigger. */
export const CatalogPickerHarness = ({
  favorites = CATALOG_FAVORITES,
  groups = CATALOG_GROUPS,
  initialValue,
  isDisabled,
  items = CATALOG_ITEMS,
  label = "Agent",
  placeholder,
  size,
}: {
  favorites?: readonly string[]
  groups?: readonly CatalogPickerGroup[]
  initialValue?: string
  isDisabled?: boolean
  items?: readonly CatalogPickerItem[]
  label?: string
  placeholder?: string
  size?: ControlSize
}): ReactNode => {
  const [value, setValue] = useState(initialValue)

  return (
    <CatalogPicker
      clearIcon={<ClearIcon />}
      favorites={favorites}
      groups={groups}
      isDisabled={isDisabled}
      items={items}
      label={label}
      onChange={setValue}
      placeholder={placeholder}
      searchPlaceholder="Search models…"
      size={size}
      value={value}
    />
  )
}

/**
 * The panel drawn in place, on the overlay's surface and at its size,
 * so a board can show a state the closed picker hides — a tab, a
 * search, no matches — side by side and in a screenshot.
 */
export const InlineCatalogPanel = ({
  defaultQuery,
  label,
  size = "md",
  value,
}: {
  defaultQuery?: string
  label: string
  size?: ControlSize
  value?: string
}): ReactNode => {
  const [chosen, setChosen] = useState(value)

  return (
    <div className="flex h-[28rem] w-[26rem] max-w-full overflow-hidden rounded-md border border-border-default bg-surface-overlay shadow-medium">
      <CatalogPickerPanel
        clearIcon={<ClearIcon />}
        defaultQuery={defaultQuery}
        emptyLabel="No matches"
        favorites={CATALOG_FAVORITES}
        favoritesLabel="Favorites"
        groups={CATALOG_GROUPS}
        itemSize={size}
        items={CATALOG_ITEMS}
        label={label}
        onDismiss={() => undefined}
        onSelect={setChosen}
        searchPlaceholder="Search models…"
        value={chosen}
      />
    </div>
  )
}
