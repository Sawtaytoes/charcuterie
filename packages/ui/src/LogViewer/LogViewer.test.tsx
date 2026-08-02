import { composeStories } from "@storybook/react"
import { expect, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./LogViewer.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  InsideDisclosure,
  Interactive,
} = composeStories(stories)

test("the pane is named, and is a log", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  // Found by its name, not by a `data-log-id`. mux-magic's pane
  // carries one of those — a `data-testid` under a different name,
  // which this package's `sourceRules.test.ts` bans as a practice
  // rather than as a spelling.
  const pane = expectAgentDrivable(canvas, {
    name: "Bay 3 rip log",
    role: "log",
  })

  await expect(pane).toHaveTextContent(
    "AACS handshake complete",
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * The fix for mux-magic's defect, asserted as the behaviour rather
 * than as the precondition. Its auto-scroll runs in an effect with
 * **empty deps** — once, on mount, when the pane is empty and
 * `scrollHeight` is `clientHeight` — so every line after it arrives
 * below the fold.
 */
test("a full pane is scrolled to the bottom", async () => {
  const { canvas } = await mountStory(Interactive)

  const pane = expectAgentDrivable(canvas, {
    name: "Bay 8 rip log",
    role: "log",
  })

  // The precondition — that there *is* something to scroll. On its
  // own this proves nothing, which is the lesson `Tabs` learned the
  // expensive way from `scrollWidth > clientWidth`.
  await expect(pane.scrollHeight).toBeGreaterThan(
    pane.clientHeight,
  )

  // And the behaviour: it is actually at the end.
  await waitFor(() => {
    expect(
      pane.scrollHeight -
        pane.scrollTop -
        pane.clientHeight,
    ).toBeLessThan(4)
  })
})

/**
 * The same defect, rebuilt out of two components that are each
 * individually right — and the reason `LogViewer` watches its own box
 * rather than trusting one mount measurement.
 *
 * `AccordionSection` renders `hidden` rather than unmounting, because
 * the fleet's panels hold log panes and an unmounted panel loses its
 * scroll position and its subscription. A `hidden` subtree has no
 * layout box, so the mount effect reads `scrollHeight 0` and writes
 * `scrollTop = 0` — and the effect's dependencies, `isFollowing` and
 * the lines, are both unchanged by the reveal. Measured in mux-magic
 * on a 60-line pane:
 *
 * ```
 * while collapsed : scrollTop 0   scrollHeight 0     clientHeight 0
 * after expanding : scrollTop 0   scrollHeight 976   clientHeight 254
 * ```
 *
 * mux-magic worked around it downstream, in `DisclosedLogViewer`, by
 * not mounting the pane until the section had been opened once. This
 * test is that workaround becoming deletable.
 */
test("a pane revealed by a disclosure follows the tail", async () => {
  const { canvas } = await mountStory(InsideDisclosure)

  // `hidden: true` because that is the whole precondition: the pane
  // is in the accessibility tree's shadow, and in the layout tree not
  // at all.
  const pane = canvas.getByRole("log", {
    hidden: true,
    name: "Bay 9 rip log",
  })

  // Not a rhetorical assertion. If a future `AccordionSection`
  // unmounts its panel instead, or stops using `hidden`, this test
  // silently stops testing anything — so it fails here instead.
  await expect(pane.scrollHeight).toBe(0)

  expectAgentDrivable(canvas, {
    name: "Bay 9 output",
    role: "button",
  }).click()

  await waitFor(() => {
    expect(pane.scrollHeight).toBeGreaterThan(
      pane.clientHeight,
    )
  })

  await waitFor(() => {
    expect(
      pane.scrollHeight -
        pane.scrollTop -
        pane.clientHeight,
    ).toBeLessThan(4)
  })
})

/**
 * Following is pinned to the user's own position. Scrolling back to
 * read the line that mentioned an error must not be undone twice a
 * second — which is what the naive fix (scroll to bottom on every
 * render) does.
 */
test("scrolling away stops the follow and offers a way back", async () => {
  const { canvas } = await mountStory(Interactive)

  const pane = expectAgentDrivable(canvas, {
    name: "Bay 8 rip log",
    role: "log",
  })

  await expect(
    canvas.queryAllByRole("button", {
      name: "Jump to latest",
    }),
  ).toHaveLength(0)

  pane.scrollTop = 0

  pane.dispatchEvent(new Event("scroll", { bubbles: true }))

  const jump = await waitFor(() =>
    expectAgentDrivable(canvas, {
      name: "Jump to latest",
      role: "button",
    }),
  )

  jump.click()

  await waitFor(() => {
    expect(
      pane.scrollHeight -
        pane.scrollTop -
        pane.clientHeight,
    ).toBeLessThan(4)
  })
})

/**
 * A live log emitting a line every 300 ms is a screen reader that
 * cannot be interrupted. `role="log"` is correct; `aria-live` is off
 * unless the lines *are* the outcome.
 */
test("a log does not announce itself unless asked", async () => {
  const { canvas } = await mountStory(AllVariants)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay 1 rip log",
      role: "log",
    }),
  ).toHaveAttribute("aria-live", "off")

  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay 5 result",
      role: "log",
    }),
  ).toHaveAttribute("aria-live", "polite")
})

test("maxLines drops the oldest lines from the DOM", async () => {
  const { canvas } = await mountStory(AllVariants)

  const capped = expectAgentDrivable(canvas, {
    name: "Bay 4 rip log",
    role: "log",
  })

  // A rip emits a line every few hundred milliseconds for an hour,
  // and the browser keeps every node.
  await expect(capped.querySelectorAll("p")).toHaveLength(
    10,
  )

  // The *last* ten, not the first — a log you have to scroll up
  // through to reach the newest line is backwards.
  await expect(capped).toHaveTextContent(
    "Reading sector 120832",
  )
})

test("a scrollable pane is reachable by keyboard", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  // Chrome made scrollers focusable automatically in 2024; Firefox
  // and Safari have not. Without it a keyboard user can see the pane
  // and cannot scroll it.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay 7 rip log",
      role: "log",
    }).tabIndex,
  ).toBe(0)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Bay 6 rip log",
      role: "log",
    }),
  ).toHaveTextContent("Waiting for output…")

  await expectNoAxeViolations(canvasElement)
})
