/**
 * The elements the user has focused, newest last, so a closing panel
 * can find somewhere real to send focus when its opener has gone.
 *
 * floating-ui keeps a list like this, but it is private, and a panel
 * that passes its own `returnFocus` target no longer falls back to it.
 *
 * Weak references, so a removed element is not kept alive by the list.
 */
const LIMIT = 20

let history: WeakRef<HTMLElement>[] = []

const remember = (event: FocusEvent) => {
  const { target } = event

  if (
    !(target instanceof HTMLElement) ||
    target === target.ownerDocument.body
  ) {
    return
  }

  history = [
    ...history.filter((entry) => {
      const element = entry.deref()

      return element !== undefined && element !== target
    }),
    new WeakRef(target),
  ].slice(-LIMIT)
}

// Installed when the module first loads in a browser, so an element
// focused before any panel ever opened, such as a menu's trigger, is
// already in the list. Nothing runs on the server.
if (typeof document !== "undefined") {
  document.addEventListener("focusin", remember, true)
}

/**
 * Whether focus can land on `element` once `panel` has closed: it is
 * still in the page, enabled, and rendered; it is outside the closing
 * panel and outside any panel that is itself leaving; and it is not
 * inside anything else that is `inert`, such as a menu that is still
 * leaving.
 *
 * An `inert` overlay panel does not rule an element out: a lower panel
 * that the closing one covered is still `inert` at the moment this is
 * read, and is turned back on in the same commit.
 */
const isReturnable = (
  element: HTMLElement | null | undefined,
  panel: HTMLElement | null,
): element is HTMLElement => {
  if (
    element?.isConnected !== true ||
    element === element.ownerDocument.body ||
    (panel?.contains(element) ?? false) ||
    element.closest("[data-overlay-exiting]") !== null ||
    element.matches(":disabled")
  ) {
    return false
  }

  if (
    typeof element.checkVisibility === "function" &&
    !element.checkVisibility()
  ) {
    return false
  }

  const inertAncestor = element.closest("[inert]")

  return (
    inertAncestor === null ||
    inertAncestor.hasAttribute("data-overlay-panel")
  )
}

/**
 * Input types that do not bring up an on-screen keyboard.
 */
const KEYLESS_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
])

/**
 * Whether focusing `element` brings up the keyboard on a phone. The
 * history fallback skips these: the user left that field, and did not
 * ask to type in it again.
 */
const isTextEntry = (element: HTMLElement): boolean =>
  element instanceof HTMLTextAreaElement ||
  element.isContentEditable ||
  (element instanceof HTMLInputElement &&
    !KEYLESS_INPUT_TYPES.has(element.type))

/**
 * Where a closing panel sends focus: the element that opened it if
 * that still can take focus; otherwise, if there was an opener, the
 * most recently focused element that can and is not a text field.
 *
 * A panel that opened while nothing had focus returns nothing, so
 * focus stays where it was, as before. The history is only for an
 * opener that has gone, not for a panel that never had one: sending
 * focus to a field the user left minutes ago would open the keyboard
 * on a phone.
 */
export const findReturnFocusTarget = ({
  opener,
  panel,
}: {
  opener: HTMLElement | null
  panel: HTMLElement | null
}): HTMLElement | null => {
  if (
    opener === null ||
    opener === opener.ownerDocument.body
  ) {
    return null
  }

  if (isReturnable(opener, panel)) {
    return opener
  }

  for (
    let index = history.length - 1;
    index >= 0;
    index -= 1
  ) {
    const element = history[index]?.deref()

    if (
      isReturnable(element, panel) &&
      !isTextEntry(element)
    ) {
      return element
    }
  }

  return null
}
