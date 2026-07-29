/**
 * M0 — the theme bake-off.
 *
 * Per `docs/runbooks/ui-design-previews.md`: mock in HTML, serve,
 * `devshare`, owner picks, *then* build.
 *
 * The trick that makes this more than a mockup: **the comparison
 * artifact is generated from candidate token files**, not drawn by
 * hand. Nothing here is bespoke HTML pretending to be a theme —
 * every colour, radius, and duration on the page arrives through
 * `variables.css`, which `buildTokens.ts` generated from the same
 * `variants/*.ts` the library will ship. So the winner is not a
 * picture to reimplement later; it is already the theme file.
 *
 * Output is one self-contained `.html` — no build step, no CDN,
 * no framework — which is also what resolves the chicken-and-egg
 * of previewing components before any component exists.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  buildColourProperties,
  buildVariablesCss,
} from "../src/buildCss.ts"
import {
  auditScheme,
  getFailures,
} from "../src/contrastAudit.ts"
import { epaperColours } from "../src/epaper.ts"
import {
  bayRows,
  connectionStates,
  jobSteps,
  logLines,
  posterTiles,
  queueRows,
} from "../src/fixtures/fleetData.ts"
import type { Scheme, Variant } from "../src/types.ts"
import { variants } from "../src/variants/index.ts"
import { previewStyles } from "./previewStyles.ts"

const SCHEMES: Scheme[] = ["dark", "light"]

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

// ---------------------------------------------------------------
// Fixture → intent mapping
// ---------------------------------------------------------------

const STEP_INTENT: Record<string, string> = {
  pending: "info",
  running: "info",
  paused: "warning",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
  skipped: "neutral",
  exited: "accent",
}

const VERDICT_INTENT: Record<string, string> = {
  ok: "success",
  disc: "warning",
  hardware: "danger",
  unmeasured: "neutral",
}

const BAY_FILL: Record<string, string> = {
  done: "done",
  failed: "failed",
  running: "running",
  indeterminate: "running",
  idle: "warning",
}

// ---------------------------------------------------------------
// Icons
//
// Inline SVG, not glyphs. plex-channels uses raw characters
// (`↶`, `↷`, `▶`, `⚙`, `≡`) and this board reproduced the exact
// failure that invites: rendered headless, those code points had
// no glyph in any available font and every icon button came out
// blank. A missing glyph is silent, which is the worst property an
// icon can have.
//
// The library will not own an icon set — `IconButton` takes a
// `ReactNode` — but it does have to prove an icon button works.
// ---------------------------------------------------------------

const icon = (paths: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`

const ICON_REFRESH = icon(
  '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
)

const ICON_SETTINGS = icon(
  '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1"/>',
)

const ICON_INBOX = icon(
  '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
)

// ---------------------------------------------------------------
// Component fragments — every one drawn from tokens alone
// ---------------------------------------------------------------

const renderButtonRow = () => `
<div class="ch-row">
  <button class="ch-button ch-button--primary" type="button">Start rip</button>
  <button class="ch-button ch-button--secondary" type="button">Re-test in bay 2</button>
  <button class="ch-button ch-button--ghost" type="button">Details</button>
  <button class="ch-button ch-button--danger" type="button">Abort</button>
  <button class="ch-button ch-button--primary ch-icon-button" type="button" aria-label="Refresh">${ICON_REFRESH}</button>
</div>
<div class="ch-row" style="margin-block-start: var(--space-3);">
  <button class="ch-button ch-button--primary is-forced-hover" type="button">hover</button>
  <button class="ch-button ch-button--primary is-forced-focus" type="button">focus-visible</button>
  <button class="ch-button ch-button--primary is-forced-active" type="button">active</button>
  <button class="ch-button ch-button--primary" type="button" disabled>disabled</button>
  <button class="ch-button ch-button--primary" type="button"><span class="ch-spinner" aria-hidden="true"></span> loading</button>
  <button class="ch-button ch-button--secondary is-forced-focus" type="button">focus (secondary)</button>
</div>
<div class="ch-row" style="margin-block-start: var(--space-3);">
  <button class="ch-button ch-button--secondary ch-button--sm" type="button">sm</button>
  <button class="ch-button ch-button--secondary" type="button">md</button>
  <button class="ch-button ch-button--secondary ch-button--lg" type="button">lg</button>
  <button class="ch-button ch-button--secondary ch-icon-button" type="button" aria-label="Settings">${ICON_SETTINGS}</button>
  <span class="ch-metric" data-pair="intent.accent.onSolid on intent.accent.solid"></span>
</div>`

const renderBadges = () => `
<div class="ch-row">
  ${[
    "neutral",
    "accent",
    "success",
    "warning",
    "danger",
    "info",
  ]
    .map(
      (intent) =>
        `<span class="ch-badge ch-badge--${intent}"><span class="ch-dot" aria-hidden="true"></span>${intent}</span>`,
    )
    .join("\n  ")}
</div>
<div class="ch-row" style="margin-block-start: var(--space-3);">
  ${jobSteps
    .map(
      (step) =>
        `<span class="ch-badge ch-badge--${
          STEP_INTENT[step.status]
        }">${step.status}</span>`,
    )
    .join("\n  ")}
</div>
<p class="ch-caption" style="margin-block-start: var(--space-3);">
  Real <code>statusClassMap</code> keys from <code>mux-magic/&hellip;/StatusBadge.tsx</code>.<br>
  <span class="ch-metric" data-pair="intent.danger.content on intent.danger.surface"></span>
</p>`

const renderProgress = () => `
<div class="ch-stack">
  <div>
    <div class="ch-caption">determinate &mdash; 68%</div>
    <div class="ch-progress" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100" aria-label="Bay 1 rip progress">
      <div class="ch-progress__fill ch-progress__fill--running" style="inline-size: 68%;"></div>
    </div>
  </div>
  <div>
    <div class="ch-caption">indeterminate &mdash; AACS/BD+ preamble, no measurable progress</div>
    <div class="ch-progress ch-progress--indeterminate" role="progressbar" aria-label="Working, no measurable progress yet"></div>
  </div>
  <div>
    <div class="ch-caption">complete</div>
    <div class="ch-progress" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Bay 5 rip progress">
      <div class="ch-progress__fill ch-progress__fill--done" style="inline-size: 100%;"></div>
    </div>
  </div>
  <div>
    <div class="ch-caption">failed at 12%</div>
    <div class="ch-progress" role="progressbar" aria-valuenow="12" aria-valuemin="0" aria-valuemax="100" aria-label="Bay 4 rip progress">
      <div class="ch-progress__fill ch-progress__fill--failed" style="inline-size: 12%;"></div>
    </div>
  </div>
  <div>
    <div class="ch-caption">threshold &mdash; slow but reading cleanly</div>
    <div class="ch-progress" role="progressbar" aria-valuenow="41" aria-valuemin="0" aria-valuemax="100" aria-label="Bay 3 rip progress">
      <div class="ch-progress__fill ch-progress__fill--warning" style="inline-size: 41%;"></div>
    </div>
  </div>
</div>`

const renderBays = (limit = bayRows.length) =>
  bayRows
    .slice(0, limit)
    .map(
      (row) => `
<div class="ch-bay">
  <div class="ch-bay__head">
    <span class="ch-bay__name">${escapeHtml(row.bay)}</span>
    <span class="ch-bay__disc">${escapeHtml(row.disc)}</span>
    ${
      row.verdict
        ? `<span class="ch-badge ch-badge--${
            VERDICT_INTENT[row.verdict.tone]
          }">${
            row.verdict.confidence ?? row.verdict.tone
          }</span>`
        : `<span class="ch-badge ch-badge--info">ripping</span>`
    }
  </div>
  ${
    row.state === "indeterminate"
      ? `<div class="ch-progress ch-progress--indeterminate" role="progressbar" aria-label="Working, no measurable progress yet"></div>`
      : row.state === "idle"
        ? ""
        : `<div class="ch-progress" role="progressbar" aria-valuenow="${row.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(
            row.bay,
          )} rip progress"><div class="ch-progress__fill ch-progress__fill--${
            BAY_FILL[row.state]
          }" style="inline-size: ${row.percent}%;"></div></div>`
  }
  <div class="ch-bay__detail">${escapeHtml(row.detail)}</div>
  ${
    row.verdict
      ? `<div class="ch-verdict ch-verdict--${row.verdict.tone}">${escapeHtml(
          row.verdict.message,
        )}</div>`
      : ""
  }
</div>`,
    )
    .join("\n")

const renderSteps = (limit = jobSteps.length) =>
  jobSteps
    .slice(0, limit)
    .map(
      (step) => `
<div class="ch-step">
  <span class="ch-badge ch-badge--${
    STEP_INTENT[step.status]
  }">${step.status}</span>
  <span class="ch-step__name">${escapeHtml(
    step.command,
  )}</span>
  <span class="ch-step__detail">${escapeHtml(
    step.detail,
  )}</span>
</div>`,
    )
    .join("\n")

const renderEmptyState = () => `
<div class="ch-empty">
  <div class="ch-empty__icon">${ICON_INBOX}</div>
  <div class="ch-empty__title">No discs queued</div>
  <div class="ch-empty__body">
    Load a disc into any bay and it will appear here. Bay 6 is quarantined and will be skipped.
  </div>
  <button class="ch-button ch-button--secondary ch-button--sm" type="button" style="margin-block-start: var(--space-2);">Clear quarantine</button>
</div>`

const renderLive = () => `
<div class="ch-stack">
  ${connectionStates
    .map(
      (state) => `
  <span class="ch-live ch-live--${state.status}">
    <span class="ch-badge ch-badge--${state.intent}"><span class="ch-dot" aria-hidden="true"></span><span class="ch-live__label">${escapeHtml(
      state.label,
    )}</span></span>
    <span class="ch-live__detail">${escapeHtml(
      state.detail,
    )}</span>
  </span>`,
    )
    .join("\n")}
</div>
<p class="ch-caption" style="margin-block-start: var(--space-3);">
  Four repos hand-roll this differently today. It is also the thing users read most.
</p>`

const renderTabs = () => `
<div class="ch-tabs" role="tablist" aria-label="Rip deck views">
  <button class="ch-tab" role="tab" aria-selected="true" type="button">Bays</button>
  <button class="ch-tab" role="tab" aria-selected="false" type="button">Queue</button>
  <button class="ch-tab" role="tab" aria-selected="false" type="button">Drives</button>
  <button class="ch-tab" role="tab" aria-selected="false" type="button">Log</button>
</div>`

const renderTiles = (limit = posterTiles.length) => `
<div class="ch-tiles">
  ${posterTiles
    .slice(0, limit)
    .map(
      (tile) => `
  <div class="ch-tile">
    <div class="ch-tile__art">${
      tile.isArtworkMissing ? "<span>no artwork</span>" : ""
    }</div>
    <div class="ch-tile__title">${escapeHtml(
      tile.title,
    )}</div>
    <div class="ch-tile__meta">${escapeHtml(
      tile.meta,
    )}</div>
  </div>`,
    )
    .join("\n")}
</div>`

const renderModal = () => `
<div class="ch-modal-demo">
  <div class="ch-bay__detail">Bay 4 &mdash; S&aacute;t&aacute;ntang&oacute; (1994) D1</div>
  <div class="ch-backdrop"></div>
  <div class="ch-modal" role="dialog" aria-modal="true" aria-labelledby="ch-modal-title">
    <h4 class="ch-modal__title" id="ch-modal-title">Abort this rip?</h4>
    <p class="ch-modal__body">
      Bay 4 has retried four times. Aborting discards 12% of the read and releases the drive.
    </p>
    <div class="ch-modal__actions">
      <button class="ch-button ch-button--ghost" type="button">Keep trying</button>
      <button class="ch-button ch-button--danger" type="button">Abort rip</button>
    </div>
  </div>
</div>`

const renderSkeletons = () => `
<div class="ch-stack" style="max-inline-size: 26rem;">
  <div class="ch-skeleton" style="inline-size: 45%;"></div>
  <div class="ch-skeleton" style="inline-size: 100%;"></div>
  <div class="ch-skeleton" style="inline-size: 82%;"></div>
  <div class="ch-row" style="margin-block-start: var(--space-2);">
    <span class="ch-spinner" aria-hidden="true"></span>
    <span class="ch-caption">Neither a Spinner nor a Skeleton exists anywhere in the fleet today.</span>
  </div>
</div>`

const renderLog = () => `
<div class="ch-log" role="log" aria-label="Rip log">${logLines
  .map(
    (line) =>
      `<div class="ch-log__line${
        line.includes("Error") || line.includes("aborted")
          ? " ch-log__line--error"
          : line.includes("retry")
            ? " ch-log__line--warn"
            : ""
      }">${escapeHtml(line)}</div>`,
  )
  .join("")}</div>`

const renderQueue = () => `
<div class="ch-stack">
  ${queueRows
    .map(
      (row) => `
  <div class="ch-step">
    <span class="ch-step__name" style="font-family: var(--font-sans); font-weight: var(--font-weight-medium);">${escapeHtml(
      row.title,
    )}</span>
    <span class="ch-step__detail">${escapeHtml(
      row.meta,
    )}</span>
    ${
      row.isPinned
        ? '<span class="ch-badge ch-badge--accent">pinned</span>'
        : ""
    }
  </div>`,
    )
    .join("\n")}
</div>`

// ---------------------------------------------------------------
// The board
// ---------------------------------------------------------------

const panel = (title: string, body: string) => `
<div class="ch-panel">
  <h3>${title}</h3>
  ${body}
</div>`

const renderFullBoard = () => `
<div class="ch-section">
  <h2>Specimen board</h2>
  <p class="ch-lede">
    Every shape below is drawn from <code>variables.css</code> alone &mdash; no literal colour, radius,
    or duration appears in the board's stylesheet. Switch variant, scheme, and density above: nothing
    re-renders, only three attributes on <code>&lt;html&gt;</code> change.
  </p>
  ${panel("Button &mdash; variants, sizes, and every state", renderButtonRow())}
  ${panel("Spinner &amp; Skeleton", renderSkeletons())}
  ${panel("Badge / StatusPill", renderBadges())}
  ${panel("ProgressBar", renderProgress())}
  ${panel(
    "ripdeck bays &mdash; real verdict text, including a mid-rip and a failure",
    renderBays(),
  )}
  ${panel(
    "mux-magic sequence &mdash; real command names, mid-run",
    renderSteps(),
  )}
  ${panel("LiveStatusIndicator", renderLive())}
  ${panel("Tabs", renderTabs())}
  ${panel("EmptyState", renderEmptyState())}
  ${panel("Modal over backdrop", renderModal())}
  ${panel("MediaTile grid", renderTiles())}
  ${panel("plex-channels queue", renderQueue())}
  ${panel("LogViewer", renderLog())}
  ${panel(
    "Card &mdash; identical markup at three container widths",
    `<div class="ch-row" style="align-items: stretch;">
      ${["15rem", "24rem", "34rem"]
        .map(
          (width) => `
      <div style="inline-size: ${width};">
        <div class="ch-caption" style="margin-block-end: var(--space-2);">container: ${width}</div>
        <div class="ch-card">
          <div class="ch-card__header">
            <span class="ch-card__title">Bay 1</span>
            <span class="ch-badge ch-badge--info">ripping</span>
          </div>
          <div class="ch-card__meta">The Thing (1982) &mdash; 4K UHD</div>
          <div class="ch-progress" style="margin-block-start: var(--space-3);" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100" aria-label="Bay 1 progress">
            <div class="ch-progress__fill ch-progress__fill--running" style="inline-size: 68%;"></div>
          </div>
        </div>
      </div>`,
        )
        .join("")}
    </div>
    <p class="ch-caption" style="margin-block-start: var(--space-3);">
      The header only splits into two columns past 26rem of <em>container</em> width &mdash; not viewport width.
      Resizing the window cannot demonstrate this, which is why the three are shown side by side.
    </p>`,
  )}
  ${panel(
    "Form control &amp; focus",
    `<div class="ch-row" style="align-items: flex-start;">
      <div style="inline-size: 16rem;"><input class="ch-input" placeholder="Filter bays&hellip;" aria-label="Filter bays"></div>
      <div style="inline-size: 16rem;"><input class="ch-input" value="not-a-path" aria-invalid="true" aria-label="Output path"></div>
      <span class="ch-metric" data-pair="border.strong on surface.raised"></span>
    </div>`,
  )}
</div>`

// ---------------------------------------------------------------
// Side-by-side comparison, including the current UIs as controls
// ---------------------------------------------------------------

const renderMiniBoard = () => `
${renderTabs()}
<div style="margin-block-start: var(--space-3);">${renderBays(
  3,
)}</div>
<div style="margin-block-start: var(--space-3);">${renderSteps(
  4,
)}</div>
<div class="ch-row" style="margin-block-start: var(--space-4);">
  <button class="ch-button ch-button--primary" type="button">Start rip</button>
  <button class="ch-button ch-button--secondary" type="button">Details</button>
  <button class="ch-button ch-button--danger" type="button">Abort</button>
</div>
<div style="margin-block-start: var(--space-4);">${renderTiles(
  3,
)}</div>`

/**
 * The runbook mandates showing the current UI alongside the
 * candidates, and it is right to: "is this actually better?" is
 * the only question M0 has to answer, and it cannot be answered
 * against a blank page.
 *
 * These two panels are the only place in the file with literal
 * colours, because they are quoting today's hardcoded values
 * verbatim rather than expressing a token.
 */
