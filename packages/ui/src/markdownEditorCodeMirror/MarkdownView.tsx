import { useUniqueId } from "@charcuterie/logic"
import {
  markdown,
  markdownLanguage,
} from "@codemirror/lang-markdown"
import {
  Annotation,
  Compartment,
  EditorState,
} from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import type { SlotProps } from "../slotProps.ts"
import { toClassName } from "../toClassName.ts"
import {
  livePreview,
  livePreviewOptions,
} from "./livePreview.ts"

export type MarkdownViewProps = SlotProps & {
  className?: string
  /**
   * The accessible name of the region, as `aria-label`.
   *
   * Worth passing on anything that is not the only thing on the
   * page. A read view is announced as an article, and "article" with
   * no name tells a reader stepping through the page nothing about
   * which article it is.
   */
  label?: string
  /**
   * Called when the reader ticks a `- [ ]` box, with the **whole**
   * next markdown document — the same shape the editors' `onChange`
   * hands back, so the same autosave wires to both.
   *
   * **Passing it is what makes the checkboxes operable at all.**
   * Leave it out and they render disabled: the state is still on
   * screen, and nothing pretends the reader can change it. That is
   * deliberate rather than defensive. Two of the three surfaces this
   * component was built for — a rendered comment, and a repo file
   * fetched at a commit hash — have nowhere to put a tick, and a
   * checkbox that visibly toggles and then loses the change on
   * reload is worse than one that says up front it cannot.
   *
   * The view still applies the tick to its own document
   * immediately, so the box responds under the pointer. If the
   * consumer rejects the change, the next `value` it passes puts it
   * back.
   */
  onToggleTask?: (nextValue: string) => void
  /**
   * Re-point a link before it becomes an `href`, for a document
   * whose paths mean something only the app knows.
   *
   * The case it exists for is a **relative** path in a fetched or
   * imported file. `[the runbook](../docs/runbook.md)` is resolved
   * by the browser against the page the reader is on — the app —
   * so it lands on nothing. Return the URL it should point at
   * instead, or `undefined` to leave the link exactly as written.
   *
   * The document's own URL has already been through the scheme
   * guard when it arrives, so `javascript:` never reaches this.
   * What comes back is the app's own string and is used as given.
   *
   * **Links only.** An image's `src` is deliberately not offered:
   * an app that maps a document path to a page URL would turn a
   * working image into a broken one.
   *
   * Read once, at mount, through a ref — so a resolver defined
   * inline in a render does not rebuild the view and lose the
   * reader's scroll position.
   */
  resolveUrl?: (url: string) => string | undefined
  /**
   * The markdown to render, and **controlled** — unlike either
   * editor.
   *
   * The editors take `defaultValue` because reassigning their
   * document from outside would throw away the undo history that
   * belonged to it, which is a real cost and is why they ask for a
   * `key` instead. A view has no undo history and no caret to
   * protect, so it has nothing to lose by simply rendering what it
   * is given: fetch a file at a different commit hash, pass the new
   * string, and the page changes. No remount, no `key`, no stale
   * document above a new title.
   */
  value: string
}

/**
 * Tells the update listener that a document change came from a new
 * `value`, not from a reader.
 *
 * Without it, syncing the prop into the document fires
 * `onToggleTask` with the string the consumer just passed in — a
 * loop that looks like an autosave storm and is really an echo.
 */
const isValueSync = Annotation.define<boolean>()

