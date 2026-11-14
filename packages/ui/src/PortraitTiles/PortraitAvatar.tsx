import type { ReactNode } from "react"

import { useImageFailure } from "../useImageFailure.ts"

/**
 * The face, and the one piece of this component that holds state.
 *
 * A portrait grid is the shape that cannot absorb a broken image:
 * a missing `<img>` is a torn hole where a person's face was, next
 * to nine that rendered. `onError` is the only signal a browser
 * gives for a 404, a wrong content type, or a file the user's
 * network stripped — so the fallback the caller already supplied for
 * "no picture" covers "no picture *today*" as well.
 *
 * The failure is keyed by URL, so a tile whose photo failed tries
 * again when the caller passes a new one, and a photo that failed
 * before a server render hydrated is noticed too — see
 * `useImageFailure`.
 *
 * Its own component because the state is per portrait. Hoisting it
 * to a `Record<string, boolean>` in the set would re-render every
 * tile whenever any one image failed.
 */
export const PortraitAvatar = ({
  className,
  imageSrc,
  initials,
}: {
  className: string
  imageSrc: string | undefined
  initials: ReactNode
}): ReactNode => {
  const { hasFailed: isImageBroken, imageProps } =
    useImageFailure(imageSrc)

  if (imageSrc === undefined || isImageBroken) {
    return (
      <span aria-hidden className={className}>
        {initials}
      </span>
    )
  }

  return (
    <img
      {...imageProps}
      // The name is beside it, inside the same tile, so an alt here
      // is the name announced twice.
      alt=""
      className={className}
      src={imageSrc}
    />
  )
}
