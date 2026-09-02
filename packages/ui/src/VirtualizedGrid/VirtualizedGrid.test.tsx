import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./VirtualizedGrid.stories.tsx"

/**
 * What windowing has to be true for.
 *
 * `chooseColumns.test.ts` already proves the column arithmetic and
 * `AdaptiveGrid.test.tsx` already proves it is fed real measured
 * numbers. Neither is re-proved here — this component calls the
 * same hook, and a second copy of those assertions would only
 * guarantee that a copy stays in step.
 *
 * What is new, and what these cover:
 *
 *  - **Far fewer elements exist than items.** The claim the
 *    component is for. Asserted as a bound rather than an exact
 *    count, because the exact count is viewport height divided by
 *    row height and would pin the test to the runner's window.
 *  - **The page is still as tall as the whole list.** A windowed
 *    grid that shortens its own scrollbar has traded one bug for a
 *    worse one. Here that height lives in `padding-block-end`.
 *  - **Scrolling swaps which rows exist.** The distinguishing
 *    test: a component that merely rendered the first N items
 *    would pass the two above and fail this one.
 *  - **The true length reaches assistive technology.**
 *    `aria-setsize` is the only thing standing between a reader
 *    and "list, 40 items" on a list of 2,000.
 *  - **An empty list reserves no space.** The state a filter lands
 *    on.
 *  - **A hidden panel measures nothing, and revealing it does not
 *    scroll.** The regression that took Docket's Triage tab bar off
 *    the top of the screen.
 */

const {
  AllStates,
  Default,
  InHiddenTabPanel,
  InShellScrollRegion,
} = composeStories(stories)

const getLists = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>("ul"),
]

const getList = (
  canvasElement: HTMLElement,
  index = 0,
): HTMLElement => {
  const list = getLists(canvasElement)[index]

  if (!list) {
    throw new Error(
      `No VirtualizedGrid at index ${index}; found ${getLists(canvasElement).length}.`,
    )
  }

  return list
}

const getCells = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>("li"),
]

/**
 * Which rows are mounted.
 *
 * `data-index` names a row and sits on every cell in it, so this
 * is a set rather than a list — several cells report the same row,
 * and that is the attribute working rather than a duplicate.
 */
const getRowIndexes = (canvasElement: HTMLElement) => [
  ...new Set(
    [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-index]",
      ),
    ].map((cell) => Number(cell.dataset.index)),
  ),
]

test("2,000 items mount as a few dozen cells", async () => {
  const { canvasElement } = await mountStory(Default)

  await waitFor(async () => {
    await expect(
      getCells(canvasElement).length,
    ).toBeGreaterThan(0)
  })

  // The bound is deliberately loose — the runner's window is
  // 414x896, and the honest claim is "two orders of magnitude
  // fewer", not a number that changes when someone resizes the
  // harness.
  await expect(getCells(canvasElement).length).toBeLessThan(
    200,
  )
})

test("the page is still as tall as the whole list", async () => {
  const { canvasElement } = await mountStory(Default)

  await waitFor(async () => {
    await expect(
      getRowIndexes(canvasElement).length,
    ).toBeGreaterThan(0)
  })

  // At the top of the list, everything still to come is
  // `padding-block-end`. 2,000 items at 150px plus a 16px gap, in
  // however many columns the runner chose, is tens of thousands of
  // pixels — far more than the handful of mounted rows occupy,
  // which is the whole assertion.
  const list = getList(canvasElement)

  await expect(
    Number.parseFloat(list.style.paddingBlockEnd),
  ).toBeGreaterThan(10_000)
})

test("scrolling changes which rows exist", async () => {
  const { canvasElement } = await mountStory(Default)

  await waitFor(async () => {
    await expect(
      getRowIndexes(canvasElement).length,
    ).toBeGreaterThan(0)
  })

  const before = getRowIndexes(canvasElement)

  window.scrollTo(0, 6000)

  try {
    await waitFor(async () => {
      // Not "some overlap changed" — no row that was mounted
      // before may still be mounted, which is what separates
      // windowing from a list that merely grew.
      await expect(
        getRowIndexes(canvasElement).some((index) =>
          before.includes(index),
        ),
      ).toBe(false)
    })
  } finally {
    // The window is shared with every later test in the file, and
    // a canvas left scrolled would mount a different set of rows
    // in the next one.
    window.scrollTo(0, 0)
  }
})

