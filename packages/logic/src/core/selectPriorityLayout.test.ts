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

test("optional details can hide to keep required controls whole", () => {
  expect(
    selectPriorityLayout([
      {
        id: "clipped",
        sections: [
          {
            priority: 1,
            width: 200,
            height: 40,
            minimumHeight: 80,
          },
          {
            priority: 3,
            visibilityPriority: 1,
            width: 200,
            height: 50,
          },
        ],
      },
      {
        id: "fits",
        sections: [
          {
            priority: 1,
            width: 200,
            height: 80,
            minimumHeight: 80,
          },
          {
            priority: 3,
            visibilityPriority: 1,
            isHidden: true,
            width: 0,
            height: 0,
            minimumHeight: 50,
          },
        ],
      },
    ])?.id,
  ).toBe("fits")
})

test("visibility order is independent of the focus order", () => {
  expect(
    selectPriorityLayout([
      {
        id: "filament",
        sections: [
          {
            priority: 3,
            visibilityPriority: 3,
            isHidden: true,
            width: 0,
            height: 0,
          },
          {
            priority: 4,
            visibilityPriority: 1,
            width: 200,
            height: 100,
          },
        ],
      },
      {
        id: "camera",
        sections: [
          {
            priority: 3,
            visibilityPriority: 3,
            width: 160,
            height: 90,
          },
          {
            priority: 4,
            visibilityPriority: 1,
            isHidden: true,
            width: 0,
            height: 0,
          },
        ],
      },
    ])?.id,
  ).toBe("camera")
})

test("optional sections must fit their minimum dimensions before surviving", () => {
  expect(
    selectPriorityLayout([
      {
        id: "too-small",
        sections: [
          {
            priority: 3,
            visibilityPriority: 2,
            width: 60,
            height: 30,
            minimumWidth: 100,
          },
        ],
      },
      {
        id: "hidden",
        sections: [
          {
            priority: 3,
            visibilityPriority: 2,
            isHidden: true,
            width: 0,
            height: 0,
            minimumWidth: 100,
          },
        ],
      },
    ])?.id,
  ).toBe("hidden")
})
