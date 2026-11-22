import { defaultConfig } from "quickpickle"
import {
  describe,
  expect,
  type TestContext,
  test,
} from "vitest"

import { RequirementsWorld } from "./RequirementsWorld.ts"
import { toRequirementsWorld, wrapStep } from "./steps.ts"

/**
 * The wrapper is the one place that tells an agent which definition
 * ran for a failing line. If it stopped doing that, every failure
 * would still be red, and nothing would notice the missing trace,
 * so its output is pinned here.
 */

const makeWorld = (context: TestContext) => {
  const world = new RequirementsWorld(context, {
    config: { ...defaultConfig },
    feature: "wrapper",
    scenario: context.task.name,
    tags: [],
    steps: [],
    common: { info: { feature: "wrapper", tags: [] } },
  })

  world.info.line = 12

  return world
}

describe("wrapStep", () => {
  test("adds the matched definition and its trace command to a failure", async (context) => {
    const run = wrapStep(
      "Then",
      "the {role} named {string} is disabled",
      () => {
        throw new Error("expect(element).toBeDisabled()")
      },
    )

    await expect(run(makeWorld(context))).rejects.toThrow(
      /expect\(element\)\.toBeDisabled\(\)\n\nStep definition: Then\("the \{role\} named \{string\} is disabled"\)\nTrace: pnpm requirements:which \S+:12$/,
    )
  })

  test("passes the World and the parameters through", async (context) => {
    const world = makeWorld(context)
    const seen: unknown[] = []
    const run = wrapStep(
      "When",
      "I press {word}",
      (received, key: string) => {
        seen.push(received, key)
      },
    )

    await run(world, "Enter")

    expect(seen).toEqual([world, "Enter"])
  })

  test("annotates an error once, however many wrappers it crosses", async (context) => {
    const world = makeWorld(context)
    const inner = wrapStep("Then", "inner", () => {
      throw new Error("boom")
    })
    const outer = wrapStep("Then", "outer", () =>
      inner(world),
    )

    const error = await outer(world).catch(
      (caught: unknown) => caught,
    )

    expect(String(error)).toContain('Then("inner")')
    expect(String(error)).not.toContain('Then("outer")')
  })
})

describe("toRequirementsWorld", () => {
  test("rejects a World that is not a RequirementsWorld", () => {
    expect(() => toRequirementsWorld({ info: {} })).toThrow(
      /setWorldConstructor\(RequirementsWorld\)/,
    )
  })
})
