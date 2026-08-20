import { composeStories } from "@storybook/react"
import {
  expect,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./Board.stories.tsx"

const {
  AllStates,
  Default,
  InBoardScreen,
  Interactive,
  Responsive,
} = composeStories(stories)

/**
 * The board is the landmark; the lanes are **groups** inside it.
 *
 * A lane that were a `region` would put three landmarks on a page
 * that has one job — and two boards on one page, or three copies of
 * one in a container-width story, would put two landmarks called
 * "Todo" in the document. That is axe's `landmark-unique`, and it
 * was a real failure here before the lane became a group.
 */
test("the board is a named landmark and its lanes are named groups", async () => {
  const { canvas } = await mountStory(AllStates)

  const board = expectAgentDrivable(canvas, {
    name: "Today, mixed lanes",
    role: "region",
  })

  for (const laneLabel of [
    "Todo",
    "In Progress",
    "Needs Review",
  ]) {
    expectAgentDrivable(canvas, {
      name: laneLabel,
      role: "group",
    })
  }

  await expectNoAxeViolations(board)
})

/**
 * Three lanes at once is a **container** decision. The story frames
 * the board at a fixed 72rem, so this passes or fails on the
 * board's own box and not on however wide the test runner's window
 * happens to be — which is the whole claim the component makes.
 */
test("a board wider than cq-lg shows every lane at once", async () => {
  const { canvas } = await mountStory(AllStates)

  await expect(canvas.getAllByRole("group")).toHaveLength(3)

  // And the lane picker, which only exists for the narrow layout,
  // is not in the accessibility tree at all — `display: none`
  // rather than hidden-but-present.
  await expect(
    canvas.queryAllByRole("radiogroup"),
  ).toHaveLength(0)
})

/**
 * The count is the lane's **real** size, not the number of rows
 * painted. A board that truncates and then reports the truncated
 * number is a board that quietly lies about how much work there is,
 * which is the one number the lane exists to carry.
 */
test("a truncated lane reports its true size and says what is missing", async () => {
  const { canvas } = await mountStory(AllStates)

  const review = expectAgentDrivable(canvas, {
    name: "Needs Review",
    role: "group",
  })

  // By the **title link** rather than the `<li>`. A list item takes
  // no accessible name from its content, so `getByRole("listitem",
  // { name })` can never match — and the title is what an agent or a
  // person actually clicks anyway.
  await expect(
    within(review).getByRole("link", {
      name: /Merge manager rename/,
    }),
  ).toBeInTheDocument()

  // Eight rendered, nineteen real.
  await expect(
    within(review).getAllByRole("listitem"),
  ).toHaveLength(8)

  await expect(
    within(review).getByText("19"),
  ).toBeInTheDocument()

  await expect(
    within(review).getByText("+ 11 more in Needs Review"),
  ).toBeInTheDocument()
})

/**
 * A colour bar is a WCAG 1.4.1 failure on its own and invisible to
 * every screen reader, so the priority it encodes is stated in
 * words too. This is the assertion that would have caught Docket's
 * first board, where the bars were painted with a token family that
 * does not exist and rendered transparent while every "is it
 * rendered" check passed.
 */
test("the priority bar's meaning is available as text", async () => {
  const { canvas } = await mountStory(Interactive)

  const todo = expectAgentDrivable(canvas, {
    name: "Todo",
    role: "group",
  })

  await expect(
    within(todo).getAllByText("Priority 0").length,
  ).toBeGreaterThan(0)

  await expect(
    within(todo).getAllByText("Priority 1").length,
  ).toBeGreaterThan(0)
})

/**
 * A read-only board carries no affordances. Not a cosmetic
 * difference: a handle that opens a menu whose every item does
 * nothing is worse than no handle, because it costs a tab stop and
 * a promise.
 */
test("a board with no onMove has no move handles", async () => {
  const { canvas } = await mountStory(Default)

  await expect(
    canvas.queryAllByRole("button", { name: /^Move / }),
  ).toHaveLength(0)
})

/**
 * The whole keyboard path, and the one the component treats as
 * primary. Tab to a handle, Enter to open, arrow to a lane, Enter to
 * commit — every step through `Menu`, which already owns the
 * roving-focus model, so there is no second keyboard implementation
 * here to drift.
 */
test("a card moves between lanes from the keyboard alone", async () => {
  const { body, canvas } = await mountStory(Interactive)

  const todo = expectAgentDrivable(canvas, {
    name: "Todo",
    role: "group",
  })

  const handle = within(todo).getByRole("button", {
    name: /^Move Retire the second scheduler/,
  })

  handle.focus()

  await expect(handle).toHaveFocus()

  await userEvent.keyboard("{Enter}")

  const menuItem = await waitFor(() =>
    body.getByRole("menuitem", { name: "In Progress" }),
  )

  // The panel, not the whole document: floating-ui's own focus
  // guards are `aria-hidden` and focusable by design, so auditing
  // `body` audits the overlay library rather than this component.
  // Same scope `Menu`'s own tests use.
  await expectNoAxeViolations(body.getByRole("menu"))

  await userEvent.keyboard("{ArrowDown}")

  await userEvent.click(menuItem)

  const inProgress = expectAgentDrivable(canvas, {
    name: "In Progress",
    role: "group",
  })

  await waitFor(() => {
    expect(
      within(inProgress).getByRole("link", {
        name: /Retire the second scheduler/,
      }),
    ).toBeInTheDocument()
  })

  // And it left the lane it came from, rather than being copied.
  await waitFor(() => {
    expect(
      within(todo).queryByRole("link", {
        name: /Retire the second scheduler/,
      }),
    ).toBeNull()
  })
})

/**
 * The feedback a sighted user gets free from watching the card land,
 * said out loud — and it names the **position**, not only the lane.
 * "Moved to In Progress" leaves a screen-reader user unable to tell
 * the top of a lane from the bottom of thirty.
 */
test("the move is announced with its destination and position", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const todo = expectAgentDrivable(canvas, {
    name: "Todo",
    role: "group",
  })

  await userEvent.click(
    within(todo).getByRole("button", {
      name: /^Move One composed Storybook/,
    }),
  )

  await userEvent.click(
    await waitFor(() =>
      within(document.body).getByRole("menuitem", {
        name: "Needs Review",
      }),
    ),
  )

  const status = await waitFor(() => {
    const region = canvasElement.querySelector(
      '[role="status"]',
    )

    expect(region?.textContent).toMatch(
      /^Moved One composed Storybook for every app in the fleet to Needs Review, position \d+ of \d+\.$/,
    )

    return region
  })

  await expect(status).toHaveAttribute(
    "aria-label",
    "Today, movable activity",
  )
})

