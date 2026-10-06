import { readFile, writeFile } from "node:fs/promises"
import { buildRegConfig } from "../../ci/src/vrt/writeRegConfig.js"

const selection = process.env.VRT_BASELINE_FILE
  ? JSON.parse(
      await readFile(process.env.VRT_BASELINE_FILE, "utf8"),
    )
  : undefined
const config = buildRegConfig(process.env, selection)

await writeFile(
  ".regconfig.json",
  `${JSON.stringify(config, null, 2)}\n`,
)
