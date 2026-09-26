/**
 * The G-code replay page. `stagePreview` has already analysed every plate into
 * replay.json; this draws it. Everything printer-side lives in one group in
 * printer coordinates (X right, Y back, Z up) and the group is turned so the
 * viewer's Y-up camera and orbit controls work unchanged. Printer Z is then world
 * Y, which is what the per-part clipping planes cut along.
 */
import {
  createViewer,
  fitBounds,
  loadSTL,
  THREE,
  VERSION,
} from "./index.js"

const element = document.getElementById("app")
const query = new URLSearchParams(location.search)
const isClean = query.has("clean")
if (isClean) document.body.classList.add("clean")
const viewer = createViewer(element, {
  isAnimating: false,
  renderer: { preserveDrawingBuffer: isClean },
})
const { renderer, scene, camera, controls, group } = viewer
renderer.localClippingEnabled = true
group.rotation.x = -Math.PI / 2
let isDirty = true
const invalidate = () => {
  isDirty = true
}
const fail = (error) => {
  const alert = document.getElementById("err")
  alert.textContent = error.message
  alert.style.display = "block"
  console.error(error)
}
const make = (tag, properties = {}, children = []) => {
  const node = Object.assign(
    document.createElement(tag),
    properties,
  )
  node.append(...children)
  return node
}
const swatch = (colour) =>
  make("i", {
    className: "swatch",
    style: `background:${colour}`,
  })
const row = (label, value, className = "") =>
  make("div", { className: "row" }, [
    make("span", {}, [label]),
    make("span", { className }, [value]),
  ])
const clock = (minutes) =>
  minutes === null || minutes === undefined
    ? "unknown"
    : `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`
/** Near-black filament disappears against the page, so draw it as grey. */
const visible = (colour) => {
  const value = new THREE.Color(colour.slice(0, 7))
  return value.getHSL({}).l < 0.12
    ? new THREE.Color(0x555a63)
    : value
}

let replay
let plate
let objects = []
let index = 0
let isPlaying = false
let speed = 1
const geometries = new Map()
const loadPart = (file) => {
  if (!geometries.has(file))
    geometries.set(file, loadSTL(file))
  return geometries.get(file)
}

