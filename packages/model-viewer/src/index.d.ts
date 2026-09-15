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
