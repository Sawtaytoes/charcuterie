/**
 * Real strings from the real apps.
 *
 * The specimen board is populated from this file rather than from
 * lorem ipsum, and that is not decoration. The printer-stat-block
 * precedent showed that **idle, tidy sample data makes every
 * candidate look identical** — every direction renders "Ready" in
 * grey equally well. What separates them is a long disc title
 * wrapping next to a badge, a verdict sentence that runs to three
 * lines, and an error row sitting beside a success row.
 *
 * So every list here includes at least one row in a state the
 * system is not currently in — a mid-rip bay, a failed step, a
 * quarantined drive — because those are the rows the owner will
 * actually be reading at 2am.
 *
 * Sources:
 *  - verdict messages: `rip-deck/packages/contracts/src/health.ts`
 *  - job statuses: `mux-magic/…/StatusBadge.tsx` (`statusClassMap`)
 *  - command names: `mux-magic/packages/api/src/api/commandNames.ts`
 *  - queue/shelf shape: `plex-channels/web/`
 */

export type BayRow = {
  bay: string
  disc: string
  state:
    | "done"
    | "failed"
    | "running"
    | "indeterminate"
    | "idle"
  percent: number
  detail: string
  verdict: null | {
    tone: "ok" | "disc" | "hardware" | "unmeasured"
    message: string
    confidence: null | "suspected" | "confirmed"
  }
}

/**
 * ripdeck bays. Verdict text is verbatim from `health.ts` —
 * including its length, which is the point: these sentences name a
 * physical object and a physical action, and a design that cannot
 * fit three lines of them next to a progress bar has failed.
 */
export const bayRows: BayRow[] = [
  {
    bay: "Bay 1",
    disc: "The Thing (1982) — 4K UHD",
    state: "running",
    percent: 68,
    detail: "title 3 of 7 · 41 MB/s · 12m left",
    verdict: null,
  },
  {
    bay: "Bay 2",
    disc: "Twin Peaks S02D03",
    state: "indeterminate",
    percent: 0,
    detail: "AACS/BD+ preamble · no measurable progress",
    verdict: null,
  },
  {
    bay: "Bay 3",
    disc: "Paprika (2006)",
    state: "running",
    percent: 34,
    detail: "title 1 of 2 · 8 MB/s · re-reading sector",
    verdict: {
      tone: "disc",
      message:
        "Dirty — errors are scattered across the disc, which is what fingerprints and smudges look like. Clean it and try again.",
      confidence: "suspected",
    },
  },
  {
    bay: "Bay 4",
    disc: "Sátántangó (1994) D1",
    state: "failed",
    percent: 12,
    detail: "aborted after 4 retries",
    verdict: {
      tone: "disc",
      message:
        "Scratched — the damage is in one continuous band, so cleaning will not help. Source another copy.",
      confidence: "confirmed",
    },
  },
  {
    bay: "Bay 5",
    disc: "Perfect Blue (1997)",
    state: "done",
    percent: 100,
    detail: "2 titles · 31.4 GB · 18m41s",
    verdict: {
      tone: "ok",
      message: "Read cleanly end to end.",
      confidence: null,
    },
  },
  {
    bay: "Bay 6",
    disc: "— no disc —",
    state: "idle",
    percent: 0,
    detail: "drive quarantined pending manual clearance",
    verdict: {
      tone: "hardware",
      message:
        "This drive keeps disconnecting and reappearing. Check its cable and power before trusting any rip from it.",
      confidence: "confirmed",
    },
  },
]

export type JobStep = {
  command: string
  status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled"
    | "skipped"
    | "exited"
  detail: string
}

/**
 * A mux-magic sequence mid-run. Statuses are the exact key set
 * from `statusClassMap`, which is the map this token layer is
 * meant to replace with one shared `Status` machine.
 */
