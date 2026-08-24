/**
 * The CodeMirror half of live preview: descriptors → decorations,
 * two widgets, and a theme that reads Charcuterie tokens.
 *
 * `livePreviewRanges.ts` decided *what* to decorate and is pure.
 * This file owns everything that needs `@codemirror/view`, which is
 * also everything that cannot be tested in this package's Node-only
 * Vitest project — so it is kept deliberately thin and mechanical.
 *
 * ### Why the theme uses `var(--color-…)` and not Tailwind classes
 *
 * Every other visual in this package is a Tailwind utility reading
 * a token. CodeMirror is the exception, and for a structural
 * reason: it generates its own scoped class names and injects its
 * own stylesheet, so the DOM these decorations land on is not DOM
 * Tailwind ever scans. Referencing the custom properties directly
 * keeps a scheme flip a repaint — the same behaviour, one layer
 * lower — and avoids a `safelist` that would rot the first time a
 * class here changed.
 *
 * The properties below are the generated token names, not invented
 * ones. That distinction has already cost this fleet a release:
 * Docket shipped invisible priority bars from `--color-danger-9`, a
 * scale that does not exist, and nothing errored. A custom property
 * that resolves to nothing paints nothing, silently.
 */

import { syntaxTree } from "@codemirror/language"
import type {
  EditorState,
  Extension,
  Range,
} from "@codemirror/state"
import {
  Facet,
  Prec,
  StateEffect,
  StateField,
} from "@codemirror/state"
import type {
  DecorationSet,
  ViewUpdate,
} from "@codemirror/view"
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view"

import type {
  LivePreviewLineKind,
  LivePreviewMarkKind,
  LivePreviewTableRow,
  LivePreviewTableSegment,
} from "./livePreviewRanges.ts"
import {
  toLivePreviewRanges,
  toLivePreviewTableRanges,
} from "./livePreviewRanges.ts"

/** Marks a rendered link so the click handler can find its target. */
const URL_ATTRIBUTE = "data-charcuterie-url"

/**
 * A rendered cell's offset into its own table, so a click can put
 * the caret back in the markdown it was drawn from.
 *
 * Relative, not absolute, and for the same reason `TaskWidget` reads
 * its position back from the DOM: a widget outlives the offsets it
 * was built at. Editing a paragraph *above* a table moves every
 * offset in it without changing a character of the table, and the
 * widget is reused — `eq` compares the markdown, which did not
 * change. Relative plus `posAtDOM` at click time is correct in both
 * cases; a captured absolute offset silently is not.
 */
const CELL_OFFSET_ATTRIBUTE = "data-charcuterie-cell-offset"

/**
 * What kind of surface this is, and what its checkboxes may do.
 *
 * A facet rather than closure state, for the same reason raw mode is
 * a `StateField`: the decoration builders below are module-level
 * singletons — one `ViewPlugin`, one `StateField` — and rebuilding
 * them per instance would mean a second copy of the whole live
 * preview for every surface on the page. They read the answer out of
 * the state they were already handed.
 *
 * It is also what lets `MarkdownView` put the task flag in a
 * `Compartment` and flip it without discarding the view, exactly as
 * the editors already flip editability.
 */
export type LivePreviewOptions = {
  /**
   * Draw a **document** rather than an editing surface: real
   * anchors, heading roles, and a table that is a table instead of a
   * way back into the markdown behind it.
   *
   * Off by default, because the editors are the surface this module
   * was written for and every one of these would be wrong inside a
   * `contenteditable`.
   */
  hasDocumentSemantics?: boolean
  /** Whether a `- [ ]` checkbox can be ticked. Defaults to `true`. */
  isTaskListInteractive?: boolean
}

/**
 * The facet itself is exported so a consumer can put **only this**
 * in a `Compartment` and flip one answer without reconfiguring the
 * whole extension — which would tear down and recreate the
 * `StateField`s beside it.
 *
 * A later input wins per key, and a key nobody stated keeps the
 * default. That is a merge rather than "the last one wins outright",
 * so an override that only cares about checkboxes cannot silently
 * turn document semantics back off.
 */
export const livePreviewOptions = Facet.define<
  LivePreviewOptions,
  Required<LivePreviewOptions>
>({
  combine: (values) =>
    values.reduce<Required<LivePreviewOptions>>(
      (merged, value) => ({
        hasDocumentSemantics:
          value.hasDocumentSemantics ??
          merged.hasDocumentSemantics,
        isTaskListInteractive:
          value.isTaskListInteractive ??
          merged.isTaskListInteractive,
      }),
      {
        hasDocumentSemantics: false,
        isTaskListInteractive: true,
      },
    ),
})

