/**
 * One suite, three adapters — M2's stated proof.
 *
 * Everything here is model-based: fast-check generates random
 * sequences of commands, applies each one to both a naive
 * reference model and the real thing, and **asserts after every
 * single step** rather than at the end. A sequence that only goes
 * wrong on the fourteenth command shrinks down to the two or
 * three that actually matter, and the failure message names them.
 *
 * The invariants asserted alongside the model comparison are the
 * ones the plan calls out by name. They are checked separately
 * from the model even though the model satisfies them, because a
 * model and an implementation that are wrong in the same way
 * still agree with each other.
 *
 * Run against `@charcuterie/logic/core` in Node, and against the
 * React 19 and Preact bindings in a real browser. The core runs
 * hundreds of sequences in milliseconds; the DOM bindings run
 * fewer, because every command there is a render.
 */

import fc from "fast-check"
import { describe, expect, test } from "vitest"

import { selectAriaControls } from "../core/createLinkedIds.ts"
import { selectTabIndex } from "../core/createRovingFocus.ts"
import type { ConnectionStatus } from "../core/statusMachines.ts"
import { connectionTransitions } from "../core/statusMachines.ts"
import {
  LinkedIdsModel,
  MultiplePickerModel,
  RovingFocusModel,
  SinglePickerModel,
  VisibilityGroupModel,
  VisibilityModel,
} from "./models.ts"
import type {
  Adapter,
  LinkedIdsHandle,
  MultiplePickerHandle,
  Release,
  RovingFocusHandle,
  SinglePickerHandle,
  VisibilityGroupHandle,
  VisibilityHandle,
} from "./types.ts"

/**
 * A small pool on purpose. Three keys across twenty-odd commands
 * collide constantly, which is where the interesting states are —
 * the same key registered twice, released while visible, and
 * registered again.
 */
const KEYS = ["alpha", "beta", "gamma"]

const keyArbitrary = fc.constantFrom(...KEYS)

/**
 * Commands are generated before anything runs, so they cannot
 * capture the `Release` a `register` returned. Instead both sides
 * keep a parallel list and a release command names an *index*
 * into it, reduced modulo the length so any generated number is
 * usable.
 */
type Registered<Handle> = {
  handle: Handle
  releases: Release[]
}

type WithReleases<Model> = {
  core: Model
  releaseKeys: string[]
}

const takeReleaseIndex = (
  { releaseKeys }: WithReleases<unknown>,
  index: number,
) => index % releaseKeys.length

// ---------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------

const expectVisibility = (
  model: VisibilityModel,
  real: VisibilityHandle,
) => {
  expect(real.getState().isVisible).toBe(model.isVisible)
}

const visibilityCommands = [
  fc.constant<
    fc.AsyncCommand<VisibilityModel, VisibilityHandle>
  >({
    check: () => true,
    async run(model, real) {
      model.show()

      await real.show()

      expectVisibility(model, real)
    },
    toString: () => "show()",
  }),
  fc.constant<
    fc.AsyncCommand<VisibilityModel, VisibilityHandle>
  >({
    check: () => true,
    async run(model, real) {
      model.hide()

      await real.hide()

      expectVisibility(model, real)
    },
    toString: () => "hide()",
  }),
  fc.constant<
    fc.AsyncCommand<VisibilityModel, VisibilityHandle>
  >({
    check: () => true,
    async run(model, real) {
      model.toggle()

      await real.toggle()

      expectVisibility(model, real)
    },
    toString: () => "toggle()",
  }),
  fc
    .boolean()
    .map<
      fc.AsyncCommand<VisibilityModel, VisibilityHandle>
    >((isVisible) => ({
      check: () => true,
      async run(model, real) {
        model.setIsVisible(isVisible)

        await real.setIsVisible(isVisible)

        expectVisibility(model, real)
      },
      toString: () => `setIsVisible(${isVisible})`,
    })),
]

// ---------------------------------------------------------------
// VisibilityGroup
// ---------------------------------------------------------------

type GroupModel = WithReleases<VisibilityGroupModel>

