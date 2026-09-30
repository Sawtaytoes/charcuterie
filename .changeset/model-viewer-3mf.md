---
"@charcuterie/model-viewer": minor
---

Read 3MF files: `parse3MF` and `load3MF` return one mesh per printed object instance, in millimeters, following the `p:path` components that Bambu Studio and OrcaSlicer projects use for every object. Three's own `ThreeMFLoader` throws on those files.
