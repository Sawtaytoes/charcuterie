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
  AccentEdge,
  AllStates,
  CardMenuItems,
  Default,
  InBoardScreen,
  Interactive,
  MarkdownTitles,
  LinkedLaneHeadings,
  MoveHandleByWidth,
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

/**
 * A linkable column title is a **link inside the heading**, never a
 * heading replaced by a link.
 *
 * The distinction is the whole reason `href` is a prop rather than a
 * widened `label`: swap the `<h3>` for an `<a>` and the lane stops
 * having a heading, the `group` loses the element it is named by,
 * and the document outline gains a hole that no gate but a screen
 * reader would notice.
 */
test("a lane heading with an href is a link inside a real heading", async () => {
  const { canvas } = await mountStory(LinkedLaneHeadings)

  const board = expectAgentDrivable(canvas, {
    name: "Today",
    role: "region",
  })

  for (const [laneKey, laneLabel] of [
    ["todo", "Todo"],
    ["in-progress", "In Progress"],
    ["review", "Needs Review"],
  ]) {
    // Still a named group — the heading did not stop being the
    // thing that names it.
    expectAgentDrivable(canvas, {
      name: laneLabel,
      role: "group",
    })

    const heading = canvas.getByRole("heading", {
      level: 3,
      name: laneLabel,
    })

    const link = within(heading).getByRole("link", {
      name: laneLabel,
    })

    await expect(link).toHaveAttribute(
      "href",
      `/board/${laneKey}`,
    )
  }

  await expectNoAxeViolations(board)
})

/**
 * The lane label is still a string everywhere else it is used, and
 * a linked heading must not have changed that. The move menu, the
 * segmented control and the truncation line all interpolate it.
 */
test("a linked lane still names itself in the move menu and the overflow line", async () => {
  const { canvas } = await mountStory(LinkedLaneHeadings)

  await expect(
    canvas.getByText("+ 11 more in Needs Review"),
  ).toBeInTheDocument()
})

/**
 * A rich title draws the markdown and still NAMES the card's
 * controls after the words.
 *
 * The move handle is the assertion that matters. It is named after
 * `item.title`, and if a board ever let `titleContent` stand in for
 * that, thirty handles would go back to being thirty controls called
 * "Move" — the exact regression `BoardCard`'s own comment says the
 * name exists to prevent.
 */
test("a titleContent title still names the move handle", async () => {
  const { canvas } = await mountStory(MarkdownTitles)

  await expect(
    canvas.getByRole("link", {
      name: "Deduplicate ~/archive by content hash",
    }),
  ).toBeInTheDocument()

  await expect(
    canvas.getByRole("button", {
      name: "Move Deduplicate ~/archive by content hash, currently in In Progress",
    }),
  ).toBeInTheDocument()
})

test("the board adds no link of its own around a rich title", async () => {
  const { canvasElement } = await mountStory(MarkdownTitles)

  await expect(canvasElement.querySelector("a a")).toBe(
    null,
  )
})

/**
 * Extra card actions share the existing move menu. A second
 * trigger would make the card look busy and would split related
 * actions across two controls, so the component owns the separator
 * between the lane destinations and the consumer's items.
 */
test("a card can append an action to its existing menu", async () => {
  const { body, canvas } = await mountStory(CardMenuItems)

  const todo = expectAgentDrivable(canvas, {
    name: "Todo",
    role: "group",
  })

  await userEvent.click(
    within(todo).getByRole("button", {
      name: /^Move Retire the second scheduler/,
    }),
  )

  const menu = await waitFor(() =>
    expectAgentDrivable(body, {
      name: /Move Retire the second scheduler/,
      role: "menu",
    }),
  )

  expect(
    within(menu).getByRole("menuitem", {
      name: "In Progress",
    }),
  ).toBeInTheDocument()
  expect(
    within(menu).getByRole("menuitem", {
      name: "Send to Backlog",
    }),
  ).toBeInTheDocument()
  expect(menu.querySelector("hr")).not.toBeNull()
})

/**
 * The edge is drawn on the card's OWN box, which is the whole
 * difference between it and the `accentIntent` pill.
 *
 * A pill is a `w-1` span inside the card: a straight rectangle
 * beside a rounded box, which is the notch three apps grew
 * independently before `Card` took the shape over. The edge is a
 * pseudo-element taking `border-radius: inherit`, so it is correct
 * in both of a board card's shapes without being told which one it
 * is in — a straight stripe down a row that has no corner, and a
 * wrapped bar once the lane passes `cq-lg`.
 *
 * The class is what is asserted rather than a painted pixel: the
 * bar is a `box-shadow` on a `::before`, and the radius it inherits
 * comes from a container query the runner's own width does not
 * decide. `cardAccentEdge.test.ts` owns what the class contains.
 */
