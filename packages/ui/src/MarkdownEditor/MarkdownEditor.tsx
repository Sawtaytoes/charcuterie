import { useUniqueId } from "@charcuterie/logic"
import type {
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
  ReactNode,
} from "react"
import { Fragment, useRef, useState } from "react"

import type { SlotProps } from "../slotProps.ts"
import { mergeSlotProps } from "../slotProps.ts"
import { Toolbar } from "../Toolbar/Toolbar.tsx"
import { toClassName } from "../toClassName.ts"
import type { MarkdownSelection } from "./markdownCommands.ts"
import {
  continueList,
  getMinimalEdit,
  indentLines,
  insertLink,
  insertText,
  isLinkPaste,
  MARKDOWN_LINE_PREFIXES,
  outdentLines,
  toggleHeading,
  toggleInlineMarker,
  toggleLinePrefix,
  toMarkdownImage,
  wrapSelectionInLink,
} from "./markdownCommands.ts"
import type { MarkdownSpanKind } from "./markdownSpans.ts"
import {
  toLineIndex,
  toMarkdownLines,
} from "./markdownSpans.ts"

export type MarkdownImageUpload = {
  /** Alt text. Defaults to the file's name when omitted. */
  alt?: string
  /** Where the image now lives. Inserted verbatim. */
  url: string
}

/**
 * The toolbar's glyphs, by action.
 *
 * **No default, and none shipped** — this package ships no icons,
 * and a `⋯`/`▨` default renders as nothing where the font lacks it
 * ([decision](../../../../docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)).
 * With no icons the toolbar is nine word buttons, which works
 * everywhere and collapses into the overflow menu early; an app
 * that brings lucide gets a compact bar and keeps the words as the
 * accessible names.
 *
 * `overflow` is the odd one out: it is not a markdown command, it
 * is the **bar's own** trigger. It lives here because an app that
 * passes the nine and not the tenth gets nine icons followed by
 * the words *"More actions"* — which is the one width where an
 * icon bar looks unfinished, and there was no prop to fix it with.
 */
export type MarkdownEditorIcons = Partial<
  Record<
    | "bold"
    | "bulletedList"
    | "code"
    | "heading"
    | "image"
    | "italic"
    | "link"
    | "numberedList"
    | "overflow"
    | "quote"
    | "taskList",
    ReactNode
  >
>

export type MarkdownEditorProps = SlotProps & {
  className?: string
  /**
   * **Initial** only. This control is uncontrolled, and the long
   * reason is in the doc comment below — it is the whole design.
   */
  defaultValue?: string
  /** See `MarkdownEditorIcons`. */
  icons?: MarkdownEditorIcons
  isDisabled?: boolean
  isReadOnly?: boolean
  /**
   * The accessible name, as `aria-label`. Omit it inside a `Field`,
   * which supplies a real `<label htmlFor>` — same contract as
   * `Select`.
   */
  label?: string
  onChange?: (value: string) => void
  /**
   * A failed upload, after the placeholder has been taken back out
   * of the text. Pair it with a `Toast`; this component does not
   * own one.
   */
  onUploadError?: (file: File, error: unknown) => void
  /**
   * Paste or drop an image and this runs. **The component does not
   * own storage** — it hands you a `File`, you put it somewhere,
   * and the URL you return is inserted at the caret as
   * `![alt](url)`. Docket keeps its own blob storage precisely so
   * the URL stays stable and theirs.
   *
   * Omit it and image paste is simply not offered: a `<textarea>`
   * ignores a pasted image on its own, which is the correct
   * fallback rather than a broken one.
   */
  onUploadImage?: (
    file: File,
  ) => Promise<MarkdownImageUpload>
  placeholder?: string
  /** The editing surface's accessible name in the toolbar's label. */
  toolbarLabel?: string
}

