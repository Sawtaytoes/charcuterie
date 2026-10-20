import type { CSSProperties, ReactNode } from "react"
import { useCallback, useRef, useState } from "react"
import { Button } from "../Button/Button.tsx"
import { Dialog } from "../Dialog/Dialog.tsx"
import { toClassName } from "../toClassName.ts"

export type TableViewportProps = {
  /** A semantic table. Only one copy is mounted, including when expanded. */
  children: ReactNode
  className?: string
  columnCount: number
  label: string
}

/** Readable comparison columns, page-height inline, and one full-window scroll surface. */
export const TableViewport = ({
  children,
  className,
  columnCount,
  label,
}: TableViewportProps): ReactNode => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inlineHeight, setInlineHeight] = useState(0)
  const scrollRef = useRef<HTMLElement>(null)
  const scrollPosition = useRef(0)
  const expansion = useRef<Animation | null>(null)
  const isClosing = useRef(false)
  const animateExpansion = useCallback(
    (node: HTMLDivElement | null) => {
      const dialog = node?.closest<HTMLElement>(
        '[role="dialog"]',
      )
      if (
        !dialog ||
        matchMedia("(prefers-reduced-motion: reduce)")
          .matches
      )
        return

      const style = getComputedStyle(dialog)
      const duration = Number.parseFloat(
        style.getPropertyValue("--duration-slow"),
      )
      // Zero-duration profiles (including ePaper) remove motion entirely.
      if (!(duration > 0)) return

      const animation = dialog.animate(
        [
          {
            opacity: 0,
            transform: "translateY(0.75rem) scale(0.98)",
          },
          { opacity: 1, transform: "none" },
        ],
        {
          duration,
          easing:
            style
              .getPropertyValue("--easing-standard")
              .trim() || "ease-out",
          fill: "both",
        },
      )
      expansion.current = animation
      // Unmounting a document can cancel an unfinished enter or exit.
      void animation.finished.catch(() => {})
      return () => {
        animation.cancel()
        expansion.current = null
      }
    },
    [],
  )
  const close = () => {
    if (isClosing.current) return
    isClosing.current = true
    const finish = () => {
      setIsExpanded(false)
      isClosing.current = false
      requestAnimationFrame(() => {
        if (scrollRef.current)
          scrollRef.current.scrollLeft =
            scrollPosition.current
      })
    }
    const animation = expansion.current
    if (
      !animation ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish()
      return
    }
    // Reversing also handles Escape during the opening animation without a jump.
    animation.reverse()
    void animation.finished.then(finish, () => {})
  }
  const contentStyle = {
    "--table-min-inline-size": `${Math.max(1, columnCount) * 14}rem`,
  } as CSSProperties
  const content = (
    <div
      className="charcuterie-table-content"
      ref={isExpanded ? animateExpansion : undefined}
      style={contentStyle}
    >
      {children}
    </div>
  )

  return (
    <div className={toClassName("min-w-0", className)}>
      <div className="flex items-center justify-end border border-border-subtle bg-surface-raised p-2">
        <Button
          appearance="ghost"
          intent="neutral"
          size="sm"
          onClick={() => {
            const pane = scrollRef.current
            setInlineHeight(
              pane?.getBoundingClientRect().height ?? 0,
            )
            scrollPosition.current = pane?.scrollLeft ?? 0
            setIsExpanded(true)
          }}
        >
          Expand table
        </Button>
      </div>
      <section
        aria-label={label}
        className="charcuterie-scrollbar charcuterie-table-scroll border border-border-subtle border-t-0"
        ref={scrollRef}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: horizontal scroll must be reachable by keyboard
        tabIndex={0}
        style={
          isExpanded ? { height: inlineHeight } : undefined
        }
      >
        {isExpanded ? null : content}
      </section>
      <Dialog
        heading={label}
        isVisible={isExpanded}
        size="full"
        onClose={close}
      >
        {isExpanded ? content : null}
      </Dialog>
    </div>
  )
}
