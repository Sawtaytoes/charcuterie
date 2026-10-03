import type { CSSProperties, ReactNode } from "react"
import { useRef, useState } from "react"
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
  const contentStyle = {
    "--table-min-inline-size": `${Math.max(1, columnCount) * 14}rem`,
  } as CSSProperties
  const content = (
    <div
      className="charcuterie-table-content"
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
        onClose={() => {
          setIsExpanded(false)
          requestAnimationFrame(() => {
            if (scrollRef.current)
              scrollRef.current.scrollLeft =
                scrollPosition.current
          })
        }}
      >
        {isExpanded ? content : null}
      </Dialog>
    </div>
  )
}
