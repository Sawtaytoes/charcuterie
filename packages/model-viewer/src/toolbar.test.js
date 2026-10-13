import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { BoxGeometry, Mesh } from "three"
import { STLExporter } from "three/addons/exporters/STLExporter.js"
import { expect, it } from "vitest"
import { viewports } from "../../vitest-config/src/viewports.js"
import { staticServer } from "./server.js"
import { stagePreview } from "./stage.js"

it("keeps long titles, many views and expanded controls usable in all four windows", async () => {
  const source = await mkdtemp(
    path.join(os.tmpdir(), "viewer-toolbar-"),
  )
  await writeFile(
    path.join(source, "part.stl"),
    new STLExporter().parse(
      new Mesh(new BoxGeometry(70, 100, 4)),
    ),
  )
  const directory = await stagePreview(
    {
      title: `Large multi-part assembly review — ${"LongTitle".repeat(16)} (concept, not fit-tested)`,
      models: [
        {
          id: "body",
          file: "part.stl",
          label: "LongPartLabel".repeat(40),
          explode: [0, 40, 0],
        },
      ],
      views: Object.fromEntries(
        Array.from({ length: 14 }, (_, index) => [
          `view-${index}`,
          {
            label: `Assembly arrangement ${index}`,
            parts: {},
          },
        ]),
      ),
    },
    source,
  )
  const server = await staticServer(directory)
  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on("pageerror", (error) =>
      errors.push(error.message),
    )
    const results = []
    for (const [name, { width, height }] of Object.entries(
      viewports,
    )) {
      await page.setViewportSize({ width, height })
      await page.goto(
        `http://127.0.0.1:${server.address().port}`,
      )
      await page.waitForFunction(
        () => window.__viewer?.isReady,
      )
      for (const isExpanded of [false, true]) {
        if (isExpanded) {
          await page.locator("#parts-menu summary").click()
          await page.locator("#extras summary").click()
        }
        const layout = await page.evaluate(() => {
          const bar = document.querySelector(".bar")
          const hint = document.querySelector("#hint")
          const hintRect = hint.getBoundingClientRect()
          const overlaps =
            getComputedStyle(hint).display === "none"
              ? []
              : [
                  ...bar.querySelectorAll(
                    "button, summary, h1, label",
                  ),
                ]
                  .filter((control) => {
                    const rect =
                      control.getBoundingClientRect()
                    return (
                      control.checkVisibility() &&
                      rect.width > 0 &&
                      rect.height > 0 &&
                      rect.left < hintRect.right &&
                      rect.right > hintRect.left &&
                      rect.top < hintRect.bottom &&
                      rect.bottom > hintRect.top
                    )
                  })
                  .map((control) => control.textContent)
          return {
            hasOverflow:
              document.documentElement.scrollWidth >
                innerWidth ||
              bar.scrollWidth > bar.clientWidth,
            hasOrbitSpace:
              bar.getBoundingClientRect().bottom <=
              innerHeight / 2,
            overlaps,
          }
        })
        results.push({ name, isExpanded, ...layout })
      }
      await page
        .getByRole("button", {
          name: "Assembly arrangement 13",
          exact: true,
        })
        .click()
      await page
        .getByRole("button", {
          name: "Wireframe",
          exact: true,
        })
        .click()
      results.push({
        name,
        isWireframe:
          (await page
            .getByRole("button", {
              name: "Wireframe",
              exact: true,
            })
            .getAttribute("aria-pressed")) === "true",
      })
    }
    expect(
      results.filter(
        (result) =>
          "hasOverflow" in result &&
          (result.hasOverflow ||
            !result.hasOrbitSpace ||
            result.overlaps.length),
      ),
    ).toEqual([])
    expect(
      results.filter(
        (result) =>
          "isWireframe" in result && !result.isWireframe,
      ),
    ).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
    await rm(source, { recursive: true, force: true })
  }
}, 120_000)
