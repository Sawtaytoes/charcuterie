/**
 * Replay an OrcaSlicer / Bambu Studio G-code file move by move.
 *
 * Pure JavaScript with no Three.js and no Node APIs, so a page and a CLI run the
 * same analysis. It answers three questions about the file itself, not about any
 * mesh:
 *
 * - Colour: does every extrusion inside a labelled object use that object's bottom
 *   tool below `splitZ` and `topTool` above it? Only checked when both are given.
 * - Tip collisions: does the nozzle tip ever go BELOW the top of another object that
 *   is already printed? Travel exactly at the height of a layer just printed is
 *   normal slicer behaviour and is not counted.
 * - Envelope intrusions: is a printed part taller than the nozzle tip ever inside
 *   the slicer's clearance circle (`extruder_clearance_max_radius`, 68 mm on the
 *   Bambu X1 series)? This is the slicer's collision model, not toolhead CAD.
 *
 * Objects are the slicer's labels (`; start printing object, unique label id: N`).
 * Each footprint is a circle around the object's own extrusions: exact for a round
 * part and larger than a rectangular one, so the check errs on the safe side.
 * Arcs (G2/G3 with I/J) are expanded into chords. Absolute XYZ, relative or
 * absolute E, as Orca writes for Bambu printers.
 */

const START = "; start printing object, unique label id:"
const STOP = "; stop printing object"
const WORD = /([XYZEIJ])(-?\d*\.?\d+)/g
const FILAMENT_AREA = Math.PI * 0.875 ** 2

/** Read the per-slot colours and densities Orca writes into the file header. */
export function readHeader(text) {
  const colours = /^; filament_colour = (.*)$/m.exec(text)
  const densities = /^; filament_density: (.*)$/m.exec(text)
  const total = /^M73 P0 R(\d+)/m.exec(text)
  return {
    colours: colours ? colours[1].trim().split(";") : [],
    densities: densities
      ? densities[1].split(",").map(Number)
      : [],
    minutes: total ? Number(total[1]) : null,
  }
}

function parseMove(code) {
  const values = {}
  for (const [, key, value] of code
    .slice(code.indexOf(" "))
    .matchAll(WORD))
    values[key] = Number(value)
  return values
}

function commandOf(line) {
  const semicolon = line.indexOf(";")
  return (
    semicolon === -1 ? line : line.slice(0, semicolon)
  ).trim()
}

/** Points along a move: chords for an arc, 2 mm steps for a line. */
function pathPoints(command, from, values, to) {
  const points = []
  if (
    (command === "G2" || command === "G3") &&
    ("I" in values || "J" in values)
  ) {
    const cx = from.x + (values.I ?? 0)
    const cy = from.y + (values.J ?? 0)
    const radius = Math.hypot(from.x - cx, from.y - cy)
    const a0 = Math.atan2(from.y - cy, from.x - cx)
    let sweep = Math.atan2(to.y - cy, to.x - cx) - a0
    if (command === "G2" && sweep >= 0) sweep -= 2 * Math.PI
    if (command === "G3" && sweep <= 0) sweep += 2 * Math.PI
    const steps = Math.max(
      2,
      Math.floor((Math.abs(sweep) * radius) / 2),
    )
    for (let step = 1; step <= steps; step += 1) {
      const angle = a0 + (sweep * step) / steps
      points.push([
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
      ])
    }
    return points
  }
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.floor(length / 2))
  for (let step = 1; step <= steps; step += 1)
    points.push([
      from.x + ((to.x - from.x) * step) / steps,
      from.y + ((to.y - from.y) * step) / steps,
    ])
  return points
}

