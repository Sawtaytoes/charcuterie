import * as THREE from "three"
import type { OrbitControls } from "three/addons/controls/OrbitControls.js"

export { THREE }
export const VERSION: string
export interface Viewer {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  group: THREE.Group
  version: string
  resize(): void
  render(): void
  dispose(): void
}
export interface ViewerOptions {
  renderer?: THREE.WebGLRendererParameters
  background?: THREE.ColorRepresentation
  fov?: number
  near?: number
  far?: number
  dampingFactor?: number
  isAutoResize?: boolean
  isAnimating?: boolean
  onResize?(): void
  onFrame?(): void
}
export function createViewer(
  element: HTMLElement,
  options?: ViewerOptions,
): Viewer
export function fitBounds(
  camera: THREE.PerspectiveCamera,
  controls: Pick<OrbitControls, "target" | "update">,
  bounds: THREE.Box3,
  direction?: [number, number, number] | THREE.Vector3,
  padding?: number,
): boolean
export function parseSTL(
  buffer: ArrayBuffer | string,
): THREE.BufferGeometry
export function loadSTL(
  url: string | URL,
  options?: RequestInit,
): Promise<THREE.BufferGeometry>
/**
 * Read a 3MF package, following Bambu Studio/OrcaSlicer `p:path` components. One mesh
 * per printed object instance, flat normals, millimeters, the file's own Z-up frame.
 * Slicer object names are used and modifier volumes skipped when the package carries
 * `Metadata/model_settings.config`. Materials and colors are not read.
 */
export function parse3MF(
  buffer: ArrayBuffer | ArrayBufferView,
): THREE.Group
export function load3MF(
  url: string | URL,
  options?: RequestInit,
): Promise<THREE.Group>
export interface EdgeCache {
  get(geometry: THREE.BufferGeometry): THREE.BufferGeometry
  set(
    geometry: THREE.BufferGeometry,
    edges: THREE.BufferGeometry,
  ): THREE.BufferGeometry
  dispose(): void
}
export function createEdgeCache(angle?: number): EdgeCache
export function addEdges(
  mesh: THREE.Mesh,
  options?: {
    angle?: number
    cache?: EdgeCache
    colour?: THREE.ColorRepresentation
    opacity?: number
    isVisible?: boolean
  },
): THREE.LineSegments
export function disposeObject(root: THREE.Object3D): void

/** One slicer label: `; start printing object, unique label id: N`. */
export interface GcodeObject {
  id: number
  centre: [number, number]
  radius: number
  height: number
}
export interface GcodeAnalysisOptions {
  /** Per label id; `bottomTool` is the 0-based T number below `splitZ`. */
  objects?: Record<string, { bottomTool?: number }>
  /** 0-based T number of the shared top colour. */
  topTool?: number
  /** Z of the first layer printed in the top colour. The colour check needs both. */
  splitZ?: number
  /** The slicer's `extruder_clearance_max_radius`; 68 mm on the Bambu X1 series. */
  envelopeRadius?: number
  footprintMargin?: number
  maxSamples?: number
}
/** [line, x, y, z, tool, label, heights per object, elapsed minutes] */
export type GcodeSample = [
  number,
  number,
  number,
  number,
  number | null,
  number | null,
  number[],
  number | null,
]
export interface GcodeAnalysis {
  tools: {
    slot: number
    colour: string
    density: number | null
  }[]
  objects: GcodeObject[]
  changes: {
    line: number
    from: number
    to: number
    z: number
  }[]
  samples: GcodeSample[]
  checks: {
    colourErrors: number | null
    tipCollisions: number
    envelopeIntrusions: number
    envelopeRadius: number
    closestTallerEdge: number | null
    examples: {
      colourErrors: object[]
      tipCollisions: object[]
      envelopeIntrusions: object[]
    }
  }
  totals: {
    minutes: number | null
    grams: number[]
    totalGrams: number
    purgeGrams: number
  }
}
export function analyzeGcode(
  text: string,
  options?: GcodeAnalysisOptions,
): GcodeAnalysis
export function objectFootprints(
  lines: string[],
): GcodeObject[]
export function readHeader(text: string): {
  colours: string[]
  densities: number[]
  minutes: number | null
}
