import { execFileSync } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
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
})

describe("changes found by the sixth review", () => {
  /** @param {Record<string, string>} files */
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
})

describe("changes found by the tenth review", () => {
  test("rejects a JSX pragma comment", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `/** @jsxImportSource ./fakeJsx */\n${helpers}`,
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toEqual(["jsx-pragma"])
  })
})

describe("changes found by the twelfth review", () => {
  /**
   * The code keys REQ-T-1 reaches when its Then step calls `check`
   * from a fixture barrel.
   *
   * @param {Record<string, string>} fixture
   */
  const reachedThroughBarrel = async (fixture) => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": `import { check } from "../../fixture/index.ts"\n${steps.replace(
        "expectOn(world, name)",
        "expectOn(world, name)\n  check()",
      )}`,
      ...fixture,
    })
    const analysis = await analyzeProject(root)

    return {
      problems: analysis.problems.map(
        (problem) => problem.rule,
      ),
      code:
        buildLock(analysis, await readLock(analysis))
          .requirements["REQ-T-1"]?.code ?? [],
    }
  }

  test("an export * in front of a named chain still hashes the file the chain ends in", async () => {
    const { code } = await reachedThroughBarrel({
      "../fixture/index.ts": 'export * from "./a.ts"\n',
      "../fixture/a.ts": 'export { check } from "./b.ts"\n',
      "../fixture/b.ts":
        "let impl = () => 0\n\nexport const setup = () => {\n  impl = () => 1\n}\n\nexport { impl as check }\n",
    })

    expect(code).toContain("../fixture/b.ts")
  })

  test("a non-code export * written first does not shadow a later chain", async () => {
    for (const [first, mid, leaf] of [
      [
        "nope.json",
        'export { default as check } from "./data.json"\n',
        "data.json",
      ],
      [
        "s.module.css",
        'export { default as check } from "./data.json"\n',
        "data.json",
      ],
      [
        "nope.json",
        'export { check } from "./b.module.css"\n',
        "b.module.css",
      ],
    ]) {
      const { code } = await reachedThroughBarrel({
        "../fixture/index.ts": `export * from "./${first}"\nexport * from "./mid.ts"\n`,
        "../fixture/nope.json": '{ "nope": 1 }\n',
        "../fixture/s.module.css": ".s { color: red; }\n",
        "../fixture/mid.ts": mid,
        "../fixture/data.json": '{ "check": 1 }\n',
        "../fixture/b.module.css":
          ".check { color: red; }\n",
      })

      expect(code).toContain(`../fixture/${leaf}`)
    }
  })

  test("a non-code fallback in a nested barrel does not shadow a later chain", async () => {
    for (const [inner, mid, leaf] of [
      [
        'export * from "./s.module.css"\n',
        'export { default as check } from "./data.json"\n',
        "data.json",
      ],
      [
        'export * from "./s.module.css"\n',
        'export { check } from "./b.module.css"\n',
        "b.module.css",
      ],
      [
        'export * from "./arr.json"\n',
        'export { default as check } from "./data.json"\n',
        "data.json",
      ],
      [
        'export * from "./s.module.css"\nexport * from "./index.ts"\n',
        'export { default as check } from "./data.json"\n',
        "data.json",
      ],
    ]) {
      const { code } = await reachedThroughBarrel({
        "../fixture/index.ts":
          'export * from "./styles.ts"\nexport * from "./mid.ts"\n',
        "../fixture/styles.ts": inner,
        "../fixture/s.module.css": ".s { color: red; }\n",
        "../fixture/arr.json": "[1]\n",
        "../fixture/mid.ts": mid,
        "../fixture/data.json": '{ "x": 1 }\n',
        "../fixture/b.module.css":
          ".check { color: red; }\n",
      })

      expect(code).toContain(`../fixture/${leaf}`)
    }
  })

  test("an export * of malformed JSON does not crash the checker", async () => {
    // Nothing supplies the name, so the barrel is hashed whole.
    const { code } = await reachedThroughBarrel({
      "../fixture/index.ts": 'export * from "./bad.json"\n',
      "../fixture/bad.json": "{ not json\n",
    })

    expect(code).toContain("../fixture/index.ts")
  })

  test("a namespace import hashes a JSON file its barrel re-exports", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": `import * as data from "../../fixture/index.ts"\n${steps.replace(
        "expectOn(world, name)",
        "expectOn(world, name)\n  void data",
      )}`,
      "../fixture/index.ts":
        'export * from "./data.json"\n',
      "../fixture/data.json": '{ "check": 1 }\n',
    })
    const analysis = await analyzeProject(root)
    const lock = buildLock(
      analysis,
      await readLock(analysis),
    )

    expect(lock.requirements["REQ-T-1"]?.code).toContain(
      "../fixture/data.json",
    )
  })

  test("still resolves an exact package.json or index file", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `import "./q/index.ts"\nimport manifest from "./q/package.json"\n\nexport const version = () => manifest\n${helpers}`,
      "helpers/q/index.ts": "export {}\n",
      "helpers/q/package.json": '{ "version": "1.0.0" }\n',
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).not.toContain(
      "unresolved-import",
    )
  })

  test("rejects a step handler that is not an inline function", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps.replace(
        'Given("a lamp named {string}", (world, name: string) => {})',
        'Given("a lamp named {string}", (0, (world, name: string) => {}))',
      ),
    })

    expect(await rulesOf(root)).toEqual([
      "step-handler-shape",
    ])
  })

  test("accepts a parenthesized inline handler, and rejects a missing one", async () => {
    const wrapped = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps.replace(
        'Given("a lamp named {string}", (world, name: string) => {})',
        'Given("a lamp named {string}", ((world, name: string) => {}))',
      ),
    })

    expect(await rulesOf(wrapped)).toEqual([])

    const missing = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "steps/lamp.steps.ts": steps.replace(
        'Given("a lamp named {string}", (world, name: string) => {})',
        'Given("a lamp named {string}")',
      ),
    })

    expect(await rulesOf(missing)).toEqual([
      "step-handler-shape",
    ])
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

/**
 * The lock records files, as esbuild resolves them. These tests plant
 * the edits an agent could make to weaken a requirement, and the
 * edits that must not count.
 */
describe("the file-level lock", () => {
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

  test("names the requirement whose helper was weakened, though no English changed", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "helpers/lamp.ts"),
      helpers.replace(
        "if (!world.on.has(name)) throw new Error(name)",
        "return",
      ),
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: helpers/lamp.ts",
    ])
  })

  test("lists the runtime once, and a runtime change once for every requirement", async () => {
    const parameterTypes = `import { defineParameterType } from "quickpickle"

