import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./MarkdownView.stories.tsx"

const {
  AllStates,
  Default,
  HostileMarkdown,
  Interactive,
  NestedLinkText,
  SameAsTheEditor,
} = composeStories(stories)

/**
 * The gap this component was built to close, as a red/green fact.
 *
 * `isReadOnly` on either editor leaves nine disabled buttons in a
 * `role="toolbar"` above the document — findable by a screen reader,
 * findable by an agent, and useless to both. A CSS `display: none`
 * in the consuming app was the workaround; an element that is not
 * there is the fix.
 */
test("there is no toolbar, not a hidden one", async () => {
  const { canvas } = await mountStory(Default)

  await expect(canvas.queryAllByRole("toolbar")).toEqual([])

  await expect(canvas.queryAllByRole("button")).toEqual([])

  // The side the CSS workaround could never reach: the editor's
  // toolbar collapses into an overflow **menu** at narrow widths, so
  // "hide the toolbar" left a menu button behind.
  await expect(canvas.queryAllByRole("menu")).toEqual([])
})

/**
 * A reader, not a text field.
 *
 * The role is the difference between heading navigation and being
 * dropped into forms mode with the whole document read as one flat
 * string — and the headings are the reason it matters, so both are
 * asserted together.
 */
test("it is an article whose headings are headings", async () => {
  const { canvas } = await mountStory(Default)

  const article = expectAgentDrivable(canvas, {
    name: "Description",
    role: "article",
  })

  await expect(article).toHaveAttribute(
    "contenteditable",
    "false",
  )

  await expect(
    canvas.getByRole("heading", {
      name: "Rack move, phase two",
    }),
  ).toHaveAttribute("aria-level", "1")

  await expect(
    canvas.getByRole("heading", {
      name: "Before the window",
    }),
  ).toHaveAttribute("aria-level", "2")

  await expectNoAxeViolations(article)
})

/**
 * The requirement that made this a component in the CodeMirror
 * subpath rather than a `react-markdown` reader in the barrel.
 *
 * Both surfaces get one string. The assertion is not "they look
 * similar" — it is that the constructs a second renderer would get
 * subtly wrong come out identical: the same table, the same cells,
 * the same task boxes, the same autolink.
 */
test("it renders what the editor renders", async () => {
  const { canvas } = await mountStory(SameAsTheEditor)

  const [viewTable, editorTable] =
    canvas.getAllByRole("table")

  await expect(viewTable).toBeDefined()

  await expect(editorTable).toBeDefined()

  const toCellText = (table: HTMLElement) =>
    Array.from(table.querySelectorAll("th, td")).map(
      (cell) => cell.textContent,
    )

  await expect(
    toCellText(viewTable as HTMLElement),
  ).toEqual(toCellText(editorTable as HTMLElement))

  // Three task boxes in each, and the first one ticked in each.
  const checkboxes: HTMLInputElement[] =
    canvas.getAllByRole("checkbox")

  await expect(checkboxes).toHaveLength(6)

  await expect(
    checkboxes.filter((checkbox) => checkbox.checked),
  ).toHaveLength(2)

  // The bare URL, autolinked on both sides with nothing typed
  // around it.
  await expect(
    canvas.getAllByText(
      "https://example.invalid/product?id=1234",
    ).length,
  ).toBe(2)
})

/**
 * A link a reader can reach, which the editor's cannot be.
 *
 * The editor paints a `<span>` and translates a `mousedown` into a
 * navigation, because an anchor inside a `contenteditable` fights
 * the caret for the line. A document has no caret, so the link is an
 * anchor: in the tab order, with an address the browser will show,
 * copy and open.
 */
test("a link is a real anchor in the tab order", async () => {
  const { canvas } = await mountStory(Interactive)

  const link = expectAgentDrivable(canvas, {
    name: "the runbook",
    role: "link",
  })

  await expect(link.tagName).toBe("A")

  await expect(link).toHaveAttribute(
    "href",
    "https://example.invalid/runbook",
  )

  // `target="_blank"` without `noopener` hands the opened page a
  // live handle back into this one.
  await expect(link).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  )

  // The document itself is not a tab stop — there is nothing in it
  // to operate — but every link in it is. Tab from the button above
  // lands on the first link rather than on the article.
  canvas.getByRole("button", { name: "Before" }).focus()

  await userEvent.tab()

  await expect(document.activeElement?.tagName).toBe("A")
})

/**
 * The answer to "is a checkbox interactive in a read-only view?",
 * asserted from both sides.
 *
 * Not offered by default, because two of the three surfaces this was
 * built for have nowhere to put a tick. Offered when the consumer
 * says where it goes, which is the same shape `onUploadImage` uses
 * on the editors.
 */
