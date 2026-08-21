import { useUniqueId } from "@charcuterie/logic"
import {
  defaultKeymap,
  history,
  historyKeymap,
} from "@codemirror/commands"
import {
  markdown,
  markdownLanguage,
} from "@codemirror/lang-markdown"
import { Compartment, EditorState } from "@codemirror/state"
import {
  EditorView,
  keymap,
  placeholder as placeholderExtension,
} from "@codemirror/view"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import type {
  MarkdownEditorIcons,
  MarkdownImageUpload,
} from "../MarkdownEditor/MarkdownEditor.tsx"
import type { MarkdownSelection } from "../MarkdownEditor/markdownCommands.ts"
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
} from "../MarkdownEditor/markdownCommands.ts"
import { Switch } from "../Switch/Switch.tsx"
import type { SlotProps } from "../slotProps.ts"
import { Toolbar } from "../Toolbar/Toolbar.tsx"
import { toClassName } from "../toClassName.ts"
import {
  livePreview,
  setLivePreviewRawMode,
} from "./livePreview.ts"

export type MarkdownEditorCodeMirrorProps = SlotProps & {
  className?: string
  /**
   * **Initial** only, and the same uncontrolled contract as the
   * sibling `MarkdownEditor` — for the same reason, one layer over:
   * reassigning the whole document from outside throws away the
   * undo history that belonged to it. Swap documents with a `key`.
   */
  defaultValue?: string
  /** Start in raw-markdown mode. **Initial** only. */
  isRawModeDefault?: boolean
  icons?: MarkdownEditorIcons
  isDisabled?: boolean
  isReadOnly?: boolean
  /**
   * The accessible name. Omit it inside a `Field`, which supplies a
   * real `<label htmlFor>`.
   */
  label?: string
  onChange?: (value: string) => void
  onUploadError?: (file: File, error: unknown) => void
  /**
   * Paste or drop an image and this runs; the URL you return is
   * inserted at the caret as `![alt](url)` — and, unlike the
   * textarea sibling, is then **rendered in place**.
   */
  onUploadImage?: (
    file: File,
  ) => Promise<MarkdownImageUpload>
  placeholder?: string
  /** Label for the raw-markdown toggle. */
  rawModeLabel?: string
  toolbarLabel?: string
}

const isImageFile = (file: File) =>
  file.type.startsWith("image/")

type UploadHandlers = {
  onUploadError?: (file: File, error: unknown) => void
  onUploadImage?: (
    file: File,
  ) => Promise<MarkdownImageUpload>
}

const readSelection = (
  view: EditorView,
): MarkdownSelection => {
  const { main } = view.state.selection

  return {
    selectionEnd: main.to,
    selectionStart: main.from,
    text: view.state.doc.toString(),
  }
}

/**
 * Apply a pure command's result as a **minimal** change.
 *
 * `getMinimalEdit` earns its keep differently here than in the
 * textarea sibling. There it was about not wiping the browser's own
 * undo stack; here CodeMirror's history would happily record a
 * document-sized replacement — and then Ctrl+Z undoes the whole
 * description instead of the bold toggle that caused it.
 *
 * Module scope, not a closure, because it is a pure function of its
 * two arguments. That is not a lint dodge: a helper defined inside
 * the component is a new identity every render, and this one gets
 * captured by extensions that are built exactly once.
 */
const applyEdit = (
  view: EditorView,
  next: MarkdownSelection,
) => {
  const current = view.state.doc.toString()

  const edit = getMinimalEdit(current, next.text)

  view.dispatch({
    changes: {
      from: edit.start,
      insert: edit.text,
      to: edit.end,
    },
    selection: {
      anchor: next.selectionStart,
      head: next.selectionEnd,
    },
  })

  view.focus()
}

/**
 * Upload one file, with a **markdown** placeholder holding the
 * caret's place while the request is in flight.
 *
 * The placeholder is real text in the document rather than an
 * overlay, because the user keeps typing during an upload and the
 * insertion point has to travel with what they type. It carries a
 * counter so two files of the same name do not resolve into each
 * other's slot, and it is markdown like everything else — a failed
 * upload leaves a document the user can read and fix, not a
 * dangling widget.
 */