const toOptions = (
  state: EditorState,
): Required<LivePreviewOptions> =>
  state.facet(livePreviewOptions)

/** Toggle the "edit Markdown" mode. */
export const setLivePreviewRawMode =
  StateEffect.define<boolean>()

/**
 * Raw mode as editor state rather than a React prop threaded down.
 *
 * It has to live here because the decoration plugin reads it on
 * every update, and because a keybinding should be able to flip it
 * without a round trip through React.
 */
export const livePreviewRawModeField =
  StateField.define<boolean>({
    create: () => false,
    update: (isRawMode, transaction) => {
      let isNextRawMode = isRawMode

      for (const effect of transaction.effects) {
        if (effect.is(setLivePreviewRawMode)) {
          isNextRawMode = effect.value
        }
      }

      return isNextRawMode
    },
  })

const setIsEditorFocused = StateEffect.define<boolean>()

/**
 * Focus, as editor state.
 *
 * The plugin can read `view.hasFocus` directly; the block pass is a
 * `StateField` and has no view to ask. It still needs the answer,
 * because an unfocused editor reveals nothing — without it the
 * caret's default resting place, offset 0, counts as "inside" a
 * table that opens the document, and a description that starts with
 * a table loads showing pipes.
 */
const isEditorFocusedField = StateField.define<boolean>({
  create: () => false,
  update: (isFocused, transaction) => {
    let isNextFocused = isFocused

    for (const effect of transaction.effects) {
      if (effect.is(setIsEditorFocused)) {
        isNextFocused = effect.value
      }
    }

    return isNextFocused
  },
})

/**
 * The facet CodeMirror provides for exactly this: turn a focus
 * change into an effect, so state can depend on it.
 */
const focusTracker = EditorView.focusChangeEffect.of(
  (_state, isFocusing) => setIsEditorFocused.of(isFocusing),
)

/**
 * How the read view says "heading" to something that is not looking
 * at the font size.
 *
 * The editing surface deliberately has none of this. Its content is
 * a `role="textbox"`, and ARIA flattens a textbox's contents to
 * text — a heading role inside one is not exposed, so adding it
 * there would be a decoration that lies about what it does. The read
 * view is a `role="article"`, where the same markup is a real
 * heading and the reader's H key steps between sections.
 *
 * A `Decoration.line` carries the role, which is exactly right for
 * an ATX heading: the parser only ever emits `ATXHeading1`…`6`, and
 * one of those is one line by definition.
 */
const HEADING_LEVELS: Partial<
  Record<LivePreviewLineKind, string>
> = {
  heading1: "1",
  heading2: "2",
  heading3: "3",
  heading4: "4",
  heading5: "5",
  heading6: "6",
}

const toLineAttributes = (
  lineKind: LivePreviewLineKind,
  hasDocumentSemantics: boolean,
) => {
  const level = HEADING_LEVELS[lineKind]

  return hasDocumentSemantics && level
    ? { "aria-level": level, role: "heading" }
    : undefined
}

/**
 * A link's DOM, in a surface where a real anchor is allowed.
 *
 * The editor cannot have one. Its content is `contenteditable`, and
 * an `<a href>` inside an editable region is a focus target the
 * caret has to share the line with — which is why the editor paints
 * a `<span>` and opens the URL from a `mousedown` handler instead,
 * and why clicking link *text* there cannot place a caret.
 *
 * A read view has no caret to protect, so the link is simply a link:
 * tabbable, activated by Enter, copyable from the context menu, and
 * announced as a link rather than as coloured text. That difference
 * is the one place the two surfaces deliberately emit different DOM,
 * and it is a strictly larger set of things a reader can do.
 */
const toLinkAttributes = (url: string) => ({
  href: url,
  // Not optional with `target="_blank"`: without it the opened page
  // gets a live `window.opener` back into this one.
  rel: "noopener noreferrer",
  target: "_blank",
})

const LINE_CLASSES: Record<LivePreviewLineKind, string> = {
  blockquote: "cm-md-blockquote",
  code: "cm-md-codeblock",
  heading1: "cm-md-heading1",
  heading2: "cm-md-heading2",
  heading3: "cm-md-heading3",
  heading4: "cm-md-heading4",
  heading5: "cm-md-heading5",
  heading6: "cm-md-heading6",
  table: "cm-md-table",
}

const MARK_CLASSES: Record<LivePreviewMarkKind, string> = {
  autolink: "cm-md-link",
  code: "cm-md-code",
  emphasis: "cm-md-emphasis",
  linkText: "cm-md-link",
  strikethrough: "cm-md-strikethrough",
  strong: "cm-md-strong",
  url: "cm-md-url",
}

