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
import { auditElement, auditStory } from "./audits.ts"
import {
  click,
  clickOutside,
  expectNotCovered,
  moveFocus,
  press,
  replaceText,
  typeText,
} from "./input.ts"
import { byRole, scopeOf } from "./queries.ts"
import {
  expectAbsent,
  expectAccessible,
  expectBusy,
  expectClosed,
  expectDescription,
  expectDisabled,
  expectFocused,
  expectFocusInside,
  expectHiddenFromAssistiveTechnology,
  expectMarkedInvalid,
  expectNotFocused,
  expectNotMarkedInvalid,
  expectRequired,
  expectValue,
  expectVisible,
} from "./states.ts"
import { storyNamed } from "./stories.ts"

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
    world.page = within(document.body)
    world.storyRoot = container
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

describe("pointer", () => {
  const covered =
    '<button type="button">Under</button><div style="position: fixed; inset: 0; background: rgb(0 0 0 / 0.5)"></div>'

  test("expectNotCovered rejects a control under a scrim", (context) => {
    const world = makeWorld(context, covered)

    expect(() =>
      expectNotCovered(byRole(world, "button", "Under")),
    ).toThrow(/Something covers this control/)
  })

  test("click refuses a covered control and starts nothing", async (context) => {
    const world = makeWorld(context, covered)

    byRole(world, "button", "Under").addEventListener(
      "click",
      trackActivations(world, "Under"),
    )

    await expect(
      click(world, "button", "Under"),
    ).rejects.toThrow(/Something covers this control/)
    expectActivations(world, "Under", 0)
  })

  test("clickOutside presses the page, not a control", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Inside</button>',
    )
    const pageClicks: EventTarget[] = []
    const recordPageClick = (event: Event) => {
      if (event.target) {
        pageClicks.push(event.target)
      }
    }

    byRole(world, "button", "Inside").addEventListener(
      "click",
      trackActivations(world, "Inside"),
    )
    document.body.addEventListener("click", recordPageClick)

    try {
      await clickOutside(world)
    } finally {
      document.body.removeEventListener(
        "click",
        recordPageClick,
      )
    }

    expectActivations(world, "Inside", 0)
    expect(pageClicks).toEqual([document.body])
  })

  test("clickOutside tells the author to open a story first", async (context) => {
    await expect(
      clickOutside(makeWorld(context)),
    ).rejects.toThrow(/No story is open/)
  })
})

describe("typing", () => {
  test("typeText types braces and brackets as themselves", async (context) => {
    const world = makeWorld(
      context,
      '<label>Pattern <input type="text" /></label>',
    )

    moveFocus(world, "textbox", "Pattern")
    await typeText(world, "{Enter} [x]")
    await expectValue(
      world,
      "textbox",
      "Pattern",
      "{Enter} [x]",
    )
  })

  test("replaceText replaces, rather than appends", async (context) => {
    const world = makeWorld(
      context,
      '<label>Name <input type="text" value="Old" /></label>',
    )

    await replaceText(world, "textbox", "Name", "New")
    await expectValue(world, "textbox", "Name", "New")
    await expect(
      expectValue(world, "textbox", "Name", "OldNew"),
    ).rejects.toThrow()
  })

  test("expectFocused rejects a control that never takes focus", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button">First</button><button type="button">Second</button>',
    )

    byRole(world, "button", "First").focus()

    await expect(
      expectFocused(world, "button", "Second"),
    ).rejects.toThrow()
  })

  test("expectFocused waits for focus that arrives a frame later", async (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Later</button>',
    )

    setTimeout(() => {
      byRole(world, "button", "Later").focus()
    }, 50)

    await expectFocused(world, "button", "Later")
  })

  test("expectAccessible rejects a control the keyboard cannot reach", (context) => {
    const world = makeWorld(
      context,
      '<label>Title <input type="text" tabindex="-1" /></label>',
    )

    expect(() =>
      expectAccessible(world, "textbox", "Title"),
    ).toThrow()
  })

  test("expectAccessible rejects two controls with one name", (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Start</button><button type="button">Start</button>',
    )

    expect(() =>
      expectAccessible(world, "button", "Start"),
    ).toThrow()
  })

  test("moveFocus focuses the named control only", async (context) => {
    const world = makeWorld(
      context,
      '<label>First <input type="text" /></label><label>Second <input type="text" /></label>',
    )

    moveFocus(world, "textbox", "Second")
    await expectFocused(world, "textbox", "Second")
    await expectNotFocused(world, "textbox", "First")
  })
})

