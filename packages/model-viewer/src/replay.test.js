import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { BoxGeometry, Mesh } from "three"
import { STLExporter } from "three/addons/exporters/STLExporter.js"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest"
import { syntheticGcode, zip } from "./gcode.fixtures.js"
import { staticServer } from "./server.js"
import { stagePreview } from "./stage.js"

let source
const staged = []
// Bottoms one object at a time, then the shared top layer by layer.
const hybrid = [
  [1, 0, 0.5, 12],
  [2, 1, 0.5, 12],
  [1, 2, 12.5, 12.5],
  [2, 2, 12.5, 12.5],
  [1, 2, 13, 18],
  [2, 2, 13, 18],
]
const parts = (colour) => [
  { file: "lower.stl", color: colour },
  { file: "upper.stl", color: "#303030" },
]
const manifest = () => ({
  title: "Replay demonstration",
  note: "Synthetic plates",
  replay: {
    plates: [
      {
        key: "split",
        title: "Two parts, split colors",
        gcode: "split.gcode.3mf",
        topTool: 2,
        splitZ: 12.5,
        toolNames: ["Red", "Blue", "Charcoal"],
        phases: [
          { line: 1, label: "Bottoms" },
          { line: 543, label: "Shared top" },
        ],
        objects: {
          1: {
            name: "Left",
            bottomTool: 0,
            parts: parts("#D04040"),
          },
          2: {
            name: "Right",
            bottomTool: 1,
            parts: parts("#4080D0"),
          },
        },
      },
      {
        key: "near",
        title: "Too close",
        gcode: "near.gcode",
        objects: {
          1: { name: "First", parts: parts("#D04040") },
          2: { name: "Second", parts: parts("#4080D0") },
        },
      },
    ],
  },
})

beforeAll(async () => {
  source = await mkdtemp(
    path.join(os.tmpdir(), "viewer-replay-"),
  )
  const exporter = new STLExporter()
  const box = (height, lift) => {
    const geometry = new BoxGeometry(20, 20, height)
    geometry.translate(0, 0, height / 2 + lift)
    return exporter.parse(new Mesh(geometry))
  }
  await writeFile(
    path.join(source, "lower.stl"),
    box(12.5, 0),
  )
  await writeFile(
    path.join(source, "upper.stl"),
    box(5.5, 12.5),
  )
  await writeFile(
    path.join(source, "split.gcode.3mf"),
    zip({
      "Metadata/plate_1.gcode": Buffer.from(
        syntheticGcode(
          { 1: [40, 40], 2: [200, 40] },
          hybrid,
        ),
      ),
    }),
  )
  await writeFile(
    path.join(source, "near.gcode"),
    syntheticGcode({ 1: [40, 40], 2: [90, 40] }, [
      [1, 0, 0.5, 18],
      [2, 1, 0.5, 18],
    ]),
  )
})
afterAll(async () => {
  await rm(source, { recursive: true, force: true })
  for (const directory of staged)
    await rm(directory, { recursive: true, force: true })
})

describe("replay staging", () => {
  it("analyses every plate once and writes only what the page needs", async () => {
    const directory = await stagePreview(manifest(), source)
    staged.push(directory)
    const replay = JSON.parse(
      await readFile(
        path.join(directory, "replay.json"),
        "utf8",
      ),
    )
    expect(replay.printer).toEqual({
      bed: [256, 256],
      envelopeRadius: 68,
      gantryHeight: 34,
    })
    const [split, near] = replay.plates
    expect(split.checks).toMatchObject({
      colourErrors: 0,
      tipCollisions: 0,
      envelopeIntrusions: 0,
    })
    expect(near.checks.colourErrors).toBe(null)
    expect(near.checks.envelopeIntrusions).toBeGreaterThan(
      0,
    )
    expect(split.tools.map((tool) => tool.name)).toEqual([
      "Red",
      "Blue",
      "Charcoal",
    ])
    // The same STL across plates and objects is copied once.
    expect(
      new Set(
        replay.plates.flatMap((plate) =>
          plate.objects.flatMap((object) =>
            object.parts.map((part) => part.file),
          ),
        ),
      ),
    ).toEqual(new Set(["asset-0.stl", "asset-1.stl"]))
    expect(
      await readFile(
        path.join(directory, "index.html"),
        "utf8",
      ),
    ).toContain("replay.js")
  })

  it("refuses an object the G-code never prints", async () => {
    const wrong = manifest()
    wrong.replay.plates[1].objects[7] = {
      name: "Ghost",
      parts: parts("#ffffff"),
    }
    await expect(
      stagePreview(wrong, source),
    ).rejects.toThrow(
      "the G-code prints no object with label id 7",
    )
    const duplicate = manifest()
    duplicate.replay.plates[1].key = "split"
    await expect(
      stagePreview(duplicate, source),
    ).rejects.toThrow("Duplicate plate key: split")
  })
})