const renderControls = () => `
<div class="ch-compare__cell" style="background: #0f172a; color: #f1f5f9; border-color: #1e293b; font-family: ui-sans-serif, system-ui, sans-serif;">
  <div class="ch-compare__name">Today: mux-magic</div>
  <div class="ch-compare__desc" style="color: #94a3b8;">
    <code>tailwindStyles.css</code> &mdash; four lines hardcoding <code>#0f172a</code> / <code>#f1f5f9</code>.
    No <code>tailwind.config</code>, no <code>@theme</code>, no custom property, zero <code>dark:</code> variants.
  </div>
  <div style="display:flex; gap:6px; flex-wrap:wrap; margin-block-end:12px;">
    <span style="background:#172554; color:#93c5fd; font-size:12px; padding:2px 8px; border-radius:9999px;">pending</span>
    <span style="background:#172554; color:#60a5fa; font-size:12px; padding:2px 8px; border-radius:9999px;">running</span>
    <span style="background:#451a03; color:#fcd34d; font-size:12px; padding:2px 8px; border-radius:9999px;">paused</span>
    <span style="background:#022c22; color:#34d399; font-size:12px; padding:2px 8px; border-radius:9999px;">completed</span>
    <span style="background:#450a0a; color:#f87171; font-size:12px; padding:2px 8px; border-radius:9999px;">failed</span>
    <span style="background:#334155; color:#cbd5e1; font-size:12px; padding:2px 8px; border-radius:9999px;">cancelled</span>
  </div>
  <div style="font-family: ui-monospace, monospace; font-size:13px; color:#cbd5e1; line-height:2;">
    remuxToMkv<br>changeTrackLanguages<br>nameAnimeEpisodesAniDB
  </div>
  <div style="margin-block-start:14px; display:flex; gap:8px;">
    <button style="background:#1e293b; color:#f1f5f9; border:1px solid #334155; border-radius:6px; padding:8px 14px; font:inherit; font-size:14px;">Run</button>
    <button style="background:#7f1d1d; color:#fecaca; border:none; border-radius:6px; padding:8px 14px; font:inherit; font-size:14px;">Cancel</button>
  </div>
</div>

<div class="ch-compare__cell" style="background: #16181d; color: #e7e9ee; border-color: #333846; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
  <div class="ch-compare__name">Today: plex-channels</div>
  <div class="ch-compare__desc" style="color: #9aa1b1;">
    Has CSS variables, but re-declares the same background/color/border/border-radius quartet across
    six selectors. No build step; <code>app.js</code> is 2,244 raw ES-module lines.
  </div>
  <div style="background:#1e2129; border:1px solid #333846; border-radius:8px; padding:12px; margin-block-end:12px;">
    <div style="font-weight:600;">Cowboy Bebop</div>
    <div style="color:#9aa1b1; font-size:14px;">S01E12 &middot; Jupiter Jazz (Part 1) &middot; 24m</div>
  </div>
  <div style="background:#1e2129; border:1px solid #333846; border-radius:8px; padding:12px; margin-block-end:12px;">
    <div style="font-weight:600;">The Prisoner</div>
    <div style="color:#9aa1b1; font-size:14px;">S01E06 &middot; The General &middot; 49m</div>
  </div>
  <div style="display:flex; gap:8px; align-items:center;">
    <button style="background:#262a34; color:#e7e9ee; border:1px solid #333846; border-radius:8px; padding:8px 14px; font:inherit;">Undo</button>
    <span style="color:#5ac27a; font-size:14px;">&#9679; connected</span>
    <span style="color:#e0574b; font-size:14px;">&#9679; failed</span>
    <span style="color:#e5a00d; font-size:14px;">&#9679; pending</span>
  </div>
</div>`

