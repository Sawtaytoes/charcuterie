# M5b — castkit, the second consumer

**Date:** 2026-07-31
**Branch:** `castkit@feat/charcuterie` — **held, not merged.** The unblock is one
dependency line per package, and it is closer than M5's was: the packages **publish now**
(`@charcuterie/tokens@0.1.0`, `@charcuterie/ui@0.1.0`, OIDC trusted publishing), so this
becomes a version range the moment the pending Version Packages PR ships the ePaper fix as
`0.2.0`.

**Supersedes the plan where they disagree.**

## What the plan asked for, and what happened

| Proof | Result |
| --- | --- |
| Inventory `inkcast` and `panelcast` first | ✅ **Neither is a third surface.** Both are castkit. See below. |
| slatecast stays under 60 KB gz | ✅ **19.7 KB gz**, up from 13.7. 33% of budget. |
| `packages/conformance` builds all profiles in CI | ❌ **Not done, and the package does not exist.** `@charcuterie/logic` has a `src/conformance/` adapter suite from M2, which is a different thing — it proves the hooks behave identically on core/React/Preact, not that every *token profile* builds. Carried forward. **Resolved in M6:** [it is not a package](decisions/2026-07-31-conformance-is-not-a-package.md) — every assertion it was to make now lives in a gate that already runs. |

Two the plan did not ask for:

- **Colour literals across the two migrated packages: 24 → 1.** The survivor is the
  `rgb()` `accentColor.ts` computes from album art, which is a measurement rather than a
  design choice.
- **slatecast `aria-*` 10 → 15, `role` 0 → 1**, the role being the seek bar finally
  being one of the two widgets it is.

## The inventory, since the plan flagged it as unknown

Neither name is a repo, and neither needs anything from the library that castkit is not
already asking for:

- **`inkcast`** is castkit's *image* mode, and the name the monorepo used to have. The
  device-side code is `device-client/` — Python receivers and ESPHome YAML for the M5Paper.
  **It has no UI at all**; the pixels it displays are `@castkit/views`, already in scope.
- **`panelcast`** was the working name for the custom Music Assistant controller in
  `home-displays`. It was built as **Slatecast**, castkit's browser mode, and the
  home-displays docs record the supersession. Already in scope.

So M5b's surface count is three, not five: `views` (Satori/ePaper), `slatecast`
(Preact kiosk), and `web` (a React dev-preview harness, deliberately untouched — see
below).

## The finding, and it is the one that justifies consumer milestones

**Charcuterie's Spectra 6 palette was invented.** `#D02F2A`, `#E8C11C`, `#2B4C9B`,
`#2E7D46`, and `#FFFFFF` for the paper — plausible primaries, and not one of them is a
colour castkit's quantizer maps 1:1, so none of the six survived a render. The profile's
own docstring explained why that is fatal, directly above six values that all had it.

The paper is the bigger miss. **An E6 panel cannot produce `#FFFFFF`.** It emits
`#A1A4A5` ink; the fleet renders at `saturation` 0.5, targeting `#D0D2D2`. Every contrast
number ever computed for the profile was against a white the hardware never shows.

Measured against the emitted ink:

| emitted | on paper | black on it |
| --- | --- | --- |
| black `#000000` | — | — |
| paper `#A1A4A5` | — | 8.37 ✅ |
| yellow `#D0BE47` | 1.33 ✗ | 11.14 ✅ |
| red `#9C484B` | 2.43 ✗ | 3.44 ✗ |
| blue `#3D3B5E` | 4.21 ✗ | 1.99 ✗ |
| green `#3A5B46` | 3.03 ✗ | 2.76 ✗ |

Kevin's call was **exempt ePaper from the gate and fix the hexes** — enforcing AA would
reduce a six-ink panel to black and yellow, and WCAG's maths is for emissive displays, not
a reflective panel read across a room
([decision](decisions/2026-07-31-epaper-is-exempt-from-the-contrast-gate.md)). Merged to
`v2` ahead of this branch, with a changeset, so castkit can depend on a version.