describe("presence", () => {
  test("expectFocusInside rejects focus outside the named element", async (context) => {
    const world = makeWorld(
      context,
      '<div role="dialog" aria-label="Inner"><button type="button">In</button></div><button type="button">Out</button>',
    )

    byRole(world, "button", "Out").focus()

    await expect(
      expectFocusInside(world, "dialog", "Inner"),
    ).rejects.toThrow(
      /focus is inside the dialog named "Inner"/,
    )

    byRole(world, "button", "In").focus()
    await expectFocusInside(world, "dialog", "Inner")
  })

  test("expectAbsent rejects a dialog that is there, hidden or not", (context) => {
    const world = makeWorld(
      context,
      '<div role="dialog" aria-label="Stays"></div><div role="dialog" aria-label="Exiting" aria-hidden="true" inert></div>',
    )

    expect(() =>
      expectAbsent(world, "dialog", "Stays"),
    ).toThrow(/every dialog named "Stays"/)
    expect(() =>
      expectAbsent(world, "dialog", "Exiting"),
    ).toThrow(/every dialog named "Exiting"/)
    expect(() => expectAbsent(world, "dialog")).toThrow(
      /every dialog in the document/,
    )
    expectAbsent(world, "dialog", "Another")
  })

  test("expectAbsent does not wait for an element to leave", (context) => {
    const world = makeWorld(
      context,
      '<button type="button">Close</button>',
    )

    setTimeout(() => {
      document.querySelector("button")?.remove()
    }, 50)

    expect(() =>
      expectAbsent(world, "button", "Close"),
    ).toThrow()
  })

  test("expectClosed waits for a panel that leaves", async (context) => {
    const world = makeWorld(
      context,
      '<div role="listbox" aria-label="Parents"></div>',
    )

    setTimeout(() => {
      document.querySelector('[role="listbox"]')?.remove()
    }, 50)

    await expectClosed(world, "listbox")
  })

  test("expectClosed rejects a panel stuck in its exit", async (context) => {
    const world = makeWorld(
      context,
      '<div role="dialog" aria-label="Stuck" aria-hidden="true" inert></div>',
    )

    await expect(
      expectClosed(world, "dialog", "Stuck"),
    ).rejects.toThrow(/every dialog named "Stuck"/)
  })

  test("expectHiddenFromAssistiveTechnology rejects a live dialog", (context) => {
    const world = makeWorld(
      context,
      '<div role="dialog" aria-label="Live"></div><div role="dialog" aria-label="Lower" inert></div>',
    )

    expect(() =>
      expectHiddenFromAssistiveTechnology(
        world,
        "dialog",
        "Live",
      ),
    ).toThrow(/hidden from assistive technology/)
    expectHiddenFromAssistiveTechnology(
      world,
      "dialog",
      "Lower",
    )
  })

  test("expectHiddenFromAssistiveTechnology rejects a dialog that is not there", (context) => {
    const world = makeWorld(context, "<div></div>")

    expect(() =>
      expectHiddenFromAssistiveTechnology(
        world,
        "dialog",
        "Gone",
      ),
    ).toThrow(/found 0/)
  })
})

