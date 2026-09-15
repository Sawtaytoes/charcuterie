# @charcuterie/model-viewer

## 0.2.0

### Minor Changes

- f30bb26: Add a shared Three.js viewer core, a standalone model-review page, and a local preview service for agent containers. Preserve assembly, section, artwork and visibility controls through reusable APIs and manifest-driven arrangements. Each preview runs independently and needs no host administrator credentials.

### Patch Changes

- 3f200c7: Assert the preview service's reported version against the package's own version instead of the literal `0.1.0`. The literal made every version bump a test failure, so the Version Packages pull request could never go green and the package could never be released.
- d8b928c: Make the separation slider reposition parts only. It called the full arrangement routine on every `input` event, which disposed and re-extracted every part's `EdgesGeometry`: 264 ms of blocking work per event on a 150 000 triangle review model, one event per pixel of a drag. A core pegged, the render loop starved, and the assembly appeared not to move. Edge geometry is now cached per geometry object through `createEdgeCache`, and the slider does arithmetic alone. Also draw only when something changed, instead of every frame forever, and disable the slider when the manifest has no `explode` vectors to act on.
