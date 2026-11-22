---
"@charcuterie/ci": patch
---

The requirements checker now follows a named re-export ahead of an `export *`, ignores
`export declare`, reports a re-export chain deeper than eight files, rejects a directory
import whose directory has a `package.json`, and requires each step definition's code to be
an inline function.