const renderCompare = () => `
<div class="ch-section">
  <h2>All four, side by side</h2>
  <p class="ch-lede">
    The same board, the same data, four token files &mdash; plus the two current UIs as controls.
    Each cell carries its own <code>data-variant</code>/<code>data-scheme</code>/<code>data-density</code>,
    which is exactly how a real app will carry them.
  </p>
  <div class="ch-compare" id="ch-compare">
    ${variants
      .map(
        (variant) => `
    <div class="ch-compare__cell" data-variant="${variant.name}" data-scheme="dark" data-density="comfortable" data-compare-cell>
      <div class="ch-compare__name">${escapeHtml(
        variant.title,
      )}</div>
      <div class="ch-compare__desc">${escapeHtml(
        variant.description,
      )}</div>
      ${renderMiniBoard()}
    </div>`,
      )
      .join("")}
    ${renderControls()}
  </div>
</div>`

// ---------------------------------------------------------------
// True-dimension device frames
// ---------------------------------------------------------------

const FRAMES = [
  {
    label: "480x480 - HyperPixel Round (kiosk Pi)",
    width: 480,
    height: 480,
    isCircular: true,
    density: "kiosk",
    body: `
      <div style="padding-inline: var(--space-8); text-align: center;">
        <div class="ch-badge ch-badge--info" style="margin-block-end: var(--space-2);"><span class="ch-dot"></span>ripping</div>
        <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">Bay 1</div>
        <div class="ch-bay__detail">The Thing (1982)</div>
        <div class="ch-progress" style="margin-block: var(--space-3);" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100" aria-label="Bay 1 progress">
          <div class="ch-progress__fill ch-progress__fill--running" style="inline-size: 68%;"></div>
        </div>
        <div class="ch-caption">12m left</div>
        <button class="ch-button ch-button--danger" style="margin-block-start: var(--space-3);" type="button">Abort</button>
      </div>`,
  },
  {
    label: "1024x768 - tablet",
    width: 1024,
    height: 500,
    isCircular: false,
    density: "comfortable",
    body: `${renderTabs()}<div style="margin-block-start: var(--space-3);">${renderBays(
      3,
    )}</div>`,
  },
  {
    label: "1920x1080 - desktop (cropped)",
    width: 900,
    height: 420,
    isCircular: false,
    density: "compact",
    body: `<div style="margin-block-start: var(--space-2);">${renderSteps(
      8,
    )}</div>`,
  },
  {
    label: "xander - TV across a room (kiosk density)",
    width: 640,
    height: 420,
    isCircular: false,
    density: "kiosk",
    body: `<div>${renderQueue()}</div>`,
  },
]

