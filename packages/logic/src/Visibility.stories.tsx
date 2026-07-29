import {
  action,
} from '@storybook/addon-actions'
import {
  Meta,
  StoryObj,
} from '@storybook/react'
import {
  expect,
} from '@storybook/jest'
import {
  userEvent,
  waitFor,
  within,
} from '@storybook/testing-library'

import {
  htmlStyleDecorators,
} from './htmlStyleDecorators'
import {
  HideOnEscapeKey,
} from './HideOnEscapeKey'
import {
  HtmlContent,
} from './HtmlContent'
import {
  createVisibilityContextKey,
} from './useSharedVisibilityContext'
import {
  VisibilityConsumer,
} from './VisibilityConsumer'
import {
  VisibilityContent,
} from './VisibilityContent'
import {
  VisibilityControlProvider,
} from './VisibilityControlProvider'
import {
  VisibilityProvider,
  VisibilityProviderProps,
} from './VisibilityProvider'
import {
  VisibilityTarget,
} from './VisibilityTarget'
import {
  VisibilityTrigger,
} from './VisibilityTrigger'

const storybookMeta: Meta<VisibilityProviderProps> = {
  component: VisibilityProvider,
  decorators: htmlStyleDecorators,
  title: 'Visibility',
}

export default storybookMeta

export const Standard: StoryObj<VisibilityProviderProps> = {
  render: (
    args,
  ) => (
    <VisibilityProvider
      {...args}
    >
      <VisibilityTrigger>
        <button>
          Click me to reveal content
        </button>
      </VisibilityTrigger>

      <VisibilityTarget>
        <HtmlContent>
          <div>
            Revealed content
          </div>
        </HtmlContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  args: {
    isVisible: false,
    onChange: (
      action(
        'onChange'
      )
    ),
  },
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region'
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

export const APIIncompliantComponents: StoryObj<VisibilityProviderProps> = {
  render: ({
    translateTargetProps,
    translateTriggerProps,
    ...visibilityProviderProps
  }) => (
    <VisibilityProvider
      {...visibilityProviderProps}
    >
      <VisibilityConsumer
        translateProps={({
          toggle,
        }) => ({
          onSelect: toggle,
        })}
      >
        <Button>
          Click me to reveal content
        </Button>
      </VisibilityConsumer>

      <VisibilityConsumer
        translateProps={({
          isVisible,
        }) => ({
          isHidden: (
            !isVisible
          ),
        })}
      >
        <Content>
          Revealed content
        </Content>
      </VisibilityConsumer>
    </VisibilityProvider>
  ),
  args: {
    isVisible: false,
    onChange: (
      action(
        'onChange'
      )
    ),
  },
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            }
          )
        )
        .not
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region'
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

const ModalContent = ({
  'aria-labelledby': ariaLabelledBy,
  children,
  id,
  isVisible,
  onClick,
}) => (
  <div
    aria-labelledby={ariaLabelledBy}
    hidden={!isVisible}
    id={id}
    onClick={onClick}
    role="dialog"
  >
    <div className="modalOverlay">
      <div className="modalContent">
        {children}
      </div>
    </div>
  </div>
)

export const TargetWithTrigger: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <VisibilityTrigger>
        <button>
          Click me to reveal content
        </button>
      </VisibilityTrigger>

      <VisibilityTrigger>
        <VisibilityTarget>
          <ModalContent>
            Click me to hide content
          </ModalContent>
        </VisibilityTarget>
      </VisibilityTrigger>
    </VisibilityProvider>
  ),
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'dialog',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'dialog'
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'dialog'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'dialog',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

export const TargetWithTarget: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <VisibilityTrigger>
        <button>
          Click me to reveal content
        </button>
      </VisibilityTrigger>

      <VisibilityTarget>
        <VisibilityContent>
          <VisibilityTrigger>
            <VisibilityTarget>
              <HtmlContent>
                <div className="overlay">
                  <div modalOlassName="modalContent">
                      Revealed content
                  </div>
                </div>
              </HtmlContent>
            </VisibilityTarget>
          </VisibilityTrigger>
        </VisibilityContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeInTheDocument()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByText(
        'Revealed content',
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeInTheDocument()
      })
    )
  },
}