/**
 * The paint for each span kind.
 *
 * **Written out, never interpolated** — `` `text-${kind}` ``
 * generates nothing at all and fails silently, which is the rule
 * `intentStyles.ts` is 48 literals for.
 *
 * ### Every one of these is metric-neutral, and that is the design
 *
 * The editing surface is a real `<textarea>` with this painted
 * layer behind it in the same grid cell. The textarea owns the
 * caret; the layer owns the colour. The two only stay registered
 * while they **lay out identically**, so anything that changes a
 * glyph's advance width — `font-bold`, `text-lg`, a different
 * family, `tracking-wide` — shears the caret away from the letters
 * it is supposed to be sitting between. Not subtly: by a character
 * or two per emphasis run, cumulative across the line.
 *
 * So bold is faux bold. `text-shadow` at ±0.02em paints the glyph
 * twice, a hair apart, which thickens it and moves nothing.
 * Italic is real, because the surface is monospaced and a
 * monospaced italic keeps the advance width by definition. Headings
 * get weight and colour rather than size, for the same reason.
 *
 * This is the honest limit of the textarea-plus-layer approach and
 * it is written down here rather than discovered later:
 * **markers are dimmed, not hidden.** Concealing `**` would change
 * the line's width and there is no way to do it in this medium.
 * The staging decision record has the rest.
 */
const SPAN_KIND_CLASS: Record<MarkdownSpanKind, string> = {
  code: "text-intent-info-content",
  emphasis: "italic text-content-primary",
  heading:
    "text-content-primary [text-shadow:0.02em_0_0_currentColor,-0.02em_0_0_currentColor]",
  link: "text-intent-accent-content underline",
  marker: "",
  plain: "text-content-primary",
  strikethrough: "text-content-secondary line-through",
  strong:
    "text-content-primary [text-shadow:0.02em_0_0_currentColor,-0.02em_0_0_currentColor]",
  url: "text-content-secondary underline",
}

/**
 * The one thing that changes with the caret.
 *
 * Obsidian's live preview reveals a line's raw syntax when the
 * cursor enters it. Here the markers are always present — they have
 * to be, see above — so "reveal" becomes a contrast change: muted
 * everywhere, accent on the line you are editing. Both are real
 * token roles that clear AA on their own, which an `opacity`
 * treatment would not.
 */
const ACTIVE_MARKER_CLASS = "text-intent-accent-content"

const RESTING_MARKER_CLASS = "text-content-muted"

const isImageFile = (file: File) =>
  file.type.startsWith("image/")

