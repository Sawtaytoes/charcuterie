import {
  addEdges,
  createViewer,
  fitBounds,
  loadSTL,
  THREE,
  VERSION,
} from "./index.js"
import { initialView } from "./manifest.js"

const element = document.getElementById("app")
const viewer = createViewer(element, {
  isAutoResize: false,
  isAnimating: false,
})
const { renderer, scene, camera, controls, group } = viewer
const parts = []
const palette = [
  0x5b8ff9, 0xf2617a, 0x5ad8a6, 0xf6bd16, 0x9aa7b8,
  0xa974f0,
]
let isWireframe = false
let isEdges = true
let isSpinning = false
let isPlain = false
let currentView = "iso"
let manifest
let bounds
const directions = {
  iso: [1, 0.72, 1],
  top: [0, 1, 0.0001],
  front: [0, 0.06, 1],
  right: [1, 0.06, 0],
}
const fail = (error) => {
  const alert = document.getElementById("err")
  alert.textContent = error.message
  alert.style.display = "block"
  console.error(error)
}
const info = () => {
  const target = document.getElementById("info-body")
  target.replaceChildren()
  for (const part of parts.filter(
    (part) => part.group.visible,
  )) {
    const row = document.createElement("div")
    row.textContent = `${part.spec.label || part.spec.file}: ${part.size
      .toArray()
      .map((value) => value.toFixed(2))
      .join(
        " × ",
      )} mm${part.spec.note ? ` — ${part.spec.note}` : ""}`
    target.append(row)
  }
  const note = document.createElement("div")
  note.textContent = `${manifest.note || ""} · Viewer ${VERSION}`
  target.append(note)
}
const sync = () => {
  document.getElementById("b-wire").ariaPressed =
    String(isWireframe)
  document.getElementById("b-edge").ariaPressed =
    String(isEdges)
  document.getElementById("b-spin").ariaPressed =
    String(isSpinning)
  document.getElementById("plain").ariaPressed =
    String(isPlain)
  for (const part of parts) {
    part.mesh.material.wireframe = isWireframe
    part.edge.visible = isEdges
    part.mesh.material.map = isPlain ? null : part.texture
    part.mesh.material.needsUpdate = true
    part.button.ariaPressed = String(part.group.visible)
  }
  info()
}
const measure = () => {
  const box = new THREE.Box3()
  for (const part of parts)
    if (part.group.visible)
      box.union(new THREE.Box3().setFromObject(part.group))
  return box
}
const fitView = (direction) => {
  bounds = measure()
  fitBounds(camera, controls, bounds, direction)
}
function arrange(name, isRefit = true) {
  currentView = name
  isSpinning = false
  group.rotation.y = 0
  const arrangement = manifest.views?.[name] || {}
  const separation = Number(
    document.getElementById("separate").value,
  )
  for (const part of parts) {
    const state = arrangement.parts?.[part.id] || {}
    part.group.visible =
      state.isVisible ?? part.spec.visible !== false
    part.group.position.fromArray(
      state.position || [0, 0, 0],
    )
    part.group.rotation.fromArray([
      ...(state.rotation || [0, 0, 0]),
      "XYZ",
    ])
    part.group.scale.fromArray(state.scale || [1, 1, 1])
    const explode = state.explode ||
      part.spec.explode || [0, 0, 0]
    part.group.position.addScaledVector(
      new THREE.Vector3(...explode),
      separation,
    )
    part.mesh.geometry = state.geometry
      ? part.variants[state.geometry]
      : part.geometry
    if (!part.mesh.geometry)
      throw new Error(
        `Unknown geometry ${state.geometry} for ${part.id}`,
      )
    part.edge.geometry.dispose()
    part.edge.geometry = new THREE.EdgesGeometry(
      part.mesh.geometry,
      24,
    )
  }
  document.getElementById("caption").textContent =
    arrangement.caption || ""
  document
    .querySelectorAll("[data-v]")
    .forEach((button) => {
      button.ariaPressed = String(button.dataset.v === name)
    })
  sync()
  if (isRefit)
    fitView(
      arrangement.direction ||
        directions[name] ||
        directions.iso,
    )
}
try {
  const response = await fetch("models.json")
  if (!response.ok)
    throw new Error(
      `Cannot load models.json: HTTP ${response.status}`,
    )
  manifest = await response.json()
  if (
    manifest.schemaVersion !== undefined &&
    manifest.schemaVersion !== 1
  )
    throw new Error("Unsupported viewer manifest version")
  if (
    !Array.isArray(manifest.models) ||
    manifest.models.length === 0
  )
    throw new Error("No models supplied")
  document.title = manifest.title || "Model viewer"
  document.getElementById("title").textContent =
    document.title
  scene.background = new THREE.Color(
    manifest.background ?? 0x101318,
  )
  scene.add(
    new THREE.HemisphereLight(0xbcd0ea, 0x1a1f27, 0.9),
  )
  for (const [colour, intensity, position] of [
    [0xffffff, 1.45, [0.6, 1, 0.8]],
    [0x93b4e6, 0.55, [-0.8, 0.4, -0.3]],
    [0xffffff, 0.4, [0.1, -0.5, -1]],
  ]) {
    const light = new THREE.DirectionalLight(
      colour,
      intensity,
    )
    light.position.fromArray(position)
    scene.add(light)
  }
  Object.assign(directions, manifest.directions)
  const ids = new Set()
  for (const [index, spec] of manifest.models.entries()) {
    const id = spec.id || String(index)
    if (ids.has(id))
      throw new Error(`Duplicate part id: ${id}`)
    ids.add(id)
    const geometry = await loadSTL(spec.file)
    const size = geometry.boundingBox.getSize(
      new THREE.Vector3(),
    )
    const variants = {}
    for (const [key, file] of Object.entries(
      spec.variants || {},
    ))
      variants[key] = await loadSTL(file)
    for (const item of [
      geometry,
      ...Object.values(variants),
    ]) {
      if (spec.offset) item.translate(...spec.offset)
      if ((spec.upAxis || manifest.upAxis || "z") === "z")
        item.rotateX(-Math.PI / 2)
      item.computeBoundingBox()
    }
    const texture = spec.texture
      ? await new THREE.TextureLoader().loadAsync(
          spec.texture,
        )
      : null
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace
      // Planar CAD-XY artwork projection, before the Z-up display transform.
      const original = await loadSTL(spec.file)
      const box = original.boundingBox
      const position = original.getAttribute("position")
      const uv = new Float32Array(position.count * 2)
      for (
        let vertex = 0;
        vertex < position.count;
        vertex += 1
      ) {
        uv[vertex * 2] =
          (position.getX(vertex) - box.min.x) /
          (box.max.x - box.min.x || 1)
        uv[vertex * 2 + 1] =
          (position.getY(vertex) - box.min.y) /
          (box.max.y - box.min.y || 1)
      }
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(uv, 2),
      )
      original.dispose()
    }
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color:
          spec.color ?? palette[index % palette.length],
        map: texture,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
    )
    const partGroup = new THREE.Group()
    partGroup.add(mesh)
    partGroup.visible = spec.visible !== false
    group.add(partGroup)
    const edge = addEdges(mesh)
    const button = document.createElement("button")
    button.textContent = spec.label || spec.file
    button.onclick = () => {
      partGroup.visible = !partGroup.visible
      sync()
    }
    document.getElementById("parts").append(button)
    parts.push({
      id,
      spec,
      mesh,
      geometry,
      variants,
      group: partGroup,
      edge,
      size,
      texture,
      button,
    })
  }
  // Translate geometries so spin has the visible assembly's centre as its origin.
  const centre = measure().getCenter(new THREE.Vector3())
  for (const part of parts) {
    for (const geometry of [
      part.geometry,
      ...Object.values(part.variants),
    ])
      geometry.translate(-centre.x, -centre.y, -centre.z)
    part.edge.geometry.translate(
      -centre.x,
      -centre.y,
      -centre.z,
    )
  }
  const initialBounds = measure()
  if (!initialBounds.isEmpty()) {
    const radius = initialBounds.getBoundingSphere(
      new THREE.Sphere(),
    ).radius
    const size = Math.max(
      10,
      Math.ceil((radius * 2.6) / 10) * 10,
    )
    const grid = new THREE.GridHelper(
      size,
      Math.max(4, Math.round(size / 10)),
      0x2a313c,
      0x1d232c,
    )
    grid.position.y = initialBounds.min.y
    scene.add(grid)
  }
  for (const [name, arrangement] of Object.entries(
    manifest.views || {},
  )) {
    if (Object.hasOwn(directions, name)) continue
    const button = document.createElement("button")
    button.dataset.v = name
    button.textContent = arrangement.label || name
    document.getElementById("views").append(button)
  }
  for (const button of document.querySelectorAll(
    "[data-v]",
  ))
    button.onclick = () => {
      document.getElementById("separate").value = "0"
      if (button.dataset.v === "fit")
        fitView(
          camera.position.clone().sub(controls.target),
        )
      else arrange(button.dataset.v)
    }
  document.getElementById("b-wire").onclick = () => {
    isWireframe = !isWireframe
    sync()
  }
  document.getElementById("b-edge").onclick = () => {
    isEdges = !isEdges
    sync()
  }
  document.getElementById("b-spin").onclick = () => {
    isSpinning = !isSpinning
    sync()
  }
  document.getElementById("plain").onclick = () => {
    isPlain = !isPlain
    sync()
  }
  document.getElementById("separate").oninput = () =>
    arrange(currentView, false)
  const resize = () => {
    viewer.resize()
    fitView(camera.position.clone().sub(controls.target))
  }
  const observer = new ResizeObserver(resize)
  observer.observe(element)
  viewer.resize()
  const query = new URLSearchParams(location.search)
  const name = initialView(manifest, query)
  arrange(
    Object.hasOwn(directions, name) ||
      Object.hasOwn(manifest.views || {}, name)
      ? name
      : "iso",
  )
  window.__viewer = {
    ...viewer,
    THREE,
    parts,
    view: arrange,
    fit: fitView,
    version: VERSION,
    isReady: true,
  }
  renderer.setAnimationLoop(() => {
    if (isSpinning) group.rotation.y += 0.0035
    viewer.render()
  })
  window.addEventListener(
    "pagehide",
    () => {
      observer.disconnect()
      viewer.dispose()
    },
    { once: true },
  )
} catch (error) {
  fail(error)
}
