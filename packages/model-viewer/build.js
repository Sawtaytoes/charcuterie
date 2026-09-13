import { cp, mkdir, writeFile } from "node:fs/promises"
import { build } from "esbuild"
import { VERSION } from "./src/index.js"

await mkdir("dist/vendor", { recursive: true })
await build({
  entryPoints: ["src/index.js"],
  outfile: "dist/model-viewer.js",
  bundle: true,
  format: "esm",
  plugins: [
    {
      name: "shared-three",
      setup(build) {
        build.onResolve({ filter: /^three$/ }, () => ({
          path: "three",
          external: true,
        }))
      },
    },
  ],
  minify: true,
})
await build({
  entryPoints: ["src/standalone.js"],
  outfile: "dist/standalone.js",
  bundle: true,
  format: "esm",
  plugins: [
    {
      name: "shared-three",
      setup(build) {
        build.onResolve({ filter: /^three$/ }, () => ({
          path: "three",
          external: true,
        }))
      },
    },
  ],
  minify: true,
})
await cp(
  new URL(import.meta.resolve("three")),
  "dist/vendor/three.module.js",
)
await cp(
  new URL("../LICENSE", import.meta.resolve("three")),
  "dist/vendor/THREE-LICENSE.txt",
)
await cp("static/index.html", "dist/index.html")
await writeFile(
  "dist/version.json",
  `${JSON.stringify({ name: "@charcuterie/model-viewer", version: VERSION })}\n`,
)
