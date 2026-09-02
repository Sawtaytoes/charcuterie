import type { Meta, StoryObj } from "@storybook/react"
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router"

import { Button } from "../Button/Button.tsx"
import { Card } from "../Card/Card.tsx"
import { Header } from "../Header/Header.tsx"
import { Main } from "../Main/Main.tsx"
import { Shell } from "../Shell/Shell.tsx"
import { TextLink } from "../TextLink/TextLink.tsx"
import { ReactRouterAdapter } from "./ReactRouterAdapter.tsx"

/**
 * The one component an app on react-router renders at its root.
 *
 * `Main.stories.tsx` proves the scroll memory against a hand-rolled
 * history stack, which is the right subject for the mechanism. This
 * one proves the **wiring**: a real router, a real `useLocation()`,
 * and both seams arriving from one component — the piece that ships
 * broken silently, because a page whose links still work and whose
 * list still scrolls looks fine.
 *
 * `MemoryRouter` rather than `BrowserRouter`, so the story does not
 * write to the Storybook page's own history.
 */
const meta = {
  component: ReactRouterAdapter,
  parameters: {
    layout: "fullscreen",
  },
  title: "Components/Layout/ReactRouterAdapter",
} satisfies Meta<typeof ReactRouterAdapter>

export default meta

type Story = StoryObj<typeof meta>

const EPISODE_TITLES = Array.from(
  { length: 40 },
  (_unused, index) => `Episode ${index + 1}`,
)

const BackControl = () => {
  const navigate = useNavigate()

  return (
    <Button
      appearance="outline"
      onClick={() => {
        void navigate(-1)
      }}
      size="sm"
    >
      Back
    </Button>
  )
}

const EpisodeList = () => (
  <Main>
    <div className="flex flex-col gap-3">
      {EPISODE_TITLES.map((title) => (
        <Card heading={title} key={title} padding="sm">
          <TextLink href={`/library/${title}`}>
            Open {title}
          </TextLink>
        </Card>
      ))}
    </div>
  </Main>
)

const EpisodePage = () => (
  <Main>
    <Card heading="Episode">
      <p className="text-content-secondary text-sm">
        Short enough that the scrollport collapses behind
        it. Press Back.
      </p>
    </Card>
  </Main>
)

/**
 * Scroll the list, press a link, then press Back.
 *
 * Nothing on this page is told about scrolling or about the router.
 * `TextLink` becomes a soft navigation and `Main` keeps the
 * reader's place because `ReactRouterAdapter` is above them both.
 */
export const Default: Story = {
  render: () => (
    <MemoryRouter initialEntries={["/library"]}>
      <ReactRouterAdapter>
        <Shell>
          <Header
            actions={<BackControl />}
            heading="Library"
          />

          <Routes>
            <Route
              element={<EpisodeList />}
              path="/library"
            />

            <Route
              element={<EpisodePage />}
              path="/library/:episode"
            />
          </Routes>
        </Shell>
      </ReactRouterAdapter>
    </MemoryRouter>
  ),
}
