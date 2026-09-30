/**
 * 3MF reading for review pages. Three's own `ThreeMFLoader` (0.160) resolves a
 * component only inside the file that declares it, so every Bambu Studio and
 * OrcaSlicer project — which keeps each object in `3D/Objects/*.model` and points
 * at it with `p:path` (the production extension) — throws on load. This reader
 * follows those paths, composes the transforms, and scales every unit to
 * millimeters. Materials, color groups and textures are not read: callers color
 * the meshes themselves, as they do for STL.
 *
 * The XML is scanned with regular expressions rather than `DOMParser`, so the
 * same code runs in Node (tests, staging) and the browser, and a 2 million
 * triangle mesh does not build a 10 million node DOM first.
 */
import * as THREE from "three"
import {
  strFromU8,
  unzipSync,
} from "three/addons/libs/fflate.module.js"

const UNIT_MILLIMETRES = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
}
const ROOT_RELATIONSHIP =
  "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"
const DEFAULT_ROOT = "3D/3dmodel.model"
const MAX_DEPTH = 16

const attributePattern = /([\w:.-]+)\s*=\s*"([^"]*)"/g

function readAttributes(text) {
  const attributes = {}
  for (const [, name, value] of text.matchAll(
    attributePattern,
  ))
    attributes[name] = value
  return attributes
}

function localName(name) {
  const colon = name.indexOf(":")
  return colon === -1 ? name : name.slice(colon + 1)
}

/** `p:path` is namespace-prefixed; any prefix bound to the production namespace works. */
function readPath(attributes) {
  for (const [name, value] of Object.entries(attributes))
    if (localName(name) === "path" && name.includes(":"))
      return value
  return undefined
}

function normalizePath(path) {
  return path.replace(/^\/+/, "").replace(/\\/g, "/")
}

/** 3MF transforms are a row-major 4 x 3 matrix: nine rotation terms then the translation. */
export function parseTransform(value) {
  const matrix = new THREE.Matrix4()
  if (!value) return matrix
  const terms = value.trim().split(/\s+/).map(Number)
  if (terms.length !== 12 || !terms.every(Number.isFinite))
    throw new Error(`Invalid 3MF transform "${value}"`)
  const [a, b, c, d, e, f, g, h, i, x, y, z] = terms
  return matrix.set(
    a,
    d,
    g,
    x,
    b,
    e,
    h,
    y,
    c,
    f,
    i,
    z,
    0,
    0,
    0,
    1,
  )
}

function readMesh(body) {
  const positions = []
  for (const [, attributeText] of body.matchAll(
    /<(?:\w+:)?vertex\b([^>]*)>/g,
  )) {
    const { x, y, z } = readAttributes(attributeText)
    positions.push(Number(x), Number(y), Number(z))
  }
  const indices = []
  for (const [, attributeText] of body.matchAll(
    /<(?:\w+:)?triangle\b([^>]*)>/g,
  )) {
    const { v1, v2, v3 } = readAttributes(attributeText)
    indices.push(Number(v1), Number(v2), Number(v3))
  }
  const vertexCount = positions.length / 3
  if (
    !positions.every(Number.isFinite) ||
    !indices.every(
      (index) =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < vertexCount,
    )
  )
    throw new Error(
      "The 3MF mesh has invalid vertices or triangles",
    )
  return { positions, indices }
}

/** One `.model` part: its unit, its objects by id and its build items. */
export function parseModelPart(text) {
  const modelTag = text.match(/<(?:\w+:)?model\b([^>]*)>/)
  if (!modelTag)
    throw new Error("The 3MF part has no <model>")
  const unit =
    readAttributes(modelTag[1]).unit ?? "millimeter"
  const scale = UNIT_MILLIMETRES[unit]
  if (scale === undefined)
    throw new Error(`Unknown 3MF unit "${unit}"`)
  const objects = new Map()
  for (const [, attributeText, body] of text.matchAll(
    /<(?:\w+:)?object\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?object>/g,
  )) {
    const attributes = readAttributes(attributeText)
    const meshBody = body.match(
      /<(?:\w+:)?mesh\b[^>]*>([\s\S]*?)<\/(?:\w+:)?mesh>/,
    )
    const components = [
      ...body.matchAll(/<(?:\w+:)?component\b([^>]*)>/g),
    ].map(([, componentText]) => {
      const component = readAttributes(componentText)
      return {
        objectId: component.objectid,
        path: readPath(component),
        transform: parseTransform(component.transform),
      }
    })
    objects.set(attributes.id, {
      name: attributes.name ?? "",
      mesh: meshBody ? readMesh(meshBody[1]) : null,
      components,
    })
  }
  const buildBody = text.match(
    /<(?:\w+:)?build\b[^>]*>([\s\S]*?)<\/(?:\w+:)?build>/,
  )
  const items = buildBody
    ? [
        ...buildBody[1].matchAll(
          /<(?:\w+:)?item\b([^>]*)>/g,
        ),
      ].map(([, itemText]) => {
        const item = readAttributes(itemText)
        return {
          objectId: item.objectid,
          path: readPath(item),
          transform: parseTransform(item.transform),
        }
      })
    : []
  return { scale, objects, items }
}