/**
 * An image, standing in for its own markup.
 *
 * `eq` compares by URL *and* alt so scrolling past an image reuses
 * the same `<img>` instead of refetching it, while an edit to
 * either still rebuilds. Without it every keystroke elsewhere in
 * the document flashes every image on screen.
 */
class ImageWidget extends WidgetType {
  constructor(
    private readonly url: string,
    private readonly alt: string,
  ) {
    super()
  }

  eq(other: ImageWidget) {
    return other.url === this.url && other.alt === this.alt
  }

  toDOM(view: EditorView) {
    const image = document.createElement("img")

    image.setAttribute("src", this.url)

    image.setAttribute("alt", this.alt)

    /**
     * A remote image in a document nobody here wrote is a beacon:
     * fetching it tells its host that this reader opened this file,
     * and the default `Referer` tells it which page they opened it
     * from. The image is still fetched — that is what rendering it
     * means — but it learns nothing about where from.
     */
    image.setAttribute("referrerpolicy", "no-referrer")

    image.className = "cm-md-image"

    // The document's height is unknown until the image decodes, and
    // CodeMirror caches line heights. Without a remeasure the lines
    // after a tall image overlap it until something else forces a
    // layout.
    image.addEventListener("load", () => {
      view.requestMeasure()
    })

    return image
  }
}

/**
 * A task checkbox, standing in for `[ ]` / `[x]`.
 *
 * The position is read back from the DOM with `posAtDOM` rather
 * than captured in the constructor: a widget outlives the document
 * offsets it was built at, and a stale `from` writes the checkbox
 * into whatever moved into that slot.
 */
class TaskWidget extends WidgetType {
  constructor(
    private readonly isChecked: boolean,
    private readonly label: string,
    private readonly isInteractive: boolean,
  ) {
    super()
  }

  eq(other: TaskWidget) {
    return (
      other.isChecked === this.isChecked &&
      other.isInteractive === this.isInteractive &&
      other.label === this.label
    )
  }

  toDOM(view: EditorView) {
    const checkbox = document.createElement("input")

    checkbox.type = "checkbox"

    checkbox.checked = this.isChecked

    checkbox.className = "cm-md-task"

    /**
     * The item's own text, as the checkbox's name.
     *
     * A bare `<input type="checkbox">` inside a `contenteditable`
     * has no wrapping `<label>` to inherit from and no `for`
     * pointing at it, so without this it announces as an unlabelled
     * checkbox — and a task list is exactly where "checkbox,
     * checked" with no name is useless. The text is right there on
     * the line; using it means the widget says what the sighted
     * reader sees.
     */
    checkbox.setAttribute(
      "aria-label",
      this.label === "" ? "Task" : this.label,
    )

    /**
     * A read view's checkbox is **inert by default**, and `disabled`
     * rather than hidden or repainted as a glyph.
     *
     * The state is a fact about the document and belongs on screen;
     * the ability to change it is not, when the document is a file
     * fetched at a commit hash and there is nowhere for a tick to go.
     * A disabled checkbox says both of those at once — it shows
     * checked or unchecked, and it announces "unavailable", so the
     * reader is never left clicking something that swallows the
     * click.
     *
     * A consumer that *does* have somewhere to put the change passes
     * `onToggleTask`, and this comes back to life. That is the same
     * shape as `onUploadImage` on the editors: omit the handler and
     * the capability is simply not offered, which beats offering one
     * that half works.
     */
    if (!this.isInteractive) {
      checkbox.disabled = true

      return checkbox
    }

    checkbox.addEventListener("mousedown", (event) => {
      // The checkbox owns the click; without this CodeMirror also
      // moves the caret into the widget's slot on the way past.
      event.stopPropagation()
    })

    checkbox.addEventListener("change", () => {
      const from = view.posAtDOM(checkbox)

      view.dispatch({
        changes: {
          from,
          insert: this.isChecked ? "[ ]" : "[x]",
          to: from + 3,
        },
      })
    })

    return checkbox
  }

  ignoreEvent() {
    return false
  }
}

/**
 * A cell's content run, as DOM.
 *
 * A plain text node when there is nothing to say about it — the
 * common case, and one fewer element per cell in a table that might
 * have a hundred.
 */