const renderFrames = () => `
<div class="ch-section">
  <h2>True target dimensions</h2>
  <p class="ch-lede">
    Each frame is its real pixel size and carries its own density, because a direction that reads well
    at 1920 and vanishes on a 480px circular panel has not actually won. These frames follow the
    variant and scheme selected above.
  </p>
  <div class="ch-frames">
    ${FRAMES.map(
      (frame) => `
    <div class="ch-frame">
      <div class="ch-frame__label">${escapeHtml(
        frame.label,
      )}</div>
      <div class="ch-frame__viewport${
        frame.isCircular
          ? " ch-frame__viewport--circular"
          : ""
      }" data-frame data-density="${frame.density}" data-scheme="dark" style="inline-size: ${frame.width}px; block-size: ${frame.height}px;">
        <div class="ch-frame__inner"${
          frame.isCircular
            ? ' style="display:flex; align-items:center; justify-content:center;"'
            : ""
        }>${frame.body}</div>
      </div>
    </div>`,
    ).join("")}

    <div class="ch-frame">
      <div class="ch-frame__label">800x480 - Spectra 6 ePaper (fixed profile, does not follow the axes)</div>
      <div class="ch-frame__viewport" data-epaper="spectra6" data-density="kiosk" style="inline-size: 800px; block-size: 480px;">
        <div class="ch-frame__inner">
          <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); margin-block-end: var(--space-3);">Rip deck</div>
          ${renderBays(3)}
        </div>
      </div>
    </div>
  </div>
  <p class="ch-caption" style="margin-block-start: var(--space-4);">
    ePaper is a separate profile rather than a scheme, because it removes capabilities instead of
    restyling them: no hover, no opacity, no shadow, no transition, six colours. Note that every
    elevation collapses to <code>none</code> and greys collapse to black &mdash; the
    <em>Layered</em> direction, which separates surfaces with shadow, has nothing left here.
  </p>
</div>`

