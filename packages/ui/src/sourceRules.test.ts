/**
 * The rules about this package's source — and about the shape of the
 * workspace around it — that no compiler and no axe run can see.
 *
 * They come straight from the plan's verification list, and each one
 * is a thing the fleet does today that the library exists to stop.
 *
 * The last two reach past `@charcuterie/ui` into its siblings on
 * purpose. `ui` sits at the top of the dependency graph, so it is the
 * one package whose tests can see all three at once — which is why
 * the plan's cross-package assertions live here rather than in a
 * `packages/conformance` of their own
 * ([decision](../../../docs/decisions/2026-07-31-conformance-is-not-a-package.md)).
 */

import { readdir, readFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"

import { expect, test } from "vitest"

const sourceDirectory = resolve(import.meta.dirname)

const packageDirectory = resolve(sourceDirectory, "..")

const packagesDirectory = resolve(packageDirectory, "..")

type PackageManifest = {
  dependencies?: Record<string, string>
  exports?: Record<string, string | { source?: string }>
  peerDependencies?: Record<string, string>
}

const readManifest = async (
  name: string,
): Promise<PackageManifest> =>
  JSON.parse(
    await readFile(
      join(packagesDirectory, name, "package.json"),
      "utf8",
    ),
  ) as PackageManifest

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
  // `Main` joins them with the app shell. It is the one whose
  // `contain: inline-size` is *wanted* rather than tolerated —
  // content may no longer widen the content column, which is half
  // of why the shell does not scroll sideways at 390px — and the
  // `contain: layout` that rides along with it is documented in
  // `Main.tsx` and `Main.mdx`, because it makes `<main>` the
  // containing block for any `position: fixed` an app renders
  // inside it.
  expect(containerComponents).toEqual([
    "Alert",
    "Card",
    "EmptyState",
    "Main",
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
  //
  // Comments are stripped first, for the same reason the colour rule
  // strips them: a docstring showing a *consumer* how to wire
  // `RouterLinkProvider` has to spell `from "@charcuterie/ui"`, and a
  // rule that cannot tell a citation from an import is a rule that
  // gets switched off. An actual import is never inside a comment.
  const offenders = componentFiles
    .filter((one) => one.file !== "index.ts")
    .filter((one) => {
      const code = stripComments(one.contents)

      return (
        /from "\.\.?\/index\.ts"/.test(code) ||
        /from "@charcuterie\/ui"/.test(code)
      )
    })
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
  // M5 adds the two the first consumer proved were shared rather
  // than app-specific: `Alert` (rip-deck spells it four times, twice
  // with a byte-identical `TONE_CLASS`) and `SegmentedControl`.
  //
  // M6 adds the nine P1 components: `Accordion`, `Field`,
  // `FileDropZone`, `LogViewer`, `Menu`, `Select`,
  // `SortableTableHeader`, `Toast`, and `Tooltip`.
  //
  // `TabTrigger`, `SegmentedOption`, `AccordionSection`, and
  // `MenuAction` are deliberately not in this count and not
  // exported. Each is its own component's member — its own file only
  // because both registrations are effects and an effect cannot run
  // in a loop — and the `<Name>/<Name>.tsx` pattern this regex
  // matches is what keeps them out.
  //
  // `ToastRegion` is the one exception worth naming: it *is*
  // exported, and it lives in `Toast/` rather than owning a
  // directory because a region with no toasts in it is not a thing
  // anybody renders. It is therefore outside this count by the same
  // rule, and the barrel assertion below does not reach it.
  //
  // 2026-08-03 adds the two colour-scheme controls — `ColorSchemeToggle`
  // (Layer 2, presentational) and `ColorSchemeSwitcher` (Layer 3,
  // connected) — and `Lightbox`, the thumbnail-over-`Dialog` viewer —
  // taking the count to 28.
  //
  // The M8 overlay rebuild renames the old chrome-bearing `Modal` to
  // `Dialog` and reintroduces `Modal` as the base layer, so both are
  // components: +1 → 29. The picker family adds `Listbox` (single-select)
  // and `Combobox` (searchable/virtualized): +2 → 31.
  // `Swatch` — a colour as content with a required name, the one
  // colour the system does not own — comes out of `portly-controllers`,
  // the fleet's newest consumer: +1 -> 32.
  //
  // The boolean-input family fills the gap `mux-magic`'s `BooleanField`
  // hand-rolled around: `Checkbox` and `Switch` (the same state kind,
  // a submitted value versus a setting that takes effect on flip) and
  // `RadioGroup` (the stacked sibling of `SegmentedControl`, same
  // `SinglePicker` + `RovingFocus` composition): +3 -> 35.
  // `RadioGroupOption` is `RadioGroup`'s member — its own file only
  // because both registrations are effects — and stays out of this
  // count and the barrel by the `<Name>/<Name>.tsx` rule, exactly as
  // `SegmentedOption` does.
  //
  // `AdaptiveGrid` is the library's first *layout* component, and the
  // first one whose reason to exist is a rule rather than a widget:
  // the wrapping grids in this fleet are `auto-fill, minmax()`, which
  // takes every column the window allows and lands on seven items
  // strung across an ultrawide. It spends height first instead, and
  // it is a component rather than only a hook because three things
  // about the markup are silent when they are wrong — the
  // measured box must not be the capped box, `min-w-0` has to reach
  // children the caller owns, and the track list must be an inline
  // style because Tailwind cannot scan an interpolated class: +1 -> 36.
  // The link family closes the gap that made seven repos hand-roll a
  // back-link and made `Button` get used for navigation: `TextLink`
  // and `ButtonLink`, both a real `<a href>`, differing in paint
  // rather than semantics: +2 -> 38, on top of `AdaptiveGrid`'s 36.
  // `AnchorLink`,
  // `RouterLinkProvider`, and `ReactRouterLink` are the seam rather
  // than components anybody stories, and live in `RouterLink/` and
  // `reactRouter/` — outside this count by the `<Name>/<Name>.tsx`
  // rule, exactly as `Overlay/`'s parts are.
  // The unified app shell adds four: `Shell`, `Header`, `Rail`,
  // `Main` — the fleet's largest single duplication, where ten of
  // twelve UI repos hand-roll the page chrome and three of them
  // have a file called `AppShell.tsx`: +4 -> 42, on top of the link family's 38. `contentWidth.ts`
  // and `shellContext.ts` are `Shell`'s members and stay out of
  // this count by the `<Name>/<Name>.tsx` rule, exactly as
  // `mediaStatus.ts` does.
  // `Toolbar` unifies the fourth-largest duplication — four repos
  // with a toolbar-and-overflow, three of them collapsing by
  // rendering every action twice: +1 -> 43. `ToolbarSlot.tsx`,
  // `useToolbarOverflow.ts` and `chooseVisibleCount.ts` are its
  // members and stay out of this count by the `<Name>/<Name>.tsx`
  // rule.
  //
  // `QueryBuilder` — the generic nestable AND/OR (any-combinator) group
  // editor Mail Sifter's nested rules and mux-magic's job DSL both need
  // — is the library's first recursive component and its first with a
  // fully opaque value *and* combinator: +1 -> 44. `QueryBuilderGroup`
  // and `QueryBuilderRow` are its members — a group renders groups, and
  // both are rendered inside a `.map` — and stay out of this count and
  // the barrel by the `<Name>/<Name>.tsx` rule, exactly as
  // `SegmentedOption` and `ListboxOption` do.
  expect(componentNames.length).toBe(44)

  for (const name of componentNames) {
    expect(barrel).toContain(`export { ${name} }`)
  }
})

test("dependency direction is tokens ← logic ← ui", async () => {
  // CI-enforced by the plan, and this is the enforcement. `ui` may
  // depend on both; `logic` may depend on `tokens`; `tokens` depends
  // on nothing, which is what lets `castkit/packages/views` read a
  // colour without a React tree.
  const getCharcuterieDependencies = (
    manifest: PackageManifest,
  ) =>
    Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
    }).filter((name) => name.startsWith("@charcuterie/"))

  expect(
    getCharcuterieDependencies(
      await readManifest("tokens"),
    ),
  ).toEqual([])

  expect(
    getCharcuterieDependencies(await readManifest("logic")),
  ).toEqual([])

  expect(
    getCharcuterieDependencies(
      await readManifest("ui"),
    ).sort(),
  ).toEqual(["@charcuterie/logic", "@charcuterie/tokens"])
})

