// Lint fixture — `@charcuterie/ui`'s own source.
//
// Every raw element the app-side rules forbid is here on
// purpose: rendering `<a>`, `<button>` and `<select>` *correctly*
// is the entire job of the library, and a rule that fires here
// would make the library the first thing it broke.
//
// Nothing in this file is suppressed. It stays clean because the
// consumer points `createComponentChoiceRules({ files })` at its
// own app source, and this path never matches — which is the
// only mechanism holding it, so it is the one under test.

export const TextLink = ({ children, ...anchorProps }) => (
  <a {...anchorProps}>{children}</a>
)

export const Button = ({ children, ...buttonProps }) => (
  <button type="button" {...buttonProps}>
    {children}
  </button>
)

export const Select = ({ options, ...selectProps }) => (
  <select {...selectProps}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
)

export const Backdrop = ({ onDismiss }) => (
  <div onClick={onDismiss} />
)
