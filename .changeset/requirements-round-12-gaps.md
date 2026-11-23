---
"@charcuterie/ci": patch
---

The requirements checker reports three cases it used to miss. A `package.json` that is valid JSON but not an object, such as `null`, is reported as `malformed-json` instead of crashing the checker. Malformed JSON that an `export *` reaches is reported by path. Two `export *` lines that supply one name from different declarations are reported as `ambiguous-export`, because JavaScript then exports neither.