test("a checkbox is inert until a consumer says where the tick goes", async () => {
  const { canvas } = await mountStory(AllStates)

  const inert = canvas.getByRole("checkbox", {
    name: "Photograph the current cabling",
  })

  await expect(inert).toBeDisabled()

  const tickable = canvas.getByRole("checkbox", {
    name: "Close the change record",
  })

  await expect(tickable).not.toBeDisabled()

  await userEvent.click(tickable)

  // The tick reaches the *markdown* and comes back as state, which
  // is the round trip that matters: the box is a view over the
  // document, and the document is what the consumer stores.
  await waitFor(async () => {
    await expect(
      canvas.getByRole("checkbox", {
        name: "Close the change record",
      }),
    ).toBeChecked()
  })
})

/**
 * The document this thing will actually be pointed at.
 *
 * Three separate claims, and each one used to be false or was one
 * refactor away from it: a `javascript:` URL is not a link, a
 * `<script>` is text, and a `data:text/html` is not an image.
 */
test("hostile markdown renders as characters, not as behaviour", async () => {
  const { canvas, canvasElement } =
    await mountStory(HostileMarkdown)

  const hrefs = canvas
    .getAllByRole("link")
    .map((link: HTMLElement) => link.getAttribute("href"))

  await expect(hrefs).toEqual([
    "https://example.invalid/runbook",
  ])

  await expect(
    canvasElement.querySelector('[href^="javascript:"]'),
  ).toBeNull()

  // The whole `[text](javascript:…)` construct is left as source, so
  // the reader can see what the file tried to do.
  await expect(canvasElement.textContent).toContain(
    "[Looks like a link](javascript:",
  )

  // A `<script>` in the source is characters. There is no
  // `innerHTML` in this subpath for it to be anything else.
  await expect(
    canvasElement.querySelector("script"),
  ).toBeNull()

  await expect(canvasElement.textContent).toContain(
    "<script>",
  )

  // `<img src=x onerror=…>` — the tag is text, so there is no
  // element to fail to load.
  await expect(
    canvasElement.querySelector("img[onerror]"),
  ).toBeNull()

  // The only image markdown in the document names a
  // `data:text/html` URL, which is not an image URL. `[src]` and not
  // `img`, because CodeMirror parks its own source-less
  // `.cm-widgetBuffer` spacer beside every widget.
  await expect(
    canvasElement.querySelector("img[src]"),
  ).toBeNull()

  await expectNoAxeViolations(canvasElement)
})

/**
 * Selectable, which is most of what a reader does with a document.
 *
 * A `contenteditable="false"` surface can very easily be an
 * unselectable one — CodeMirror's own base theme is what makes it
 * not, and a theme rule here could take it away without anything
 * else noticing.
 */
test("the text can be selected", async () => {
  const { canvas } = await mountStory(Default)

  const article = canvas.getByRole("article")

  await expect(
    getComputedStyle(article).userSelect,
  ).not.toBe("none")

  const range = document.createRange()

  range.selectNodeContents(article)

  const selection = window.getSelection()

  selection?.removeAllRanges()

  selection?.addRange(range)

  await expect(selection?.toString()).toContain(
    "Rack move, phase two",
  )
})

/**
 * The blast radius, as a red/green fact.
 *
 * ``[`file.md`](path)`` produced a zero-length `linkText` range.
 * `Decoration.mark` throws on an empty range, CodeMirror answers a
 * throwing view plugin by destroying it, and destroying it takes
 * **every** decoration in the document — so one link in one bullet
 * dropped the whole file to raw markdown.
 *
 * The unit tests in `livePreviewRanges.test.ts` pin the range. This
 * pins the consequence, which is the part a range assertion cannot
 * see: that the heading three lines above the bad link still
 * renders.
 */
test("inline markup in link text does not drop the document to raw source", async () => {
  const { canvas } = await mountStory(NestedLinkText)

  // The canary. This heading has nothing to do with links, and it
  // is what stopped rendering when the plugin died.
  await expect(
    canvas.getByRole("heading", {
      name: "Where the fix landed",
    }),
  ).toHaveAttribute("aria-level", "2")

  // No raw source anywhere in the document.
  const article = canvas.getByRole("article")

  await expect(article.textContent).not.toContain("](")

  await expect(article.textContent).not.toContain("**")

  await expect(article.textContent).not.toContain("~~")
})

/**
 * Each nesting, reachable as a link by the text a reader sees —
 * with the markers gone, since those are concealed in a document.
 */
test.each([
  ["a code span", "livePreviewRanges.ts"],
  ["strong", "the runbook"],
  ["emphasis", "the older note"],
  ["strikethrough", "the retired page"],
  ["a mix", "read this first"],
  ["no nesting at all", "the index"],
])(
  "link text through %s is a reachable anchor",
  async (_case, name) => {
    const { canvas } = await mountStory(NestedLinkText)

    const link = expectAgentDrivable(canvas, {
      name,
      role: "link",
    })

    await expect(link.tagName).toBe("A")
  },
)
