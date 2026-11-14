---
"@charcuterie/ci": patch
---

Bound the shared VRT workflow's tool cache. The job's last step removes Playwright browsers that no installed package needs, and renews the pnpm store once it is 7 days old or over 4 GiB. Playwright's own browser cleanup is turned off for the job, because it ran after `git clean` and deleted the repo's browser, so a capture that installs its own browser downloaded it again on every run.
