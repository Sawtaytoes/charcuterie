import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { BoxGeometry, Mesh } from "three"
import { STLExporter } from "three/addons/exporters/STLExporter.js"
import { expect, it } from "vitest"
import { staticServer } from "./server.js"
import { stagePreview } from "./stage.js"

it("renders the built standalone page with arrangements, artwork, stable visibility and narrow orbit controls", async () => {
  const source = await mkdtemp(
    path.join(os.tmpdir(), "viewer-browser-"),
  )
  const exporter = new STLExporter()
  await writeFile(
    path.join(source, "part.stl"),
    exporter.parse(new Mesh(new BoxGeometry(70, 100, 4))),
  )
  await writeFile(
    path.join(source, "section.stl"),
    exporter.parse(new Mesh(new BoxGeometry(35, 100, 4))),
  )
  await writeFile(
    path.join(source, "art.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="32" height="64" fill="red"/><rect x="32" width="32" height="64" fill="blue"/></svg>',
  )
  const manifest = {
    title: "Shared model viewer",
    note: "Demonstration geometry",
    models: [
      {
        id: "body",
        file: "part.stl",
        label: "Body",
        texture: "art.svg",
        variants: { section: "section.stl" },
      },
      {
        id: "lid",
        file: "part.stl",
        label: "Cover",
        color: 0x5ad8a6,
        offset: [0, 0, 15],
      },
    ],
    queryViews: { "inside=1": "inside" },
    views: {
      inside: {
        label: "Inside",
        parts: { lid: { isVisible: false } },
      },
      section: {
        label: "Cross-section",
        parts: {
          body: { geometry: "section" },
          lid: { isVisible: false },
        },
      },
      exploded: {
        label: "Separate parts",
        parts: { lid: { position: [0, 30, 0] } },
      },
    },
  }
  const directory = await stagePreview(manifest, source)
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
    await page.goto(`${url}/?inside=1`)
    await page.waitForFunction(
      () => window.__viewer?.isReady,
    )
    expect(
      await page.evaluate(
        () => __viewer.parts[1].group.visible,
      ),
    ).toBe(false)
    expect(
      await page.evaluate(
        () => __viewer.parts[0].edge.visible,
      ),
    ).toBe(true)
    await page
      .getByRole("button", {
        name: "Cross-section",
        exact: true,
      })
      .click()
    expect(
      await page.evaluate(
        () =>
          __viewer.parts[0].mesh.geometry !==
          __viewer.parts[0].geometry,
      ),
    ).toBe(true)
    await page
      .getByRole("button", { name: "Iso", exact: true })
      .click()
    await page.locator("#extras summary").click()
    await page
      .getByRole("button", { name: "Plain relief" })
      .click()
    expect(
      await page.evaluate(
        () => __viewer.parts[0].mesh.material.map,
      ),
    ).toBe(null)
    await page.locator("#extras summary").click()
    await page.locator("#parts-menu summary").click()
    const before = await page.evaluate(() =>
      __viewer.camera.position.toArray(),
    )
    await page
      .getByRole("button", { name: "Cover", exact: true })
      .click()
    expect(
      await page.evaluate(() =>
        __viewer.camera.position.toArray(),
      ),
    ).toEqual(before)
    await page.locator("#parts-menu summary").click()
    await page.evaluate(() => {
      __viewer.controls.enableDamping = false
    })
    const angles = () =>
      page.evaluate(() => [
        __viewer.controls.getAzimuthalAngle(),
        __viewer.controls.getPolarAngle(),
      ])
    const initial = await angles()
    await page.mouse.move(680, 480)
    await page.mouse.down()
    await page.mouse.move(780, 480, { steps: 10 })
    await page.mouse.up()
    const horizontal = await angles()
    expect(
      Math.abs(horizontal[0] - initial[0]),
    ).toBeGreaterThan(0.01)
    expect(
      Math.abs(horizontal[1] - initial[1]),
    ).toBeLessThan(0.001)
    await page.mouse.move(780, 580, { steps: 1 })
    await page.mouse.down()
    await page.mouse.move(780, 680, { steps: 10 })
    await page.mouse.up()
    const vertical = await angles()
    expect(
      Math.abs(vertical[0] - horizontal[0]),
    ).toBeLessThan(0.001)
    expect(
      Math.abs(vertical[1] - horizontal[1]),
    ).toBeGreaterThan(0.01)
    await page
      .getByRole("button", {
        name: "Separate parts",
        exact: true,
      })
      .click()
    if (process.env.MODEL_VIEWER_SCREENSHOTS)
      await page.screenshot({
        path: path.join(
          process.env.MODEL_VIEWER_SCREENSHOTS,
          "wide.png",
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
    expect(
      await page.evaluate(() =>
        __viewer.parts
          .filter((p) => p.group.visible)
          .every((p) => {
            const box =
              new __viewer.THREE.Box3().setFromObject(
                p.group,
              )
            for (const x of [box.min.x, box.max.x])
              for (const y of [box.min.y, box.max.y])
                for (const z of [box.min.z, box.max.z]) {
                  const point = new __viewer.THREE.Vector3(
                    x,
                    y,
                    z,
                  ).project(__viewer.camera)
                  if (
                    Math.abs(point.x) > 1 ||
                    Math.abs(point.y) > 1
                  )
                    return false
                }
            return true
          }),
      ),
    ).toBe(true)
    if (process.env.MODEL_VIEWER_SCREENSHOTS)
      await page.screenshot({
        path: path.join(
          process.env.MODEL_VIEWER_SCREENSHOTS,
          "narrow.png",
        ),
      })
    expect(errors).toEqual([])
  } finally {
    await browser.close()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    await rm(source, { recursive: true, force: true })
    await rm(directory, { recursive: true, force: true })
  }
}, 30000)
