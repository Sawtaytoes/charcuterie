import { chromium } from "@playwright/test"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "vitest"

import { expectNoHorizontalOverflow } from "./responsive.js"

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
})
