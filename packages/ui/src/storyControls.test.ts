/**
 * The rule that would have caught image 4 of the M4 review: a `size`
 * prop rendering as a `{}` JSON textarea in the Controls panel,
 * because Storybook could not see that `ControlSize` is three
 * strings.
 *
 * `react-docgen` follows **relative** imports and stops at bare
 * package specifiers. So a prop typed from `../intentStyles.ts`
 * arrives as a resolved union and gets a radio for free, while the
 * same prop typed from `@charcuterie/tokens` arrives as an opaque
 * name — and Storybook's fallback for an unknown type is the object
 * control. Nothing errors. The story renders. The control is just
 * wrong, in a way only a human opening that panel will notice.
 *
 * So: a prop whose type comes from a bare specifier must have an
 * explicit `argTypes` entry in its story.
 */

import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { expect, test } from "vitest"

const sourceDirectory = resolve(import.meta.dirname)

const readComponent = async (name: string) => {
  const [component, story] = await Promise.all([
    readFile(
      join(sourceDirectory, name, `${name}.tsx`),
      "utf8",
    ),
    readFile(
      join(sourceDirectory, name, `${name}.stories.tsx`),
      "utf8",
    ),
  ])

  return { component, name, story }
}

const componentNames = (
  await readdir(sourceDirectory, { withFileTypes: true })
)
  .filter(
    (entry) =>
      entry.isDirectory() && /^[A-Z]/.test(entry.name),
  )
  .map((entry) => entry.name)
  .sort()

const components = await Promise.all(
  componentNames.map(readComponent),
)

/**
 * `import type { A, B } from "@scope/pkg"` — bare specifiers only.
 * A relative one is exactly the case docgen *can* resolve.
 */
const getForeignTypeNames = (source: string) =>
  new Set(
    Array.from(
      source.matchAll(
        /import type \{([^}]+)\} from "([^".][^"]*)"/g,
      ),
    )
      .filter(
        ([, , specifier]) => !specifier?.startsWith("."),
      )
      .flatMap(([, names]) =>
        (names ?? "")
          .split(",")
          .map((one) => one.trim())
          .filter(Boolean),
      ),
  )

const getPropsBlock = (source: string) =>
  /export type \w+Props =[\s\S]*?\n\}/.exec(source)?.[0] ??
  ""

test("every component's props are declared where a story can find them", () => {
  // A canary on the derivation: if the directory scan ever comes
  // back empty this whole file passes forever.
  expect(componentNames).toContain("Button")
  expect(componentNames.length).toBeGreaterThanOrEqual(14)
})

test("a prop typed from another package has an explicit control", () => {
  const offenders = components.flatMap(
    ({ component, name, story }) => {
      const foreignTypes = getForeignTypeNames(component)

      if (foreignTypes.size === 0) {
        return []
      }

      // `intent?: IntentName` / `size?: ControlSize`. React's own
      // types are excluded: `ReactNode` and friends are not
      // enumerable and are not meant to have a radio.
      const declarations = Array.from(
        getPropsBlock(component).matchAll(
          /^\s{2}(\w+)\??:\s*([A-Za-z_]\w*)\s*$/gm,
        ),
      )

      return declarations
        .filter(
          ([, , typeName]) =>
            typeName &&
            foreignTypes.has(typeName) &&
            !typeName.startsWith("React"),
        )
        .filter(
          ([, propName]) =>
            // The story has to name the prop inside its `argTypes`.
            !new RegExp(
              `argTypes:[\\s\\S]*?\\b${propName}:`,
            ).test(story),
        )
        .map(
          ([, propName, typeName]) =>
            `${name}.${propName} is \`${typeName}\`, imported from another package, with no argTypes entry`,
        )
    },
  )

  expect(offenders).toEqual([])
})
