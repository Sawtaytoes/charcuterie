import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/**
 * The shared workflow sets `VRT_PNPM_STORE_DIR` to a store on the same
 * filesystem as the workspace, so pnpm hard-links each package into
 * `node_modules`. A store on another filesystem makes pnpm copy every file:
 * 515 MB for mux-magic on each run, measured on 2026-11-13, because the
 * checkout's `git clean -ffdx` removes `node_modules` every time.
 */
export function repoInstallCommand(
  directory,
  env = process.env,
) {
  const manifest = `${directory}/package.json`
  const manager = existsSync(manifest)
    ? JSON.parse(
        readFileSync(manifest, "utf8"),
      ).packageManager?.split("@")[0]
    : undefined
  if (
    manager === "pnpm" ||
    (!manager && existsSync(`${directory}/pnpm-lock.yaml`))
  ) {
    return [
      "pnpm",
      "install",
      "--frozen-lockfile",
      "--store-dir",
      env.VRT_PNPM_STORE_DIR ||
        join(homedir(), ".cache", "pnpm", "store"),
    ]
  }
  if (
    manager === "yarn" ||
    (!manager && existsSync(`${directory}/yarn.lock`))
  ) {
    return ["yarn", "install", "--immutable"]
  }
  if (
    manager === "npm" ||
    (!manager &&
      existsSync(`${directory}/package-lock.json`))
  ) {
    return ["npm", "ci", "--no-audit", "--no-fund"]
  }
  throw new Error(
    "No supported package manager and lockfile. Set setupCommand explicitly.",
  )
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [command, ...args] = repoInstallCommand(
    process.cwd(),
  )
  const result = spawnSync(command, args, {
    stdio: "inherit",
  })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}
