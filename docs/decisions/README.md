# Decision records

One decision per file, `YYYY-MM-DD-<kebab-slug>.md`, newest first.

**Never edit a past decision to change its meaning** — supersede it with a new dated file
and cross-link both directions. Before proposing a change, read this index: a settled
decision overrides an instinct.

| Date | Decision | Summary |
| --- | --- | --- |
| 2026-07-29 | [The `v2` root is a Yarn 4 workspace; v1 parks in `packages/logic`](2026-07-29-v2-root-is-a-workspace-and-v1-parks-in-packages-logic.md) | v1's Yarn 3 PnP / rollup / jest / Storybook 7 tooling is deleted from `v2`; its 30 source files move intact to `packages/logic/src` with **no `package.json`**, so Yarn ignores them and nothing can depend on unported code. Excluded from Biome, ESLint, Vitest, and typecheck in one place each; M2 removes those as it ports. `master` still holds working v1. |
| 2026-07-29 | [Logical properties only, enforced on `className`](2026-07-29-logical-properties-only-enforced-on-classname.md) | `ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`, `text-start`/`text-end` — never `left`/`right`. Enforced by `no-restricted-syntax` from `@charcuterie/eslint-config`, scoped to `className` literals **and template chunks** and nothing else: matching `left`/`right` as property names would fire on `getBoundingClientRect().left`, and a rule that cries wolf gets switched off. The pattern's anchors keep `border-red-500` / `rounded-lg` / `place-items-center` clean. |
| 2026-07-29 | [`@charcuterie/tokens` is a separate zero-dependency package](2026-07-29-tokens-is-a-separate-zero-dependency-package.md) | Not a subpath of `ui`: `castkit/packages/views` needs values for Satori with no React tree, and `slatecast` has 60 KB gz. Different peer dependencies is the signal; tree-shaking is not the argument. React consumers still see one name via `@charcuterie/ui/tokens` — build-graph split, not API split. |
| 2026-07-29 | [**`daylight` is the default visual direction**](2026-07-29-daylight-is-the-default-visual-direction.md) | **M0 winner.** Light-first, cool neutrals, blue-violet accent, roomier rows, restrained motion. The other three stay as working `data-variant` alternates. Default *scheme* stays `dark`, so M1's "looks identical after the token swap" proof still means something. |
| 2026-07-29 | [ePaper removes animation, not just shortens it](2026-07-29-epaper-removes-animation-not-just-shortens-it.md) | Loop durations are tokens; ePaper and `prefers-reduced-motion` set `animation: none` rather than a `0ms` duration, because a zero-duration animation still holds keyframe zero — which for the indeterminate sweep is an empty bar, i.e. the exact "wedged drive" misreading it exists to avoid. Every moving affordance owes an opacity-free static fallback. |
| 2026-07-29 | [ePaper is a profile, not a scheme](2026-07-29-epaper-is-a-profile-not-a-scheme.md) | ePaper ships as `@charcuterie/tokens/epaper`, outside the three composing axes, because it *removes* capabilities (no hover, opacity, shadow, transition; six colours) rather than restyling them — and `data-scheme="epaper"` would wrongly imply a `data-variant` still applies. |
| 2026-07-29 | [Gate contrast on WCAG 2.2 AA, report APCA](2026-07-29-contrast-gate-wcag-report-apca.md) | WCAG 2.2 fails CI; APCA Lc is printed next to every number but never gated, since WCAG 3 is still a draft. Only pairs WCAG actually requires are gated — scoping 1.4.11 to real control boundaries took the audit from 65 reported failures to 7 real ones. Also fails on alias drift. |
| 2026-07-29 | [`colour` in TypeScript, `--color-*` in CSS](2026-07-29-colour-in-typescript-color-in-css.md) | Deliberate split: TS matches the fleet's British spelling (`e6Colour`, `colourMode`), CSS matches Tailwind v4's `@theme` namespace, which is the only one that generates `bg-*`/`text-*`. Renaming the CSS side silently produces zero utilities. |

## Still to be recorded

These were settled in the plan but are not yet in effect in code, so they get their record
when the code lands rather than now:

- The state-layer choice: Charcuterie's model on `@floating-ui/react`, and why not
  Radix / Base UI / Ark UI — M2
- The five state kinds, extending the original three-state thesis — M2
- The external-API `open` carve-out versus the `is`/`has` boolean rule — M2
- Lockstep versioning for `tokens`/`logic`/`ui` — waits for the publish workflow. M1
  linked consumers by `portal:` instead of publishing, so there is nothing versioned to
  lock yet.
- Temporal, not date-fns, and that the library owns no date logic — M6