export const MultipleTargets: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <VisibilityTarget>
        <HtmlContent>
          <div>
            Revealed content 1
          </div>
        </HtmlContent>
      </VisibilityTarget>

      <div>
        <VisibilityTrigger>
          <button>
            Click me to reveal content
          </button>
        </VisibilityTrigger>
      </div>

      <VisibilityTarget>
        <HtmlContent>
          <div>
            Revealed content 2
          </div>
        </HtmlContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region'
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )
  },
}

export const MultipleTriggers: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <div>
        <VisibilityTrigger>
          <button>
            Click me to reveal content
          </button>
        </VisibilityTrigger>
      </div>

      <div>
        <VisibilityTrigger>
          <button>
            Click me to reveal the same content
          </button>
        </VisibilityTrigger>
      </div>

      <VisibilityTarget>
        <HtmlContent>
          <div>
            Revealed content
          </div>
        </HtmlContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal content',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region'
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal the same content',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

const Button = ({
  children,
  onSelect = () => {},
}) => (
  <button onClick={onSelect}>
    {children}
  </button>
)

const Content = ({
  children,
  isHidden = true,
}) => (
  <div
    hidden={isHidden}
    role="region"
  >
    {children}
  </div>
)

export const MutuallyExclusive: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <div>
      <div>
        <VisibilityProvider>
          <VisibilityTrigger>
            <button>
              Click me to reveal content 1
            </button>
          </VisibilityTrigger>

          <VisibilityTarget>
            <HtmlContent>
              <div>
                Revealed content 1
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityProvider>
      </div>

      <div>
        <VisibilityProvider>
          <VisibilityTrigger>
            <button>
              Click me to reveal content 2
            </button>
          </VisibilityTrigger>

          <VisibilityTarget>
            <HtmlContent>
              <div>
                Revealed content 2
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityProvider>
      </div>
    </div>
  ),
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /1/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: /1/,
            },
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /2/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: /1/,
            },
          )
        )
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: /2/,
            },
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /1/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /2/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )
  }
}

export const SyncedProviders: StoryObj<VisibilityProviderProps> = {
  render: ({
    contextKey,
  }) => (
    <div>
      <div>
        <VisibilityProvider
          contextKey={contextKey}
        >
          <VisibilityTrigger>
            <button>
              Click me to reveal content
            </button>
          </VisibilityTrigger>
        </VisibilityProvider>
      </div>

      <div>
        <VisibilityProvider
          contextKey={contextKey}
        >
          <VisibilityTrigger>
            <button>
              Click me to reveal the same content
            </button>
          </VisibilityTrigger>
        </VisibilityProvider>
      </div>

      <div>
        <VisibilityProvider
          contextKey={contextKey}
        >
          <VisibilityTarget>
            <HtmlContent>
              <div>
                Revealed content
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityProvider>
      </div>
    </div>
  ),
  args: {
    contextKey: (
      createVisibilityContextKey()
    ),
  },
  argTypes: {
    contextKey: {
      table: {
        disable: true,
      },
    },
  },
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal content',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region'
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal the same content',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

export const ControlledProviders: StoryObj<VisibilityProviderProps> = {
  render: ({
    onChange,
  }) => (
    <VisibilityControlProvider
      onChange={onChange}
    >
      <div>
        <VisibilityProvider>
          <VisibilityTrigger>
            <button>
              Click me to reveal content 1
            </button>
          </VisibilityTrigger>

          <VisibilityTarget>
            <HtmlContent>
              <div>
                Revealed content 1
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityProvider>
      </div>

      <div>
        <VisibilityProvider>
          <VisibilityTrigger>
            <button>
              Click me to reveal content 2
            </button>
          </VisibilityTrigger>

          <VisibilityTarget>
            <HtmlContent>
              <div>
                Revealed content 2
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityProvider>
      </div>
    </VisibilityControlProvider>
  ),
  args: {
    onChange: (
      action(
        'control'
      )
    ),
  },
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /1/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: /1/,
            },
          )
        )
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /2/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: /2/,
            },
          )
        )
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )
  },
}

