---
"@charcuterie/model-viewer": minor
---

Replay sliced G-code with the print head. A manifest with a `replay` section names one or more plates (a `.gcode` or `.gcode.3mf`, the slicer label id of each object and its STL parts); staging analyses every move and the page plays the parts growing layer by layer, with the nozzle, the slicer's clearance cylinder and the X gantry. Each plate reports wrong-colour extrusions below and above a split height, the nozzle going below a printed top, and taller parts inside the clearance radius, plus print time, net filament and purge. `analyzeGcode` is exported for callers that want the analysis without the page.
