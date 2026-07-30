/**
 * Every `<Canvas of={XStories.Y} />` in an `.mdx` names a story that
 * still exists.
 *
 * A missing one does not fail the build, does not fail typecheck,
 * and does not fail `vitest` — MDX resolves `of` at *runtime*, so a
 * renamed story turns into `of={undefined}` and the docs page
 * renders Storybook's "component failed to render" panel instead of
 * the page. `yarn smoke:storybook` catches it, which is good, but
 * only after a full Storybook build; this catches it in under a
 * second, which is the difference between noticing during the edit
 * and noticing in CI.
 *
 * Found the expensive way: the M4 story/test split renamed
 * `Tabs.Interactive` to `Tabs.Manual` and deleted three
 * assertion-only stories, and every gate stayed green while
 * `Components/Tabs › Docs` was broken.
 */

import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { expect, test } from "vitest"

const sourceDirectory = resolve(import.meta.dirname)

const componentNames = (
  await readdir(sourceDirectory, { withFileTypes: true })
)
  .filter(
    (entry) =>
      entry.isDirectory() && /^[A-Z]/.test(entry.name),
  )
  .map((entry) => entry.name)
  .sort()

const readIfPresent = async (path: string) => {
  try {
    return await readFile(path, "utf8")
  } catch {
    return undefined
  }
}

const documented = (
  await Promise.all(
    componentNames.map(async (name) => {
      const [mdx, story] = await Promise.all([
        readIfPresent(
          join(sourceDirectory, name, `${name}.mdx`),
        ),
        readIfPresent(
          join(
            sourceDirectory,
            name,
            `${name}.stories.tsx`,
          ),
        ),
      ])

      return mdx && story ? [{ mdx, name, story }] : []
    }),
  )
).flat()

test("every component with stories has a docs page", () => {
  // A canary on the derivation — an empty list would make the rule
  // below pass forever.
  expect(documented.length).toBeGreaterThanOrEqual(14)
})

test("no docs page references a story that no longer exists", () => {
  const offenders = documented.flatMap(
    ({ mdx, name, story }) => {
      const exported = new Set(
        Array.from(
          story.matchAll(/^export const (\w+): Story/gm),
          (match) => match[1],
        ),
      )

      return Array.from(
        mdx.matchAll(/of=\{\w+Stories\.(\w+)\}/g),
        (match) => match[1],
      )
        .filter((reference) => !exported.has(reference))
        .map(
          (reference) =>
            `${name}.mdx references ${name}Stories.${reference}, which is not exported`,
        )
    },
  )

  expect(offenders).toEqual([])
})
