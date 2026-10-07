---
"@charcuterie/ci": patch
---

Keep VRT baselines on the branch a change lands on — a pull request's base branch, else the pushed branch, else the default — so pull requests into a long-lived non-default branch reach the comparison again, and read a first-parent history over 25,600 commits without `spawnSync git ENOBUFS`.