**One claim in that record was too strong and got measured instead of assumed.** "An
off-palette colour dithers" is not what happens to a flat field: pushed through
`ditherToPanel` with floyd-steinberg, `#FFFFFF` comes out as `#D0D2D2` and `#1F4FD0` as
`#1F1EAF`, **one distinct output colour each**, because error diffusion in a flat region
has nowhere to put the residual. The cost is at edges and gradients — and, decisively, in
the fact that the authored value is never the value on the panel, so every judgement made
about it is about a colour nobody sees. Which is precisely what happened to the contrast
numbers.

## The wall: the component layer does not reach this consumer

`@charcuterie/ui` is React. `@castkit/slatecast` is **Preact under a 60 KB gz budget**.
So the consumer with the most hand-rolled UI in the fleet — six `.idle` empty states, its
own transport buttons, its own seek bar, its own queue rows — **got tokens and logic and
no components at all**.

This is not an oversight and it is not fixed by trying harder:

- `preact/compat` would work and costs weight, on the one consumer that has a written
  budget. It is also a second React-shaped indirection inside an app whose whole thesis is
  not having one.
- Porting components to a framework-free core is the real answer and is a milestone, not a
  paragraph. `@charcuterie/logic` already did exactly that and is why the *state* layer
  reached here at all.

**M5's rule holds and produced nothing this time.** A consumer milestone adds the
components the consumer duplicates — and every shape slatecast duplicates is one it cannot
consume. `EmptyState` would have deleted six `.idle` blocks; it is React. So M5b added
zero components, and that is the finding rather than a shortfall.

The layers that *did* reach it both did so through seams that were designed for this repo
by name: `variables.css` exists for a plain-CSS consumer with no Tailwind, and
`createStoreFromSignals`'s docstring names slatecast as the reason the store seam exists.
Both worked first try.

## What each surface became

| Surface | What it was | What it is |
| --- | --- | --- |
| `@castkit/views` | `#ffffff`/`#000000` in the shared panel root, `#1f4fd0` in four clock and agenda views, `rgb(255, 0, 0)` in the poster | `@charcuterie/tokens/epaper` resolved literals. `getAccentColour` takes an **intent**, not a hex — on a six-ink panel the intent scale *is* the ink set, so the mono collapse became a property of the profile instead of a ternary each view could forget. |
| `@castkit/slatecast` | Five hardcoded hexes on `:root`, light mode on `.stage` | Five **aliases** onto the tokens. Aliasing rather than rewriting ~40 usages keeps `--accent` locally overridable, which `NowPlaying` needs when it repaints the accent from album art. |
| `slatecast`'s scheme | `data-theme` on `.stage` | `data-scheme` + `data-density="kiosk"` on `<html>`, stamped by the server at first paint. |
| `slatecast`'s socket | `isConnected = signal(false)` | `createStatus(connectionTransitions)` on a signal store. |
| `slatecast`'s seek bar | a bare `<div>` | `role="progressbar"` touchless, `role="slider"` on touch, with `aria-valuetext`. |
| `♪` in two placeholders | a font glyph | a path the app owns. |
| `@castkit/web` | inline styles, 2 hexes | **unchanged, deliberately.** |

### Three bugs that came out of reading the decisions

1. **Light mode never reached the page behind the stage.** `--bg` was defined on `:root`
   and overridden only on `.stage[data-theme="light"]`, but `html, body` read `--bg` too.
   Nobody saw it because the stage covers the viewport — it would have shown up the first
   time a view did not fill the panel. Moving the switch to `<html>` fixed it as a side
   effect of needing `:root` to carry `data-scheme`.
2. **`♪` contradicted the app's own rule.** `NowPlaying` draws its transport icons as
   owned SVG paths, with a comment explaining that WPE and cage ship no emoji font so
   glyphs render as tofu. Two placeholders then spelled a music note as text. Same rule,
   two misses — `@charcuterie/ui`'s no-symbol-glyphs record arriving as a bug report
   rather than as advice.
3. **The seek bar was neither widget.** Invisible to a screen reader, and unreachable by
   `getByRole(role, { name })` — which is the query the fleet's agents are meant to drive
   these panels with, and the reason the accessibility work is in the plan at all.

