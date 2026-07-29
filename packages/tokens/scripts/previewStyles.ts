/**
 * The specimen board's own stylesheet.
 *
 * Every rule here is written against `var(--…)` and nothing else —
 * no literal colour, no literal radius, no literal duration. That
 * constraint is the point of the exercise: if a shape cannot be
 * drawn from the token layer alone, the token layer is missing a
 * role, and M0 is exactly when finding that out is cheap.
 *
 * The first draft broke that rule and it cost something real. The
 * looping animations were written with literal durations
 * (`700ms`, `1300ms`) on the reasoning that a spinner's speed is
 * not a theme decision. It is: the ePaper profile sets every
 * duration to zero, the literals were beyond its reach, and an
 * 800x480 panel that repaints in whole seconds got a sweeping
 * progress bar. Hence `--duration-loop-fast` / `--duration-loop-slow`
 * — and hence the rule is "nothing literal", with no carve-out for
 * values that feel like implementation detail.
 *
 * **Logical properties only.** `padding-inline`, `margin-block`,
 * `inset-inline-start`, `border-inline-start`, `text-align: start`.
 * Never `left`/`right`/`padding-left`. This board is the first
 * fixture the eventual ESLint rule will be tested against, so it
 * has to be clean.
 */

export const previewStyles = `
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background-color: var(--color-surface-base);
  color: var(--color-content-primary);
  font-family: var(--font-sans);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  letter-spacing: var(--tracking-normal);
  -webkit-font-smoothing: antialiased;
}

/* ---------- board scaffolding (not a component) ---------- */

.ch-page { padding-inline: var(--space-6); padding-block: var(--space-6); max-inline-size: 1400px; margin-inline: auto; }
.ch-section { margin-block-end: var(--space-16); }
.ch-section > h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-tight);
  margin-block: 0 var(--space-2);
}
.ch-section > p.ch-lede { color: var(--color-content-secondary); margin-block: 0 var(--space-6); max-inline-size: 68ch; }
.ch-panel {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface-raised);
  padding: var(--space-5);
  margin-block-end: var(--space-4);
}
.ch-panel > h3 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-content-muted);
  margin-block: 0 var(--space-4);
}
.ch-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
.ch-stack { display: flex; flex-direction: column; gap: var(--space-3); }
.ch-caption { font-size: var(--font-size-xs); color: var(--color-content-muted); }

/* Contrast numbers, printed next to the thing they describe. */
.ch-metric {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-content-muted);
  white-space: nowrap;
}
.ch-metric[data-pass="false"] { color: var(--color-intent-danger-content); font-weight: var(--font-weight-semibold); }

/* ---------- Button ---------- */

.ch-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--control-gap-md);
  block-size: var(--control-height-md);
  min-inline-size: var(--control-height-md);
  padding-inline: var(--control-padding-inline-md);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--tracking-normal);
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}
.ch-button--sm { block-size: var(--control-height-sm); padding-inline: var(--control-padding-inline-sm); font-size: var(--font-size-sm); }
.ch-button--lg { block-size: var(--control-height-lg); padding-inline: var(--control-padding-inline-lg); font-size: var(--font-size-lg); }

.ch-button--primary { background-color: var(--color-intent-accent-solid); color: var(--color-intent-accent-on-solid); }
.ch-button--primary:hover, .ch-button--primary.is-forced-hover { background-color: var(--color-intent-accent-solid-hover); }

.ch-button--secondary { background-color: var(--color-surface-raised); color: var(--color-content-primary); border-color: var(--color-border-strong); }
.ch-button--secondary:hover, .ch-button--secondary.is-forced-hover { background-color: var(--color-intent-neutral-surface-hover); }

.ch-button--ghost { background-color: transparent; color: var(--color-content-secondary); }
.ch-button--ghost:hover, .ch-button--ghost.is-forced-hover { background-color: var(--color-intent-neutral-surface); color: var(--color-content-primary); }

.ch-button--danger { background-color: var(--color-intent-danger-solid); color: var(--color-intent-danger-on-solid); }
.ch-button--danger:hover, .ch-button--danger.is-forced-hover { background-color: var(--color-intent-danger-solid-hover); }

.ch-button:focus-visible, .ch-button.is-forced-focus {
  outline: var(--focus-ring-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-ring-offset);
}
.ch-button.is-forced-active { transform: translateY(1px); }
.ch-button:disabled, .ch-button.is-disabled {
  background-color: var(--color-intent-neutral-surface);
  color: var(--color-content-disabled);
  border-color: var(--color-border-subtle);
  cursor: not-allowed;
}

/* Icon-only. The fleet has three strategies for this and no
   accessible name in any of them; here the name is required. */
.ch-icon-button {
  inline-size: var(--control-height-md);
  padding-inline: 0;
  min-inline-size: var(--control-min-touch-target);
  min-block-size: var(--control-min-touch-target);
}

/* ---------- Spinner + Skeleton (zero exist fleet-wide) ---------- */

.ch-spinner {
  inline-size: 1.15em;
  block-size: 1.15em;
  border: 2px solid var(--color-border-strong);
  border-block-start-color: var(--color-intent-accent-solid);
  border-radius: var(--radius-full);
  animation: ch-spin var(--duration-loop-fast) linear infinite;
  flex: none;
}
.ch-button .ch-spinner { border-color: currentColor; border-block-start-color: transparent; opacity: 0.85; }
@keyframes ch-spin { to { transform: rotate(360deg); } }

.ch-skeleton {
  background-color: var(--color-intent-neutral-surface);
  border-radius: var(--radius-sm);
  block-size: 0.85rem;
  position: relative;
  overflow: hidden;
}
.ch-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    to inline-end,
    transparent,
    var(--color-intent-neutral-surface-hover),
    transparent
  );
  animation: ch-shimmer var(--duration-loop-slow) var(--easing-standard) infinite;
}
@keyframes ch-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .ch-spinner, .ch-skeleton::after { animation: none; }
}

/* ---------- Badge / StatusPill ---------- */

.ch-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding-inline: var(--space-2);
  padding-block: 0.15em;
  border: 1px solid;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
.ch-badge--neutral { background-color: var(--color-intent-neutral-surface); border-color: var(--color-intent-neutral-border); color: var(--color-intent-neutral-content); }
.ch-badge--accent  { background-color: var(--color-intent-accent-surface);  border-color: var(--color-intent-accent-border);  color: var(--color-intent-accent-content); }
.ch-badge--success { background-color: var(--color-intent-success-surface); border-color: var(--color-intent-success-border); color: var(--color-intent-success-content); }
.ch-badge--warning { background-color: var(--color-intent-warning-surface); border-color: var(--color-intent-warning-border); color: var(--color-intent-warning-content); }
.ch-badge--danger  { background-color: var(--color-intent-danger-surface);  border-color: var(--color-intent-danger-border);  color: var(--color-intent-danger-content); }
.ch-badge--info    { background-color: var(--color-intent-info-surface);    border-color: var(--color-intent-info-border);    color: var(--color-intent-info-content); }

.ch-dot { inline-size: 0.5em; block-size: 0.5em; border-radius: var(--radius-full); background-color: currentColor; flex: none; }

/* ---------- ProgressBar ---------- */

.ch-progress {
  block-size: 0.5rem;
  inline-size: 100%;
  background-color: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.ch-progress__fill { block-size: 100%; border-radius: var(--radius-full); transition: inline-size var(--duration-slow) var(--easing-standard); }
.ch-progress__fill--running { background-color: var(--color-intent-accent-solid); }
.ch-progress__fill--done    { background-color: var(--color-intent-success-solid); }
.ch-progress__fill--failed  { background-color: var(--color-intent-danger-solid); }
.ch-progress__fill--warning { background-color: var(--color-intent-warning-solid); }

/* Indeterminate is a sweep, not a fill. On ripdeck this state is
   the ~25s AACS/BD+ preamble: a full bar would read as finished
   and an empty one as wedged. It is neither. */
.ch-progress--indeterminate { position: relative; }
.ch-progress--indeterminate::after {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 35%;
  border-radius: var(--radius-full);
  background-color: var(--color-intent-accent-solid);
  animation: ch-sweep var(--duration-loop-slow) var(--easing-standard) infinite;
}
@keyframes ch-sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(340%); }
}
@media (prefers-reduced-motion: reduce) {
  .ch-progress--indeterminate::after { animation: none; inline-size: 100%; background-image: var(--ch-hatch); background-color: transparent; }
}

/* The static stand-in for anything that would otherwise move.
   Hard colour stops only — no gradient interpolation and no
   opacity — so it survives a six-colour panel that would dither
   anything in between into a smear. Reads as "indefinite" rather
   than as a percentage, which an empty or full bar both fail at. */
:root { --ch-hatch: repeating-linear-gradient(45deg, var(--color-content-muted) 0 4px, transparent 4px 8px); }

/* ---------- ePaper: remove motion, don't just shorten it -------

   Zeroing --duration-* is necessary but not sufficient. A
   transition with a 0ms duration genuinely does nothing, but an
   animation with a 0ms duration still holds keyframe zero — for
   the indeterminate sweep that is a bar parked off-screen, i.e. an
   empty track, i.e. exactly the "wedged drive" misreading the
   component exists to avoid.

   So animation is switched off outright and every moving
   affordance owes a static fallback. Opacity is unavailable here
   too, which rules out the usual dimming trick. */

[data-epaper] .ch-spinner,
[data-epaper] .ch-skeleton::after,
[data-epaper] .ch-live .ch-dot,
[data-epaper] .ch-progress--indeterminate::after {
  animation: none;
}
[data-epaper] .ch-progress--indeterminate::after {
  inline-size: 100%;
  background-color: transparent;
  background-image: var(--ch-hatch);
}
[data-epaper] .ch-skeleton::after { background-image: none; }
[data-epaper] .ch-button .ch-spinner { opacity: 1; }
[data-epaper] .ch-tile:hover .ch-tile__art { transform: none; }

/* ---------- Card ---------- */

.ch-card {
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-low);
  padding: var(--space-4);
  container-type: inline-size;
}
.ch-card__title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-lg); letter-spacing: var(--tracking-tight); }
.ch-card__meta { color: var(--color-content-secondary); font-size: var(--font-size-sm); }

/* The only honest way to demonstrate a container query: identical
   markup, three widths, side by side. Viewport resizing cannot
   show this. */
@container (min-width: 26rem) {
  .ch-card__header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
}

/* ---------- Bay row (ripdeck) ---------- */

.ch-bay { display: flex; flex-direction: column; gap: var(--space-2); padding-block: var(--space-3); border-block-end: 1px solid var(--color-border-default); }
.ch-bay:last-child { border-block-end: none; }
.ch-bay__head { display: flex; align-items: baseline; gap: var(--space-3); flex-wrap: wrap; }
.ch-bay__name { font-family: var(--font-mono); font-size: var(--font-size-xs); color: var(--color-content-muted); flex: none; }
.ch-bay__disc { font-weight: var(--font-weight-medium); flex: 1 1 12rem; min-inline-size: 0; }
.ch-bay__detail { font-size: var(--font-size-sm); color: var(--color-content-secondary); }
.ch-verdict {
  font-size: var(--font-size-sm);
  padding-inline-start: var(--space-3);
  border-inline-start: 3px solid;
  color: var(--color-content-secondary);
}
.ch-verdict--disc { border-inline-start-color: var(--color-intent-warning-border); }
.ch-verdict--hardware { border-inline-start-color: var(--color-intent-danger-border); }
.ch-verdict--ok { border-inline-start-color: var(--color-intent-success-border); }
.ch-verdict--unmeasured { border-inline-start-color: var(--color-border-default); }

/* ---------- Step row (mux-magic) ---------- */

.ch-step { display: flex; align-items: center; gap: var(--space-3); padding-block: var(--space-2); border-block-end: 1px solid var(--color-border-subtle); }
.ch-step:last-child { border-block-end: none; }
.ch-step__name { font-family: var(--font-mono); font-size: var(--font-size-sm); flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-step__detail { font-size: var(--font-size-xs); color: var(--color-content-muted); flex: 1 1 auto; text-align: end; }

/* ---------- EmptyState ---------- */

.ch-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding-block: var(--space-10);
  padding-inline: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface-sunken);
}
.ch-empty__icon { font-size: var(--font-size-2xl); color: var(--color-content-muted); }
.ch-empty__title { font-weight: var(--font-weight-semibold); }
.ch-empty__body { color: var(--color-content-secondary); font-size: var(--font-size-sm); max-inline-size: 44ch; }

/* ---------- LiveStatusIndicator ---------- */

.ch-live { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); }
.ch-live__label { font-weight: var(--font-weight-medium); }
.ch-live__detail { color: var(--color-content-muted); font-size: var(--font-size-xs); }
.ch-live--connecting .ch-dot, .ch-live--reconnecting .ch-dot { animation: ch-pulse var(--duration-loop-slow) var(--easing-standard) infinite; }
@keyframes ch-pulse { 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .ch-live .ch-dot { animation: none; } }

/* ---------- Tabs ---------- */

.ch-tabs { display: flex; gap: var(--space-1); border-block-end: 1px solid var(--color-border-default); }
.ch-tab {
  appearance: none;
  background: none;
  border: none;
  border-block-end: 2px solid transparent;
  margin-block-end: -1px;
  padding-inline: var(--space-3);
  padding-block: var(--space-2);
  font-family: inherit;
  font-size: var(--font-size-md);
  color: var(--color-content-secondary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--easing-standard), border-color var(--duration-fast) var(--easing-standard);
}
.ch-tab[aria-selected="true"] { color: var(--color-content-primary); border-block-end-color: var(--color-intent-accent-solid); font-weight: var(--font-weight-medium); }
.ch-tab:hover { color: var(--color-content-primary); }
.ch-tab:focus-visible { outline: var(--focus-ring-width) solid var(--color-focus-ring); outline-offset: calc(var(--focus-ring-offset) * -1); border-radius: var(--radius-sm); }

/* ---------- MediaTile ---------- */

.ch-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: var(--space-4); }
.ch-tile { display: flex; flex-direction: column; gap: var(--space-2); }
.ch-tile__art {
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-md);
  background-color: var(--color-intent-neutral-surface);
  border: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-content-muted);
  font-size: var(--font-size-xs);
  overflow: hidden;
  transition: border-color var(--duration-fast) var(--easing-standard), transform var(--duration-normal) var(--easing-standard);
}
.ch-tile:hover .ch-tile__art { border-color: var(--color-intent-accent-border); transform: translateY(-2px); }
.ch-tile__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); line-height: var(--line-height-tight); }
.ch-tile__meta { font-size: var(--font-size-xs); color: var(--color-content-muted); }

/* ---------- Modal over backdrop ---------- */

.ch-modal-demo {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-block-size: 17rem;
  border: 1px solid var(--color-border-subtle);
  background-color: var(--color-surface-base);
  padding: var(--space-4);
}
.ch-backdrop { position: absolute; inset: 0; background-color: rgb(0 0 0 / 0.55); }
.ch-modal {
  position: relative;
  margin-inline: auto;
  margin-block-start: var(--space-8);
  max-inline-size: 26rem;
  background-color: var(--color-surface-overlay);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--elevation-high);
  padding: var(--space-5);
}
.ch-modal__title { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-block: 0 var(--space-2); }
.ch-modal__body { color: var(--color-content-secondary); font-size: var(--font-size-sm); margin-block: 0 var(--space-5); }
.ch-modal__actions { display: flex; gap: var(--space-2); justify-content: flex-end; }

/* ---------- Input + LogViewer ---------- */

.ch-input {
  block-size: var(--control-height-md);
  padding-inline: var(--control-padding-inline-md);
  background-color: var(--color-surface-sunken);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-content-primary);
  font-family: inherit;
  font-size: var(--font-size-md);
  inline-size: 100%;
}
.ch-input::placeholder { color: var(--color-content-muted); }
.ch-input:focus-visible { outline: var(--focus-ring-width) solid var(--color-focus-ring); outline-offset: var(--focus-ring-offset); border-color: var(--color-focus-ring); }
.ch-input[aria-invalid="true"] { border-color: var(--color-intent-danger-border); }

.ch-log {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-relaxed);
  background-color: var(--color-surface-sunken);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow-x: auto;
  white-space: pre;
  color: var(--color-content-secondary);
}
.ch-log__line--error { color: var(--color-intent-danger-content); }
.ch-log__line--warn { color: var(--color-intent-warning-content); }

/* ---------- device frames ---------- */

.ch-frames { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start; }
.ch-frame { display: flex; flex-direction: column; gap: var(--space-2); }
.ch-frame__label { font-size: var(--font-size-xs); color: var(--color-content-muted); font-family: var(--font-mono); }
.ch-frame__viewport {
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface-base);
  color: var(--color-content-primary);
  overflow: hidden;
  container-type: inline-size;
}
.ch-frame__viewport--circular { border-radius: 50%; }
.ch-frame__inner { padding: var(--space-3); block-size: 100%; overflow: hidden; }

/* ---------- side-by-side ---------- */

.ch-compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(21rem, 1fr)); gap: var(--space-5); align-items: start; }
.ch-compare__cell {
  background-color: var(--color-surface-base);
  color: var(--color-content-primary);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--font-size-md);
}
.ch-compare__name { font-weight: var(--font-weight-semibold); font-size: var(--font-size-lg); margin-block-end: var(--space-1); }
.ch-compare__desc { font-size: var(--font-size-xs); color: var(--color-content-muted); margin-block-end: var(--space-4); min-block-size: 3.2em; }

/* ---------- contrast table ---------- */

.ch-table { inline-size: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.ch-table th, .ch-table td { text-align: start; padding-block: var(--space-2); padding-inline: var(--space-3); border-block-end: 1px solid var(--color-border-subtle); }
.ch-table th { color: var(--color-content-muted); font-weight: var(--font-weight-medium); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: var(--tracking-wide); }
.ch-table td.ch-num { font-family: var(--font-mono); white-space: nowrap; }
.ch-swatch { display: inline-block; inline-size: 1.6em; block-size: 1em; border-radius: var(--radius-sm); border: 1px solid var(--color-border-default); vertical-align: -0.15em; }
`
