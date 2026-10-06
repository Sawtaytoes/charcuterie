import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

// Turbo otherwise hashes sources and dependencies, but not the executing runtime.
const result = spawnSync(
  process.execPath,
  [
    require.resolve("turbo"),
    "run",
    "build",
    "--cache=local:rw",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CHARCUTERIE_BUILD_RUNTIME: `${process.version}-${process.platform}-${process.arch}`,
      TURBO_TELEMETRY_DISABLED: "1",
    },
  },
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
