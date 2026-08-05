import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useRef, useState } from "react"

import { Button } from "../Button/Button.tsx"
import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { Combobox } from "./Combobox.tsx"

const LANGUAGES: ListboxItem[] = [
  { label: "English", value: "eng" },
  { label: "Spanish", value: "spa" },
  { label: "French", value: "fra" },
  { label: "German", value: "deu" },
  { label: "Japanese", value: "jpn" },
  { label: "Korean", value: "kor" },
  { label: "Portuguese", value: "por" },
]

const LANGUAGES_DISABLED_FIRST: ListboxItem[] = [
  { isDisabled: true, label: "English", value: "eng" },
  { label: "Spanish", value: "spa" },
  { label: "French", value: "fra" },
]

// A long list, to trip the auto-virtualization threshold.
const MANY: ListboxItem[] = Array.from(
  { length: 500 },
  (_unused, index) => ({
    label: `Track ${index + 1}`,
    textValue: `Track ${index + 1}`,
    value: `track-${index + 1}`,
  }),
)

const meta = {
  title: "Components/Combobox",
  component: Combobox,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Combobox>

export default meta

type Story = StoryObj<typeof meta>

const ComboboxHarness = ({
  emptyLabel,
  error,
  footer,
  isCreatable,
  isInitiallyVisible = false,
  isLoading,
  isMultiple,
  isVirtualized,
  options,
  triggerLabel,
}: {
  emptyLabel?: string
  error?: ReactNode
  footer?: ReactNode
  isCreatable?: boolean
  isInitiallyVisible?: boolean
  isLoading?: boolean
  isMultiple?: boolean
  isVirtualized?: boolean
  options: ListboxItem[]
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isInitiallyVisible,
  })

  const [chosen, setChosen] = useState<string[]>([])

  return (
    <>
      <Combobox
        emptyLabel={emptyLabel}
        error={error}
        footer={footer}
        isCreatable={isCreatable}
        isLoading={isLoading}
        isMultiple={isMultiple}
        isVirtualized={isVirtualized}
        isVisible={isVisible}
        onDismiss={hide}
        onSelect={(value) => {
          setChosen((previous) =>
            previous.includes(value)
              ? previous.filter((one) => one !== value)
              : [...previous, value],
          )
        }}
        options={options}
        trigger={
          <Button appearance="outline" onClick={toggle}>
            {triggerLabel}
          </Button>
        }
      />

      <p className="mt-2 text-content-muted text-xs">
        Chosen: {chosen.join(", ") || "—"}
      </p>
    </>
  )
}

export const Default: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Search languages</Button>,
  },
  render: () => (
    <ComboboxHarness
      options={LANGUAGES}
      triggerLabel="Search languages"
    />
  ),
}

/**
 * The loading and error panel states — the ones only `PathPicker` had
 * all of, and every fleet picker did differently. Both keep the popup
 * open.
 */
export const AllStates: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Search</Button>,
  },
  render: () => (
    <div className="flex flex-col gap-8">
      <ComboboxHarness
        isLoading
        options={LANGUAGES}
        triggerLabel="Loading state"
      />

      <ComboboxHarness
        error="Could not reach the server."
        options={LANGUAGES}
        triggerLabel="Error state"
      />
    </div>
  ),
}

/**
 * Multi-select renders the chosen values as an always-visible row of
 * removable chips **above the trigger** — they stay on screen after the
 * popup closes, and each carries its option's human label (not its raw
 * value) and an ✕ to remove it. The `LanguageCodeField` and `LinkPicker`
 * shapes. `isCreatable` lets Enter commit the raw query.
 */
export const AllVariants: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Pick languages</Button>,
  },
  render: () => (
    <ComboboxHarness
      footer="Type a code and press Enter to add it."
      isCreatable
      isMultiple
      options={LANGUAGES}
      triggerLabel="Pick languages"
    />
  ),
}

/**
 * Five hundred options, windowed with `@tanstack/react-virtual`: only
 * the visible rows are in the DOM, so each carries `aria-setsize` and
 * `aria-posinset` — otherwise a screen reader announces "2 of 12" for
 * a list that is nothing of the sort.
 */
export const Virtualized: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: MANY,
    trigger: <Button>Search 500 tracks</Button>,
  },
  render: () => (
    <ComboboxHarness
      isInitiallyVisible
      options={MANY}
      triggerLabel="Search 500 tracks"
    />
  ),
}

/**
 * Open it and type: the list filters as you go, arrows move the active
 * option while the caret stays in the input, Enter chooses, and Escape
 * clears the query before it closes.
 */
export const Interactive: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES,
    trigger: <Button>Search languages</Button>,
  },
  render: () => (
    <ComboboxHarness
      options={LANGUAGES}
      triggerLabel="Search languages"
    />
  ),
}

