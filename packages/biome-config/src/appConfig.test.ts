/**
 * Run the real `biome` CLI over real fixtures, the same technique
 * `@charcuterie/eslint-config`'s `houseRules.test.ts` uses and for
 * the same reason: the failure a shared lint config is most likely
 * to hit is not a wrong rule, it is a rule that never *applies*.
 *
 * This suite exists because that happened. `app.json` shipped in
 * 1.2.0 carrying `"extends": ["./config.json"]`, on the assumption
 * that a config file inside a package can extend its sibling.
 * **Biome does not resolve a nested `extends` in an extended
 * config**, so a consumer on `@charcuterie/biome-config/app` got
 * the picker rules and *silently lost the entire house style* —
 * 60 columns, no semicolons, the Tailwind CSS parser, the VCS
 * ignore file. It looked adopted. It reported no error. The first
 * `biome check --write` would have reformatted the repo.
 *
 * So the app config is now a **delta**, and a consumer extends
 * both. What is asserted below is the composition, not the rules:
 * every base setting has to survive the second entry.
 */

import { execFileSync } from "node:child_process"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, expect, test } from "vitest"

const packageRoot = resolve(
  fileURLToPath(import.meta.url),
  "../..",
)

const biomeBinary = resolve(
  packageRoot,
  "../../node_modules/.bin/biome",
)

/**
 * A throwaway repo that resolves `@charcuterie/biome-config` the
 * way a consumer does — through `node_modules` — because the bug
 * this file exists for was entirely in package resolution. A test
 * that pointed `extends` at a relative path would have passed
 * while 1.2.0 was broken.
 *
 * It is a real `git init` because the base config sets
 * `vcs.useIgnoreFile`, and Biome refuses to start without one.
 * That refusal is itself a signal the base was applied.
 */
let consumerRoot: string

const runBiome = (
  command: "check" | "format" | "lint",
  target: string,
) => {
  try {
    return execFileSync(
      biomeBinary,
      [command, "--max-diagnostics=200", target],
      {
        cwd: consumerRoot,
        encoding: "utf8",
        // Biome writes the diagnostic bodies to stderr and only
        // the tally to stdout. Reading stdout alone would make
        // every `toContain` here assert against "Found 3 errors"
        // — which is the exact shape of a test that passes while
        // the rule it names is off.
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  } catch (error) {
    const { stdout, stderr } = error as {
      stdout?: string
      stderr?: string
    }

    return `${stdout ?? ""}${stderr ?? ""}`
  }
}

const writeConsumerConfig = (extendsList: string[]) => {
  writeFileSync(
    join(consumerRoot, "biome.json"),
    JSON.stringify({ extends: extendsList }),
  )
}

beforeAll(() => {
  consumerRoot = mkdtempSync(
    join(tmpdir(), "charcuterie-biome-"),
  )

  execFileSync("git", ["init", "--quiet"], {
    cwd: consumerRoot,
  })
  writeFileSync(join(consumerRoot, ".gitignore"), "")

  const linkedPackage = join(
    consumerRoot,
    "node_modules/@charcuterie/biome-config",
  )

  mkdirSync(
    join(consumerRoot, "node_modules/@charcuterie"),
    {
      recursive: true,
    },
  )
  symlinkSync(packageRoot, linkedPackage, "dir")

  cpSync(
    join(packageRoot, "src/__fixtures__"),
    join(consumerRoot, "src"),
    { recursive: true },
  )
})

afterAll(() => {
  rmSync(consumerRoot, { force: true, recursive: true })
})

test("the app config bans the raw select, the deprecated Select, and its import", () => {
  writeConsumerConfig([
    "@charcuterie/biome-config",
    "@charcuterie/biome-config/app",
  ])

  const output = runBiome("lint", "src/pickers.tsx")

  expect(output).toContain("noRestrictedElements")
  expect(output).toContain("noRestrictedImports")
  // The raw `<select>`, the `<Select>`, and the `Select` import —
  // and nothing fired on the `Picker` beside them.
  expect(
    output.match(
      /lint\/(correctness|style)\/noRestricted/g,
    ),
  ).toHaveLength(3)
})

test("the app config keeps the base house style", () => {
  // The regression. `app.json` used to carry its own `extends`,
  // which Biome ignores, so this fixture came back reformatted to
  // Biome's 80-column, semicolons-always defaults while every
  // picker assertion above still passed.
  writeConsumerConfig([
    "@charcuterie/biome-config",
    "@charcuterie/biome-config/app",
  ])

  expect(
    runBiome("format", "src/houseStyle.js"),
  ).not.toContain("Formatter would have printed")
})

test("the app config keeps the base CSS parser", () => {
  writeConsumerConfig([
    "@charcuterie/biome-config",
    "@charcuterie/biome-config/app",
  ])

  // `@source` needs `css.parser.tailwindDirectives`, which is a
  // base setting. Without it this is a *parse* error, so the file
  // is not linted or formatted at all.
  expect(
    runBiome("check", "src/tailwind.css"),
  ).not.toContain("Tailwind-specific syntax is disabled")
})

test("the base config alone bans nothing — the library renders a raw select", () => {
  writeConsumerConfig(["@charcuterie/biome-config"])

  // `@charcuterie/ui` extends the base, and it renders a raw
  // `<select>` because rendering one correctly *is* the library.
  // Putting the ban in the base would make the library the first
  // thing the rule broke.
  expect(runBiome("lint", "src/pickers.tsx")).not.toContain(
    "noRestricted",
  )
})

test("the app config carries no `extends` of its own", () => {
  // The 1.2.0 bug, pinned as a property of the file rather than
  // of a consumer's config — because the two tests above pass
  // either way. They assert that `[base, app]` composes, and it
  // composes whether or not `app.json` also tries to extend the
  // base on its own.
  //
  // What actually broke was the *instruction*: `app.json` said
  // `"extends": ["./config.json"]`, so the README told consumers
  // one entry was enough. Biome does not resolve a nested
  // `extends` in an extended config, so those consumers got the
  // picker rules and Biome's stock defaults, silently. The file
  // has to stay a delta, and this is what says so.
  const appConfig = JSON.parse(
    readFileSync(join(packageRoot, "app.json"), "utf8"),
  ) as Record<string, unknown>

  expect(appConfig).not.toHaveProperty("extends")
})
