---
"@charcuterie/ci": patch
---

The requirements checker reports malformed JSON, a workspace `package.json` included, as `malformed-json` instead of crashing. It reads JSON files that start with a byte-order mark, as Vite does. A re-export chain past eight hops that ends in a CSS `export *` now fails as `reexport-too-deep`.