type GroupReal = Registered<VisibilityGroupHandle>

const expectGroup = (
  model: GroupModel,
  { handle }: GroupReal,
) => {
  const state = handle.getState()

  expect(state.visibleKey).toBe(model.core.visibleKey)
  expect(state.pendingKey).toBe(model.core.pendingKey)
  expect([...state.registeredKeys]).toEqual(
    model.core.registeredKeys,
  )

  // At most one visible — trivially true of a single field, and
  // asserted anyway because it is the group's entire reason to
  // exist and a future refactor could reintroduce a list.
  expect(
    state.visibleKey === null ||
      state.registeredKeys.filter(
        (key) => key === state.visibleKey,
      ).length === 1,
  ).toBe(true)

  // `visibleKey` is never an unmounted member.
  expect(
    state.visibleKey === null ||
      state.registeredKeys.includes(state.visibleKey),
  ).toBe(true)

  // The intent is in exactly one place.
  expect(
    state.visibleKey === null || state.pendingKey === null,
  ).toBe(true)
}

const groupCommands = [
  keyArbitrary.map<fc.AsyncCommand<GroupModel, GroupReal>>(
    (key) => ({
      check: () => true,
      async run(model, real) {
        model.core.show(key)

        await real.handle.show(key)

        expectGroup(model, real)

        // `show(b)` while `a` is visible leaves exactly `b`.
        const { visibleKey } = real.handle.getState()

        expect(
          visibleKey === key || visibleKey === null,
        ).toBe(true)
      },
      toString: () => `show(${key})`,
    }),
  ),
  keyArbitrary.map<fc.AsyncCommand<GroupModel, GroupReal>>(
    (key) => ({
      check: () => true,
      async run(model, real) {
        model.core.hide(key)

        await real.handle.hide(key)

        expectGroup(model, real)
      },
      toString: () => `hide(${key})`,
    }),
  ),
  keyArbitrary.map<fc.AsyncCommand<GroupModel, GroupReal>>(
    (key) => ({
      check: () => true,
      async run(model, real) {
        model.core.toggle(key)

        await real.handle.toggle(key)

        expectGroup(model, real)
      },
      toString: () => `toggle(${key})`,
    }),
  ),
  fc.constant<fc.AsyncCommand<GroupModel, GroupReal>>({
    check: () => true,
    async run(model, real) {
      model.core.hideAll()

      await real.handle.hideAll()

      expectGroup(model, real)

      expect(real.handle.getState().visibleKey).toBeNull()
    },
    toString: () => "hideAll()",
  }),
  keyArbitrary.map<fc.AsyncCommand<GroupModel, GroupReal>>(
    (key) => ({
      check: () => true,
      async run(model, real) {
        model.core.registrations.register(key)
        model.releaseKeys.push(key)

        real.releases.push(await real.handle.register(key))

        expectGroup(model, real)
      },
      toString: () => `register(${key})`,
    }),
  ),
  fc
    .nat({ max: 32 })
    .map<fc.AsyncCommand<GroupModel, GroupReal>>(
      (index) => ({
        check: (model) => model.releaseKeys.length > 0,
        async run(model, real) {
          const releaseIndex = takeReleaseIndex(
            model,
            index,
          )

          const [key] = model.releaseKeys.splice(
            releaseIndex,
            1,
          )

          model.core.registrations.release(key as string)

          const [release] = real.releases.splice(
            releaseIndex,
            1,
          )

          await (release as Release)()

          expectGroup(model, real)
        },
        toString: () => `release(#${index})`,
      }),
    ),
]

// ---------------------------------------------------------------
// SinglePicker
// ---------------------------------------------------------------

type SingleModel = WithReleases<SinglePickerModel>

type SingleReal = Registered<SinglePickerHandle>

const expectSingle = (
  model: SingleModel,
  { handle }: SingleReal,
) => {
  const state = handle.getState()

  expect(state.selectedValue).toBe(model.core.selectedValue)
  expect(state.pendingValue).toBe(model.core.pendingValue)
  expect([...state.registeredValues]).toEqual(
    model.core.registeredValues,
  )

  // The plan's invariant, verbatim: always a registered option
  // or null.
  expect(
    state.selectedValue === null ||
      state.registeredValues.includes(state.selectedValue),
  ).toBe(true)
}

