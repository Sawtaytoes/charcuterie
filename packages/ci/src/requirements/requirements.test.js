import { execFileSync } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { afterEach, describe, expect, test } from "vitest"

import { analyzeProject } from "./check.js"
import { loadProject } from "./config.js"
import {
  baseProblems,
  buildLock,
  describeChanges,
  lockProblems,
  parseLock,
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
    "index.ts": `import.meta.glob("./steps/*.steps.ts", { eager: true })\n`,
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
      "../shared/lamp.ts › expectOn",
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

/**
 * Each test below plants an edit that once left the check clean while
 * a requirement stopped running or proved less. Found by the
 * independent reviews of the checker's first version.
 */
describe("changes that must not pass unnoticed", () => {
  /** @param {Record<string, string>} files */
  const lockedLamp = async (files = {}) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      ...files,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    return root
  }

  /** @param {string} root */
  const changesOf = async (root) => {
    const analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    return {
      rules: lockProblems(analysis, locked).map(
        (problem) => problem.rule,
      ),
      details: describeChanges(
        locked,
        buildLock(analysis, locked),
      ).flatMap((change) =>
        change.details.map(
          (detail) => `${change.id} ${detail}`,
        ),
      ),
      analysis,
    }
  }

  test("an inherited @todo marks the requirement pending", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "lamp.feature"),
      feature.replace(
        "  Rule: A lamp",
        "  @todo\n  Rule: A lamp",
      ),
    )

    const { rules, details, analysis } =
      await changesOf(root)

    expect(analysis.pending).toHaveLength(1)
    expect(rules).toEqual(["stale-lock"])
    expect(details).toContain(
      "REQ-T-1 status: active -> pending",
    )
  })

  test("adding @responsive changes the lock", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "lamp.feature"),
      feature.replace(
        "    @REQ-T-1",
        "    @REQ-T-1 @responsive",
      ),
    )

    expect((await changesOf(root)).details).toContain(
      "REQ-T-1 tags: none -> @responsive",
    )
  })

  test("weakening the step wrapper changes every requirement", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "support/steps.ts"),
      wrapper.replace(
        "export const Then = () => {}",
        "export const Then = () => undefined",
      ),
    )

    expect((await changesOf(root)).details).toContain(
      "REQ-T-1 code changed: support/steps.ts",
    )
  })

  test("changing a parameter type's transformer changes the lock", async () => {
    const parameterTypes = `import { defineParameterType } from "quickpickle"

defineParameterType({ name: "lamp", regexp: /desk|floor/, transformer: (name: string) => name })
`
    const root = await lockedLamp({
      "support/parameterTypes.ts": parameterTypes,
    })

    await writeFile(
      join(root, "support/parameterTypes.ts"),
      parameterTypes.replace("=> name", '=> "desk"'),
    )

    expect((await changesOf(root)).details).toContain(
      "REQ-T-1 code changed: support/parameterTypes.ts",
    )
  })

  test("a module-level patch in a helper file changes the lock", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "helpers/lamp.ts"),
      `${helpers}\nMath.random = () => 0\n`,
    )

    expect((await changesOf(root)).details).toContain(
      "REQ-T-1 now reaches: helpers/lamp.ts › ‹module›",
    )
  })

  test("a changed data table changes the lock", async () => {
    const withTable = feature.replace(
      '      Then "Desk" is on',
      '      Then "Desk" is on\n        | brightness |\n        | 100        |',
    )
    const root = await lockedLamp({
      "lamp.feature": withTable,
    })

    await writeFile(
      join(root, "lamp.feature"),
      withTable.replace("100       ", "1         "),
    )

    expect((await changesOf(root)).details).toContain(
      "REQ-T-1 spec: the steps or examples changed",
    )
  })

  test("a fixture outside the root is hashed per export, and a subject is not hashed", async () => {
    const fixture = `import { Lamp } from "./Lamp.tsx"

export default { component: Lamp }

export const Desk = { args: { name: "Desk" } }

export const Floor = { args: { name: "Floor" } }
`
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        subjects: ["../ui/*.tsx", "!../ui/*.stories.tsx"],
      }),
      "../ui/Lamp.stories.tsx": fixture,
      "../ui/Lamp.tsx": "export const Lamp = () => null\n",
      "steps/lamp.steps.ts": steps
        .replace(
          'import { Given, Then, When } from "../support/steps.ts"',
          'import { Given, Then, When } from "../support/steps.ts"\nimport meta, { Desk } from "../../ui/Lamp.stories.tsx"',
        )
        .replace(
          "(world, name: string) => {})",
          "(world, name: string) => { void meta; void Desk })",
        ),
    })
    const { analysis } = await changesOf(root)
    const code = buildLock(
      analysis,
      await readLock(analysis),
    ).requirements["REQ-T-1"]?.code

    expect(code).toEqual(
      expect.arrayContaining([
        "../ui/Lamp.stories.tsx › Desk",
        "../ui/Lamp.stories.tsx › default",
      ]),
    )
    expect(code?.some((key) => key.includes("Floor"))).toBe(
      false,
    )
    expect(
      code?.some((key) => key.startsWith("../ui/Lamp.tsx")),
    ).toBe(false)

    await writeFile(
      join(root, "../ui/Lamp.stories.tsx"),
      fixture.replace('"Floor"', '"Ceiling"'),
    )
    await writeFile(
      join(root, "../ui/Lamp.tsx"),
      "export const Lamp = () => undefined\n",
    )

    expect((await changesOf(root)).rules).toEqual([])

    await writeFile(
      join(root, "../ui/Lamp.stories.tsx"),
      fixture.replace('"Desk" }', '"Lamp" }'),
    )

    expect((await changesOf(root)).details).toContain(
      "REQ-T-1 code changed: ../ui/Lamp.stories.tsx › Desk",
    )
  })
})

