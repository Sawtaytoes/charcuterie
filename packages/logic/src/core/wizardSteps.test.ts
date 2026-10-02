import { expect, test } from "vitest"
import { getWizardSteps } from "./wizardSteps.ts"

test("a wizard offers completed stages without allowing skipped stages", () => {
  expect(
    getWizardSteps({
      keys: ["printer", "unit", "slot"],
      currentKey: "unit",
    }),
  ).toEqual([
    {
      key: "printer",
      ordinal: 1,
      status: "done",
      isSelectable: true,
    },
    {
      key: "unit",
      ordinal: 2,
      status: "current",
      isSelectable: false,
    },
    {
      key: "slot",
      ordinal: 3,
      status: "upcoming",
      isSelectable: false,
    },
  ])
})

test("an unknown current stage cannot grant navigation", () => {
  expect(
    getWizardSteps({
      keys: ["first", "second"],
      currentKey: "missing",
    }).every(
      (step) =>
        !step.isSelectable && step.status === "upcoming",
    ),
  ).toBe(true)
})
