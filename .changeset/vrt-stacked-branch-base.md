---
"@charcuterie/ci": patch
---

The VRT baseline preflight no longer fails when another branch is stacked on a pull request's branch. The Git plugin then picks the commit where the stacked branch forks off. That commit is on the pull request but not on the base branch. The selector now ignores it and uses the pull request's base, as it does when the plugin finds no branch point.
