import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { RouterLinkProvider } from "./RouterLinkProvider.tsx"
import type { RouterLinkProps } from "./routerLink.ts"
import { UnstyledLink } from "./UnstyledLink.tsx"

const SoftRouterLink = ({
  href,
  ...linkProps
}: RouterLinkProps): ReactNode => (
  <a {...linkProps} data-router="soft" href={href} />
)

const meta = {
  title: "Utilities/UnstyledLink",
  component: UnstyledLink,
  parameters: { layout: "padded" },
  args: {
    children: "Jobs",
    className:
      "text-sm text-intent-accent-content hover:underline",
    href: "/jobs",
  },
} satisfies Meta<typeof UnstyledLink>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Routed: Story = {
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  render: (linkProps) => (
    <div className="flex gap-4">
      <UnstyledLink {...linkProps}>
        Routed jobs
      </UnstyledLink>
      <UnstyledLink
        {...linkProps}
        href="https://example.com/jobs"
      >
        External jobs
      </UnstyledLink>
      <UnstyledLink {...linkProps} href="#jobs">
        Jobs fragment
      </UnstyledLink>
    </div>
  ),
}
