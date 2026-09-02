import type { ReactNode } from "react"
import { useLocation } from "react-router"

import { ScrollMemoryProvider } from "../Main/ScrollMemoryProvider.tsx"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import { ReactRouterLink } from "./ReactRouterLink.tsx"

export type ReactRouterAdapterProps = {
  children?: ReactNode
}

/**
 * Every seam this library has, wired to react-router, in one
 * component at the app root.
 *
 * ```tsx
 * <BrowserRouter>
 *   <ReactRouterAdapter>
 *     <Routes>…</Routes>
 *   </ReactRouterAdapter>
 * </BrowserRouter>
 * ```
 *
 * It must sit **inside** the router, because it reads
 * `useLocation()`, and **outside** the routes, because what it
 * provides belongs to the whole app.
 *
 * ## Why one component and not two providers
 *
 * There are two seams today — the link seam and the scroll memory —
 * and the fleet proved that a per-app opt-in does not reach the
 * fleet. `Main`'s scroll memory shipped as a `scrollKey` prop, one
 * app wired it, and the other three kept losing the reader's place
 * with the library sitting right there supporting it. A seam an app
 * has to know about is a seam most apps will not have.
 *
 * So the root wiring is one name to remember, and a seam added later
 * arrives in every app that already renders this on its next
 * release. `RouterLinkProvider`, `ReactRouterLink` and
 * `ScrollMemoryProvider` all stay exported for an app that wants one
 * half, or that renders its own root for another reason.
 *
 * ## What it does NOT do
 *
 * It does not render a router, and it takes no route table. This
 * library has no opinion about either, and an app that wants
 * `createBrowserRouter` should keep it.
 */
export const ReactRouterAdapter = ({
  children,
}: ReactRouterAdapterProps): ReactNode => {
  const location = useLocation()

  return (
    <RouterLinkProvider link={ReactRouterLink}>
      <ScrollMemoryProvider
        entry={{
          key: location.key,
          path: location.pathname,
        }}
      >
        {children}
      </ScrollMemoryProvider>
    </RouterLinkProvider>
  )
}
