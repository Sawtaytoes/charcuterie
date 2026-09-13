import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
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