// ---------------------------------------------------------------
// Contrast report
// ---------------------------------------------------------------

const renderContrastTable = (
  variant: Variant,
  scheme: Scheme,
) => {
  const checks = auditScheme(variant.schemes[scheme])

  const failures = getFailures(checks)

  return `
<details class="ch-panel"${
    failures.length > 0 ? " open" : ""
  }>
  <summary style="cursor: pointer; font-weight: var(--font-weight-semibold);">
    ${escapeHtml(variant.title)} / ${scheme}
    &mdash; ${checks.length} pairs,
    ${
      failures.length === 0
        ? "all clear"
        : `<span style="color: var(--color-intent-danger-content);">${failures.length} failing</span>`
    }
  </summary>
  <table class="ch-table" style="margin-block-start: var(--space-4);">
    <thead>
      <tr><th>Pair</th><th>Colours</th><th>WCAG 2.2</th><th>Needs</th><th>APCA Lc</th><th>Verdict</th></tr>
    </thead>
    <tbody>
      ${checks
        .map(
          (entry) => `
      <tr>
        <td>${escapeHtml(entry.label)}</td>
        <td class="ch-num">
          <span class="ch-swatch" style="background:${entry.foreground}"></span>
          <span class="ch-swatch" style="background:${entry.background}"></span>
        </td>
        <td class="ch-num">${entry.result.ratio.toFixed(
          2,
        )}:1</td>
        <td class="ch-num">${entry.threshold}:1</td>
        <td class="ch-num">${
          entry.result.lc < 0 ? "" : "+"
        }${entry.result.lc.toFixed(1)}</td>
        <td>${
          entry.isExempt
            ? `<span class="ch-badge ch-badge--neutral">exempt</span> <span class="ch-caption">${escapeHtml(
                entry.exemptReason,
              )}</span>`
            : entry.result.ratio >= entry.threshold
              ? '<span class="ch-badge ch-badge--success">pass</span>'
              : '<span class="ch-badge ch-badge--danger">FAIL</span>'
        }</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</details>`
}

const renderContrast = () => `
<div class="ch-section">
  <h2>Contrast report</h2>
  <p class="ch-lede">
    Gated on <strong>WCAG 2.2 AA</strong>; <strong>APCA Lc</strong> reported alongside because it
    models perceived contrast far better on dark UI but is still unofficial, so gating on it would
    mean gating on a moving target. This is the same audit <code>yarn check:contrast</code> fails CI
    on &mdash; a board printing numbers nothing enforces would be decoration.
  </p>
  ${variants
    .flatMap((variant) =>
      SCHEMES.map((scheme) =>
        renderContrastTable(variant, scheme),
      ),
    )
    .join("")}
</div>`

// ---------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------

const buildAuditData = () =>
  JSON.stringify(
    Object.fromEntries(
      variants.flatMap((variant) =>
        SCHEMES.map((scheme) => [
          `${variant.name}|${scheme}`,
          Object.fromEntries(
            auditScheme(variant.schemes[scheme]).map(
              (entry) => [
                entry.label,
                {
                  ratio: Number(
                    entry.result.ratio.toFixed(2),
                  ),
                  lc: Number(entry.result.lc.toFixed(1)),
                  threshold: entry.threshold,
                  isPass:
                    entry.isExempt ||
                    entry.result.ratio >= entry.threshold,
                },
              ],
            ),
          ),
        ]),
      ),
    ),
  )

const buildEpaperCss = () =>
  [
    '[data-epaper="spectra6"] {',
    ...buildColourProperties(epaperColours.spectra6),
    "  --duration-instant: 0ms;",
    "  --duration-fast: 0ms;",
    "  --duration-normal: 0ms;",
    "  --duration-slow: 0ms;",
    "}",
  ].join("\n")

const html = `<!doctype html>
<html lang="en" data-variant="daylight" data-scheme="dark" data-density="comfortable">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Charcuterie M0 &mdash; visual directions</title>
<style>
${buildVariablesCss(variants, "daylight")}
${buildEpaperCss()}
${previewStyles}

/* Board chrome — the control strip is not part of any candidate. */
.ch-toolbar {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--layer-sticky);
  background-color: var(--color-surface-raised);
  border-block-end: 1px solid var(--color-border-default);
  padding: var(--space-3) var(--space-6);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: center;
}
.ch-toolbar__group { display: flex; align-items: center; gap: var(--space-2); }
.ch-toolbar__label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: var(--tracking-wide); color: var(--color-content-muted); }
.ch-toolbar button[aria-pressed="true"] { background-color: var(--color-intent-accent-solid); color: var(--color-intent-accent-on-solid); border-color: transparent; }
.ch-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-inline-end: auto; }
</style>
</head>
<body>

