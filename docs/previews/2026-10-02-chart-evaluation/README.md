# Four chart engines: reporting evaluation

Date: 2026-10-02. Isolated research in Charcuterie; no shipped package or app dependencies change. All identities and data are fictional.

[Interactive comparison](https://tally-reports-evaluation-9221.temp.t3code.octen.dev/) · [Static SVG/PNG samples](https://tally-reports-evaluation-9221.temp.t3code.octen.dev/static/)

The same daily rows use TanStack Charts 0.18.0, Airbnb visx XYChart 4.0.0, Nivo Bar 0.99.0, and the exact existing Charcuterie renderer. Candidates stack signed categories; ours groups bars. Toggle motion, change values, switch light/dark, show values, filter children, compare illustrative periods, and stress 7/30/90/366 days. Task/time examples stay fixed at seven days while chart ranges vary.

## Measured results

| Criterion | TanStack | visx | Nivo | Ours |
| --- | --- | --- | --- | --- |
| Added gzip JS over identical React harness | 55.9 KiB | 63.0 KiB | 88.5 KiB | 1.9 KiB |
| Mouse tooltip | Passed, shared day | Passed, shared day | Passed, shared day | SVG title only |
| Touch tooltip | Passed | Passed | No tooltip on tap | No |
| Keyboard | SVG focus + ArrowRight tooltip | No point navigation in example | Focusable SVG and labeled bars; no arrow navigation | No point navigation |
| Motion | Optional tween/spring | Animated series, React Spring | Configurable React Spring | None |
| Preact, no React bundled | Native adapter passed | Compatibility aliases passed | Compatibility aliases passed | Passed |
| Static SVG with bars | 28 bars | XYChart SSR shell only | 28 bars + clip rect | 28 bars |
| PNG rasterization of SVG | Passed | Empty shell | Passed | Passed |
| Phone/light/dark/366-row table | Passed | Passed | Passed | Passed |
| Tested JS errors | None | None | None | None |
| Chart license fee | $0, MIT | $0, MIT | $0, MIT | $0, existing code |

Standalone SVG exports normalize the XML namespace and explicit 640×280 dimensions; the verifier decodes each as an image, and PNG captures contain just the chart. React/static serialization alone is not sufficient evidence that an SVG file can be consumed as an image.

Exact results: `results.json`, `compatibility-results.json`, `static-results.json`, `extra-results.json`. Screenshots: `evidence/`. Exports are generated under ignored `dist/static/` and served above.

Production-minified esbuild bundles use identical React 19.2.8 and esbuild 0.28.1. React-only baseline: 60,339 gzip bytes. Measurements cover this chart's imports, including candidate interactions/motion, not whole packages. Nivo's catalog does not all ship automatically; additional imported chart types add code, with shared dependency reuse. Lazy-loading reports prevents charging the shopping page for chart code. Ours lacks feature parity: its tiny size does not include stacking, managed tooltips, keyboard navigation, touch, or motion.

Standalone navigation timings include devshare/network/browser variance and six samples. They are smoke evidence, not a chart-speed ranking. Large historical views should aggregate first; thousands of SVG marks become difficult to read even when rendering succeeds.

## Fit and engineering cost

**TanStack best matches one definition across React, Preact, and static exports.** A framework-independent scene drives the adapters. SVG/Canvas and motion have explicit import paths. We manually built signed stacks from barY marks. Main risk: alpha APIs; 0.x minor versions may break them. Pin exact versions, verify APIs against the installed package, and test upgrades.

**Nivo best serves finished chart variety and fast assembly.** Bar supplies stacks, axes, animation, configurable legends, and focusable bars. Its catalog includes line, scatter, heatmap, calendar, radar, sankey, and treemap, among others; SVG/Canvas availability varies by chart. Fixed size with animation off produced useful SSR. The additional 33 KiB over this TanStack example is modest. No subscription or optional HTTP chart service is required. Preact is a compatibility obligation, not its native public API; only this bar composition was tested. Touch and keyboard navigation still need wrapper work.

**visx best serves custom chart internals built from tested primitives.** XYChart combines focused D3/React utilities, data registration, scales, axes, series, tooltips, and motion. More assembly means more control and more accessibility work. In this composition series register after mounting, so direct SSR emitted no bars. CastKit needs explicit static primitives/scales or browser capture. This does not establish that every visx primitive fails SSR.

**Ours is reasonable for a deliberately small chart surface.** Existing React/Preact/static portability and minimal bytes are useful. Matching the requested experience means owning scales, signed stacks, tooltip placement, touch, focus, animation interruption, reduced motion, and regression tests. That maintenance cost matters more than current bundle size.

Engineering order, not timed estimates: Nivo needs the least assembly; TanStack needs a shared definition/adapter and upgrade policy; visx needs more assembly and a static path; ours needs the most new behavior to maintain. All options need shared tokens, readable dark mode, identity colors, labeling, and accessible values tables.

Recommendation: keep the Charcuterie Chart facade and app-owned calculations. Choose TanStack if native portability outweighs alpha risk, or Nivo if the finished catalog outweighs Preact compatibility work. Production adoption still needs a released Charcuterie component, adapter tests, and PNG delivery through CastKit's actual renderer. No candidate is adopted by this research change.

## API boundaries

Charts receive calculated data. They do not fetch it or own scoring, event/reversal interpretation, task identity, active-day statistics, or authorization. The app owns data, Charcuterie rendering, and CastKit display delivery.

```js
const definition = defineChart({
  marks: [barY(rows, { x: 'day', y1: 'bottom', y2: 'top', fill: childColor })],
  scales: { x: { scale: () => scaleBand().padding(0.2) }, y: { scale: scaleLinear } },
  tooltip: { use: tooltip, content: points => sharedDayContent(points[0].datum) },
})
```

React and native Preact consume Chart with this definition. Static output uses createChartScene then renderChartSvg. See `tanstack.jsx`, `static.jsx`, and `compatibility.mjs`. visx uses XYChart/BarStack/BarSeries/Tooltip (`visx.jsx`); Nivo uses fixed-size Bar, keys/indexBy/configuration (`nivo.jsx`). `ours.jsx` imports the existing portable renderer directly.

## Reproduce

From this directory:

```sh
npm ci
npm run build
node --input-type=module -e "import {build} from 'esbuild'; await build({entryPoints:['static.jsx'],outfile:'static-run.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'})"
node static-run.mjs
node compatibility.mjs
# Serve dist/; EVALUATION_URL overrides verify.mjs's public host.
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers npm run verify
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node verify-extra.mjs
```

Pinned Playwright 1.62.0's Chromium was installed in /tmp/pw-browsers, leaving the image's browser unchanged. `verify-extra.mjs` targets the public preview; adjust its URL for other deployments. The preview is staged outside its worktree, with a persistent start command, no expiration, and no session binding. Stop/restart and fetching the same URL passed.

Motion-off was tested. The demo initializes animation off for reduced motion. A production wrapper must also respond to preference changes and consistently honor them. Values tables remain necessary. This is not a complete accessibility audit, every-chart test, or actual CastKit integration test.

## Primary sources and provenance

- [TanStack alpha policy](https://tanstack.com/charts/latest/docs/stability), [export API](https://tanstack.com/charts/latest/docs/reference/rendering-and-export), [source/license](https://github.com/TanStack/charts), [founder profile](https://github.com/tannerlinsley) (Utah).
- [Airbnb visx XYChart](https://github.com/airbnb/visx/blob/master/packages/visx-xychart/README.md), [source/license](https://github.com/airbnb/visx), a US-origin Airbnb project.
- [Nivo features](https://nivo.rocks/about/), [catalog](https://nivo.rocks/components/), [source/license](https://github.com/plouc/nivo), [maintainer profile](https://github.com/plouc). GitHub's API lists Raphaël Benitte in Tokyo; this establishes stewardship, not nationality or every contributor's origin.

All three installed chart packages declare MIT. Preserve dependency notices when redistributing. Upstream provenance was checked before recommending an engine; no new production software was adopted.
