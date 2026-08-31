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

Install a package with Yarn. For example:

```sh
yarn add @charcuterie/ui
```

## Develop Charcuterie

The repository needs Node.js 24 or later and uses the committed Yarn release.

```sh
yarn install --immutable
yarn build
yarn test
yarn typecheck
yarn lint
```

Start the local component documentation with:

```sh
yarn storybook
```

## Documentation

- [Component and package guide](packages/docs/src/BuildingAnApp.mdx)
- [Storybook maintenance](docs/how-we-do-storybook.md)
- [Package publishing](docs/npm-publishing.md)
- [Decision records](docs/decisions/README.md)