<div class="ch-toolbar">
  <span class="ch-title">Charcuterie M0 &mdash; pick a visual direction</span>
  <div class="ch-toolbar__group">
    <span class="ch-toolbar__label">Variant</span>
    ${variants
      .map(
        (variant) =>
          `<button class="ch-button ch-button--secondary ch-button--sm" type="button" data-axis="variant" data-value="${variant.name}" aria-pressed="${
            variant.name === "daylight" ? "true" : "false"
          }">${escapeHtml(variant.title)}</button>`,
      )
      .join("\n    ")}
  </div>
  <div class="ch-toolbar__group">
    <span class="ch-toolbar__label">Scheme</span>
    ${["dark", "light"]
      .map(
        (scheme, index) =>
          `<button class="ch-button ch-button--secondary ch-button--sm" type="button" data-axis="scheme" data-value="${scheme}" aria-pressed="${
            index === 0 ? "true" : "false"
          }">${scheme}</button>`,
      )
      .join("\n    ")}
  </div>
  <div class="ch-toolbar__group">
    <span class="ch-toolbar__label">Density</span>
    ${["comfortable", "compact", "kiosk"]
      .map(
        (density, index) =>
          `<button class="ch-button ch-button--secondary ch-button--sm" type="button" data-axis="density" data-value="${density}" aria-pressed="${
            index === 0 ? "true" : "false"
          }">${density}</button>`,
      )
      .join("\n    ")}
  </div>
