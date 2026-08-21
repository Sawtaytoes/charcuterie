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
import type { Extension, Range } from "@codemirror/state"
import { StateEffect, StateField } from "@codemirror/state"
import type {
  DecorationSet,
  ViewUpdate,
} from "@codemirror/view"
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view"

import type {
  LivePreviewLineKind,
  LivePreviewMarkKind,
} from "./livePreviewRanges.ts"
import { toLivePreviewRanges } from "./livePreviewRanges.ts"

/** Marks a rendered link so the click handler can find its target. */
const URL_ATTRIBUTE = "data-charcuterie-url"

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
  constructor(private readonly isChecked: boolean) {
    super()
  }

  eq(other: TaskWidget) {
    return other.isChecked === this.isChecked
  }

  toDOM(view: EditorView) {
    const checkbox = document.createElement("input")

    checkbox.type = "checkbox"

    checkbox.checked = this.isChecked

    checkbox.className = "cm-md-task"

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

const toDecorations = (view: EditorView): DecorationSet => {
  const isRawMode = view.state.field(
    livePreviewRawModeField,
    false,
  )

  const text = view.state.doc.toString()

  /**
   * An unfocused editor reveals nothing.
   *
   * Without this the caret's default resting place — offset 0 —
   * counts as "inside" whatever construct starts the document, so a
   * task whose description opens with a heading rendered its `#` on
   * load and no other heading's. It looked like a concealment bug
   * and was really a focus bug: there is no caret in the document
   * until someone puts one there.
   */
  const selections = view.hasFocus
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
              class: LINE_CLASSES[range.lineKind],
            }).range(range.from),
          )

          break
        }

        case "mark": {
          decorations.push(
            Decoration.mark({
              attributes: range.url
                ? { [URL_ATTRIBUTE]: range.url }
                : undefined,
              class: MARK_CLASSES[range.markKind],
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
              widget: new TaskWidget(range.isChecked),
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
        )
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
  ".cm-md-table": {
    fontFamily: "var(--font-mono)",
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

export const livePreview = (): Extension => [
  livePreviewRawModeField,
  livePreviewPlugin,
  livePreviewTheme,
  openLinkOnClick,
  rawModeClass,
]