describe("changes found by the third review", () => {
  /** @param {Record<string, string>} files */
  const lockedLamp = async (files = {}) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      ...files,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    return root
  }

  /** @param {string} root */
  const detailsOf = async (root) => {
    const analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    return describeChanges(
      locked,
      buildLock(analysis, locked),
    ).flatMap((change) =>
      change.details.map(
        (detail) => `${change.id} ${detail}`,
      ),
    )
  }

  test("an unused initializer that runs code changes the lock; an erased type import does not", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `import type { World } from "../support/world.ts"\n${steps}`,
    )

    expect(await detailsOf(root)).toEqual([])

    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `${steps}\nconst unused = (globalThis.lampName = "Floor")\n`,
    )

    expect(await detailsOf(root)).toContain(
      "REQ-T-1 code changed: steps/lamp.steps.ts › ‹module›",
    )

    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `${steps}\nconst { unused } = { unused: 1 }\n`,
    )

    expect(await detailsOf(root)).toContain(
      "REQ-T-1 code changed: steps/lamp.steps.ts › ‹module›",
    )
  })

  test("keeps data-table cell boundaries", async () => {
    const table = (row) =>
      feature.replace(
        '      Then "Desk" is on',
        `      Then "Desk" is on\n        ${row}`,
      )
    const root = await lockedLamp({
      "lamp.feature": table("| a | b |"),
    })

    await writeFile(
      join(root, "lamp.feature"),
      table("| a \\| b |"),
    )

    expect(await detailsOf(root)).toContain(
      "REQ-T-1 spec: the steps or examples changed",
    )
  })

  test("names a renamed Rule or Feature", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "lamp.feature"),
      feature
        .replace(
          "Rule: A lamp does",
          "Rule: A lamp mostly does",
        )
        .replace("Feature: Lamp", "Feature: Light"),
    )

    expect(await detailsOf(root)).toEqual([
      'REQ-T-1 rule: "A lamp does what its switch says" -> "A lamp mostly does what its switch says"',
      'REQ-T-1 feature heading: "Lamp" -> "Light"',
    ])
  })

  test("rejects a lazy step glob", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "index.ts": `import.meta.glob("./steps/*.steps.ts", { eager: false })\n`,
    })

    expect(await rulesOf(root)).toEqual([
      "registration-mismatch",
    ])
  })

  test("refuses a lock in the wrong shape", () => {
    expect(() => parseLock("{}", "lock")).toThrow(
      "malformed",
    )
    expect(() =>
      parseLock(
        JSON.stringify({
          version: 1,
          requirements: {},
          code: {},
          retired: { "REQ-T-1": null },
        }),
        "lock",
      ),
    ).toThrow(
      "retired REQ-T-1 needs a scenario and a reason",
    )
  })

  test("diff reads the base lock through the base commit's own config", async () => {
    const root = await lockedLamp()
    const cli = resolve(
      import.meta.dirname,
      "../cli/requirements.js",
    )
    const git = (/** @type {string[]} */ ...args) =>
      execFileSync("git", args, {
        cwd: root,
        stdio: "pipe",
      })

    git("init", "-q")
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      "add",
      ".",
    )
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      "commit",
      "-qm",
      "base",
    )

    // Move the lock and drop the requirement without retiring it.
    await writeFile(
      join(root, "requirements.config.json"),
      JSON.stringify({
        ...config,
        lock: "moved.lock.json",
      }),
    )
    await writeFile(
      join(root, "lamp.feature"),
      feature.replaceAll("REQ-T-1", "REQ-T-2"),
    )

    let analysis = await analyzeProject(root)

    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )
    analysis = await analyzeProject(root)
    expect(
      lockProblems(analysis, await readLock(analysis)),
    ).toEqual([])

    /** @type {string} */
    let output = ""

    try {
      execFileSync(
        process.execPath,
        [cli, "diff", "--base", "HEAD", "--root", root],
        { cwd: root, stdio: "pipe" },
      )
    } catch (error) {
      output = String(
        /** @type {{ stderr?: Buffer }} */ (error).stderr,
      )
    }

    expect(output).toContain("removed-requirement")
  })
})