const singleCommands = [
  keyArbitrary.map<
    fc.AsyncCommand<SingleModel, SingleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.select(value)

      await real.handle.select(value)

      expectSingle(model, real)

      // Selecting twice is idempotent. Compared by value
      // rather than identity: the DOM adapters rebuild this
      // object from the last committed render, so identity
      // is a core-only property and is tested there.
      const before = real.handle.getState()

      await real.handle.select(value)

      expect(real.handle.getState()).toEqual(before)
    },
    toString: () => `select(${value})`,
  })),
  keyArbitrary.map<
    fc.AsyncCommand<SingleModel, SingleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.toggle(value)

      await real.handle.toggle(value)

      expectSingle(model, real)
    },
    toString: () => `toggle(${value})`,
  })),
  fc.constant<fc.AsyncCommand<SingleModel, SingleReal>>({
    check: () => true,
    async run(model, real) {
      model.core.clear()

      await real.handle.clear()

      expectSingle(model, real)

      expect(
        real.handle.getState().selectedValue,
      ).toBeNull()
    },
    toString: () => "clear()",
  }),
  keyArbitrary.map<
    fc.AsyncCommand<SingleModel, SingleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.registrations.register(value)
      model.releaseKeys.push(value)

      real.releases.push(await real.handle.register(value))

      expectSingle(model, real)
    },
    toString: () => `register(${value})`,
  })),
  fc
    .nat({ max: 32 })
    .map<fc.AsyncCommand<SingleModel, SingleReal>>(
      (index) => ({
        check: (model) => model.releaseKeys.length > 0,
        async run(model, real) {
          const releaseIndex = takeReleaseIndex(
            model,
            index,
          )

          const [value] = model.releaseKeys.splice(
            releaseIndex,
            1,
          )

          model.core.registrations.release(value as string)

          const [release] = real.releases.splice(
            releaseIndex,
            1,
          )

          await (release as Release)()

          expectSingle(model, real)
        },
        toString: () => `release(#${index})`,
      }),
    ),
]

// ---------------------------------------------------------------
// MultiplePicker
// ---------------------------------------------------------------

type MultipleModel = WithReleases<MultiplePickerModel>

type MultipleReal = Registered<MultiplePickerHandle>

const expectMultiple = (
  model: MultipleModel,
  { handle }: MultipleReal,
) => {
  const state = handle.getState()

  expect([...state.selectedValues]).toEqual(
    model.core.selectedValues,
  )
  expect([...state.pendingValues]).toEqual(
    model.core.pendingValues,
  )
  expect([...state.registeredValues]).toEqual(
    model.core.registeredValues,
  )

  // Never duplicates.
  expect(new Set(state.selectedValues).size).toBe(
    state.selectedValues.length,
  )

  // Order-independence: the derived array is mount order, so it
  // is a subsequence of `registeredValues` no matter what order
  // the selections arrived in.
  expect(
    state.registeredValues.filter((value) =>
      state.selectedValues.includes(value),
    ),
  ).toEqual([...state.selectedValues])
}