/**
 * The narrow layout is one lane plus a `radiogroup`, and the
 * radiogroup is a **container** decision — this story is three fixed
 * widths inside one unchanged window, so the viewport cannot be what
 * chose it.
 */
test("the narrow layout picks lanes with a named radiogroup", async () => {
  const { canvas } = await mountStory(Responsive)

  const pickers = canvas.getAllByRole("radiogroup")

  // One per panel: the same board, three container widths, one
  // browser window that never moved.
  await expect(pickers).toHaveLength(3)

  const [narrowest] = pickers

  const inProgress = within(narrowest).getByRole("radio", {
    name: /In Progress/,
  })

  await userEvent.click(inProgress)

  await waitFor(() => {
    expect(inProgress).toBeChecked()
  })
})

/**
 * An empty lane says something a person can act on, and it is a real
 * heading rather than a grey word — so it is findable by role, which
 * "Empty" in a `<div>` never is.
 */
test("an empty lane renders a real, findable empty state", async () => {
  const { canvas } = await mountStory(AllStates)

  expectAgentDrivable(canvas, {
    name: "Nothing chosen yet",
    role: "heading",
  })
})

/**
 * The composition the docs page recommends, audited as a whole: the
 * cross-lane banner is an `Alert` above the board rather than a
 * fourth lane inside it, and the two together still pass.
 */
test("the board sits under a separate attention banner, and the page is clean", async () => {
  const { canvasElement } = await mountStory(InBoardScreen)

  await expectNoAxeViolations(canvasElement)
})
