import {
  Given as addGiven,
  Then as addThen,
  When as addWhen,
} from "quickpickle"

import { RequirementsWorld } from "./RequirementsWorld.ts"
// Before any step registers: a pattern using `{role}` fails to
// compile if its parameter type does not exist yet. Every step file
// imports this module, so importing the types here orders them first.
import "./parameterTypes.ts"

/**
 * The only way a step definition is registered in this repo. The
 * requirements checker rejects `Given`/`When`/`Then` imported
 * straight from "quickpickle".
 *
 * QuickPickle reports a failing step as its text and feature line,
 * then the assertion. It never says WHICH definition matched, so an
 * agent has to guess from the stack. This wrapper adds the matched
 * pattern and the command that traces it to every failure:
 *
 *   the button named "Start rip" is disabled (#25)
 *   expect(element).toBeDisabled()
 *   …
 *   Step definition: Then("the {role} named {string} is disabled")
 *   Trace: pnpm requirements:which requirements/button.feature:25
 *
 * A step timeout is raised by QuickPickle outside this callback, so it
 * prints the step text and feature line without these two lines; run
 * the trace on that line.
 *
 * It also checks the World at the boundary. QuickPickle hands every
 * callback `any`; a missing `setWorldConstructor` would otherwise
 * surface as "cannot read properties of undefined" deep in a helper.
 */

export type StepKind = "Given" | "When" | "Then"

type StepRun<Parameters extends unknown[]> = (
  world: RequirementsWorld,
  ...parameters: Parameters
) => unknown

export const toRequirementsWorld = (
  state: unknown,
): RequirementsWorld => {
  if (state instanceof RequirementsWorld) {
    return state
  }

  throw new Error(
    "This step received a World that is not a RequirementsWorld. requirements/index.ts must call setWorldConstructor(RequirementsWorld) before any scenario runs.",
  )
}

const annotated = new WeakSet<Error>()

/** `requirements/button.feature:25`, from the running Vitest task. */
const featureLocation = (world?: RequirementsWorld) => {
  if (!world) {
    return null
  }

  const filePath = world.context?.task?.file?.filepath ?? ""
  const marker = filePath.lastIndexOf("/requirements/")
  const file =
    marker >= 0 ? filePath.slice(marker + 1) : filePath

  return file && world.info.line
    ? `${file}:${world.info.line}`
    : null
}

export const annotateStepError = (
  error: unknown,
  {
    expression,
    kind,
    world,
  }: {
    expression: string
    kind: StepKind
    world: RequirementsWorld | undefined
  },
) => {
  const failure =
    error instanceof Error
      ? error
      : new Error(String(error))

  if (annotated.has(failure)) {
    return failure
  }

  annotated.add(failure)

  const location = featureLocation(world)
  const lines = [
    `Step definition: ${kind}("${expression}")`,
    location
      ? `Trace: pnpm requirements:which ${location}`
      : `Trace: pnpm requirements:which "${expression}"`,
  ]

  failure.message = `${failure.message}\n\n${lines.join("\n")}`

  return failure
}

/**
 * The function QuickPickle registers. Exported so the wrapper itself
 * has unit tests (`steps.test.ts`).
 */
export const wrapStep =
  <Parameters extends unknown[]>(
    kind: StepKind,
    expression: string,
    run: StepRun<Parameters>,
  ) =>
  async (state: unknown, ...parameters: unknown[]) => {
    // Inside the `try`, so a wrong World also names its definition.
    let world: RequirementsWorld | undefined

    try {
      world = toRequirementsWorld(state)
      await run(world, ...(parameters as Parameters))
    } catch (error) {
      throw annotateStepError(error, {
        expression,
        kind,
        world,
      })
    }
  }

const register =
  (
    kind: StepKind,
    add: (
      expression: string,
      run: (
        state: unknown,
        ...parameters: unknown[]
      ) => unknown,
    ) => void,
  ) =>
  <Parameters extends unknown[]>(
    expression: string,
    run: StepRun<Parameters>,
  ) => {
    add(expression, wrapStep(kind, expression, run))
  }

/** Sets up the scenario: opens a story, installs a fixture. */
export const Given = register("Given", addGiven)

/** Acts, as a person would: a click, a key press. */
export const When = register("When", addWhen)

/** Checks one observable result. */
export const Then = register("Then", addThen)