describe("field state", () => {
  test("expectRequired rejects required without aria-required", async (context) => {
    const world = makeWorld(
      context,
      '<label>Disc label <input type="text" required /></label>',
    )

    await expect(
      expectRequired(world, "textbox", "Disc label"),
    ).rejects.toThrow()
  })

  test("expectRequired rejects aria-required without required", async (context) => {
    const world = makeWorld(
      context,
      '<label>Disc label <input type="text" aria-required="true" /></label>',
    )

    await expect(
      expectRequired(world, "textbox", "Disc label"),
    ).rejects.toThrow()
  })

  test("invalidity is aria-invalid, not the browser's own validity", async (context) => {
    const world = makeWorld(
      context,
      '<label>Empty <input type="text" required /></label><label>Wrong <input type="text" aria-invalid="true" /></label>',
    )

    await expectNotMarkedInvalid(world, "textbox", "Empty")
    await expect(
      expectMarkedInvalid(world, "textbox", "Empty"),
    ).rejects.toThrow()
    await expectMarkedInvalid(world, "textbox", "Wrong")
    await expect(
      expectNotMarkedInvalid(world, "textbox", "Wrong"),
    ).rejects.toThrow()
  })

  test("expectDescription rejects the right parts in the wrong order", async (context) => {
    const world = makeWorld(
      context,
      '<label for="path">Path</label><input id="path" type="text" aria-describedby="error help" /><p id="help">Absolute paths only.</p><p id="error">Not writable.</p>',
    )

    await expect(
      expectDescription(
        world,
        "textbox",
        "Path",
        "Absolute paths only. Not writable.",
      ),
    ).rejects.toThrow()
    await expectDescription(
      world,
      "textbox",
      "Path",
      "Not writable. Absolute paths only.",
    )
  })

  test("expectDescription rejects part of the description", async (context) => {
    const world = makeWorld(
      context,
      '<label for="path">Path</label><input id="path" type="text" aria-describedby="help error" /><p id="help">Absolute paths only.</p><p id="error">Not writable.</p>',
    )

    await expect(
      expectDescription(
        world,
        "textbox",
        "Path",
        "Absolute paths only.",
      ),
    ).rejects.toThrow()
  })
})

describe("audits", () => {
  test("auditElement rejects an unnamed control inside the element", async (context) => {
    const world = makeWorld(
      context,
      '<div role="dialog" aria-label="Broken"><button type="button"></button></div>',
    )

    await expect(
      auditElement(world, "dialog", "Broken"),
    ).rejects.toThrow(/accessibility violations/)
  })

  test("auditStory rejects a violation in the story", async (context) => {
    const world = makeWorld(
      context,
      '<input type="text" />',
    )

    await expect(auditStory(world)).rejects.toThrow(
      /accessibility violations/,
    )
  })

  test("auditStory tells the author to open a story first", async (context) => {
    await expect(
      auditStory(makeWorld(context)),
    ).rejects.toThrow(/No story is open/)
  })
})

describe("storyNamed", () => {
  const story = { run: async () => {} }

  test("finds a story by its sidebar name", () => {
    const allStates = { ...story }

    expect(
      storyNamed(
        "Dialog",
        { AllStates: allStates, Playground: { ...story } },
        "All States",
      ),
    ).toBe(allStates)
  })

  test("prefers a story's own name", () => {
    const renamed = { ...story, storyName: "Busy board" }

    expect(
      storyNamed(
        "Dialog",
        { AllStates: renamed },
        "Busy board",
      ),
    ).toBe(renamed)
    expect(() =>
      storyNamed(
        "Dialog",
        { AllStates: renamed },
        "All States",
      ),
    ).toThrow(/Its stories are: "Busy board"/)
  })

  test("lists the stories when the name is wrong", () => {
    expect(() =>
      storyNamed(
        "Dialog",
        { AllStates: { ...story } },
        "AllStates",
      ),
    ).toThrow(
      'Dialog has no story named "AllStates". Its stories are: "All States".',
    )
  })
})