</div>

<div class="ch-page">
  <div class="ch-section">
    <h2>How to read this</h2>
    <p class="ch-lede">
      Four candidate visual directions, each one a ~250-line token file in
      <code>packages/tokens/src/variants/</code>. This page was generated from those files by
      <code>yarn preview:themes</code>; nothing on it was drawn by hand. Whichever direction wins is
      therefore not a mockup to reimplement &mdash; it is already the default theme, and the other
      three stay available as alternate <code>data-variant</code> values at no extra cost.
    </p>
    <p class="ch-lede">
      Data is real: verdict sentences are verbatim from <code>rip-deck/packages/contracts/src/health.ts</code>,
      step names from <code>mux-magic/packages/api/src/api/commandNames.ts</code>, and statuses are the
      exact <code>statusClassMap</code> keys. Several rows are deliberately in states the system is not
      in right now &mdash; a mid-rip, a scratched disc, a quarantined drive, a failed step &mdash;
      because idle sample data makes every candidate look the same.
    </p>
  </div>
  ${renderFullBoard()}
  ${renderCompare()}
  ${renderFrames()}
  ${renderContrast()}
</div>

<script>
const AUDIT = ${buildAuditData()};

const root = document.documentElement

const applyMetrics = () => {
  const key =
    root.dataset.variant + "|" + root.dataset.scheme

  const audit = AUDIT[key] || {}

  for (const node of document.querySelectorAll("[data-pair]")) {
    const entry = audit[node.dataset.pair]

    if (!entry) {
      node.textContent = ""
      continue
    }

    node.textContent =
      node.dataset.pair
      + " = " + entry.ratio.toFixed(2) + ":1"
      + " (needs " + entry.threshold + ":1)"
      + " - APCA Lc " + (entry.lc < 0 ? "" : "+") + entry.lc.toFixed(1)

    node.dataset.pass = String(entry.isPass)
  }
}

