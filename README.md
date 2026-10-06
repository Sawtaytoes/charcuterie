# Charcuterie

**[Browse the components and guides →](https://storybook.octen.dev/)**

Charcuterie is a collection of shared packages for building web apps. It provides design
tokens, accessible React components, state logic, server helpers, and common development
configuration.

Install only the packages that your app needs. Each package has its own README with its
exports and setup instructions.

## Packages

| Package | Purpose |
| --- | --- |
| [`@charcuterie/model-viewer`](packages/model-viewer/README.md) | Framework-independent 3D model reviews and agent previews |
| [`@charcuterie/ui`](packages/ui/README.md) | React components and app layout |
| [`@charcuterie/tokens`](packages/tokens/README.md) | Colours, typography, spacing, and generated CSS and JSON |
| [`@charcuterie/logic`](packages/logic/README.md) | Shared state logic with React and Preact bindings |
| [`@charcuterie/server`](packages/server/README.md) | Static-file serving, asset compression, MQTT, and HTTP helpers |
| [`@charcuterie/biome-config`](packages/biome-config/README.md) | Shared Biome configuration |
| [`@charcuterie/eslint-config`](packages/eslint-config/README.md) | Shared ESLint configuration |
| [`@charcuterie/tsconfig`](packages/tsconfig/README.md) | Shared TypeScript configuration |
| [`@charcuterie/vite-config`](packages/vite-config/README.md) | Shared Vite configuration |
| [`@charcuterie/vitest-config`](packages/vitest-config/README.md) | Shared Vitest configuration |
| [`@charcuterie/playwright-config`](packages/playwright-config/README.md) | Shared Playwright configuration |
| [`@charcuterie/storybook-config`](packages/storybook-config/README.md) | Shared Storybook configuration |

## Use Charcuterie in an app

Read [Building an app with Charcuterie](packages/docs/src/BuildingAnApp.mdx) for package
setup, component selection, app layout, and lint configuration.

Install a package with pnpm. For example:

```sh
pnpm add @charcuterie/ui
```

## Develop Charcuterie

The repository needs Node.js 24 or later and uses pnpm 12.9.1 (installed with `npm install --global --force pnpm@12.9.1`).

```sh
npm install --global --force pnpm@12.9.1
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Start the local component documentation with:

```sh
pnpm storybook
```

## Documentation

- [Component and package guide](packages/docs/src/BuildingAnApp.mdx)
- [Storybook maintenance](docs/how-we-do-storybook.md)
- [Package publishing](docs/npm-publishing.md)
- [Decision records](docs/decisions/README.md)

## Local build caching

`pnpm build` uses Turbo's local cache for the six package builds. Dependency builds run
first; hits restore `dist` and incremental compiler state. Source files, package manifests,
the lockfile, patches, the shared TypeScript configuration and Node version/OS/architecture
all participate in the key. CI persists downloaded packages and `.turbo` separately.
Storybook still builds these packages first. Browser tests, screenshots and external-state
gates always run; their results are not task-cached.

Use `pnpm build --force` to rebuild every package. Remote caching is disabled.