/**
 * Rendered markdown, with no toolbar and nothing to type into.
 *
 * ## Why this is a component and not `isReadOnly` on the editors
 *
 * Both editors already have `isReadOnly`, and it means *an editor
 * you cannot type in*: the nine formatting buttons are still in the
 * DOM, still queryable, still in the accessibility tree, drawn in
 * their disabled colours above a document nobody is editing. That is
 * the right shape for a form field that is temporarily locked. It is
 * the wrong shape for reading a file, and a `hasToolbar={false}`
 * prop would not fix it — the type would still carry
 * `onUploadImage`, `icons`, `placeholder` and `rawModeLabel`, none
 * of which mean anything to a reader, and "no toolbar" would be a
 * branch that could be got wrong rather than a thing that does not
 * exist.
 *
 * So this is its own component, the way `Listbox`, `Combobox` and
 * `Picker` are their own components rather than three modes of one.
 * The props are the four a reader needs, and there is no code path
 * in this file that could render a toolbar.
 *
 * ## Why it is in the CodeMirror subpath
 *
 * Because the requirement is that it renders **the same** as the
 * editor a consumer edits the same document in — and the only way
 * to guarantee that is to be the same code, not to be a second
 * implementation that agrees today.
 *
 * A `react-markdown` reader in the main barrel was the obvious
 * alternative and is the one that goes wrong slowly: two parsers,
 * two table implementations, two answers to what a bare URL does,
 * and a bug report six months later that says "the table changed
 * when I saved it". This shares `livePreviewRanges.ts` — the 1,200
 * lines that decide what a document *looks* like — with
 * `MarkdownEditorCodeMirror`, and the theme with it too. There is no
 * second renderer to keep in step.
 *
 * The cost is that it lives behind the same optional peers, so a
 * consumer who wants only the reader still installs CodeMirror. That
 * is the honest trade and it is the right way round: an app that
 * renders markdown in three places and edits it in one should pay
 * once.
 *
 * ## What differs from the editor, and why each one differs
 *
 * | | editor | this |
 * | --- | --- | --- |
 * | Toolbar | nine buttons | **none in the DOM** |
 * | Value | `defaultValue`, uncontrolled | `value`, **controlled** |
 * | Content role | `textbox` | **`article`** |
 * | Headings | scaled text | scaled **and `role="heading"`** |
 * | Links | painted span, opened by a handler | **real `<a href>`** |
 * | Markers | revealed by the caret | never revealed |
 * | Task boxes | always operable | **inert unless `onToggleTask`** |
 *
 * Every one of those follows from there being no caret. The editor
 * paints a span instead of an anchor because an `<a href>` inside a
 * `contenteditable` competes with the caret for the line; a document
 * has no caret, so the link is simply a link — tabbable, activated
 * by Enter, and copyable from the context menu. The editor reveals
 * markup when the selection touches it because you cannot edit a URL
 * you cannot see; there is nothing here to edit.
 *
 * ## Hostile markdown
 *
 * This renders files fetched from a git host, so the document is
 * untrusted by default, and the answer is mostly structural rather
 * than a sanitiser:
 *
 *  - **Raw HTML in the source is never parsed as HTML.** There is no
 *    `innerHTML` in this subpath, no `dangerouslySetInnerHTML`, and
 *    no sanitiser to have a bug in. CodeMirror's state holds the
 *    source as *text*, and every rendered node is `createElement`
 *    plus `textContent`. A `<script>` in a fetched README is drawn
 *    as the characters `<script>`. `MarkdownView.test.tsx` asserts
 *    it against the tag most likely to be tried.
 *  - **A URL is checked before it is used as one**, because that was
 *    the one place the document reached the platform:
 *    `[click](javascript:…)` used to paint as a link and run. Both
 *    components now go through `safeUrls.ts`, which allowlists
 *    schemes the way a browser reads them.
 *  - **The reader is not a beacon.** Remote images carry
 *    `referrerpolicy="no-referrer"`, so a fetched image cannot learn
 *    which page loaded it.
 *
 * What is *not* claimed: this does not stop a document from linking
 * somewhere unpleasant, and it does not fetch anything on the
 * reader's behalf beyond the images the markdown names.
 */
