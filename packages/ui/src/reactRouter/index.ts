/**
 * `@charcuterie/ui/react-router` — the react-router adapter for the
 * link seam.
 *
 * **A subpath export with an optional peer dependency**, and both
 * halves of that matter. The base package must stay router-free: the
 * fleet runs react-router v8, react-router-dom v7, wouter-preact, two
 * hand-rolled routers, and five apps with no router at all, so a
 * `react-router` in `@charcuterie/ui`'s dependencies would be a
 * package eleven consumers install and six of them use. Optional
 * peer + separate entry point means an app that never imports this
 * path never resolves `react-router`, and `sourceRules.test.ts`
 * asserts exactly that — the main entry is measured for what it
 * reaches, so this cannot leak into it by accident.
 *
 * The wiring is one provider at the app root; `Guides/Routing` in
 * Storybook is the copy-pasteable version.
 *
 * ```tsx
 * import { RouterLinkProvider } from "@charcuterie/ui"
 * import { ReactRouterLink } from "@charcuterie/ui/react-router"
 *
 * <RouterLinkProvider link={ReactRouterLink}>
 *   <RouterProvider router={router} />
 * </RouterLinkProvider>
 * ```
 */

export { ReactRouterLink } from "./ReactRouterLink.tsx"