const toSegmentNode = (
  segment: LivePreviewTableSegment,
  view: EditorView,
  hasDocumentSemantics: boolean,
) => {
  if (segment.type === "image") {
    const image = document.createElement("img")

    image.setAttribute("src", segment.url)

    image.setAttribute("alt", segment.alt)

    image.setAttribute("referrerpolicy", "no-referrer")

    image.className = "cm-md-image"

    image.addEventListener("load", () => {
      view.requestMeasure()
    })

    return image
  }

  if (segment.markKinds.length === 0 && !segment.url) {
    return document.createTextNode(segment.text)
  }

  // A link in a cell follows the same rule as a link in a
  // paragraph: an anchor where an anchor is allowed, a painted span
  // with a click handler where the caret owns the line.
  const element: HTMLElement =
    segment.url && hasDocumentSemantics
      ? document.createElement("a")
      : document.createElement("span")

  element.className = segment.markKinds
    .map((markKind) => MARK_CLASSES[markKind])
    .join(" ")

  if (segment.url) {
    if (hasDocumentSemantics) {
      for (const [name, value] of Object.entries(
        toLinkAttributes(segment.url),
      )) {
        element.setAttribute(name, value)
      }
    } else {
      element.setAttribute(URL_ATTRIBUTE, segment.url)
    }
  }

  element.textContent = segment.text

  return element
}

/**
 * A table, standing in for its own pipes.
 *
 * This is the one widget here that replaces *lines* rather than a
 * span, and the only construct in the language whose meaning is
 * geometry: a column is not a decoration you can hang on the text,
 * because the text of column two is on four different lines. So the
 * markdown stops being drawn and this draws instead — and the way
 * back is the caret, exactly as it is for a link or an image.
 * Clicking a cell dispatches a selection into that cell, the
 * decoration drops on the next update, and the pipes are back with
 * the caret already in the right one.
 *
 * `eq` compares the table's markdown source. Two identical tables
 * never share a widget instance — `eq` is only ever consulted for
 * the same position — so the slice is a complete identity, and it
 * is stable under edits elsewhere in the document, which is what
 * stops every keystroke in a long description from rebuilding every
 * table below it.
 */
class TableWidget extends WidgetType {
  constructor(
    private readonly source: string,
    private readonly rows: readonly LivePreviewTableRow[],
    private readonly tableFrom: number,
    private readonly hasDocumentSemantics: boolean,
  ) {
    super()
  }

  eq(other: TableWidget) {
    return other.source === this.source
  }

  toDOM(view: EditorView) {
    const scroll = document.createElement("div")

    scroll.className = "cm-md-table-scroll"

    const table = document.createElement("table")

    table.className = "cm-md-table-rendered"

    const head = document.createElement("thead")

    const body = document.createElement("tbody")

    for (const row of this.rows) {
      const rowElement = document.createElement("tr")

      for (const cell of row.cells) {
        const cellElement = document.createElement(
          row.isHeader ? "th" : "td",
        )

        cellElement.style.textAlign = cell.alignment

        cellElement.setAttribute(
          CELL_OFFSET_ATTRIBUTE,
          String(cell.from - this.tableFrom),
        )

        for (const segment of cell.segments) {
          cellElement.append(
            toSegmentNode(
              segment,
              view,
              this.hasDocumentSemantics,
            ),
          )
        }

        rowElement.append(cellElement)
      }

      ;(row.isHeader ? head : body).append(rowElement)
    }

    if (head.childElementCount > 0) {
      table.append(head)
    }

    table.append(body)

    scroll.append(table)

    /**
     * The way back into the markdown, and only where there is one.
     *
     * A read view has no caret to put in a cell, so this handler
     * would be a click that steals the selection and gives nothing
     * back — and `cursor: text` on the cells would be advertising
     * an edit that cannot happen. The table there is simply a table.
     */
    if (this.hasDocumentSemantics) {
      scroll.classList.add("cm-md-table-static")

      /**
       * A scroll box a keyboard can reach.
       *
       * A table wider than its column scrolls sideways, and in the
       * editor that box is inside a `contenteditable` — already
       * focusable, already scrollable with the arrow keys. Here it
       * is inside content that is deliberately *not* a tab stop, so
       * without this the only way to see column four is a pointer.
       * axe reports it as `scrollable-region-focusable` and is
       * right: it is WCAG 2.1.1, and it is the one thing a read view
       * has to add back that the editor got for free.
       */
      scroll.tabIndex = 0

      return scroll
    }

    scroll.addEventListener("mousedown", (event) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      // A link in a cell is still a link; `openLinkOnClick` gets it
      // on the way up.
      if (target.closest(`[${URL_ATTRIBUTE}]`)) {
        return
      }

      const cellElement = target.closest(
        `[${CELL_OFFSET_ATTRIBUTE}]`,
      )

      if (!cellElement) {
        return
      }

      event.preventDefault()

      const offset = Number(
        cellElement.getAttribute(CELL_OFFSET_ATTRIBUTE),
      )

      view.focus()

      view.dispatch({
        selection: {
          anchor: view.posAtDOM(scroll) + offset,
        },
      })
    })

