/**
 * Put a string on the clipboard, and say whether it landed.
 *
 * Three routes, tried in order, because the fleet runs in all three
 * conditions:
 *
 *  1. **`navigator.clipboard.writeText`.** The real API. It exists
 *     only in a *secure context*, which a `devshare` URL and
 *     `localhost` both are — and a plain `http://storeman.octen:8080`
 *     dev server is not.
 *  2. **A hidden `<textarea>` plus `document.execCommand("copy")`.**
 *     Deprecated, and kept anyway: it is the only thing that works in
 *     an insecure context, spoolbuddy already hand-rolls exactly this
 *     block, and the alternative is a Copy button that silently does
 *     nothing on the household's own LAN.
 *  3. **Give up and report it.** A caller that marks mail done on a
 *     copy must not mark it done on a copy that never happened.
 *
 * Never throws. The boolean is the whole result, so a call site is an
 * `if` rather than a `try`.
 */
export const copyText = async (
  value: string,
): Promise<boolean> => {
  try {
    // `writeText` rejects on a denied permission and on a document
    // that is not focused — both real, both recoverable below.
    await globalThis.navigator?.clipboard?.writeText(value)
    return true
  } catch {
    // Fall through to the legacy route.
  }

  return copyBySelection(value)
}

/**
 * The pre-Clipboard-API route.
 *
 * The textarea is positioned off-screen rather than hidden: a
 * `display: none` element has no selection to copy, and
 * `visibility: hidden` is no better. `readOnly` stops the mobile
 * keyboard appearing for the frame it is in the document.
 */
const copyBySelection = (value: string): boolean => {
  const owner = globalThis.document
  if (!owner?.body) return false

  const field = owner.createElement("textarea")
  field.value = value
  field.readOnly = true
  field.setAttribute("aria-hidden", "true")
  field.style.position = "fixed"
  field.style.insetInlineStart = "-9999px"
  field.style.top = "0"

  owner.body.append(field)

  try {
    field.select()

    return owner.execCommand("copy")
  } catch {
    return false
  } finally {
    field.remove()
  }
}
