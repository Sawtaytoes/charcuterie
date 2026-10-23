---
"@charcuterie/ci": patch
---

Check the pinned pnpm version from the shared VRT tools' directory instead of the caller's checkout. pnpm 12 refuses to run in a project whose `packageManager` names another manager, so every Yarn caller's `vrt` job failed with `ERR_PNPM_OTHER_PM_EXPECTED` before it installed anything.
