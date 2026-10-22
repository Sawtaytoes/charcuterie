import { useVisibility } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"
import { useRef, useState } from "react"

import { Button } from "../Button/Button.tsx"
import { Combobox } from "../Combobox/Combobox.tsx"
import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { Swatch } from "../Swatch/Swatch.tsx"
import { toClassName } from "../toClassName.ts"
import { ColorPickerCustomPanel } from "./ColorPickerCustomPanel.tsx"
import { parseHexColor } from "./parseHexColor.ts"

export type ColorPreset = {
  /**
   * Other words that find it — the family a name does not say. "Blush"
   * and "Cotton Candy" are pinks, and a person types "pink".
   */
  keywords?: readonly string[]
  /** What a person reads and types to find it — "Hot Pink", not "Pink 3". */
  name: string
  /** A `#RRGGBB` color. */
  value: string
}

/**
 * The value the "Custom color…" row carries. It cannot collide with a
 * preset, because every preset value starts with `#`.
 */
const CUSTOM_OPTION_VALUE = "custom-color"

/** See `Picker` — a constant element, so the file holds one component. */
const CHEVRON_DOWN = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    focusable={false}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.75}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export type ColorPickerProps = Omit<
  ComponentPropsWithRef<"button">,
  "color" | "disabled" | "onChange" | "value"
> & {
  /**
   * Shown under a custom draft when the app refuses it, and the reason
   * **Use color** stays disabled. Answer `null` to accept. It is asked
   * of custom colors only: the presets are the app's own list, so it
   * already vetted them.
   */
  getColorError?: (hex: string) => null | string
  /** Adds the "Custom color…" row and the custom panel it opens. */
  isCustomAllowed?: boolean
  isDisabled?: boolean
  /** What the color is FOR — "Second's color". Not the current value. */
  label: string
  /**
   * A preset answers its own `value`, as written. A custom color
   * answers `#RRGGBB` in upper case.
   */
  onChange: (hex: string) => void
  /** Read by the trigger when there is no value yet. */
  placeholder?: string
  presets: readonly ColorPreset[]
  /** The search field's hint. */
  searchPlaceholder?: string
  size?: ControlSize
  value?: string
}

const isSameColor = (first: string, second: string) =>
  (parseHexColor(first) ?? first) ===
  (parseHexColor(second) ?? second)

/**
 * A named color from a list, or a color of the person's own.
 *
 * ### Presets are a `Combobox`, because a palette worth offering is long
 *
 * Two dozen colors in a swatch grid is a wall of dots; the same list
 * as rows with a name lets a person type "pink" and see only the
 * pinks. Each row is a `Swatch` and its name; the name and the
 * preset's `keywords` are the search target, so "Blush" can answer
 * "pink". A hex code finds its preset too.
 *
 * ### Custom is a mode, not the whole control
 *
 * `isCustomAllowed` adds a last row, "Custom color…", which is always
 * listed whatever the search says. Choosing it reveals
 * `ColorPickerCustomPanel` under the trigger: the browser's color
 * wheel and a hex field, applied only on **Use color**. Typing a hex
 * code into the search and choosing the custom row opens the panel on
 * that code.
 *
 * ### The app decides what a custom color may be
 *
 * `getColorError` is the app's rule — a reader board that cannot show
 * gray, a label that has to clear contrast on both schemes. The
 * component does not know why a color is wrong, only that it is, and
 * it shows the app's sentence.
 *
 * ### The trigger says the name, or the code
 *
 * A preset reads `"Color: Hot Pink"`; a custom color reads
 * `"Color: #FF3399"`, because a custom color has no name and its code
 * is what is on screen (WCAG 2.5.3, as `Picker` argues).
 */
