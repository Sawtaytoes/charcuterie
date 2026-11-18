/**
 * Mark the emoji in a document so the faux dark mode can put their colours
 * back.
 *
 * Faux dark mode inverts the whole document
 * (`emailSrcDoc.ts` → `DARK_CSS`) and then inverts the *pictures* back, so a
 * photograph or a logo renders as itself. An emoji is a picture too — the font
 * paints a colour bitmap, not a letter — but it arrives as a character in a run
 * of text, so nothing in that pass reached it and a laughing face came out as a
 * blue-green negative of itself.
 *
 * CSS cannot ask "is this character an emoji". The reader's optional script is
 * a fixed scroll observer, not code that inspects message content or computed
 * styles, so the only lever is still the markup: wrap each emoji run in a
 * `<span data-ms-emoji>` and let the sheet re-invert that span the same way it
 * re-inverts an `<img>`.
 *
 * **Only the runs that paint in colour.** `\p{Extended_Pictographic}` alone
 * would also match `©`, `™`, `▶` and `☀`, which a browser renders as ordinary
 * dark text unless the author asked for the emoji form with U+FE0F. Those must
 * keep inverting with the rest of the copy — re-inverting them is dark-on-dark,
 * i.e. the character disappears. So a run qualifies only when it is emoji *by
 * default* (`Emoji_Presentation`), or a text-default pictograph the sender
 * followed with U+FE0F, or a flag, or a keycap.
 *
 * **The honest limitation**, and it is the same one the picture pass has: an
 * emoji that is genuinely dark (`⬛`, `♠️`, some fonts' `✔️`) is *correct* after
 * this change and *readable* before it. True colour wins here, because the
 * common case in mail is a face, not a black square.
 *
 * Only ever called for the inverted mode. In light mode, and in a message with
 * a dark design of its own, the message DOM is left exactly as the sanitizer
 * wrote it.
 */

/**
 * One emoji, before any modifier or joiner. The four ways a run can start:
 *
 * 1. `\p{RI}\p{RI}` — a flag, which is a pair of regional indicators.
 * 2. `[0-9#*]️?⃣` — a keycap. Its base is a plain digit, so it has to
 *    be recognised before the digit is read as ordinary text.
 * 3. `\p{Extended_Pictographic}️` — a text-default pictograph the sender
 *    explicitly asked for the emoji form of.
 * 4. `\p{Emoji_Presentation}` — a character that is a colour emoji on its own.
 */
const CORE =
  "(?:\\p{RI}\\p{RI}|[0-9#*]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}\\uFE0F|\\p{Emoji_Presentation})"

/**
 * What may follow a base character: a skin-tone modifier, a variation selector,
 * a combining keycap, or a tag sequence (the subdivision flags — England,
 * Scotland, Wales).
 */
const TRAIL =
  "(?:\\p{Emoji_Modifier}|\\uFE0F|\\u20E3|[\\u{E0020}-\\u{E007F}])*"

/**
 * A zero-width joiner and the next member of the sequence — the family, the
 * professions, `❤️‍🔥`. The member after the joiner is matched as a bare
 * pictograph rather than through `CORE`, because senders write these sequences
 * with the U+FE0F left off and the browser still paints the joined glyph.
 */
const JOINED = `(?:\\u200D(?:\\p{RI}\\p{RI}|\\p{Extended_Pictographic})${TRAIL})*`

/**
 * A whole run of adjacent emoji, so `🎉🎉🎉` is one span rather than three.
 * Built with `new RegExp` because the parts are named above; `g` and `u`
 * together, and a fresh object per module load is fine since `replace` resets
 * `lastIndex` itself.
 */
const EMOJI_RUN = new RegExp(
  `(?:${CORE}${TRAIL}${JOINED})+`,
  "gu",
)

/**
 * Everything the walk must step over rather than into: a `<style>` block (its
 * contents are CSS, and a `<span>` in there is a syntax error), a `<script>`
 * block (the sanitizer removes them, but this function is also handed the
 * frame's own chrome), and any tag — an emoji inside an `alt` or a `title`
 * belongs to the attribute, not to the copy.
 */
const SKIPPED =
  /<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>|<[^>]*>/gi

/**
 * Wrap every emoji run in the document's *text* in `<span data-ms-emoji>`.
 *
 * A string walk rather than a DOM parse: this runs in the browser on every
 * re-render of the reader, the input is HTML this app serialized itself (so
 * every attribute value has its `<` and `>` escaped and the tag regex cannot
 * be fooled by one), and the output goes into an iframe that cannot run
 * scripts. The span is the smallest element that can carry a filter and
 * inherits everything else, so the message's own layout and typography are
 * untouched.
 */
export const markEmoji = (html: string): string => {
  let out = ""
  let cursor = 0

  const copyText = (text: string) =>
    text.replace(
      EMOJI_RUN,
      (run) => `<span data-ms-emoji="">${run}</span>`,
    )

  for (const match of html.matchAll(SKIPPED)) {
    const start = match.index
    out += copyText(html.slice(cursor, start))
    out += match[0]
    cursor = start + match[0].length
  }

  return out + copyText(html.slice(cursor))
}
