import { describe, expect, it } from "vitest"
import {
  addEdges,
  disposeObject,
  fitBounds,
  parseSTL,
  THREE,
} from "./index.js"

const triangle =
  "solid test\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 20 0 0\nvertex 0 10 0\nendloop\nendfacet\nendsolid test"
describe("model review geometry", () => {
  it("reads ASCII STL and rejects empty or truncated geometry", () => {
    expect(
      parseSTL(triangle).getAttribute("position").count,
    ).toBe(3)
    expect(() =>
      parseSTL("solid empty\nendsolid empty"),
    ).toThrow()
    const buffer = new ArrayBuffer(84)
    new DataView(buffer).setUint32(80, 5, true)
    expect(() => parseSTL(buffer)).toThrow()
  })
  it("fits an off-centre assembly inside both wide and narrow viewports", () => {
    for (const aspect of [0.32, 1, 2.4]) {
      const camera = new THREE.PerspectiveCamera(
        38,
        aspect,
        0.1,
        20000,
      )
      const controls = {
        target: new THREE.Vector3(),
        update() {},
      }
      const box = new THREE.Box3(
        new THREE.Vector3(100, 20, -60),
        new THREE.Vector3(400, 70, 50),
      )
      expect(
        fitBounds(camera, controls, box, [1, 0.72, 1]),
      ).toBe(true)
      camera.updateMatrixWorld()
      for (const x of [100, 400])
        for (const y of [20, 70])
          for (const z of [-60, 50]) {
            const projected = new THREE.Vector3(
              x,
              y,
              z,
            ).project(camera)
            expect(Math.abs(projected.x)).toBeLessThan(1)
            expect(Math.abs(projected.y)).toBeLessThan(1)
            expect(Math.abs(projected.z)).toBeLessThan(1)
          }
      expect(controls.target.toArray()).toEqual([
        250, 45, -5,
      ])
    }
  })
  it("starts with edges visible and disposes shared geometry only once", () => {
    const geometry = new THREE.BoxGeometry(2, 3, 4)
    const material = new THREE.MeshStandardMaterial()
    const first = new THREE.Mesh(geometry, material)
    const second = new THREE.Mesh(geometry, material)
    const root = new THREE.Group()
    root.add(first, second)
    expect(addEdges(first).visible).toBe(true)
    let count = 0
    geometry.addEventListener("dispose", () => {
      count += 1
    })
    disposeObject(root)
    expect(count).toBe(1)
  })
})
