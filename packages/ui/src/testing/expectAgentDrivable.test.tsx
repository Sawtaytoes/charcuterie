import { expect } from "storybook/test"
import { afterEach, test } from "vitest"

import { expectAgentDrivable } from "./expectAgentDrivable.ts"

/**
 * The mutation check on the roving-tabindex rule.
 *
 * M4 found this helper rejecting every roving-tabindex member
 * outright and replaced the rejection with the rule itself — so the
 * *failing* half has to be proved too, or "exactly one tab stop" is
 * a sentence that never runs.
 *
 * It lived inside `Tabs`' `AllStates` play until the story/test
 * split, where it was neither about `Tabs` nor about the board it
 * was rendered beside. `AgentQueries` is structural on purpose,
 * which is what lets a four-line stub stand in for a canvas here.
 */
let tablist: HTMLDivElement | undefined

afterEach(() => {
  tablist?.remove()

  tablist = undefined
})

const mountTablist = (...tabIndexes: number[]) => {
  tablist = document.createElement("div")

  tablist.setAttribute("role", "tablist")

  tablist.innerHTML = tabIndexes
    .map(
      (tabIndex, index) =>
        `<button role="tab" tabindex="${tabIndex}">${index}</button>`,
    )
    .join("")

  // Attached, because the helper walks up to find the group and a
  // detached tree would be the stub cheating.
  document.body.append(tablist)

  const tabs = Array.from(
    tablist.querySelectorAll("button"),
  )

  return () => {
    expectAgentDrivable(
      { queryAllByRole: () => [tabs[0] as HTMLElement] },
      { role: "tab" },
    )
  }
}

test("two tab stops in one group is a failure", () => {
  // Tab lands inside the group twice and the arrow keys are
  // decoration.
  expect(mountTablist(-1, 0, 0)).toThrow(/2 tab stops/)
})

test("exactly one tab stop passes", () => {
  expect(mountTablist(-1, 0, -1)).not.toThrow()
})

test("no tab stop at all is also a failure", () => {
  // The other half of "exactly one": a group nothing can Tab into
  // is unreachable, and a rule that only catches the excess would
  // call it fine. Matched on the count so it cannot pass by
  // throwing for some unrelated reason.
  expect(mountTablist(-1, -1, -1)).toThrow(/0 tab stops/)
})
