import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterEach, describe, expect, test } from "vitest"

import { analyzeProject } from "./check.js"
import {
  buildLock,
  describeChanges,
  lockProblems,
  readLock,
  writeLock,
} from "./lock.js"
import { traceTarget } from "./trace.js"

/**
 * Each test writes a tiny requirements project to a temp directory:
 * a feature, the wrapper module, and step files. The checker never
 * runs them — it reads them — so they need not compile or import
 * anything real.
 */

/** @type {string[]} */
const created = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

const wrapper = `export const Given = () => {}
export const When = () => {}
export const Then = () => {}
`

const config = {
  idPrefix: "REQ-T-",
  allowedTags: ["@responsive", "@todo"],
}

/**
 * @param {Record<string, string>} files
 */
const makeProject = async (files) => {
  // The root is one level down, so a fixture can also place a file
  // OUTSIDE it (`../shared/…`) without touching the real temp dir.
  const base = await mkdtemp(
    join(tmpdir(), "requirements-check-"),
  )
  const root = join(base, "requirements")

  created.push(base)

  const all = {
    "requirements.config.json": JSON.stringify(config),
    "support/steps.ts": wrapper,
    ...files,
  }

  for (const [file, contents] of Object.entries(all)) {
    await mkdir(dirname(join(root, file)), {
      recursive: true,
    })
    await writeFile(join(root, file), contents)
  }

  return root
}

const helpers = `import type { World } from "../support/world.ts"

export const expectOn = (world: World, name: string) => {
  if (!world.on.has(name)) throw new Error(name)
}

export const turnOn = (world: World, name: string) => {
  world.on.add(name)
}
`

const steps = `import { expectOn, turnOn } from "../helpers/lamp.ts"
import { Given, Then, When } from "../support/steps.ts"

/** A lamp, off. */
Given("a lamp named {string}", (world, name: string) => {})

/** Flip the switch. */
When("I turn on {string}", (world, name: string) => {
  turnOn(world, name)
})

/** The lamp is lit. */
Then("{string} is on", (world, name: string) => {
  expectOn(world, name)
})
`

const feature = `Feature: Lamp

  Rule: A lamp does what its switch says

    @REQ-T-1
    Scenario: Turning a lamp on
      Given a lamp named "Desk"
      When I turn on "Desk"
      Then "Desk" is on
`

/** @param {string} root */
const rulesOf = async (root) =>
  (await analyzeProject(root)).problems.map(
    (problem) => problem.rule,
  )

describe("a clean project", () => {
  test("has no problems, and a fresh lock is current", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])

    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    const relocked = await analyzeProject(root)

    expect(
      lockProblems(relocked, await readLock(relocked)),
    ).toEqual([])
  })
})