    return scroll
  }

  /**
   * The widget handles its own events.
   *
   * Without this CodeMirror also treats the click as a caret
   * placement and lands wherever the coordinates map to — which for
   * a block widget is its first or last position, never the cell
   * that was clicked.
   */
  ignoreEvent() {
    return true
  }
}

const toDecorations = (view: EditorView): DecorationSet => {
  const isRawMode = view.state.field(
    livePreviewRawModeField,
    false,
  )

  const { hasDocumentSemantics, isTaskListInteractive } =
    toOptions(view.state)

  const text = view.state.doc.toString()

  /**
   * An unfocused editor reveals nothing, and a document reveals
   * nothing ever.
   *
   * Without the focus half, the caret's default resting place —
   * offset 0 — counts as "inside" whatever construct starts the
   * document, so a task whose description opens with a heading
   * rendered its `#` on load and no other heading's. It looked like
   * a concealment bug and was really a focus bug: there is no caret
   * in the document until someone puts one there.
   *
   * The document half is stated rather than inherited. A read view's
   * content is not editable, so it cannot take focus and `hasFocus`
   * is already false — but that is a property of how CodeMirror
   * happens to treat a `contenteditable="false"` element, and
   * "markup never comes back in a read view" is a promise the
   * component makes, not a side effect it is relying on.
   */
  const selections =
    view.hasFocus && !hasDocumentSemantics
      ? view.state.selection.ranges.map((range) => ({
          from: range.from,
          to: range.to,
        }))
      : []

  const decorations: Range<Decoration>[] = []

  for (const visible of view.visibleRanges) {
    for (const range of toLivePreviewRanges({
      from: visible.from,
      isRawMode: isRawMode ?? false,
      selections,
      text,
      to: visible.to,
      tree: syntaxTree(view.state),
    })) {
      switch (range.type) {
        case "image": {
          decorations.push(
            Decoration.replace({
              widget: new ImageWidget(range.url, range.alt),
            }).range(range.from, range.to),
          )

          break
        }

        case "line": {
          decorations.push(
            Decoration.line({
              attributes: toLineAttributes(
                range.lineKind,
                hasDocumentSemantics,
              ),
              class: LINE_CLASSES[range.lineKind],
            }).range(range.from),
          )

          break
        }

        case "mark": {
          decorations.push(
            Decoration.mark({
              attributes: range.url
                ? hasDocumentSemantics
                  ? toLinkAttributes(range.url)
                  : { [URL_ATTRIBUTE]: range.url }
                : undefined,
              class: MARK_CLASSES[range.markKind],
              ...(range.url && hasDocumentSemantics
                ? { tagName: "a" }
                : {}),
            }).range(range.from, range.to),
          )

          break
        }

        case "marker": {
          decorations.push(
            range.isConcealed
              ? Decoration.replace({}).range(
                  range.from,
                  range.to,
                )
              : Decoration.mark({
                  class: "cm-md-marker",
                }).range(range.from, range.to),
          )

          break
        }

        case "task": {
          decorations.push(
            Decoration.replace({
              widget: new TaskWidget(
                range.isChecked,
                range.label,
                isTaskListInteractive,
              ),
            }).range(range.from, range.to),
          )

          break
        }
      }
    }
  }

  // `true` sorts. The tree walk emits in tree order, which is not
  // the same as decoration order once line decorations and inline
  // replacements interleave, and an unsorted set throws.
  return Decoration.set(decorations, true)
}

/**
 * The block pass: tables, from a `StateField`.
 *
 * `EditorView.decorations.from` a field rather than a plugin, and
 * that is not a style choice — CodeMirror throws
 * `Block decorations may not be specified via plugins` if you try
 * it the other way, because replacing four lines with one element
 * changes the block structure the viewport is measured against.
 * The whole document is scanned every time, which is what the
 * plugin's `visibleRanges` optimisation buys back for everything
 * else.
 */
