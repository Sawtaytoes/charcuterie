import { useUniqueId } from "@charcuterie/logic"
import type { DragEvent, ReactNode } from "react"
import { useRef, useState } from "react"

import { toClassName } from "../toClassName.ts"

export type FileDropZoneProps = {
  /** An `accept` list, passed straight to the input. */
  accept?: string
  className?: string
  /** Secondary line — the formats taken, a size cap. */
  description?: ReactNode
  isDisabled?: boolean
  isMultiple?: boolean
  /** The control's accessible name, and its visible prompt. */
  label: string
  onDropFiles: (files: File[]) => void
  /**
   * Dropped text, when there is any. A browser hands over a dragged
   * link as `text/plain` and no files at all, which is what
   * gallery-downloader's page is built entirely around — it takes
   * `dataTransfer.getData("text")` and never looks at `.files`.
   */
  onDropText?: (text: string) => void
}

/**
 * The one drag target in the fleet is gallery-downloader's, and it
 * gets the hard part right: `dragenter`/`dragleave` fire once per
 * *element* the pointer crosses, not once per zone, so a naive
 * implementation flickers over every child — and that page keeps a
 * `dragDepth` counter, which is the correct fix. It is reproduced
 * below with credit.
 *
 * What it has no answer for is the part that cannot be fixed by
 * counting:
 *
 * ### Dragging is pointer-only, so the zone is a label around an input
 *
 * There is **no keyboard gesture for drag-and-drop**. WCAG 2.5.7
 * (AA since 2.2) requires a single-pointer alternative for any
 * dragging movement, and the honest one has existed since 1995: a
 * real `<input type="file">`. So this component is a `<label>`
 * wrapping a visually-hidden input — the whole zone is the label's
 * click target, Tab reaches the input, Space and Enter open the
 * picker, and the drop handlers are an *enhancement* on top of a
 * control that already works without them.
 *
 * That ordering is the entire design. Building the drop zone first
 * and bolting on a "or browse" link is how the fleet's version ended
 * up with an `alert()` as its error channel and no keyboard path at
 * all.
 *
 * ### `dragover` must be prevented, and the reason is a footgun
 *
 * A browser's default for `dragover` is *reject the drop*. Not
 * preventing it means `drop` never fires — nothing errors, the
 * cursor shows a "no entry" sign, and the zone looks like it has a
 * broken handler when it in fact has no handler running at all.
 *
 * ### It reports text as well as files
 *
 * Dragging a link gives you `text/plain` and an empty `files` list.
 * A zone that only reads `.files` silently ignores the single most
 * common thing a user drags into a downloader, which is why
 * `onDropText` is here rather than being someone's follow-up.
 */
export const FileDropZone = ({
  accept,
  className,
  description,
  isDisabled = false,
  isMultiple = false,
  label,
  onDropFiles,
  onDropText,
}: FileDropZoneProps): ReactNode => {
  const baseId = useUniqueId()

  const inputId = `${baseId}-input`

  const labelId = `${baseId}-label`

  const descriptionId = `${baseId}-description`

  const [isDragActive, setIsDragActive] = useState(false)

  /**
   * The counter gallery-downloader's page already keeps, and the
   * reason it has to exist: `dragenter` fires again for every child
   * element the pointer crosses, and `dragleave` fires for the one
   * it left — so a plain boolean turns off halfway across the zone
   * and the highlight strobes.
   *
   * A ref rather than state: nothing renders from the depth itself,
   * only from whether it is above zero, and a re-render per crossed
   * child during a drag is exactly the jank this is avoiding.
   */
  const dragDepth = useRef(0)

  const endDrag = () => {
    dragDepth.current = 0

    setIsDragActive(false)
  }

  const handleDrop = (
    dropEvent: DragEvent<HTMLElement>,
  ) => {
    dropEvent.preventDefault()

    endDrag()

    if (isDisabled) {
      return
    }

    const files = Array.from(dropEvent.dataTransfer.files)

    if (files.length > 0) {
      onDropFiles(isMultiple ? files : files.slice(0, 1))

      return
    }

    const text = dropEvent.dataTransfer.getData("text")

    if (text !== "") {
      onDropText?.(text)
    }
  }

  return (
    <label
      className={toClassName(
        "flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-border-default border-dashed p-6 text-center transition-colors duration-(--duration-fast) ease-standard",
        isDragActive
          ? "border-intent-accent-border bg-intent-accent-surface"
          : "bg-surface-sunken hover:border-border-strong",
        isDisabled &&
          "cursor-not-allowed border-border-subtle text-content-disabled hover:border-border-subtle",
        // The ring is on the label, driven by the input inside it —
        // the input is what actually takes focus, and it is
        // visually hidden, so a ring on the input paints nothing.
        "focus-within:outline-solid focus-within:outline-(length:--focus-ring-width) focus-within:outline-offset-(--focus-ring-offset) focus-within:outline-focus-ring",
        className,
      )}
      htmlFor={inputId}
      onDragEnter={(dragEvent) => {
        dragEvent.preventDefault()

        dragDepth.current += 1

        if (dragDepth.current === 1) {
          setIsDragActive(true)
        }
      }}
      onDragLeave={(dragEvent) => {
        dragEvent.preventDefault()

        dragDepth.current -= 1

        if (dragDepth.current === 0) {
          setIsDragActive(false)
        }
      }}
      onDragOver={(dragEvent) => {
        // Not optional. The default action for `dragover` is to
        // reject the drop, so without this `onDrop` below never runs
        // and the zone looks broken rather than unhandled.
        dragEvent.preventDefault()
      }}
      onDrop={handleDrop}
    >
      <input
        accept={accept}
        // Named by the prompt **only**, and described by the rest.
        //
        // The whole zone is the `<label>` — that is what makes the
        // six-rem target clickable — so its text content is the
        // prompt *and* the description, and a `<label for>` names
        // its control with all of it. The input's accessible name
        // came out as "Drop a disc image hereISO or MKV, up to 50
        // GB.", which is not a name, and which `getByLabelText` and
        // an agent both fail to match.
        //
        // `aria-labelledby` overrides the implicit `<label>` naming
        // without giving up the click target.
        aria-describedby={
          description === undefined
            ? undefined
            : descriptionId
        }
        aria-labelledby={labelId}
        className="sr-only"
        disabled={isDisabled}
        id={inputId}
        multiple={isMultiple}
        onChange={(changeEvent) => {
          const files = Array.from(
            changeEvent.currentTarget.files ?? [],
          )

          if (files.length > 0) {
            onDropFiles(files)
          }

          // Cleared so choosing the *same* file twice fires again.
          // A file input keeps its value, so the second pick is not
          // a change and the handler never runs — which reads as
          // "it ignored me" and is the oldest bug in this control.
          changeEvent.currentTarget.value = ""
        }}
        type="file"
      />

      <span
        className="font-medium text-content-primary text-sm"
        id={labelId}
      >
        {label}
      </span>

      {description === undefined ? null : (
        <span
          className="text-content-secondary text-xs"
          id={descriptionId}
        >
          {description}
        </span>
      )}
    </label>
  )
}