const multipleCommands = [
  keyArbitrary.map<
    fc.AsyncCommand<MultipleModel, MultipleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.select(value)

      await real.handle.select(value)

      expectMultiple(model, real)
    },
    toString: () => `select(${value})`,
  })),
  keyArbitrary.map<
    fc.AsyncCommand<MultipleModel, MultipleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.deselect(value)

      await real.handle.deselect(value)

      expectMultiple(model, real)
    },
    toString: () => `deselect(${value})`,
  })),
  keyArbitrary.map<
    fc.AsyncCommand<MultipleModel, MultipleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.toggle(value)

      await real.handle.toggle(value)

      expectMultiple(model, real)
    },
    toString: () => `toggle(${value})`,
  })),
  fc.constant<fc.AsyncCommand<MultipleModel, MultipleReal>>(
    {
      check: () => true,
      async run(model, real) {
        model.core.clear()

        await real.handle.clear()

        expectMultiple(model, real)

        expect(
          real.handle.getState().selectedValues,
        ).toEqual([])
      },
      toString: () => "clear()",
    },
  ),
  keyArbitrary.map<
    fc.AsyncCommand<MultipleModel, MultipleReal>
  >((value) => ({
    check: () => true,
    async run(model, real) {
      model.core.registrations.register(value)
      model.releaseKeys.push(value)

      real.releases.push(await real.handle.register(value))

      expectMultiple(model, real)
    },
    toString: () => `register(${value})`,
  })),
  fc
    .nat({ max: 32 })
    .map<fc.AsyncCommand<MultipleModel, MultipleReal>>(
      (index) => ({
        check: (model) => model.releaseKeys.length > 0,
        async run(model, real) {
          const releaseIndex = takeReleaseIndex(
            model,
            index,
          )

          const [value] = model.releaseKeys.splice(
            releaseIndex,
            1,
          )

          model.core.registrations.release(value as string)

          const [release] = real.releases.splice(
            releaseIndex,
            1,
          )

          await (release as Release)()

          expectMultiple(model, real)
        },
        toString: () => `release(#${index})`,
      }),
    ),
]

// ---------------------------------------------------------------
// RovingFocus
// ---------------------------------------------------------------

type FocusModel = WithReleases<RovingFocusModel>

type FocusReal = Registered<RovingFocusHandle>

const expectFocus = (
  model: FocusModel,
  { handle }: FocusReal,
) => {
  const state = handle.getState()

  expect(state.activeValue).toBe(model.core.activeValue)
  expect(state.activeIndex).toBe(model.core.activeIndex)
  expect(state.pendingValue).toBe(model.core.pendingValue)
  expect([...state.registeredValues]).toEqual(
    model.core.registeredValues,
  )

  // In range across arbitrary registration churn — the plan's
  // invariant, and the reason the index is derived rather than
  // stored.
  expect(state.activeIndex).toBeGreaterThanOrEqual(-1)
  expect(state.activeIndex).toBeLessThan(
    state.registeredValues.length,
  )

  expect(state.activeIndex === -1).toBe(
    state.activeValue === null,
  )

  // Exactly one tab stop whenever the group has members: the
  // roving-tabindex rule itself.
  if (state.registeredValues.length > 0) {
    expect(
      state.registeredValues.filter(
        (value) => selectTabIndex(state, value) === 0,
      ),
    ).toHaveLength(1)
  }
}

const focusCommands = [
  fc.constant<fc.AsyncCommand<FocusModel, FocusReal>>({
    check: () => true,
    async run(model, real) {
      model.core.next()

      await real.handle.next()

      expectFocus(model, real)
    },
    toString: () => "next()",
  }),
  fc.constant<fc.AsyncCommand<FocusModel, FocusReal>>({
    check: () => true,
    async run(model, real) {
      model.core.previous()

      await real.handle.previous()

      expectFocus(model, real)
    },
    toString: () => "previous()",
  }),
  fc.constant<fc.AsyncCommand<FocusModel, FocusReal>>({
    check: () => true,
    async run(model, real) {
      model.core.first()

      await real.handle.first()

      expectFocus(model, real)
    },
    toString: () => "first()",
  }),
  fc.constant<fc.AsyncCommand<FocusModel, FocusReal>>({
    check: () => true,
    async run(model, real) {
      model.core.last()

      await real.handle.last()

      expectFocus(model, real)
    },
    toString: () => "last()",
  }),
  fc
    .option(keyArbitrary, { nil: null })
    .map<fc.AsyncCommand<FocusModel, FocusReal>>(
      (value) => ({
        check: () => true,
        async run(model, real) {
          model.core.setActiveValue(value)

          await real.handle.setActiveValue(value)

          expectFocus(model, real)
        },
        toString: () => `setActiveValue(${value})`,
      }),
    ),
  keyArbitrary.map<fc.AsyncCommand<FocusModel, FocusReal>>(
    (value) => ({
      check: () => true,
      async run(model, real) {
        model.core.registrations.register(value)
        model.releaseKeys.push(value)

        real.releases.push(
          await real.handle.register(value),
        )

        expectFocus(model, real)
      },
      toString: () => `register(${value})`,
    }),
  ),
  fc
    .nat({ max: 32 })
    .map<fc.AsyncCommand<FocusModel, FocusReal>>(
      (index) => ({
        check: (model) => model.releaseKeys.length > 0,
        async run(model, real) {
          const releaseIndex = takeReleaseIndex(
            model,
            index,
          )

          const [value] = model.releaseKeys.splice(
            releaseIndex,
            1,
          )

          model.core.release(value as string)

          const [release] = real.releases.splice(
            releaseIndex,
            1,
          )

          await (release as Release)()

          expectFocus(model, real)
        },
        toString: () => `release(#${index})`,
      }),
    ),
]

