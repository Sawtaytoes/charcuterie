---
"@charcuterie/ci": patch
---

Resolve the shared Python and C++ lint's changed files from the original pull-request or push event, so a Forgejo pull request lints its own files instead of nothing, and diff from the merge base so files the base branch added later are not linted.
