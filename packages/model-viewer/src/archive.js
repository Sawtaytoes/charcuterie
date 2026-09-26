/**
 * Read one entry out of a zip archive, enough for a sliced `.gcode.3mf` (stored or
 * deflated entries, no zip64, no encryption). Node only — the browser bundle never
 * imports this file.
 */
import { readFileSync } from "node:fs"
import { inflateRawSync } from "node:zlib"

const END_OF_DIRECTORY = 0x06054b50
const DIRECTORY_ENTRY = 0x02014b50
const LOCAL_HEADER = 0x04034b50

/** @returns {Map<string, {method: number, compressedSize: number, offset: number}>} */
export function listEntries(buffer) {
  let end = -1
  for (
    let at = buffer.length - 22;
    at >= Math.max(0, buffer.length - 65_557);
    at -= 1
  ) {
    if (buffer.readUInt32LE(at) === END_OF_DIRECTORY) {
      end = at
      break
    }
  }
  if (end === -1) throw new Error("not a zip archive")
  const count = buffer.readUInt16LE(end + 10)
  let at = buffer.readUInt32LE(end + 16)
  const entries = new Map()
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(at) !== DIRECTORY_ENTRY)
      throw new Error("zip central directory is damaged")
    const nameLength = buffer.readUInt16LE(at + 28)
    const extraLength = buffer.readUInt16LE(at + 30)
    const commentLength = buffer.readUInt16LE(at + 32)
    const name = buffer.toString(
      "utf8",
      at + 46,
      at + 46 + nameLength,
    )
    entries.set(name, {
      method: buffer.readUInt16LE(at + 10),
      compressedSize: buffer.readUInt32LE(at + 20),
      offset: buffer.readUInt32LE(at + 42),
    })
    at += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

export function readEntry(buffer, name) {
  const entry = listEntries(buffer).get(name)
  if (!entry) throw new Error(`zip has no entry ${name}`)
  const at = entry.offset
  if (buffer.readUInt32LE(at) !== LOCAL_HEADER)
    throw new Error(`zip entry ${name} is damaged`)
  const start =
    at +
    30 +
    buffer.readUInt16LE(at + 26) +
    buffer.readUInt16LE(at + 28)
  const data = buffer.subarray(
    start,
    start + entry.compressedSize,
  )
  if (entry.method === 0) return data
  if (entry.method === 8) return inflateRawSync(data)
  throw new Error(
    `zip entry ${name} uses compression method ${entry.method}`,
  )
}

/**
 * The plate G-code from a plain `.gcode` file or a sliced `.gcode.3mf`.
 * @param {string} path
 * @param {number} [plate] 1-based plate number inside a `.3mf`, default 1
 */
export function readGcodeFile(path, plate = 1) {
  const buffer = readFileSync(path)
  if (!path.toLowerCase().endsWith(".3mf"))
    return buffer.toString("utf8")
  return readEntry(
    buffer,
    `Metadata/plate_${plate}.gcode`,
  ).toString("utf8")
}
