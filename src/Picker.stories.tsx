import {
  OneForm,
  Field,
} from '@oneform/react'
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
  MultiplePickerProvider,
} from './MultiplePickerProvider'
import {
  SinglePickerProvider,
  SinglePickerProviderProps,
} from './SinglePickerProvider'
import {
  PickerSelector,
} from './PickerSelector'
import {
  usePickerField,
} from './usePickerField'
import './toBePressed.expect'
import './toBeSelected.expect'

const storybookMeta: Meta<SinglePickerProviderProps> = {
  component: SinglePickerProvider,
  decorators: htmlStyleDecorators,
  title: 'Picker',
}

export default storybookMeta

const ButtonOption = ({
  children,
  isSelected,
  name,
  selectOption,
  value,
}) => (
  <button
    aria-pressed={isSelected}
    name={name}
    onClick={selectOption}
    type="button"
    value={value}
  >
    {children}
  </button>
)

const InputOption = ({
  children,
  isSelected,
  name,
  optionType,
  selectOption,
  value,
}) => (
  <label>
    <input
      checked={isSelected}
      name={name}
      onClick={selectOption}
      type={optionType}
      value={value}
    />

    {children}
  </label>
)

const InputButtonOption = ({
  children,
  isSelected,
  name,
  optionType,
  selectOption,
}) => (
  <input
    aria-pressed={isSelected}
    name={name}
    onClick={selectOption}
    type="button"
    value={children}
  />
)

const InputRoleOption = ({
  children,
  isSelected,
  optionType,
  selectOption,
}) => (
  <span
    aria-checked={isSelected}
    aria-label={children}
    onClick={selectOption}
    role={optionType}
    tabIndex="0"
  >
    {children}
  </span>
)

const SelectOption = ({
  children,
  isSelected,
  selectOption,
}) => (
  <span
    aria-label={children}
    aria-selected={isSelected}
    onClick={selectOption}
    role="option"
    tabIndex="0"
  >
    {children}
  </span>
)

const SelectOptionList = ({
  children,
}) => (
  <div
    aria-orientation="vertical"
    data-vertical
    role="listbox"
  >
    {children}
  </div>
)

const SwitchOption = ({
  children,
  isSelected,
  selectOption,
}) => (
  <label>
    <div>
      {children}
    </div>

    <button
      aria-checked={isSelected}
      onClick={selectOption}
      role="switch"
      tabIndex="0"
    >
      <span>
        Off
      </span>

      <span>
        On
      </span>
    </button>
  </label>
)

export const SingleSelectionControlled: StoryObj<SinglePickerProviderProps> = {
  render: (
    singlePickerProviderProps,
  ) => (
    <SinglePickerProvider
      {...singlePickerProviderProps}
    >
      <fieldset data-horizontal>
        <PickerSelector
          value="first"
        >
          <InputRoleOption>
            First
          </InputRoleOption>
        </PickerSelector>

        <PickerSelector
          value="second"
        >
          <InputRoleOption>
            Second
          </InputRoleOption>
        </PickerSelector>

        <PickerSelector
          value="third"
        >
          <InputRoleOption>
            Third
          </InputRoleOption>
        </PickerSelector>
      </fieldset>
    </SinglePickerProvider>
  ),
  args: {
    onChange: (
      action(
        'onChange'
      )
    ),
    value: '',
  },
  argTypes: {
    value: {
      control: {
        type: 'radio',
      },
      options: [
        'first',
        'second',
        'third',
      ],
    },
  }
}

export const MultipleSelectionControlled: StoryObj<SinglePickerProviderProps> = {
  render: (
    multiplePickerProviderProps,
  ) => (
    <MultiplePickerProvider
      {...multiplePickerProviderProps}
    >
      <fieldset data-horizontal>
        <PickerSelector
          value="first"
        >
          <InputRoleOption>
            First
          </InputRoleOption>
        </PickerSelector>

        <PickerSelector
          value="second"
        >
          <InputRoleOption>
            Second
          </InputRoleOption>
        </PickerSelector>

        <PickerSelector
          value="third"
        >
          <InputRoleOption>
            Third
          </InputRoleOption>
        </PickerSelector>
      </fieldset>
    </MultiplePickerProvider>
  ),
  args: {
    onChange: (
      action(
        'onChange'
      )
    ),
    value: [],
  },
  argTypes: {
    value: {
      control: {
        type: 'check',
      },
      options: [
        'first',
        'second',
        'third',
      ],
    },
  }
}

