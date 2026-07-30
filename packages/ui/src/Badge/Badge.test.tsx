import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import meta, * as stories from "./Badge.stories.tsx"

const { Default, Interactive, Responsive } =
  composeStories(stories)

test("the text is queryable, which is what an agent matches on", async () => {
  const { canvas } = await mountStory(Default)

  // No role, deliberately — a badge is a word about something else,
  // not a live region. So there is nothing to `getByRole` and the
  // text is the whole contract.
  await expect(canvas.getByText("running")).toBeVisible()
})

/**
 * The M2 join, driven: one `asyncTransitions` machine, one
 * `getAsyncIntent`, and a badge that cannot render a state the
 * machine does not have.
 */
test("the badge follows the status machine through a full cycle", async () => {
  const { canvas } = await mountStory(Interactive)

  await expect(canvas.getByText("Idle")).toBeVisible()

  await userEvent.click(
    canvas.getByRole("button", { name: "Start" }),
  )

  await expect(canvas.getByText("Loading…")).toBeVisible()

  await userEvent.click(
    canvas.getByRole("button", { name: "Succeed" }),
  )

  await expect(canvas.getByText("Done")).toBeVisible()

  await userEvent.click(
    canvas.getByRole("button", { name: "Reset" }),
  )

  await expect(canvas.getByText("Idle")).toBeVisible()
})

const LONG_LABEL =
  "quarantined — checksum mismatch on title 4"

/**
 * A container narrower than the label needs, which is the whole
 * point. The width goes on the canvas rather than on the badge —
 * constraining the badge itself would prove nothing about
 * `max-inline-size: 100%`, which is the fix under test.
 */
const mountInPanel = async (
  overflow: "truncate" | "wrap",
) => {
  const { canvasElement } = await mountStory(
    composeStory(
      { args: { children: LONG_LABEL, overflow } },
      meta,
    ),
  )

  canvasElement.style.inlineSize = "10rem"

  return {
    badge: canvasElement.firstElementChild as HTMLElement,
    container: canvasElement,
  }
}

test("a truncated badge never paints outside its container", async () => {
  const { badge, container } =
    await mountInPanel("truncate")

  const label = badge.firstElementChild as HTMLElement

  await waitFor(() => {
    expect(
      badge.getBoundingClientRect().width,
    ).toBeLessThanOrEqual(
      container.getBoundingClientRect().width,
    )
  })

  // Clipped — so an ellipsis is being painted.
  await expect(label.scrollWidth).toBeGreaterThan(
    label.clientWidth,
  )

  // …and yet the whole string is still there. `text-overflow` paints
  // the ellipsis, it does not insert one, so selection, copy, and
  // every screen reader still get all of it. This is the assertion
  // that would fail if anyone ever "fixed" truncation by slicing the
  // string in JavaScript.
  await expect(badge.textContent).toBe(LONG_LABEL)

  // And the visual half of the readout, for the pointer users who
  // cannot select it to find out.
  await waitFor(() => {
    expect(badge).toHaveAttribute("title", LONG_LABEL)
  })
})

test("a short badge gets no tooltip", async () => {
  const { canvasElement } = await mountStory(Default)

  // The measurement has to be able to say *no*, or `title` is just
  // unconditional and every pill in a bay list grows a tooltip.
  await waitFor(() => {
    expect(
      canvasElement.querySelector("[title]"),
    ).toBeNull()
  })
})

test("a wrapping badge grows taller rather than wider", async () => {
  const truncated = await mountInPanel("truncate")

  const truncatedHeight = truncated.badge.clientHeight

  const wrapped = await mountInPanel("wrap")

  await expect(wrapped.badge.clientHeight).toBeGreaterThan(
    truncatedHeight,
  )

  await expect(
    wrapped.badge.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(
    wrapped.container.getBoundingClientRect().width,
  )

  // Nothing is hidden in this mode, so nothing needs a tooltip.
  await waitFor(() => {
    expect(wrapped.badge).not.toHaveAttribute("title")
  })
})

test("the responsive board shows both modes at three widths", async () => {
  const { canvas } = await mountStory(Responsive)

  await expect(
    canvas.getAllByText(LONG_LABEL),
  ).toHaveLength(6)
})
