/**
 * The scheme guard, for markdown this surface did not write.
 *
 * `MarkdownView` renders files fetched from a git host, so its
 * document is hostile input by default. Most of what that usually
 * means is already answered by construction here: there is no
 * `innerHTML` anywhere in this subpath, every rendered node is
 * `createElement` plus `textContent`, and CodeMirror's state holds
 * the source as *text* — so a `<script>` tag in a fetched README is
 * literal characters on screen and never a script.
 *
 * One thing that construction did not cover, and it was live in the
 * editor as well: **a URL is taken from the document and used as a
 * URL.** `[click me](javascript:…)` conceals its markup, paints as a
 * link, and `window.open` then runs the script in this origin. The
 * image path is the same shape one step down — `![](…)` writes an
 * `src` verbatim.
 *
 * So every URL crosses this module before it reaches an `href`, an
 * `src` or `window.open`, in **both** components. It is a defect in
 * a shape the two share, which makes it a defect in the layer they
 * share.
 *
 * ### An allowlist, and nothing clever
 *
 * Denying `javascript:` is the version that has a bug. Browsers
 * throw tabs and newlines away before they read a scheme, so
 * `JaVaScript:`, a tab in the middle of the word, and a leading
 * newline are one URL to a navigation and three different strings to
 * a blocklist. This normalises the way a browser does, asks what
 * scheme is left, and accepts only names it recognises. A URL with
 * **no** scheme is relative and is always fine.
 */

/**
 * A scheme, per RFC 3986: a letter, then letters, digits, `+`, `-`
 * or `.`, then the colon. Anchored, and the character class has no
 * `/` in it — so `notes/2026:rack.md` is read as the relative path
 * it is rather than as a `notes/2026` scheme.
 */
const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/

/**
 * `[text](<url with spaces>)` is CommonMark's escape hatch for a URL
 * that contains a space, and the parser hands the angle brackets
 * through as part of the `URL` node. They are not part of the URL.
 */
const toBareUrl = (url: string) => url.replace(/^<|>$/g, "")

/**
 * What a browser discards before it looks at a URL: the C0 control
 * range and the space. Stripping all of it is deliberately *more*
 * aggressive than the URL standard, which removes only tab and the
 * two newline characters — erring this way can only turn a URL that
 * would have been treated as relative into one that is rejected,
 * which is the harmless direction.
 */
const toNormalizedUrl = (url: string) =>
  toBareUrl(url)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the entire point
    .replace(/[\u0000-\u0020]/g, "")
    .toLowerCase()

const toSchemeName = (url: string) =>
  SCHEME_PATTERN.exec(toNormalizedUrl(url))?.[1]

/**
 * The schemes a link may carry.
 *
 * `mailto:` and `tel:` are here because a README that prints a
 * contact address is ordinary and neither one can execute. `file:`
 * is not, because it reads the *reader's* disk.
 */
const LINK_SCHEMES = new Set([
  "http",
  "https",
  "mailto",
  "tel",
])

/** The schemes an image's `src` may carry, `data:` aside. */
const IMAGE_SCHEMES = new Set(["http", "https"])

/**
 * `data:`, allowed for an image type only — which is not the hole it
 * looks like.
 *
 * A `data:image/svg+xml` document loaded through `<img>` is a
 * replaced element: no script execution, no network, no reach into
 * the embedding page. That is why it is the one inline format worth
 * having, and why this repo's own `Avatar` story uses it for a
 * portrait that needs no fixture file. `data:text/html` is a
 * different thing entirely and does not match this.
 */
const DATA_IMAGE_PATTERN = /^data:image\/[a-z0-9.+-]+[,;]/

/**
 * The link's URL, or `undefined` when it must not become one.
 *
 * A rejected URL is not rewritten and not blanked — the text stays
 * exactly where the author put it and simply stops being a link.
 * That is the honest failure: the reader still sees every character
 * of the source, and can still read the URL itself in the
 * raw-markdown view, but nothing on the page will navigate to it.
 */
export const toSafeLinkUrl = (
  url: string,
): string | undefined => {
  const scheme = toSchemeName(url)

  if (scheme === undefined) {
    // No scheme at all: a relative path, a `#fragment`, a `?query`,
    // or a protocol-relative `//host/path`. None of them can name an
    // executable scheme, so all of them are fine.
    return toBareUrl(url)
  }

  return LINK_SCHEMES.has(scheme)
    ? toBareUrl(url)
    : undefined
}

/** The image's `src`, or `undefined` when it must not have one. */
export const toSafeImageUrl = (
  url: string,
): string | undefined => {
  const scheme = toSchemeName(url)

  if (scheme === undefined) {
    return toBareUrl(url)
  }

  if (scheme === "data") {
    return DATA_IMAGE_PATTERN.test(toNormalizedUrl(url))
      ? toBareUrl(url)
      : undefined
  }

  return IMAGE_SCHEMES.has(scheme)
    ? toBareUrl(url)
    : undefined
}
