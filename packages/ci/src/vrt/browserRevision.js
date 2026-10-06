import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const playwrightRequire = createRequire(
  require.resolve("playwright/package.json"),
)
const core = dirname(
  playwrightRequire.resolve("playwright-core/package.json"),
)
const { browsers } = JSON.parse(
  readFileSync(join(core, "browsers.json"), "utf8"),
)
console.log(
  browsers.find(
    (browser) => browser.name === "chromium-headless-shell",
  ).revision,
)