export const jobSteps: JobStep[] = [
  {
    command: "remuxToMkv",
    status: "completed",
    detail: "14 files · 2m03s",
  },
  {
    command: "changeTrackLanguages",
    status: "completed",
    detail: "jpn → default, eng forced",
  },
  {
    command: "nameAnimeEpisodesAniDB",
    status: "running",
    detail: "matching 9 of 26 against AniDB",
  },
  {
    command: "extractSubtitles",
    status: "paused",
    detail: "waiting on prompt: 3 candidate tracks",
  },
  {
    command: "convertLosslessToFlac",
    status: "failed",
    detail: "ffmpeg exit 1 — unsupported channel layout",
  },
  {
    command: "fixIncorrectDefaultTracks",
    status: "pending",
    detail: "queued",
  },
  {
    command: "exitIfEmpty",
    status: "exited",
    detail: "no files matched — planned early exit",
  },
  {
    command: "deleteCopiedOriginals",
    status: "skipped",
    detail: "skipped: prior step failed",
  },
]

export type QueueRow = {
  title: string
  meta: string
  isPinned: boolean
}

/** plex-channels queue rows, in a shelf. */
export const queueRows: QueueRow[] = [
  {
    title: "Cowboy Bebop",
    meta: "S01E12 · Jupiter Jazz (Part 1) · 24m",
    isPinned: true,
  },
  {
    title: "The Prisoner",
    meta: "S01E06 · The General · 49m",
    isPinned: false,
  },
  {
    title: "Sapphire & Steel",
    meta: "Assignment 2, Part 4 · 26m",
    isPinned: false,
  },
  {
    title: "Look Around You",
    meta: "S01E03 · Iron · 10m",
    isPinned: false,
  },
]

export type PosterTile = {
  title: string
  meta: string
  /** Drives the error-fallback path, which no app handles well. */
  isArtworkMissing: boolean
}

export const posterTiles: PosterTile[] = [
  {
    title: "Kill la Kill",
    meta: "2013 · 25 eps",
    isArtworkMissing: false,
  },
  {
    title: "Hausu",
    meta: "1977 · 88m",
    isArtworkMissing: false,
  },
  {
    title: "Serial Experiments Lain",
    meta: "1998 · 13 eps",
    isArtworkMissing: true,
  },
  {
    title: "The Hitchhiker's Guide to the Galaxy",
    meta: "1981 · 6 eps",
    isArtworkMissing: false,
  },
  {
    title: "Twin Peaks: Fire Walk with Me",
    meta: "1992 · 135m",
    isArtworkMissing: false,
  },
  {
    title: "Ghost in the Shell",
    meta: "1995 · 83m",
    isArtworkMissing: false,
  },
]

/**
 * The four different connection indicators the fleet currently
 * hand-rolls, reduced to the one state machine they all describe.
 */
export const connectionStates = [
  {
    status: "connected",
    intent: "success",
    label: "Connected",
    detail: "daemon · 4ms",
  },
  {
    status: "connecting",
    intent: "info",
    label: "Connecting…",
    detail: "attempt 1",
  },
  {
    status: "reconnecting",
    intent: "warning",
    label: "Reconnecting…",
    detail: "attempt 4 · backoff 8s",
  },
  {
    status: "disconnected",
    intent: "danger",
    label: "Disconnected",
    detail: "last seen 2m ago",
  },
] as const

export const logLines = [
  "12:04:31  makemkvcon  Opening Blu-ray disc /dev/sr2",
  "12:04:33  makemkvcon  Title #3 has length 1:52:44",
  "12:05:02  ripdeck     bay 3 read retry at sector 118432",
  "12:05:02  ripdeck     bay 3 read retry at sector 118433",
  "12:05:19  ripdeck     verdict disc_dirty (suspected) — 1 drive",
  "12:06:44  makemkvcon  Error 'Scsi error - MEDIUM ERROR'",
  "12:06:44  ripdeck     bay 4 aborted after 4 retries",
]
