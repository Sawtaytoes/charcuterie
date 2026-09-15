---
"@charcuterie/model-viewer": patch
---

Make the separation slider reposition parts only. It called the full arrangement routine on every `input` event, which disposed and re-extracted every part's `EdgesGeometry`: 264 ms of blocking work per event on a 150 000 triangle review model, one event per pixel of a drag. A core pegged, the render loop starved, and the assembly appeared not to move. Edge geometry is now cached per geometry object through `createEdgeCache`, and the slider does arithmetic alone. Also draw only when something changed, instead of every frame forever, and disable the slider when the manifest has no `explode` vectors to act on.