/**
 * A disabled option in the seed position. Opening seeds the active row at
 * index 0, so the resolved active descendant must skip past the disabled
 * first option to the first enabled one — and Enter must never commit the
 * disabled value.
 */
// A tiny in-memory directory tree for the attached-input demo: keys are
// parent paths (with trailing slash), values their child folders.
const TREE: Record<string, string[]> = {
  "/": ["apps", "config", "media"],
  "/apps/": ["mux-magic", "charcuterie"],
  "/config/": ["hosts", "secrets"],
  "/media/": ["movies", "music"],
}

const AttachedInputHarness = (): ReactNode => {
  const inputRef = useRef<HTMLInputElement>(null)

  const [value, setValue] = useState("/")

  const [isVisible, setIsVisible] = useState(true)

  const lastSlash = value.lastIndexOf("/")

  const parentPath = value.slice(0, lastSlash + 1) || "/"

  const tail = value.slice(lastSlash + 1)

  const options: ListboxItem[] = (TREE[parentPath] ?? [])
    .filter((name) => name.startsWith(tail))
    .map((name) => ({
      label: `📁 ${name}`,
      textValue: name,
      value: name,
    }))

  return (
    <>
      <input
        aria-label="Path"
        className="w-80 rounded-md border border-border-default bg-surface-raised px-2 py-1.5 font-mono text-content-primary text-sm outline-none"
        onChange={(changeEvent) => {
          setValue(changeEvent.target.value)

          setIsVisible(true)
        }}
        ref={inputRef}
        value={value}
      />

      <Combobox
        emptyLabel="No matching entries."
        inputRef={inputRef}
        isVisible={isVisible}
        onDismiss={() => {
          setIsVisible(false)
        }}
        onSelect={(name) => {
          // Drill in: append the picked folder + separator. The changed
          // query refetches the new directory; the popup stays open
          // because we never flip `isVisible`.
          setValue(`${parentPath}${name}/`)
        }}
        options={options}
        query={value}
      />
    </>
  )
}

/**
 * Attached-input mode: the consumer renders its own `<input>` (both the
 * committed value and the query) and Combobox anchors a list-only popup
 * to it. Type a path; picking a folder appends it and re-queries that
 * folder's children **without closing** — a shell-style drill-down. This
 * is `PathPicker`'s shape.
 */
export const AttachedInputDrillDown: Story = {
  args: {
    inputRef: { current: null },
    isVisible: true,
    onDismiss: () => {},
    onSelect: () => {},
    options: [],
    query: "/",
  },
  render: () => <AttachedInputHarness />,
}

// Long, space-separated names — the real-world case (a media library of
// long folder names) the short demo tree does not show.
const LONG_OPTIONS: ListboxItem[] = [
  "Armored Trooper Votoms - Brilliantly Shining Heresy [anidb-7910]",
  "Armored Trooper Votoms - Case;Irvine [anidb-7911]",
  "Armored Trooper Votoms - Chirico's Return [anidb-1234]",
  "Armored Trooper Votoms - Deadworld Sunsa [anidb-5678]",
  "Armored Trooper Votoms - Pailsen Files - The Movie [anidb-9012]",
].map((name) => ({
  label: `📁 ${name}`,
  textValue: name,
  value: name,
}))

const LongOptionsHarness = (): ReactNode => {
  const inputRef = useRef<HTMLInputElement>(null)

  const [isVisible, setIsVisible] = useState(true)

  return (
    <>
      <input
        aria-label="Path"
        className="w-80 rounded-md border border-border-default bg-surface-raised px-2 py-1.5 font-mono text-content-primary text-sm outline-none"
        readOnly
        ref={inputRef}
        value="/media/Media-Storage/Anime/"
      />

      <Combobox
        emptyLabel="No matching entries."
        inputRef={inputRef}
        isVisible={isVisible}
        onDismiss={() => {
          setIsVisible(false)
        }}
        onSelect={() => {}}
        options={LONG_OPTIONS}
        query="/media/Media-Storage/Anime/"
      />
    </>
  )
}

/**
 * How the attached-input popup handles **long option labels** — a media
 * library of long folder names, the case the short drill-down demo hides.
 * Shows how the panel sizes and how each option row treats overflow.
 */
export const AttachedInputLongOptions: Story = {
  args: {
    inputRef: { current: null },
    isVisible: true,
    onDismiss: () => {},
    onSelect: () => {},
    options: LONG_OPTIONS,
    query: "/media/Media-Storage/Anime/",
  },
  render: () => <LongOptionsHarness />,
}

export const DisabledFirstOption: Story = {
  args: {
    isVisible: false,
    onDismiss: () => {},
    onSelect: () => {},
    options: LANGUAGES_DISABLED_FIRST,
    trigger: <Button>Pick a language</Button>,
  },
  render: () => (
    <ComboboxHarness
      isInitiallyVisible
      options={LANGUAGES_DISABLED_FIRST}
      triggerLabel="Pick a language"
    />
  ),
}
