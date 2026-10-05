import { composeStories } from "@storybook/react"
import {
  expect,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { test } from "vitest"
import { userEvent as browserUserEvent } from "vitest/browser"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./HtmlEditor.stories.tsx"
import { ORIGINAL_HTML } from "./htmlDocument.storyHelpers.ts"

const {
  Playground,
  Interactive,
  AllStates,
  Hostile,
  Blank,
  Responsive,
} = composeStories(stories)

const pressAction = async (
  canvas: ReturnType<typeof within>,
  body: ReturnType<typeof within>,
  name: string,
) => {
  const action = canvas.queryByRole("button", { name })
  if (action) {
    await userEvent.click(action)
    return
  }
  await userEvent.click(
    canvas.getByRole("button", { name: "More actions" }),
  )
  await userEvent.click(body.getByRole("button", { name }))
}

test("formatting a selection emits rich HTML and announces the active format", async () => {
  const { canvas, body } = await mountStory(Interactive)
  const editor = await canvas.findByRole("textbox", {
    name: "Saved notes",
  })
  await userEvent.click(editor)
  await browserUserEvent.keyboard("{Control>}a{/Control}")
  await pressAction(canvas, body, "Bold")
  await expect(
    editor.querySelector("strong"),
  ).toHaveTextContent("Original & untouched")
  await expect(
    canvas.getByRole("button", { name: "Bold" }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    canvas.getByLabelText("Stored HTML"),
  ).toHaveTextContent("<strong>")
})

test("link dialog rejects script schemes; canceling does not edit the document", async () => {
  const { canvas, body } = await mountStory(Interactive)
  const editor = await canvas.findByRole("textbox", {
    name: "Saved notes",
  })
  await userEvent.click(editor)
  await browserUserEvent.keyboard("{Control>}a{/Control}")
  await pressAction(canvas, body, "Edit link")
  const dialog = body.getByRole("dialog", {
    name: "Edit link",
  })
  const fields = within(dialog)
  await waitFor(() =>
    expect(
      fields.getByRole("textbox", { name: "URL" }),
    ).toHaveFocus(),
  )
  await userEvent.type(
    fields.getByRole("textbox", { name: "URL" }),
    "javascript:attack()",
  )
  await userEvent.click(
    fields.getByRole("button", { name: "Apply" }),
  )
  await expect(
    fields.getByText("Enter a safe link URL."),
  ).toBeInTheDocument()
  await expect(
    canvas.getByLabelText("Submitted HTML").textContent,
  ).toBe("")
  await expectNoAxeViolations(dialog)
  await userEvent.click(
    fields.getByRole("button", { name: "Cancel" }),
  )
  await expect(
    canvas.getByText("Document edits: 0"),
  ).toBeInTheDocument()
  await expect(
    canvas.getByLabelText("Stored HTML"),
  ).toHaveTextContent(ORIGINAL_HTML)
})

test("applying a safe relative link edits the draft without submitting its record form", async () => {
  const { canvas, body } = await mountStory(Interactive)
  const editor = await canvas.findByRole("textbox", {
    name: "Saved notes",
  })
  await userEvent.click(editor)
  await browserUserEvent.keyboard("{Control>}a{/Control}")
  await pressAction(canvas, body, "Edit link")
  const dialog = body.getByRole("dialog", {
    name: "Edit link",
  })
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "URL" }),
    "/recipe",
  )
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Apply" }),
  )
  await expect(editor.querySelector("a")).toHaveAttribute(
    "href",
    "/recipe",
  )
  await expect(editor.querySelector("a")).toHaveTextContent(
    "Original & untouched",
  )
  await expect(
    canvas.getByLabelText("Submitted HTML").textContent,
  ).toBe("")
  await userEvent.click(
    canvas.getByRole("button", { name: "Save notes" }),
  )
  await expect(
    canvas.getByLabelText("Submitted HTML").textContent,
  ).toBe(canvas.getByLabelText("Stored HTML").textContent)
})

test("the editor and shared toolbar are named controls with keyboard access", async () => {
  const { canvas, canvasElement } =
    await mountStory(Playground)
  await waitFor(() =>
    expectAgentDrivable(canvas, {
      role: "textbox",
      name: "Notes",
    }),
  )
  expectAgentDrivable(canvas, {
    role: "toolbar",
    name: "HTML formatting",
  })
  await expect(
    canvas.getByRole("textbox", { name: "Notes" }),
  ).toHaveAttribute("aria-multiline", "true")
  await expectNoAxeViolations(canvasElement)
})

