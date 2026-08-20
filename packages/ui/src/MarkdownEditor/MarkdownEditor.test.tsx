import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./MarkdownEditor.stories.tsx"

const {
  AllStates,
  AllVariants,
  Blank,
  Default,
  Interactive,
  NoUpload,
  Responsive,
} = composeStories(stories)

type Canvas = Awaited<
  ReturnType<typeof mountStory>
>["canvas"]

const getEditor = (canvas: Canvas, name: string) =>
  canvas.getByRole("textbox", {
    name,
  }) as HTMLTextAreaElement

/**
 * A **harness** artifact, and it exists nowhere in the product.
 *
 * `user-event` keeps its own shadow copy of a control's value and
 * applies the next keystroke against *that* rather than against the
 * DOM. An edit the component made through
 * `document.execCommand("insertText")` — which is the entire reason
 * the native undo stack survives — never passes through the `value`
 * setter it intercepts, so its copy goes stale and the next typed
 * character lands at an offset from two edits ago.
 *
 * Re-assigning `.value` is what resets that copy. A browser has no
 * second opinion about what is in a textarea, so nothing like this
 * is needed outside a test.
 */
const resyncHarness = (editor: HTMLTextAreaElement) => {
  const { selectionEnd, selectionStart, value } = editor

  editor.value = value

  editor.setSelectionRange(selectionStart, selectionEnd)
}

/**
 * The surface is a real `<textarea>`, which is where every keyboard
 * and screen-reader property in this component comes from: caret
 * movement, word-wise selection, `Home`/`End`, IME composition, the
 * platform's own undo stack, `role="textbox"` and
 * `aria-multiline="true"`. A `contenteditable` starts with none of
 * them.
 */
test("the surface is a real textbox an agent can find", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Description",
    role: "textbox",
  })

  const editor = getEditor(canvas, "Description")

  await expect(editor.tagName).toBe("TEXTAREA")

  await expect(editor.tabIndex).toBeGreaterThanOrEqual(0)

  await expectNoAxeViolations(canvasElement)
})

