# @charcuterie/vite-config

A shared Vite config **factory** for the Charcuterie fleet. Ships the build/server
defaults every app wants and leaves plugins to the caller, so one preset serves a React
SPA, an Electron renderer, and a library build.

## Usage

```ts
// vite.config.ts
import { createViteConfig } from "@charcuterie/vite-config"
import react from "@vitejs/plugin-react"

export default createViteConfig({
  plugins: [react()],
  build: { outDir: "dist/web" },
})
```

Overrides are **deep-merged** over the base via Vite's own `mergeConfig`. Apps with
multiple targets (e.g. image-viewer's Electron main/preload/renderer) call it once per
target with different overrides.

`vite` is a peer dependency — the app owns the Vite version; Renovate bumps this
package's range fleet-wide when the shared defaults change.