const uploadImage = async ({
  count,
  file,
  handlers,
  setMessage,
  view,
}: {
  count: number
  file: File
  handlers: UploadHandlers
  setMessage: (message: string) => void
  view: EditorView
}) => {
  const { onUploadError, onUploadImage } = handlers

  if (!onUploadImage) {
    return
  }

  const marker = `![Uploading ${file.name}](#uploading-${count})`

  applyEdit(view, insertText(readSelection(view), marker))

  setMessage(`Uploading ${file.name}`)

  const replaceMarker = (insertion: string) => {
    const text = view.state.doc.toString()

    const start = text.indexOf(marker)

    if (start === -1) {
      return
    }

    const caret = start + insertion.length

    applyEdit(view, {
      selectionEnd: caret,
      selectionStart: caret,
      text:
        text.slice(0, start) +
        insertion +
        text.slice(start + marker.length),
    })
  }

  try {
    const uploaded = await onUploadImage(file)

    replaceMarker(
      toMarkdownImage({
        alt: uploaded.alt ?? file.name,
        url: uploaded.url,
      }),
    )

    setMessage(`Inserted ${file.name}`)
  } catch (error) {
    replaceMarker("")

    setMessage(`Could not upload ${file.name}`)

    onUploadError?.(file, error)
  }
}

/**
 * The live-preview markdown editor: Obsidian's model, on CodeMirror.
 *
 * This is the **opt-in** sibling of `MarkdownEditor`, and picking
 * between them is a real decision rather than a preference:
 *
 * | | `MarkdownEditor` | this |
 * | --- | --- | --- |
 * | Surface | `<textarea>` + painted layer | CodeMirror 6 |
 * | New dependency | **none** | ~176 KB gz of optional peer |
 * | Markers | dimmed, never hidden | **concealed** until the caret arrives |
 * | Headings | weight and colour only | **actually larger** |
 * | Images | shown as `![alt](url)` | **rendered in place** |
 * | Undo, IME | the platform's own | CodeMirror's |
 *
 * The default is still the textarea. A component library that makes
 * every consumer install an editor core to render a description
 * field has made the wrong trade, which is why this lives behind
 * `@charcuterie/ui/markdown-editor-codemirror` with every CodeMirror
 * package as an **optional** peer: a consumer that never imports
 * this subpath resolves, installs and audits none of it.
 *
 * ## What is the same, and it is the important part
 *
 * **Markdown is the stored value, byte for byte.** There is no
 * document model here and no serialiser. CodeMirror's state holds
 * the markdown *text*; live preview is a set of decorations
 * *over* that text; concealing `**` hides two characters that are
 * still in the document and still in `onChange`. Every command is
 * the same pure `markdownCommands.ts` the sibling uses, returning
 * markdown in and markdown out.
 *
 * That distinction is the whole reason this is not TipTap or
 * Lexical. Those invert it — their document model is authoritative
 * and markdown becomes a lossy *export* — and the tracker Docket
 * replaces died of exactly that: HTML in a field it later read back
 * as text. An editor core would have been easier to build and is
 * the one thing that could not be allowed.
 *
 * ## What genuinely costs something
 *
 * The `<textarea>` sibling gets caret movement, IME composition,
 * spellcheck, the platform undo stack and `role="textbox"` from the
 * browser, tested by the vendors. A `contenteditable` re-earns each
 * of those, and CodeMirror is the reason that is acceptable rather
 * than reckless: it is the most heavily exercised implementation of
 * that re-earning in the ecosystem. It is still a re-implementation,
 * and that is the honest cost of this subpath.
 *
 * ## Clicking a link opens it
 *
 * Obsidian's behaviour, not VS Code's: where the markup is hidden, a
 * link that looks like a link acts like one. The trade is that you
 * cannot click *into* link text to edit it — arrow in from the edge,
 * or flip the raw-markdown toggle, which is exactly what it is for.
 */