export const ColorPicker = ({
  className,
  getColorError,
  isCustomAllowed = false,
  isDisabled = false,
  label,
  onChange,
  placeholder = "Choose a color",
  presets,
  searchPlaceholder = "Search colors…",
  size = "md",
  value,
  ...buttonProps
}: ColorPickerProps): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  const [query, setQuery] = useState("")

  /**
   * The color the custom panel opens on, or `null` while it is closed.
   * Held here rather than inside the panel so a reopen starts fresh.
   */
  const [customSeed, setCustomSeed] = useState<
    null | string
  >(null)

  const triggerElement = useRef<HTMLButtonElement>(null)

  const currentPreset =
    value === undefined
      ? undefined
      : presets.find((preset) =>
          isSameColor(preset.value, value),
        )

  const customValue =
    value === undefined || currentPreset !== undefined
      ? null
      : (parseHexColor(value) ?? value)

  const triggerText =
    currentPreset?.name ?? customValue ?? placeholder

  const swatchColor = currentPreset?.value ?? customValue

  const normalizedQuery = query.trim().toLowerCase()

  const queryDigits = normalizedQuery.replace(/^#/, "")

  const matchingPresets =
    normalizedQuery === ""
      ? presets
      : presets.filter(
          (preset) =>
            [preset.name, ...(preset.keywords ?? [])].some(
              (word) =>
                word
                  .toLowerCase()
                  .includes(normalizedQuery),
            ) ||
            (queryDigits.length > 0 &&
              preset.value
                .toLowerCase()
                .replace(/^#/, "")
                .startsWith(queryDigits)),
        )

  const queryColor = parseHexColor(query)

  const customOptionText =
    queryColor === null
      ? "Custom color…"
      : `Custom color ${queryColor}…`

  const options: ListboxItem[] = [
    ...matchingPresets.map((preset) => ({
      label: (
        <span className="flex items-center gap-2">
          {/* Hidden: the row's text already names it, and a named
              image beside it would read "Hot Pink Hot Pink". */}
          <span aria-hidden="true" className="inline-flex">
            <Swatch
              color={preset.value}
              label={preset.name}
              size="sm"
            />
          </span>
          <span>{preset.name}</span>
        </span>
      ),
      textValue: preset.name,
      value: preset.value,
    })),
    ...(isCustomAllowed
      ? [
          {
            label: (
              <span className="flex items-center gap-2">
                {queryColor === null ? null : (
                  <span
                    aria-hidden="true"
                    className="inline-flex"
                  >
                    <Swatch
                      color={queryColor}
                      label={queryColor}
                      size="sm"
                    />
                  </span>
                )}
                <span>{customOptionText}</span>
              </span>
            ),
            textValue: customOptionText,
            value: CUSTOM_OPTION_VALUE,
          },
        ]
      : []),
  ]

  const selectedValue =
    currentPreset?.value ??
    (customValue === null ? undefined : CUSTOM_OPTION_VALUE)

  const dismiss = () => {
    setQuery("")

    hide()
  }

  const closeCustomPanel = () => {
    setCustomSeed(null)

    triggerElement.current?.focus()
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Combobox
        emptyLabel="No color by that name"
        isVisible={isVisible && !isDisabled}
        itemSize={size}
        // The selection is read off `value` on each open. Combobox seeds
        // its tick once, so a value that moved under it — a custom color
        // applied from the panel — remounts it rather than leaving the
        // old preset ticked.
        key={`combobox-${selectedValue ?? "none"}`}
        onDismiss={dismiss}
        onQueryChange={setQuery}
        onSelect={(optionValue) => {
          if (optionValue === CUSTOM_OPTION_VALUE) {
            setCustomSeed(
              queryColor ??
                customValue ??
                currentPreset?.value ??
                presets[0]?.value ??
                "",
            )
          } else {
            setCustomSeed(null)

            onChange(optionValue)
          }

          setQuery("")
        }}
        options={options}
        placeholder={searchPlaceholder}
        query={query}
        selectedValue={selectedValue}
        trigger={
          <Button
            {...buttonProps}
            appearance="outline"
            aria-label={`${label}: ${triggerText}`}
            className={toClassName(
              "justify-between",
              className,
            )}
            iconEnd={CHEVRON_DOWN}
            intent="neutral"
            isDisabled={isDisabled}
            onClick={(clickEvent) => {
              buttonProps.onClick?.(clickEvent)

              toggle()
            }}
            ref={triggerElement}
            size={size}
            type="button"
          >
            <span className="-mx-1 flex min-w-0 grow items-center gap-2 overflow-x-clip px-1 text-start">
              {swatchColor === null ||
              swatchColor === undefined ? null : (
                <Swatch
                  color={swatchColor}
                  label={triggerText}
                  size="sm"
                />
              )}
              <span className="min-w-0 truncate">
                {triggerText}
              </span>
            </span>
          </Button>
        }
      />

      {customSeed === null ? null : (
        <ColorPickerCustomPanel
          getColorError={getColorError}
          initialColor={customSeed}
          isDisabled={isDisabled}
          // A new seed is a new draft.
          key={`custom-${customSeed}`}
          label={label}
          onApply={(hex) => {
            onChange(hex)

            closeCustomPanel()
          }}
          onCancel={closeCustomPanel}
          size={size}
        />
      )}
    </div>
  )
}
