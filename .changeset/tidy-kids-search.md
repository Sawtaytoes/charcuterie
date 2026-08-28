---
"@charcuterie/server": patch
---

Let static handlers initialise before their Vite output exists. Deployment marker routes now fall through until `index.html` is available.
