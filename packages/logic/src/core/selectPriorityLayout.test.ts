import { expect, test } from "vitest"
import { selectPriorityLayout } from "./selectPriorityLayout.ts"

test("the hero is its contained image, and a taller card can favor stacking", () => {
  const candidates = [
    {
      id: "horizontal",
      sections: [
        {
          priority: 2,
          width: 650,
          height: 1000,
          aspectRatio: 16 / 9,
        },
        {
          priority: 1,
          width: 900,
          height: 400,
          minimumHeight: 400,
        },
      ],
    },
    {
      id: "vertical",
      sections: [
        {
          priority: 2,
          width: 1550,
          height: 588,
          aspectRatio: 16 / 9,
        },
        {
          priority: 1,
          width: 1550,
          height: 400,
          minimumHeight: 400,
        },
      ],
    },
  ]
  expect(selectPriorityLayout(candidates)?.id).toBe(
    "vertical",
  )
})

test("essential facts fit before a higher-priority picture is enlarged", () => {
  expect(
    selectPriorityLayout([
      {
        id: "clipped",
        sections: [
          { priority: 2, width: 1000, height: 600 },
          {
            priority: 1,
            width: 1000,
            height: 200,
            minimumHeight: 400,
          },
        ],
      },
      {
        id: "fits",
        sections: [
          { priority: 2, width: 500, height: 300 },
          {
            priority: 1,
            width: 1000,
            height: 400,
            minimumHeight: 400,
          },
        ],
      },
    ])?.id,
  ).toBe("fits")
})

test("priorities change the winner, with useful area capped at the target", () => {
  const candidates = [
    {
      id: "media",
      sections: [
        { priority: 1, width: 800, height: 600 },
        {
          priority: 2,
          width: 320,
          height: 1,
          idealArea: 640,
        },
      ],
    },
    {
      id: "facts",
      sections: [
        { priority: 1, width: 480, height: 600 },
        {
          priority: 2,
          width: 640,
          height: 1,
          idealArea: 640,
        },
      ],
    },
    {
      id: "excess",
      sections: [
        { priority: 1, width: 300, height: 600 },
        {
          priority: 2,
          width: 900,
          height: 1,
          idealArea: 640,
        },
      ],
    },
  ]
  expect(selectPriorityLayout(candidates)?.id).toBe("facts")
})

test("empty inputs and equal candidates have stable results", () => {
  expect(selectPriorityLayout([])).toBeUndefined()
  expect(
    selectPriorityLayout([
      { id: "first", sections: [] },
      { id: "second", sections: [] },
    ])?.id,
  ).toBe("first")
})