try {
  const response = await fetch("replay.json")
  if (!response.ok)
    throw new Error(
      `Cannot load replay.json: HTTP ${response.status}`,
    )
  replay = await response.json()
  if (replay.schemaVersion !== 1)
    throw new Error("Unsupported replay version")
  const { bed, envelopeRadius, gantryHeight } =
    replay.printer
  document.title = replay.title
  document.getElementById("title").textContent =
    replay.title
  document.getElementById("note").textContent =
    `${replay.note ? `${replay.note} · ` : ""}Viewer ${VERSION}`
  scene.background = new THREE.Color(0x101318)
  scene.add(
    new THREE.HemisphereLight(0xffffff, 0x333340, 1.5),
  )
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(-0.4, 1, 0.6)
  scene.add(sun)

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(bed[0], bed[1]),
    new THREE.MeshStandardMaterial({
      color: 0x22272f,
      roughness: 0.9,
    }),
  )
  plane.position.set(bed[0] / 2, bed[1] / 2, -0.01)
  group.add(plane)
  const grid = new THREE.GridHelper(
    Math.max(...bed),
    16,
    0x3a414d,
    0x2a303a,
  )
  grid.rotation.x = Math.PI / 2
  grid.position.set(bed[0] / 2, bed[1] / 2, 0)
  group.add(grid)

  const head = new THREE.Group()
  group.add(head)
  const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd24a,
    metalness: 0.4,
    roughness: 0.4,
  })
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(3, 8, 24),
    nozzleMaterial,
  )
  nozzle.rotation.x = -Math.PI / 2
  nozzle.position.z = 4
  head.add(nozzle)
  const envelopeMaterial = new THREE.MeshBasicMaterial({
    color: 0x6c8cff,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const envelope = new THREE.Mesh(
    new THREE.CylinderGeometry(
      envelopeRadius,
      envelopeRadius,
      gantryHeight,
      64,
      1,
      true,
    ),
    envelopeMaterial,
  )
  envelope.rotation.x = Math.PI / 2
  envelope.position.z = gantryHeight / 2
  head.add(envelope)
  head.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 96 }, (_, step) => {
          const angle = (step / 96) * 2 * Math.PI
          return new THREE.Vector3(
            Math.cos(angle) * envelopeRadius,
            Math.sin(angle) * envelopeRadius,
            0.3,
          )
        }),
      ),
      new THREE.LineBasicMaterial({ color: 0x8fa6ff }),
    ),
  )
  const gantry = new THREE.Mesh(
    new THREE.BoxGeometry(bed[0] + 70, 10, 6),
    new THREE.MeshStandardMaterial({
      color: 0x9aa0aa,
      metalness: 0.6,
      roughness: 0.3,
    }),
  )
  group.add(gantry)
  const trailGeometry = new THREE.BufferGeometry()
  const trail = new THREE.Line(
    trailGeometry,
    new THREE.LineBasicMaterial({
      color: 0xffd24a,
      transparent: true,
      opacity: 0.5,
    }),
  )
  group.add(trail)
  for (const item of [head, gantry, trail, grid])
    item.visible = !isClean

  const scrub = document.getElementById("scrub")
  const toolOf = (slot) =>
    plate.tools[slot] ?? {
      colour: "#888888",
      name: `Slot ${slot === null ? "?" : slot + 1}`,
    }

  const setSample = (next) => {
    index = Math.max(
      0,
      Math.min(plate.samples.length - 1, next),
    )
    scrub.value = String(index)
    const [line, x, y, z, slot, label, heights, elapsed] =
      plate.samples[index]
    objects.forEach((object, column) => {
      // World Y is printer Z once the group is turned.
      object.clip.constant = heights[column] + 0.001
    })
    head.position.set(x, y, z)
    gantry.position.set(bed[0] / 2, y, z + gantryHeight + 3)
    const tool = toolOf(slot)
    nozzleMaterial.color.copy(visible(tool.colour))
    let nearest = Number.POSITIVE_INFINITY
    let nearestObject = null
    objects.forEach((object, column) => {
      if (object.id === label) return
      if (heights[column] <= z + 0.05) return
      const edge =
        Math.hypot(
          x - object.centre[0],
          y - object.centre[1],
        ) - object.radius
      if (edge < nearest) {
        nearest = edge
        nearestObject = object
      }
    })
    const isInside = nearest < envelopeRadius
    envelopeMaterial.color.set(
      isInside ? 0xff4a4a : 0x6c8cff,
    )
    trailGeometry.setFromPoints(
      plate.samples
        .slice(Math.max(0, index - 25), index + 1)
        .map(
          (sample) =>
            new THREE.Vector3(
              sample[1],
              sample[2],
              sample[3],
            ),
        ),
    )
    const phase = plate.phases
      .filter((entry) => line >= entry.line)
      .at(-1)
    const printing = objects.find(
      (object) => object.id === label,
    )
    const tallest = Math.max(0, ...heights)
    document.getElementById("clock").textContent =
      `${clock(elapsed)} of ${clock(plate.totals.minutes)}`
    const now = document.getElementById("now")
    now.replaceChildren(
      make("h2", {}, ["At this moment"]),
      ...(plate.phases.length
        ? [row("Phase", phase ? phase.label : "Start")]
        : []),
      row("G-code line", String(line)),
      row("Nozzle Z", `${z.toFixed(2)} mm`),
      make("div", { className: "row" }, [
        make("span", {}, ["Filament loaded"]),
        make("span", {}, [swatch(tool.colour), tool.name]),
      ]),
      row("Printing", printing ? printing.name : "moving"),
      row(
        "Nearest taller part",
        nearestObject
          ? `${nearest.toFixed(1)} mm (${nearestObject.name})`
          : "none",
        isInside ? "bad" : "good",
      ),
      row(
        "Gantry above tallest part",
        `${(z + gantryHeight - tallest).toFixed(1)} mm`,
        z + gantryHeight - tallest < 0 ? "bad" : "good",
      ),
      ...objects.map((object, column) =>
        make("div", { className: "row" }, [
          make("span", {}, [
            swatch(object.parts[0].css),
            object.name,
          ]),
          make("span", {}, [
            `${heights[column].toFixed(1)} mm`,
          ]),
        ]),
      ),
    )
    invalidate()
  }

  const count = (value) =>
    value === 0
      ? make("span", { className: "good" }, ["0"])
      : make("span", { className: "bad" }, [String(value)])
  const showChecks = () => {
    const { checks, totals, changes } = plate
    document
      .getElementById("checks")
      .replaceChildren(
        make("h2", {}, ["Checks for the whole file"]),
        make("div", { className: "row" }, [
          make("span", {}, ["Wrong-color extrusions"]),
          checks.colourErrors === null
            ? make("span", {}, ["not checked"])
            : count(checks.colourErrors),
        ]),
        make("div", { className: "row" }, [
          make("span", {}, ["Nozzle below a printed top"]),
          count(checks.tipCollisions),
        ]),
        make("div", { className: "row" }, [
          make("span", {}, [
            `Taller part inside ${checks.envelopeRadius} mm`,
          ]),
          count(checks.envelopeIntrusions),
        ]),
        row(
          "Closest taller part",
          checks.closestTallerEdge === null
            ? "never taller"
            : `${checks.closestTallerEdge.toFixed(1)} mm`,
        ),
        row("Print time", clock(totals.minutes)),
        row(
          "Filament",
          `${totals.totalGrams.toFixed(1)} g`,
        ),
        row("Purge", `${totals.purgeGrams.toFixed(2)} g`),
      )
    document.getElementById("changes").replaceChildren(
      make("h2", {}, [
        `Filament changes: ${changes.length}`,
      ]),
      ...changes.map((change) => {
        const from = toolOf(change.from)
        const to = toolOf(change.to)
        return make("div", { className: "row" }, [
          make("span", {}, [
            swatch(from.colour),
            from.name,
          ]),
          make("span", {}, [
            "to ",
            swatch(to.colour),
            to.name,
          ]),
        ])
      }),
    )
  }

  // `direction` keeps the reader's orbit when the window resizes.
  const frameCamera = (direction) => {
    const box = new THREE.Box3()
    if (isClean)
      for (const object of objects)
        box.union(
          new THREE.Box3().setFromObject(object.group),
        )
    else box.setFromObject(plane).expandByScalar(10)
    // Front and above the bed: printer -Y is world +Z.
    fitBounds(
      camera,
      controls,
      box,
      direction ?? (isClean ? [0, 1.1, 1] : [0, 1.25, 1]),
      // A sphere fit is loose around a flat bed, so pull in closer than fitBounds would.
      isClean ? 0.78 : 0.7,
    )
    invalidate()
  }

  const show = async (next) => {
    plate = next
    for (const object of objects) group.remove(object.group)
    objects = []
    for (const object of plate.objects) {
      const holder = new THREE.Group()
      holder.position.set(
        object.centre[0],
        object.centre[1],
        0,
      )
      group.add(holder)
      const clip = new THREE.Plane(
        new THREE.Vector3(0, -1, 0),
        0,
      )
      const loaded = await Promise.all(
        object.parts.map((part) => loadPart(part.file)),
      )
      // Every part of one object shares a frame: centre the union on the
      // printed centre and stand it on the bed.
      const box = new THREE.Box3()
      for (const geometry of loaded)
        box.union(geometry.boundingBox)
      const shift = new THREE.Vector3(
        -(box.min.x + box.max.x) / 2,
        -(box.min.y + box.max.y) / 2,
        -box.min.z,
      )
      const parts = []
      for (const [column, part] of object.parts.entries()) {
        const geometry = loaded[column].clone()
        geometry.translate(shift.x, shift.y, shift.z)
        const colour = new THREE.Color(
          part.color ?? 0x9aa7b8,
        )
        holder.add(
          new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
              color: colour,
              roughness: 0.75,
              clippingPlanes: [clip],
              side: THREE.DoubleSide,
            }),
          ),
        )
        const ghost = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.05,
            depthWrite: false,
          }),
        )
        ghost.visible = !isClean
        holder.add(ghost)
        parts.push({
          ...part,
          css: `#${colour.getHexString()}`,
        })
      }
      objects.push({
        ...object,
        parts,
        group: holder,
        clip,
      })
    }
    for (const button of document.querySelectorAll(
      "#plates button",
    ))
      button.ariaPressed = String(
        button.dataset.key === plate.key,
      )
    scrub.max = String(plate.samples.length - 1)
    showChecks()
    setSample(0)
    frameCamera()
  }

  const bar = document.getElementById("plates")
  for (const entry of replay.plates) {
    const button = make("button", {
      type: "button",
      textContent: entry.title,
    })
    button.dataset.key = entry.key
    button.onclick = () => show(entry).catch(fail)
    bar.append(button)
  }
  document
    .getElementById("plates-table")
    .replaceChildren(
      make("tr", {}, [
        make("th", {}, ["Plate"]),
        make("th", {}, ["Time"]),
        make("th", {}, ["Filament"]),
        make("th", {}, ["Purge"]),
        make("th", {}, ["Changes"]),
      ]),
      ...replay.plates.map((entry) =>
        make("tr", {}, [
          make("td", {}, [entry.title]),
          make("td", {}, [clock(entry.totals.minutes)]),
          make("td", {}, [
            `${entry.totals.totalGrams.toFixed(1)} g`,
          ]),
          make("td", {}, [
            `${entry.totals.purgeGrams.toFixed(2)} g`,
          ]),
          make("td", {}, [String(entry.changes.length)]),
        ]),
      ),
    )
  scrub.oninput = () => setSample(Number(scrub.value))
  const play = document.getElementById("play")
  play.onclick = () => {
    isPlaying = !isPlaying
    play.ariaPressed = String(isPlaying)
    play.textContent = isPlaying ? "Pause" : "Play"
  }
  const speeds = [1, 3, 10]
  const speedButton = document.getElementById("speed")
  speedButton.onclick = () => {
    speed =
      speeds[(speeds.indexOf(speed) + 1) % speeds.length]
    speedButton.textContent = `Speed ${speed}x`
  }
  controls.addEventListener("change", invalidate)
  const observer = new ResizeObserver(() => {
    viewer.resize()
    // Before the first fit the camera sits on its target: no direction yet.
    const offset = camera.position
      .clone()
      .sub(controls.target)
    frameCamera(offset.lengthSq() > 0 ? offset : undefined)
  })
  observer.observe(element)
  viewer.resize()

  await show(
    replay.plates.find(
      (entry) => entry.key === query.get("plate"),
    ) ?? replay.plates[0],
  )
  // A thumbnail shows the finished parts unless it asks for a moment.
  const at = query.has("at")
    ? Number(query.get("at"))
    : isClean
      ? 1
      : 0
  if (at)
    setSample(Math.round(at * (plate.samples.length - 1)))
  let last = 0
  renderer.setAnimationLoop((time) => {
    if (isPlaying && time - last > 30) {
      last = time
      setSample(index + speed)
      if (index === plate.samples.length - 1) play.click()
    }
    if (!isDirty) return
    isDirty = false
    viewer.render()
  })
  window.__replay = {
    ...viewer,
    THREE,
    get plate() {
      return plate
    },
    get index() {
      return index
    },
    get objects() {
      return objects
    },
    envelope,
    setSample,
    show,
    version: VERSION,
    isReady: true,
  }
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
