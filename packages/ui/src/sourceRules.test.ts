/**
 * The three rules about this package's source that no compiler and no
 * axe run can see.
 *
 * All three come straight from the plan's verification list, and each
 * one is a thing the fleet does today that the library exists to
 * stop.
 */

import { readdir, readFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"

import { expect, test } from "vitest"

const sourceDirectory = resolve(import.meta.dirname)

const packageDirectory = resolve(sourceDirectory, "..")

const getSourceFiles = async (
  directory: string,
): Promise<{ contents: string; file: string }[]> => {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })

  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return getSourceFiles(path)
      }

      if (!/\.(css|tsx?)$/.test(entry.name)) {
        return []
      }

      return [
        {
          contents: await readFile(path, "utf8"),
          file: relative(sourceDirectory, path),
        },
      ]
    }),
  )

  return files.flat()
}

const sourceFiles = await getSourceFiles(sourceDirectory)

const componentFiles = sourceFiles.filter(
  (one) =>
    !one.file.endsWith(".test.ts") &&
    !one.file.endsWith(".test.tsx"),
)

/**
 * Comments are prose about the fleet, not code. `intentStyles.ts`
 * quotes mux-magic's `bg-blue-950 text-blue-300` as the evidence for
 * the intent scale existing at all, and a rule that cannot tell a
 * citation from a usage is a rule that gets switched off.
 */
const stripComments = (contents: string) =>
  contents
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")

test("`data-testid` appears nowhere in @charcuterie/ui", () => {
  // A rule, not a preference. A testid is a name only the test suite
  // can see, so reaching for one is how a component ends up
  // unnameable by a screen reader *and* undrivable by an agent — the
  // exact gap that makes the fleet's current UIs unautomatable. If a
  // control is hard to query, the fix is an accessible name.
  // `data-testid=` — the attribute in *use*. `testing/` mentions the
  // name in a selector and an error message, which is the opposite
  // of the offence; and this file has to spell it to search for it,
  // which is why the scan is over shipped source and stories rather
  // than over the tests.
  const offenders = componentFiles
    .filter((one) => /data-testid=/.test(one.contents))
    .map((one) => one.file)

  expect(offenders).toEqual([])
})

