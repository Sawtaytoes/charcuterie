import { useUniqueId } from "@charcuterie/logic"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import {
  Color,
  TextStyle,
} from "@tiptap/extension-text-style"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { Button } from "../Button/Button.tsx"
import { Dialog } from "../Dialog/Dialog.tsx"
import { Field } from "../Field/Field.tsx"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import {
  toSafeImageUrl,
  toSafeLinkUrl,
} from "../safeUrls.ts"
import type { SlotProps } from "../slotProps.ts"
import type { ToolbarItem } from "../Toolbar/Toolbar.tsx"
import { Toolbar } from "../Toolbar/Toolbar.tsx"
import { toClassName } from "../toClassName.ts"
import { HTML_CONTENT_CLASS } from "./htmlContentStyles.ts"
import { toSafeHtml, toSafeHtmlColour } from "./safeHtml.ts"

export type HtmlEditorProps = SlotProps & {
  className?: string
  /** Initial only. Remount with a key to switch documents. */
  defaultValue?: string
  icons?: Readonly<Record<string, ReactNode>>
  isDisabled?: boolean
  isReadOnly?: boolean
  /** Omit inside a Field, which supplies the real label. */
  label?: string
  /** Hidden form control; its original bytes survive until an edit. */
  name?: string
  onChange?: (value: string) => void
  toolbarLabel?: string
}

const EDITOR_CLASS = toClassName(
  HTML_CONTENT_CLASS,
  "min-h-40 rounded-md border border-border-default bg-surface-sunken px-3 py-2",
  FOCUS_RING_CLASS,
)

const INPUT_CLASS = toClassName(
  "w-full min-w-0 rounded-md border border-border-default bg-surface-sunken p-2 text-content-primary",
  FOCUS_RING_CLASS,
)

/**
 * A rich editor for records already stored as HTML. Sanitization is
 * a projection for display and editing, not a migration: mounting,
 * selecting, focusing and submitting an untouched form never emit
 * normalized HTML. ProseMirror owns document edits and their undo
 * history; external defaults never replace that document.
 */