export const MarkdownView = ({
  className,
  label,
  onToggleTask,
  resolveUrl,
  value,
  ...receivedSlotProps
}: MarkdownViewProps): ReactNode => {
  const baseId = useUniqueId()

  const hostRef = useRef<HTMLDivElement>(null)

  const viewRef = useRef<EditorView | null>(null)

  const optionsRef = useRef(new Compartment())

  /**
   * The handler reaches the view through a ref, never a closure.
   *
   * The `EditorView` is built once — rebuilding it on a new callback
   * identity would drop the scroll position mid-read — so its
   * extensions capture *this* object and the render loop keeps the
   * object current.
   */
  const handlerRef = useRef(onToggleTask)

  handlerRef.current = onToggleTask

  /**
   * Same treatment, and for the same reason: a resolver written
   * inline in the consumer's render is a new function every time,
   * and rebuilding the view on it would throw away the scroll
   * position of whatever the reader was reading.
   */
  const resolveUrlRef = useRef(resolveUrl)

  resolveUrlRef.current = resolveUrl

  /**
   * Frozen at mount, and named so rather than read from the render
   * closure, because the build-once effect below is honestly
   * dependency-free rather than lint-suppressed.
   */
  const mountRef = useRef({
    ariaDescribedBy: receivedSlotProps["aria-describedby"],
    id: receivedSlotProps.id ?? baseId,
    label,
    value,
  })

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: mountRef.current.value,
        extensions: [
          // GFM, not strict CommonMark — the same argument as the
          // editor's: it is what autolinks a bare URL, renders a
          // task list, and parses a table. A reader that disagreed
          // with the editor about any of those would be the bug this
          // component exists to avoid.
          markdown({ base: markdownLanguage }),
          EditorView.lineWrapping,
          livePreview({
            hasDocumentSemantics: true,
            // Stable by construction — the ref is what changes.
            resolveUrl: (url) =>
              resolveUrlRef.current?.(url),
          }),
          /**
           * The one answer that can change after mount, and only
           * that answer.
           *
           * A `Compartment` holding the whole `livePreview()` would
           * reconfigure the `StateField`s inside it — raw mode,
           * focus, the table pass — which means destroying and
           * recreating them to change a boolean about checkboxes.
           * Compartmenting the facet alone reconfigures one value.
           */
          optionsRef.current.of(
            livePreviewOptions.of({
              isTaskListInteractive: Boolean(
                handlerRef.current,
              ),
            }),
          ),
          /**
           * `editable`, and deliberately **not**
           * `EditorState.readOnly`.
           *
           * `editable` is the DOM half: it writes
           * `contenteditable="false"`, which is what stops typing,
           * pasting, dropping and IME, and what keeps the content
           * out of the tab order. It is the whole of what this
           * surface needs, because no keymap and no input handler is
           * installed for `readOnly` to guard against.
           *
           * `readOnly` also makes CodeMirror write
           * `aria-readonly="true"` onto the content element, and
           * there is no way to unset an attribute it decides to
           * write. On `role="article"` that attribute is one ARIA
           * does not define, which axe reports and which is a fair
           * report: "read-only" is a statement about a *field*, and
           * this is not one. Nothing is lost by leaving it off, so it
           * is left off rather than papered over.
           */
          EditorView.editable.of(false),
          EditorView.contentAttributes.of({
            /**
             * `article`, not the `textbox` CodeMirror writes.
             *
             * This is the difference between reading a document and
             * being trapped in a text field. A screen reader entering
             * `role="textbox"` switches to forms mode and reads the
             * contents as one flat string — no heading navigation, no
             * table navigation, no list structure — which for an
             * editor is exactly right and for a reader deletes every
             * affordance the markup was rendered for.
             */
            role: "article",
            /**
             * CodeMirror writes `aria-multiline="true"` into the
             * content element's attributes, and there is no way to
             * unset one: its `updateAttrs` calls `setAttribute` with
             * whatever it is handed, so `undefined` would arrive as
             * the string "undefined".
             *
             * `false` is both the true answer — this is not a
             * multiline textbox, because it is not a textbox — and
             * the value axe explicitly ignores on an element carrying
             * `contenteditable`. An attribute ARIA does not define
             * for `article` is inert either way; this way the gate
             * agrees.
             */
            "aria-multiline": "false",
            ...(mountRef.current.label
              ? { "aria-label": mountRef.current.label }
              : {}),
            ...(mountRef.current.ariaDescribedBy
              ? {
                  "aria-describedby":
                    mountRef.current.ariaDescribedBy,
                }
              : {}),
            id: mountRef.current.id,
          }),
          EditorView.updateListener.of((update) => {
            if (
              !update.docChanged ||
              update.transactions.some((transaction) =>
                transaction.annotation(isValueSync),
              )
            ) {
              return
            }

            // The only change a reader can make is a checkbox, so
            // this is that checkbox and nothing else.
            handlerRef.current?.(
              update.state.doc.toString(),
            )
          }),
        ],
      }),
    })

    viewRef.current = view

    return () => {
      view.destroy()

      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current

    if (!view || view.state.doc.toString() === value) {
      return
    }

    view.dispatch({
      annotations: isValueSync.of(true),
      changes: {
        from: 0,
        insert: value,
        to: view.state.doc.length,
      },
    })
  }, [value])

  // Through a compartment rather than a rebuild, so a consumer that
  // turns ticking on and off — a task that becomes editable — keeps
  // its scroll position.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: optionsRef.current.reconfigure(
        livePreviewOptions.of({
          isTaskListInteractive: Boolean(onToggleTask),
        }),
      ),
    })
  }, [onToggleTask])

  return (
    <div
      className={toClassName(
        "text-content-primary text-md",
        className,
      )}
      ref={hostRef}
    />
  )
}
