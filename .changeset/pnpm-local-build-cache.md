---
"@charcuterie/ci": patch
---

Install shared visual-regression tools with a frozen pnpm lockfile and retain automatic
pnpm, Yarn and npm setup for caller repositories during migration.

Cancel superseded pull-request verification and shared visual-regression runs while
retaining main/manual publications. Queue the library's main baselines and Docker
image publications sequentially without replacing pending runs.
