import { cp, mkdir, writeFile } from "node:fs/promises"
import { build } from "esbuild"
import { VERSION } from "./src/index.js"

await mkdir("dist/vendor", { recursive: true })
// Three stays external so every page shares the one vendored copy.
const sharedThree = {
  name: "shared-three",
  setup(build) {
    build.onResolve({ filter: /^three$/ }, () => ({
      path: "three",
      external: true,
    }))
  },
}
for (const [entry, outfile] of [
  ["src/index.js", "dist/model-viewer.js"],
  ["src/standalone.js", "dist/standalone.js"],
  ["src/replay.js", "dist/replay.js"],
])
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    plugins: [sharedThree],
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
await cp("static/replay.html", "dist/replay.html")
await writeFile(
  "dist/version.json",
  `${JSON.stringify({ name: "@charcuterie/model-viewer", version: VERSION })}\n`,
)
