/** Synthetic slicer output for the replay tests. No real print is in here. */
import { deflateRawSync } from "node:zlib"

/**
 * Synthetic Orca-style G-code: square rings printed inside object labels.
 * `plan` lists [label, tool, fromZ, toZ] runs in print order.
 */
export function syntheticGcode(centres, plan, extra = "") {
  const lines = [
    "; filament_colour = #D04040;#4080D0;#303030",
    "; filament_density: 1.26,1.26,1.26",
    "M73 P0 R10",
  ]
  let tool = null
  // Travel clears everything printed so far, as a slicer's by-object travel does.
  let top = 0
  for (const [
    run,
    [label, next, fromZ, toZ],
  ] of plan.entries()) {
    if (next !== tool) {
      lines.push(`M620 S${next}A`, `T${next}`)
      // A purge on the wipe tower position, outside every object.
      lines.push("G1 X250 Y250 E5", `M621 S${next}A`)
      tool = next
    }
    const [cx, cy] = centres[label]
    for (let z = fromZ; z <= toZ + 1e-9; z += 0.5) {
      const height = Math.round(z * 100) / 100
      lines.push(
        `G1 Z${Math.max(top, height) + 0.4}`,
        `G1 X${cx - 10} Y${cy - 10}`,
        `G1 Z${height}`,
        `; start printing object, unique label id: ${label}`,
        `G1 X${cx + 10} Y${cy - 10} E1`,
        `G1 X${cx + 10} Y${cy + 10} E1`,
        `G1 X${cx - 10} Y${cy + 10} E1`,
        `G1 X${cx - 10} Y${cy - 10} E1`,
        "; stop printing object, unique label id: 0",
        "G1 E-0.8",
        "G1 E0.8",
      )
      top = Math.max(top, height)
    }
    lines.push(
      `M73 P50 R${Math.max(0, 10 - 2 * (run + 1))}`,
    )
  }
  lines.push("M73 P100 R0", extra)
  return lines.join("\n")
}

/** A minimal zip writer, enough for the reader's tests. */
export function zip(files, method = 8) {
  const locals = []
  const directory = []
  let offset = 0
  for (const [name, content] of Object.entries(files)) {
    const data =
      method === 8 ? deflateRawSync(content) : content
    const nameBuffer = Buffer.from(name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(content.length, 22)
    local.writeUInt16LE(nameBuffer.length, 26)
    const entry = Buffer.alloc(46)
    entry.writeUInt32LE(0x02014b50, 0)
    entry.writeUInt16LE(20, 4)
    entry.writeUInt16LE(20, 6)
    entry.writeUInt16LE(method, 10)
    entry.writeUInt32LE(data.length, 20)
    entry.writeUInt32LE(content.length, 24)
    entry.writeUInt16LE(nameBuffer.length, 28)
    entry.writeUInt32LE(offset, 42)
    locals.push(local, nameBuffer, data)
    directory.push(entry, nameBuffer)
    offset += local.length + nameBuffer.length + data.length
  }
  const size = directory.reduce(
    (total, part) => total + part.length,
    0,
  )
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(size, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, ...directory, end])
}