test("no component reaches past tier 2 for a colour", () => {
  // The M6 problem, prevented here rather than repeated: mux-magic
  // has **993 hardcoded `*-slate-*` utilities across 134 files**, and
  // every one of them is why that app cannot have a light mode. A
  // component may name a semantic role — `bg-surface-raised`,
  // `text-intent-danger-content` — and nothing else.
  //
  // Tier 1 ramps (`colour.slate.500`) exist so a *variant author*
  // has something to build tier 2 out of. A component naming one
  // pins itself to a palette.
  const palettePattern =
    /\b(?:bg|text|border|from|to|via|outline|ring|fill|stroke|shadow|decoration|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/

  const hexPattern = /#[0-9a-fA-F]{3,8}\b/

  const offenders = componentFiles
    .filter(
      (one) =>
        // The story fixtures are allowed literal hexes: the SVG
        // poster data-URI in `MediaTile.stories.tsx` is a stand-in
        // for an app's own image, not component styling.
        !one.file.endsWith(".stories.tsx"),
    )
    .filter((one) => {
      const code = stripComments(one.contents)

      return (
        palettePattern.test(code) || hexPattern.test(code)
      )
    })
    .map((one) => one.file)

  expect(offenders).toEqual([])
})

test("nothing queries a container it declares itself", () => {
  // A container query matches **descendants of the container**, never
  // the container element. So `className="@container cq-md:px-8"`
  // compiles, generates real CSS, passes `tailwindCandidates.test.ts`
  // — and never fires. Nothing errors; the padding is simply always
  // the small one, forever.
  //
  // Caught here because it is invisible everywhere else: axe does not
  // care, the class exists, and a reviewer sees a plausible-looking
  // className. It cost this milestone one round of screenshots.
  const offenders = componentFiles
    .filter((one) => /\.tsx$/.test(one.file))
    .flatMap((one) => {
      const classStrings =
        stripComments(one.contents).match(/"[^"\n]*"/g) ??
        []

      return classStrings
        .filter(
          (candidate) =>
            candidate.includes("@container") &&
            /\bcq-(?:xs|sm|md|lg|xl):/.test(candidate),
        )
        .map((candidate) => `${one.file}: ${candidate}`)
    })

  expect(offenders).toEqual([])
})

test("a container-query component is never storied in a shrink-to-fit cell", () => {
  // The twin of the rule above, and the one the M3 screenshots
  // actually caught: the component is right, the *story* is wrong.
  //
  // `container-type: inline-size` implies `contain: inline-size`,
  // which forbids the element from being sized by its own contents.
  // In a default `StoryCell` — `items-start`, so shrink-to-fit — the
  // card has no width to shrink *to*, collapses to min-content, and
  // every line of text wraps after one word. Valid CSS, no error, no
  // axe violation, and it only shows up if somebody looks at a
  // screenshot. `align="stretch"` hands it a definite inline size
  // from the grid track.
  //
  // The container list is derived rather than hardcoded, so the
  // component M4 adds with an `@container` on it joins this rule the
  // moment it lands.
  const containerComponents = componentFiles
    .flatMap((one) => {
      const match = /^([A-Z]\w+)\/\1\.tsx$/.exec(one.file)

      return match?.[1] &&
        stripComments(one.contents).includes("@container")
        ? [match[1]]
        : []
    })
    .sort()

  // A canary on the derivation itself: if this ever comes back
  // empty the rule silently passes forever.
  expect(containerComponents).toEqual([
    "Card",
    "EmptyState",
    "MediaTile",
  ])

  // `StoryCell`s are never nested, so the lazy match really does
  // pair each opening tag with its own closing one.
  const cellPattern =
    /<StoryCell\b([^>]*)>([\s\S]*?)<\/StoryCell>/g

  const offenders = componentFiles
    .filter((one) => one.file.endsWith(".stories.tsx"))
    .flatMap((one) =>
      Array.from(
        stripComments(one.contents).matchAll(cellPattern),
      )
        .filter(
          ([, attributes, body]) =>
            !attributes.includes('align="stretch"') &&
            containerComponents.some((name) =>
              body.includes(`<${name}`),
            ),
        )
        .map(
          ([, attributes]) =>
            `${one.file}: <StoryCell${attributes}>`,
        ),
    )

  expect(offenders).toEqual([])
})

test("the barrel is the only place components are re-exported", async () => {
  // One sanctioned barrel per package. A component importing a
  // sibling *through* `index.ts` turns every component into a
  // dependency of every other one, which is how a 3 KB `Spinner`
  // starts pulling in `MediaTile`.
  const offenders = componentFiles
    .filter((one) => one.file !== "index.ts")
    .filter(
      (one) =>
        /from "\.\.?\/index\.ts"/.test(one.contents) ||
        /from "@charcuterie\/ui"/.test(one.contents),
    )
    .map((one) => one.file)

  expect(offenders).toEqual([])

  // And the barrel really does export every component, so a new one
  // cannot land unexported — which would make it invisible to every
  // consumer while all its own tests pass.
  const barrel = await readFile(
    join(sourceDirectory, "index.ts"),
    "utf8",
  )

  // `Button/Button.tsx` — the component files, as distinct from
  // their stories and helpers.
  const componentNames = componentFiles
    .map((one) => /^([A-Z]\w+)\/\1\.tsx$/.exec(one.file))
    .flatMap((match) => (match?.[1] ? [match[1]] : []))

  // M3's ten P0 components, plus `VisuallyHidden` — a Layer-0
  // primitive `Spinner`, `ProgressBar`, and `LiveStatusIndicator` all
  // need, so it shipped here rather than being stubbed three times.
  // M4 adds the three overlays: `Modal`, `Popover`, `Tabs`.
  //
  // `TabTrigger` is deliberately not in this count and not
  // exported. It is `Tabs`' own member component — its own file
  // only because both registrations are effects and an effect
  // cannot run in a loop — and the `<Name>/<Name>.tsx` pattern
  // this regex matches is what keeps it out.
  expect(componentNames.length).toBe(14)

  for (const name of componentNames) {
    expect(barrel).toContain(`export { ${name} }`)
  }
})

test("dependency direction is tokens ← logic ← ui", async () => {
  // CI-enforced by the plan, and this is the enforcement. `ui` may
  // depend on both; `logic` may depend on `tokens`; `tokens` depends
  // on nothing, which is what lets `castkit/packages/views` read a
  // colour without a React tree.
  const readPackage = async (name: string) =>
    JSON.parse(
      await readFile(
        join(packageDirectory, "..", name, "package.json"),
        "utf8",
      ),
    ) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }

  const getCharcuterieDependencies = (manifest: {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
  }) =>
    Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
    }).filter((name) => name.startsWith("@charcuterie/"))

  expect(
    getCharcuterieDependencies(await readPackage("tokens")),
  ).toEqual([])

  expect(
    getCharcuterieDependencies(await readPackage("logic")),
  ).toEqual([])

  expect(
    getCharcuterieDependencies(
      await readPackage("ui"),
    ).sort(),
  ).toEqual(["@charcuterie/logic", "@charcuterie/tokens"])
})
