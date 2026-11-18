# @charcuterie/email-viewer

Mail Sifter's email viewer, shared so every app that shows Mail Sifter's mail renders it the
same way. Mail Sifter's reader is the first consumer; Starchart's focus window is the second.

It holds the parts that decide how a message looks and what it may do:

- the frame documents (`buildEmailSrcDoc`, `buildPlainTextSrcDoc`, `buildThreadSrcDoc`),
  with their content policy, colour-scheme pinning, faux dark mode, emoji marks, and
  scale-to-fit;
- the two app-authored observer scripts, each approved by its SHA-256 hash;
- `EmailViewer`, the React frame: it fits its container, reserves and slides the app's
  masthead, keeps the reader's place across rebuilds, and covers the gap until it paints;
- `shouldLoadRemoteImages` and `hasImageSafetyWarning`, Mail Sifter's image policy;
- `EmailImageNotice`, the bar that offers **Load images** on warned mail;
- `EmailAttachmentList`, which renders nothing when there are no attachments.

Everything around the frame stays in the app: fetching, the drawer, the composers, reply
and forward, trust writes, and preferences.

## Security

The viewer **never sanitizes**. Hand it only the HTML Mail Sifter's server produced
(`sanitize-html` plus its annotator), which removes scripts, handlers, forms, frames and
`<base>`, parks every remote image on `data-ms-src`, and marks the links it judged. The
viewer is the second and third wall: a frame with **no `allow-same-origin`**, and a
`default-src 'none'` policy that allows one hashed observer script and nothing else.

`hasLoadedImages` is the parent's decision. When it is true, `img-src` widens to
`data: https: http:` and the browser fetches each remote image from the sender's server,
which tells the sender that the message was opened. That is Mail Sifter's policy for
ordinary mail (see its decision
`2026-09-04-ordinary-mail-loads-images-and-warned-mail-keeps-them-blocked`). An app that
shows mail somewhere other than a deliberate open — a hover card, a list, a prefetch — must
not mount the viewer there.

The `ms-` names inside the document (`data-ms-src`, `ms-plain-text`,
`mail-sifter-frame-scroll`, and the rest) are the wire format between Mail Sifter's
sanitizer, the frame and its observers. They moved here unchanged so the observer hashes and
Mail Sifter's rendering did not change. Renaming one is a coordinated change in the
sanitizer, this package, and every consumer.

## Use

```tsx
import "@charcuterie/email-viewer/styles.css"
import {
  EmailAttachmentList,
  EmailImageNotice,
  EmailViewer,
  hasImageSafetyWarning,
  shouldLoadRemoteImages,
} from "@charcuterie/email-viewer"

// Mount one MessageView per message: <MessageView key={body.itemId} body={body} … />
const MessageView = ({ body, subject, attachments }) => {
  // Keep only the reader's own "Load images" press, for this message.
  const [isLoadPressed, setIsLoadPressed] = useState(false)
  // Work the permission out on every render, from the body you have now. Sender trust
  // can change while the message stays open, and the next read must change what loads.
  const hasLoadedImages =
    body.remoteImageCount > 0 && (isLoadPressed || shouldLoadRemoteImages(body))

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {body.remoteImageCount > 0 && !hasLoadedImages && hasImageSafetyWarning(body) ? (
          <EmailImageNotice
            remoteImageCount={body.remoteImageCount}
            onLoadImages={() => setIsLoadPressed(true)}
          />
        ) : null}
        <EmailViewer
          message={body}
          hasLoadedImages={hasLoadedImages}
          isScaledToFit
          title={`Message body: ${subject}`}
          masthead={<h2>{subject}</h2>}
        />
      </div>
      <EmailAttachmentList attachments={attachments} icon={<Paperclip />} />
    </>
  )
}
```

Do not compute the permission once in a `useState` initializer. A later read of the same
message, after its sender's trust changed, would then keep the old answer. Key the
component by the message, so a new message never inherits another one's "Load images"
press.

The viewer is `flex-1` inside a flex column: give its parent a height. Its markup is
Tailwind, so the consumer's stylesheet must also scan this package:

```css
@import "@charcuterie/email-viewer/styles.css";
@source "../node_modules/@charcuterie/email-viewer/dist";
```

## Release

This package is **not published to npm** (a new npm package needs a manual first publish).
It ships as a versioned archive in a Forgejo generic package registry, the same way
`@charcuterie/model-viewer` does, and a consumer depends on it by URL. With an example
registry host and owner:

```json
"@charcuterie/email-viewer": "https://git.example.com/api/packages/<owner>/generic/email-viewer/0.1.0/email-viewer.tar.gz"
```

Each consumer's own repository records the registry it actually uses.

From a clean, committed checkout of the released commit:

```sh
pnpm build
cd packages/email-viewer
./release.sh /tmp/email-viewer.tar.gz          # version from package.json
./release.sh /tmp/email-viewer.tar.gz 0.1.0-rc.1  # a release candidate
```

The archive holds `dist`, this README, the license, a manifest with no workspace
dependencies, and `SOURCE_COMMIT`. Upload it with a `PUT` to
`/api/packages/<owner>/generic/email-viewer/<version>/email-viewer.tar.gz` on the registry, then
download it again and compare the SHA-256 before a consumer pins it.
