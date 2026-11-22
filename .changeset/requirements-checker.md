---
"@charcuterie/ci": minor
---

Add `charcuterie-requirements`, a static checker for Gherkin requirements. It replaces `gherkin-lint`. It parses features with the same parser QuickPickle uses and reads step definitions from TypeScript source without running them. It fails on undefined, ambiguous, unused, and mis-keyworded steps, unused helpers, runner tags such as `@skip` and `@fails`, missing or reused requirement IDs, and a second `Examples` table. Its `requirements.lock.json` records the code behind every requirement, so a weakened assertion is reported as a requirement change. `which` traces a feature line to its definition and every file it reaches.