// ---------------------------------------------------------------
// LinkedIds
// ---------------------------------------------------------------

type LinkedModel = {
  core: LinkedIdsModel
  targetKeys: string[]
  triggerKeys: string[]
}

type LinkedReal = {
  handle: LinkedIdsHandle
  targetReleases: Release[]
  triggerReleases: Release[]
}

const expectLinked = (
  model: LinkedModel,
  { handle }: LinkedReal,
) => {
  const state = handle.getState()

  expect([...state.targetIds]).toEqual(model.core.targetIds)
  expect([...state.triggerIds]).toEqual(
    model.core.triggerIds,
  )

  const ariaControls = selectAriaControls(state)

  // Never an empty attribute — a violation in its own right.
  expect(ariaControls).not.toBe("")

  // Every id `aria-controls` names is currently registered. This
  // is the assertion the whole multiset exists for: it is what
  // fails if a remount's cleanup drops an id the new mount is
  // already holding.
  for (const id of ariaControls?.split(" ") ?? []) {
    expect(state.targetIds).toContain(id)
  }
}

const linkedCommands = [
  keyArbitrary.map<
    fc.AsyncCommand<LinkedModel, LinkedReal>
  >((id) => ({
    check: () => true,
    async run(model, real) {
      model.core.targets.register(id)
      model.targetKeys.push(id)

      real.targetReleases.push(
        await real.handle.registerTarget(id),
      )

      expectLinked(model, real)
    },
    toString: () => `registerTarget(${id})`,
  })),
  keyArbitrary.map<
    fc.AsyncCommand<LinkedModel, LinkedReal>
  >((id) => ({
    check: () => true,
    async run(model, real) {
      model.core.triggers.register(id)
      model.triggerKeys.push(id)

      real.triggerReleases.push(
        await real.handle.registerTrigger(id),
      )

      expectLinked(model, real)
    },
    toString: () => `registerTrigger(${id})`,
  })),
  fc
    .nat({ max: 32 })
    .map<fc.AsyncCommand<LinkedModel, LinkedReal>>(
      (index) => ({
        check: (model) => model.targetKeys.length > 0,
        async run(model, real) {
          const releaseIndex =
            index % model.targetKeys.length

          const [id] = model.targetKeys.splice(
            releaseIndex,
            1,
          )

          model.core.targets.release(id as string)

          const [release] = real.targetReleases.splice(
            releaseIndex,
            1,
          )

          await (release as Release)()

          expectLinked(model, real)
        },
        toString: () => `releaseTarget(#${index})`,
      }),
    ),
  /**
   * The remount race, generated rather than staged: register the
   * same id again *before* releasing the old hold, which is the
   * order React uses when a subtree moves.
   */
  keyArbitrary.map<
    fc.AsyncCommand<LinkedModel, LinkedReal>
  >((id) => ({
    check: (model) => model.targetKeys.includes(id),
    async run(model, real) {
      model.core.targets.register(id)
      model.targetKeys.push(id)

      real.targetReleases.push(
        await real.handle.registerTarget(id),
      )

      const staleIndex = model.targetKeys.indexOf(id)

      model.targetKeys.splice(staleIndex, 1)
      model.core.targets.release(id)

      const [release] = real.targetReleases.splice(
        staleIndex,
        1,
      )

      await (release as Release)()

      // The id must still be there. A set-based implementation
      // drops it here and `aria-controls` starts pointing at
      // nothing, silently.
      expect(real.handle.getState().targetIds).toContain(id)

      expectLinked(model, real)
    },
    toString: () => `remountTarget(${id})`,
  })),
]