describe("changes found by the fourth review", () => {
  /** @param {Record<string, string>} files */
  const lockedLamp = async (files = {}) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      ...files,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    return root
  }

  /** @param {string} root */
  const resultOf = async (root) => {
    const analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    return {
      rules: analysis.problems.map(
        (problem) => problem.rule,
      ),
      details: describeChanges(
        locked,
        buildLock(analysis, locked),
      ).flatMap((change) =>
        change.details.map(
          (detail) => `${change.id} ${detail}`,
        ),
      ),
    }
  }

  test("rejects a step file with no steps, which would run for every scenario unhashed", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "steps/setup.steps.ts":
        'import { expect } from "vitest"\n\nexpect.extend({})\n',
    })

    expect((await resultOf(root)).rules).toEqual([
      "step-file-without-steps",
    ])
  })

  test("a patch in one step file changes requirements that use none of its steps", async () => {
    const other = `import { Given } from "../support/steps.ts"

/** A switch. */
Given("a switch", () => {})
`
    const root = await lockedLamp({
      "switch.feature": `Feature: Switch

  @REQ-T-2
  Scenario: A switch exists
    Given a switch
`,
      "steps/switch.steps.ts": other,
    })

    await writeFile(
      join(root, "steps/switch.steps.ts"),
      `${other}\nMath.random = () => 0\n`,
    )

    expect((await resultOf(root)).details).toContain(
      "REQ-T-1 code changed: steps/switch.steps.ts › ‹module›",
    )
  })

  test("follows the relative imports of runtime files, and side-effect imports", async () => {
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        runtime: [
          "index.ts",
          "support/**/*.ts",
          "../setup.ts",
        ],
      }),
      "../setup.ts":
        'import preview from "./preview.ts"\nimport "./patch.ts"\n\nvoid preview\n',
      "../preview.ts": "export default { a11y: true }\n",
      "../patch.ts": "export const patched = 1\n",
    })

    await writeFile(
      join(root, "../preview.ts"),
      "export default { a11y: false }\n",
    )
    await writeFile(
      join(root, "../patch.ts"),
      "export const patched = 2\n",
    )

    expect((await resultOf(root)).details).toEqual(
      expect.arrayContaining([
        "REQ-T-1 code changed: ../preview.ts › default",
        "REQ-T-1 code changed: ../patch.ts › patched",
      ]),
    )
  })

  test("reports a relative import it cannot follow, and resolves .js to .ts", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps
        .replace(
          '"../helpers/lamp.ts"',
          '"../helpers/lamp.js"',
        )
        .replace(
          'import { Given, Then, When } from "../support/steps.ts"',
          'import { Given, Then, When } from "../support/steps.ts"\nimport { kit } from "../helpers"\n',
        )
        .replace(
          "(world, name: string) => {})",
          "(world, name: string) => { void kit })",
        ),
    })

    expect((await resultOf(root)).rules).toEqual([
      "unresolved-import",
    ])
  })
})