test("the toolbar is one tab stop with arrow keys inside it", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Markdown formatting",
    role: "toolbar",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * **The point of the whole component.**
 *
 * Type a value full of the characters that tempt HTML escaping,
 * read the stored string back, and there must be no tag, no entity,
 * and no transformation of any kind. The guarantee is structural
 * rather than policed: a `<textarea>` takes `text/plain` off the
 * clipboard, every command returns markdown, and the painted layer
 * emits text nodes — so there is no code path that could produce a
 * tag even if somebody wanted one.
 */
test("markdown goes in and the same markdown comes out", async () => {
  const { canvas } = await mountStory(Blank)

  const editor = getEditor(canvas, "Description")

  const dangerous =
    "<script>alert('x')</script> & <b>b</b> \"q\" 'a' 5 < 6 > 4 &amp; &lt;"

  await userEvent.click(editor)

  await userEvent.paste(dangerous)

  await expect(editor.value).toBe(dangerous)

  await expect(editor.value).not.toContain("&lt;script")

  // The painted layer beside it is text nodes, not markup — so the
  // tag is on screen as four characters rather than executing.
  const layer = editor.parentElement?.querySelector(
    "[aria-hidden='true']",
  )

  await expect(layer?.textContent).toBe(dangerous)

  await expect(layer?.querySelector("script")).toBe(null)

  await expect(layer?.querySelector("b")).toBe(null)
})

/**
 * The invariant the painted layer rests on: it holds the *same
 * characters in the same order* as the textarea, or the caret
 * drifts away from the glyphs it is supposed to be sitting between.
 */
test("the painted layer holds exactly the textarea's text", async () => {
  const { canvas } = await mountStory(Default)

  const editor = getEditor(canvas, "Description")

  const layer = editor.parentElement?.querySelector(
    "[aria-hidden='true']",
  )

  await expect(layer?.textContent).toBe(editor.value)
})

/**
 * Metric neutrality, asserted rather than hoped for. The painted
 * layer may only use styling that leaves a glyph's advance width
 * alone — `text-shadow` faux bold, colour, underline — because
 * anything that changes it shears the caret away from the letters.
 * A future edit swapping the faux bold for a real `font-bold` is
 * exactly what this catches.
 */
test("emphasis does not change the text's width", async () => {
  const { canvas } = await mountStory(NoUpload)

  const editor = getEditor(canvas, "Description")

  const layer = editor.parentElement?.querySelector(
    "[aria-hidden='true']",
  ) as HTMLElement

  const measure = (className: string) => {
    const probe = document.createElement("span")

    probe.className = className

    probe.textContent = "measurement"

    probe.style.whiteSpace = "pre"

    layer.append(probe)

    const width = probe.getBoundingClientRect().width

    probe.remove()

    return width
  }

  const plain = measure("text-content-primary")

  for (const className of [
    "text-content-primary [text-shadow:0.02em_0_0_currentColor,-0.02em_0_0_currentColor]",
    "italic text-content-primary",
    "text-intent-accent-content underline",
    "text-content-secondary line-through",
    "text-content-muted",
  ]) {
    await expect(
      Math.abs(measure(className) - plain),
    ).toBeLessThan(0.5)
  }
})

/**
 * The "raw syntax on the cursor's line" behaviour, in the one form
 * this medium allows: markers cannot be *hidden* without moving the
 * text, so they change contrast instead — accent on the caret's
 * line, muted everywhere else.
 */
test("the caret's line reveals its markers", async () => {
  const { canvas } = await mountStory(Blank)

  const editor = getEditor(canvas, "Description")

  await userEvent.click(editor)

  await userEvent.paste("**one**\n**two**")

  const layer = editor.parentElement?.querySelector(
    "[aria-hidden='true']",
  ) as HTMLElement

  const getMarkerClasses = () =>
    Array.from(layer.querySelectorAll("span"))
      .filter((span) => span.textContent === "**")
      .map((span) => span.className)

  // The caret is on the last line after the paste.
  await waitFor(() => {
    const classes = getMarkerClasses()

    expect(classes).toHaveLength(4)

    expect(classes.slice(0, 2)).toEqual([
      "text-content-muted",
      "text-content-muted",
    ])

    expect(classes.slice(2)).toEqual([
      "text-intent-accent-content",
      "text-intent-accent-content",
    ])
  })

  // Move to the first line and the reveal follows the caret.
  editor.setSelectionRange(1, 1)

  editor.dispatchEvent(
    new KeyboardEvent("keyup", { bubbles: true }),
  )

  await waitFor(() => {
    expect(getMarkerClasses().slice(0, 2)).toEqual([
      "text-intent-accent-content",
      "text-intent-accent-content",
    ])
  })
})

/**
 * Keyboard-only editing, driven the way a keyboard user drives it:
 * no clicks on the toolbar, no pointer at all.
 */
test("every format has a shortcut, and Tab is never captured", async () => {
  const { canvas } = await mountStory(Blank)

  const editor = getEditor(canvas, "Description")

  await userEvent.click(editor)

  await userEvent.paste("word")

  editor.setSelectionRange(0, 4)

  await userEvent.keyboard("{Control>}b{/Control}")

  await expect(editor.value).toBe("**word**")

  await userEvent.keyboard("{Control>}b{/Control}")

  await expect(editor.value).toBe("word")

  editor.setSelectionRange(0, 4)

  await userEvent.keyboard("{Control>}i{/Control}")

  await expect(editor.value).toBe("_word_")

  editor.setSelectionRange(0, 6)

  await userEvent.keyboard("{Control>}k{/Control}")

  await expect(editor.value).toBe("[_word_]()")

  // Tab leaves. A multi-line field on a form is exactly where
  // somebody tabs onward, and capturing it is WCAG 2.1.2's
  // keyboard trap.
  await userEvent.tab()

  await expect(document.activeElement).not.toBe(editor)
})

test("Enter continues a list and clears an empty item", async () => {
  const { canvas } = await mountStory(Blank)

  const editor = getEditor(canvas, "Description")

  await userEvent.click(editor)

  await userEvent.paste("- one")

  await userEvent.keyboard("{Enter}")

  await expect(editor.value).toBe("- one\n- ")

  resyncHarness(editor)

  await userEvent.keyboard("two{Enter}")

  await expect(editor.value).toBe("- one\n- two\n- ")

  await userEvent.keyboard("{Enter}")

  await expect(editor.value).toBe("- one\n- two\n")
})

/**
 * **Undo, asserted at the mechanism rather than the behaviour.**
 *
 * Assigning a whole new `value` wipes the browser's undo stack, and
 * Ctrl+Z afterwards jumps past everything the user typed — so every
 * programmatic edit goes through `document.execCommand("insertText")`,
 * the one API that appends to that stack.
 *
 * The *behaviour* cannot be tested here and it is worth saying why
 * rather than leaving a weaker test looking like a strong one:
 * `user-event` has no undo implementation, so a
 * `{Control>}z{/Control}` is three key events and nothing else. It
 * would pass against a component that had no undo at all. What can
 * be asserted is the route taken, and that is what a regression
 * here would actually change.
 */
test("an edit is applied through the platform's own undo-aware path", async () => {
  const { canvas } = await mountStory(Blank)

  const editor = getEditor(canvas, "Description")

  const calls: string[] = []

  const original = document.execCommand.bind(document)

  // `isShowingUi`, not the DOM's own `showUI`: the `is`/`has` rule
  // has no external-API carve-out, and this is a parameter name we
  // are choosing rather than a key on someone else's object.
  document.execCommand = (
    commandId: string,
    isShowingUi?: boolean,
    argument?: string,
  ) => {
    calls.push(commandId)

    return original(commandId, isShowingUi, argument)
  }

  try {
    await userEvent.click(editor)

    await userEvent.keyboard("word")

    editor.setSelectionRange(0, 4)

    await userEvent.keyboard("{Control>}b{/Control}")

    await expect(editor.value).toBe("**word**")

    await expect(calls).toContain("insertText")
  } finally {
    document.execCommand = original
  }
})

test("the toolbar drives the same commands", async () => {
  const { body, canvas, canvasElement } =
    await mountStory(Blank)

  const editor = getEditor(canvas, "Description")

  await userEvent.click(editor)

  await userEvent.paste("one\ntwo")

  editor.setSelectionRange(0, 7)

  // The bar collapses **by measurement**, so at this width most of
  // the actions live in the overflow menu — which is exactly the
  // Narrow View path and therefore the one worth driving.
  const action =
    canvas.queryByRole("button", {
      name: "Bulleted list",
    }) ??
    (await (async () => {
      await userEvent.click(
        canvas.getByRole("button", {
          name: "More actions",
        }),
      )

      return body.getByRole("menuitem", {
        name: "Bulleted list",
      })
    })())

  await userEvent.click(action)

  await waitFor(() => {
    expect(editor.value).toBe("- one\n- two")
  })

  // Focus comes back to the surface, so the next thing typed lands
  // in the document rather than on the button.
  await expect(document.activeElement).toBe(editor)

  await expectNoAxeViolations(canvasElement)
})

/**
 * The component owns no storage. It hands over a `File`, waits, and
 * inserts whatever URL comes back — with a **markdown** placeholder
 * holding the spot meanwhile, because the user keeps typing during
 * an upload.
 */
test("a pasted image uploads and lands at the caret", async () => {
  const { canvas } = await mountStory(Interactive)

  const editor = getEditor(canvas, "Task description")

  await userEvent.click(editor)

  editor.setSelectionRange(0, 0)

  const dataTransfer = new DataTransfer()

  dataTransfer.items.add(
    new File(["binary"], "rack.png", {
      type: "image/png",
    }),
  )

  editor.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    }),
  )

  await waitFor(() => {
    expect(editor.value).toContain("![Uploading rack.png]")
  })

  await waitFor(() => {
    expect(editor.value).toContain(
      "![rack.png](https://example.invalid/blobs/rack.png)",
    )
  })

  await expect(editor.value).not.toContain("Uploading")

  // And it is still markdown, with no tag anywhere.
  await expect(editor.value).not.toContain("<img")
})

