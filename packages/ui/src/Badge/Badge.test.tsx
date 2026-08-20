import {
  composeStories,
  composeStory,
} from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import meta, * as stories from "./Badge.stories.tsx"

const {
  Categorical,
  CategoricalLabels,
  Default,
  Interactive,
  Responsive,
} = composeStories(stories)

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

// ---------------------------------------------------------------
// The categorical family
// ---------------------------------------------------------------

/**
 * The assertion this component most needs, and the one every other
 * test here structurally cannot make.
 *
 * Docket shipped `--color-danger-9` — a Radix-style step Charcuterie
 * has never had. It resolved to nothing, painted transparent, and
 * passed every "is the badge rendered" check in the suite, because
 * a rendered element with no background is still a rendered
 * element. `getByText` cannot see it. `toBeVisible` cannot see it.
 * The only thing that can is asking the browser what colour it
 * actually painted.
 */
const getPaintedColours = (badge: HTMLElement) => {
  const style = globalThis.getComputedStyle(badge)

  return {
    background: style.backgroundColor,
    border: style.borderTopColor,
    text: style.color,
  }
}

const TRANSPARENT = "rgba(0, 0, 0, 0)"

test("a categorical badge paints a real colour, not a name that resolves to nothing", async () => {
  const { canvas } = await mountStory(
    composeStory(
      { args: { categorical: 5, children: "Homelab" } },
      meta,
    ),
  )

  const badge = canvas.getByText("Homelab")
    .parentElement as HTMLElement

  const painted = getPaintedColours(badge)

  expect(painted.background).not.toBe(TRANSPARENT)

  expect(painted.border).not.toBe(TRANSPARENT)

  // …and it is *the token's* value, not merely some colour. A
  // utility resolving to an inherited or UA default would clear the
  // check above and still be the bug.
  const expected = globalThis
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--color-categorical-5-surface")
    .trim()

  expect(expected).toMatch(/^#[0-9A-Fa-f]{6}$/)

  const [red, green, blue] = [1, 3, 5].map((offset) =>
    Number.parseInt(expected.slice(offset, offset + 2), 16),
  )

  expect(painted.background).toBe(
    `rgb(${red}, ${green}, ${blue})`,
  )
})

test("ten indexes paint ten different colours", async () => {
  // The DOM half of the distinctness gate in `@charcuterie/tokens`.
  // That one measures the token values; this one measures what the
  // browser did with them, which is where an index silently falling
  // back to its neighbour's utility would show up.
  const { canvas } = await mountStory(Categorical)

  const solids = new Set(
    canvas
      .getAllByText(
        /^(Red|Orange|Amber|Lime|Green|Teal|Blue|Indigo|Purple|Pink)$/,
      )
      .map(
        (label: HTMLElement) =>
          getPaintedColours(
            label.parentElement as HTMLElement,
          ).background,
      ),
  )

  solids.delete(TRANSPARENT)

  // Three appearances x ten indexes, and `outline` is transparent
  // by design — so twenty painted fills, all different.
  expect(solids.size).toBe(20)
})

test("the same label name always gets the same colour", async () => {
  // The whole point of `getCategoricalIndex`: a hundred rows that
  // predate the feature need no migration, and the answer must not
  // move between renders, machines, or a server-rendered copy.
  const first = await mountStory(CategoricalLabels)

  const firstColour = getPaintedColours(
    first.canvas.getByText("Homelab")
      .parentElement as HTMLElement,
  ).background

  const second = await mountStory(CategoricalLabels)

  expect(
    getPaintedColours(
      second.canvas.getByText("Homelab")
        .parentElement as HTMLElement,
    ).background,
  ).toBe(firstColour)

  // And two different names do not all collapse onto one colour,
  // which a stable-but-useless hash would also satisfy.
  expect(
    getPaintedColours(
      second.canvas.getByText("Errands")
        .parentElement as HTMLElement,
    ).background,
  ).not.toBe(firstColour)
})

test("a categorical badge keeps every behaviour an intent badge has", async () => {
  // `overflow`, `size` and the clipping readout are the component's,
  // not the intent's — but a new prop threaded through a class map
  // is exactly where that quietly stops being true.
  const { canvasElement } = await mountStory(
    composeStory(
      {
        args: {
          categorical: 8,
          children: LONG_LABEL,
          overflow: "truncate",
        },
      },
      meta,
    ),
  )

  canvasElement.style.inlineSize = "10rem"

  const badge =
    canvasElement.firstElementChild as HTMLElement

  await waitFor(() => {
    expect(badge).toHaveAttribute("title", LONG_LABEL)
  })

  expect(badge.textContent).toBe(LONG_LABEL)
})
