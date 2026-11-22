---
"@charcuterie/ci": patch
---

The requirements checker now hashes a JSON file whose top-level key an `export *` supplies, and falls back to any other non-code file an `export *` names when nothing else supplies the name.