test("a dropped image takes the same path", async () => {
  const { canvas } = await mountStory(Interactive)

  const editor = getEditor(canvas, "Task description")

  const dataTransfer = new DataTransfer()

  dataTransfer.items.add(
    new File(["binary"], "shelf.png", {
      type: "image/png",
    }),
  )

  editor.dispatchEvent(
    new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }),
  )

  editor.dispatchEvent(
    new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }),
  )

  await waitFor(() => {
    expect(editor.value).toContain(
      "![shelf.png](https://example.invalid/blobs/shelf.png)",
    )
  })
})

/**
 * With no `onUploadImage` the paste is left entirely to the
 * browser, which is the correct fallback rather than a broken one:
 * a `<textarea>` ignores a pasted image on its own.
 */
test("without an upload callback an image paste is left alone", async () => {
  const { canvas } = await mountStory(NoUpload)

  const editor = getEditor(canvas, "Description")

  const before = editor.value

  const dataTransfer = new DataTransfer()

  dataTransfer.items.add(
    new File(["binary"], "ignored.png", {
      type: "image/png",
    }),
  )

  editor.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    }),
  )

  await expect(editor.value).toBe(before)
})

test("a read-only editor still paints and refuses edits", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const editor = getEditor(canvas, "Read-only description")

  await expect(editor).toHaveAttribute("readonly")

  const before = editor.value

  await userEvent.click(editor)

  await userEvent.keyboard("{Control>}b{/Control}")

  await expect(editor.value).toBe(before)

  await expectNoAxeViolations(canvasElement)
})

