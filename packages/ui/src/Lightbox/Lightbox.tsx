import { useVisibility } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { Dialog } from "../Dialog/Dialog.tsx"
import { toClassName } from "../toClassName.ts"

export type LightboxProps = {
  /**
   * Required, and the whole reason this is not a bare `<img>` in a
   * dialog. It names both the enlarged image and — via `heading`'s
   * default below — the dialog itself, and a poster grid of unnamed
   * images is unnavigable rather than merely imperfect. Same rule
   * `MediaTile` makes.
   */
  alt: string
  /** Shown under the enlarged image. A year, a source, a filename. */
  caption?: ReactNode
  /** Applied to the built-in trigger button, not the dialog. */
  className?: string
  /**
   * The dialog's accessible name and visible heading. Defaults to
   * `alt`, which is right when the thumbnail's alt is already the
   * title ("THE OUTFIT poster"); pass it when the two should differ.
   */
  heading?: string
  /**
   * **Controlled** open state. Omit for the uncontrolled default,
   * where the trigger owns it through `useVisibility`. Present means
   * the caller owns it and the built-in trigger becomes a plain
   * button that only *reports* intent through `onOpenChange`.
   */
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  src: string
  /**
   * The clickable thumbnail — a smaller `<img>`, usually. Omitted in
   * the controlled, trigger-elsewhere case, where something else in
   * the page opens the lightbox and this renders only the overlay.
   */
  thumbnail?: ReactNode
}

/**
 * A thumbnail that opens its own full-size view — the one image
 * interaction three apps hand-roll and none get the focus trap or
 * the scroll lock right. It is a **skin over `Dialog`**, not a second
 * dialog: `Dialog` (through `Modal`/`OverlayPanel`) owns the portal,
 * the scrim, Escape, the focus trap and `lockScrollBehind`, and
 * everything that makes those correct in every browser the fleet
 * runs. What this adds is the image-specific part — a `cursor-zoom-in`
 * trigger and an `object-contain` image clamped to the viewport so a
 * 2:3 poster and a 16:9 still both land whole.
 *
 * ### Controlled and not, one component
 *
 * `useVisibility` runs unconditionally — hooks cannot be conditional
 * — but is *consulted* only when `isOpen` is absent. A caller that
 * passes `isOpen` owns the truth; the internal store is then an
 * unread two-field object, which is cheaper than splitting this into
 * two components that share a Modal body.
 */
export const Lightbox = ({
  alt,
  caption,
  className,
  heading,
  isOpen,
  onOpenChange,
  src,
  thumbnail,
}: LightboxProps): ReactNode => {
  const isControlled = isOpen !== undefined

  const { hide, isVisible, show } = useVisibility()

  const isShown = isControlled ? isOpen : isVisible

  const requestOpen = () => {
    if (!isControlled) {
      show()
    }

    onOpenChange?.(true)
  }

  const requestClose = () => {
    if (!isControlled) {
      hide()
    }

    onOpenChange?.(false)
  }

  return (
    <>
      {thumbnail === undefined ? null : (
        <button
          // The trigger carries the name; the `thumbnail` inside it
          // goes `alt=""`, exactly as `MediaTile` names its link and
          // silences the image within it. A button around an
          // empty-alt image is otherwise `button-name` with nothing
          // to announce.
          aria-label={`Enlarge ${heading ?? alt}`}
          className={toClassName(
            // `cursor-zoom-in` is the affordance a bare `<img>`
            // never had, and the focus ring is the fleet's standard
            // — the same one `MediaTile`'s link wears.
            "group block cursor-zoom-in rounded-md outline-offset-2 focus-visible:outline-solid focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-focus-ring",
            className,
          )}
          onClick={requestOpen}
          type="button"
        >
          {thumbnail}
        </button>
      )}

      <Dialog
        heading={heading ?? alt}
        isVisible={isShown}
        onClose={requestClose}
        size="xl"
      >
        <figure className="flex flex-col items-center gap-3">
          <img
            alt={alt}
            // `object-contain`, not `cover`: the enlarged view must
            // show the whole image, and the clamp is `dvh` for the
            // same address-bar reason `Modal`'s is.
            className="max-h-[75dvh] w-auto max-w-full rounded-md object-contain"
            src={src}
          />

          {caption ? (
            <figcaption className="text-center text-content-muted text-sm">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      </Dialog>
    </>
  )
}