describe("changes found by the fifth review", () => {
  /** @param {Record<string, string>} files */
  const lockedLamp = async (files = {}) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      ...files,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    return root
  }

  /** @param {string} root */
  const resultOf = async (root) => {
    const analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    return {
      rules: analysis.problems.map(
        (problem) => problem.rule,
      ),
      details: describeChanges(
        locked,
        buildLock(analysis, locked),
      ).flatMap((change) =>
        change.details.map(
          (detail) => `${change.id} ${detail}`,
        ),
      ),
    }
  }

  test("an effectful default export joins the module unit", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `${steps}\nexport default (globalThis.lampName = "Floor")\n`,
    )

    expect((await resultOf(root)).details).toContain(
      "REQ-T-1 code changed: steps/lamp.steps.ts › ‹module›",
    )
  })

  test("a barrel's own top-level code counts when a name passes through it", async () => {
    const barrel =
      'export { expectOn, turnOn } from "./lamp.ts"\n'
    const root = await lockedLamp({
      "helpers/lamp.ts": "export {}\n",
      "steps/lamp.steps.ts": steps.replace(
        'from "../helpers/lamp.ts"',
        'from "../../shared/index.ts"',
      ),
      "../shared/index.ts": barrel,
      "../shared/lamp.ts": helpers,
    })

    await writeFile(
      join(root, "../shared/index.ts"),
      `${barrel}\nthrow new Error("broken")\n`,
    )

    expect((await resultOf(root)).details).toContain(
      "REQ-T-1 code changed: ../shared/index.ts › ‹module›",
    )
  })

  test("the prose under Feature, Rule, and Scenario is part of the requirement, but rewrapping is not", async () => {
    const withProse = feature.replace(
      "Feature: Lamp\n",
      "Feature: Lamp\n  A lamp tells everyone when it is on.\n",
    )
    const root = await lockedLamp({
      "lamp.feature": withProse,
    })

    await writeFile(
      join(root, "lamp.feature"),
      withProse.replace(
        "A lamp tells everyone when",
        "A lamp tells everyone\n  when",
      ),
    )

    expect((await resultOf(root)).details).toEqual([])

    await writeFile(
      join(root, "lamp.feature"),
      withProse.replace("everyone", "some people"),
    )

    expect((await resultOf(root)).details).toEqual([
      "REQ-T-1 description: the Feature, Rule, or Scenario prose changed",
    ])
  })

  test("a CSS comment or reflow does not change the lock, and a rule does", async () => {
    const css = ".lamp { color: red; }\n"
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        runtime: [
          "index.ts",
          "support/**/*.ts",
          "../tokens.css",
        ],
      }),
      "../tokens.css": css,
    })

    await writeFile(
      join(root, "../tokens.css"),
      "/* The lamp. */\n.lamp {\n  color: red;\n}\n",
    )

    expect((await resultOf(root)).details).toEqual([])

    await writeFile(
      join(root, "../tokens.css"),
      ".lamp { color: blue; }\n",
    )

    expect((await resultOf(root)).details).toContain(
      "REQ-T-1 code changed: ../tokens.css",
    )
  })

  test("a release's version bump in a runtime package.json does not change the lock, and its exports do", async () => {
    const manifest = {
      name: "kit",
      version: "1.0.0",
      exports: { ".": "./index.js" },
    }
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        runtime: [
          "index.ts",
          "support/**/*.ts",
          "../kit/package.json",
        ],
      }),
      "../kit/package.json": JSON.stringify(manifest),
    })

    await writeFile(
      join(root, "../kit/package.json"),
      JSON.stringify({ ...manifest, version: "1.1.0" }),
    )

    expect((await resultOf(root)).details).toEqual([])

    await writeFile(
      join(root, "../kit/package.json"),
      JSON.stringify({
        ...manifest,
        exports: { ".": "./weak.js" },
      }),
    )

    expect((await resultOf(root)).details).toContain(
      "REQ-T-1 code changed: ../kit/package.json",
    )
  })

  test("reports an unresolved relative import even when nothing reads it", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": `import { gone } from "../helpers/gone.ts"\n${steps}`,
    })

    expect((await resultOf(root)).rules).toEqual([
      "unresolved-import",
    ])
  })
})

