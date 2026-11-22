import { defaultConfig } from "quickpickle"
import { within } from "storybook/test"
import {
  describe,
  expect,
  type TestContext,
  test,
} from "vitest"

import { RequirementsWorld } from "../support/RequirementsWorld.ts"
import {
  expectActivations,
  trackActivations,
} from "./activations.ts"
import { click, press } from "./input.ts"
import { byRole, scopeOf } from "./queries.ts"
import {
  expectBusy,
  expectDisabled,
  expectFocused,
  expectNotFocused,
  expectVisible,
} from "./states.ts"

/**
 * The helpers are the assertions every requirement leans on, so each
 * one is tested here against the cases it must REJECT: an empty or
 * misnamed status, a count for the wrong control, an enabled button.
 * A helper that cannot fail proves nothing, and a scenario cannot
 * show that, because it only ever runs the passing path.
 */

const makeWorld = (context: TestContext, html = "") => {
  const world = new RequirementsWorld(context, {
    config: { ...defaultConfig },
    feature: "helpers",
    scenario: context.task.name,
    tags: [],
    steps: [],
    common: { info: { feature: "helpers", tags: [] } },
  })

  if (html) {
    const container = document.createElement("div")

    container.innerHTML = html
    document.body.append(container)
    world.canvas = within(container)
    world.page = within(document.body)
  }

  return world
}

describe("scopeOf", () => {
  test("tells the author to open a story first", (context) => {
    expect(() => scopeOf(makeWorld(context))).toThrow(
      /No story is open/,
    )
  })

  test("finds a control by role and accessible name", (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Start rip</button>',
    )

    expect(
      byRole(world, "button", "Start rip").textContent,
    ).toBe("Start rip")
  })
})

describe("activations", () => {
  test("refuses a control nothing tracks", (context) => {
    const world = makeWorld(context)

    expect(() =>
      expectActivations(world, "Start rip", 0),
    ).toThrow(/Nothing tracks activations of "Start rip"/)
  })

  test("counts each control separately", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Start</button><button type="button">Stop</button>',
    )

    byRole(world, "button", "Start").addEventListener(
      "click",
      trackActivations(world, "Start"),
    )
    byRole(world, "button", "Stop").addEventListener(
      "click",
      trackActivations(world, "Stop"),
    )

    await click(world, "button", "Stop")

    expectActivations(world, "Stop", 1)
    expect(() =>
      expectActivations(world, "Start", 1),
    ).toThrow()
    expectActivations(world, "Start", 0)
  })
})

describe("state assertions", () => {
  test("expectDisabled rejects an enabled control", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Start rip</button>',
    )

    await expect(
      expectDisabled(world, "button", "Start rip"),
    ).rejects.toThrow()
  })

  test("expectBusy rejects a control without aria-busy", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button" aria-busy="false">Start rip</button>',
    )

    await expect(
      expectBusy(world, "button", "Start rip"),
    ).rejects.toThrow()
  })

  test("expectVisible rejects an empty status", async (context) => {
    const world = makeWorld(
      context,
      '<div role="status"></div>',
    )

    await expect(
      expectVisible(world, "status", "Loading…"),
    ).rejects.toThrow()
  })

  test("expectVisible rejects a status with the wrong name", async (context) => {
    const world = makeWorld(
      context,
      '<div role="status" aria-label="Saved">Saved</div>',
    )

    await expect(
      expectVisible(world, "status", "Loading…"),
    ).rejects.toThrow()
  })

  test("expectVisible rejects a hidden status", async (context) => {
    const world = makeWorld(
      context,
      '<div role="status" aria-label="Loading…" style="display: none"></div>',
    )

    await expect(
      expectVisible(world, "status", "Loading…"),
    ).rejects.toThrow()
  })

  test("expectVisible accepts the named, visible status", async (context) => {
    const world = makeWorld(
      context,
      '<div role="status" aria-label="Loading…">…</div>',
    )

    await expectVisible(world, "status", "Loading…")
  })

  test("focus assertions follow Tab", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button">First</button><button type="button" disabled>Second</button>',
    )

    await press(world, "Tab")
    await expectFocused(world, "button", "First")
    await expect(
      expectNotFocused(world, "button", "First"),
    ).rejects.toThrow()

    await press(world, "Tab")
    await expectNotFocused(world, "button", "Second")
  })
})

describe("press", () => {
  test("names the file to edit for an unknown key", async (context) => {
    await expect(
      press(makeWorld(context), "F13"),
    ).rejects.toThrow(/helpers\/input\.ts/)
  })
})