describe("step matching", () => {
  test("reports an undefined step at its feature line", async () => {
    const root = await makeProject({
      "lamp.feature": feature.replace(
        'Then "Desk" is on',
        'Then "Desk" is glowing',
      ),
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const { problems } = await analyzeProject(root)

    expect(problems).toContainEqual(
      expect.objectContaining({
        rule: "undefined-step",
        file: "lamp.feature",
        line: 9,
      }),
    )
  })

  test("reports an ambiguous step with both definitions' locations", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": `${steps}
Then("{string} is {word}", (world, name: string, state: string) => {})
`,
    })
    const { problems } = await analyzeProject(root)
    const ambiguous = problems.find(
      (problem) => problem.rule === "ambiguous-step",
    )

    expect(ambiguous?.message).toMatch(
      /steps\/lamp\.steps\.ts:13.*steps\/lamp\.steps\.ts:17/,
    )
  })

  test("rejects a Then used as a When", async () => {
    const root = await makeProject({
      "lamp.feature": feature.replace(
        'Then "Desk" is on',
        'When "Desk" is on',
      ),
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toContain(
      "keyword-mismatch",
    )
  })

  test("resolves a literal custom parameter type", async () => {
    const root = await makeProject({
      "lamp.feature": feature.replace(
        'Then "Desk" is on',
        "Then the lamp is green",
      ),
      "helpers/lamp.ts": helpers,
      "support/types.ts": `import { defineParameterType } from "quickpickle"
defineParameterType({ name: "colour", regexp: /red|green/ })
`,
      "steps/lamp.steps.ts": steps.replace(
        'Then("{string} is on"',
        'Then("the lamp is {colour}"',
      ),
    })

    expect(await rulesOf(root)).not.toContain(
      "undefined-step",
    )
  })
})

describe("dead code", () => {
  test("reports an unused step and an unused helper", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `${helpers}
export const neverCalled = () => {}
`,
      "steps/lamp.steps.ts": `${steps}
Then("nobody says this", (world) => {})
`,
    })
    const rules = await rulesOf(root)

    expect(rules).toContain("unused-step")
    expect(rules).toContain("unused-helper")
  })
})

describe("tags and IDs", () => {
  test.each([
    ["@skip"],
    ["@fails"],
    ["@failing"],
    ["@soft"],
    ["@concurrent"],
    ["@wip"],
  ])("forbids %s", async (tag) => {
    const root = await makeProject({
      "lamp.feature": feature.replace(
        "@REQ-T-1",
        `@REQ-T-1 ${tag}`,
      ),
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toContain("forbidden-tag")
  })

  test("forbids a runner tag on the Feature, where it is inherited", async () => {
    const root = await makeProject({
      "lamp.feature": `@skip\n${feature}`,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toContain("forbidden-tag")
  })

  test("allows @todo and counts it as pending", async () => {
    const root = await makeProject({
      "lamp.feature": feature.replace(
        "@REQ-T-1",
        "@REQ-T-1 @todo",
      ),
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    expect(
      analysis.pending.map((scenario) => scenario.name),
    ).toEqual(["Turning a lamp on"])
  })

  test("requires one ID per scenario and rejects duplicates", async () => {
    const root = await makeProject({
      "lamp.feature": `${feature}
    Scenario: No ID here
      Given a lamp named "Desk"

    @REQ-T-1
    Scenario: Same ID twice
      Given a lamp named "Desk"
`,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const rules = await rulesOf(root)

    expect(rules).toContain("missing-id")
    expect(rules).toContain("duplicate-id")
  })

  test("keeps IDs off the Rule", async () => {
    const root = await makeProject({
      "lamp.feature": feature.replace(
        "  Rule:",
        "  @REQ-T-9\n  Rule:",
      ),
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toContain(
      "id-on-wrong-level",
    )
  })
})

describe("outlines", () => {
  test("rejects a second Examples table, which QuickPickle 1.11 never runs", async () => {
    const root = await makeProject({
      "lamp.feature": `Feature: Lamp

  @REQ-T-1
  Scenario Outline: Turning on <name>
    Given a lamp named "<name>"
    When I turn on "<name>"
    Then "<name>" is on

    Examples:
      | name |
      | Desk |

    Examples:
      | name  |
      | Floor |
`,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toContain(
      "multiple-examples",
    )
  })
})

describe("step definition form", () => {
  test.each([
    [
      "a direct QuickPickle import",
      'import { Then as Bare } from "quickpickle"\nBare("x", () => {})\n',
      "direct-quickpickle-step",
    ],
    [
      "a regular expression",
      'import { Then } from "../support/steps.ts"\nThen(/x/, () => {})\n',
      "regex-expression",
    ],
    [
      "a computed pattern",
      'import { Then } from "../support/steps.ts"\nconst p = "x"\nThen(p, () => {})\n',
      "non-literal-expression",
    ],
    [
      "a priority",
      'import { Then } from "../support/steps.ts"\nThen("x", () => {}, 2)\n',
      "step-priority",
    ],
  ])("rejects %s", async (_label, source, rule) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "steps/bad.steps.ts": source,
    })

    expect(await rulesOf(root)).toContain(rule)
  })
})

describe("the lock", () => {
  /** @param {Record<string, string>} files */
  const lockedProject = async (files) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      ...files,
    })
    const analysis = await analyzeProject(root)

    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    return root
  }

  test("names the requirement whose helper was weakened, though no English changed", async () => {
    const root = await lockedProject({})

    await writeFile(
      join(root, "helpers/lamp.ts"),
      helpers.replace(
        "if (!world.on.has(name)) throw new Error(name)",
        "return",
      ),
    )

    const analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    expect(lockProblems(analysis, locked)).toContainEqual(
      expect.objectContaining({
        rule: "stale-lock",
        message: expect.stringContaining("REQ-T-1"),
      }),
    )
    expect(
      describeChanges(locked, buildLock(analysis, locked)),
    ).toEqual([
      expect.objectContaining({
        id: "REQ-T-1",
        details: [
          "code changed: helpers/lamp.ts › expectOn",
        ],
      }),
    ])
  })

  test("ignores a comment or formatting change", async () => {
    const root = await lockedProject({})

    await writeFile(
      join(root, "helpers/lamp.ts"),
      `// A note.\n${helpers.replace("(world: World, name: string) =>", "(\n  world: World,\n  name: string,\n) =>")}`,
    )

    const analysis = await analyzeProject(root)

    expect(
      lockProblems(analysis, await readLock(analysis)),
    ).toEqual([])
  })

  test("follows a barrel re-export to the file that declares the helper", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "steps/lamp.steps.ts": steps.replace(
        'from "../helpers/lamp.ts"',
        'from "../../shared/index.ts"',
      ),
      "../shared/index.ts":
        'export { expectOn, turnOn } from "./lamp.ts"\n',
      "../shared/lamp.ts": helpers,
    })
    const analysis = await analyzeProject(root)
    const lock = buildLock(
      analysis,
      await readLock(analysis),
    )

    expect(lock.requirements["REQ-T-1"]?.code).toContain(
      "../shared/lamp.ts",
    )
  })

  test("refuses a removed requirement until it is retired, then refuses its ID", async () => {
    const root = await lockedProject({})

    await writeFile(
      join(root, "lamp.feature"),
      feature.replace("@REQ-T-1", "@REQ-T-2"),
    )

    let analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    expect(
      lockProblems(analysis, locked).map(
        (problem) => problem.rule,
      ),
    ).toContain("removed-requirement")

    locked.retired["REQ-T-1"] = {
      scenario: "Turning a lamp on",
      reason: "replaced",
    }
    delete locked.requirements["REQ-T-1"]
    await writeLock(analysis, buildLock(analysis, locked))

    await writeFile(join(root, "lamp.feature"), feature)
    analysis = await analyzeProject(root)

    expect(
      lockProblems(analysis, await readLock(analysis)).map(
        (problem) => problem.rule,
      ),
    ).toContain("retired-id")
  })
})

describe("which", () => {
  test("traces a feature line to its definition and the helper it reaches", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const trace = traceTarget(
      await analyzeProject(root),
      "lamp.feature:9",
    )

    expect(trace).toContain(
      'definition  steps/lamp.steps.ts:13  Then("{string} is on")',
    )
    expect(trace).toContain("The lamp is lit.")
    expect(trace).toContain("helpers/lamp.ts:3  expectOn")
  })

  test("traces a requirement ID to every step", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const trace = traceTarget(
      await analyzeProject(root),
      "REQ-T-1",
    )

    expect(trace?.match(/definition/g)).toHaveLength(3)
  })
})