/**
 * What every published entry point is allowed to reach at runtime.
 *
 * This is what survives of the plan's `@charcuterie/conformance`
 * package — "builds React19+TWv4 / Preact / Satori profiles" — once
 * the three profiles are checked against what the library actually
 * became. Two of them are already built and gated by name (`docs` is
 * the React 19 + Tailwind v4 build; `logic`'s five-adapter suite is
 * the Preact one), and the third has no components to render because
 * the ePaper-safe subset was never built. What no gate covered is the
 * claim each of those profiles actually rests on: **which runtime a
 * consumer is forced to install by importing a given entry point.**
 * That is the assertion below.
 *
 * Each of these numbers is load-bearing somewhere:
 *
 * - `tokens` reaches **nothing**. `castkit/packages/views` renders
 *   through Satori and must read a colour without a React tree.
 * - `logic/core` reaches **nothing**, and `logic/preact` never
 *   reaches `react` — `preact/compat` is most of `slatecast`'s 60 KB
 *   gz budget, and an accidental `react` import there is a bundle
 *   blow-up that typechecks.
 * - `ui/testing` reaches **nothing**, which is the promise
 *   `expectAgentDrivable.ts` makes in prose: it ships for consumers
 *   to hold *their* components to, and a published package must not
 *   drag a test framework into an app's dependency graph.
 *
 * A type-only import counts. It is erased from the bundle but not
 * from the `.d.ts`, so a consumer still needs the package installed
 * for their own typecheck to pass.
 */