export const MarkdownEditorCodeMirror = ({
  className,
  defaultValue = "",
  icons,
  isDisabled = false,
  isRawModeDefault = false,
  isReadOnly = false,
  label,
  onChange,
  onUploadError,
  onUploadImage,
  placeholder,
  rawModeLabel = "Markdown source",
  toolbarLabel = "Markdown formatting",
  ...receivedSlotProps
}: MarkdownEditorCodeMirrorProps): ReactNode => {
  const baseId = useUniqueId()

  const hintId = `${baseId}-hint`

  const hostRef = useRef<HTMLDivElement>(null)

  const viewRef = useRef<EditorView | null>(null)

  const uploadCount = useRef(0)

  const editabilityRef = useRef(new Compartment())

  const [isRawMode, setIsRawMode] = useState(
    isRawModeDefault,
  )

  const [uploadMessage, setUploadMessage] = useState("")

  /**
   * Callbacks reach the editor through a ref, never a closure.
   *
   * The `EditorView` is built once and lives for the component's
   * whole life — rebuilding it on every render would discard the
   * undo history and the caret. So its extensions capture *this*
   * object, and the render loop keeps the object current.
   */
  const handlersRef = useRef({
    onChange,
    onUploadError,
    onUploadImage,
  })

  handlersRef.current = {
    onChange,
    onUploadError,
    onUploadImage,
  }

  /**
   * The uncontrolled contract, made explicit.
   *
   * These are the props that are **initial only**, frozen at mount
   * in a ref rather than read from the render closure. Writing it
   * this way says the quiet part out loud — changing `placeholder`
   * later genuinely does nothing — and it keeps the build-once
   * effect honestly dependency-free instead of suppressing a lint
   * rule that is, in every other component here, correct.
   */
  const mountRef = useRef({
    ariaDescribedBy: receivedSlotProps["aria-describedby"],
    defaultValue,
    hintId,
    id: receivedSlotProps.id,
    isRawModeDefault,
    label,
    placeholder,
  })

  const runCommand = (
    command: (
      state: MarkdownSelection,
    ) => MarkdownSelection,
  ) => {
    const view = viewRef.current

    if (!view || isDisabled || isReadOnly) {
      return
    }

    applyEdit(view, command(readSelection(view)))
  }

  /**
   * Built exactly once, and the empty dependency array is the whole
   * point rather than an oversight.
   *
   * An `EditorView` owns the caret, the selection, the scroll
   * position and the undo history. Rebuilding it throws all four
   * away — so a dependency list here would mean that typing a
   * description, then having a parent re-render with a new
   * `placeholder` string, silently drops the user's undo stack
   * mid-sentence. The values read inside are the *initial* half of
   * the uncontrolled contract; everything that can legitimately
   * change afterwards reaches the view through a compartment
   * (editability) or through `handlersRef` (the callbacks).
   *
   * Swapping the document itself — Docket opening a different task —
   * is a `key`, which is honest about the old history belonging to
   * the old document.
   */
  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: mountRef.current.defaultValue,
        extensions: [
          history(),
          // `Tab` is deliberately absent, at every level: indenting
          // with it is the convention in editors that own the whole
          // page, and inside a form it is a keyboard trap (WCAG
          // 2.1.2). `indentWithTab` is the extension that would add
          // it, and it is not here. Indent is Ctrl+] / Ctrl+[.
          keymap.of([
            {
              key: "Enter",
              run: (target) => {
                const continued = continueList(
                  readSelection(target),
                )

                if (!continued) {
                  return false
                }

                applyEdit(target, continued)

                return true
              },
            },
            {
              key: "Mod-b",
              run: (target) => {
                applyEdit(
                  target,
                  toggleInlineMarker(
                    readSelection(target),
                    "**",
                  ),
                )

                return true
              },
            },
            {
              key: "Mod-i",
              run: (target) => {
                applyEdit(
                  target,
                  toggleInlineMarker(
                    readSelection(target),
                    "_",
                  ),
                )

                return true
              },
            },
            {
              key: "Mod-e",
              run: (target) => {
                applyEdit(
                  target,
                  toggleInlineMarker(
                    readSelection(target),
                    "`",
                  ),
                )

                return true
              },
            },
            {
              key: "Mod-k",
              run: (target) => {
                applyEdit(
                  target,
                  insertLink(readSelection(target)),
                )

                return true
              },
            },
            {
              key: "Mod-]",
              run: (target) => {
                applyEdit(
                  target,
                  indentLines(readSelection(target)),
                )

                return true
              },
            },
            {
              key: "Mod-[",
              run: (target) => {
                applyEdit(
                  target,
                  outdentLines(readSelection(target)),
                )

                return true
              },
            },
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          // GFM, not strict CommonMark — which is what autolinks a
          // bare URL, renders task lists, and parses tables. A
          // pasted link becoming a link with nothing typed around
          // it falls straight out of this one argument.
          markdown({ base: markdownLanguage }),
          EditorView.lineWrapping,
          livePreview(),
          mountRef.current.placeholder
            ? placeholderExtension(
                mountRef.current.placeholder,
              )
            : [],
          EditorView.contentAttributes.of({
            ...(mountRef.current.label
              ? { "aria-label": mountRef.current.label }
              : {}),
            // Joined, not replaced. `aria-describedby` is the one
            // slot-props key that is a list, and a `Field` above
            // this component has already written its description and
            // its error into it.
            "aria-describedby": [
              mountRef.current.ariaDescribedBy,
              mountRef.current.hintId,
            ]
              .filter(Boolean)
              .join(" "),
            ...(mountRef.current.id
              ? { id: mountRef.current.id }
              : {}),
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              handlersRef.current.onChange?.(
                update.state.doc.toString(),
              )
            }
          }),
          EditorView.domEventHandlers({
            drop: (event, target) => {
              const files = Array.from(
                event.dataTransfer?.files ?? [],
              ).filter(isImageFile)

              if (
                files.length === 0 ||
                !handlersRef.current.onUploadImage
              ) {
                return false
              }

              event.preventDefault()

              for (const file of files) {
                uploadCount.current += 1

                void uploadImage({
                  count: uploadCount.current,
                  file,
                  handlers: handlersRef.current,
                  setMessage: setUploadMessage,
                  view: target,
                })
              }

              return true
            },
            paste: (event, target) => {
              const files = Array.from(
                event.clipboardData?.files ?? [],
              ).filter(isImageFile)

              if (
                files.length > 0 &&
                handlersRef.current.onUploadImage
              ) {
                event.preventDefault()

                for (const file of files) {
                  uploadCount.current += 1

                  void uploadImage({
                    count: uploadCount.current,
                    file,
                    handlers: handlersRef.current,
                    setMessage: setUploadMessage,
                    view: target,
                  })
                }

                return true
              }

              const pasted =
                event.clipboardData?.getData(
                  "text/plain",
                ) ?? ""

              const selection = readSelection(target)

              if (
                isLinkPaste(pasted) &&
                selection.selectionStart !==
                  selection.selectionEnd
              ) {
                event.preventDefault()

                applyEdit(
                  target,
                  wrapSelectionInLink(
                    selection,
                    pasted.trim(),
                  ),
                )

                return true
              }

              return false
            },
          }),
          editabilityRef.current.of([
            EditorView.editable.of(true),
            EditorState.readOnly.of(false),
          ]),
        ],
      }),
    })

    viewRef.current = view

    if (mountRef.current.isRawModeDefault) {
      view.dispatch({
        effects: setLivePreviewRawMode.of(true),
      })
    }

    return () => {
      view.destroy()

      viewRef.current = null
    }
  }, [])

  // Editability flips through a compartment rather than a rebuild,
  // so toggling `isReadOnly` keeps the undo history and the caret.
  useEffect(() => {
    const view = viewRef.current

    if (!view) {
      return
    }

    const isEditable = !isDisabled && !isReadOnly

    view.dispatch({
      effects: editabilityRef.current.reconfigure([
        EditorView.editable.of(isEditable),
        EditorState.readOnly.of(!isEditable),
      ]),
    })
  }, [isDisabled, isReadOnly])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: setLivePreviewRawMode.of(isRawMode),
    })
  }, [isRawMode])

  return (
    <div
      className={toClassName(
        // `@container` here rather than on a wrapper: a container
        // query matches a container's *descendants*, never the
        // container itself.
        "@container flex flex-col gap-2 rounded-md border border-border-default bg-surface-base text-content-primary focus-within:outline-solid focus-within:outline-(length:--focus-ring-width) focus-within:outline-offset-(--focus-ring-offset) focus-within:outline-focus-ring",
        // A token pair, never `opacity-*` — fading the whole box
        // fades the hint under it too, and axe measures the
        // *composited* colour.
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
            {
              /**
               * The "edit Markdown" toggle, as a `Switch` and not a
               * toolbar action — because it is state, not a verb.
               * A `ToolbarAction` renders a `Button`, which
               * announces nothing about being on.
               */
              element: (
                <Switch
                  isChecked={isRawMode}
                  isDisabled={isDisabled}
                  label={rawModeLabel}
                  onChange={setIsRawMode}
                  size="sm"
                />
              ),
              key: "raw-mode",
              type: "control",
            },
          ]}
          label={toolbarLabel}
          overflow="panel"
        />
      </div>

      <div
        className="min-h-32 px-1 text-md cq-md:min-h-48"
        ref={hostRef}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 pb-2">
        {/*
          `sr-only` rather than `hidden`: `display: none` removes an
          element from the accessibility tree, so an
          `aria-describedby` pointing at a hidden hint silently
          describes nothing.
        */}
        <p
          className="sr-only text-content-secondary text-sm cq-sm:not-sr-only"
          id={hintId}
        >
          Markdown. Ctrl+B bold, Ctrl+I italic, Ctrl+K link,
          Ctrl+E code.
        </p>

        <span
          aria-label="Image upload"
          className="text-content-secondary text-sm"
          role="status"
        >
          {uploadMessage}
        </span>
      </div>
    </div>
  )
}
