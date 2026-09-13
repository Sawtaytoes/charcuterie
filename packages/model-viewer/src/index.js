import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import metadata from "../package.json" with { type: "json" }

export { THREE }
export const VERSION = metadata.version

/** Shared camera/renderer lifecycle. Models and their coordinate transforms belong to callers. */
export function createViewer(element, options = {}) {
  if (!element)
    throw new Error("A viewer container is required")
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    ...options.renderer,
  })
  renderer.setPixelRatio(
    Math.min(globalThis.devicePixelRatio || 1, 2),
  )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  if (options.background !== undefined)
    renderer.setClearColor(options.background)
  element.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    options.fov ?? 38,
    1,
    options.near ?? 0.1,
    options.far ?? 20000,
  )
  const controls = new OrbitControls(
    camera,
    renderer.domElement,
  )
  controls.enableDamping = true
  controls.dampingFactor = options.dampingFactor ?? 0.075
  const group = new THREE.Group()
  scene.add(group)
  let observer
  let isDisposed = false
  const resize = () => {
    if (isDisposed) return
    const width = Math.max(1, element.clientWidth)
    const height = Math.max(1, element.clientHeight)
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    options.onResize?.()
  }
  if (options.isAutoResize !== false) {
    observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
  }
  const render = () => {
    if (isDisposed) return
    options.onFrame?.()
    controls.update()
    renderer.render(scene, camera)
  }
  if (options.isAnimating !== false)
    renderer.setAnimationLoop(render)
  const dispose = () => {
    if (isDisposed) return
    isDisposed = true
    observer?.disconnect()
    renderer.setAnimationLoop(null)
    controls.dispose()
    disposeObject(scene)
    renderer.dispose()
    renderer.domElement.remove()
  }
  return {
    renderer,
    scene,
    camera,
    controls,
    group,
    resize,
    render,
    dispose,
    version: VERSION,
  }
}

/** Fit a bounding sphere using the limiting field of view, including portrait containers. */
export function fitBounds(
  camera,
  controls,
  bounds,
  direction = [1, 0.72, 1],
  padding = 1.12,
) {
  if (bounds.isEmpty()) return false
  const sphere = bounds.getBoundingSphere(
    new THREE.Sphere(),
  )
  const radius = Math.max(sphere.radius, 0.01)
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2
  const horizontal = Math.atan(
    Math.tan(vertical) * camera.aspect,
  )
  const distance =
    (radius / Math.sin(Math.min(vertical, horizontal))) *
    padding
  const vector = Array.isArray(direction)
    ? new THREE.Vector3(...direction)
    : direction.clone()
  if (!Number.isFinite(distance) || vector.lengthSq() === 0)
    throw new Error("Invalid camera fit")
  camera.position
    .copy(sphere.center)
    .add(vector.normalize().multiplyScalar(distance))
  camera.near = Math.max(0.001, distance / 1000)
  camera.far = distance + radius * 10
  camera.updateProjectionMatrix()
  controls.target.copy(sphere.center)
  // Reset residual damping from the previous view before reporting a stable fit.
  for (let index = 0; index < 200; index += 1)
    controls.update()
  camera.position
    .copy(sphere.center)
    .add(vector.normalize().multiplyScalar(distance))
  camera.lookAt(sphere.center)
  controls.update()
  return true
}

export function parseSTL(buffer) {
  const geometry = new STLLoader().parse(buffer)
  const positions = geometry.getAttribute("position")
  if (
    !positions ||
    positions.count < 3 ||
    positions.count % 3 !== 0 ||
    !positions.array.every(Number.isFinite)
  ) {
    geometry.dispose()
    throw new Error("The STL contains no valid triangles")
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  return geometry
}

export async function loadSTL(url, options) {
  const response = await fetch(url, options)
  if (!response.ok)
    throw new Error(
      `Cannot load ${url}: HTTP ${response.status}`,
    )
  return parseSTL(await response.arrayBuffer())
}

export function addEdges(mesh, options = {}) {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      mesh.geometry,
      options.angle ?? 24,
    ),
    new THREE.LineBasicMaterial({
      color: options.colour ?? 0x0b0e12,
      transparent: true,
      opacity: options.opacity ?? 0.55,
    }),
  )
  lines.visible = options.isVisible !== false
  mesh.add(lines)
  return lines
}

/** Dispose shared resources once, even when several meshes reference the same geometry. */
export function disposeObject(root) {
  const resources = new Set()
  root.traverse((object) => {
    if (object.geometry) resources.add(object.geometry)
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (!material) continue
      resources.add(material)
      for (const value of Object.values(material))
        if (value?.isTexture) resources.add(value)
    }
  })
  for (const resource of resources) resource.dispose()
}