export const ShowOnHover: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <VisibilityConsumer
        translateProps={({
          contentId,
          hide,
          show,
          triggerId,
        }) => ({
          'aria-controls': contentId,
          onMouseEnter: show,
          onMouseLeave: hide,
          id: triggerId,
        })}
      >
        <button>
          Click me to reveal content
        </button>
      </VisibilityConsumer>

      <VisibilityTarget>
        <HtmlContent>
          <div>
            Revealed content
          </div>
        </HtmlContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  storyName: 'Show on Hover',
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            }
          )
        )
        .not
        .toBeVisible()
      })
    )

    userEvent
    .hover(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region'
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .unhover(
      canvas
      .queryByRole(
        'button'
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

export const SwitchVisibility: StoryObj<VisibilityProviderProps> = {
  render: ({
    contextKey,
  }) => (
    <div>
      <VisibilityProvider>
        <VisibilityTrigger>
          <button>
            Click me to reveal content 1
          </button>
        </VisibilityTrigger>

        <VisibilityTarget>
          <HtmlContent>
            <div>
              <div>
                Revealed content 1
              </div>

              <div>
                <VisibilityTrigger
                  linkedContextKey={
                    contextKey
                  }
                >
                  <button>
                    Click me to reveal content 2
                  </button>
                </VisibilityTrigger>
              </div>
            </div>
          </HtmlContent>
        </VisibilityTarget>
      </VisibilityProvider>

      <VisibilityProvider
        contextKey={contextKey}
      >
        <VisibilityTrigger>
          <VisibilityTarget>
            <HtmlContent>
              <div>
                Revealed content 2
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityTrigger>
      </VisibilityProvider>
    </div>
  ),
  args: {
    contextKey: (
      createVisibilityContextKey()
    ),
  },
  argTypes: {
    contextKey: {
      table: {
        disable: true,
      },
    },
  },
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /1/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: /1/,
            }
          )
        )
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region'
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: /2/,
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content 2',
          )
        )
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )
  },
}

export const Inception: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <VisibilityTrigger>
        <button>
          Click me to reveal another visibility
        </button>
      </VisibilityTrigger>

      <VisibilityTarget>
        <HtmlContent>
          <div>
            <VisibilityProvider>
              <VisibilityTrigger>
                <button>
                  Click me to reveal content
                </button>
              </VisibilityTrigger>

              <VisibilityTarget>
                <HtmlContent>
                  <div>
                    Revealed content
                  </div>
                </HtmlContent>
              </VisibilityTarget>
            </VisibilityProvider>
          </div>
        </HtmlContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal another visibility',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal content',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'region',
            {
              name: 'Click me to reveal content',
            },
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal another visibility',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
            {
              hidden: true,
            },
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal another visibility',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal content',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeVisible()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'region',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'Click me to reveal another visibility',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .getAllByRole(
            'button',
          )
        )
        ?.toHaveLength?.(
          1
        )
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeVisible()
      })
    )
  },
}

export const HideOnEscapeKeyImplementation: StoryObj<VisibilityProviderProps> = {
  render: () => (
    <VisibilityProvider>
      <VisibilityTrigger>
        <button>
          Click me to reveal content
        </button>
      </VisibilityTrigger>

      <HideOnEscapeKey />

      <VisibilityTarget>
        <VisibilityContent>
          <VisibilityTarget>
            <HtmlContent>
              <div className="overlay">
                <div modalOlassName="modalContent">
                  Revealed content
                </div>
              </div>
            </HtmlContent>
          </VisibilityTarget>
        </VisibilityContent>
      </VisibilityTarget>
    </VisibilityProvider>
  ),
  storyName: 'Hide on Escape Key',
  play: async ({
    canvasElement,
  }) => {
    const canvas = (
      within(
        canvasElement
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeInTheDocument()
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .toBeVisible()
      })
    )

    userEvent
    .keyboard(
      '[Escape]'
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByText(
            'Revealed content',
          )
        )
        .not
        .toBeInTheDocument()
      })
    )
  },
}
