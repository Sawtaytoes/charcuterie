import {
  cp,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { expect, it } from "vitest"
import { staticServer } from "./server.js"

it("renders the published browser API and replaces filtered paths in wide and phone containers", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "toolpath-browser-"),
  )
  await cp(new URL("../dist", import.meta.url), directory, {
    recursive: true,
  })
  await writeFile(
    path.join(directory, "index.html"),
    `<!doctype html><html><head><meta charset="utf-8"><title>Toolpath API proof</title><style>html,body{margin:0}#stage{width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script></head><body><main id="stage" aria-label="Toolpath preview"></main><script type="module">
import {createViewer,parseToolpaths,createToolpathObject,disposeObject,fitBounds,THREE} from './model-viewer.js';
const paths=parseToolpaths('G90\\nM83\\nG0 X0 Y0 Z0.2\\nT0\\n;LAYER:0\\nG1 X20 E1\\nG1 Y20 E1\\nG0 X0\\n;LAYER:1\\nT1\\nG1 Z0.4\\nG1 Y0 E1\\nG1 X20 E1');
const viewer=createViewer(document.getElementById('stage'),{background:0x112233,isAnimating:false});
let object;window.show=(options={})=>{if(object){viewer.group.remove(object);disposeObject(object)}object=createToolpathObject(paths,options);object.rotation.x=-Math.PI/2;viewer.group.add(object);fitBounds(viewer.camera,viewer.controls,new THREE.Box3().setFromObject(object));viewer.render();return object.children.map(child=>({name:child.name,vertices:child.geometry.attributes.position.count}))};
window.show();window.proof={viewer,paths};
</script></body></html>`,
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
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(
        `http://127.0.0.1:${server.address().port}`,
      )
      await page.waitForFunction(() => window.proof)
      expect(
        await page.evaluate(() =>
          window.show({ fromLayer: 1, toLayer: 1 }),
        ),
      ).toEqual([{ name: "tool:1", vertices: 4 }])
      expect(
        await page.evaluate(() =>
          window.show({ isTravelVisible: true }),
        ),
      ).toEqual([
        { name: "tool:0", vertices: 4 },
        { name: "travel", vertices: 4 },
        { name: "tool:1", vertices: 4 },
      ])
      const proof = await page.evaluate(() => {
        const { renderer, scene, camera } =
          window.proof.viewer
        renderer.render(scene, camera)
        const gl = renderer.getContext(),
          pixels = new Uint8Array(
            gl.drawingBufferWidth *
              gl.drawingBufferHeight *
              4,
          )
        gl.readPixels(
          0,
          0,
          gl.drawingBufferWidth,
          gl.drawingBufferHeight,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        )
        let count = 0
        for (
          let index = 0;
          index < pixels.length;
          index += 4
        )
          if (
            pixels[index] !== 17 ||
            pixels[index + 1] !== 34 ||
            pixels[index + 2] !== 51
          )
            count += 1
        return {
          pixels: count,
          isOverflow:
            document.documentElement.scrollWidth >
            innerWidth,
          canvases:
            document.querySelectorAll("canvas").length,
        }
      })
      expect(proof.pixels).toBeGreaterThan(100)
      expect(proof.isOverflow).toBe(false)
      expect(proof.canvases).toBe(1)
      await page.evaluate(() =>
        window.proof.viewer.dispose(),
      )
      expect(await page.locator("canvas").count()).toBe(0)
    }
    expect(errors).toEqual([])
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
}, 60000)