export const SingleSelectionInput: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        ''
      )
    )

    return (
      <SinglePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-vertical>
          <PickerSelector
            value="first"
          >
            <InputOption>
              First
            </InputOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <InputOption>
              Second
            </InputOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <InputOption>
              Third
            </InputOption>
          </PickerSelector>
        </fieldset>
      </SinglePickerProvider>
    )
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
          .queryAllByRole(
            'radio',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  },
}

const defaultMultipleSelectionInputValue = []

export const MultipleSelectionInput: StoryObj<SinglePickerProviderProps> = {
  reunder: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        defaultMultipleSelectionInputValue
      )
    )

    return (
      <MultiplePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-vertical>
          <PickerSelector
            value="first"
          >
            <InputOption>
              First
            </InputOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <InputOption>
              Second
            </InputOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <InputOption>
              Third
            </InputOption>
          </PickerSelector>
        </fieldset>
      </MultiplePickerProvider>
    )
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
          .queryAllByRole(
            'checkbox',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  },
}

export const SingleSelectionInputButton: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        ''
      )
    )

    return (
      <SinglePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-vertical>
          <PickerSelector
            value="first"
          >
            <InputButtonOption>
              First
            </InputButtonOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <InputButtonOption>
              Second
            </InputButtonOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <InputButtonOption>
              Third
            </InputButtonOption>
          </PickerSelector>
        </fieldset>
      </SinglePickerProvider>
    )
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
          .queryAllByRole(
            'button',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'Second',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'Second',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  }
}

const defaultMultipleSelectionInputButtonValue = []

export const MultipleSelectionInputButton: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        defaultMultipleSelectionInputButtonValue
      )
    )

    return (
      <MultiplePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-vertical>
          <PickerSelector
            value="first"
          >
            <InputButtonOption>
              First
            </InputButtonOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <InputButtonOption>
              Second
            </InputButtonOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <InputButtonOption>
              Third
            </InputButtonOption>
          </PickerSelector>
        </fieldset>
      </MultiplePickerProvider>
    )
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
          .queryAllByRole(
            'button',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'Second',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  }
}

export const SingleSelectionInputRole: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        ''
      )
    )

    return (
      <SinglePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-horizontal>
          <PickerSelector
            value="first"
          >
            <InputRoleOption>
              First
            </InputRoleOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <InputRoleOption>
              Second
            </InputRoleOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <InputRoleOption>
              Third
            </InputRoleOption>
          </PickerSelector>
        </fieldset>
      </SinglePickerProvider>
    )
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
          .queryAllByRole(
            'radio',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  }
}

const defaultMultipleSelectionInputRoleValue = []

export const MultipleSelectionInputRole: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        defaultMultipleSelectionInputRoleValue
      )
    )

    return (
      <MultiplePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-horizontal>
          <PickerSelector
            value="first"
          >
            <InputRoleOption>
              First
            </InputRoleOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <InputRoleOption>
              Second
            </InputRoleOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <InputRoleOption>
              Third
            </InputRoleOption>
          </PickerSelector>
        </fieldset>
      </MultiplePickerProvider>
    )
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
          .queryAllByRole(
            'checkbox',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  }
}

export const SingleSelectionButton: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        ''
      )
    )

    return (
      <SinglePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-horizontal>
          <PickerSelector
            value="first"
          >
            <ButtonOption>
              First
            </ButtonOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <ButtonOption>
              Second
            </ButtonOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <ButtonOption>
              Third
            </ButtonOption>
          </PickerSelector>
        </fieldset>
      </SinglePickerProvider>
    )
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
          .queryAllByRole(
            'button',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'Second',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'Second',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  },
}

const defaultMultipleSelectionButtonValue = []

export const MultipleSelectionButton: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        defaultMultipleSelectionButtonValue
      )
    )

    return (
      <MultiplePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-horizontal>
          <PickerSelector
            value="first"
          >
            <ButtonOption>
              First
            </ButtonOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <ButtonOption>
              Second
            </ButtonOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <ButtonOption>
              Third
            </ButtonOption>
          </PickerSelector>
        </fieldset>
      </MultiplePickerProvider>
    )
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
          .queryAllByRole(
            'button',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'Second',
            },
          )
        )
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
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
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'button',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'button',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBePressed()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'button',
            {
              pressed: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  },
}

export const SingleSelectionSelect: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        ''
      )
    )

    return (
      <SinglePickerProvider
        onChange={onChange}
        value={value}
      >
        <SelectOptionList>
          <PickerSelector
            value="first"
          >
            <SelectOption>
              First
            </SelectOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <SelectOption>
              Second
            </SelectOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <SelectOption>
              Third
            </SelectOption>
          </PickerSelector>
        </SelectOptionList>
      </SinglePickerProvider>
    )
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
          .queryAllByRole(
            'option',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'First',
            },
          )
        )
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'Second',
            },
          )
        )
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'Second',
            },
          )
        )
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  },
}

