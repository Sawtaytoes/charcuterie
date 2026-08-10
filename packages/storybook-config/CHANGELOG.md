# @charcuterie/storybook-config

## 0.2.1

### Patch Changes

- Updated dependencies [d99efca]
  - @charcuterie/tokens@1.4.0

## 0.2.0

### Minor Changes

- e3a7ebe: Add `@charcuterie/storybook-config/testing` — `FREEZE_MOTION_CSS` and `freezeMotion(document)`,
  the motion/caret/scroll freeze that keeps an automated look at a story deterministic.

  It ships as its own subpath rather than from the Node-half barrel so the string never
  reaches a browser bundle: the built Storybook a developer opens contains neither the rule
  nor the injector, because **motion is part of the design and freezing it in the dev server
  would hide the thing being reviewed**.

  Consumed by both of this repo's automated suites — the VRT capture (which already had a
  local copy of the rule, now deduplicated) and the `ui-dom` Vitest project (which had
  nothing). See
  `docs/decisions/2026-08-10-automated-suites-freeze-motion-fonts-and-post-mount-effects.md`.

## 0.1.4

### Patch Changes

- Updated dependencies [a41e5ae]
  - @charcuterie/tokens@1.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [a4c9286]
  - @charcuterie/tokens@1.2.0

## 0.1.2

### Patch Changes

- Updated dependencies [fe06d02]
  - @charcuterie/tokens@1.1.3

## 0.1.1

### Patch Changes

- Updated dependencies [7ed1bda]
  - @charcuterie/tokens@1.1.2

## 0.1.0

### Minor Changes

- Initial release. Extracts the fleet's shared Storybook setup —
  theme-axis toolbars (scheme · variant · density), the first-paint
  seed, the a11y + controls defaults, the GFM docs addon, and the
  Tailwind `viteFinal` — out of the four hand-copied `.storybook/`
  directories it had spread to (`packages/docs`, gallery-downloader,
  rip-deck, and mux-magic's addon-themes variant) into one package.