describe("changes found by the sixth review", () => {
  /** @param {Record<string, string>} files */
  const lockedLamp = async (files = {}) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "switch.feature": `Feature: Switch

  @REQ-T-2
  Scenario: A switch exists
    Given a switch
`,
      "steps/switch.steps.ts": `import { Given } from "../support/steps.ts"

/** A switch. */
Given("a switch", () => {})
`,
      ...files,
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    return root
  }

  /** @param {string} root */
  const resultOf = async (root) => {
    const analysis = await analyzeProject(root)
    const locked = await readLock(analysis)

    return {
      rules: analysis.problems.map(
        (problem) => problem.rule,
      ),
      details: describeChanges(
        locked,
        buildLock(analysis, locked),
      ).flatMap((change) =>
        change.details.map(
          (detail) => `${change.id} ${detail}`,
        ),
      ),
    }
  }

  test("a helper's top-level code marks requirements that never call it", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "helpers/lamp.ts"),
      `${helpers}\nMath.random = () => 0\n`,
    )

    expect((await resultOf(root)).details).toEqual(
      expect.arrayContaining([
        "REQ-T-1 now reaches: helpers/lamp.ts › ‹module›",
        "REQ-T-2 now reaches: helpers/lamp.ts › ‹module›",
      ]),
    )
  })

  test("follows a workspace package by name, through its exports, and skips its tests", async () => {
    const kit =
      'export const configure = () => ({ a11y: "error" })\n'
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        packages: { "@acme/kit": "../kit" },
        runtime: [
          "index.ts",
          "support/**/*.ts",
          "../kit/src/**/*.js",
        ],
      }),
      "../kit/package.json": JSON.stringify({
        name: "@acme/kit",
        exports: {
          "./setup": { source: "./src/setup.ts" },
        },
      }),
      "../kit/src/setup.ts": kit,
      "../kit/src/setup.test.js": "export {}\n",
      "support/setup.ts":
        'import { configure } from "@acme/kit/setup"\n\nconfigure()\n',
    })

    await writeFile(
      join(root, "../kit/src/setup.test.js"),
      "export const more = 1\n",
    )

    expect((await resultOf(root)).details).toEqual([])

    await writeFile(
      join(root, "../kit/src/setup.ts"),
      kit.replace('"error"', '"todo"'),
    )

    expect((await resultOf(root)).details).toEqual(
      expect.arrayContaining([
        "REQ-T-1 code changed: ../kit/src/setup.ts › configure",
        "REQ-T-2 code changed: ../kit/src/setup.ts › configure",
      ]),
    )
  })

  test("reports a re-export that does not resolve", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `${helpers}\nexport { gone } from "./gone.ts"\n`,
      "steps/lamp.steps.ts": steps,
    })

    expect((await resultOf(root)).rules).toEqual([
      "unresolved-import",
    ])
  })
})