const toTableDecorations = (state: EditorState) => {
  const isRawMode = state.field(
    livePreviewRawModeField,
    false,
  )

  const { hasDocumentSemantics } = toOptions(state)

  const selections =
    state.field(isEditorFocusedField, false) &&
    !hasDocumentSemantics
      ? state.selection.ranges.map((range) => ({
          from: range.from,
          to: range.to,
        }))
      : []

  const text = state.doc.toString()

  return Decoration.set(
    toLivePreviewTableRanges({
      isRawMode: isRawMode ?? false,
      selections,
      text,
      tree: syntaxTree(state),
    }).map((range) =>
      Decoration.replace({
        // Whole lines, which is what `block` requires — and also
        // what makes the table a paragraph in the flow rather than
        // a very tall character.
        block: true,
        widget: new TableWidget(
          text.slice(range.from, range.to),
          range.rows,
          range.from,
          hasDocumentSemantics,
        ),
      }).range(range.from, range.to),
    ),
    true,
  )
}

const livePreviewTableField =
  StateField.define<DecorationSet>({
    create: toTableDecorations,
    update: (decorations, transaction) => {
      if (
        transaction.docChanged ||
        transaction.selection !== undefined ||
        transaction.effects.some(
          (effect) =>
            effect.is(setLivePreviewRawMode) ||
            effect.is(setIsEditorFocused),
        ) ||
        // A `Compartment` reconfigure — `MarkdownView` turning its
        // checkboxes on or off — arrives as neither a doc change
        // nor an effect this field would otherwise notice.
        transaction.startState.facet(livePreviewOptions) !==
          transaction.state.facet(livePreviewOptions) ||
        // Parsing is incremental and time-sliced, so a long
        // document's tables arrive over several transactions that
        // change nothing else. Comparing the tree by identity is
        // the cheap way to notice.
        syntaxTree(transaction.state) !==
          syntaxTree(transaction.startState)
      ) {
        return toTableDecorations(transaction.state)
      }

      return decorations
    },
    provide: (field) => EditorView.decorations.from(field),
  })

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = toDecorations(view)
    }

    update(update: ViewUpdate) {
      // Selection is in the list because concealment depends on the
      // caret: moving it with an arrow key changes what is painted
      // even though the document did not change.
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        // Focus is a decoration input now — see `toDecorations`.
        update.focusChanged ||
        update.transactions.some((transaction) =>
          transaction.effects.some((effect) =>
            effect.is(setLivePreviewRawMode),
          ),
        ) ||
        // The same `Compartment` reconfigure the block pass watches
        // for: a checkbox that just became operable is a widget
        // that has to be rebuilt.
        update.startState.facet(livePreviewOptions) !==
          update.state.facet(livePreviewOptions)
      ) {
        this.decorations = toDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)

/**
 * Step *into* a table with the arrow keys.
 *
 * CodeMirror moves the caret over a block widget, not through it:
 * pressing Down on the line above a rendered table lands on the
 * line below it, and the table's markdown is unreachable without a
 * mouse. That is fine for a widget with nothing to edit inside;
 * this one is four lines of the user's own text.
 *
 * So the vertical move is inspected before it happens, and when it
 * would jump a table, the caret is put at that table's edge
 * instead — the near edge, so Down enters at the top and Up enters
 * at the bottom. The table stands down on the next update and the
 * pipes are there with the caret already in them.
 *
 * Only for a collapsed selection: Shift+Down is *selecting* across
 * the table, where jumping it is right — the text is still in the
 * document and still in the selection.
 */
const toTableStep =
  (isForward: boolean) => (view: EditorView) => {
    const { main } = view.state.selection

    if (!main.empty) {
      return false
    }

    const destination = view.moveVertically(
      main,
      isForward,
    ).head

    const from = Math.min(main.head, destination)

    const to = Math.max(main.head, destination)

    if (from === to) {
      return false
    }

    let target: number | null = null

    view.state
      .field(livePreviewTableField)
      .between(from, to, (rangeFrom, rangeTo) => {
        target = isForward ? rangeFrom : rangeTo

        return false
      })

    if (target === null) {
      return false
    }

    view.dispatch({
      scrollIntoView: true,
      selection: { anchor: target },
    })

    return true
  }

/**
 * `Prec.high` because the default keymap also binds these, and the
 * first handler that returns `true` wins. Registration order in the
 * extension array is not a promise about precedence.
 */
const tableStepKeymap = Prec.high(
  keymap.of([
    { key: "ArrowDown", run: toTableStep(true) },
    { key: "ArrowUp", run: toTableStep(false) },
  ]),
)

/**
 * Open the link under the pointer.
 *
 * Plain click, not Ctrl+click, and that is Obsidian's behaviour
 * rather than VS Code's — in a surface where the markup is hidden,
 * a link that looks like a link should act like one. The cost is
 * that clicking link *text* cannot place the caret there; arrow
 * into it from the edge, or use the raw-markdown toggle. That is
 * the same trade Obsidian makes and it is documented in the mdx.
 *
 * `noopener` is not optional: `target="_blank"` without it hands
 * the opened page a live `window.opener` back into this one.
 */