it("replays the staged plates with the head model, checks and plate switching", async () => {
  const directory = await stagePreview(manifest(), source)
  staged.push(directory)
  const server = await staticServer(directory)
  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  })
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    })
    const errors = []
    page.on("pageerror", (error) =>
      errors.push(error.message),
    )
    const url = `http://127.0.0.1:${server.address().port}`
    await page.goto(`${url}/?at=1`)
    await page.waitForFunction(
      () => window.__replay?.isReady,
    )
    expect(
      await page.evaluate(() => __replay.plate.key),
    ).toBe("split")
    // At the end, every part is cut at its full printed height.
    expect(
      await page.evaluate(() =>
        __replay.objects.map(
          (object) => object.clip.constant,
        ),
      ),
    ).toEqual([18.001, 18.001])
    await expect
      .poll(() => page.locator("#checks").innerText())
      .toContain("Wrong-color extrusions\n0")
    expect(
      await page.locator("#now").innerText(),
    ).toContain("Shared top")
    expect(
      await page.locator("#changes").innerText(),
    ).toContain("Filament changes: 2")
    if (process.env.MODEL_VIEWER_SCREENSHOTS)
      await page.screenshot({
        path: path.join(
          process.env.MODEL_VIEWER_SCREENSHOTS,
          "replay-wide.png",
        ),
      })
    await page
      .getByRole("button", {
        name: "Too close",
        exact: true,
      })
      .click()
    await page.waitForFunction(
      () => __replay.plate.key === "near",
    )
    expect(
      await page.locator("#checks").innerText(),
    ).toContain("Wrong-color extrusions\nnot checked")
    // Find a moment printing the second part while the first is taller.
    const isRed = await page.evaluate(() => {
      const index = __replay.plate.samples.findIndex(
        ([, , , z, , label, heights]) =>
          label === 2 && heights[0] > z + 0.05,
      )
      __replay.setSample(index)
      return __replay.envelope.material.color.getHexString()
    })
    expect(isRed).toBe("ff4a4a")
    await page.locator("#scrub").fill("0")
    expect(await page.evaluate(() => __replay.index)).toBe(
      0,
    )
    if (process.env.MODEL_VIEWER_SCREENSHOTS)
      await page.evaluate(() => {
        const index = __replay.plate.samples.findIndex(
          ([, , , z, , label, heights]) =>
            label === 2 && heights[0] > z + 0.05,
        )
        __replay.setSample(index + 3)
      })
    if (process.env.MODEL_VIEWER_SCREENSHOTS)
      await page.screenshot({
        path: path.join(
          process.env.MODEL_VIEWER_SCREENSHOTS,
          "replay-envelope.png",
        ),
      })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(100)
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false)
    if (process.env.MODEL_VIEWER_SCREENSHOTS)
      await page.screenshot({
        path: path.join(
          process.env.MODEL_VIEWER_SCREENSHOTS,
          "replay-narrow.png",
        ),
        fullPage: true,
      })
    await page.goto(`${url}/?plate=split&clean`)
    await page.waitForFunction(
      () => window.__replay?.isReady,
    )
    expect(
      await page.evaluate(() => [
        __replay.envelope.parent.visible,
        __replay.index ===
          __replay.plate.samples.length - 1,
      ]),
    ).toEqual([false, true])
    expect(errors).toEqual([])
  } finally {
    await browser.close()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
  // Same budget and reasoning as browser.test.js: chromium on a hosted runner.
}, 120000)