test("mount, focus, selection, blur and an untouched form submission preserve exact original HTML", async () => {
  const { canvas } = await mountStory(Interactive)
  const editor = await canvas.findByRole("textbox", {
    name: "Saved notes",
  })
  await userEvent.click(editor)
  await userEvent.keyboard("{ArrowRight}{ArrowLeft}")
  await userEvent.click(
    canvas.getByRole("button", { name: "Save notes" }),
  )
  await expect(
    canvas.getByLabelText("Stored HTML"),
  ).toHaveTextContent(ORIGINAL_HTML)
  await expect(
    canvas.getByLabelText("Submitted HTML"),
  ).toHaveTextContent(ORIGINAL_HTML)
  await expect(
    canvas.getByText("Document edits: 0"),
  ).toBeInTheDocument()
})

test("external defaults never overwrite the document; real edits emit HTML and keep undo/redo", async () => {
  const { canvas } = await mountStory(Interactive)
  const editor = await canvas.findByRole("textbox", {
    name: "Saved notes",
  })
  await userEvent.click(
    canvas.getByRole("button", {
      name: "Change external default",
    }),
  )
  await expect(editor).toHaveTextContent(
    "Original & untouched",
  )
  await expect(
    canvas.getByText("Document edits: 0"),
  ).toBeInTheDocument()
  await userEvent.click(editor)
  await browserUserEvent.keyboard(
    "{Control>}{End}{/Control} plus",
  )
  await waitFor(() =>
    expect(
      canvas.getByLabelText("Stored HTML"),
    ).toHaveTextContent("plus"),
  )
  await browserUserEvent.keyboard("{Control>}z{/Control}")
  await expect(editor).not.toHaveTextContent("plus")
  await browserUserEvent.keyboard(
    "{Control>}{Shift>}z{/Shift}{/Control}",
  )
  await expect(editor).toHaveTextContent("plus")
  await expect(
    canvas.getByLabelText("Stored HTML"),
  ).not.toHaveTextContent("data-old-format")
})

test("read-only and disabled editors refuse typing and formatting", async () => {
  const { canvas } = await mountStory(AllStates)
  const readOnly = await canvas.findByRole("textbox", {
    name: "Read-only notes",
  })
  await expect(readOnly).toHaveAttribute(
    "contenteditable",
    "false",
  )
  await expect(readOnly).toHaveAttribute(
    "aria-readonly",
    "true",
  )
  const disabled = canvas.getByRole("textbox", {
    name: "Disabled notes",
  })
  await expect(disabled).toHaveAttribute(
    "aria-disabled",
    "true",
  )
  await expect(disabled).toHaveAttribute("tabindex", "-1")
  await expect(
    within(
      canvas.getByRole("toolbar", {
        name: "Read-only note formatting",
      }),
    ).getByRole("button", { name: "Bold" }),
  ).toBeDisabled()
  const required = canvas.getByRole("textbox", {
    name: "Required notes",
  })
  await expect(required).toHaveAttribute(
    "aria-invalid",
    "true",
  )
  await expect(required).toHaveAttribute(
    "aria-required",
    "true",
  )
})

test("initial untrusted HTML is filtered before entering the editing DOM", async () => {
  const { canvas } = await mountStory(Hostile)
  const editor = await canvas.findByRole("textbox", {
    name: "Untrusted notes",
  })
  await expect(editor).toHaveTextContent("Visible notes")
  await expect(
    editor.querySelector(
      "script,style,iframe,svg,math,[onclick],[onerror],a[href],img",
    ),
  ).toBeNull()
})

test("rich clipboard HTML crosses the same safe policy before it becomes a document edit", async () => {
  const { canvas } = await mountStory(Blank)
  const editor = await canvas.findByRole("textbox", {
    name: "New notes",
  })
  await userEvent.click(editor)
  const data = new DataTransfer()
  data.setData(
    "text/html",
    '<p onclick="attack()"><strong>Pasted</strong> notes<a href="java&#x09;script:attack()">unsafe</a></p><img src="javascript:attack()" onerror="attack()"><script>attack()</script>',
  )
  editor.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }),
  )
  await expect(editor).toHaveTextContent(
    "Pasted notesunsafe",
  )
  await expect(
    editor.querySelector("strong"),
  ).toHaveTextContent("Pasted")
  await expect(
    editor.querySelector(
      "script,img,[onclick],[onerror],a[href]",
    ),
  ).toBeNull()
})

test("a narrow container uses the shared toolbar overflow without page overflow", async () => {
  const { canvas } = await mountStory(Responsive)
  for (const editor of await canvas.findAllByRole(
    "textbox",
  ))
    await expect(editor.scrollWidth).toBeLessThanOrEqual(
      editor.clientWidth + 1,
    )
})
