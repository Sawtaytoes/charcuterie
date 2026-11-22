---
"@charcuterie/ci": patch
---

The requirements checker reports malformed JSON as `malformed-json` instead of crashing, and a re-export chain that ends in a CSS `export *` past eight hops now fails as `reexport-too-deep`.
