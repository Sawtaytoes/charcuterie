# @charcuterie/model-viewer

A framework-independent Three.js viewer core, a standalone STL review page, and an agent
launcher. The same renderer, camera lifecycle and loader serve simple part previews and
application-specific assembly/artwork adapters. React and devshare are not dependencies of
the browser library. Three.js is pinned to 0.160.0, the existing preview runtime.

## Agent commands

```sh
model-viewer --title "Housing review" \
  'body.stl,label=Body,color=0x5b8ff9' \
  'lid.stl,label=Lid,offset=0;0;12,explode=0;30;0'
model-viewer --manifest models.json --name housing-review
model-viewer --manifest models.json --stage-only
model-viewer --manifest models.json --no-share
model-viewer --version
```

The default command copies only the supplied assets into a private staging directory, asks
the local service to start a worker, registers that worker with `devshare`, prints the URL,
and exits. The server survives the launcher. No SSH, Docker socket, host credentials, or
privileged mount is needed by the caller. `--shot file.png` additionally attempts a screenshot
using an installed Chromium; a screenshot failure does not stop the shared server.

`--stage-only` emits a self-contained static directory. `--no-share` serves it on loopback
in the foreground and does not need the service or devshare. Use another static web server
for an application embed or a permanent deployment.

## Manifest version 1

```json
{
  "schemaVersion": 1,
  "title": "Housing review",
  "note": "Fit has not been tested in a physical print.",
  "upAxis": "z",
  "models": [
    {"id": "body", "file": "body.stl", "label": "Body", "variants": {"section": "body-section.stl"}},
    {"id": "lid", "file": "lid.stl", "label": "Lid", "offset": [0, 0, 12], "explode": [0, 30, 0]}
  ],
  "directions": {"iso": [-1, 1.2, 1]},
  "views": {
    "inside": {"label": "Inside", "parts": {"lid": {"isVisible": false}}},
    "section": {
      "label": "Cross-section",
      "caption": "Actual section mesh; thickness enlarged five times.",
      "parts": {"body": {"geometry": "section", "scale": [1, 5, 1]}, "lid": {"isVisible": false}}
    },
    "exploded": {"label": "Separate parts", "parts": {"lid": {"position": [0, 30, 0]}}}
  }
}
```

File paths are relative to the manifest (absolute paths also work). `file`, `variants` and
`texture` are copied; remote URLs are not fetched by the launcher. Use a manifest for paths
or labels containing commas. The legacy comma-separated STL argument format remains
supported. Dimensions are millimetres; STL itself does not carry a unit.

`offset` is applied in the source model's axes before the Z-up to Y-up conversion. `upAxis`
is `z` by default; use `y` for already upright inputs. Arrangement `position`, `rotation`
(radians), `scale` and `explode` are in **display Y-up coordinates**. The separation slider
multiplies `explode`; it does not refit while dragged. Each named arrangement starts from
the initial part visibility. Toggle individual parts without moving the camera. A named
view or Fit intentionally reframes. `?view=inside` selects a named view; `queryViews` maps
legacy query pairs such as `"inside=1": "inside"` to named views.

A part's optional `texture` is projected in its source XY plane. Plain relief removes the
texture. That texture represents artwork, not a calibrated prediction of printed filament.
Procedural geometry and more specialized material/colour rules use the core API below.
The package does not generate or validate printable CAD. It reads sliced G-code only for the
replay below.

## G-code replay

A manifest with a `replay` section (and no `models`) stages a different page: the parts of a
sliced plate growing move by move, with the print head drawn at every moment.

```json
{
  "schemaVersion": 1,
  "title": "Two cups, split colors",
  "replay": {
    "printer": {"bed": [256, 256], "envelopeRadius": 68, "gantryHeight": 34},
    "plates": [{
      "key": "a",
      "title": "Plate A",
      "gcode": "plate-a.gcode.3mf",
      "plate": 1,
      "topTool": 4,
      "splitZ": 12.2,
      "toolNames": ["Red", "Blue", "Orange", "Purple", "Charcoal"],
      "phases": [{"line": 1, "label": "Bottoms, one part at a time"}, {"line": 452369, "label": "Shared top"}],
      "objects": {
        "8": {"name": "Left cup", "bottomTool": 0,
              "parts": [{"file": "left-lower.stl", "color": "#D04040"}, {"file": "left-upper.stl", "color": "#303030"}]}
      }
    }]
  }
}
```