const openLinkOnClick = EditorView.domEventHandlers({
  mousedown: (event) => {
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return false
    }

    const url = target
      .closest(`[${URL_ATTRIBUTE}]`)
      ?.getAttribute(URL_ATTRIBUTE)

    if (!url) {
      return false
    }

    event.preventDefault()

    window.open(url, "_blank", "noopener,noreferrer")

    return true
  },
})

/**
 * The paint.
 *
 * Headings scale here — which is the one thing the textarea
 * version could never do, because a `<textarea>` and a layer behind
 * it only stay registered while every glyph keeps its advance
 * width. CodeMirror owns the caret, so size is free.
 */
const livePreviewTheme = EditorView.theme({
  /**
   * Prose is proportional, and only code is monospaced.
   *
   * The textarea sibling has no choice here — its painted layer only
   * stays registered with the caret while every glyph keeps its
   * advance width, which in practice means one monospaced family for
   * the whole document. This surface has no such constraint, and a
   * description full of prose set in a code font is the single
   * biggest thing that makes an editor *feel* like a code editor
   * rather than like a document.
   *
   * It has to be `.cm-scroller`, not `&`. CodeMirror's own base
   * theme sets `font-family: monospace` there, and a rule on the
   * wrapper loses to it — silently, and it looks like the token
   * failed to resolve rather than like a specificity problem.
   */
  ".cm-scroller": {
    fontFamily: "var(--font-sans)",
  },
  /**
   * …except in raw mode, where monospace is the honest choice:
   * "Markdown source" is a *source* view, and source is code.
   */
  "&.cm-md-raw .cm-scroller": {
    fontFamily: "var(--font-mono)",
  },
  ".cm-md-blockquote": {
    borderInlineStart:
      "3px solid var(--color-intent-accent-border)",
    color: "var(--color-content-secondary)",
    paddingInlineStart: "0.75em",
  },
  ".cm-md-code": {
    color: "var(--color-intent-info-content)",
    fontFamily: "var(--font-mono)",
  },
  ".cm-md-codeblock": {
    backgroundColor: "var(--color-surface-sunken)",
    fontFamily: "var(--font-mono)",
  },
  ".cm-md-emphasis": {
    fontStyle: "italic",
  },
  ".cm-md-heading1": {
    fontSize: "1.75em",
    fontWeight: "700",
    lineHeight: "1.25",
  },
  ".cm-md-heading2": {
    fontSize: "1.5em",
    fontWeight: "700",
    lineHeight: "1.3",
  },
  ".cm-md-heading3": {
    fontSize: "1.25em",
    fontWeight: "600",
    lineHeight: "1.35",
  },
  ".cm-md-heading4": {
    fontSize: "1.1em",
    fontWeight: "600",
  },
  ".cm-md-heading5": {
    fontWeight: "600",
  },
  ".cm-md-heading6": {
    color: "var(--color-content-secondary)",
    fontWeight: "600",
  },
  ".cm-md-image": {
    borderRadius: "var(--radius-md)",
    display: "inline-block",
    maxWidth: "100%",
    verticalAlign: "top",
  },
  ".cm-md-link": {
    color: "var(--color-intent-accent-content)",
    cursor: "pointer",
    textDecoration: "underline",
  },
  /**
   * The read view's links are real anchors, so they are in the tab
   * order — and a focus ring is the whole reason that is worth
   * having. CodeMirror injects its own stylesheet and nothing here
   * is DOM Tailwind scans, so the ring is written from the same
   * custom properties the `focus-visible` utilities generate.
   */
  ".cm-md-link:focus-visible": {
    borderRadius: "var(--radius-sm)",
    outline:
      "var(--focus-ring-width) solid var(--color-focus-ring)",
    outlineOffset: "var(--focus-ring-offset)",
  },
  /**
   * The dimmed marker.
   *
   * A token role, never `opacity`. Fading text over a themed
   * background composites to a colour nobody audited, and axe
   * measures the composited value — `content-secondary` at 60% came
   * out at 3.77:1 in the sibling component and failed AA.
   */
  ".cm-md-marker": {
    color: "var(--color-content-muted)",
  },
  ".cm-md-strikethrough": {
    color: "var(--color-content-secondary)",
    textDecoration: "line-through",
  },
  ".cm-md-strong": {
    fontWeight: "700",
  },
  /**
   * The *editing* view of a table: the pipes, monospaced so the
   * columns line up as typed. This is what the caret reveals, and
   * what raw mode shows.
   */
  ".cm-md-table": {
    fontFamily: "var(--font-mono)",
  },
  ".cm-md-table-rendered": {
    borderCollapse: "collapse",
  },
  ".cm-md-table-rendered td, .cm-md-table-rendered th": {
    border: "1px solid var(--color-border-subtle)",
    cursor: "text",
    /**
     * Undo the editor's own wrapping rules inside a cell.
     *
     * `.cm-lineWrapping` sets `overflow-wrap: anywhere` so a long
     * unbroken line cannot escape the gutter, and a table cell
     * inherits it — which in the Narrow View broke `Port` across
     * two lines as `Por` / `t`. A cell wraps at spaces like prose,
     * and breaks a word only when the word alone will not fit.
     */
    overflowWrap: "break-word",
    padding: "var(--space-1) var(--space-2)",
    verticalAlign: "top",
    whiteSpace: "normal",
    wordBreak: "normal",
  },
  /**
   * A blank cell still owns a row's worth of height.
   *
   * Without it a row whose cells are all empty collapses to its
   * padding and the table looks like it lost a row — which, in a
   * surface where a blank cell is how you say "nothing here yet",
   * is the wrong answer to a legitimate table.
   */
  ".cm-md-table-rendered td:empty::after, .cm-md-table-rendered th:empty::after":
    {
      content: '"\\200b"',
    },
  /**
   * No `text-align` here: the delimiter row aligns the header cell
   * along with its column, and that is set inline per cell. A rule
   * would be dead code that looks like it is doing the work.
   */
  ".cm-md-table-rendered th": {
    backgroundColor: "var(--color-surface-sunken)",
    fontWeight: "var(--font-weight-semibold)",
  },
  /**
   * A read view's table takes no click, so it stops advertising
   * one. `cursor: text` on a cell is a promise that clicking there
   * puts a caret in the markdown behind it, and there is no
   * markdown behind it to reach.
   */
  ".cm-md-table-static .cm-md-table-rendered td, .cm-md-table-static .cm-md-table-rendered th":
    {
      cursor: "auto",
    },
  /** A focusable box says so when it has focus. */
  ".cm-md-table-static:focus-visible": {
    borderRadius: "var(--radius-sm)",
    outline:
      "var(--focus-ring-width) solid var(--color-focus-ring)",
    outlineOffset: "var(--focus-ring-offset)",
  },
  /**
   * The scroll box, not the table.
   *
   * A table wider than the editor has to go somewhere. Letting it
   * overflow puts columns under the gutter or off the edge of a
   * wrapped line; scrolling the block is the same answer every
   * document renderer lands on, and it keeps the *editor* from
   * scrolling sideways as a whole.
   */
  ".cm-md-table-scroll": {
    margin: "var(--space-2) 0",
    maxWidth: "100%",
    overflowX: "auto",
  },
  ".cm-md-task": {
    accentColor: "var(--color-intent-accent-solid)",
    marginInlineEnd: "0.35em",
    verticalAlign: "middle",
  },
  ".cm-md-url": {
    color: "var(--color-content-muted)",
  },
})

