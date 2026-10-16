---
"@charcuterie/ci": patch
---

Leave a first run's null baseline key out of the reg-suit config. reg-suit's placeholder expansion throws on a `null`, so every new repository's first `vrt` job failed with "Cannot convert undefined or null to object" before comparing anything.