const defaultMultipleSelectionSelectValue = []

export const MultipleSelectionSelect: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        defaultMultipleSelectionSelectValue
      )
    )

    return (
      <MultiplePickerProvider
        onChange={onChange}
        value={value}
      >
        <SelectOptionList>
          <PickerSelector
            value="first"
          >
            <SelectOption>
              First
            </SelectOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <SelectOption>
              Second
            </SelectOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <SelectOption>
              Third
            </SelectOption>
          </PickerSelector>
        </SelectOptionList>
      </MultiplePickerProvider>
    )
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
          .queryAllByRole(
            'option',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'First',
            },
          )
        )
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'First',
            },
          )
        )
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'Second',
            },
          )
        )
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'option',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'option',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBeSelected()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'option',
            {
              selected: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  },
}

export const SingleSelectionSwitch: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        ''
      )
    )

    return (
      <SinglePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-vertical>
          <PickerSelector
            value="first"
          >
            <SwitchOption>
              First
            </SwitchOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <SwitchOption>
              Second
            </SwitchOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <SwitchOption>
              Third
            </SwitchOption>
          </PickerSelector>
        </fieldset>
      </SinglePickerProvider>
    )
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
          .queryAllByRole(
            'switch',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  },
}

const defaultMultipleSelectionSwitchValue = []

export const MultipleSelectionSwitch: StoryObj<SinglePickerProviderProps> = {
  render: () => {
    const {
      onChange,
      value,
    } = (
      usePickerField(
        defaultMultipleSelectionSwitchValue
      )
    )

    return (
      <MultiplePickerProvider
        onChange={onChange}
        value={value}
      >
        <fieldset data-vertical>
          <PickerSelector
            value="first"
          >
            <SwitchOption>
              First
            </SwitchOption>
          </PickerSelector>

          <PickerSelector
            value="second"
          >
            <SwitchOption>
              Second
            </SwitchOption>
          </PickerSelector>

          <PickerSelector
            value="third"
          >
            <SwitchOption>
              Third
            </SwitchOption>
          </PickerSelector>
        </fieldset>
      </MultiplePickerProvider>
    )
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
          .queryAllByRole(
            'switch',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'switch',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'switch',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'switch',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  },
}

export const SingleSelectionOneForm: StoryObj<SinglePickerProviderProps> = {
  render: () => (
    <OneForm>
      <Field>
        <SinglePickerProvider
          name="picker"
        >
          <fieldset data-horizontal>
            <PickerSelector
              value="first"
            >
              <InputRoleOption>
                First
              </InputRoleOption>
            </PickerSelector>

            <PickerSelector
              value="second"
            >
              <InputRoleOption>
                Second
              </InputRoleOption>
            </PickerSelector>

            <PickerSelector
              value="third"
            >
              <InputRoleOption>
                Third
              </InputRoleOption>
            </PickerSelector>
          </fieldset>
        </SinglePickerProvider>
      </Field>
    </OneForm>
  ),
  storyName: (
    'Single Selection OneForm'
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
          .queryAllByRole(
            'radio',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'radio',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'radio',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'radio',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )
  },
}

export const MultipleSelectionOneForm: StoryObj<SinglePickerProviderProps> = {
  render: () => (
    <OneForm>
      <Field isMultipleElement>
        <MultiplePickerProvider
          name="picker"
        >
          <fieldset data-horizontal>
            <PickerSelector
              value="first"
            >
              <InputRoleOption>
                First
              </InputRoleOption>
            </PickerSelector>

            <PickerSelector
              value="second"
            >
              <InputRoleOption>
                Second
              </InputRoleOption>
            </PickerSelector>

            <PickerSelector
              value="third"
            >
              <InputRoleOption>
                Third
              </InputRoleOption>
            </PickerSelector>
          </fieldset>
        </MultiplePickerProvider>
      </Field>
    </OneForm>
  ),
  storyName: (
    'Multiple Selection OneForm'
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
          .queryAllByRole(
            'checkbox',
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          1
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'Second',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'Second',
            },
          )
        )
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'Third',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          3
        )
      })
    )

    userEvent
    .click(
      canvas
      .queryByRole(
        'checkbox',
        {
          name: 'First',
        },
      )
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryByRole(
            'checkbox',
            {
              name: 'First',
            },
          )
        )
        .not
        .toBeChecked()
      })
    )

    await (
      waitFor(() => {
        expect(
          canvas
          .queryAllByRole(
            'checkbox',
            {
              checked: true,
            },
          )
        )
        .toHaveLength(
          2
        )
      })
    )
  },
}