/**
 * Everything the live-preview surface needs, as one extension.
 *
 * Order matters only in that the theme must be present for the
 * decoration classes to mean anything; CodeMirror resolves the rest.
 */
/**
 * Raw mode, as a class on the editor, so the theme above can react
 * to it in CSS instead of every rule becoming a decoration.
 */
const rawModeClass = EditorView.editorAttributes.of(
  (view) =>
    view.state.field(livePreviewRawModeField, false)
      ? { class: "cm-md-raw" }
      : null,
)

export const livePreview = (
  options: LivePreviewOptions = {},
): Extension => [
  livePreviewOptions.of(options),
  livePreviewRawModeField,
  isEditorFocusedField,
  focusTracker,
  // The block pass, before the plugin: a field's decorations are
  // resolved first anyway, but declaring it first keeps the reading
  // order the same as the drawing order.
  livePreviewTableField,
  livePreviewPlugin,
  livePreviewTheme,
  /**
   * The two extensions a **document** does not get, and both are
   * absences with a reason rather than an oversight.
   *
   * `openLinkOnClick` exists because the editor's links are painted
   * `<span>`s that a `mousedown` has to translate into a
   * navigation. A document's links are real `<a href>` elements, so
   * installing this as well would open every link twice — once from
   * the handler and once from the browser.
   *
   * `tableStepKeymap` steps the *caret* into a rendered table so its
   * markdown can be reached. A document has no caret and nothing
   * behind the table to reach.
   */
  options.hasDocumentSemantics
    ? []
    : [openLinkOnClick, tableStepKeymap],
  rawModeClass,
]
