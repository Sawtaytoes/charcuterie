import type { RefCallback } from "react"
import { useCallback, useState } from "react"

/**
 * Whether the photo at `src` has failed, and the two props an `<img>`
 * needs so that every failure is noticed.
 *
 * Shared by `Avatar` and `PortraitTiles`, whose whole promise about a
 * photo is the same: it is never the only thing, so a 404, an expired
 * signed URL, or a wrong content type lands on the initials rather than
 * on a broken-image glyph.
 *
 * ### The failed URL, not a boolean
 *
 * A `hasFailed` boolean has to be *reset* when `src` changes, which is
 * an effect syncing a prop into state — the shape this library refuses
 * ([decision](../../../docs/decisions/2026-07-29-logic-hooks-are-uncontrolled.md)).
 * Storing the URL that failed makes the comparison derive the answer:
 * a new URL gets its own attempt, and a re-render never resurrects a
 * dead one. `PortraitTiles` kept a boolean, so a tile whose photo
 * failed showed initials for the rest of its life, even after the
 * caller passed a working URL.
 *
 * ### `onError` alone misses a failure that happened first
 *
 * React attaches `onError` before it sets `src` on an image it creates,
 * so a client render never misses the event. A **server-rendered**
 * image is different. The browser starts loading it while it parses
 * the HTML, and it can fail before `hydrateRoot` attaches the listener.
 * React does not set `src` again when it hydrates an image, so the
 * `error` event is never repeated, and the broken glyph stays.
 *
 * The ref closes that gap. When React attaches it, an image that is
 * already `complete` has already answered, so `decode()` is asked for
 * the answer again: it rejects for a broken image and resolves for a
 * loaded one. An image still loading is not `complete`, and its answer
 * arrives through `onError` as usual.
 *
 * ⚠️ `decode()` **also rejects when a newer `src` supersedes it**, with
 * the same `EncodingError` a broken image gets. So a rejection counts
 * only while this ref is still the one attached — React runs the
 * cleanup below when the ref detaches or `src` changes — and only
 * while the element still shows that `src` and has finished with it.
 * Without the guard, a picture that was swapped out mid-decode was
 * marked dead, and coming back to it showed the initials.
 */
export const useImageFailure = (
  src: string | undefined,
): {
  hasFailed: boolean
  imageProps: {
    onError: () => void
    ref: RefCallback<HTMLImageElement>
  }
} => {
  const [failedSrc, setFailedSrc] = useState<
    string | undefined
  >(undefined)

  const onError = useCallback(() => {
    setFailedSrc(src)
  }, [src])

  const ref = useCallback(
    (image: HTMLImageElement | null) => {
      if (image === null || !image.complete) {
        return
      }

      let isAttached = true

      image.decode().catch(() => {
        if (
          isAttached &&
          image.complete &&
          image.getAttribute("src") === src
        ) {
          setFailedSrc(src)
        }
      })

      return () => {
        isAttached = false
      }
    },
    [src],
  )

  return {
    hasFailed: src !== undefined && failedSrc === src,
    imageProps: { onError, ref },
  }
}