describe("changes found by the seventh review", () => {
  const limit = "export default () => 0\n"
  const counter = `import allowed from "./limit.ts"

export const expectExact = (count: number) => {
  if (count > allowed()) throw new Error("too many")
}
`

  /**
   * A fixture outside the root that re-exports a helper in one of
   * three forms; the helper calls a third file.
   *
   * @param {string} barrel
   * @param {string} importLine
   * @param {string} call
   */
  const throughBarrel = async (
    barrel,
    importLine,
    call,
  ) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": `${importLine}\n${steps.replace(
        "expectOn(world, name)",
        `expectOn(world, name)\n  ${call}`,
      )}`,
      "../fixture/index.ts": barrel,
      "../fixture/expectExact.ts": counter,
      "../fixture/limit.ts": limit,
    })
    let analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    await writeFile(
      join(root, "../fixture/limit.ts"),
      "export default () => Number.POSITIVE_INFINITY\n",
    )
    analysis = await analyzeProject(root)

    const locked = await readLock(analysis)

    return describeChanges(
      locked,
      buildLock(analysis, locked),
    ).flatMap((change) =>
      change.details.map(
        (detail) => `${change.id} ${detail}`,
      ),
    )
  }

  test("follows a renamed re-export to the code it calls", async () => {
    expect(
      await throughBarrel(
        'export { expectExact as expectCount } from "./expectExact.ts"\n',
        'import { expectCount } from "../../fixture/index.ts"',
        "expectCount(1)",
      ),
    ).toContain(
      "REQ-T-1 code changed: ../fixture/limit.ts › default",
    )
  })

  test("follows a re-exported default", async () => {
    expect(
      await throughBarrel(
        'export { default } from "./limit.ts"\n',
        'import allowed from "../../fixture/index.ts"',
        "allowed()",
      ),
    ).toContain(
      "REQ-T-1 code changed: ../fixture/limit.ts › default",
    )
  })

  test("follows a namespace re-export", async () => {
    expect(
      await throughBarrel(
        'export * as counts from "./expectExact.ts"\n',
        'import { counts } from "../../fixture/index.ts"',
        "counts.expectExact(1)",
      ),
    ).toContain(
      "REQ-T-1 code changed: ../fixture/limit.ts › default",
    )
  })

  test("follows a literal dynamic import, and rejects a computed one", async () => {
    expect(
      await throughBarrel(
        "export {}\n",
        "",
        'await import("../../fixture/limit.ts")',
      ),
    ).toContain(
      "REQ-T-1 code changed: ../fixture/limit.ts › default",
    )

    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `${helpers}\nexport const load = (path: string) => import(path)\n`,
      "steps/lamp.steps.ts": steps
        .replace(
          "expectOn(world, name)",
          'expectOn(world, name)\n  void load("x")',
        )
        .replace(
          "import { expectOn, turnOn }",
          "import { expectOn, load, turnOn }",
        ),
    })

    expect(await rulesOf(root)).toEqual(["dynamic-import"])
  })

  test("follows a literal dynamic import of a barrel to the code it re-exports", async () => {
    expect(
      await throughBarrel(
        'export { expectExact } from "./expectExact.ts"\n',
        "",
        'void (await import("../../fixture/index.ts")).expectExact(1)',
      ),
    ).toContain(
      "REQ-T-1 code changed: ../fixture/limit.ts › default",
    )
  })

  test("rejects import.meta.glob in a fixture outside the root, and ignores one in a comment", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `// Never import.meta.glob here.\n${helpers}`,
      "steps/lamp.steps.ts": `import { check } from "../../fixture/checks.ts"\n${steps.replace(
        "expectOn(world, name)",
        "expectOn(world, name)\n  check()",
      )}`,
      "../fixture/checks.ts":
        'const loaded = import.meta.glob("./checks/*.ts", { eager: true })\n\nexport const check = () => loaded\n',
    })

    expect(await rulesOf(root)).toEqual([
      "glob-outside-entry",
    ])
  })

  test("names each changed requirement on its own line of the lock", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    const analysis = await analyzeProject(root)
    const lock = buildLock(
      analysis,
      await readLock(analysis),
    )

    expect(Object.keys(lock.digests ?? {})).toEqual([
      "REQ-T-1",
    ])
  })

  test("an inline type specifier added to an import is not a change", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    let analysis = await analyzeProject(root)

    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )
    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      steps.replace(
        "import { expectOn, turnOn }",
        "import { expectOn, type Lamp, turnOn }",
      ),
    )
    analysis = await analyzeProject(root)

    expect(
      lockProblems(analysis, await readLock(analysis)),
    ).toEqual([])
  })

  test("rejects import.meta.glob outside the setup file", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "support/more.ts":
        'import.meta.glob("../extra/*.ts", { eager: true })\n',
    })

    expect(await rulesOf(root)).toEqual([
      "glob-outside-entry",
    ])
  })
})