/**
 * A live hybrid markdown editor whose stored value is markdown and
 * only ever markdown.
 *
 * Docket asked for this one and the requirement is unusually sharp,
 * because the tracker it replaces destroyed data by storing HTML in
 * a field it later tried to read back as text. So the constraint
 * here is not "prefer markdown" — it is that **an HTML tag must not
 * be able to reach the stored string**, and the design is chosen to
 * make that mechanical rather than policed:
 *
 *  - the editing surface is a `<textarea>`, which takes
 *    `text/plain` off the clipboard and nothing else. Copy a
 *    styled paragraph out of a browser and the `text/html` flavour
 *    is simply not read;
 *  - every command in `markdownCommands.ts` returns markdown, and
 *    there is no serialiser anywhere in the component;
 *  - the painted layer emits `{ kind, text }` spans that React
 *    renders as **text nodes**. No `innerHTML`, no sanitiser, and
 *    nothing to get wrong — a `<script>` in the source is four
 *    coloured characters on screen.
 *
 * `MarkdownEditor.test.tsx` round-trips a value full of the
 * characters that tempt escaping and asserts no tag ever appears.
 *
 * ## Why a `<textarea>` and not an editor core
 *
 * Charcuterie is published, so a dependency here is a permanent
 * cost to every consumer of the package — measured, for a markdown
 * setup: CodeMirror 6 at 176 KB gzipped, Lexical at 148 KB, TipTap
 * at 238 KB. This component adds **nothing**. The full argument,
 * with the numbers and with what the choice gives up, is
 * `docs/decisions/2026-08-19-the-markdown-editor-is-a-textarea-with-a-painted-layer.md`.
 *
 * The accessibility half of that argument is worth repeating here,
 * because it is the half that is hard to buy back later. A
 * `<textarea>` arrives with caret movement, word-wise selection,
 * `Home`/`End`, IME composition, spellcheck, autocorrect, the
 * platform's own undo stack, `role="textbox"` and
 * `aria-multiline="true"` — all of it, in every browser, tested by
 * the vendors. A `contenteditable` starts with none of those and
 * re-earns each one, and the ones it never fully re-earns are IME
 * and undo. This library's central claim is that an agent and a
 * keyboard can drive every component; starting from the platform's
 * own text control is the cheapest way to keep it.
 *
 * ## It is uncontrolled, and that is not a shortcut
 *
 * `defaultValue` in, `onChange` out — the same contract as `Select`
 * ([decision](../../../../docs/decisions/2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md)),
 * and here it protects something specific. A controlled React
 * `<textarea>` round-trips every keystroke through render, and any
 * programmatic `value` assignment **wipes the browser's undo
 * stack**: Ctrl+Z after a toolbar click then skips the paragraph
 * you typed before it, or does nothing at all.
 *
 * So the textarea is never handed a `value`. Its text is mirrored
 * into state for *painting* only, and every programmatic edit — a
 * toolbar action, a shortcut, an image insertion — is applied as a
 * range replacement through `document.execCommand("insertText")`,
 * which is deprecated, is the only API that appends to the native
 * undo stack, and is exactly why `getMinimalEdit` exists.
 *
 * A consumer that must swap the whole document — Docket opening a
 * different task — remounts with a `key`. That is one line, and it
 * is honest about the fact that the old undo history belonged to
 * the old document.
 *
 * ## Composition, and the one component that did not fit
 *
 * The toolbar is this package's `Toolbar`, so the row collapses
 * into a menu **by measurement** rather than at a breakpoint —
 * which is what the Narrow View actually needs, since a lane in a
 * three-up board is narrow on a 4K display. `Field` wraps it
 * through `SlotProps`, so a label, a description and an error wire
 * themselves to the textarea.
 *
 * `FileDropZone` does **not** wrap it, and that is the interesting
 * one. That component is a `<label>` around a file input covering
 * its whole area — correct for "drop a disc image here", and wrong
 * for a text surface, where the drop has to land *at a character
 * offset* and the area has to keep taking clicks as caret
 * placement. So the editor handles its own drop, and `FileDropZone`
 * stays the right answer for the attachment list beside it.
 */
