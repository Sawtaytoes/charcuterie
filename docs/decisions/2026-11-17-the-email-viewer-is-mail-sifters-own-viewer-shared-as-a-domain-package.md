# The email viewer is Mail Sifter's own viewer, shared as a domain package

**Status:** Accepted
**Date:** 2026-11-17
**Type:** Package / security
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/email-viewer` holds Mail Sifter's email viewer, moved out of Mail Sifter
unchanged, so every app that shows Mail Sifter's mail renders it with the same code.

1. **It is a domain package, like `@charcuterie/model-viewer`, not part of `@charcuterie/ui`.**
   It depends on `ui` (as a peer) for `Badge` and `Button`; `ui` never depends on it.
2. **It never sanitizes.** Its input is the HTML Mail Sifter's server produced with
   `sanitize-html` and its annotator. It is the second and third wall: a frame with no
   `allow-same-origin`, and a `default-src 'none'` policy that allows one hashed observer
   script. Nobody may hand it HTML that did not come through that sanitizer.
3. **It owns no image decision.** `hasLoadedImages` is a prop. The package exports Mail
   Sifter's policy (`shouldLoadRemoteImages`, `hasImageSafetyWarning`) for the parent to
   apply, and `EmailImageNotice` for the parent to place above the frame.
4. **The document's `ms-` vocabulary is its wire format.** `data-ms-src`,
   `data-ms-blocked-image`, `ms-plain-text`, `mail-sifter-frame-scroll` and the rest moved
   unchanged, so both observer hashes and Mail Sifter's rendering stayed identical. A rename
   is a coordinated change in the sanitizer, this package, and every consumer.
5. **It ships as a Forgejo generic-package archive, not to npm.** `release.sh` builds a
   reproducible archive from a clean, committed checkout; consumers pin it by URL. A release
   candidate carries its own version (`0.1.0-rc.1`), so it cannot be mistaken for the
   release cut from the merged commit.
6. **Its stories live under a `Packages/` root in the sidebar**, beside the components'
   six groups, because it is not a `@charcuterie/ui` component. The stories use invented
   mail and never fetch a remote address: every remote image is parked, and the one picture
   that renders is a `data:` URL.
7. **`EmailAttachmentList` renders nothing when it has no attachments**, so a consumer
   whose source does not send attachment data yet passes what it has. Without `onDownload`
   the rows are a plain list; with it, each row is a button that runs the app's own signed
   request.

## Context

The owner, about Starchart's email panel, 2026-11-17: *"The emails also don't show any
images atm and are too wide for the window space compared to the Mail Sifter app. Do we
wanna export components from those apps and render them here, so they're more
reproducible? Like export the 'email viewer' part of Mail Sifter into Charcuterie?"*

Starchart turned Mail Sifter's HTML into text on its own server, so a newsletter lost its
layout and every image, and its wrapping differed from Mail Sifter's. Starchart's general
rule, that an item is rendered with its owning app's own viewer shared through
Charcuterie, is Starchart's own decision record. This record covers the package's rules.

## Why

**A domain package, because the shape belongs to one product.** The fleet rule builds a
shared shape in Charcuterie first. The viewer is shared by two apps, but it renders one
app's mail format, so it sits beside `model-viewer` rather than in the component library's
sidebar groups and release.

**Not sanitizing is the safe split.** The sanitizer needs the raw MIME parts and the
`cid:` attachments, which only the server that fetched the mail has. A second, browser-side
sanitizer would be a second set of rules that can disagree with the first. The frame and its
policy contain what a sanitizer cannot reason about, and the tests pin both.

**The image decision stays with the parent** because the two consumers differ in where a
message may be opened. Mail Sifter's policy loads remote images on open for ordinary mail,
and that tells the sender the message was opened. Starchart may apply it only in its focus
window, never in a hover card, the graph, or a prefetch. A viewer that decided for itself
could not honor that difference.

**Unchanged names were the cost of an honest move.** Renaming the frame's classes or the
observer's message types would have changed both script hashes and every frame document,
and Mail Sifter's visual regression run could then no longer prove the move changed
nothing.

**A Forgejo archive, because npm cannot take a new package without a manual step.**
`docs/npm-publishing.md` records that a brand-new package's first publish needs an
automation token and a web-UI step by hand. `model-viewer` already ships this way, and
its consumers install it by URL.

## Evidence

- Mail Sifter's sources moved byte for byte except imports, one broken relative link, and
  one sample sender name in a test and a comment, which became an invented one:
  `emailSrcDoc.ts`, `emailThreadSrcDoc.ts`, `markEmoji.ts` and `readerImages.ts`, with their
  tests, which pass here unchanged, including the two observer-hash tests.
- `EmailViewer.test.tsx` mounts the stories in all four windows. It checks the sandbox, the
  policy, parked images, the masthead reserve, the container fit, scale-to-fit, the
  conversation document, the placeholder, and the attachment columns.
- Mail Sifter's own VRT run on its adoption pull request is the proof of no visual change.
