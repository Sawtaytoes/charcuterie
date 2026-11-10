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
 * still in the page, outside the closing panel, and outside any panel
 * that is itself leaving.
 *
 * It does not check `inert`. A lower panel that the closing one
 * covered is still `inert` at the moment this is read, and is exactly
 * where focus belongs.
 */
const isReturnable = (
  element: HTMLElement | null | undefined,
  panel: HTMLElement | null,
): element is HTMLElement =>
  element?.isConnected === true &&
  element !== element.ownerDocument.body &&
  !(panel?.contains(element) ?? false) &&
  element.closest("[data-overlay-exiting]") === null

/**
 * Where a closing panel sends focus: the element that opened it if
 * that still can take focus; otherwise the most recently focused
 * element that can.
 */
export const findReturnFocusTarget = ({
  opener,
  panel,
}: {
  opener: HTMLElement | null
  panel: HTMLElement | null
}): HTMLElement | null => {
  if (isReturnable(opener, panel)) {
    return opener
  }

  for (
    let index = history.length - 1;
    index >= 0;
    index -= 1
  ) {
    const element = history[index]?.deref()

    if (isReturnable(element, panel)) {
      return element
    }
  }

  return null
}
