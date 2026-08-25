---
"@charcuterie/ui": minor
---

`MarkdownView` takes `resolveUrl` — re-point a link before it becomes an `href`.

A **relative** path in a fetched or imported document has no meaning to the browser: it
resolves against the page the reader is on, which is the consuming app, and lands on
nothing.

```md
The rule is in [`2026-08-03-listbox-and-combobox`](../../charcuterie/docs/decisions/….md)
```

Only the app knows what that path means. `resolveUrl` is how it says so:

```tsx
<MarkdownView
  label="Instructions"
  resolveUrl={(url) => toAppUrl(url)}   // or undefined to leave it alone
  value={task.description}
/>
```

Three properties worth stating, because each one is a decision rather than an oversight:

- **The scheme guard runs first.** A URL that `safeUrls.ts` refused is not a link by the
  time this would be called, so `javascript:` never reaches the consumer and cannot be
  resurrected by one. What comes *back* is the app's own string and is used as given.
- **Links only.** An image's `src` is not offered. An app that maps a document path to a
  page URL would turn a working image into a broken one, and the `src` is the one URL
  here that has to stay fetchable.
- **Read through a ref.** A resolver written inline in a render is a new function every
  time; rebuilding the view on it would throw away the reader's scroll position.

Under it, `livePreviewOptions` carries the same `resolveUrl`, applied where a link's URL
is pushed into a range — so the anchor's `href`, the editor's click target and a link
inside a table cell all get one answer without any of them knowing it exists.
