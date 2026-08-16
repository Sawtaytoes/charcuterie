import { useStatus } from "@charcuterie/logic"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"
import { useEffect, useRef } from "react"

import { Skeleton } from "../Skeleton/Skeleton.tsx"
import { toClassName } from "../toClassName.ts"
import { mediaTransitions } from "./mediaStatus.ts"

export type MediaTileRatio = "poster" | "square" | "video"

export type MediaTileProps = Omit<
  ComponentPropsWithRef<"figure">,
  "children"
> & {
  /**
   * Required. The one thing three hand-rolled poster grids all
   * omit — and a 200-tile page of unnamed images is unnavigable
   * rather than merely imperfect.
   */
  alt: string
  aspectRatio?: MediaTileRatio
  /** A `Badge`, usually. Pinned inside the media box. */
  badge?: ReactNode
  /** Shown in place of the image when it fails. */
  fallback?: ReactNode
  href?: string
  /**
   * Makes the tile a button. Hover, focus-visible and
   * `cursor-pointer` come with it — wrapping `MediaTile` in a
   * bare `<button>` is how a poster ends up with a text cursor
   * and no hover at all. `href` wins if both are set.
   */
  isDisabled?: boolean
  onClick?: ComponentPropsWithRef<"button">["onClick"]
  src?: string
  subtitle?: ReactNode
  title: string
}

/**
 * Shared by the link and the button. A wrapped `<button
 * className="block">` does not get these, which is why a
 * Collection thumbnail looked inert under the pointer.
 */
const INTERACTIVE_CLASS =
  "group flex cursor-pointer flex-col rounded-md outline-offset-2 hover:opacity-90 focus-visible:outline-solid focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-focus-ring"

const RATIO_CLASS: Record<MediaTileRatio, string> = {
  // 2:3 is the standard poster trim, which is what Plex, Kavita, and
  // every physical sleeve in the collection actually are.
  poster: "aspect-[2/3]",
  square: "aspect-square",
  video: "aspect-video",
}

/**
 * Three repos, and shipping one of these is what makes
 * plex-channels, image-viewer, and gallery-downloader look like one
 * family instead of three.
 *
 * The interesting part is not the layout, it is the three states an
 * image has and the fact that no hand-rolled version models them:
 *
 *  - **Loading** shows a `Skeleton` at the tile's exact aspect ratio,
 *    so the grid does not reflow when 200 posters land. Layout shift
 *    is the thing users notice in these apps today.
 *  - **Error** keeps the tile's box and its name. An `<img>` with a
 *    broken `src` collapses to a glyph and takes the row's height
 *    with it; the fallback here is a `role="img"` carrying the same
 *    `alt`, so the tile stays findable and the grid stays a grid.
 *  - **Cached** is the case that bites: a `complete` image never
 *    fires `load`, so a naive `onLoad`-only implementation leaves a
 *    shimmering skeleton over a perfectly rendered poster forever.
 *    The effect below checks `complete`/`naturalWidth` on mount and
 *    on every `src` change.
 *
 * Those states are a `useStatus` machine rather than a
 * `useState<string>`, which is what makes `loaded → error`
 * impossible instead of merely unlikely — see `mediaStatus.ts`.
 */
export const MediaTile = ({
  alt,
  aspectRatio = "poster",
  badge,
  className,
  fallback,
  href,
  isDisabled = false,
  onClick,
  src,
  subtitle,
  title,
  ...figureProps
}: MediaTileProps): ReactNode => {
  const imageRef = useRef<HTMLImageElement>(null)

  const { can, reset, status, transitionTo } = useStatus({
    initialState: "loading",
    transitions: mediaTransitions,
  })

  useEffect(() => {
    // A new `src` is a new load, including after a failure.
    reset()

    const image = imageRef.current

    if (!image?.complete) {
      return
    }

    // `complete` with no intrinsic width is a *failed* cached
    // load, not a successful one — the distinction browsers only
    // expose this way.
    if (image.naturalWidth > 0) {
      if (can("loaded")) {
        transitionTo("loaded")
      }

      return
    }

    if (can("error")) {
      transitionTo("error")
    }
  }, [can, reset, transitionTo])

  const media = (
    <div
      className={toClassName(
        "relative overflow-hidden rounded-md bg-surface-sunken",
        RATIO_CLASS[aspectRatio],
      )}
    >
      {status === "error" ? (
        <div
          // Unconditionally an `img` carrying the same `alt`, even
          // inside a link. The link's own `aria-label` is a name from
          // the author and takes precedence, so this cannot
          // double-name it — and a conditional role would leave the
          // failure case nameless in exactly the arrangement (a
          // poster grid of links) where it happens most.
          aria-label={alt}
          className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-content-muted text-xs"
          role="img"
        >
          {/* Words, not a glyph. The library ships zero SVGs by
              rule, and a symbol character is not a safe substitute:
              `▨` depends on the *system* having a font that covers
              it, which the kiosk Pis and this repo's headless
              Chromium do not — so the honest default is text, and an
              app with an icon set passes `fallback`. */}
          {fallback ?? <span>Image unavailable</span>}
        </div>
      ) : (
        <>
          {status === "loading" ? (
            <Skeleton className="absolute inset-0 size-full" />
          ) : null}

          <img
            alt={href || onClick ? "" : alt}
            className={toClassName(
              "size-full object-cover transition-opacity duration-(--duration-normal) ease-standard",
              status === "loaded"
                ? "opacity-100"
                : "opacity-0",
            )}
            decoding="async"
            loading="lazy"
            onError={() => {
              if (can("error")) {
                transitionTo("error")
              }
            }}
            onLoad={() => {
              if (can("loaded")) {
                transitionTo("loaded")
              }
            }}
            ref={imageRef}
            src={src}
          />
        </>
      )}

      {badge ? (
        <div className="absolute top-2 start-2">
          {badge}
        </div>
      ) : null}
    </div>
  )

  const caption =
    title === "" ? null : (
      <figcaption className="flex flex-col gap-0.5 pt-2">
        <span className="truncate font-medium text-content-primary text-sm cq-sm:text-md">
          {title}
        </span>

        {subtitle ? (
          <span className="truncate text-content-muted text-xs">
            {subtitle}
          </span>
        ) : null}
      </figcaption>
    )

  // An empty `title` is how a tile sits next to a name the
  // parent already printed. The control still needs a name, so
  // the alt is the fallback — wrapping it in a nameless
  // `<button>` was how Collection's cover thumbnail became
  // unfindable as well as un-hoverable.
  const accessibleName = title === "" ? alt : title

  return (
    <figure
      {...figureProps}
      className={toClassName(
        "@container flex flex-col",
        className,
      )}
    >
      {href ? (
        // `aria-label` rather than the caption text, so the link's
        // name is exactly the title — an agent matching
        // `getByRole("link", { name: "Blade Runner" })` should not
        // have to know whether a subtitle happened to be rendered.
        // The `<img>` inside goes `alt=""` for the same reason: two
        // names for one link is a screen reader reading it twice.
        <a
          aria-label={accessibleName}
          className={INTERACTIVE_CLASS}
          href={href}
        >
          {media}

          {caption}
        </a>
      ) : onClick ? (
        <button
          aria-label={accessibleName}
          className={toClassName(
            INTERACTIVE_CLASS,
            "w-full border-0 bg-transparent p-0 text-start disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50",
          )}
          disabled={isDisabled}
          onClick={onClick}
          type="button"
        >
          {media}

          {caption}
        </button>
      ) : (
        <>
          {media}

          {caption}
        </>
      )}
    </figure>
  )
}
