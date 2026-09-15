---
"@charcuterie/model-viewer": patch
---

Assert the preview service's reported version against the package's own version instead of the literal `0.1.0`. The literal made every version bump a test failure, so the Version Packages pull request could never go green and the package could never be released.
