/**
 * The document an email body is rendered inside.
 *
 * The server already sanitized this HTML; this is the *second* wall, and it is
 * the one that contains the parts a sanitizer can't reason about — layout CSS
 * bleeding into the app, and remote fetches.
 *
 * - The whole thing goes into an iframe with **no** `allow-same-origin`.
 *   Composer previews grant no scripts. The reader grants one hash-approved,
 *   app-authored scroll observer so its identity masthead can move with the
 *   message. Email-authored scripts are still removed and cannot run.
 * - A `<meta>` CSP of `default-src 'none'` means the document may fetch
 *   nothing at all by default. Turning images on widens exactly one directive.
 * - Email CSS is scoped to the frame by construction — a newsletter's
 *   `* { font-family: Comic Sans }` can no longer reach the triage UI.
 */

import { markEmoji } from "./markEmoji.ts"

/**
 * Put the parked remote image sources back. Only ever called when the owner
 * asks for images on *this* message; the CSP is widened in the same breath, so
 * a missed attribute here still fetches nothing.
 */
export const withRemoteImages = (html: string): string =>
  html
    .replace(/\sdata-ms-blocked-image=""/g, "")
    .replace(/\sdata-ms-src="/g, ' src="')

/**
 * Does this message ship a colour scheme of its own?
 *
 * Most mail from a large sender does. A Google Calendar invitation, a Discourse
 * digest, most modern newsletters — they carry a `<style>` block whose
 * `@media (prefers-color-scheme: dark)` half restates every colour for a dark
 * client. That half is a *designed* dark mode by the people who drew the light
 * one, and it beats anything an inversion filter can synthesise.
 */
export const hasNativeDarkDesign = (
  html: string,
): boolean =>
  styleBlocks(html).some((css) =>
    /prefers-color-scheme\s*:\s*dark/i.test(css),
  )

/** Every `<style>` block's contents, in document order. */
const styleBlocks = (html: string): string[] =>
  Array.from(
    html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
    (match) => match[1],
  )

/**
 * A media feature that always matches, and one that never does.
 *
 * A viewport is never narrower than 0px and never wider than 999999px, so these
 * are constant `true` and `false` written in the only vocabulary a media query
 * has. Substituting one for `(prefers-color-scheme: …)` therefore *decides* that
 * half of the sheet while leaving the rest of a compound query
 * (`@media screen and (max-width: 600px) and (prefers-color-scheme: dark)`)
 * intact — which a blunter "delete the whole at-rule" would not.
 */
/** The body's padding, both edges — part of the box a fixed-width table has to fit inside. */
const BODY_PADDING = 32

/**
 * A message too wide for the frame is never smaller than this. A 1400px
 * newsletter on a 320px phone would otherwise render at 0.22 and be a diagram
 * of a message rather than a message; below the floor it scrolls sideways
 * again, which is at least readable a column at a time.
 */
const MIN_SCALE = 0.3

const MEDIA_ALWAYS = "(min-width: 0px)"
const MEDIA_NEVER = "(min-width: 999999px)"

/**
 * Pin the message's colour scheme to the one we chose, rather than the one the
 * owner's operating system happens to be in.
 *
 * **This is the bug that made both modes unreadable.** `prefers-color-scheme`
 * inside the frame reports the *OS* preference; it is not affected by the
 * `color-scheme: light` this sheet declares, and there is no way to set it from
 * the embedding page. So on a dark-OS machine every message with a dark half ran
 * that half — Google's `color: #e8eaed !important` labels — while this sheet
 * still painted the page `#ffffff`. Near-white text on white. Toggling the faux
 * dark mode then inverted that render wholesale, giving near-black on near-black:
 * the same words missing in both directions, with their uncoloured siblings
 * ("- organizer", a bare link) perfectly legible either way, because those fell
 * through to this sheet's own colour.
 *
 * Rewriting the feature is the only lever that works. The frame's one optional
 * app-authored observer reports and restores scroll position only; it does not
 * inspect or rewrite computed styles.
 */
export const pinColorScheme = (
  html: string,
  isDark: boolean,
): string =>
  html.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_match, open: string, css: string, close: string) =>
      open +
      css
        .replace(
          /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gi,
          isDark ? MEDIA_ALWAYS : MEDIA_NEVER,
        )
        .replace(
          /\(\s*prefers-color-scheme\s*:\s*light\s*\)/gi,
          isDark ? MEDIA_NEVER : MEDIA_ALWAYS,
        ) +
      close,
  )