test("a disabled editor is disabled", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(
    getEditor(canvas, "Disabled description"),
  ).toBeDisabled()
})

/**
 * `Field` clones onto its one child, so the wiring has to reach the
 * `<textarea>` through `SlotProps` rather than stopping at this
 * component — the silent prop-drop `slotProps.ts` exists for.
 */
test("a Field names, describes and invalidates the surface", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const editor = canvas.getByRole("textbox", {
    name: "Task description",
  })

  await expect(editor).toHaveAttribute(
    "aria-invalid",
    "true",
  )

  await expect(editor).toHaveAttribute(
    "aria-required",
    "true",
  )

  const describedBy =
    editor.getAttribute("aria-describedby") ?? ""

  // The Field's error, and the editor's own hint, both — that join
  // is the entire reason `mergeSlotProps` exists.
  await expect(
    describedBy.split(" ").length,
  ).toBeGreaterThan(1)

  await expectNoAxeViolations(canvasElement)
})

test("every variant renders clean", async () => {
  const { canvasElement } = await mountStory(AllVariants)

  await expectNoAxeViolations(canvasElement)
})

/**
 * Three fixed container widths, side by side. The hint line is
 * `sr-only` below `--cq-sm` and painted above it — one element,
 * in the accessibility tree at every width, because
 * `display: none` would take it out and an `aria-describedby`
 * pointing at it would describe nothing.
 */
test("the hint stays described when the container is narrow", async () => {
  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const narrow = canvas.getByRole("textbox", {
    name: "Description at 15rem",
  })

  const hint = document.getElementById(
    narrow.getAttribute("aria-describedby") ?? "",
  )

  await expect(hint?.textContent).toContain("Ctrl+B")

  await expect(
    getComputedStyle(hint as Element).display,
  ).not.toBe("none")

  await expectNoAxeViolations(canvasElement)
})
