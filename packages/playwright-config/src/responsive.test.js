import { chromium } from "@playwright/test"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "vitest"

import {
  expectNoHorizontalOverflow,
  expectNoSplitWords,
} from "./responsive.js"

/*
 * A real Chromium page, not jsdom: jsdom has no layout, so
 * `scrollWidth` is always 0 there and every page "fits". The phone's
 * width, because that is the window this check exists for.
 */
let browser

beforeAll(async () => {
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser?.close()
})

const openPage = async (html) => {
  const page = await browser.newPage({
    viewport: { height: 824, width: 384 },
  })

  await page.setContent(html)

  return page
}

describe("expectNoHorizontalOverflow", () => {
  test("passes a page that fits its window", async () => {
    const page = await openPage(
      `<body style="margin: 0"><div style="width: 100%">fits</div></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).resolves.toBeUndefined()
  })

  test("names the element that pushes the page wider than the window", async () => {
    const page = await openPage(
      `<body style="margin: 0"><div class="tag-row" style="width: 431px">too wide</div></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).rejects.toThrow(
      "The page is 431px wide in a 384px window. Widest elements: div.tag-row ends at 431px",
    )
  })

  /*
   * `Shell` clips sideways (`overflow-x: clip`) and `Main`'s region
   * hides (`overflow-x: hidden`), so the document never grows: the
   * page "fits" while a button sits out of reach. tally-marks#101 had
   * two of these pass the document check.
   */
  test("names content that a clipping box hides out of sight", async () => {
    const page = await openPage(
      `<body style="margin: 0"><div style="overflow-x: clip"><main class="region" style="overflow-x: hidden"><div class="toolbar" style="display: flex"><span style="flex: none; width: 300px">title</span><button style="flex: none; width: 146px">Cancel</button></div></main></div></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).rejects.toThrow(
      "Content is cut off sideways in a 384px window: main.region holds 446px in 384px",
    )
  })

  test("leaves a deliberate side-scroller alone", async () => {
    const page = await openPage(
      `<body style="margin: 0"><main style="overflow-x: hidden"><div style="overflow-x: auto"><table><tr><td style="min-width: 900px">wide table</td></tr></table></div></main></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).resolves.toBeUndefined()
  })

  test("leaves an ellipsis truncation and a visually hidden label alone", async () => {
    const page = await openPage(
      `<body style="margin: 0"><p style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${"a very long single-line title ".repeat(8)}</p><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; white-space: nowrap">Screen reader only text that is long</span></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).resolves.toBeUndefined()
  })

  /*
   * portly-controllers#27: a flex row gave every pad's name 0px at
   * 384px. The label truncates with an ellipsis, so the clipped-box
   * rule exempts it, and it showed nothing at all.
   */
  test("names a truncated label squeezed to nothing", async () => {
    const page = await openPage(
      `<body style="margin: 0"><div style="display: flex; width: 120px"><span style="flex: none; width: 120px">swatch</span><span class="name" style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px">Green pad</span></div></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).rejects.toThrow(
      /A truncated label shows nothing in a 384px window: span\.name is 0px wide for \d+px of text/,
    )
  })

  test("passes a truncated label that still shows a character", async () => {
    const page = await openPage(
      `<body style="margin: 0"><div style="display: flex; width: 160px"><span style="flex: none; width: 120px">swatch</span><span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px">Green pad</span></div></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).resolves.toBeUndefined()
  })

  /*
   * gallery-downloader#51: a stack trace in `pre-wrap` with only
   * `overflow-y: auto` scrolled a long path sideways at 384px.
   * `overflow-y: auto` makes `overflow-x` compute to `auto`, so it
   * looked like a side-scroller on purpose.
   */
  test("names wrapping text that scrolls sideways anyway", async () => {
    const page = await openPage(
      `<body style="margin: 0"><pre class="trace" style="width: 300px; overflow-y: auto; white-space: pre-wrap; margin: 0">at /a/very/long/unbreakable/path/to/a/module/that/never/wraps/index.js</pre></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).rejects.toThrow(/pre\.trace holds \d+px in 300px/)
  })

  test("leaves a code block that scrolls on purpose alone", async () => {
    const page = await openPage(
      `<body style="margin: 0"><pre style="width: 300px; overflow-x: auto; white-space: pre; margin: 0">const aVeryLongLineOfCodeThatScrollsSidewaysOnPurpose = true</pre></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).resolves.toBeUndefined()
  })

  test("skips a box the test names as clipping on purpose", async () => {
    const page = await openPage(
      `<body style="margin: 0"><div class="ticker" style="overflow: hidden"><div style="width: 2000px">news ticker</div></div></body>`,
    )

    await expect(
      expectNoHorizontalOverflow(page),
    ).rejects.toThrow("div.ticker holds 2000px in 384px")

    await expect(
      expectNoHorizontalOverflow(page, {
        ignore: [".ticker"],
      }),
    ).resolves.toBeUndefined()
  })
})

describe("expectNoSplitWords", () => {
  /*
   * `Main` sets `wrap-anywhere`, so a heading squeezed beside a
   * filter breaks as "Rewa / rds" instead of overflowing — the shape
   * of tally-marks#101's narrow-window defect.
   */
  test("names a heading word broken across two lines", async () => {
    const page = await openPage(
      `<body style="margin: 0; overflow-wrap: anywhere"><div style="display: flex; width: 384px"><h2 style="margin: 0; font: 24px/1.2 sans-serif">Rewards</h2><div style="flex: none; width: 340px">filter and add</div></div></body>`,
    )

    await expect(expectNoSplitWords(page)).rejects.toThrow(
      'A word breaks across two lines in a 384px window, so the layout around it is squeezed: "Rewards" in "Rewards"',
    )
  })

  test("passes a heading that wraps between words", async () => {
    const page = await openPage(
      `<body style="margin: 0; overflow-wrap: anywhere"><h2 style="width: 120px; font: 24px/1.2 sans-serif">Rewards for every kid</h2></body>`,
    )

    await expect(
      expectNoSplitWords(page),
    ).resolves.toBeUndefined()
  })
})