export const MarkdownEditor = ({
  className,
  defaultValue = "",
  icons,
  isDisabled = false,
  isReadOnly = false,
  label,
  onChange,
  onUploadError,
  onUploadImage,
  placeholder,
  toolbarLabel = "Markdown formatting",
  ...receivedSlotProps
}: MarkdownEditorProps): ReactNode => {
  const baseId = useUniqueId()

  const hintId = `${baseId}-hint`

  const statusId = `${baseId}-status`

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const layerRef = useRef<HTMLDivElement>(null)

  /** The toolbar's Image button presses this. It is a real
   * `<input type="file">` because nothing else opens a file
   * picker, and it is the only way in on a touch device — there
   * is nothing to paste from and nothing to drag. */
  const imageInputRef = useRef<HTMLInputElement>(null)

  const uploadCount = useRef(0)

  const [value, setValue] = useState(defaultValue)

  const [caretOffset, setCaretOffset] = useState(0)

  const [isFocused, setIsFocused] = useState(false)

  const [uploadMessage, setUploadMessage] = useState("")

  const readSelection = (): MarkdownSelection => {
    const element = textareaRef.current

    return {
      selectionEnd: element?.selectionEnd ?? 0,
      selectionStart: element?.selectionStart ?? 0,
      text: element?.value ?? "",
    }
  }

  const syncFromElement = () => {
    const element = textareaRef.current

    if (!element) {
      return
    }

    setCaretOffset(element.selectionStart)

    if (element.value === value) {
      return
    }

    setValue(element.value)

    onChange?.(element.value)
  }

  /**
   * Apply a command's result to the live control **without**
   * assigning `value`.
   *
   * `execCommand` is deprecated and is the only route that adds to
   * the browser's own undo stack, so it is tried first and the
   * modern `setRangeText` is the fallback for whatever eventually
   * removes it. Losing undo is a degradation; losing the edit would
   * not be.
   */
  const applyEdit = (next: MarkdownSelection) => {
    const element = textareaRef.current

    if (!element) {
      return
    }

    const edit = getMinimalEdit(element.value, next.text)

    element.focus()

    element.setSelectionRange(edit.start, edit.end)

    const isApplied = (() => {
      try {
        return edit.text === ""
          ? document.execCommand("delete")
          : document.execCommand(
              "insertText",
              false,
              edit.text,
            )
      } catch {
        return false
      }
    })()

    if (!isApplied) {
      element.setRangeText(
        edit.text,
        edit.start,
        edit.end,
        "end",
      )
    }

    element.setSelectionRange(
      next.selectionStart,
      next.selectionEnd,
    )

    syncFromElement()
  }

  const runCommand = (
    command: (
      state: MarkdownSelection,
    ) => MarkdownSelection,
  ) => {
    if (isDisabled || isReadOnly) {
      return
    }

    applyEdit(command(readSelection()))
  }

  /**
   * Upload one file, with a **markdown** placeholder holding the
   * caret's place while the request is in flight.
   *
   * The placeholder is real text in the document rather than an
   * overlay, because the user keeps typing during an upload and the
   * insertion point has to move with what they type. It carries a
   * counter so two files of the same name do not resolve into each
   * other's slot, and it is markdown like everything else — a
   * failed upload leaves the document in a state the user can read
   * and fix, not a dangling widget.
   */
  const uploadImage = async (file: File) => {
    if (!onUploadImage) {
      return
    }

    uploadCount.current += 1

    const placeholder = `![Uploading ${file.name}](#uploading-${uploadCount.current})`

    applyEdit(insertText(readSelection(), placeholder))

    setUploadMessage(`Uploading ${file.name}`)

    const replacePlaceholder = (insertion: string) => {
      const element = textareaRef.current

      if (!element) {
        return
      }

      const start = element.value.indexOf(placeholder)

      if (start === -1) {
        return
      }

      const end = start + placeholder.length

      applyEdit({
        selectionEnd: start + insertion.length,
        selectionStart: start + insertion.length,
        text:
          element.value.slice(0, start) +
          insertion +
          element.value.slice(end),
      })
    }

    try {
      const uploaded = await onUploadImage(file)

      replacePlaceholder(
        toMarkdownImage({
          alt: uploaded.alt ?? file.name,
          url: uploaded.url,
        }),
      )

      setUploadMessage(`Inserted ${file.name}`)
    } catch (error) {
      replacePlaceholder("")

      setUploadMessage(`Could not upload ${file.name}`)

      onUploadError?.(file, error)
    }
  }

  const uploadImages = (files: readonly File[]) => {
    for (const file of files.filter(isImageFile)) {
      void uploadImage(file)
    }
  }

  const handlePaste = (
    pasteEvent: ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const files = Array.from(
      pasteEvent.clipboardData.files,
    ).filter(isImageFile)

    if (files.length > 0 && onUploadImage) {
      pasteEvent.preventDefault()

      uploadImages(files)

      return
    }

    const pasted =
      pasteEvent.clipboardData.getData("text/plain")

    const selection = readSelection()

    // A URL pasted over selected text becomes a link, the way it
    // does in every editor anyone uses. Reading `text/plain` here
    // is not a hole in the no-HTML guarantee — that flavour is the
    // only one a `<textarea>` would have taken anyway, and what
    // goes back in is markdown built by a command.
    if (
      isLinkPaste(pasted) &&
      selection.selectionStart !== selection.selectionEnd
    ) {
      pasteEvent.preventDefault()

      applyEdit(
        wrapSelectionInLink(selection, pasted.trim()),
      )

      return
    }

    // Everything else is left to the browser on purpose. A
    // `<textarea>` pastes `text/plain` and nothing else, so the
    // no-HTML guarantee needs no code here — intercepting the paste
    // to "sanitise" it would be the version that can have a bug.
  }

  const handleDrop = (
    dropEvent: DragEvent<HTMLTextAreaElement>,
  ) => {
    const files = Array.from(
      dropEvent.dataTransfer.files,
    ).filter(isImageFile)

    if (files.length === 0 || !onUploadImage) {
      return
    }

    dropEvent.preventDefault()

    uploadImages(files)
  }

  /**
   * `Tab` is never captured, at any time.
   *
   * Indenting a list with Tab is the convention in editors that own
   * the whole page, and inside a form it is a keyboard trap: WCAG
   * 2.1.2 wants focus to be able to leave every component with the
   * standard gesture, and a multi-line field on a task form is
   * exactly where somebody tabs onward. Indent and outdent are
   * `Ctrl+]` and `Ctrl+[` instead, which is what browsers'
   * own editors bind them to.
   */
  const handleKeyDown = (
    keyEvent: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (isReadOnly || isDisabled) {
      return
    }

    if (
      keyEvent.key === "Enter" &&
      !keyEvent.shiftKey &&
      !keyEvent.altKey &&
      !keyEvent.ctrlKey &&
      !keyEvent.metaKey
    ) {
      const continued = continueList(readSelection())

      if (continued) {
        keyEvent.preventDefault()

        applyEdit(continued)
      }

      return
    }

    const isModified = keyEvent.ctrlKey || keyEvent.metaKey

    if (!isModified) {
      return
    }

    const command = (() => {
      switch (keyEvent.key.toLowerCase()) {
        case "[": {
          return outdentLines
        }

        case "]": {
          return indentLines
        }

        case "b": {
          return (state: MarkdownSelection) =>
            toggleInlineMarker(state, "**")
        }

        case "e": {
          return (state: MarkdownSelection) =>
            toggleInlineMarker(state, "`")
        }

        case "i": {
          return (state: MarkdownSelection) =>
            toggleInlineMarker(state, "_")
        }

        case "k": {
          return (state: MarkdownSelection) =>
            insertLink(state)
        }

        default: {
          return null
        }
      }
    })()

    if (!command) {
      return
    }

    keyEvent.preventDefault()

    runCommand(command)
  }

  const lines = toMarkdownLines(value)

  const activeLineIndex = toLineIndex(value, caretOffset)

  const surfaceClassName =
    "col-start-1 row-start-1 m-0 min-h-32 whitespace-pre-wrap break-words border-0 p-3 font-mono text-md leading-relaxed cq-md:min-h-48"

  return (
    <div
      className={toClassName(
        // `@container` here and not on a wrapper: a container query
        // matches the container's *descendants*, never the
        // container itself, so nothing in this string may be a
        // `cq-*:` variant.
        "@container flex flex-col gap-2 rounded-md border border-border-default bg-surface-base text-content-primary focus-within:outline-solid focus-within:outline-(length:--focus-ring-width) focus-within:outline-offset-(--focus-ring-offset) focus-within:outline-focus-ring",
        // A token pair, never `opacity-*`. Fading the whole box
        // fades the hint under it too, and axe measures the
        // *composited* colour: `content-secondary` at 60% came out
        // at 3.77:1 and failed AA on a `<p>` that is not itself
        // disabled and owes no exemption.
        isDisabled &&
          "border-border-subtle bg-surface-sunken",
        className,
      )}
    >
      <div className="border-border-subtle border-b px-2 pt-2 pb-1">
        <Toolbar
          items={[
            {
              icon: icons?.bold,
              isDisabled: isDisabled || isReadOnly,
              key: "bold",
              label: "Bold",
              onSelect: () => {
                runCommand((state) =>
                  toggleInlineMarker(state, "**"),
                )
              },
            },
            {
              icon: icons?.italic,
              isDisabled: isDisabled || isReadOnly,
              key: "italic",
              label: "Italic",
              onSelect: () => {
                runCommand((state) =>
                  toggleInlineMarker(state, "_"),
                )
              },
            },
            {
              icon: icons?.heading,
              isDisabled: isDisabled || isReadOnly,
              key: "heading",
              label: "Heading",
              onSelect: () => {
                runCommand((state) =>
                  toggleHeading(state, 2),
                )
              },
            },
            /*
              IMAGE, and only when the consumer can actually take
              one. A button that opens a file picker and then has
              nowhere to send the file is worse than no button.

              Spread rather than a `filter(Boolean)` so the array
              stays a `ToolbarItem[]` without a cast.

              ⚠️ FOURTH, and the position is load-bearing rather
              than aesthetic. `Toolbar` overflows from the END of
              this list, so the order IS the priority order. Put
              last, beside Link where it reads most naturally, and
              Image was the first thing to collapse into "More
              actions" — at 900px it was already hidden, and in a
              comment box in a rail it never appeared at all. That
              is the complaint this button exists to answer:
              *"adding an image is way at the bottom"*. Hiding it
              behind an overflow trigger moves the problem rather
              than fixing it.

              Fourth is visible wherever four actions fit — at
              900px the bar carries eight. It still collapses on a
              genuinely narrow editor (at 460px the bar carries
              three), which is why a comment box in a rail keeps a
              `FileDropZone` beside it. It also reads: emphasis,
              then structure, then insert.

              The caret is why this belongs in the toolbar at all
              rather than beside the editor. A `FileDropZone` under
              the box appends to the end of the document, because
              pressing it moves focus out; the textarea keeps its
              `selectionStart` while blurred, so the insertion
              lands where the user last was — which is the whole
              point of an image in prose.
            */
            ...(onUploadImage
              ? [
                  {
                    icon: icons?.image,
                    isDisabled: isDisabled || isReadOnly,
                    key: "image",
                    label: "Image",
                    onSelect: () => {
                      imageInputRef.current?.click()
                    },
                  },
                ]
              : []),
            {
              icon: icons?.bulletedList,
              isDisabled: isDisabled || isReadOnly,
              key: "bulleted-list",
              label: "Bulleted list",
              onSelect: () => {
                runCommand((state) =>
                  toggleLinePrefix(
                    state,
                    MARKDOWN_LINE_PREFIXES.bulletList,
                  ),
                )
              },
            },
            {
              icon: icons?.taskList,
              isDisabled: isDisabled || isReadOnly,
              key: "task-list",
              label: "Task list",
              onSelect: () => {
                runCommand((state) =>
                  toggleLinePrefix(
                    state,
                    MARKDOWN_LINE_PREFIXES.taskList,
                  ),
                )
              },
            },
            {
              icon: icons?.numberedList,
              isDisabled: isDisabled || isReadOnly,
              key: "numbered-list",
              label: "Numbered list",
              onSelect: () => {
                runCommand((state) =>
                  toggleLinePrefix(
                    state,
                    MARKDOWN_LINE_PREFIXES.orderedList,
                  ),
                )
              },
            },
            {
              icon: icons?.quote,
              isDisabled: isDisabled || isReadOnly,
              key: "quote",
              label: "Quote",
              onSelect: () => {
                runCommand((state) =>
                  toggleLinePrefix(
                    state,
                    MARKDOWN_LINE_PREFIXES.blockquote,
                  ),
                )
              },
            },
            {
              icon: icons?.code,
              isDisabled: isDisabled || isReadOnly,
              key: "code",
              label: "Code",
              onSelect: () => {
                runCommand((state) =>
                  toggleInlineMarker(state, "`"),
                )
              },
            },
            {
              icon: icons?.link,
              isDisabled: isDisabled || isReadOnly,
              key: "link",
              label: "Link",
              onSelect: () => {
                runCommand((state) => insertLink(state))
              },
            },
          ]}
          label={toolbarLabel}
          overflow="menu"
          overflowIcon={icons?.overflow}
        />

        {/*
          The Image button's actual control.

          `hidden`, not `sr-only`: `display: none` takes it out of
          the accessibility tree, which is what is wanted here —
          the toolbar button is the named control, and a second
          unlabelled file input announced beside it would be one
          control too many. `.click()` on a hidden input opens the
          picker in every browser the fleet runs.

          `multiple`, because a drop already takes several and the
          two ways in should not disagree. The value is cleared
          after each pick so choosing the SAME file twice fires
          `change` the second time.
        */}
        {onUploadImage ? (
          <input
            accept="image/*"
            aria-hidden="true"
            className="hidden"
            multiple
            onChange={(changeEvent) => {
              uploadImages(
                Array.from(changeEvent.target.files ?? []),
              )

              changeEvent.target.value = ""
            }}
            ref={imageInputRef}
            tabIndex={-1}
            type="file"
          />
        ) : null}
      </div>

      <div className="grid">
        {/*
          Behind the textarea, in the same grid cell, and
          `aria-hidden` because every character in it is already in
          the textarea's own value — a screen reader that read both
          would hear the document twice.
        */}
        <div
          aria-hidden="true"
          className={toClassName(
            surfaceClassName,
            "pointer-events-none overflow-hidden",
          )}
          ref={layerRef}
        >
          {lines.map((line, lineIndex) => (
            <Fragment
              // The index *is* the identity here: line 3 is line 3,
              // and its content is what changes.
              // biome-ignore lint/suspicious/noArrayIndexKey: a line's position is its identity
              key={lineIndex}
            >
              {lineIndex === 0 ? null : "\n"}

              {line.spans.map((span, spanIndex) => (
                <span
                  className={
                    span.kind === "marker"
                      ? isFocused &&
                        lineIndex === activeLineIndex
                        ? ACTIVE_MARKER_CLASS
                        : RESTING_MARKER_CLASS
                      : SPAN_KIND_CLASS[span.kind]
                  }
                  // biome-ignore lint/suspicious/noArrayIndexKey: a span's position is its identity
                  key={spanIndex}
                >
                  {span.text}
                </span>
              ))}
            </Fragment>
          ))}
        </div>

        <textarea
          {...mergeSlotProps(receivedSlotProps, {
            "aria-describedby": hintId,
          })}
          aria-label={label}
          className={toClassName(
            surfaceClassName,
            // The text is transparent and the layer behind supplies
            // every glyph. The caret is not: `caret-color` is its
            // own property precisely so a transparent-text overlay
            // like this one can keep a visible cursor.
            "resize-y bg-transparent text-transparent caret-content-primary outline-none placeholder:text-content-muted",
          )}
          defaultValue={defaultValue}
          disabled={isDisabled}
          onBlur={() => {
            setIsFocused(false)
          }}
          onClick={syncFromElement}
          onDragOver={(dragEvent) => {
            if (onUploadImage) {
              // The default action for `dragover` is to reject the
              // drop, so without this `onDrop` never fires at all —
              // the same footgun `FileDropZone` documents.
              dragEvent.preventDefault()
            }
          }}
          onDrop={handleDrop}
          onFocus={() => {
            setIsFocused(true)

            syncFromElement()
          }}
          onInput={syncFromElement}
          onKeyDown={handleKeyDown}
          onKeyUp={syncFromElement}
          onPaste={handlePaste}
          onScroll={() => {
            const element = textareaRef.current

            if (element && layerRef.current) {
              layerRef.current.scrollTop = element.scrollTop

              layerRef.current.scrollLeft =
                element.scrollLeft
            }
          }}
          onSelect={syncFromElement}
          placeholder={placeholder}
          readOnly={isReadOnly}
          ref={textareaRef}
          spellCheck
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 pb-2">
        {/*
          `sr-only` rather than `hidden`, and the difference is the
          whole point: `display: none` removes an element from the
          accessibility tree, so an `aria-describedby` pointing at a
          hidden hint silently describes nothing. The clip-rect
          technique keeps it in the tree at every width and
          `cq-sm:not-sr-only` paints it once the container has room
          — one element, always described, sometimes visible.
        */}
        <p
          className="sr-only text-content-secondary text-sm cq-sm:not-sr-only"
          id={hintId}
        >
          Markdown. Ctrl+B bold, Ctrl+I italic, Ctrl+K link,
          Ctrl+E code.
        </p>

        {/*
          A live region names itself with `aria-label` as well as
          its text — `role="status"` takes no accessible name from
          its contents, so a region that announces correctly is
          still unfindable without one. It is deliberately **not**
          in `aria-describedby`: a description is standing help, and
          this changes.
        */}
        <span
          aria-label="Image upload"
          className="text-content-secondary text-sm"
          id={statusId}
          role="status"
        >
          {uploadMessage}
        </span>
      </div>
    </div>
  )
}
