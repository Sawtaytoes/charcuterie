# @charcuterie/model-viewer

## 0.3.0

### Minor Changes

- 703d2af: Replay sliced G-code with the print head. A manifest with a `replay` section names one or more plates (a `.gcode` or `.gcode.3mf`, the slicer label id of each object and its STL parts); staging analyses every move and the page plays the parts growing layer by layer, with the nozzle, the slicer's clearance cylinder and the X gantry. Each plate reports wrong-colour extrusions below and above a split height, the nozzle going below a printed top, and taller parts inside the clearance radius, plus print time, net filament and purge. `analyzeGcode` is exported for callers that want the analysis without the page.

## 0.2.0

### Minor Changes

- f30bb26: Add a shared Three.js viewer core, a standalone model-review page, and a local preview service for agent containers. Preserve assembly, section, artwork and visibility controls through reusable APIs and manifest-driven arrangements. Each preview runs independently and needs no host administrator credentials.

### Patch Changes

- 3f200c7: Assert the preview service's reported version against the package's own version instead of the literal `0.1.0`. The literal made every version bump a test failure, so the Version Packages pull request could never go green and the package could never be released.
- d8b928c: Make the separation slider reposition parts only. It called the full arrangement routine on every `input` event, which disposed and re-extracted every part's `EdgesGeometry`: 264 ms of blocking work per event on a 150 000 triangle review model, one event per pixel of a drag. A core pegged, the render loop starved, and the assembly appeared not to move. Edge geometry is now cached per geometry object through `createEdgeCache`, and the slider does arithmetic alone. Also draw only when something changed, instead of every frame forever, and disable the slider when the manifest has no `explode` vectors to act on.