defineParameterType({ name: "lamp", regexp: /desk|floor/, transformer: (name: string) => name })
`
    const root = await lockedLamp({
      "support/parameterTypes.ts": parameterTypes,
    })
    const analysis = await analyzeProject(root)
    const lock = buildLock(
      analysis,
      await readLock(analysis),
    )

    expect(lock.version).toBe(2)
    expect(lock.shared).toEqual([
      "index.ts",
      "requirements.config.json",
      "support/parameterTypes.ts",
      "support/steps.ts",
    ])
    expect(lock.requirements["REQ-T-1"]?.code).toEqual([
      "helpers/lamp.ts",
      "steps/lamp.steps.ts",
    ])

    await writeFile(
      join(root, "support/parameterTypes.ts"),
      parameterTypes.replace("=> name", '=> "desk"'),
    )
    await writeFile(
      join(root, "support/steps.ts"),
      wrapper.replace(
        "export const Then = () => {}",
        "export const Then = () => undefined",
      ),
    )

    expect(await detailsOf(root)).toEqual([
      "Every requirement code changed: support/parameterTypes.ts",
      "Every requirement code changed: support/steps.ts",
    ])
  })

  test("ignores comments, formatting, and types, but not an unused value import", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "helpers/lamp.ts"),
      `// A note.\n${helpers.replace("(world: World, name: string) =>", '(\n  world: World,\n  name: string | "Desk",\n) =>')}`,
    )
    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `import type { World } from "../support/world.ts"\n${steps.replace("import {", "import { type World as Other,")}`,
    )

    expect(await detailsOf(root)).toEqual([])

    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `import "../helpers/patch.ts"\n${steps}`,
    )
    await writeFile(
      join(root, "helpers/patch.ts"),
      "Math.random = () => 0\n",
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 now loads: helpers/patch.ts",
      "REQ-T-1 code changed: steps/lamp.steps.ts",
    ])

    // A tsconfig with verbatimModuleSyntax keeps an unused named
    // import, which runs the module, so the hash keeps it too.
    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `import { turnOn as unused } from "../helpers/lamp.ts"\n${steps}`,
    )

    expect(await detailsOf(root)).toContain(
      "REQ-T-1 code changed: steps/lamp.steps.ts",
    )
  })

  test("hashes a fixture outside the root whole, and never a subject", async () => {
    const fixture = `import { Lamp } from "./Lamp.tsx"

export default { component: Lamp }

export const Desk = { args: { name: "Desk" } }
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
          'import { Given, Then, When } from "../support/steps.ts"\nimport { Desk } from "../../ui/Lamp.stories.tsx"',
        )
        .replace(
          "(world, name: string) => {})",
          "(world, name: string) => { void Desk })",
        ),
    })

    await writeFile(
      join(root, "../ui/Lamp.tsx"),
      "export const Lamp = () => undefined\n",
    )

    expect(await detailsOf(root)).toEqual([])

    await writeFile(
      join(root, "../ui/Lamp.stories.tsx"),
      fixture.replace('"Desk" }', '"Lamp" }'),
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: ../ui/Lamp.stories.tsx",
    ])
  })

  test("a new step file and its feature leave existing requirements alone", async () => {
    const root = await lockedLamp()

    await writeFile(
      join(root, "fan.feature"),
      `Feature: Fan\n\n  @REQ-T-2\n  Scenario: A fan spins\n    Given a fan\n`,
    )
    await writeFile(
      join(root, "steps/fan.steps.ts"),
      `import { Given } from "../support/steps.ts"\nimport "../helpers/fan.ts"\n\nGiven("a fan", () => {})\n`,
    )
    await writeFile(
      join(root, "helpers/fan.ts"),
      "export {}\n",
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-2 status: active",
    ])
  })

  test("a top-level patch in a step file marks that step file's requirements", async () => {
    // Every step file loads for every scenario, so this patch also
    // runs under REQ-T-2. The lock still goes stale, naming REQ-T-1.
    const root = await lockedLamp({
      "fan.feature": `Feature: Fan\n\n  @REQ-T-2\n  Scenario: A fan spins\n    Given a fan\n`,
      "steps/fan.steps.ts": `import { Given } from "../support/steps.ts"\n\nGiven("a fan", () => {})\n`,
    })

    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      `${steps}\nMath.random = () => 0\n`,
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: steps/lamp.steps.ts",
    ])
  })

  test("follows a workspace package through node_modules, and stops at an npm package", async () => {
    const root = await lockedLamp({
      "../kit/package.json": JSON.stringify({
        name: "@test/kit",
        version: "1.0.0",
        exports: {
          ".": {
            source: "./src/index.ts",
            default: "./dist/index.js",
          },
        },
      }),
      "../kit/src/index.ts":
        'export { check } from "./check.ts"\n',
      "../kit/src/check.ts":
        "export const check = () => 1\n",
      "../node_modules/left-pad/package.json":
        JSON.stringify({
          name: "left-pad",
          version: "1.0.0",
          main: "index.js",
        }),
      "../node_modules/left-pad/index.js":
        "export default () => 1\n",
    })

    await mkdir(join(root, "../node_modules/@test"), {
      recursive: true,
    })
    await symlink(
      join(root, "../kit"),
      join(root, "../node_modules/@test/kit"),
    )
    await writeFile(
      join(root, "helpers/lamp.ts"),
      `import { check } from "@test/kit"\nimport pad from "left-pad"\n\nexport const verify = () => check() + pad()\n${helpers}`,
    )
    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      steps
        .replace(
          "expectOn(world, name)",
          "expectOn(world, name)\n  verify()",
        )
        .replace(
          "import { expectOn,",
          "import { verify, expectOn,",
        ),
    )

    const details = await detailsOf(root)

    expect(details).toContain(
      "REQ-T-1 now loads: ../kit/src/check.ts",
    )
    expect(
      details.some((detail) => detail.includes("left-pad")),
    ).toBe(false)
  })

  test("picks the file Vite would for an extensionless import", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "helpers/lamp.js":
        "export const expectOn = () => {}\nexport const turnOn = () => {}\n",
      "steps/lamp.steps.ts": steps.replace(
        '"../helpers/lamp.ts"',
        '"../helpers/lamp"',
      ),
    })
    const analysis = await analyzeProject(root)

    expect(
      buildLock(analysis, await readLock(analysis))
        .requirements["REQ-T-1"]?.code,
    ).toContain("helpers/lamp.js")
  })

  test("follows a literal dynamic import, and rejects a computed one", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `${helpers}\nexport const later = () => import("./late.ts")\nexport const computed = (name: string) => import(name)\n`,
      "helpers/late.ts": "export const late = 1\n",
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  later()\n  computed(name)",
        )
        .replace(
          "import { expectOn,",
          "import { computed, later, expectOn,",
        ),
    })
    const analysis = await analyzeProject(root)

    expect(
      analysis.problems.map((problem) => problem.rule),
    ).toEqual(["dynamic-import"])
    expect(
      buildLock(analysis, await readLock(analysis))
        .requirements["REQ-T-1"]?.code,
    ).toContain("helpers/late.ts")
  })

  test("rejects a quickpickle hook in a helper outside the root", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `import "../../shared/hooks.ts"\n${helpers}`,
      "../shared/hooks.ts":
        'import { Before } from "quickpickle"\n\nBefore(() => {})\n',
      "steps/lamp.steps.ts": steps,
    })

    expect(await rulesOf(root)).toContain(
      "quickpickle-outside-runtime",
    )
  })

  test("reports a file it cannot read instead of crashing", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `import data from "./data.json"\n\nexport const value = () => data\n${helpers}`,
      "helpers/data.json": "{ not json\n",
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  value()",
        )
        .replace(
          "import { expectOn,",
          "import { value, expectOn,",
        ),
    })

    expect(await rulesOf(root)).toContain(
      "unresolved-import",
    )
  })

  test("reads JSON with a byte-order mark, and ignores a release's version bump", async () => {
    const manifest = {
      name: "lamp-config",
      version: "1.0.0",
      exports: { ".": "./index.js" },
    }
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        runtime: [
          "index.ts",
          "support/**/*.ts",
          "lamp.json",
          "../package.json",
        ],
      }),
      "lamp.json": '﻿{ "brightness": 1 }\n',
      "../package.json": JSON.stringify(manifest),
    })

    await writeFile(
      join(root, "../package.json"),
      JSON.stringify({ ...manifest, version: "1.0.1" }),
    )

    expect(await detailsOf(root)).toEqual([])

    await writeFile(
      join(root, "../package.json"),
      JSON.stringify({
        ...manifest,
        exports: { ".": "./other.js" },
      }),
    )

    expect(await detailsOf(root)).toEqual([
      "Every requirement code changed: ../package.json",
    ])
  })

  test("a CSS comment or reflow does not change the lock, and a rule does", async () => {
    const css = ".lamp { color: red; }\n"
    const root = await lockedLamp({
      "helpers/lamp.ts": `import "./lamp.css"\n${helpers}`,
      "helpers/lamp.css": css,
    })

    await writeFile(
      join(root, "helpers/lamp.css"),
      `/* warm */\n.lamp {\n  color: red;\n}\n`,
    )

    expect(await detailsOf(root)).toEqual([])

    await writeFile(
      join(root, "helpers/lamp.css"),
      ".lamp { color: blue; }\n",
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: helpers/lamp.css",
    ])
  })

  test("hashes a file imported as text or a URL byte for byte", async () => {
    const root = await lockedLamp({
      "helpers/lamp.ts": `import template from "../fixtures/template.ts?raw"\n\nexport const page = () => [template, new URL("./data.txt", import.meta.url), new URL("data.json", import.meta.url)]\n${helpers}`,
      "helpers/data.json": '{ "on": true }\n',
      "fixtures/template.ts": "export const x = 1\n",
      "helpers/data.txt": "on\n",
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  page()",
        )
        .replace(
          "import { expectOn,",
          "import { page, expectOn,",
        ),
    })

    // As text, a comment is part of what the test reads.
    await writeFile(
      join(root, "fixtures/template.ts"),
      "// on\nexport const x = 1\n",
    )
    await writeFile(join(root, "helpers/data.txt"), "off\n")
    await writeFile(
      join(root, "helpers/data.json"),
      '{ "on": true }\n\n',
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: fixtures/template.ts",
      "REQ-T-1 code changed: helpers/data.json",
      "REQ-T-1 code changed: helpers/data.txt",
    ])
  })

  test("follows a worker and an inline stylesheet, and hashes a subject read as text", async () => {
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        subjects: ["../ui/*.tsx"],
      }),
      "../ui/Example.tsx":
        "export const Example = () => null\n",
      "helpers/lamp.ts": `import Worker from "./worker.ts?worker"\nimport css from "./lamp.css?inline"\nimport source from "../../ui/Example.tsx?raw"\nimport UrlWorker from "./url-worker.ts?url"\n\nexport const assets = () => [Worker, css, source, UrlWorker, new Worker(new URL("./other-worker.ts", import.meta.url))]\n${helpers}`,
      "helpers/worker.ts":
        'import { reply } from "./child.ts"\n\npostMessage(reply)\n',
      "helpers/child.ts": "export const reply = 1\n",
      "helpers/other-worker.ts":
        'import { reply } from "./other-child.ts"\n\npostMessage(reply)\n',
      "helpers/other-child.ts": "export const reply = 1\n",
      "helpers/url-worker.ts": "postMessage(1)\n",
      "helpers/lamp.css": '@import "./inner.css";\n',
      "helpers/inner.css": ".lamp { color: red; }\n",
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  assets()",
        )
        .replace(
          "import { expectOn,",
          "import { assets, expectOn,",
        ),
    })

    await writeFile(
      join(root, "helpers/child.ts"),
      "export const reply = 2\n",
    )
    await writeFile(
      join(root, "helpers/other-child.ts"),
      "export const reply = 2\n",
    )
    await writeFile(
      join(root, "helpers/inner.css"),
      ".lamp { color: blue; }\n",
    )
    await writeFile(
      join(root, "../ui/Example.tsx"),
      "// A note.\nexport const Example = () => null\n",
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: ../ui/Example.tsx",
      "REQ-T-1 code changed: helpers/child.ts",
      "REQ-T-1 code changed: helpers/inner.css",
      "REQ-T-1 code changed: helpers/other-child.ts",
    ])
  })

  test("rejects a root URL, and ignores one in a comment", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": `// new URL("./missing.txt", import.meta.url)\nexport const asset = () => new URL("/data.txt", import.meta.url)\n${helpers}`,
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  asset()",
        )
        .replace(
          "import { expectOn,",
          "import { asset, expectOn,",
        ),
    })
    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([
      expect.objectContaining({
        rule: "unresolved-import",
        message: expect.stringContaining('"/data.txt"'),
      }),
    ])
  })

  test("a workspace package's exports choose its files, as Vite's conditions do", async () => {
    const manifest = {
      name: "@test/kit",
      version: "1.0.0",
      exports: {
        "./a": {
          development: "./dev.js",
          import: "./prod.js",
        },
        "./first": "./one.js",
        "./second": "./two.js",
      },
    }
    const root = await lockedLamp({
      "../kit/package.json": JSON.stringify(manifest),
      "../kit/dev.js": "export const x = 1\n",
      "../kit/prod.js": "export const x = 1\n",
      "../kit/one.js": "export const value = 1\n",
      "../kit/two.js": "export const value = 2\n",
    })

    await mkdir(join(root, "../node_modules/@test"), {
      recursive: true,
    })
    await symlink(
      join(root, "../kit"),
      join(root, "../node_modules/@test/kit"),
    )
    await writeFile(
      join(root, "helpers/lamp.ts"),
      `import { x } from "@test/kit/a"\nimport { value as first } from "@test/kit/first"\nimport { value as second } from "@test/kit/second"\n\nexport const kit = () => x + first - second\n${helpers}`,
    )
    await writeFile(
      join(root, "steps/lamp.steps.ts"),
      steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  kit()",
        )
        .replace(
          "import { expectOn,",
          "import { kit, expectOn,",
        ),
    )

    let analysis = await analyzeProject(root)

    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    expect(
      (await readLock(analysis)).requirements["REQ-T-1"]
        ?.code,
    ).toEqual(
      expect.arrayContaining([
        "../kit/dev.js",
        "../kit/package.json",
      ]),
    )

    await writeFile(
      join(root, "../kit/package.json"),
      JSON.stringify({
        ...manifest,
        exports: {
          ...manifest.exports,
          "./first": "./two.js",
          "./second": "./one.js",
        },
      }),
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: ../kit/package.json",
    ])

    await writeFile(
      join(root, "../kit/package.json"),
      JSON.stringify({ ...manifest, version: "1.0.1" }),
    )
    analysis = await analyzeProject(root)

    expect(
      lockProblems(analysis, await readLock(analysis)),
    ).toEqual([])
  })

  test("CSS keeps selectors and strings exact, and a runtime stylesheet's imports count", async () => {
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        runtime: [
          "index.ts",
          "support/**/*.ts",
          "runtime.css",
        ],
      }),
      "runtime.css": '@import "./inner.css";\n',
      "inner.css": 'a :hover { content: "a  b"; }\n',
    })

    await writeFile(
      join(root, "inner.css"),
      'a:hover { content: "a  b"; }\n',
    )

    expect(await detailsOf(root)).toEqual([
      "Every requirement code changed: inner.css",
    ])

    await writeFile(
      join(root, "inner.css"),
      'a:hover { content: "a b"; }\n',
    )

    expect(await detailsOf(root)).toEqual([
      "Every requirement code changed: inner.css",
    ])
  })

  test("a package.json imported as data counts whole", async () => {
    const root = await lockedLamp({
      "helpers/lamp.ts": `import manifest from "../fixtures/package.json"\n\nexport const version = () => manifest.version\n${helpers}`,
      "fixtures/package.json":
        '{ "name": "lamp", "version": "1.0.0" }\n',
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          "turnOn(world, name)\n  version()",
        )
        .replace(
          "import { expectOn,",
          "import { version, expectOn,",
        ),
    })

    await writeFile(
      join(root, "fixtures/package.json"),
      '{ "name": "lamp", "version": "1.0.1" }\n',
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: fixtures/package.json",
    ])
  })

  /**
   * Links `../kit` into `../node_modules/@test/kit`, as pnpm links a
   * workspace package.
   *
   * @param {string} root
   */
  const linkKit = async (root) => {
    await mkdir(join(root, "../node_modules/@test"), {
      recursive: true,
    })
    await symlink(
      join(root, "../kit"),
      join(root, "../node_modules/@test/kit"),
    )
  }

  /**
   * The lamp steps, calling a helper the test adds to `lamp.ts`.
   *
   * @param {string} name
   */
  const stepsCalling = (name) =>
    steps
      .replace(
        "turnOn(world, name)",
        `turnOn(world, name)\n  ${name}()`,
      )
      .replace(
        "import { expectOn,",
        `import { ${name}, expectOn,`,
      )

  test("tracks the package's own manifest when its exports point into a folder with another one", async () => {
    const manifest = {
      name: "@test/kit",
      exports: {
        "./first": "./nested/one.js",
        "./second": "./nested/two.js",
      },
    }
    const root = await makeProject({
      "lamp.feature": feature,
      "../kit/package.json": JSON.stringify(manifest),
      "../kit/nested/package.json":
        '{ "type": "module" }\n',
      "../kit/nested/one.js": "export const value = 1\n",
      "../kit/nested/two.js": "export const value = 2\n",
      "helpers/lamp.ts": `import { value as first } from "@test/kit/first"\nimport { value as second } from "@test/kit/second"\n\nexport const kit = () => first - second\n${helpers}`,
      "steps/lamp.steps.ts": stepsCalling("kit"),
    })

    await linkKit(root)

    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    await writeFile(
      join(root, "../kit/package.json"),
      JSON.stringify({
        ...manifest,
        exports: {
          "./first": "./nested/two.js",
          "./second": "./nested/one.js",
        },
      }),
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: ../kit/package.json",
    ])

    await writeFile(
      join(root, "../kit/nested/package.json"),
      '{ "type": "commonjs" }\n',
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: ../kit/nested/package.json",
      "REQ-T-1 code changed: ../kit/package.json",
    ])
  })

  test("a manifest that also chooses exports counts whole when a module reads it as data", async () => {
    const manifest = {
      name: "@test/kit",
      version: "1.0.0",
      exports: { ".": "./index.js" },
    }
    const root = await makeProject({
      "lamp.feature": feature,
      "../kit/package.json": JSON.stringify(manifest),
      "../kit/index.js": "export const value = 1\n",
      "helpers/lamp.ts": `import { value } from "@test/kit"\nimport kitManifest from "../../kit/package.json"\n\nexport const kit = () => value + kitManifest.version\n${helpers}`,
      "steps/lamp.steps.ts": stepsCalling("kit"),
    })

    await linkKit(root)

    const analysis = await analyzeProject(root)

    expect(analysis.problems).toEqual([])
    await writeLock(
      analysis,
      buildLock(analysis, await readLock(analysis)),
    )

    await writeFile(
      join(root, "../kit/package.json"),
      JSON.stringify({ ...manifest, version: "1.0.1" }),
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: ../kit/package.json",
    ])
  })

  test("follows a chain of workers to its end", async () => {
    /** @type {Record<string, string>} */
    const workers = {}

    for (let index = 0; index < 13; index += 1) {
      workers[`helpers/w${index}.ts`] =
        index < 12
          ? `import Next from "./w${index + 1}.ts?worker"\n\nnew Next()\n`
          : "postMessage(1)\n"
    }

    const root = await lockedLamp({
      ...workers,
      "helpers/lamp.ts": `import First from "./w0.ts?worker"\n\nexport const work = () => new First()\n${helpers}`,
      "steps/lamp.steps.ts": stepsCalling("work"),
    })

    await writeFile(
      join(root, "helpers/w12.ts"),
      "postMessage(2)\n",
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: helpers/w12.ts",
    ])
  })

  test("reads new URL calls from the syntax tree, and a template as Vite's glob", async () => {
    const root = await lockedLamp({
      "helpers/lamp.ts": `const note = 'new URL("./missing.txt", import.meta.url)'\n\nexport const fixture = (name: string) => [note, new URL(\`../fixtures/\${name}.json\`, import.meta.url)]\n${helpers}`,
      "fixtures/day.json": '{ "on": true }\n',
      "fixtures/night.json": '{ "on": false }\n',
      "steps/lamp.steps.ts": steps
        .replace(
          "turnOn(world, name)",
          'turnOn(world, name)\n  fixture("day")',
        )
        .replace(
          "import { expectOn,",
          "import { fixture, expectOn,",
        ),
    })

    await writeFile(
      join(root, "fixtures/night.json"),
      '{"on":false}\n',
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: fixtures/night.json",
    ])
  })

  test("builds two queried entries with the same file name", async () => {
    const root = await lockedLamp({
      "helpers/lamp.ts": `import First from "./target.ts?worker"\nimport Second from "./target.js?worker"\n\nexport const work = () => [new First(), new Second()]\n${helpers}`,
      "helpers/target.ts": "postMessage(1)\n",
      "helpers/target.js": "postMessage(2)\n",
      "steps/lamp.steps.ts": stepsCalling("work"),
    })

    await writeFile(
      join(root, "helpers/target.js"),
      "postMessage(3)\n",
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: helpers/target.js",
    ])
  })

  test("a file read only as text skips the code rules, and a CSS url() is read as bytes", async () => {
    const root = await lockedLamp({
      "requirements.config.json": JSON.stringify({
        ...config,
        subjects: ["../ui/*.tsx"],
      }),
      "../ui/Example.tsx":
        "export const load = (name: string) => import(name)\n",
      "helpers/lamp.ts": `import source from "../../ui/Example.tsx?raw"\nimport css from "./lamp.css?inline"\n\nexport const assets = () => [source, css]\n${helpers}`,
      "helpers/lamp.css":
        '.lamp { background: url("./data.json"); }\n',
      "helpers/data.json": '{ "on": true }\n',
      "steps/lamp.steps.ts": stepsCalling("assets"),
    })

    await writeFile(
      join(root, "helpers/data.json"),
      '{"on":true}\n',
    )

    expect(await detailsOf(root)).toEqual([
      "REQ-T-1 code changed: helpers/data.json",
    ])
  })

  test("a changed file changes the digest line of each requirement that loads it", async () => {
    const root = await lockedLamp()
    const before = await readLock(
      await analyzeProject(root),
    )

    await writeFile(
      join(root, "helpers/lamp.ts"),
      helpers.replace("throw new Error(name)", "return"),
    )

    const analysis = await analyzeProject(root)
    const after = buildLock(
      analysis,
      await readLock(analysis),
    )

    expect(after.digests?.["REQ-T-1"]).not.toBe(
      before.digests?.["REQ-T-1"],
    )
  })

  test("refuses a shared list that names a file with no hash", () => {
    const lock = {
      version: 2,
      requirements: {},
      shared: [null, "absent.ts"],
      code: {},
      retired: {},
    }

    expect(() =>
      parseLock(JSON.stringify(lock), "lock"),
    ).toThrow(/"shared" must list unique files/)
    expect(() =>
      parseLock(
        JSON.stringify({
          ...lock,
          shared: ["constructor"],
        }),
        "lock",
      ),
    ).toThrow(/"shared" must list unique files/)
  })

  test("the trace follows a re-export to the line that declares the helper", async () => {
    const root = await makeProject({
      "lamp.feature": feature,
      "helpers/lamp.ts": helpers,
      "helpers/index.ts":
        '// The barrel.\nexport { expectOn, turnOn } from "./lamp.ts"\n',
      "steps/lamp.steps.ts": steps.replace(
        '"../helpers/lamp.ts"',
        '"../helpers/index.ts"',
      ),
    })
    const trace = traceTarget(
      await analyzeProject(root),
      "lamp.feature:9",
    )

    expect(trace).toContain("helpers/lamp.ts:3  expectOn")
  })

  test("still compares with a version 1 lock on the base branch", () => {
    const base = parseLock(
      JSON.stringify({
        version: 1,
        requirements: {
          "REQ-T-1": {
            feature: "lamp.feature",
            scenario: "Turning a lamp on",
            status: "active",
            steps: [],
            code: [],
          },
        },
        code: {},
        retired: {},
      }),
      "base",
    )

    expect(
      baseProblems(
        base,
        {
          version: 2,
          requirements: {},
          shared: [],
          code: {},
          retired: {},
        },
        "requirements.lock.json",
      ).map((problem) => problem.rule),
    ).toEqual(["removed-requirement"])
  })
})
