---
"@charcuterie/vitest-config": patch
---

Resolve the Playwright browser provider lazily, so a node-only suite can use the factory. `@vitest/browser-playwright` was a top-level `import`, which made the whole module unloadable for any consumer that does not run a browser suite — a `node:fs` mock harness, a contracts package, a server package. Those consumers could not so much as read their own config without installing a browser provider they never run, and the error named the provider rather than the cause: `Cannot find package '@vitest/browser-playwright' imported from @charcuterie/vitest-config/src/index.js`. Four fleet repos hit it the day 1.1.1 went out. The provider is now required only when the caller leaves browser mode on, so `browser: { enabled: false }` is a genuine opt-out and needs no extra dependency. Browser mode is unchanged and is still the default.
