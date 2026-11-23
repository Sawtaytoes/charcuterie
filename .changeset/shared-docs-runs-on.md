---
"@charcuterie/ci": patch
---

`shared-docs-only-changes.yml` and `shared-docs-lint.yml` take an optional `runsOn` input, a JSON list of runner labels. The default stays `["ubuntu-latest"]`, so current callers are unchanged. A repo with its own runner lane can now keep these jobs off the shared runner.
