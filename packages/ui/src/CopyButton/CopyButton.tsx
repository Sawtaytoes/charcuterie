import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import type { ButtonProps } from "../Button/Button.tsx"
import { Button } from "../Button/Button.tsx"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import { copyText as defaultCopyText } from "./copyText.ts"

/** Where the button is in the one action it performs. */
export type CopyStatus = "copied" | "failed" | "idle"

export type CopyButtonProps = Omit<
  ButtonProps,
  "children" | "isLoading" | "loadingLabel" | "onCopy"
> & {
  /**
   * How long the confirmation stays up, in milliseconds.
   *
   * Long enough to be read after the eye has moved back to the form
   * being filled in, short enough that a second copy of a *different*
   * value is not mistaken for the first one's tick.
   */
  confirmDuration?: number
  /** Resting label. A word, not a glyph — this library ships no icons. */
  children?: ReactNode
  /** Shown while the copy is confirmed. */
  copiedLabel?: ReactNode
  /**
   * The clipboard write, injected. Swapped in tests and in a host
   * that owns its own clipboard bridge (Electron, a kiosk shell).
   */
  copy?: (value: string) => Promise<boolean> | boolean
  /** Shown when the clipboard refused. */
  failedLabel?: ReactNode
  /**
   * Told what actually happened, every press.
   *
   * `isCopied` is the point of the callback rather than a detail: a
   * consumer that files the mail away on a copy must not file it away
   * on a copy the browser refused.
   */
  onCopy?: (isCopied: boolean, value: string) => void
  /** The string that goes on the clipboard. */
  value: string
}

/**
 * A button that puts a string on the clipboard and says so.
 *
 * From a consumer, like `Alert` and `BadgeButton` before it: four
 * repos spell this shape by hand — mux-magic's YAML dialog flips its
 * own label on a `setTimeout`, spoolbuddy carries a 15-line
 * `copyToClipboard` with the `execCommand` fallback inline, bambuddy
 * copies a download link from two menus, and mail-sifter's
 * verification-code banner is the fourth. None of the four agree on
 * what happens when the clipboard says no, and three of them cannot
 * tell.
 *
 * **The confirmation is the button, not a toast.** The press and the
 * proof are the same object, so the eye does not travel; a toast is
 * right for something that happened *elsewhere*. A consumer that
 * wants both still gets `onCopy`.
 *
 * **The label is a word.** `Copy` → `Copied`, and the intent goes
 * with it, because a colour change alone is not a message and a tick
 * glyph is an icon this library does not ship.
 *
 * **It announces.** A screen reader is not reliably told that a
 * focused button's own name changed, so the outcome is also written
 * into a `role="status"` region — and the failure says what to do
 * next rather than only that it went wrong.
 *
 * **The timer is cancelled on unmount and on a re-press**, which is
 * the bug in two of the four hand-rolled copies: press, navigate
 * away, and a `setState` lands on nothing.
 */
export const CopyButton = ({
  appearance = "solid",
  children = "Copy",
  confirmDuration = 2000,
  copiedLabel = "Copied",
  copy = defaultCopyText,
  failedLabel = "Copy failed",
  intent = "accent",
  onClick,
  onCopy,
  value,
  ...buttonProps
}: CopyButtonProps): ReactNode => {
  const [status, setStatus] = useState<CopyStatus>("idle")
  const timerRef =
    useRef<ReturnType<typeof setTimeout>>(undefined)

  // One cleanup covers both the unmount and the re-press: every path
  // that starts a timer clears the previous one first.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
    },
    [],
  )

  const settle = (next: CopyStatus) => {
    setStatus(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setStatus("idle")
    }, confirmDuration)
  }

  const handleClick: NonNullable<ButtonProps["onClick"]> = (
    event,
  ) => {
    onClick?.(event)
    if (event.defaultPrevented) return

    void (async () => {
      const isCopied = await copy(value)
      settle(isCopied ? "copied" : "failed")
      onCopy?.(isCopied, value)
    })()
  }

  const label =
    status === "copied"
      ? copiedLabel
      : status === "failed"
        ? failedLabel
        : children

  return (
    <>
      <Button
        {...buttonProps}
        appearance={appearance}
        intent={
          status === "copied"
            ? "success"
            : status === "failed"
              ? "danger"
              : intent
        }
        onClick={handleClick}
      >
        {label}
      </Button>
      <VisuallyHidden role="status">
        {status === "copied"
          ? "Copied to the clipboard."
          : status === "failed"
            ? "The clipboard refused. Select the value and press Control C."
            : ""}
      </VisuallyHidden>
    </>
  )
}
