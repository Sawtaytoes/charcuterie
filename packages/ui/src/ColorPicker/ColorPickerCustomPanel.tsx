import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { Button } from "../Button/Button.tsx"
import { CONTROL_SIZE_CLASS } from "../controlStyles.ts"
import { Field } from "../Field/Field.tsx"
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
} from "../intentStyles.ts"
import { Swatch } from "../Swatch/Swatch.tsx"
import { toClassName } from "../toClassName.ts"
import { parseHexColor } from "./parseHexColor.ts"

const TEXT_INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-border-default bg-surface-raised font-mono text-content-primary transition-colors duration-(--duration-fast) ease-standard placeholder:text-content-muted hover:border-border-strong aria-invalid:border-intent-danger-border"

/**
 * The browser's own swatch button. Its inner padding and the
 * `::-webkit-color-swatch` border are what make the stock control look
 * like a grey box with a colored stamp in it; zeroing both leaves a
 * flat chip the height of the field beside it.
 */
const NATIVE_COLOR_INPUT_CLASS =
  "h-(--control-height-md) w-16 shrink-0 cursor-pointer rounded-md border border-border-default bg-surface-raised p-1 hover:border-border-strong [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0"

export type ColorPickerCustomPanelProps = {
  /** The color the panel opens on — the current custom value, or a seed. */
  initialColor: string
  isDisabled: boolean
  label: string
  onApply: (hex: string) => void
  onCancel: () => void
  getColorError?: (hex: string) => null | string
  size: ControlSize
}

/**
 * The custom-color surface `ColorPicker` reveals under its trigger.
 *
 * ### The native color input is allowed here, and only here
 *
 * Every other picker in this library is ours because the OS paints the
 * native one and no token reaches inside it. A custom color is the one
 * case where the OS dialog is the right tool: it has the wheel, the
 * eyedropper and the sliders, none of which a person wants rebuilt.
 * So the native `<input type="color">` is the custom MODE, inside a
 * panel this component owns — never the whole picker, which is the
 * shape the presets replace.
 *
 * ### Nothing is applied until the person says so
 *
 * The native input fires on every movement of the wheel. Applying each
 * one would write dozens of colors to an app's server while a person
 * drags, and a refused color would flash an error mid-drag. The panel
 * holds a draft; **Use color** applies it, Enter in the hex field does
 * the same, and Escape or **Cancel** drops it.
 */
export const ColorPickerCustomPanel = ({
  getColorError,
  initialColor,
  isDisabled,
  label,
  onApply,
  onCancel,
  size,
}: ColorPickerCustomPanelProps): ReactNode => {
  const [draftText, setDraftText] = useState(initialColor)

  const [lastValidColor, setLastValidColor] = useState(
    parseHexColor(initialColor) ?? "",
  )

  const hexInputElement = useRef<HTMLInputElement>(null)

  // A frame late on purpose. The panel opens from a `Combobox` row, and
  // closing that popup hands focus back to the trigger after this
  // effect has run; focusing now would be undone a moment later.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      hexInputElement.current?.focus()
      hexInputElement.current?.select()
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  const draftColor = parseHexColor(draftText)

  const error =
    draftColor === null
      ? draftText.trim() === ""
        ? undefined
        : "Enter three or six hex digits, such as 3A86FF."
      : (getColorError?.(draftColor) ?? undefined)

  const isApplicable =
    !isDisabled &&
    draftColor !== null &&
    error === undefined

  const apply = () => {
    if (isApplicable) {
      onApply(draftColor)
    }
  }

  const updateDraft = (text: string) => {
    setDraftText(text)

    const parsed = parseHexColor(text)

    if (parsed !== null) {
      setLastValidColor(parsed)
    }
  }

  return (
    <fieldset
      aria-label={`${label}: custom color`}
      className="flex min-w-0 flex-col gap-3 rounded-md border border-border-subtle bg-surface-raised p-3"
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Escape") {
          keyEvent.preventDefault()
          keyEvent.stopPropagation()

          onCancel()
        }
      }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <Field label="Color wheel">
          <input
            aria-label={`${label}: color wheel`}
            className={toClassName(
              NATIVE_COLOR_INPUT_CLASS,
              FOCUS_RING_CLASS,
              DISABLED_CLASS,
            )}
            disabled={isDisabled}
            onChange={(changeEvent) => {
              updateDraft(
                changeEvent.currentTarget.value.toUpperCase(),
              )
            }}
            type="color"
            value={(
              draftColor ?? lastValidColor
            ).toLowerCase()}
          />
        </Field>

        <Field
          className="min-w-40 flex-1"
          error={error}
          label="Hex code"
        >
          <input
            autoComplete="off"
            className={toClassName(
              TEXT_INPUT_CLASS,
              CONTROL_SIZE_CLASS[size],
              FOCUS_RING_CLASS,
              DISABLED_CLASS,
            )}
            disabled={isDisabled}
            onChange={(changeEvent) => {
              updateDraft(changeEvent.currentTarget.value)
            }}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Enter") {
                keyEvent.preventDefault()

                apply()
              }
            }}
            placeholder="RRGGBB"
            ref={hexInputElement}
            spellCheck={false}
            type="text"
            value={draftText}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {draftColor === null ? null : (
          <Swatch
            className="me-auto"
            color={draftColor}
            isLabelVisible
            label={draftColor}
            size="sm"
          />
        )}

        <Button
          appearance="ghost"
          intent="neutral"
          isDisabled={isDisabled}
          onClick={onCancel}
          size={size}
          type="button"
        >
          Cancel
        </Button>

        <Button
          appearance="solid"
          intent="accent"
          isDisabled={!isApplicable}
          onClick={apply}
          size={size}
          type="button"
        >
          Use color
        </Button>
      </div>
    </fieldset>
  )
}