export const HtmlEditor = ({
  className,
  defaultValue = "",
  icons,
  isDisabled = false,
  isReadOnly = false,
  label,
  name,
  onChange,
  toolbarLabel = "HTML formatting",
  ...slotProps
}: HtmlEditorProps): ReactNode => {
  const generatedId = useUniqueId("html-editor")
  const dialogInputRef = useRef<HTMLInputElement>(null)
  const id = slotProps.id ?? generatedId
  const [initialValue] = useState(defaultValue)
  const [formValue, setFormValue] = useState(initialValue)
  const [dialog, setDialog] = useState<
    "link" | "image" | "colour" | null
  >(null)
  const [error, setError] = useState<string | undefined>()
  const editor = useEditor(
    {
      content: toSafeHtml(initialValue),
      editable: !isDisabled && !isReadOnly,
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit.configure({
          link: {
            openOnClick: false,
            autolink: false,
            isAllowedUri: (url) =>
              toSafeLinkUrl(url) !== undefined,
          },
        }),
        Image.configure({ allowBase64: true }),
        TextStyle,
        Color,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: [
            "start",
            "end",
            "left",
            "right",
            "center",
            "justify",
          ],
        }),
      ],
      editorProps: {
        attributes: {
          id,
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": label ?? "",
          "aria-labelledby":
            label === undefined && slotProps.id
              ? `${slotProps.id}-label`
              : "",
          "aria-describedby":
            slotProps["aria-describedby"] ?? "",
          "aria-invalid": String(
            slotProps["aria-invalid"] ?? false,
          ),
          "aria-required": String(
            slotProps["aria-required"] ??
              slotProps.required ??
              false,
          ),
          "aria-disabled": String(isDisabled),
          "aria-readonly": String(isReadOnly),
          tabindex: String(isDisabled ? -1 : 0),
          class: EDITOR_CLASS,
        },
        transformPastedHTML: toSafeHtml,
      },
      onUpdate: ({
        editor: changedEditor,
        transaction,
      }) => {
        if (!transaction.docChanged) return
        const next = toSafeHtml(changedEditor.getHTML())
        setFormValue(next)
        onChange?.(next)
      },
    },
    [],
  )

  useEffect(() => {
    editor?.setEditable(!isDisabled && !isReadOnly, false)
  }, [editor, isDisabled, isReadOnly])

  const hasDisabledActions =
    isDisabled || isReadOnly || !editor
  const openDialog = (
    next: "link" | "image" | "colour",
  ) => {
    setError(undefined)
    setDialog(next)
  }
  const toggle = (
    key: string,
    title: string,
    onSelect: () => void,
    isPressed: boolean,
  ): ToolbarItem => ({
    key,
    type: "control",
    element: (
      <Button
        appearance="ghost"
        aria-pressed={isPressed}
        iconStart={icons?.[key]}
        isDisabled={hasDisabledActions}
        onClick={onSelect}
      >
        {title}
      </Button>
    ),
  })
  const action = (
    key: string,
    title: string,
    onSelect: () => void,
  ): ToolbarItem => ({
    key,
    label: title,
    icon: icons?.[key],
    isDisabled: hasDisabledActions,
    onSelect,
  })
  const closeDialog = () => setDialog(null)

  return (
    <div
      className={toClassName(
        "min-w-0 space-y-2",
        className,
      )}
    >
      <Toolbar
        label={toolbarLabel}
        overflow="panel"
        overflowIcon={icons?.overflow}
        items={[
          toggle(
            "bold",
            "Bold",
            () => {
              editor?.chain().focus().toggleBold().run()
            },
            editor?.isActive("bold") ?? false,
          ),
          toggle(
            "italic",
            "Italic",
            () => {
              editor?.chain().focus().toggleItalic().run()
            },
            editor?.isActive("italic") ?? false,
          ),
          toggle(
            "underline",
            "Underline",
            () => {
              editor
                ?.chain()
                .focus()
                .toggleUnderline()
                .run()
            },
            editor?.isActive("underline") ?? false,
          ),
          toggle(
            "bulletList",
            "Bullet list",
            () => {
              editor
                ?.chain()
                .focus()
                .toggleBulletList()
                .run()
            },
            editor?.isActive("bulletList") ?? false,
          ),
          toggle(
            "orderedList",
            "Numbered list",
            () => {
              editor
                ?.chain()
                .focus()
                .toggleOrderedList()
                .run()
            },
            editor?.isActive("orderedList") ?? false,
          ),
          action("alignStart", "Align start", () => {
            editor
              ?.chain()
              .focus()
              .setTextAlign("start")
              .run()
          }),
          action("alignCenter", "Align centre", () => {
            editor
              ?.chain()
              .focus()
              .setTextAlign("center")
              .run()
          }),
          action("alignEnd", "Align end", () => {
            editor
              ?.chain()
              .focus()
              .setTextAlign("end")
              .run()
          }),
          action("link", "Edit link", () =>
            openDialog("link"),
          ),
          action("unlink", "Remove link", () => {
            editor
              ?.chain()
              .focus()
              .extendMarkRange("link")
              .unsetLink()
              .run()
          }),
          action("colour", "Text colour", () =>
            openDialog("colour"),
          ),
          action("image", "Insert image", () =>
            openDialog("image"),
          ),
          action("undo", "Undo", () => {
            editor?.chain().focus().undo().run()
          }),
          action("redo", "Redo", () => {
            editor?.chain().focus().redo().run()
          }),
        ]}
      />
      <EditorContent editor={editor} />
      {name !== undefined && (
        <input
          disabled={isDisabled}
          name={name}
          type="hidden"
          value={formValue}
        />
      )}
      <Dialog
        initialFocus={dialogInputRef}
        heading={
          dialog === "image"
            ? "Insert image"
            : dialog === "colour"
              ? "Text colour"
              : "Edit link"
        }
        isVisible={dialog !== null}
        onClose={closeDialog}
      >
        <form
          key={dialog}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            // A portalled formatting form must never submit its record form.
            event.stopPropagation()
            if (!editor || hasDisabledActions) return
            const data = new FormData(event.currentTarget)
            const value = String(
              data.get("value") ?? "",
            ).trim()
            if (dialog === "colour") {
              const colour = toSafeHtmlColour(value)
              if (!colour) {
                setError(
                  "Enter a colour name, hex, RGB or HSL value.",
                )
                return
              }
              editor.chain().focus().setColor(colour).run()
            } else if (dialog === "image") {
              const src = toSafeImageUrl(value)
              if (!src) {
                setError("Enter a safe image URL.")
                return
              }
              editor
                .chain()
                .focus()
                .setImage({
                  src,
                  alt: String(data.get("alt") ?? ""),
                })
                .run()
            } else {
              const href = toSafeLinkUrl(value)
              if (!href) {
                setError("Enter a safe link URL.")
                return
              }
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href })
                .run()
            }
            closeDialog()
          }}
        >
          <Field
            error={error}
            label={dialog === "colour" ? "Colour" : "URL"}
            isRequired
          >
            <input
              className={INPUT_CLASS}
              defaultValue={
                dialog === "link"
                  ? String(
                      editor?.getAttributes("link").href ??
                        "",
                    )
                  : ""
              }
              name="value"
              ref={dialogInputRef}
              required
            />
          </Field>
          {dialog === "image" && (
            <Field label="Image description">
              <input className={INPUT_CLASS} name="alt" />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              isDisabled={hasDisabledActions}
              type="submit"
            >
              Apply
            </Button>
            <Button
              appearance="outline"
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