test("a grid inside Shell follows Main's one scroll region", async () => {
  const { canvasElement } = await mountStory(
    InShellScrollRegion,
  )
  const main =
    canvasElement.querySelector<HTMLElement>("main")

  if (!main) {
    throw new Error("The shell story has no Main element.")
  }

  await waitFor(async () => {
    await expect(
      getRowIndexes(canvasElement).length,
    ).toBeGreaterThan(0)
  })

  await expect(getComputedStyle(main).overflowY).toBe(
    "auto",
  )
  await expect(main.scrollHeight).toBeGreaterThan(
    main.clientHeight,
  )

  const before = getRowIndexes(canvasElement)

  main.scrollTop = 6000
  main.dispatchEvent(new Event("scroll"))

  await waitFor(async () => {
    await expect(
      getRowIndexes(canvasElement).some((index) =>
        before.includes(index),
      ),
    ).toBe(false)
  })

  // The last row must replace the virtual spacer. This is the
  // reported failure's visible half: the old window observer left
  // tens of thousands of blank pixels below the first mounted rows
  // when Main scrolled.
  main.scrollTop = main.scrollHeight
  main.dispatchEvent(new Event("scroll"))

  await waitFor(async () => {
    await expect(
      getCells(canvasElement).some(
        (cell) =>
          cell.getAttribute("aria-posinset") === "2000",
      ),
    ).toBe(true)
  })

  await expect(
    getList(canvasElement).style.paddingBlockEnd,
  ).toBe("0px")
})

test("a grid inside a hidden panel mounts nothing and reveals without scrolling", async () => {
  const { canvasElement } = await mountStory(
    InHiddenTabPanel,
  )

  const main =
    canvasElement.querySelector<HTMLElement>("main")

  if (!main) {
    throw new Error("The tab story has no Main element.")
  }

  await waitFor(async () => {
    await expect(
      getRowIndexes(canvasElement).length,
    ).toBeGreaterThan(0)
  })

  const hiddenPanel = canvasElement.querySelector(
    '[role="tabpanel"][hidden]',
  )

  if (!hiddenPanel) {
    throw new Error("Both tab panels are showing.")
  }

  /*
   * The direct observable, and the one the fix is: `display: none`
   * gives an element no box, so nothing inside it can be measured.
   * A grid that mounted its rows anyway would record a 0px-wide
   * container and 0px-tall rows as facts.
   */
  /*
   * THE ASSERTION THAT DISCRIMINATES, and it is the cause rather
   * than the symptom on purpose.
   *
   * `display: none` gives an element no box, so nothing inside it
   * can be measured. A grid that mounted its rows anyway records a
   * 0px-wide container and 0px-tall rows as facts, and the
   * virtualizer then reads the correction as a resize and
   * compensates the scroll position for it.
   *
   * Whether that compensation actually lands is a RACE — between
   * the `ResizeObserver` delivering the real row heights and the
   * layout effect correcting `scrollMargin`. In Docket it landed
   * and moved `Main` by 266px, 190px and 1,190px on three
   * different switches; in this story it does not land at all. So
   * the symptom is not what is asserted here. This is: with
   * nothing mounted, the race has no entrants.
   */
  await expect(
    hiddenPanel.querySelectorAll("ul").length,
  ).toBe(0)

  const tabs = [
    ...canvasElement.querySelectorAll<HTMLElement>(
      '[role="tab"]',
    ),
  ]

  const nextTab = tabs.find(
    (tab) => tab.getAttribute("aria-selected") === "false",
  )

  if (!nextTab) {
    throw new Error("No unselected tab to switch to.")
  }

  await expect(main.scrollTop).toBe(0)

  await userEvent.click(nextTab)

  /**
   * The list inside the panel that is SHOWING. Scoping matters:
   * without the gate the hidden panel still holds a `<ul>`, and a
   * query that took the first one in the canvas would watch the
   * panel that was just put away and settle before the revealed
   * one had measured anything.
   */
  const getShownList = () => {
    const shown = canvasElement.querySelector(
      '[role="tabpanel"]:not([hidden])',
    )

    const list = shown?.querySelector<HTMLElement>("ul")

    if (!list) {
      throw new Error("The shown panel has no grid.")
    }

    return list
  }

  // Wait for the revealed grid to have MEASURED, not merely to
  // have mounted — the adjustment, when it happens, happens on the
  // virtualizer's resize path.
  await waitFor(async () => {
    await expect(
      Number(
        getShownList().style.paddingBlockEnd.replace(
          "px",
          "",
        ),
      ),
    ).toBeGreaterThan(0)
  })

  // The symptom, kept as a guard rather than as the proof. It is
  // free, and it is the sentence a reader of this file wants.
  await expect(main.scrollTop).toBe(0)
})

test("a screen reader is told the real length", async () => {
  const { canvasElement } = await mountStory(Default)

  await waitFor(async () => {
    await expect(
      getCells(canvasElement).length,
    ).toBeGreaterThan(0)
  })

  const [firstCell] = getCells(canvasElement)

  await expect(
    firstCell?.getAttribute("aria-setsize"),
  ).toBe("2000")

  await expect(
    firstCell?.getAttribute("aria-posinset"),
  ).toBe("1")
})

test("an empty list reserves no space and mounts no rows", async () => {
  const { canvasElement } = await mountStory(AllStates)

  // `AllStates` draws three grids in order: none, one, 2,000.
  const empty = getList(canvasElement, 0)

  await waitFor(async () => {
    await expect(empty.style.paddingBlockEnd).toBe("0px")
  })

  await expect(empty.style.paddingBlockStart).toBe("0px")

  await expect(empty.querySelectorAll("li").length).toBe(0)
})
