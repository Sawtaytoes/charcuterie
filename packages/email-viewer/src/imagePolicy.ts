import type { EmailImageSafety } from "./types.ts"

type ImageSafety = EmailImageSafety

/**
 * The two warnings the reader can prove from sanitized mail.
 *
 * This is deliberately not named "suspicious mail". Mail Sifter does not
 * classify a sender's intent. It knows only that it removed an address with
 * an unsafe scheme or found visible link text that names a different host.
 */
export const hasImageSafetyWarning = (
  body: Pick<ImageSafety, "blockedLinkCount" | "links">,
): boolean =>
  body.blockedLinkCount > 0 ||
  body.links.some((link) => link.warning !== null)

/**
 * Ordinary mail shows its remote images without an extra press.
 *
 * A message with a concrete link warning keeps them parked. The existing
 * trusted-sender choice remains the explicit override: pressing Load images
 * on warned mail trusts that sender, so a later message from the same address
 * does not ask again.
 */
export const shouldLoadRemoteImages = (
  body: ImageSafety,
): boolean =>
  body.remoteImageCount > 0 &&
  (body.isSenderTrustedForImages ||
    !hasImageSafetyWarning(body))
