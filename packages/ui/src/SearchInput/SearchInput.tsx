import type { ControlSize } from "@charcuterie/tokens"
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useRef,
} from "react"

import { IconButton } from "../IconButton/IconButton.tsx"
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
} from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type SearchInputSize = Exclude<ControlSize, "sm">

const INPUT_SIZE_CLASS: Record<SearchInputSize, string> = {
  md: "h-(--control-height-md) ps-(--control-padding-inline-md) pe-(--control-height-md) text-md",
  lg: "h-(--control-height-lg) ps-(--control-padding-inline-lg) pe-(--control-height-lg) text-lg",
}

export type SearchInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "size" | "type"
> & {
  /** The app-owned glyph inside the clear button. */
  clearIcon: ReactNode
  clearLabel?: string
  /** Override value-derived visibility for an uncontrolled input. */
  isClearVisible?: boolean
  onClear: () => void
  /** Search and clear targets are never smaller than the medium control size. */
  size?: SearchInputSize
}

/**
 * A search field whose clear affordance is a real, labelled icon
 * button. The native search cancel widget is suppressed because it
 * is platform-painted, cannot use the token system, and provides a
 * much smaller pointer target than the control beside it.
 *
 * The app supplies the icon and owns the value. `SearchInput` owns
 * the shape, focus return, accessible button name, and target size.
 */
export const SearchInput = ({
  className,
  clearIcon,
  clearLabel = "Clear search",
  defaultValue,
  isClearVisible,
  onClear,
  ref,
  size = "md",
  value,
  ...inputProps
}: SearchInputProps): ReactNode => {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue =
    isClearVisible ??
    String(value ?? defaultValue ?? "").length > 0

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node

    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  return (
    <span
      className={toClassName("relative block", className)}
    >
      <input
        {...inputProps}
        className={toClassName(
          "w-full min-w-0 appearance-none rounded-md border border-border-default bg-surface-raised text-content-primary transition-colors duration-(--duration-fast) ease-standard placeholder:text-content-muted hover:border-border-strong aria-invalid:border-intent-danger-border [&::-webkit-search-cancel-button]:appearance-none",
          INPUT_SIZE_CLASS[size],
          FOCUS_RING_CLASS,
          DISABLED_CLASS,
        )}
        defaultValue={defaultValue}
        ref={setInputRef}
        type="search"
        value={value}
      />

      {hasValue && !inputProps.disabled ? (
        <span className="absolute inset-y-0 end-0 flex items-center">
          <IconButton
            appearance="ghost"
            label={clearLabel}
            onClick={() => {
              onClear()
              inputRef.current?.focus()
            }}
            onPointerDown={(event) =>
              event.preventDefault()
            }
            size={size}
          >
            {clearIcon}
          </IconButton>
        </span>
      ) : null}
    </span>
  )
}
