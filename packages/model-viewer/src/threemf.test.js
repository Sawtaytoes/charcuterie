import {
  strToU8,
  zipSync,
} from "three/addons/libs/fflate.module.js"
import { describe, expect, it } from "vitest"
import { parse3MF, THREE } from "./index.js"
import { parseTransform } from "./threemf.js"

const CORE =
  "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
const PRODUCTION =
  "http://schemas.microsoft.com/3dmanufacturing/production/2015/06"
const cubeMesh = (size) => {
  const vertices = []
  for (const x of [0, size])
    for (const y of [0, size])
      for (const z of [0, size])
        vertices.push(
          `<vertex x="${x}" y="${y}" z="${z}"/>`,
        )
  const faces = [
    [0, 2, 1],
    [1, 2, 3],
    [4, 5, 6],
    [5, 7, 6],
    [0, 1, 4],
    [1, 5, 4],
    [2, 6, 3],
    [3, 6, 7],
    [0, 4, 2],
    [2, 4, 6],
    [1, 3, 5],
    [3, 7, 5],
  ]
  return `<mesh><vertices>${vertices.join("")}</vertices><triangles>${faces
    .map(
      ([a, b, c]) =>
        `<triangle v1="${a}" v2="${b}" v3="${c}"/>`,
    )
    .join("")}</triangles></mesh>`
}
const rels = (target) =>
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="${target}" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`
const pack = (files) =>
  zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, text]) => [
        name,
        strToU8(text),
      ]),
    ),
  )
const boundsOf = (group) =>
  new THREE.Box3().setFromObject(group)

describe("3MF packages", () => {
  it("reads a plain single-file package in its declared unit", () => {
    const group = parse3MF(
      pack({
        "_rels/.rels": rels("/3D/3dmodel.model"),
        "3D/3dmodel.model": `<model unit="centimeter" xmlns="${CORE}"><resources><object id="1" name="Cube" type="model">${cubeMesh(2)}</object></resources><build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 1 0 0"/></build></model>`,
      }),
    )
    expect(group.children).toHaveLength(1)
    expect(group.children[0].name).toBe("Cube")
    expect(
      group.children[0].geometry.getAttribute("position")
        .count,
    ).toBe(36)
    const bounds = boundsOf(group)
    expect(bounds.min.toArray()).toEqual([10, 0, 0])
    expect(bounds.max.toArray()).toEqual([30, 20, 20])
  })

  it("follows Bambu-style p:path components and composes their transforms", () => {
    const group = parse3MF(
      pack({
        "_rels/.rels": rels("/3D/3dmodel.model"),
        "3D/3dmodel.model": `<model unit="millimeter" xmlns="${CORE}" xmlns:p="${PRODUCTION}"><resources><object id="2" name="Assembly" type="model"><components><component p:path="/3D/Objects/object_1.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 5"/><component p:path="/3D/Objects/object_1.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0"/></components></object></resources><build><item objectid="2" p:path="/3D/3dmodel.model" transform="1 0 0 0 1 0 0 0 1 100 100 0"/></build></model>`,
        "3D/Objects/object_1.model": `<model unit="millimeter" xmlns="${CORE}"><resources><object id="1" type="model">${cubeMesh(10)}</object></resources><build/></model>`,
      }),
    )
    expect(group.children).toHaveLength(2)
    expect(group.children.map((mesh) => mesh.name)).toEqual(
      ["Assembly", "Assembly"],
    )
    // Both instances share one geometry rather than decoding the part twice.
    expect(group.children[0].geometry).toBe(
      group.children[1].geometry,
    )
    const bounds = boundsOf(group)
    expect(bounds.min.toArray()).toEqual([100, 100, 0])
    expect(bounds.max.toArray()).toEqual([130, 110, 15])
  })

  it("defaults the root part when there is no relationship file", () => {
    const group = parse3MF(
      pack({
        "3D/3dmodel.model": `<model xmlns="${CORE}"><resources><object id="7">${cubeMesh(1)}</object></resources><build><item objectid="7"/></build></model>`,
      }),
    )
    expect(group.children).toHaveLength(1)
  })

  it("rejects empty packages, missing parts and out-of-range triangles", () => {
    expect(() =>
      parse3MF(
        pack({
          "3D/3dmodel.model": `<model xmlns="${CORE}"><resources/><build/></model>`,
        }),
      ),
    ).toThrow(/no printable triangles/)
    expect(() =>
      parse3MF(
        pack({
          "3D/3dmodel.model": `<model xmlns="${CORE}" xmlns:p="${PRODUCTION}"><resources><object id="1"><components><component p:path="/3D/Objects/missing.model" objectid="1"/></components></object></resources><build><item objectid="1"/></build></model>`,
        }),
      ),
    ).toThrow(/no part/)
    expect(() =>
      parse3MF(
        pack({
          "3D/3dmodel.model": `<model xmlns="${CORE}"><resources><object id="1"><mesh><vertices><vertex x="0" y="0" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>`,
        }),
      ),
    ).toThrow(/invalid vertices or triangles/)
  })

  it("reads the row-major 4 x 3 transform", () => {
    const point = new THREE.Vector3(1, 0, 0).applyMatrix4(
      parseTransform("0 1 0 -1 0 0 0 0 1 5 6 7"),
    )
    expect(point.toArray()).toEqual([5, 7, 7])
    expect(() => parseTransform("1 0 0")).toThrow()
  })
})