describe("changes found by the ninth review", () => {
  const twoLamps = `${feature}
    @REQ-T-2
    Scenario: Turning another lamp on
      Given a lamp named "Hall"
      When I turn on "Hall"
      Then "Hall" is on
`

  /**
   * The digest lines that differ between two versions of the feature.
   *
   * @param {string} edited
   */
  const changedDigests = async (edited) => {
    const root = await makeProject({
      "lamp.feature": twoLamps,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })
    let analysis = await analyzeProject(root)
    const before = buildLock(
      analysis,
      await readLock(analysis),
    ).digests

    await writeFile(join(root, "lamp.feature"), edited)
    analysis = await analyzeProject(root)

    const after = buildLock(
      analysis,
      await readLock(analysis),
    ).digests

    return Object.keys(after).filter(
      (id) => after[id] !== before[id],
    )
  }

  test("a steps-only change alters exactly one digest line", async () => {
    expect(
      await changedDigests(
        // The same step definitions run, so only the text differs.
        twoLamps.replace(
          'Then "Hall" is on',
          'Then "Porch" is on',
        ),
      ),
    ).toEqual(["REQ-T-2"])
  })

  test("a tag-only change alters exactly one digest line", async () => {
    expect(
      await changedDigests(
        twoLamps.replace(
          "    @REQ-T-2\n",
          "    @REQ-T-2 @todo\n",
        ),
      ),
    ).toEqual(["REQ-T-2"])
  })

  test("a literal dynamic import enters the top-level code of what its target imports", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps.replace(
        "expectOn(world, name)",
        'expectOn(world, name)\n  void (await import("../../fixture/impl.ts")).check()',
      ),
      "../fixture/impl.ts":
        'import { describe } from "./describe.ts"\n\nexport const check = () => describe()\n',
      "../fixture/describe.ts":
        'import { formatters } from "./formatters.ts"\n\nexport const describe = () => "lamp"\n\nexport const other = () => formatters\n',
      "../fixture/formatters.ts":
        "export const formatters = {}\n\nglobalThis.patched = false\n",
    })
    let analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )
    await writeFile(
      join(root, "../fixture/formatters.ts"),
      "export const formatters = {}\n\nglobalThis.patched = true\n",
    )
    analysis = await analyzeProject(root)

    const locked = await readLock(analysis)

    expect(
      describeChanges(
        locked,
        buildLock(analysis, locked),
      ).flatMap((change) =>
        change.details.map(
          (detail) => `${change.id} ${detail}`,
        ),
      ),
    ).toContain(
      "REQ-T-1 code changed: ../fixture/formatters.ts › ‹module›",
    )
  })
})

describe("changes found by the tenth review", () => {
  /**
   * Locks a clean project, applies `edits`, and lists each change.
   *
   * @param {Record<string, string>} edits
   * @param {Record<string, string>} [extra]
   */
  const changesAfter = async (edits, extra = {}) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      ...extra,
    })
    let analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    for (const [file, text] of Object.entries(edits)) {
      await writeFile(join(root, file), text)
    }

    analysis = await analyzeProject(root)

    const locked = await readLock(analysis)

    return describeChanges(
      locked,
      buildLock(analysis, locked),
    ).flatMap((change) =>
      change.details.map(
        (detail) => `${change.id} ${detail}`,
      ),
    )
  }

  test("a class whose extends clause runs code joins the module unit", async () => {
    expect(
      (
        await changesAfter({
          "helpers/lamp.ts": `${helpers}\nconst withPatch = () => Object\n\nexport class Patched extends withPatch() {}\n`,
        })
      ).join("\n"),
    ).toContain("helpers/lamp.ts › ‹module›")
  })

  test("a getter read or a template with a value joins the module unit", async () => {
    const patcher =
      "const patcher = {\n  get now() {\n    return 1\n  },\n}\n"

    for (const line of [
      "export const patchedAt = patcher.now\n",
      "export const patchedText = `${patcher}`\n",
    ]) {
      expect(
        (
          await changesAfter({
            "helpers/lamp.ts": `${helpers}\n${patcher}\n${line}`,
          })
        ).join("\n"),
      ).toContain("helpers/lamp.ts › ‹module›")
    }
  })

  test("rejects a JSX pragma comment", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `/** @jsxImportSource ./fakeJsx */\n${helpers}`,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toEqual(["jsx-pragma"])
  })

  test("follows an empty import list like a side-effect import", async () => {
    expect(
      await changesAfter(
        {
          "fixtures/patch.ts": "globalThis.patched = 2\n",
        },
        {
          "helpers/lamp.ts": `import {} from "../fixtures/patch.ts"\n${helpers}`,
          "fixtures/patch.ts": "globalThis.patched = 1\n",
        },
      ),
    ).toContain(
      "REQ-T-1 code changed: fixtures/patch.ts › ‹module›",
    )
  })
})

