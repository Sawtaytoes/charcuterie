---
"@charcuterie/ci": patch
---

Prune the shared VRT workflow's tool cache. The job's last step removes pnpm packages and Playwright browsers that this job does not use, at most once a day or at once over 5 GiB. Playwright's own browser cleanup is turned off for the job, because it ran after `git clean` and deleted the repo's browser, so a capture that installs its own browser downloaded it again on every run.