// The device frames follow the chosen variant/scheme but keep
// their own density, since density is a property of the device.
const syncFrames = () => {
  for (const frame of document.querySelectorAll("[data-frame]")) {
    frame.dataset.variant = root.dataset.variant
    frame.dataset.scheme = root.dataset.scheme
  }

  // Side-by-side cells keep their own variant — that is the point
  // of the section — but follow scheme and density.
  for (const cell of document.querySelectorAll("[data-compare-cell]")) {
    cell.dataset.scheme = root.dataset.scheme
    cell.dataset.density = root.dataset.density
  }
}

for (const button of document.querySelectorAll("[data-axis]")) {
  button.addEventListener("click", () => {
    const { axis, value } = button.dataset

    root.dataset[axis] = value

    for (const sibling of document.querySelectorAll('[data-axis="' + axis + '"]')) {
      sibling.setAttribute(
        "aria-pressed",
        String(sibling.dataset.value === value),
      )
    }

    syncFrames()
    applyMetrics()
  })
}

syncFrames()
applyMetrics()
</script>
</body>
</html>
`

const outputDirectory = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  "preview",
)

mkdirSync(outputDirectory, { recursive: true })

const outputPath = join(outputDirectory, "index.html")

writeFileSync(outputPath, html, "utf8")

console.log(
  `wrote ${outputPath} (${Math.round(
    html.length / 1024,
  )} KB, self-contained)`,
)