describe("registration", () => {
  test("rejects a step file the setup file never loads", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "extra/more.ts": `import { Then } from "../support/steps.ts"\n\nThen("{string} is bright", () => {})\n`,
    })

    expect(await rulesOf(root)).toEqual([
      "step-outside-step-files",
    ])
  })

  test("rejects a setup file whose glob differs from the config", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
      "index.ts": `import.meta.glob("./steps/lamp.steps.ts", { eager: true })\n`,
    })

    expect(await rulesOf(root)).toEqual([
      "registration-mismatch",
    ])
  })

  test("rejects a hook or a namespace import from quickpickle outside the runtime files", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": `import { AfterStep } from "quickpickle"\nimport type { QuickPickleWorld } from "quickpickle"\n${steps}\nAfterStep(() => {})\n`,
    })

    expect(await rulesOf(root)).toEqual([
      "quickpickle-outside-runtime",
    ])
  })

  test("refuses to run without a config, instead of scanning a whole repository", async () => {
    const root = await makeProject({})

    await rm(join(root, "requirements.config.json"))

    await expect(loadProject(root)).rejects.toThrow(
      "Pass --root",
    )
  })
})

describe("names and keywords", () => {
  test("rejects a tag-like word in a name, an Examples tag, a leading And, and a * step", async () => {
    const root = await makeProject({
      "lamp.feature": `Feature: Lamp

  Scenario Outline: Turning a lamp on @responsive
    And a lamp named "<name>"
    * I turn on "<name>"
    Then "<name>" is on

    @todo
    Examples:
      | name |
      | Desk |
`.replace(
        "  Scenario Outline",
        "  @REQ-T-1\n  Scenario Outline",
      ),
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect((await rulesOf(root)).sort()).toEqual([
      "examples-tag",
      "leading-conjunction",
      "star-keyword",
      "tag-in-name",
    ])
  })

  test("treats a zero-padded ID as the same requirement", async () => {
    const root = await makeProject({
      "lamp.feature": `${feature}
    @REQ-T-01
    Scenario: Turning a lamp on twice
      Given a lamp named "Desk"
      When I turn on "Desk"
      Then "Desk" is on
`,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toEqual(["duplicate-id"])
  })
})

describe("against the base branch", () => {
  const entry = {
    feature: "lamp.feature",
    scenario: "Turning a lamp on",
    status: /** @type {const} */ ("active"),
    steps: [],
    code: [],
  }

  test("fails when a tombstone is deleted, a requirement vanishes, or a retired ID returns padded", () => {
    const base = {
      version: /** @type {const} */ (1),
      requirements: { "REQ-T-2": entry },
      code: {},
      retired: {
        "REQ-T-1": { scenario: "Old", reason: "replaced" },
      },
    }
    const head = {
      version: /** @type {const} */ (1),
      requirements: { "REQ-T-01": entry },
      code: {},
      retired: {},
    }

    expect(
      baseProblems(base, head, "requirements.lock.json")
        .map((problem) => problem.rule)
        .sort(),
    ).toEqual([
      "missing-tombstone",
      "removed-requirement",
      "retired-id",
    ])
    expect(
      describeChanges(base, head).map(
        (change) => `${change.id} ${change.kind}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "REQ-T-1 removed",
        "REQ-T-2 removed",
      ]),
    )
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