/**
 * How the message is painted. Three outcomes, and which one applies is decided
 * per message rather than per app.
 *
 * - `light` — the message's light design, on a light surface. What "Original"
 *   means, and the only mode a sender's colours are guaranteed to suit.
 * - `native-dark` — the message's *own* dark design, on a dark surface. Only
 *   available when the sender wrote one; strictly better output than an
 *   inversion, because a human chose every colour in it.
 * - `inverted-dark` — the faux dark mode: the light design, flipped. The
 *   fallback for the mail nobody styled for dark, which is most personal mail.
 */
export type EmailColorMode =
  | "light"
  | "native-dark"
  | "inverted-dark"

/** Pick the mode for a message, given the reader's dark preference. */
export const chooseEmailColorMode = (
  isDarkened: boolean,
  hasNativeDark: boolean,
): EmailColorMode =>
  !isDarkened
    ? "light"
    : hasNativeDark
      ? "native-dark"
      : "inverted-dark"

/**
 * A colour handed in from the app, on its way into a stylesheet.
 *
 * These come from `getComputedStyle` over our own design tokens, so this is not
 * a trust boundary so much as a guarantee that a token that goes missing (or
 * arrives as the empty string) cannot close the declaration and start writing
 * rules of its own.
 */
const asColor = (
  value: string | undefined,
  fallback: string,
): string =>
  value &&
  /^(#[0-9a-f]{3,8}|(?:rgb|hsl|oklch|lab|lch)a?\([^;{}"'<>]*\))$/i.test(
    value.trim(),
  )
    ? value.trim()
    : fallback

/**
 * The `@font-face` for the app's own body font, or the empty string.
 *
 * The guard is the same one `asColor` makes: this value is ours, so it is not
 * a trust boundary, but a malformed one must not be able to close the
 * declaration and start writing rules. A base64 `data:` URL for a woff2 is the
 * only shape accepted, which no CSS-breaking character survives.
 */
export const fontFaceCss = (
  dataUrl: string | undefined,
): string =>
  dataUrl &&
  /^data:font\/woff2;base64,[A-Za-z0-9+/=]+$/.test(
    dataUrl.trim(),
  )
    ? `@font-face{font-family:Outfit;font-style:normal;font-weight:100 900;font-display:swap;src:url(${dataUrl.trim()}) format("woff2");}`
    : ""

/**
 * The frame's content policy. One directive widens when the owner asks for this
 * message's images, and nothing else ever does.
 *
 * `script-src 'none'` is stated rather than left to `default-src` so the intent
 * survives someone later loosening the default. Shared with the conversation
 * frame, so the two can never drift apart on what a message may fetch.
 */
export const messageCsp = (
  hasLoadedImages: boolean,
): string =>
  [
    "default-src 'none'",
    "script-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "style-src 'unsafe-inline'",
    "font-src data:",
    `img-src ${hasLoadedImages ? "data: https: http:" : "data:"}`,
  ].join("; ")

export type EmailSrcDocOptions = {
  /** Whether this message's remote images were explicitly allowed. */
  hasLoadedImages?: boolean
  /** Whether the reader asked for this message to be dark. */
  isDarkened?: boolean
  /**
   * The widest fixed pixel width the message declares, or 0. Becomes the
   * body's `min-width`, so the frame scrolls sideways only when it is narrower
   * than that.
   *
   * It doubles as the answer to "does this message paint its own background?".
   * A message built on a 600px table brought its own surface with it and only
   * needs the *page* behind that surface; a reply with no declared width has
   * nothing but text, and needs the page to be its surface.
   */
  fixedLayoutWidth?: number
  /**
   * How wide the message frame actually is, in CSS pixels. 0 when it has not
   * been measured yet. Only ever read against `fixedLayoutWidth`, to answer
   * "does this message fit?".
   */
  frameWidth?: number
  /**
   * Shrink a message that does not fit until it does, rather than leaving it
   * to scroll sideways. See `scaleToFit`.
   */
  isScaledToFit?: boolean
  /**
   * The app's own page colour, resolved from the live theme token, for the
   * canvas *around* a message that paints itself.
   *
   * Passed in rather than hardcoded because the frame cannot see the parent's
   * custom properties, and because Charcuterie ships several themes whose
   * surfaces differ.
   */
  pageBackground?: string
  /**
   * The app's body face, as a `data:` URL, so `MESSAGE_FONT_STACK`'s first
   * family resolves inside the frame. Omitted, the stack falls through to the
   * platform sans and nothing breaks.
   *
   * It has to be *inlined*, and the reason is the security boundary rather
   * than taste: the frame has no `allow-same-origin`, so the same file served
   * from this app's origin is a cross-origin font fetch from an opaque origin,
   * which needs CORS the static handler does not send. `font-src data:` is
   * already in the CSP, so an inlined face widens nothing.
   *
   * Handed in rather than imported here, so this module stays a pure string
   * builder a unit test can run with no bundler in sight.
   */
  fontDataUrl?: string
  /**
   * Space for the reader's identity masthead, in viewport pixels.
   *
   * Supplying this option also enables the fixed scroll observer. The masthead
   * stays in the app document, outside email CSS, while the spacer and observer
   * make it move as one surface with the protected message document.
   */
  readerHeaderInset?: number
}

