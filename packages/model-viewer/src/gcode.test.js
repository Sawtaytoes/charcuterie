import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { readGcodeFile } from "./archive.js"
import { syntheticGcode, zip } from "./gcode.fixtures.js"
import { analyzeGcode } from "./gcode.js"

const far = { 1: [40, 40], 2: [200, 40] }
// Bottoms one object at a time, then the shared top layer by layer.
const hybrid = [
  [1, 0, 0.5, 2],
  [2, 1, 0.5, 2],
  [1, 2, 2.5, 2.5],
  [2, 2, 2.5, 2.5],
  [1, 2, 3, 3],
  [2, 2, 3, 3],
]

describe("G-code replay analysis", () => {
  it("reads footprints, heights, changes and totals from the moves", () => {
    const result = analyzeGcode(syntheticGcode(far, hybrid))
    expect(result.objects).toEqual([
      { id: 1, centre: [40, 40], radius: 14.44, height: 3 },
      {
        id: 2,
        centre: [200, 40],
        radius: 14.44,
        height: 3,
      },
    ])
    expect(
      result.changes.map(({ from, to }) => [from, to]),
    ).toEqual([
      [0, 1],
      [1, 2],
    ])
    expect(result.tools.map((tool) => tool.colour)).toEqual(
      ["#D04040", "#4080D0", "#303030"],
    )
    expect(result.totals.minutes).toBe(10)
    // Net extrusion: every retract is paid back, so it adds nothing.
    const millimetres = 4 * 4 + 5
    expect(result.totals.grams[0]).toBeCloseTo(
      (millimetres * Math.PI * 0.875 ** 2 * 1.26) / 1000,
      2,
    )
    expect(result.totals.purgeGrams).toBeCloseTo(
      (15 * Math.PI * 0.875 ** 2 * 1.26) / 1000,
      2,
    )
    expect(result.samples.at(-1)[6]).toEqual([3, 3])
    expect(result.checks.colourErrors).toBe(null)
  })

  it("checks each object's colour below and above the split", () => {
    const options = {
      topTool: 2,
      splitZ: 2.5,
      objects: {
        1: { bottomTool: 0 },
        2: { bottomTool: 1 },
      },
    }
    expect(
      analyzeGcode(syntheticGcode(far, hybrid), options)
        .checks.colourErrors,
    ).toBe(0)
    const wrong = analyzeGcode(
      syntheticGcode(far, hybrid),
      {
        ...options,
        objects: {
          1: { bottomTool: 1 },
          2: { bottomTool: 1 },
        },
      },
    )
    // Object 1 printed four bottom layers of four segments in the wrong tool.
    expect(wrong.checks.colourErrors).toBe(16)
    expect(
      wrong.checks.examples.colourErrors[0],
    ).toMatchObject({ object: 1, tool: 0, expected: 1 })
  })

  it("finds a nozzle dragged below a printed top and a part inside the envelope", () => {
    const clean = analyzeGcode(syntheticGcode(far, hybrid))
    expect(clean.checks.tipCollisions).toBe(0)
    expect(clean.checks.envelopeIntrusions).toBe(0)
    expect(clean.checks.closestTallerEdge).toBeGreaterThan(
      68,
    )
    // A travel at Z 1 straight across object 1, already 3 mm tall.
    const dragged = analyzeGcode(
      syntheticGcode(
        far,
        hybrid,
        "G1 Z10\nG1 X0 Y40\nG1 Z1\nG1 X80 Y40",
      ),
    )
    expect(dragged.checks.tipCollisions).toBeGreaterThan(0)
    expect(
      dragged.checks.examples.tipCollisions[0],
    ).toMatchObject({ object: 1, z: 1, top: 3 })
    // 50 mm apart, object 1 printed whole first: printing object 2 puts the
    // taller object 1 inside a 68 mm clearance circle.
    const near = analyzeGcode(
      syntheticGcode({ 1: [40, 40], 2: [90, 40] }, [
        [1, 0, 0.5, 3],
        [2, 1, 0.5, 3],
      ]),
    )
    expect(near.checks.envelopeIntrusions).toBeGreaterThan(
      0,
    )
    expect(near.checks.closestTallerEdge).toBeLessThan(68)
  })

  it("follows arcs rather than their chord", () => {
    // A quarter arc around (100, 40) whose chord misses object 1 at (40, 40)
    // but whose path runs through it.
    const arc = analyzeGcode(
      syntheticGcode(
        { 1: [40, 40], 2: [200, 40] },
        hybrid,
        "G1 Z10\nG1 X100 Y100\nG1 Z1\nG3 X100 Y-20 I0 J-60",
      ),
    )
    expect(arc.checks.tipCollisions).toBeGreaterThan(0)
    const chord = analyzeGcode(
      syntheticGcode(
        { 1: [40, 40], 2: [200, 40] },
        hybrid,
        "G1 Z10\nG1 X100 Y100\nG1 Z1\nG1 X100 Y-20",
      ),
    )
    expect(chord.checks.tipCollisions).toBe(0)
  })

  it("keeps the timeline within the sample budget", () => {
    const result = analyzeGcode(
      syntheticGcode(far, hybrid),
      { maxSamples: 20 },
    )
    expect(result.samples.length).toBeLessThanOrEqual(21)
    expect(result.samples.at(-1)[7]).toBe(10)
  })
})

describe("sliced archive", () => {
  it("reads the plate G-code out of a stored or deflated .gcode.3mf", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "viewer-archive-"),
    )
    try {
      const text = syntheticGcode(far, hybrid)
      for (const [method, name] of [
        [0, "stored.gcode.3mf"],
        [8, "deflated.gcode.3mf"],
      ]) {
        const file = path.join(directory, name)
        await writeFile(
          file,
          zip(
            {
              "Metadata/plate_1.gcode": Buffer.from(text),
              "Metadata/plate_2.gcode": Buffer.from("G28"),
            },
            method,
          ),
        )
        expect(readGcodeFile(file)).toBe(text)
        expect(readGcodeFile(file, 2)).toBe("G28")
        expect(() => readGcodeFile(file, 3)).toThrow(
          "zip has no entry Metadata/plate_3.gcode",
        )
      }
      const plain = path.join(directory, "plate.gcode")
      await writeFile(plain, text)
      expect(readGcodeFile(plain)).toBe(text)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