`gcode` is a plain `.gcode` or a sliced `.gcode.3mf` (`plate` picks `Metadata/plate_N.gcode`,
default 1). Object keys are the slicer's label ids (`; start printing object, unique label id:
N`). Staging refuses an id the G-code never prints. Every part of one object shares one
coordinate frame and must be in print orientation. The page centres their union on the
object's printed centre and cuts each part at the object's printed height at that moment, so
a plate split by height replays exactly and any other plate is a straight-cut approximation.
Rotation is not read from the G-code. `printer` defaults to the Bambu X1 series:
`envelopeRadius` is the slicer's `extruder_clearance_max_radius` and `gantryHeight` its
`extruder_clearance_height_to_rod`.

Staging analyses the whole file once in Node (`analyzeGcode`, a few seconds for a 25 MB
plate) and the page loads only the sampled timeline. Every move is replayed, arcs as chords:

- **Colour**, only when `topTool` and `splitZ` are both set: every extrusion inside an object
  uses its `bottomTool` below `splitZ` and `topTool` from it upward.
- **Tip collisions**: the nozzle tip goes below the top of another object already printed.
  Travel exactly at the height of a layer just printed is normal and is not counted.
- **Envelope intrusions**: an object taller than the tip is inside `envelopeRadius`. This is
  the slicer's collision model, not toolhead CAD. Footprints are circles around each
  object's own extrusions, which is exact for round parts and generous for square ones.
- **Totals**: minutes from `M73 P0 R`, grams from **net** extrusion with the header's
  `filament_density` (the start G-code's `G0 … E` prime line counts), and purge as the
  extrusion between `M620 S` and `M621 S`.

`?plate=a` opens a plate, `?at=0.4` a moment (a fraction of the print), and `?clean` renders
only the finished parts for a `.3mf` thumbnail. `window.__replay` exposes `isReady`,
`plate`, `index`, `objects`, `envelope`, `setSample(index)` and `show(plate)`.

## Browser API

```js
import { createViewer, loadSTL, addEdges, fitBounds, THREE } from '@charcuterie/model-viewer'
const viewer = createViewer(document.querySelector('#stage'))
viewer.scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2))
const mesh = new THREE.Mesh(await loadSTL('/body.stl'), new THREE.MeshStandardMaterial())
mesh.geometry.rotateX(-Math.PI / 2)
viewer.group.add(mesh)
addEdges(mesh)
fitBounds(viewer.camera, viewer.controls, new THREE.Box3().setFromObject(viewer.group))
// On component unmount:
viewer.dispose()
```

Exports: `createViewer`, `loadSTL`, `parseSTL`, `addEdges`, `fitBounds`, `disposeObject`,
`analyzeGcode`, `objectFootprints`, `readHeader`, `THREE`, `VERSION`. `src/index.d.ts` declares the API. `createViewer` owns renderer,
scene, camera, orbit controls, animation and resize/disposal. Existing adapters can set
`isAutoResize: false` and `isAnimating: false` while preserving their own lighting,
arrangement-specific framing and render loops. Mounting a viewer has no global stylesheet
or document-wide handler. The standalone page exposes `window.__viewer` after all requested
meshes load; `isReady`, `version`, `parts`, `view`, and `fit` support browser verification.
A failed asset or empty STL is an error, not a successful partial review.

## Local service and installation

The container runtime starts `model-viewer daemon` once as the normal agent user. It owns a
private Unix socket (`$MODEL_VIEWER_SOCKET`, default `$MODEL_VIEWER_ROOT/service.sock`).
The default root is `/tmp/model-viewer-<uid>`, created mode 0700; the socket is mode 0600.
Only directories below that root can be registered. Each preview gets a separate child
process and loopback port. `devshare rm` may stop that child without stopping siblings or
the supervisor. File serving refuses traversal, symlink escapes, writes and directory
listings. The daemon never reads a host credential.

The service must be started by the container runtime, not by `nohup` or a detached child
of an agent command. The runtime also stops it on shutdown. Preview processes and temporary
staging do not survive a container recreation. Existing devshare session/TTL cleanup remains
responsible for removing share URLs; shared previews otherwise remain until explicitly stopped.

`node build.js` produces `dist/`: the compiled core, standalone page, pinned Three.js,
its license, and `version.json`. Distribution snapshots are self-contained and record their
version; updating the installed tool never changes an already staged review.

The first release is a versioned container artifact, not an npm registry publication.
`release.sh OUTPUT.tar.gz` builds an installable archive from a clean committed checkout.
The archive contains `model-viewer/` with the runtime, CLI, package metadata and licenses;
extract it under `/opt`, then link `/usr/local/bin/model-viewer` to
`/opt/model-viewer/src/cli.js`. Container builds must pin and verify the archive SHA-256.
The npm-compatible package/API can also be consumed from a Yarn-packed tarball. npm first
publication and trusted-publisher setup are independent of using this release.