/** Centre and radius of every labelled object, from its own extrusions. */
export function objectFootprints(lines) {
  const bounds = new Map()
  let label = null
  for (const line of lines) {
    if (line.startsWith(START)) {
      label = Number(line.slice(START.length))
      continue
    }
    if (line.startsWith(STOP)) {
      label = null
      continue
    }
    if (label === null || !line.startsWith("G1 X")) continue
    if (!line.includes(" E")) continue
    const values = parseMove(commandOf(line))
    if (values.X === undefined || values.Y === undefined)
      continue
    const entry = bounds.get(label) ?? {
      points: [],
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    }
    entry.points.push([values.X, values.Y])
    entry.minX = Math.min(entry.minX, values.X)
    entry.maxX = Math.max(entry.maxX, values.X)
    entry.minY = Math.min(entry.minY, values.Y)
    entry.maxY = Math.max(entry.maxY, values.Y)
    bounds.set(label, entry)
  }
  // Large plates hold hundreds of thousands of points, so no Math.min(...spread).
  const footprints = []
  for (const [id, entry] of bounds) {
    const cx = (entry.minX + entry.maxX) / 2
    const cy = (entry.minY + entry.maxY) / 2
    let radius = 0
    for (const [x, y] of entry.points)
      radius = Math.max(radius, Math.hypot(x - cx, y - cy))
    footprints.push({ id, centre: [cx, cy], radius })
  }
  return footprints.sort((a, b) => a.id - b.id)
}

/**
 * @param {string} text the plate G-code
 * @param {object} [options]
 * @param {Record<string, {bottomTool?: number}>} [options.objects] per label id
 * @param {number} [options.topTool] 0-based T number of the shared top colour
 * @param {number} [options.splitZ] Z of the first layer printed in the top colour
 * @param {number} [options.envelopeRadius] slicer clearance radius, default 68
 * @param {number} [options.footprintMargin] added to each footprint, default 0.3
 * @param {number} [options.maxSamples] timeline length, default 3000
 */