## What the consumer wants back from the library

Three asks, in order of how much they cost:

1. **A per-variant token build.** `variables.css` is every variant x every scheme x every
   density, and slatecast renders exactly one combination — so **5.0 of the 6.0 KB gz it
   added is palettes that can never apply**. Fine against a 60 KB budget with 40 to spare;
   not fine as the pattern for a kiosk. Something like
   `@charcuterie/tokens/variables/daylight.css`, or a build-time subset.
2. **A decision on `transitionTo` into the current state.** `connectionTransitions` has no
   self-transition on `reconnecting`, which is correct — an unchanged state is not a
   transition. But a kiosk retries forever, so the second consecutive failure asks to enter
   `reconnecting` while already there, and `transitionTo` **throws**, which on a wall
   display means a blank panel nobody is standing in front of. Guarded with `is()` here.
   Either every consumer with a retry loop writes that guard, or `transitionTo` treats
   entering the current state as a no-op. The second seems right and is not mine to decide.
3. **The Preact question above**, which is a milestone.

## Not done, deliberately

- **`@castkit/web` was not migrated.** It is a dev-preview harness — five files, inline
  styles, no stylesheet and no Tailwind — whose job is rendering `@castkit/views` at
  native panel sizes on a desktop. Adopting `@charcuterie/ui` there means introducing
  Tailwind to a developer tool. Its two hexes are `#999` and `#333` on a caption and a
  frame border.
- **Atkinson Hyperlegible stays.** It was chosen for this hardware — low-acuity reading at
  a distance, after a dither eats the fine detail — and `fitText` is calibrated to its
  average glyph advance. Charcuterie ships tokens here, not a typeface decision.
- **The optimistic-mutation machine was not converted.** The plan lists castkit's
  `predicted → confirmed | timed-out` as a `Status` candidate and it is not one: it is a
  *field overlay* — a `Partial<NowPlayingData>` merged into a computed and expired by a
  timer — not an ordered lifecycle with one current state. `createStatus` would model the
  timer and lose the overlay, which is the part that does the work. `statusMachines.ts`
  already says four of the six listed lifecycles are the app's own domain; this is the
  evidence for one of them.

## Ordinary caveats

- **`yarn lint` is red on castkit `master`**, and was before this branch: two
  `noNonNullAssertion` in `packages/server/src/homeAssistant/browserDiscovery.test.ts`,
  two `id-length` in `packages/core`, and one `naming-convention` on `inFlight` in
  `packages/server/src/state/renderTokenStore.ts`. None is in this diff. Biome and ESLint
  are clean over `packages/views` and `packages/slatecast`.
- **`@castkit/slatecast` pinned `playwright` exactly at `1.61.1`**, which dragged the whole
  workspace to Chromium build 1228 while the sandbox bakes 1234 — so every slatecast
  browser-mode test aborted before it ran. No decision records that pin and both siblings
  use a caret, so it looks incidental. Relaxed to `^1.61.1`; resolves 1.62.1 and reuses the
  baked browser with no download, per the standing fleet decision.
- The branch is **held**, and the hold is now short. `portal:../charcuterie/packages/...`
  plus a root `resolutions` pin on tokens, for the reason M5 documented: `@charcuterie/ui`
  declares its siblings as `workspace:*`, which cannot resolve outside charcuterie's own
  workspace.

## Numbers

| | Before | After |
| --- | --- | --- |
| slatecast bundle, gz | 13.74 KB | 19.74 KB (budget 60) |
| — JS | 12.30 KB | 13.53 KB |
| — CSS | 1.54 KB | 6.58 KB |
| Colour literals (`views` + `slatecast`) | 24 | 1 |
| slatecast `aria-*` | 10 | 15 |
| slatecast `role=` | 0 | 1 |
| Tests | 202 in 28 files | 202 in 28 files, all green |

Test count is flat on purpose: the connection tests were **strengthened rather than
added to** — the reconnect case now asserts the socket passes through `reconnecting`,
which is a state the boolean it replaced could not express.
