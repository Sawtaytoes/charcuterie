---
"@charcuterie/vitest-config": patch
"@charcuterie/vite-config": patch
"@charcuterie/playwright-config": patch
---

Ship TypeScript declarations for the factory functions so strict-TS apps can import them in `vitest.config.ts` / `vite.config.ts` / `playwright.config.ts` without an implicit-any (TS7016) error.
