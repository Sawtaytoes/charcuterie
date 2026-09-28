---
"@charcuterie/tokens": patch
---

`hover:` (and `group-hover:` / `peer-hover:`) now applies when any attached pointer can hover, not only the primary one. A Surface or other touchscreen laptop reports touch as primary, so Tailwind's default `(hover: hover)` gate switched every hover style off there even with a mouse or pen in use.