// ---------------------------------------------------------------
// The suite
// ---------------------------------------------------------------

export const runConformanceSuite = (
  adapter: Adapter,
  { numRuns }: { numRuns: number },
) => {
  const assertOptions = { numRuns }

  const commandOptions = { maxCommands: 24 }

  describe(`${adapter.name} — Visibility`, () => {
    test("matches the model across arbitrary command sequences", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.commands(visibilityCommands, commandOptions),
          async (commands) => {
            await adapter.withVisibility(async (handle) => {
              await fc.asyncModelRun(
                () => ({
                  model: new VisibilityModel(),
                  real: handle,
                }),
                commands,
              )
            })
          },
        ),
        assertOptions,
      )
    })
  })

  describe(`${adapter.name} — VisibilityGroup`, () => {
    test("keeps at most one member visible, across registration churn", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.commands(groupCommands, commandOptions),
          async (commands) => {
            await adapter.withVisibilityGroup(
              async (handle) => {
                await fc.asyncModelRun(
                  (): {
                    model: GroupModel
                    real: GroupReal
                  } => ({
                    model: {
                      core: new VisibilityGroupModel(),
                      releaseKeys: [],
                    },
                    real: { handle, releases: [] },
                  }),
                  commands,
                )
              },
            )
          },
        ),
        assertOptions,
      )
    })

    test("a member that unmounts and remounts comes back visible", async () => {
      await adapter.withVisibilityGroup(async (handle) => {
        const release = await handle.register("alpha")

        await handle.show("alpha")

        expect(handle.getState().visibleKey).toBe("alpha")

        await release()

        // Demoted, not forgotten.
        expect(handle.getState().visibleKey).toBeNull()
        expect(handle.getState().pendingKey).toBe("alpha")

        await handle.register("alpha")

        expect(handle.getState().visibleKey).toBe("alpha")
      })
    })
  })

  describe(`${adapter.name} — SinglePicker`, () => {
    test("selectedValue is always a registered option or null", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.commands(singleCommands, commandOptions),
          async (commands) => {
            await adapter.withSinglePicker(
              async (handle) => {
                await fc.asyncModelRun(
                  (): {
                    model: SingleModel
                    real: SingleReal
                  } => ({
                    model: {
                      core: new SinglePickerModel(),
                      releaseKeys: [],
                    },
                    real: { handle, releases: [] },
                  }),
                  commands,
                )
              },
            )
          },
        ),
        assertOptions,
      )
    })
  })

  describe(`${adapter.name} — MultiplePicker`, () => {
    test("membership is order-independent and never duplicates", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.commands(multipleCommands, commandOptions),
          async (commands) => {
            await adapter.withMultiplePicker(
              async (handle) => {
                await fc.asyncModelRun(
                  (): {
                    model: MultipleModel
                    real: MultipleReal
                  } => ({
                    model: {
                      core: new MultiplePickerModel(),
                      releaseKeys: [],
                    },
                    real: { handle, releases: [] },
                  }),
                  commands,
                )
              },
            )
          },
        ),
        assertOptions,
      )
    })

    test("selecting in either order produces the same array", async () => {
      const readBoth = async (order: string[]) => {
        let selected: readonly string[] = []

        await adapter.withMultiplePicker(async (handle) => {
          await handle.register("alpha")
          await handle.register("beta")

          for (const value of order) {
            await handle.select(value)
          }

          selected = handle.getState().selectedValues
        })

        return selected
      }

      expect(await readBoth(["beta", "alpha"])).toEqual(
        await readBoth(["alpha", "beta"]),
      )
    })
  })

  describe(`${adapter.name} — RovingFocus`, () => {
    for (const isWrapping of [true, false]) {
      test(`activeIndex stays in range with isWrapping=${isWrapping}`, async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.commands(focusCommands, commandOptions),
            async (commands) => {
              await adapter.withRovingFocus(
                { isWrapping },
                async (handle) => {
                  await fc.asyncModelRun(
                    (): {
                      model: FocusModel
                      real: FocusReal
                    } => ({
                      model: {
                        core: new RovingFocusModel({
                          isWrapping,
                        }),
                        releaseKeys: [],
                      },
                      real: { handle, releases: [] },
                    }),
                    commands,
                  )
                },
              )
            },
          ),
          assertOptions,
        )
      })
    }

    test("focus and selection do not disturb each other", async () => {
      await adapter.withRovingFocus(
        { isWrapping: true },
        async (focus) => {
          await adapter.withSinglePicker(async (picker) => {
            for (const value of KEYS) {
              await focus.register(value)
              await picker.register(value)
            }

            await picker.select("alpha")

            // Arrowing all the way around must not choose
            // anything. This is the whole reason RovingFocus is
            // its own kind rather than a SinglePicker.
            for (
              let stepCount = 0;
              stepCount < KEYS.length;
              stepCount += 1
            ) {
              await focus.next()

              expect(picker.getState().selectedValue).toBe(
                "alpha",
              )
            }

            const { activeValue } = focus.getState()

            await picker.select("gamma")

            expect(focus.getState().activeValue).toBe(
              activeValue,
            )
          })
        },
      )
    })
  })

  describe(`${adapter.name} — Status`, () => {
    test("never reaches a state by an illegal transition", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom<ConnectionStatus | "reset">(
              "connected",
              "connecting",
              "disconnected",
              "reconnecting",
              "reset",
            ),
            { maxLength: 24 },
          ),
          async (steps) => {
            await adapter.withStatus(
              {
                initialState:
                  "connecting" as ConnectionStatus,
                transitions: connectionTransitions,
              },
              async (handle) => {
                let expected: ConnectionStatus =
                  "connecting"

                for (const step of steps) {
                  if (step === "reset") {
                    await handle.reset()

                    expected = "connecting"
                  } else if (
                    step === expected ||
                    connectionTransitions[
                      expected
                    ].includes(step)
                  ) {
                    await handle.transitionTo(step)

                    expected = step
                  } else {
                    // Loud, not silent: a bay stuck on `ripping`
                    // with nothing in the log is the failure
                    // mode this replaces.
                    await expect(
                      handle.transitionTo(step),
                    ).rejects.toThrow(
                      /Illegal status transition/,
                    )
                  }

                  expect(handle.getState().status).toBe(
                    expected,
                  )
                }
              },
            )
          },
        ),
        assertOptions,
      )
    })

    test("can() agrees with what transitionTo() will accept", async () => {
      await adapter.withStatus(
        {
          initialState: "connecting" as ConnectionStatus,
          transitions: connectionTransitions,
        },
        async (handle) => {
          expect(handle.can("connected")).toBe(true)
          expect(handle.can("reconnecting")).toBe(false)

          await handle.transitionTo("connected")

          expect(handle.can("reconnecting")).toBe(true)
        },
      )
    })
  })

  describe(`${adapter.name} — linked ids`, () => {
    test("aria-controls only ever names ids that exist", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.commands(linkedCommands, commandOptions),
          async (commands) => {
            await adapter.withLinkedIds(async (handle) => {
              await fc.asyncModelRun(
                (): {
                  model: LinkedModel
                  real: LinkedReal
                } => ({
                  model: {
                    core: new LinkedIdsModel(),
                    targetKeys: [],
                    triggerKeys: [],
                  },
                  real: {
                    handle,
                    targetReleases: [],
                    triggerReleases: [],
                  },
                }),
                commands,
              )
            })
          },
        ),
        assertOptions,
      )
    })
  })
}