/** The surface a message that paints no background of its own sits on, when dark. */
const DARK_MESSAGE_SURFACE = "#17181b"

/**
 * The face a message is set in when it names none of its own.
 *
 * Outfit first, which is the app's own body font — a reply that states no
 * font used to render in Segoe UI beside a UI set in Outfit, and the two
 * disagreeing is what "something looks off" was. The face only resolves if
 * `fontFaceCss` put it in the frame; a frame is its own document and inherits
 * no `@font-face` from the app, so without that the stack falls straight
 * through to the platform's own sans and nothing breaks.
 *
 * This is the DEFAULT, never an override. Mail that names a font still gets
 * the font it named — a newsletter is a designed thing and we do not restyle
 * it.
 */
export const MESSAGE_FONT_STACK = `Outfit, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

/**
 * Base styling for the message frame.
 *
 * Two colours here are decided per message rather than fixed.
 *
 * **The page.** `background: #ffffff` on the body used to paint the whole frame
 * white, which is right for a reply and wrong for a 600px newsletter: that
 * message brought its own surface and all the white did was surround it with a
 * lake of white, in a dark app, on a wide monitor. So a message that declares a
 * fixed layout width gets a transparent body over the app's own page colour, and
 * only a message with nothing but text keeps a surface of its own.
 *
 * **The scheme.** `color-scheme` states the mode for the UA's own rendering —
 * scrollbars, form controls, the canvas. It does *not* decide
 * `prefers-color-scheme`, which is what the comment that used to sit here got
 * wrong; `pinColorScheme` does that.
 */
