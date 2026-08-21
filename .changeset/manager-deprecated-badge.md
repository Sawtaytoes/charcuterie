---
"@charcuterie/storybook-config": minor
---

New `@charcuterie/storybook-config/manager` export: `charcuterieManagerConfig`, which draws a
`deprecated` badge in the sidebar next to any component whose story meta carries
`tags: ["deprecated"]`.

```ts
// .storybook/manager.ts
import { addons } from "storybook/manager-api"
import { charcuterieManagerConfig } from "@charcuterie/storybook-config/manager"

addons.setConfig(charcuterieManagerConfig)
```

A badge in place rather than a `Deprecated/` folder: somebody scanning `Controls` for a
picker never opens `Deprecated/`, so a section hides the warning from the one reader who
needs it. The manager composes a component entry's tags as the **intersection** of its
children's, so the tag on a meta marks the component node itself and never leaks up to its
group.

`renderSidebarLabel` uses `createElement` rather than JSX on purpose — the manager bundle
maps `react` to its own global but **not `react/jsx-runtime`**, so a `.tsx` compiled with the
automatic runtime pulls a second React into the manager and the sidebar dies with React error
#31.
