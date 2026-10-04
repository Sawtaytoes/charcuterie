import * as THREE from "three"

/** [x0,y0,z0,x1,y1,z1,layer,tool,object,extrusion,line,feature]. Source axes are Z-up. */
export const TOOLPATH_STRIDE = 12
const NUMBER = /([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/gi
const TAU = 2 * Math.PI

function fail(line, message) {
  throw new Error(`G-code line ${line}: ${message}`)
}

function arc(
  from,
  to,
  words,
  isClockwise,
  isAbsoluteCentre,
  unit,
  tolerance,
  line,
) {
  if (
    (words.P !== undefined && words.P !== 1) ||
    words.K !== undefined ||
    (words.R !== undefined &&
      (words.I !== undefined || words.J !== undefined))
  )
    fail(line, "ambiguous or unsupported arc words")
  let centre
  if (words.I !== undefined || words.J !== undefined) {
    centre = isAbsoluteCentre
      ? [
          (words.I ?? from[0] / unit) * unit,
          (words.J ?? from[1] / unit) * unit,
        ]
      : [
          from[0] + (words.I ?? 0) * unit,
          from[1] + (words.J ?? 0) * unit,
        ]
  } else if (words.R !== undefined) {
    const radius = Math.abs(words.R * unit)
    const dx = to[0] - from[0],
      dy = to[1] - from[1]
    const distance = Math.hypot(dx, dy)
    if (!distance || distance > 2 * radius + 1e-6)
      fail(line, "invalid radius arc")
    const height = Math.sqrt(
      Math.max(
        0,
        radius * radius - (distance * distance) / 4,
      ),
    )
    const sign =
      (isClockwise ? -1 : 1) * (words.R < 0 ? -1 : 1)
    centre = [
      (from[0] + to[0]) / 2 -
        ((sign * dy) / distance) * height,
      (from[1] + to[1]) / 2 +
        ((sign * dx) / distance) * height,
    ]
  } else fail(line, "arc has no centre or radius")
  const radius = Math.hypot(
    from[0] - centre[0],
    from[1] - centre[1],
  )
  const endRadius = Math.hypot(
    to[0] - centre[0],
    to[1] - centre[1],
  )
  if (
    !radius ||
    Math.abs(endRadius - radius) >
      Math.max(0.02, radius * 0.001)
  )
    fail(line, "arc endpoints disagree with its centre")
  const start = Math.atan2(
    from[1] - centre[1],
    from[0] - centre[0],
  )
  let sweep =
    Math.atan2(to[1] - centre[1], to[0] - centre[0]) - start
  if (isClockwise && sweep >= 0) sweep -= TAU
  if (!isClockwise && sweep <= 0) sweep += TAU
  const angle =
    2 * Math.acos(Math.max(-1, 1 - tolerance / radius))
  const steps = Math.max(
    1,
    Math.ceil(Math.abs(sweep) / angle),
  )
  if (!Number.isFinite(steps) || steps > 4096)
    fail(line, "arc exceeds the preview subdivision limit")
  return Array.from({ length: steps }, (_, index) => {
    const fraction = (index + 1) / steps
    if (index === steps - 1) return to
    const theta = start + sweep * fraction
    return [
      centre[0] + radius * Math.cos(theta),
      centre[1] + radius * Math.sin(theta),
      from[2] + (to[2] - from[2]) * fraction,
    ]
  })
}

/** Bounded commanded FDM paths, not firmware simulation, collision approval, or usage estimates. */
export function parseToolpaths(text, options = {}) {
  if (
    typeof text !== "string" ||
    text.length > 64 * 1024 * 1024 ||
    text.includes("\0")
  )
    throw new Error(
      "G-code text is invalid or exceeds 64 MiB",
    )
  const maxSegments = options.maxSegments ?? 1000000
  const tolerance = options.arcTolerance ?? 0.02
  if (
    !Number.isInteger(maxSegments) ||
    maxSegments < 1 ||
    maxSegments > 2000000 ||
    !Number.isFinite(tolerance) ||
    tolerance < 0.001 ||
    tolerance > 1
  )
    throw new Error("Invalid toolpath preview limits")
  let data = new Float32Array(
    Math.min(4096, maxSegments) * TOOLPATH_STRIDE,
  )
  let count = 0,
    extrusionCount = 0,
    travelCount = 0
  let position = [null, null, null],
    offsets = [0, 0, 0]
  let isAbsolute = true,
    isRelativeExtrusion = null,
    isAbsoluteCentre = false
  let unit = 1,
    extrusion = 0,
    plane = 17,
    layer = 0,
    tool = -1,
    object = -1,
    feature = 0
  let layerMarker = -1
  const features = ["Unclassified"]
  const layers = new Set()
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity]
  const push = (from, to, isExtrusion, line) => {
    if (from.every((value, index) => value === to[index]))
      return
    if (count >= maxSegments)
      fail(
        line,
        "toolpath exceeds the segment limit; no partial preview was returned",
      )
    if (
      !from
        .concat(to)
        .every(
          (value) =>
            Number.isFinite(value) &&
            Math.abs(value) <= 1000000,
        )
    )
      fail(line, "invalid or unbounded coordinates")
    if ((count + 1) * TOOLPATH_STRIDE > data.length) {
      const next = new Float32Array(
        Math.min(
          maxSegments * TOOLPATH_STRIDE,
          data.length * 2,
        ),
      )
      next.set(data)
      data = next
    }
    data.set(
      [
        ...from,
        ...to,
        layer,
        tool,
        object,
        isExtrusion ? 1 : 0,
        line,
        feature,
      ],
      count * TOOLPATH_STRIDE,
    )
    count += 1
    if (isExtrusion) {
      extrusionCount += 1
      layers.add(layer)
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(
          min[axis],
          from[axis],
          to[axis],
        )
        max[axis] = Math.max(
          max[axis],
          from[axis],
          to[axis],
        )
      }
    } else travelCount += 1
  }
  const lines = text.split(/\r?\n/)
  if (lines.length > 2000000)
    throw new Error("G-code exceeds the line limit")
  for (let index = 0; index < lines.length; index += 1) {
    const line = index + 1,
      original = lines[index].trim()
    const marker = /^;\s*(?:TYPE:|FEATURE:)\s*(.+)$/i.exec(
      original,
    )
    if (marker) {
      let found = features.indexOf(marker[1].slice(0, 256))
      if (found < 0) {
        if (features.length >= 256)
          fail(line, "too many feature labels")
        features.push(marker[1].slice(0, 256))
        found = features.length - 1
      }
      feature = found
    }
    if (/^;\s*LAYER_CHANGE\s*$/i.test(original)) {
      layerMarker += 1
      layer = layerMarker
    }
    const numbered =
      /^;\s*(?:LAYER:|layer num\/total_layer_count:)\s*(\d+)/i.exec(
        original,
      )
    if (numbered) {
      layer = Number(numbered[1])
      if (!Number.isSafeInteger(layer) || layer > 1000000)
        fail(line, "invalid layer label")
      layerMarker = layer
    }
    const label =
      /^;\s*start printing object, unique label id:\s*(\d+)/i.exec(
        original,
      )
    if (label) {
      object = Number(label[1])
      if (
        !Number.isSafeInteger(object) ||
        object > 16777215
      )
        fail(line, "invalid object label")
    }
    if (/^;\s*stop printing object/i.test(original))
      object = -1
    const code = original
      .split(";", 1)[0]
      .replace(/\([^()]*\)/g, "")
      .trim()
      .replace(/^N\d+\s*/i, "")
      .replace(/\*\d+\s*$/, "")
    if (!code) continue
    const tokens = [...code.matchAll(NUMBER)]
    const command = tokens[0]
    if (
      command?.index !== 0 ||
      !/^[GMT]$/i.test(command[1])
    )
      continue
    const kind = command[1].toUpperCase(),
      number = Number(command[2])
    if (
      (kind === "G" ||
        (kind === "M" && [82, 83, 486].includes(number))) &&
      tokens
        .slice(1)
        .some((token) => /^[GM]$/i.test(token[1]))
    )
      fail(
        line,
        "multiple commands require provider-specific interpretation",
      )
    if (
      tokens.some(
        (token) => !Number.isFinite(Number(token[2])),
      )
    )
      fail(line, "non-finite command words")
    const words = {}
    for (const token of tokens.slice(1))
      words[token[1].toUpperCase()] = Number(token[2])
    if (kind === "T") {
      tool =
        Number.isInteger(number) &&
        number >= 0 &&
        number < 255
          ? number
          : -1
      continue
    }
    if (kind === "M") {
      if (number === 82) isRelativeExtrusion = false
      if (number === 83) {
        isRelativeExtrusion = true
        if (extrusion === null) extrusion = 0
      }
      if (number === 486 && words.S !== undefined) {
        if (
          !Number.isInteger(words.S) ||
          words.S < -1 ||
          words.S > 16777215
        )
          fail(line, "invalid object label")
        object = words.S
      }
      continue
    }
    if (number === 20) {
      unit = 25.4
      continue
    }
    if (number === 21) {
      unit = 1
      continue
    }
    if (number === 90) {
      isAbsolute = true
      continue
    }
    if (number === 91) {
      isAbsolute = false
      continue
    }
    if (number === 90.1) {
      isAbsoluteCentre = true
      continue
    }
    if (number === 91.1) {
      isAbsoluteCentre = false
      continue
    }
    if ([17, 18, 19].includes(number)) {
      plane = number
      continue
    }
    if (number >= 53 && number <= 59)
      fail(
        line,
        "machine/work coordinate switching requires provider-specific interpretation",
      )
    if (number === 28) {
      const axes = ["X", "Y", "Z"].filter((axis) =>
        new RegExp(axis, "i").test(code),
      )
      position = position.map((value, index) =>
        !axes.length ||
        axes.includes(["X", "Y", "Z"][index])
          ? null
          : value,
      )
      continue
    }
    if (number === 92) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = words[["X", "Y", "Z"][axis]]
        if (value !== undefined) {
          if (position[axis] === null)
            fail(line, "cannot rebase an unknown position")
          offsets[axis] = position[axis] - value * unit
        }
      }
      if (words.E !== undefined) extrusion = words.E * unit
      continue
    }
    if (
      [5, 5.1, 6, 38, 38.2, 38.3, 38.4, 38.5].includes(
        number,
      ) ||
      (number === 10 &&
        ["X", "Y", "Z", "L", "P"].some(
          (axis) => words[axis] !== undefined,
        ))
    )
      fail(
        line,
        "unsupported movement or coordinate adjustment",
      )
    if (![0, 1, 2, 3].includes(number)) continue
    const remainder = code.replace(NUMBER, "").trim()
    if (
      remainder ||
      tokens
        .slice(1)
        .some(
          (token) =>
            !(
              number === 2 || number === 3
                ? /^[XYZEFIJKRP]$/i
                : /^[XYZEF]$/i
            ).test(token[1]),
        )
    )
      fail(line, "invalid or unsupported movement words")
    if (
      new Set(tokens.map((token) => token[1].toUpperCase()))
        .size !== tokens.length
    )
      fail(line, "duplicate movement words")
    if (
      words.E !== undefined &&
      isRelativeExtrusion === null
    ) {
      if (
        [0, 1].includes(number) &&
        !["X", "Y", "Z"].some(
          (axis) => words[axis] !== undefined,
        )
      ) {
        extrusion = null
        continue
      }
      fail(
        line,
        "extrusion mode is not explicitly established",
      )
    }
    if (
      words.E !== undefined &&
      extrusion === null &&
      ["X", "Y", "Z"].some(
        (axis) => words[axis] !== undefined,
      )
    )
      fail(line, "absolute extrusion baseline is unknown")
    const nextExtrusion =
      words.E === undefined
        ? extrusion
        : isRelativeExtrusion
          ? extrusion + words.E * unit
          : words.E * unit
    const isExtrusion =
      extrusion !== null && nextExtrusion - extrusion > 1e-7
    const next = position.map((value, axis) => {
      const coordinate = words[["X", "Y", "Z"][axis]]
      return coordinate === undefined
        ? value
        : isAbsolute
          ? coordinate * unit + offsets[axis]
          : value === null
            ? null
            : value + coordinate * unit
    })
    if (
      position.every((value) => value !== null) &&
      next.every((value) => value !== null)
    ) {
      if ([2, 3].includes(number)) {
        if (plane !== 17)
          fail(line, "only XY-plane arcs are supported")
        let from = position
        const adjusted = { ...words }
        if (isAbsoluteCentre) {
          if (adjusted.I !== undefined)
            adjusted.I += offsets[0] / unit
          if (adjusted.J !== undefined)
            adjusted.J += offsets[1] / unit
        }
        for (const point of arc(
          position,
          next,
          adjusted,
          number === 2,
          isAbsoluteCentre,
          unit,
          tolerance,
          line,
        )) {
          push(from, point, isExtrusion, line)
          from = point
        }
      } else push(position, next, isExtrusion, line)
    } else if (
      isExtrusion &&
      ([2, 3].includes(number) ||
        ["X", "Y", "Z"].some(
          (axis) => words[axis] !== undefined,
        ))
    )
      fail(
        line,
        "extrusion starts before its position can be reconstructed",
      )
    position = next
    extrusion = nextExtrusion
  }
  if (!extrusionCount)
    throw new Error(
      "No positioned extrusion paths were found",
    )
  return {
    records: data.slice(0, count * TOOLPATH_STRIDE),
    segmentCount: count,
    extrusionCount,
    travelCount,
    layers: [...layers].sort((a, b) => a - b),
    features,
    bounds: { min, max },
    arcTolerance: tolerance,
  }
}