test("draws a project's colour on the card's own edge", async () => {
  const { canvas } = await mountStory(AccentEdge)

  const cards = canvas
    .getAllByRole("listitem")
    .filter(
      (item: HTMLElement) => item.dataset.boardCard != null,
    )

  expect(cards.length).toBeGreaterThan(0)

  for (const card of cards) {
    // The overlay, and the radius it takes from the card.
    expect(card.className).toContain("before:absolute")
    expect(card.className).toContain(
      "before:rounded-[inherit]",
    )

    // A categorical colour, never an intent — an edge is an
    // identity and an intent is a claim about what happens.
    expect(card.className).toMatch(
      /before:shadow-\[inset_3px_0_0_var\(--color-categorical-\d+-solid\)\]/,
    )

    // And it never eats a press on the card it covers.
    expect(card.className).toContain(
      "before:pointer-events-none",
    )
  }

  // The colour reaches a screen reader as words. Each card names
  // its project through `accentLabel`, so the bar is not the only
  // channel carrying the fact.
  expect(
    canvas.getAllByText("Ferry Docs").length,
  ).toBeGreaterThan(1)

  await expectNoAxeViolations(
    canvas.getByRole("region", {
      name: "Today, by project",
    }),
  )
})

/**
 * The handle wears the gesture that can succeed, and nothing else.
 *
 * This is the bug QueuePilot shipped twice, from both directions. A
 * `≡` grip in a one-lane board taught a drag with nowhere to land —
 * *"There's no right-click or anything. How do I move these?"* — and
 * taking the grip away at every width broke the wide board, where
 * dragging is exactly what a person reaches for.
 *
 * Both affordances are in the DOM at both widths and CSS decides,
 * so this asserts on what is PAINTED. A container query is the only
 * honest way to ask: the two boards below sit in a 72rem frame and a
 * 24rem frame inside one window that never moves.
 */
test("a wide board's handle is the app's grip, not the word", async () => {
  const { canvas } = await mountStory(MoveHandleByWidth)

  const handle = within(
    canvas.getByRole("region", {
      name: "Today, wide enough to drag",
    }),
  ).getByRole("button", {
    name: "Move Retire the second scheduler and fold its jobs into the broker, currently in Todo",
  })

  await expect(
    within(handle).getByText("Move"),
  ).not.toBeVisible()

  await expect(handle.querySelector("svg")).toBeVisible()

  // And it is still the SQUARE icon button it was before the word
  // joined it in the DOM. `sizing` is a prop and cannot be two
  // values, so the button is `control`-sized underneath and takes
  // `ICON_CONTROL_SIZE_CLASS`'s width and `px-0` back at this width.
  // Getting that wrong costs every card in every lane ~20px of
  // title, silently — this board renders pixel-identically to the
  // one before the change, and that is the assertion.
  await expect(handle.offsetWidth).toBe(handle.offsetHeight)
})

test("a one-lane board's handle says Move, whatever the app passed", async () => {
  const { canvas } = await mountStory(MoveHandleByWidth)

  const handle = within(
    canvas.getByRole("region", {
      name: "Today, one lane at a time",
    }),
  ).getByRole("button", {
    name: "Move Retire the second scheduler and fold its jobs into the broker, currently in Todo",
  })

  await expect(
    within(handle).getByText("Move"),
  ).toBeVisible()

  await expect(
    handle.querySelector("svg"),
  ).not.toBeVisible()
})

/**
 * The name is the same sentence at both widths, and that is the
 * point of putting the whole of it in a `VisuallyHidden` while both
 * visible affordances are `aria-hidden`.
 *
 * Left to the visible text, the handle would be called "Move X"
 * wide and "Move Move X" narrow — one control with two names, one
 * `getByRole` query that works in one layout and not the other, and
 * a screen-reader user hearing the word twice.
 */
test("the handle has one name at both widths", async () => {
  const { canvas } = await mountStory(MoveHandleByWidth)

  await expect(
    canvas.getAllByRole("button", {
      name: "Move Retire the second scheduler and fold its jobs into the broker, currently in Todo",
    }),
  ).toHaveLength(2)
})
