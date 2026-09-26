import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readGcodeFile } from "./archive.js"
import { analyzeGcode } from "./gcode.js"
import { previewRoot } from "./server.js"

const distribution = fileURLToPath(
  new URL("../dist/", import.meta.url),
)
export async function stagePreview(
  manifest,
  sourceDirectory = process.cwd(),
) {
  if (
    manifest.schemaVersion !== undefined &&
    manifest.schemaVersion !== 1
  )
    throw new Error("Unsupported manifest version")
  if (manifest.replay)
    return stageReplay(manifest, sourceDirectory)
  if (
    !Array.isArray(manifest.models) ||
    !manifest.models.length
  )
    throw new Error("At least one model is required")
  if (
    manifest.upAxis &&
    !["y", "z"].includes(manifest.upAxis)
  )
    throw new Error("upAxis must be y or z")
  const ids = new Set()
  for (const [index, model] of manifest.models.entries()) {
    const id = model.id || String(index)
    if (ids.has(id))
      throw new Error(`Duplicate part id: ${id}`)
    ids.add(id)
    for (const key of ["offset", "explode"]) {
      if (
        model[key] &&
        (model[key].length !== 3 ||
          !model[key].every(Number.isFinite))
      )
        throw new Error(`Invalid ${key} for ${id}`)
    }
  }
  await mkdir(previewRoot, { recursive: true, mode: 0o700 })
  const directory = await mkdtemp(
    path.join(previewRoot, "preview-"),
  )
  await cp(distribution, directory, { recursive: true })
  const output = structuredClone(manifest)
  let index = 0
  const copy = async (file) => {
    if (
      typeof file !== "string" ||
      /^[a-z]+:\/\//i.test(file)
    )
      throw new Error("Preview assets must be local files")
    const target = `asset-${index++}${path.extname(file).toLowerCase()}`
    await cp(
      path.resolve(sourceDirectory, file),
      path.join(directory, target),
    )
    return target
  }
  for (const model of output.models) {
    model.file = await copy(model.file)
    if (model.texture)
      model.texture = await copy(model.texture)
    for (const [key, file] of Object.entries(
      model.variants || {},
    ))
      model.variants[key] = await copy(file)
  }
  output.schemaVersion = 1
  output.viewerVersion = JSON.parse(
    await readFile(
      path.join(directory, "version.json"),
      "utf8",
    ),
  ).version
  await writeFile(
    path.join(directory, "models.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  )
  return directory
}
/**
 * A replay manifest analyses each plate's G-code here, once, so the page loads
 * a few hundred kilobytes of samples rather than a 25 MB file.
 */
async function stageReplay(manifest, sourceDirectory) {
  const { plates, printer = {} } = manifest.replay
  if (!Array.isArray(plates) || !plates.length)
    throw new Error("A replay needs at least one plate")
  const keys = new Set()
  for (const [index, plate] of plates.entries()) {
    const key = plate.key || String(index)
    if (keys.has(key))
      throw new Error(`Duplicate plate key: ${key}`)
    keys.add(key)
    if (typeof plate.gcode !== "string")
      throw new Error(`Plate ${key} names no gcode file`)
    if (
      !plate.objects ||
      !Object.keys(plate.objects).length
    )
      throw new Error(`Plate ${key} names no objects`)
    for (const [id, object] of Object.entries(
      plate.objects,
    )) {
      if (!/^\d+$/.test(id))
        throw new Error(
          `Plate ${key}: object keys are G-code label ids, not ${id}`,
        )
      if (
        !Array.isArray(object.parts) ||
        !object.parts.length
      )
        throw new Error(
          `Plate ${key}: object ${id} has no parts`,
        )
    }
  }
  const envelopeRadius = printer.envelopeRadius ?? 68
  const bed = printer.bed ?? [256, 256]
  const gantryHeight = printer.gantryHeight ?? 34
  if (
    bed.length !== 2 ||
    ![...bed, envelopeRadius, gantryHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    throw new Error("Invalid printer dimensions")
  await mkdir(previewRoot, { recursive: true, mode: 0o700 })
  const directory = await mkdtemp(
    path.join(previewRoot, "replay-"),
  )
  await cp(distribution, directory, { recursive: true })
  await cp(
    path.join(directory, "replay.html"),
    path.join(directory, "index.html"),
  )
  let index = 0
  const copied = new Map()
  const copy = async (file) => {
    if (
      typeof file !== "string" ||
      /^[a-z]+:\/\//i.test(file)
    )
      throw new Error("Preview assets must be local files")
    const source = path.resolve(sourceDirectory, file)
    if (!copied.has(source)) {
      const target = `asset-${index++}${path.extname(file).toLowerCase()}`
      await cp(source, path.join(directory, target))
      copied.set(source, target)
    }
    return copied.get(source)
  }
  const output = {
    schemaVersion: 1,
    title: manifest.title || "G-code replay",
    note: manifest.note || "",
    printer: { bed, envelopeRadius, gantryHeight },
    plates: [],
  }
  for (const [plateIndex, plate] of plates.entries()) {
    const text = readGcodeFile(
      path.resolve(sourceDirectory, plate.gcode),
      plate.plate ?? 1,
    )
    const bottomTools = {}
    for (const [id, object] of Object.entries(
      plate.objects,
    ))
      bottomTools[id] = { bottomTool: object.bottomTool }
    const analysis = analyzeGcode(text, {
      objects: bottomTools,
      topTool: plate.topTool,
      splitZ: plate.splitZ,
      envelopeRadius,
    })
    const printed = new Map(
      analysis.objects.map((object) => [
        String(object.id),
        object,
      ]),
    )
    const objects = []
    for (const [id, object] of Object.entries(
      plate.objects,
    ).sort(([a], [b]) => Number(a) - Number(b))) {
      if (!printed.has(id))
        throw new Error(
          `Plate ${plate.key || plateIndex}: the G-code prints no object with label id ${id}`,
        )
      const parts = []
      for (const part of object.parts)
        parts.push({
          file: await copy(part.file),
          color: part.color,
        })
      objects.push({
        ...printed.get(id),
        name: object.name || `Object ${id}`,
        parts,
      })
    }
    // Samples carry one height per printed object, in G-code order. Keep only
    // the objects this manifest describes, in the same order as `objects`.
    const columns = objects.map((object) =>
      analysis.objects.findIndex(
        (entry) => entry.id === object.id,
      ),
    )
    output.plates.push({
      key: plate.key || String(plateIndex),
      title: plate.title || `Plate ${plateIndex + 1}`,
      phases: plate.phases ?? [],
      tools: analysis.tools.map((tool) => ({
        ...tool,
        name:
          plate.toolNames?.[tool.slot] ||
          `Slot ${tool.slot + 1}`,
      })),
      objects,
      changes: analysis.changes,
      checks: analysis.checks,
      totals: analysis.totals,
      samples: analysis.samples.map((sample) => [
        ...sample.slice(0, 6),
        columns.map((column) => sample[6][column]),
        sample[7],
      ]),
    })
  }
  output.viewerVersion = JSON.parse(
    await readFile(
      path.join(directory, "version.json"),
      "utf8",
    ),
  ).version
  await writeFile(
    path.join(directory, "replay.json"),
    `${JSON.stringify(output)}\n`,
  )
  return directory
}
export function parseSpec(value) {
  const [file, ...attributes] = value.split(",")
  if (!file.toLowerCase().endsWith(".stl"))
    throw new Error(`Not an STL: ${file}`)
  const result = { file, label: path.basename(file) }
  for (const attribute of attributes) {
    const equals = attribute.indexOf("=")
    if (equals < 1)
      throw new Error(
        `Invalid model attribute: ${attribute}`,
      )
    const key = attribute.slice(0, equals)
    const text = attribute.slice(equals + 1)
    if (["label", "note", "id", "upAxis"].includes(key))
      result[key] = text
    else if (key === "color") {
      const colour = Number(text)
      if (
        !Number.isInteger(colour) ||
        colour < 0 ||
        colour > 0xffffff
      )
        throw new Error("Invalid colour")
      result.color = colour
    } else if (key === "visible")
      result.visible = !["0", "false", "no"].includes(
        text.toLowerCase(),
      )
    else if (key === "offset" || key === "explode")
      result[key] = text.split(";").map(Number)
    else throw new Error(`Unknown model attribute: ${key}`)
  }
  return result
}
