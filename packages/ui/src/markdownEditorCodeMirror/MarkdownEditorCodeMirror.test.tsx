import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./MarkdownEditorCodeMirror.stories.tsx"

const { AllStates, CaretReveal, Default } =
  composeStories(stories)

/**
 * The two ways this surface stopped behaving like the `<textarea>`
 * it replaced. Both are invisible to every other gate: the stories
 * render, the toolbar works, axe is clean, and the field is still
 * one you cannot see the caret in and cannot click into.
 */

/**
 * Every `caret-color` this element is actually told, in cascade
 * order, ignoring the suite's own override.
 *
 * A computed style cannot answer this question **here**:
 * `FREEZE_MOTION_CSS` forces `caret-color: transparent !important`
 * on `*` for the whole `ui-dom` suite, deliberately, because a
 * blinking caret is a pixel diff that means nothing. So the test
 * reads the declarations instead — which is the honest subject
 * anyway, since what regressed is *whose rule wins*.
 */
const caretDeclarationsFor = (element: Element) => {
  const declarations: string[] = []

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null

    try {
      rules = sheet.cssRules
    } catch {
      // A cross-origin sheet throws on access and has nothing to
      // say about a CodeMirror caret.
      continue
    }

    for (const rule of Array.from(rules ?? [])) {
      if (!(rule instanceof CSSStyleRule)) {
        continue
      }

      const value =
        rule.style.getPropertyValue("caret-color")

      if (
        value === "" ||
        // The suite's own freeze, which is not part of the
        // component's cascade.
        rule.selectorText.includes("*")
      ) {
        continue
      }

      if (element.matches(rule.selectorText)) {
        declarations.push(value)
      }
    }
  }

  return declarations
}

/**
 * CodeMirror hard-codes the caret **black** for any editor whose
 * theme did not declare itself dark — and Charcuterie's is one
 * theme for both schemes, because every colour in it is a token. So
 * the editor is always `cm-light`, and in dark mode the caret was
 * black on `surface-base`:
 *
 *   *"this comments area has a black blinking cursor in dark mode
 *   that I can't see."*
 *
 * It is `caret-color` and not `.cm-cursor` because `drawSelection`
 * is **not** installed on this surface: the caret is the browser's
 * own, so the property the browser reads is the only lever. Last
 * declaration wins at equal specificity — two classes each — and
 * the base theme is `Prec.lowest`, which is what puts it first in
 * the sheet.
 */
test("the caret is a token, not CodeMirror's black", async () => {
  const { canvas } = await mountStory(CaretReveal)

  const content = canvas.getByRole("textbox", {
    name: "Description",
  })

  const declarations = caretDeclarationsFor(content)

  await expect(declarations.at(-1)).toBe(
    "var(--color-content-primary)",
  )
})

/**
 * The whole box takes a click, because the whole box IS the text
 * field:
 *
 *   *"the markdown box isn't a textarea, it's an input field or
 *   something. It should be the whole box that's clickable to type
 *   into."*
 *
 * `.cm-content` is the `contenteditable`, and it used to be as tall
 * as its text — one line, in an empty field inside an 8rem frame.
 * Everything below it belonged to the wrapper `<div>`, so the
 * bottom three quarters of a text field focused nothing.
 *
 * The number is the frame's own minimum (`min-h-32`), so this fails
 * on any change that puts the minimum back on a box the caret does
 * not live in.
 */
test("an empty field's text area fills the frame", async () => {
  const { canvas } = await mountStory(AllStates)

  const content = canvas.getByRole("textbox", {
    name: "Empty description",
  })

  await waitFor(() => {
    expect(
      content.getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(128)
  })
})

/** And the point three quarters of the way down an empty field
 * belongs to the document rather than to the frame around it. */
test("a click low in an empty field lands in the document", async () => {
  const { canvas } = await mountStory(AllStates)

  const content = canvas.getByRole("textbox", {
    name: "Empty description",
  })

  const box = content.getBoundingClientRect()

  const hit = document.elementFromPoint(
    box.left + box.width / 2,
    box.bottom - 8,
  )

  await expect(content.contains(hit)).toBe(true)

  await userEvent.click(content)

  await expect(
    content === document.activeElement ||
      content.contains(document.activeElement),
  ).toBe(true)
})

/**
 * The other end of the same change: filling the frame must not
 * turn the frame into a scroll box.
 *
 * A description is read in place, and an editor that keeps its own
 * 8rem window over a 40-line document is the shape this surface
 * exists to avoid. The frame grows instead — which is what
 * `min-height: auto` on a flex item preserves, and what a `height`
 * anywhere in this stack would have quietly taken away.
 */
test("a document taller than the frame grows it", async () => {
  const { canvas } = await mountStory(Default)

  const content = canvas.getByRole("textbox", {
    name: "Description",
  })

  const scroller = content.parentElement as HTMLElement

  await waitFor(() => {
    expect(
      content.getBoundingClientRect().height,
    ).toBeGreaterThan(128)
  })

  await expect(scroller.scrollHeight).toBe(
    scroller.clientHeight,
  )
})