const ENTRY_POINT_RUNTIMES: Record<
  string,
  Record<string, string[]>
> = {
  logic: {
    ".": ["react"],
    // The DOM defaults for `useColorScheme`. It reaches no bare
    // specifier at all: `matchMedia`/`localStorage`/`document` are
    // globals, not imports, and its only imports are type-only ones
    // into `core` — which is why `ColorSchemeApplier` lives in the
    // core rather than beside the hook, so this entry never pulls
    // `react`.
    "./browser": [],
    "./core": [],
    "./jotai": ["jotai"],
    "./preact": ["preact", "preact/hooks"],
    // The request/response data layer. It reaches react-query, the
    // two openapi-* primitives it re-exports, and `react` (the
    // provider's `useState`) — all optional peers, so an app that
    // never imports `./query` resolves none of them. `react/jsx-runtime`
    // is added only at emit, so it is not a source specifier here.
    "./query": [
      "@tanstack/react-query",
      "openapi-fetch",
      "openapi-react-query",
      "react",
    ],
    "./signals": ["@preact/signals-core"],
  },
  tokens: {
    ".": [],
    "./epaper": [],
  },
  ui: {
    ".": [
      "@charcuterie/logic",
      // `ColorSchemeSwitcher` is the one component that reaches the
      // browser, and it does so through this subpath so the coupling
      // is named rather than smuggled in through the main entry.
      "@charcuterie/logic/browser",
      "@charcuterie/tokens",
      "@floating-ui/react",
      // `Combobox`'s virtualization — the second runtime dependency
      // this package has ever taken. MIT, US-origin (Tanner Linsley),
      // tree-shakeable, ~4 KB gz.
      "@tanstack/react-virtual",
      "react",
    ],
    // The router seam's one shipped adapter, and the reason it is a
    // subpath rather than part of the barrel: `react-router` appears
    // **only** here, as an optional peer, so the eleven consumers of
    // the main entry never resolve it. Six of them do not have a
    // react-router at all.
    "./react-router": ["react", "react-router"],
    "./testing": [],
    "./tokens": ["@charcuterie/tokens"],
  },
}

/**
 * Every bare specifier reachable from `entryFile`, following relative
 * imports and stopping at package boundaries.
 *
 * Every relative import in this workspace carries its extension, so
 * "resolution" is a `join` — no `.js`/`index` guessing, and a typo
 * fails loudly as a missing file rather than silently pruning the
 * graph.
 */
const collectRuntimeImports = async (entryFile: string) => {
  const visited = new Set<string>()

  const bareSpecifiers = new Set<string>()

  const visit = async (file: string) => {
    if (visited.has(file)) {
      return
    }

    visited.add(file)

    // Template literals go too. `createStatus`'s error message
    // spells `from "${current}"`, which is prose about a state
    // machine and not an import of a package called `${current}`.
    const contents = stripComments(
      await readFile(file, "utf8"),
    ).replace(/`(?:[^`\\]|\\.)*`/g, "")

    const specifiers = [
      ...contents.matchAll(/\bfrom\s+"([^"]+)"/g),
      ...contents.matchAll(/\bimport\s+"([^"]+)"/g),
    ].map(([, specifier]) => specifier as string)

    for (const specifier of specifiers) {
      if (!specifier.startsWith(".")) {
        bareSpecifiers.add(specifier)

        continue
      }

      if (/\.css$/.test(specifier)) {
        continue
      }

      await visit(resolve(dirname(file), specifier))
    }
  }

  await visit(entryFile)

  return [...bareSpecifiers].sort()
}

test.each(Object.keys(ENTRY_POINT_RUNTIMES))(
  "every @charcuterie/%s entry point reaches only its own runtime",
  async (packageName) => {
    const manifest = await readManifest(packageName)

    const entryPoints = Object.entries(
      manifest.exports ?? {},
    ).flatMap(([name, target]) =>
      typeof target === "object" && target.source
        ? [[name, target.source] as const]
        : [],
    )

    // The table is exhaustive, so a new entry point cannot land
    // without somebody deciding what it is allowed to pull in.
    expect(
      entryPoints.map(([name]) => name).sort(),
    ).toEqual(
      Object.keys(
        ENTRY_POINT_RUNTIMES[packageName] ?? {},
      ).sort(),
    )

    const declared = Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
    })

    for (const [name, source] of entryPoints) {
      const reached = await collectRuntimeImports(
        join(packagesDirectory, packageName, source),
      )

      expect({
        entryPoint: `${packageName}${name.slice(1)}`,
        reached,
      }).toEqual({
        entryPoint: `${packageName}${name.slice(1)}`,
        reached: ENTRY_POINT_RUNTIMES[packageName]?.[name],
      })

      // And nothing reached is a phantom dependency —
      // `preact/hooks` is declared as `preact`, which is the unit an
      // install actually has.
      for (const specifier of reached) {
        const packageOfSpecifier = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0]

        expect(declared).toContain(packageOfSpecifier)
      }
    }
  },
)
