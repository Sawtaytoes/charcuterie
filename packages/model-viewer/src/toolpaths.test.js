import { describe, expect, it } from "vitest"
import {
  createToolpathObject,
  disposeObject,
  parseToolpaths,
  TOOLPATH_STRIDE,
} from "./index.js"

const initial = "G21\nG90\nM83\nG0 X0 Y0 Z0.2\n"
const record = (paths, index) => [
  ...paths.records.slice(
    index * TOOLPATH_STRIDE,
    (index + 1) * TOOLPATH_STRIDE,
  ),
]
const parse = (text) => parseToolpaths(initial + text)

describe("commanded toolpaths", () => {
  it("does not assign the previous tool's colour to sentinel tool commands", () => {
    const paths = parse("T0\nG1 X5 E1\nT255\nG1 X10 E1")
    expect(record(paths, 0)[7]).toBe(0)
    expect(record(paths, 1)[7]).toBe(-1)
  })

  it("reads startup extrusion and firmware parameters without treating parameter letters as commands", () => {
    const paths = parseToolpaths(
      "M204 P20000 R5000 T20000\nM1006 A0 M60 G1\nG1 E-0.5\nM83\nG90\nG0 X0 Y0 Z0.2\nG1 X10 E1\nG3 Z0.4 I1 J0 P1 F30000",
    )
    expect(paths.extrusionCount).toBe(1)
    expect(paths.travelCount).toBeGreaterThan(10)
    expect(() =>
      parseToolpaths(
        "G1 E1\nM82\nG0 X0 Y0 Z0.2\nG1 X10 E2",
      ),
    ).toThrow(/baseline/)
    expect(
      parseToolpaths(
        "G1 E1\nM82\nG92 E0\nG0 X0 Y0 Z0.2\nG1 X10 E2",
      ).extrusionCount,
    ).toBe(1)
  })

  it("retains moves, tools, objects, layers, features and line identity without counting retractions as extrusion", () => {
    const paths = parse(
      "T0\n;LAYER:0\n;TYPE:Outer wall\n; start printing object, unique label id: 42\nG1 X10 E1\nG1 E-0.2\nG0 Y5\n; stop printing object\n;LAYER:1\nT1\nG1 Z0.4\nG1 X0 E1",
    )
    expect(paths.segmentCount).toBe(4)
    expect(paths.extrusionCount).toBe(2)
    expect(paths.travelCount).toBe(2)
    expect(paths.layers).toEqual([0, 1])
    expect(paths.features).toEqual([
      "Unclassified",
      "Outer wall",
    ])
    expect(record(paths, 0).slice(6)).toEqual([
      0, 0, 42, 1, 9, 1,
    ])
    expect(record(paths, 3).slice(6, 10)).toEqual([
      1, 1, -1, 1,
    ])
    expect(paths.bounds.min[0]).toBe(0)
    expect(paths.bounds.max[1]).toBe(5)
  })
  it("handles extrusion resets, absolute extrusion, relative XYZ, inches and coordinate rebasing", () => {
    const paths = parse(
      "M82\nG92 E0\nG1 X10 E1\nG1 E0.5\nG92 X0 E0\nG1 X5 E1\nG91\nG1 X-2 E2\nG20\nM83\nG1 Y1 E0.01",
    )
    expect(paths.extrusionCount).toBe(4)
    expect(record(paths, 1).slice(0, 6)).toEqual([
      10,
      0,
      expect.closeTo(0.2),
      15,
      0,
      expect.closeTo(0.2),
    ])
    expect(record(paths, 2)[3]).toBe(13)
    expect(record(paths, 3)[4]).toBeCloseTo(25.4)
  })
  it("reconstructs a position after homing but refuses missing positioned extrusion or an unstated extrusion mode", () => {
    expect(() => parse("G28\nG1 X5 E1")).toThrow(/position/)
    expect(
      parse("G28\nG0 X0 Y0 Z0.2\nG1 X5 E1").extrusionCount,
    ).toBe(1)
    expect(() =>
      parseToolpaths("G0 X0 Y0 Z0.2\nG1 X5 E1"),
    ).toThrow(/extrusion mode/)
    expect(() => parse("G0 X5")).toThrow(
      /No positioned extrusion/,
    )
  })
  it.each([
    ["G3", 1],
    ["G2", -1],
  ])(
    "subdivides %s quarter arcs within the declared tolerance",
    (command, sign) => {
      const paths = parseToolpaths(
        `G90\nM83\nG0 X10 Y0 Z0.2\n${command} X0 Y${10 * sign} I-10 J0 E1`,
      )
      expect(paths.extrusionCount).toBeGreaterThan(8)
      for (
        let index = 0;
        index < paths.segmentCount;
        index += 1
      ) {
        const item = record(paths, index)
        expect(Math.hypot(item[3], item[4])).toBeCloseTo(
          10,
          4,
        )
        const midpointRadius = Math.hypot(
          (item[0] + item[3]) / 2,
          (item[1] + item[4]) / 2,
        )
        expect(10 - midpointRadius).toBeLessThanOrEqual(
          paths.arcTolerance + 0.00001,
        )
      }
      expect(
        record(paths, paths.segmentCount - 1).slice(3, 6),
      ).toEqual([0, 10 * sign, expect.closeTo(0.2)])
    },
  )
  it("handles full circles, helical arcs and absolute arc centers after G92", () => {
    const paths = parseToolpaths(
      "M83\nG0 X10 Y0 Z0.2\nG3 I-10 J0 Z0.4 E1\nG92 X0\nG90.1\nG3 X-10 Y10 I-10 J0 E1",
    )
    expect(paths.extrusionCount).toBeGreaterThan(50)
    expect(
      record(paths, paths.segmentCount - 1).slice(3, 6),
    ).toEqual([0, 10, expect.closeTo(0.4)])
  })
  it.each(["G2", "G3"])(
    "selects signed-radius minor and major %s arcs",
    (command) => {
      const small = parse(`${command} X10 Y0 R10 E1`)
      const large = parse(`${command} X10 Y0 R-10 E1`)
      expect(large.segmentCount).toBeGreaterThan(
        small.segmentCount * 3,
      )
      expect(
        record(small, small.segmentCount - 1).slice(3, 5),
      ).toEqual([10, 0])
      expect(
        record(large, large.segmentCount - 1).slice(3, 5),
      ).toEqual([10, 0])
    },
  )
  it.each([
    "G2 X10 E1",
    "G2 X10 I5 J0 R5 E1",
    "G3 I1 J0 P2 E1",
    "G3 I1 J0 K1 E1",
    "G2 X10 I0 J1 E1",
    "G18\nG2 X10 I5 E1",
    "G1 Xnan E1",
    "G1 X1 X2 E1",
    "G1 X1 A10 E1",
    "G90 G1 X10 E1",
    "G54",
    "G5 X5 E1",
    "G10 L2 X0",
    "G1 X1000001 E1",
    ";LAYER:99999999999999999999\nG1 X5 E1",
    ";start printing object, unique label id: 16777216\nG1 X5 E1",
  ])(
    "holds unsupported or malformed geometry: %s",
    (command) => {
      expect(() => parse(command)).toThrow()
    },
  )
  it("bounds output, input and arc subdivision, never returning a partial preview", () => {
    expect(() =>
      parseToolpaths(`${initial}G1 X1 E1\nG1 X2 E1`, {
        maxSegments: 1,
      }),
    ).toThrow(/no partial preview/)
    expect(() =>
      parseToolpaths(`${initial}G1 X1 E1`, {
        maxSegments: 0,
      }),
    ).toThrow(/limits/)
    expect(() => parseToolpaths("\0")).toThrow(/invalid/)
    expect(() =>
      parseToolpaths(
        "M83\nG0 X1000000 Y0 Z0.2\nG3 I-1000000 J0 E1",
        { arcTolerance: 0.001 },
      ),
    ).toThrow(/subdivision/)
  })
  it("renders only requested layers and optionally travel, with per-tool colours and disposable geometry", () => {
    const paths = parse(
      "T0\n;LAYER:0\nG1 X10 E1\nG0 Y5\nT1\n;LAYER:1\nG1 X0 E1",
    )
    const group = createToolpathObject(paths, {
      fromLayer: 1,
      toLayer: 1,
      colourForTool: () => 0xff0000,
    })
    expect(group.children).toHaveLength(1)
    expect(group.children[0].name).toBe("tool:1")
    expect(
      group.children[0].geometry.attributes.position.count,
    ).toBe(2)
    expect(group.children[0].material.color.getHex()).toBe(
      0xff0000,
    )
    const all = createToolpathObject(paths, {
      isTravelVisible: true,
    })
    expect(all.children.map((child) => child.name)).toEqual(
      ["tool:0", "travel", "tool:1"],
    )
    expect(() =>
      createToolpathObject(paths, {
        fromLayer: 2,
        toLayer: 1,
      }),
    ).toThrow(/range/)
    disposeObject(group)
    disposeObject(all)
  })
})
