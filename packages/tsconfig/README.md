# @charcuterie/tsconfig

Shared TypeScript compiler settings for the Charcuterie app fleet. One base preset
plus three variants, so every app inherits the same strict invariants instead of
copying a `tsconfig.base.json` that then drifts.

## Presets

| Subpath | Extends | For |
| --- | --- | --- |
| `@charcuterie/tsconfig/base` | — | The strict invariants (`strict`, `isolatedModules`, `esModuleInterop`, `skipLibCheck`, `target: ESNext`, …). Module system left to the variant. |
| `@charcuterie/tsconfig/app` | base | Bundler-resolved browser app (`lib: DOM`, `module: ESNext`, `moduleResolution: Bundler`, `noEmit`). |
| `@charcuterie/tsconfig/react` | app | Adds `jsx: react-jsx`. |
| `@charcuterie/tsconfig/node-lib` | base | An emitting Node library (`module: NodeNext`, `declaration`, `outDir: dist`, `rootDir: src`). |

The bare specifier `@charcuterie/tsconfig` resolves to `base`.

## Usage

```jsonc
// tsconfig.json — a React web app
{
  "extends": "@charcuterie/tsconfig/react",
  "compilerOptions": { "types": ["vite/client"] },
  "include": ["src"]
}
```

```jsonc
// tsconfig.json — a published Node library
{
  "extends": "@charcuterie/tsconfig/node-lib",
  "include": ["src"]
}
```

Each app still supplies its own `include`/`paths`/`types` — the 20% that is genuinely
per-app. Everything above the line comes from here and updates via Renovate.
