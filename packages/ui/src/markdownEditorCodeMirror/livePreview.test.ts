import {
  markdown,
  markdownLanguage,
} from "@codemirror/lang-markdown"
import { Language, syntaxTree } from "@codemirror/language"
import {
  EditorState,
  type Transaction,
} from "@codemirror/state"
import { expect, test } from "vitest"

import {
  isInlineDecorationStale,
  livePreview,
} from "./livePreview.ts"

const toUpdate = (transaction: Transaction) => ({
  docChanged: transaction.docChanged,
  selectionSet: transaction.selection !== undefined,
  viewportChanged: false,
  focusChanged: false,
  transactions: [transaction],
  startState: transaction.startState,
  state: transaction.state,
})

/**
 * A parse step with nothing else in it, the way CodeMirror's own
 * background worker delivers one: `Language.setState` carrying a new
 * `LanguageState` over the same, further-advanced parse context.
 *
 * Both are internal to `@codemirror/language`, which is why this is
 * spelled out rather than hidden in a helper. The alternative — a
 * real `EditorView` racing a real idle callback — is what made the
 * VRT story flake, and a test that only fails when the runner is
 * slow is the same flake with a different name.
 */
const parseFurther = (state: EditorState) => {
  const internals = Language as unknown as {
    setState: { of: (value: unknown) => never }
    state: Parameters<EditorState["field"]>[0]
  }
  const current = state.field(internals.state) as {
    constructor: new (context: unknown) => unknown
    context: {
      work: (time: number, upto: number) => boolean
    }
  }
  current.context.work(5000, state.doc.length)

  return state.update({
    effects: internals.setState.of(
      new current.constructor(current.context),
    ),
  })
}

test("a parse step alone makes the inline decorations stale", () => {
  const doc =
    "Read [the runbook](https://example.invalid) first.\n\n".repeat(
      3000,
    )
  const state = EditorState.create({
    doc,
    extensions: [
      markdown({ base: markdownLanguage }),
      livePreview(),
    ],
  })

  // The precondition the whole test rests on: the first parse stops
  // short of the end, as it does on any long document.
  expect(syntaxTree(state).length).toBeLessThan(doc.length)

  const idle = state.update({})

  expect(isInlineDecorationStale(toUpdate(idle))).toBe(
    false,
  )

  const parsed = parseFurther(state)

  expect(parsed.docChanged).toBe(false)
  expect(syntaxTree(parsed.state).length).toBe(doc.length)
  expect(isInlineDecorationStale(toUpdate(parsed))).toBe(
    true,
  )
})