const baseCss = ({
  mode,
  isSelfPainting,
  pageBackground,
}: {
  mode: EmailColorMode
  isSelfPainting: boolean
  pageBackground: string
}): string => {
  /*
   * The measure for a message that declares no width of its own.
   *
   * The full-bleed frame is right for a newsletter, which states its own
   * width, and wrong for a reply, which states nothing and therefore ran the
   * whole width of the window: at 2560px that is about 200 characters a line,
   * and the eye loses the start of the next one on every return sweep.
   *
   * 56ch, and the number is measured rather than chosen. A ch is the advance of
   * a "0", which in Outfit is 11px against a 7.7px average lowercase letter — so
   * the usual "72ch is about 72 characters" rule of thumb comes out at 98 here,
   * well past the 45-85 a line should hold. 56ch measures 612px, which is about
   * 75 characters of ordinary prose. The unit stays `ch` so the measure follows
   * the font size if that is ever retuned.
   *
   * `margin-inline: auto` for the same reason the drawer has a side: the
   * message ends up in front of him rather than pushed against one edge of a
   * wide window.
   */
  const measure = isSelfPainting
    ? ""
    : "max-width: 56ch; margin-inline: auto;"
  const isNativeDark = mode === "native-dark"
  /*
   * A dark message over a dark page needs no surface of its own — an opaque one
   * only draws a seam where the message's box ends and the app's pane resumes.
   * Every light message keeps its plate, including the self-painting ones: see
   * `plate` below for why that is not the old white-lake bug returning.
   */
  const messageSurface = isNativeDark
    ? "transparent"
    : "#ffffff"

  /*
   * The plate a light message sits on, and the whole of the "light message,
   * dark surround" the owner asked for.
   *
   * The obvious version of that — make the body transparent so the app's page
   * colour shows through — is wrong, and wrong in a way that is easy to miss
   * because it looks right on the part of the message you were staring at. A
   * newsletter paints its own 600px table, but the *preheader* above it ("Having
   * trouble viewing this mail?") and the unsubscribe block below it are bare text
   * outside that table. Transparent body, and those lines keep this sheet's
   * near-black default on a near-black page: the same disappearing-text bug this
   * change exists to fix, reintroduced one element over.
   *
   * So the plate stays white and *shrinks to the message* instead. `fit-content`
   * with a `max-width` is not the `max-content` that was tried and reverted here
   * before: that one was unbounded and grew the body to the single longest line
   * in the document, clipping paragraphs off the right edge. This one is clamped
   * to the frame, so the worst case is the full-width white of today rather than
   * an overflow, and the common case is a 600px card centred on the app's own
   * page colour.
   *
   * Only for a message that declares a width. Prose has no width to shrink to,
   * and a plate hugging a reply's longest line would be ragged.
   *
   * The plate is CENTRED BY THE ROOT, not by its own margin. `margin-inline:
   * auto` on the body was the first version, and it centred nothing a sender
   * had styled: a newsletter's own `<style>` is serialized after this sheet and
   * nearly every one carries `body { margin: 0; padding: 0 }` — the email reset
   * every template ships. Same selector, same specificity, later rule wins, and
   * the 600px plate sat flush against the left edge of a 1900px frame. Senders
   * reset `body`; none of them write an `html` rule, so the root is the one
   * element whose layout this sheet actually owns. `safe center` rather than
   * `center`: below the declared width the body overflows the root, and a plain
   * `center` would push the overflow off the left edge where no scrollbar
   * reaches it.
   */
  const plate =
    isSelfPainting && !isNativeDark
      ? "width: fit-content; max-width: 100%;"
      : ""
  const plateCentering =
    isSelfPainting && !isNativeDark
      ? "html { display: grid; justify-items: safe center; }"
      : ""
  const textColor = isNativeDark ? "#e8eaed" : "#16181d"
  const linkColor = isNativeDark ? "#8ab4f8" : "#1a4fd6"
  return `
  html { color-scheme: ${isNativeDark ? "dark" : "light"}; background: ${pageBackground}; }
  ${plateCentering}
  body {
    margin: 0;
    padding: 16px;
    /*
     * Ordinary mail wraps to the frame. This is the default because it is the
     * common case: a personal reply is <div>s of prose with no declared width,
     * and sizing it to max-content made the body as wide as its single longest
     * line — a sideways scrollbar on a message that had every reason to wrap.
     */
    width: auto;
    ${plate}${measure}
    /*
     * The message's surface runs the full height of the frame, so a short mail
     * is a page rather than a white strip with the app's pane showing under it.
     * Harmless when the body is transparent, which is why it is unconditional.
     */
    min-height: 100vh;
    box-sizing: border-box;
    background: ${messageSurface};
    color: ${textColor};
    /*
     * 16px, not 14. This is the default for every message that does not set its
     * own size — which is most personal mail and most plain-text-shaped HTML —
     * and 14px read small enough that the fix on offer was browser zoom. Zoom
     * inflates the app chrome too, so the size moves here instead. Mail that
     * declares its own sizes (a 600px marketing table usually does) is
     * unaffected, exactly as it should be.
     */
    font: 16px/1.6 ${MESSAGE_FONT_STACK};
    /*
     * break-word, deliberately NOT anywhere. anywhere also shrinks an
     * element's min-content width, so in the Narrow View a 600px newsletter
     * table collapsed to one letter per line. This wraps long URLs without
     * lying to the layout about how narrow a cell can get.
     */
    overflow-wrap: break-word;
  }
  /*
   * The cap is against the VIEWPORT, not the parent.
   *
   * body is width:max-content (the newsletter-table fix below), so a plain
   * max-width:100% resolves against a body that has already grown to the
   * image's natural width — which is no cap at all. A photo mailed at 4032px
   * therefore rendered at 4032px and the reader saw one corner of somebody's
   * forehead. Anchoring to 100vw minus the body padding caps the photo at the
   * frame while leaving a 600px marketing table untouched.
   */
  img { max-width: min(100%, calc(100vw - 32px)); height: auto; }
  /*
   * The escape for a message that declares a fixed pixel width (a table
   * width="600"). Injected as a min-width, per message, by buildEmailSrcDoc.
   *
   * A *floor*, not a target, and that distinction is the whole rule. The table
   * layout algorithm squeezes a 600px table into whatever box it is given,
   * which at phone width collapsed a newsletter to one letter per line — so the
   * body must never be allowed narrower than the width the message was designed
   * at, and below that the frame scrolls sideways, as every mail client does.
   *
   * But it must not be allowed *wider* than the frame either. The first attempt
   * used width:max-content, which is unbounded: on a frame already wider than
   * the declared 600, the body kept growing to the longest line in the document
   * and clipped a school newsletter's paragraphs off the right edge. A floor
   * gives the fixed table its width and lets everything else wrap.
   */
  /*
   * No table { max-width: 100% } — see above; squeezing a fixed table is the
   * thing being avoided, not the fix.
   */
  pre { white-space: pre-wrap; }
  /*
   * A plain-text body is PROSE, not code.
   *
   * It used to be set in a code face, on the reasoning that text/plain is
   * "unformatted" — but a person typing a mail to another person is writing
   * prose, and a screen of Consolas is the hardest thing in this app to read.
   * The one thing a code face genuinely buys (columns that line up) survives
   * anyway: the line breaks are the sender's own, because pre-wrap keeps
   * them, and an ASCII table is the rare case rather than the common one.
   *
   * It inherits the font rather than stating a size of its own, so plain text
   * and HTML mail read at the same size and the Body format control changes
   * the formatting and nothing else. No backticks in this comment: the whole
   * sheet is a template literal and one would end the string.
   */
  pre.ms-plain-text {
    margin: 0;
    font: inherit;
    white-space: pre-wrap;
  }
  a { color: ${linkColor}; }
  /*
   * A parked remote image keeps its slot, and has to read as *blocked* rather
   * than *broken*.
   *
   * An <img> with no src renders the browser's torn-picture glyph, which says
   * "this is broken, and there is nothing you can do" — the owner reasonably
   * read a screenful of them as a bug in the viewer rather than as the privacy
   * gate working. The CSS content property replaces the element's rendering
   * outright, so the glyph is gone; the replacement is an inline SVG data URL,
   * which the CSP allows (img-src data:) and which fetches nothing.
   *
   * No backticks in this comment, and none anywhere else in this sheet: the
   * whole thing is a template literal, so one would end the string.
   *
   * object-fit: contain keeps the icon square inside whatever width/height
   * the sender declared, so an 84x21 logo slot does not stretch it.
   */
  img[data-ms-blocked-image] {
    min-width: 20px;
    min-height: 20px;
    border: 1px dashed #b3bac6;
    border-radius: 3px;
    background: #eef1f6;
    box-sizing: border-box;
    /*
     * The swatch carries an intrinsic 22x22 so it does not inflate to fill the
     * row: a replaced element whose content has no intrinsic size stretches to
     * its container, which turned an 84x21 logo slot into a full-width block.
     * contain then keeps it square inside whatever the sender declared.
     */
    object-fit: contain;
    content: url('data:image/svg+xml;utf8,\
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" \
viewBox="0 0 24 24" fill="none" \
stroke="%237b8496" stroke-width="1.6" stroke-linecap="round" \
stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/>\
<circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-4.5 3.5 3 3-2.5L20 17"/>\
<path d="m3 3 18 18"/></svg>');
  }
  /* A link whose text disagrees with its destination, or one we removed. */
  a.ms-link-flagged {
    outline: 2px solid #d1242f;
    outline-offset: 1px;
    background: #fff1f0;
    color: #8b1d24;
  }
  .ms-link-note {
    display: inline-block;
    margin-inline-start: 4px;
    padding: 0 5px;
    border-radius: 4px;
    background: #fdeceb;
    border: 1px solid #f0b3ae;
    color: #8b1d24;
    font: 600 11px/1.6 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    white-space: nowrap;
    vertical-align: baseline;
  }
  .ms-link-note-blocked { background: #f3f4f6; border-color: #c9ced6; color: #3f4650; }
  ${
    isNativeDark
      ? `
  /*
   * The parked-image swatch is app chrome, so it follows the app into dark
   * rather than sitting in the message as a bright chip. The link-safety
   * chrome deliberately does not: a phishing outline looks the same in every
   * mode, which is the same call the inverted mode makes by re-inverting it.
   */
  img[data-ms-blocked-image] { border-color: #40454f; background: #23262c; }
  `
      : ""
  }
`
}

/**
 * Shrink the whole message to the frame — the last rules in the sheet, so they
 * win over the base ones they correct.
 *
 * `zoom` rather than `transform: scale()` because zoom is a *layout* scale: the
 * body is laid out at its declared width and painted smaller, so the frame has
 * nothing left to scroll sideways. A transform paints smaller and leaves the
 * layout box at full size, which is a scrollbar around a message with empty
 * space in it.
 *
 * Two lengths in the base sheet are stated in viewport units and have to be
 * restated here, because a viewport unit does not know about zoom: it resolves
 * against the frame and is *then* scaled, so both come out short by exactly the
 * scale factor.
 *
 * - `min-height: 100vh` would paint the message's surface over the top
 *   fraction of the frame and leave a band of the app's page colour below it.
 * - `img`'s viewport-anchored cap (there so a 4032px photo does not render at
 *   4032px) would shrink every image to a fraction of the column it sits in.
 *   Inside a scaled message the honest cap is the message's own declared width,
 *   which is a fixed number here rather than a viewport unit.
 */
const scaleCss = ({
  fixedLayoutWidth,
  scale,
}: {
  fixedLayoutWidth: number
  scale: number
}): string => `
  body { zoom: ${scale}; min-height: ${(100 / scale).toFixed(2)}vh; }
  img { max-width: min(100%, ${fixedLayoutWidth - BODY_PADDING}px); height: auto; }
`

/**
 * Faux dark mode: the `inverted-dark` path, and only that path.
 *
 * Mail that ships no dark design of its own hardcodes its colours — `bgcolor="#ffffff"`, `<font color>`, inline
 * `style="background:#f4f6f8"` — so there is no honest way to *ask* a message to
 * be dark. Three approaches were on the table:
 *
 * 1. Inject `color-scheme: dark` / a `prefers-color-scheme` sheet. Rejected here as
 *    doing nothing, on the grounds that "the message already stated its colours".
 *    That was wrong, and the messages it was wrong about are the ones that matter:
 *    a message often states *two* sets, and `pinColorScheme` now decides which one
 *    runs. Where a sender wrote the dark set, `native-dark` uses it and this filter
 *    never runs at all. What is left below is the fallback for mail that states one.
 * 2. Restyle only where the message set no explicit colour. Needs to *read* the
 *    message's computed styles. The optional scroll observer has no such code,
 *    and expanding it into a message-style interpreter would break its narrow
 *    security boundary. Doing it server-side would produce a half-dark document
 *    with white islands.
 * 3. Invert the whole document and invert the pixels back. Pure CSS, so it runs
 *    inside the sandbox untouched, and it cannot fail *partially*: either the
 *    message is dark or the toggle is off.
 *
 * So: 3. `hue-rotate(180deg)` after the inversion puts hues back where they
 * started, so a blue header stays blue rather than turning orange; images and
 * background-images are inverted a second time so photographs and logos render
 * as themselves.
 *
 * It is a heuristic and it is honest about that. A logo with a baked-in white
 * rectangle stays a white rectangle, and a message that was already dark comes
 * out light — which is why the toggle sits next to the message with the original
 * one click away rather than being applied by default.
 *
 * The link-safety chrome is deliberately inverted a second time as well. A
 * phishing warning must look the same in both modes; "the red outline turned
 * green because of a display preference" is not a trade this app makes.
 */
const DARK_CSS = `
  html.ms-dark {
    /*
     * The root carries the filter, and the root also has to *cover* the frame:
     * a filtered root element stops propagating its background to the canvas, so
     * without this a short message leaves an unfiltered white band below it.
     */
    min-height: 100%;
    filter: invert(1) hue-rotate(180deg);
  }
  /*
   * #f2f3f5 rather than the base sheet's #ffffff, so the page under a message
   * that sets no background of its own inverts to a near-black rather than a
   * pure #000 slab sitting inside the app's dark grey surfaces.
   */
  html.ms-dark,
  html.ms-dark body { background: #f2f3f5; }
  html.ms-dark img,
  html.ms-dark video,
  /*
   * data-ms-bg-image, not [style*="background-image"]. A filter applies to an
   * element's contents as well as its background, so selecting on the style
   * attribute re-inverted the *text* of any element that happened to use an
   * icon as its background — a feature list whose rows are <li>s with a 24px
   * background icon came out dark-on-dark, while the paragraph beside it was
   * fine. The sanitizer applies this mark only to elements that hold no copy,
   * which is a question CSS cannot ask.
   */
  html.ms-dark [data-ms-bg-image] {
    filter: invert(1) hue-rotate(180deg);
  }
  /*
   * Never re-invert a parked image: its placeholder is app chrome, not content.
   * The root inversion still runs over it, so the swatch is authored light and
   * comes out dark — the same trick the link-safety chrome uses in reverse.
   */
  html.ms-dark img[data-ms-blocked-image] { filter: none; }
  /*
   * An emoji is a picture the font paints, and it arrives as a character in a
   * run of text rather than as an element — so the rule above cannot reach it
   * and a laughing face inverted into a blue-green negative. The sanitizer
   * cannot mark it either: the mark is only wanted in this one mode, so
   * markEmoji applies it as the frame is built. No backticks in this comment:
   * the whole sheet is a template literal and one would end the string.
   */
  html.ms-dark [data-ms-emoji] {
    filter: invert(1) hue-rotate(180deg);
  }
  /* A safety marker keeps its light-mode colours in both modes, on purpose. */
  html.ms-dark a.ms-link-flagged,
  html.ms-dark .ms-link-note {
    filter: invert(1) hue-rotate(180deg);
  }
`

/**
 * The `sandbox` attribute for the message iframe. Popups are the one capability
 * granted, and only so a link the owner *chose* to click can open a real tab;
 * `allow-popups-to-escape-sandbox` means that tab is an ordinary page rather
 * than another sandboxed one. Everything else — scripts, same-origin, forms,
 * top-level navigation, pointer lock, downloads — stays off.
 */
export const EMAIL_FRAME_SANDBOX =
  "allow-popups allow-popups-to-escape-sandbox"

/**
 * The reader's one additional capability. The frame keeps its opaque origin;
 * the observer can report the document's numeric scroll position, and accepts
 * one request from its parent: scroll so that the same fraction of the document
 * sits above the view.
 * The reader sends that when it rebuilds the same message for a new width, so
 * the rebuild does not throw the reader back to the top.
 */
export const EMAIL_READER_FRAME_SANDBOX =
  "allow-scripts allow-popups allow-popups-to-escape-sandbox"
export const EMAIL_SCROLL_OBSERVER_SCRIPT = `(function(){let queued=false;const update=function(){queued=false;const height=document.documentElement.scrollHeight;parent.postMessage({type:'mail-sifter-frame-scroll',top:scrollY,ratio:height>0?scrollY/height:0},'*')};addEventListener('scroll',function(){if(!queued){queued=true;requestAnimationFrame(update)}},{passive:true});addEventListener('resize',update);addEventListener('message',function(event){const data=event.data;if(event.source!==parent||!data||data.type!=='mail-sifter-frame-restore'||typeof data.ratio!=='number'||!(data.ratio>=0&&data.ratio<=1))return;scrollTo(0,data.ratio*document.documentElement.scrollHeight)});update()})();`
// sha256 of EMAIL_SCROLL_OBSERVER_SCRIPT. A source change must update this value.
export const EMAIL_SCROLL_OBSERVER_HASH =
  "sha256-hleRPofIK86svuU1bVtWZZT69AKUV4aTfwu3DbUTx3Q="

/**
 * Reserve the app masthead inside the frame without trusting the email's body
 * styles. Real newsletters commonly carry `body { padding: 0 !important; }`.
 * Those rules are serialized after our base sheet and can therefore erase a
 * padding-based inset, putting the first part of the message behind the
 * masthead. An inline important size on an app-owned element wins over an
 * authored stylesheet, including one whose body rules are important.
 *
 * The height is expressed in the body's unscaled coordinate space. `zoom`
 * then paints it at exactly the measured viewport height.
 */
const readerHeaderSpacer = (
  readerHeaderInset: number,
  scale: number,
): string => {
  if (readerHeaderInset <= 0) return ""
  const layoutHeight = Number(
    (readerHeaderInset / scale).toFixed(4),
  )
  return `<div data-ms-reader-header-spacer="" aria-hidden="true" style="display:block!important;height:${layoutHeight}px!important;min-height:${layoutHeight}px!important;width:1px!important;clear:both!important"></div>`
}

/** Build the full `srcdoc` for a sanitized HTML body. */
/**
 * How much to shrink a message so its declared width fits the frame — 1 when
 * it already fits, or when there is nothing to fit.
 *
 * **Why this exists at all**, given that the floor
 * (Mail Sifter decision `2026-08-19-the-fixed-width-escape-is-a-floor-not-a-target`)
 * deliberately let a fixed-width message scroll sideways: that call was made
 * about a *desktop* frame, where "narrow" meant a docked drawer had taken a
 * third of the window and the message still had 700px. On a phone the same rule
 * hands a 720px newsletter to a 390px screen, and swiping sideways through every
 * line of a message is not reading it. Gmail and Apple Mail both scale on a
 * phone, and the owner asked for the same here.
 *
 * The divisor is the declared width **plus the body's own padding**, because
 * that padding is inside the box the table has to fit in — scaling by the bare
 * declared width leaves the last 32px off the right edge, which is the same
 * clipped-message complaint one order of magnitude smaller.
 */
export const scaleToFit = ({
  fixedLayoutWidth,
  frameWidth,
}: {
  fixedLayoutWidth: number
  frameWidth: number
}): number => {
  const declaredBox = fixedLayoutWidth + BODY_PADDING
  if (
    fixedLayoutWidth <= 0 ||
    frameWidth <= 0 ||
    declaredBox <= frameWidth
  ) {
    return 1
  }
  return Math.max(
    MIN_SCALE,
    Number((frameWidth / declaredBox).toFixed(4)),
  )
}

export const buildEmailSrcDoc = (
  sanitizedHtml: string,
  options: EmailSrcDocOptions = {},
): string => {
  const hasLoadedImages = options.hasLoadedImages ?? false
  const isDarkened = options.isDarkened ?? false
  // Clamped rather than trusted: this arrives from the message.
  const fixedLayoutWidth = Math.min(
    Math.max(Math.round(options.fixedLayoutWidth ?? 0), 0),
    1400,
  )
  const scale =
    (options.isScaledToFit ?? false)
      ? scaleToFit({
          fixedLayoutWidth,
          frameWidth: Math.max(
            Math.round(options.frameWidth ?? 0),
            0,
          ),
        })
      : 1
  const isReportingScroll =
    options.readerHeaderInset !== undefined
  const readerHeaderInset = Math.min(
    Math.max(Math.round(options.readerHeaderInset ?? 0), 0),
    1000,
  )
  const mode = chooseEmailColorMode(
    isDarkened,
    hasNativeDarkDesign(sanitizedHtml),
  )
  const csp = isReportingScroll
    ? messageCsp(hasLoadedImages).replace(
        "script-src 'none'",
        `script-src '${EMAIL_SCROLL_OBSERVER_HASH}'`,
      )
    : messageCsp(hasLoadedImages)

  const withImages = hasLoadedImages
    ? withRemoteImages(sanitizedHtml)
    : sanitizedHtml
  // Always pinned, in every mode: leaving it unpinned is leaving the message's
  // colours to whatever the owner's OS is set to, which is how a dark-OS machine
  // rendered every mode wrong at once.
  const pinned = pinColorScheme(
    withImages,
    mode === "native-dark",
  )

  // Inverting is the fallback path, and only that path wants the filter: a
  // message with a dark design of its own is *already* dark, and inverting it
  // would undo the work its sender did.
  const isInverted = mode === "inverted-dark"

  // The emoji marks exist to be re-inverted, so they are added in that mode and
  // in no other: light and native-dark render the sanitizer's own markup.
  const body = isInverted ? markEmoji(pinned) : pinned

  return [
    "<!doctype html>",
    `<html lang="en"${isInverted ? ' class="ms-dark"' : ""}><head>`,
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '<meta name="referrer" content="no-referrer">',
    // The face first, so the family named in `baseCss` is already declared.
    `<style>${fontFaceCss(options.fontDataUrl)}${baseCss({
      mode,
      isSelfPainting: fixedLayoutWidth > 0,
      pageBackground: asColor(
        options.pageBackground,
        mode === "native-dark"
          ? DARK_MESSAGE_SURFACE
          : "#ffffff",
      ),
    })}${isInverted ? DARK_CSS : ""}${
      fixedLayoutWidth
        ? `body { min-width: ${fixedLayoutWidth}px; }`
        : ""
    }${scale < 1 ? scaleCss({ fixedLayoutWidth, scale }) : ""}</style>`,
    "</head><body>",
    isReportingScroll
      ? readerHeaderSpacer(readerHeaderInset, scale)
      : "",
    body,
    isReportingScroll
      ? `<script>${EMAIL_SCROLL_OBSERVER_SCRIPT}</script>`
      : "",
    "</body></html>",
  ].join("")
}

/**
 * Plain-text bodies are rendered as text, never as HTML: a mail that arrived as
 * `text/plain` saying `<b>hi</b>` means those characters literally.
 */
export const buildPlainTextSrcDoc = (
  text: string,
  options: EmailSrcDocOptions = {},
): string => {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return buildEmailSrcDoc(
    // The class carries the styling; see `pre.ms-plain-text` for why this is
    // prose and not code.
    `<pre class="ms-plain-text">${escaped}</pre>`,
    // Images are irrelevant here — there are none — but the dark toggle, the
    // page colour and the app's own face are reading preferences and have to
    // survive the switch to Plain text.
    {
      fontDataUrl: options.fontDataUrl,
      isDarkened: options.isDarkened,
      pageBackground: options.pageBackground,
      readerHeaderInset: options.readerHeaderInset,
    },
  )
}