function findRootPath(files) {
  const relationships = files["_rels/.rels"]
  if (relationships)
    for (const [, attributeText] of strFromU8(
      relationships,
    ).matchAll(/<Relationship\b([^>]*)>/g)) {
      const relationship = readAttributes(attributeText)
      if (relationship.Type === ROOT_RELATIONSHIP)
        return normalizePath(relationship.Target)
    }
  return DEFAULT_ROOT
}

function toBytes(buffer) {
  if (buffer instanceof Uint8Array) return buffer
  if (ArrayBuffer.isView(buffer))
    return new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    )
  return new Uint8Array(buffer)
}

/**
 * Parse a 3MF package into a group of meshes, one per printed object instance.
 * Each mesh carries flat normals in millimeters and the source object's name;
 * the group is in the file's own Z-up frame. Throws when the package holds no
 * triangles, so an empty review is an error rather than a blank page.
 */
export function parse3MF(buffer) {
  const files = unzipSync(toBytes(buffer), {
    filter: (file) =>
      file.name.endsWith(".model") ||
      file.name === "_rels/.rels",
  })
  const parts = new Map()
  const readPart = (path) => {
    const key = normalizePath(path)
    if (!parts.has(key)) {
      const bytes = files[key]
      if (!bytes)
        throw new Error(`The 3MF has no part "${key}"`)
      parts.set(key, parseModelPart(strFromU8(bytes)))
    }
    return parts.get(key)
  }
  const rootPath = findRootPath(files)
  const root = readPart(rootPath)
  const group = new THREE.Group()
  const geometries = new Map()
  const unitScale = new THREE.Matrix4().makeScale(
    root.scale,
    root.scale,
    root.scale,
  )
  const place = (
    partPath,
    objectId,
    matrix,
    name,
    depth,
  ) => {
    if (depth > MAX_DEPTH)
      throw new Error("The 3MF components nest too deeply")
    const part = readPart(partPath)
    const object = part.objects.get(objectId)
    if (!object)
      throw new Error(
        `The 3MF part "${partPath}" has no object ${objectId}`,
      )
    const label = name || object.name
    if (object.mesh) {
      const key = `${partPath}#${objectId}`
      let geometry = geometries.get(key)
      if (!geometry) {
        const indexed = new THREE.BufferGeometry()
        indexed.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            object.mesh.positions,
            3,
          ),
        )
        indexed.setIndex(object.mesh.indices)
        geometry = indexed.toNonIndexed()
        indexed.dispose()
        geometry.computeVertexNormals()
        geometries.set(key, geometry)
      }
      if (geometry.getAttribute("position").count > 0) {
        const mesh = new THREE.Mesh(geometry)
        mesh.name = label
        // The root part's unit governs the package; every part is read in it.
        mesh.applyMatrix4(
          unitScale.clone().multiply(matrix),
        )
        group.add(mesh)
      }
    }
    for (const component of object.components)
      place(
        component.path ?? partPath,
        component.objectId,
        matrix.clone().multiply(component.transform),
        label,
        depth + 1,
      )
  }
  for (const item of root.items)
    place(
      item.path ?? rootPath,
      item.objectId,
      item.transform,
      "",
      0,
    )
  if (group.children.length === 0)
    throw new Error(
      "The 3MF contains no printable triangles",
    )
  return group
}

export async function load3MF(url, options) {
  const response = await fetch(url, options)
  if (!response.ok)
    throw new Error(
      `Cannot load ${url}: HTTP ${response.status}`,
    )
  return parse3MF(await response.arrayBuffer())
}