export function analyzeGcode(text, options = {}) {
  const lines = text.split("\n")
  const header = readHeader(text)
  const envelopeRadius = options.envelopeRadius ?? 68
  const margin = options.footprintMargin ?? 0.3
  const footprints = objectFootprints(lines).map((f) => ({
    ...f,
    radius: f.radius + margin,
  }))
  const byId = new Map(footprints.map((f) => [f.id, f]))
  const height = new Map(footprints.map((f) => [f.id, 0]))
  const isColourChecked =
    Number.isFinite(options.splitZ) &&
    Number.isInteger(options.topTool)
  let moveCount = 0
  for (const line of lines)
    if (/^G[0-3] /.test(line)) moveCount += 1
  const every = Math.max(
    1,
    Math.ceil(moveCount / (options.maxSamples ?? 3000)),
  )

  const position = { x: 0, y: 0, z: 0 }
  let tool = null
  let label = null
  let remaining = header.minutes
  let isInChange = false
  let move = 0
  const extruded = []
  let purge = 0
  const changes = []
  const colourErrors = []
  const tipCollisions = []
  const envelopeIntrusions = []
  let closest = null
  const samples = []

  const check = (x, y, z, lineNumber) => {
    for (const f of footprints) {
      if (f.id === label) continue
      const top = height.get(f.id)
      if (top <= 0) continue
      const edge =
        Math.hypot(x - f.centre[0], y - f.centre[1]) -
        f.radius
      if (edge < 0 && z - top < -0.01)
        tipCollisions.push({
          line: lineNumber,
          object: f.id,
          x,
          y,
          z,
          top,
        })
      if (top > z + 0.05) {
        if (closest === null || edge < closest.distance)
          closest = {
            distance: edge,
            line: lineNumber,
            object: f.id,
            z,
            top,
          }
        if (edge < envelopeRadius)
          envelopeIntrusions.push({
            line: lineNumber,
            object: f.id,
            distance: edge,
            z,
            top,
          })
      }
    }
  }

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1
    if (line.startsWith(START)) {
      label = Number(line.slice(START.length))
      continue
    }
    if (line.startsWith(STOP)) {
      label = null
      continue
    }
    const code = commandOf(line)
    if (!code) continue
    const word = code.split(" ", 1)[0]
    if (/^T\d+$/.test(word)) {
      const next = Number(word.slice(1))
      // T1000-style codes are firmware commands, not tools.
      if (next < 16) {
        if (tool !== null && next !== tool)
          changes.push({
            line: lineNumber,
            from: tool,
            to: next,
            z: position.z,
          })
        tool = next
      }
      continue
    }
    if (word === "M73") {
      const r = / R(\d+)/.exec(code)
      if (r && / P\d+/.test(code)) remaining = Number(r[1])
      continue
    }
    if (word === "M620" && code.startsWith("M620 S"))
      isInChange = true
    if (word === "M621" && code.startsWith("M621 S"))
      isInChange = false
    if (!/^G[0-3]$/.test(word)) continue
    const values = parseMove(code)
    const to = {
      x: values.X ?? position.x,
      y: values.Y ?? position.y,
      z: values.Z ?? position.z,
    }
    const e = values.E ?? 0
    if (tool !== null && e !== 0) {
      extruded[tool] = (extruded[tool] ?? 0) + e
      if (isInChange)
        purge +=
          (e *
            FILAMENT_AREA *
            (header.densities[tool] ?? 1.24)) /
          1000
    }
    const isXyMove =
      to.x !== position.x || to.y !== position.y
    const isExtrusion =
      e > 0 && (isXyMove || word === "G2" || word === "G3")
    const low = Math.min(position.z, to.z)
    for (const [x, y] of pathPoints(
      word,
      position,
      values,
      to,
    ))
      check(x, y, low, lineNumber)
    if (isExtrusion && byId.has(label)) {
      if (isColourChecked) {
        const bottom = options.objects?.[label]?.bottomTool
        if (Number.isInteger(bottom)) {
          const expected =
            to.z < options.splitZ - 0.01
              ? bottom
              : options.topTool
          if (tool !== expected)
            colourErrors.push({
              line: lineNumber,
              object: label,
              z: to.z,
              tool,
              expected,
            })
        }
      }
      height.set(label, Math.max(height.get(label), to.z))
    }
    position.x = to.x
    position.y = to.y
    position.z = to.z
    move += 1
    if (move % every === 0 || move === moveCount)
      samples.push([
        lineNumber,
        round(position.x, 1),
        round(position.y, 1),
        round(position.z, 2),
        tool,
        label,
        footprints.map((f) => round(height.get(f.id), 2)),
        header.minutes === null || remaining === null
          ? null
          : header.minutes - remaining,
      ])
  }

  const grams = extruded.map(
    (length, slot) =>
      ((length ?? 0) *
        FILAMENT_AREA *
        (header.densities[slot] ?? 1.24)) /
      1000,
  )
  return {
    tools: header.colours.map((colour, slot) => ({
      slot,
      colour,
      density: header.densities[slot] ?? null,
    })),
    objects: footprints.map((f) => ({
      id: f.id,
      centre: [
        round(f.centre[0], 2),
        round(f.centre[1], 2),
      ],
      radius: round(f.radius, 2),
      height: round(height.get(f.id), 2),
    })),
    changes,
    samples,
    checks: {
      colourErrors: isColourChecked
        ? colourErrors.length
        : null,
      tipCollisions: tipCollisions.length,
      envelopeIntrusions: envelopeIntrusions.length,
      envelopeRadius,
      closestTallerEdge: closest
        ? round(closest.distance, 2)
        : null,
      examples: {
        colourErrors: colourErrors.slice(0, 10),
        tipCollisions: tipCollisions.slice(0, 10),
        envelopeIntrusions: envelopeIntrusions.slice(0, 10),
      },
    },
    totals: {
      minutes: header.minutes,
      grams: grams.map((g) => round(g, 2)),
      totalGrams: round(
        grams.reduce((sum, g) => sum + g, 0),
        2,
      ),
      purgeGrams: round(purge, 2),
    },
  }
}

function round(value, places) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}