/** Draw selected commanded centre lines in source Z-up coordinates. The caller owns the group. */
export function createToolpathObject(paths, options = {}) {
  if (
    !Number.isFinite(options.fromLayer ?? 0) ||
    !Number.isFinite(options.toLayer ?? 0) ||
    (options.fromLayer ?? -Infinity) >
      (options.toLayer ?? Infinity)
  )
    throw new Error("Invalid layer range")
  const buckets = new Map()
  for (
    let offset = 0;
    offset < paths.records.length;
    offset += TOOLPATH_STRIDE
  ) {
    const record = paths.records.subarray(
      offset,
      offset + TOOLPATH_STRIDE,
    )
    if (
      record[6] < (options.fromLayer ?? -Infinity) ||
      record[6] > (options.toLayer ?? Infinity) ||
      (!record[9] && !options.isTravelVisible)
    )
      continue
    const key = record[9] ? `tool:${record[7]}` : "travel"
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        positions: [],
        tool: record[7],
        isTravel: !record[9],
      }
      buckets.set(key, bucket)
    }
    bucket.positions.push(...record.subarray(0, 6))
  }
  const group = new THREE.Group()
  for (const [key, bucket] of buckets) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(bucket.positions, 3),
    )
    const material = new THREE.LineBasicMaterial({
      color: bucket.isTravel
        ? (options.travelColour ?? 0x888888)
        : (options.colourForTool?.(bucket.tool) ??
          options.colour ??
          0x5588bb),
    })
    const lines = new THREE.LineSegments(geometry, material)
    lines.name = key
    group.add(lines)
  }
  return group
}
