import { forceParsing } from "@codemirror/language"
import { EditorView } from "@codemirror/view"

/**
 * Parse every CodeMirror document under `root` to its end, now, so the
 * decorations a test asserts on are drawn before it looks.
 *
 * This is the readiness signal for anything CodeMirror decorates — a
 * heading, a link, a task box, a table. Those are drawn from the
 * syntax tree, and CodeMirror does **not** finish that tree on mount.
 * It parses for about 20 ms when the state is created, and hands the
 * rest to a background worker that waits at least 100 ms, and up to
 * 500 ms, between slices. On a quiet machine the first 20 ms covers a
 * story's document. On a shared CI runner the same 20 ms of wall time
 * covers less of it, the worker takes over, and a `findBy` with
 * Testing Library's 1 s default is a race against that schedule.
 * `MarkdownView > a checkbox is inert until a consumer says where the
 * tick goes` lost that race in the narrow window on 2026-10-13; three
 * other tests in the file had already been given a `findBy` or a
 * `waitFor` for the same reason.
 *
 * `forceParsing` runs the same parser to the end of the document and
 * dispatches the finished tree, so the component's own decoration
 * passes run exactly as they would after the worker — only without
 * the wait. It is not a fake: nothing in the component is stubbed.
 *
 * The budget is unbounded because a story's document is a few dozen
 * lines; a parse that does not finish is a hang the test's own
 * timeout reports.
 */
export const finishCodeMirrorParsing = (
  root: ParentNode,
): void => {
  for (const element of root.querySelectorAll<HTMLElement>(
    ".cm-editor",
  )) {
    const view = EditorView.findFromDOM(element)

    if (view !== null) {
      forceParsing(
        view,
        view.state.doc.length,
        Number.POSITIVE_INFINITY,
      )
    }
  }
}
