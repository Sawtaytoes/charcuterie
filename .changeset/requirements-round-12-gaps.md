---
"@charcuterie/ci": patch
---

The requirements checker reports a `package.json` that is valid JSON but not an object, such as `null`, as `malformed-json` instead of crashing. It reports malformed JSON that any `export *` names, even when the name is found first. A local `export { type name }`, or an `export { name }` of an interface or a type alias, no longer hides the runtime value that an `export *` in the same file supplies. The lock missed that value's code before.
