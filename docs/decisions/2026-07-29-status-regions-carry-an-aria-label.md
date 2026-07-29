# A `role="status"` region carries `aria-label` as well as its text

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Accessibility
**Supersedes:** —
**Superseded by:** —

## Decision

`Spinner` and `LiveStatusIndicator` set **both**:

- the label as **text content** (visible, or inside `VisuallyHidden`), which is what a
  screen reader reads when the live region appears or changes; and
- `aria-label` with the same string, which is what **names** the region.

`LiveStatusIndicator` additionally carries `data-status` — not an ARIA attribute, a stable
handle for a Playwright assertion that survives translation where the visible wording does
not.

`Badge` gets **no** role at all, and that is the same decision seen from the other side.

## Context

`status` is a live-region role, not a widget role, and **its accessible name does not come
from its contents**. So a spinner built the obvious way —

```tsx
<span role="status"><VisuallyHidden>Loading…</VisuallyHidden></span>
```

— announces correctly and is **unfindable**: `getByRole("status", { name: "Loading…" })`
matches nothing. Two of M3's stories failed on exactly that, from
`expectAgentDrivable`, on the first Storybook run.

Nothing else reports it. axe is silent — an unnamed live region is not a violation. The
markup looks right. A screen-reader spot check passes, because the announcement works.

## Why

**A stated goal of the library is that Playwright MCP and AI agents can drive the fleet, and
that reduces to `getByRole(role, { name })` resolving.** A region that announces but cannot
be addressed fails that goal while looking like it passes.

**The duplication is not a defect.** For a live region the two channels answer different
questions: the name is used when a user navigates *to* the region or an agent looks for it;
the content is what gets announced when it *changes*. Because the strings are identical
there is no `label-in-name` mismatch (and that rule applies to widgets anyway).

**Dropping the text instead would be worse.** A live region whose content is empty and whose
only string is `aria-label` announces nothing when it appears — the announcement comes from
content changes. Removing the text to avoid "duplication" would silently delete the feature.

**A `Badge` must not have this role.** It is a word about something else, not a live region;
`role="status"` there would make every re-render announce itself. Where a status genuinely
needs announcing, that is `LiveStatusIndicator`'s job. So `Badge`'s drivable handle is its
text, and its story asserts that instead.

## Consequences

- `Spinner`'s `label` defaults to `"Loading…"` but is meant to be passed: "Ripping disc 3"
  is what the user needs, and the animation says nothing.
- A `Button` with `isLoading` therefore has an accessible name that includes the spinner's
  label — "Loading… Ripping disc 3". Story queries use a regex on the visible half.
- `expectAgentDrivable` refuses ambiguity as well as absence, so two spinners on one page
  need distinct labels. That is a real constraint and the right one: an agent that finds two
  "Loading…" regions has learned nothing about which request is in flight.

## Evidence

> This matters beyond correctness: a stated goal is that **Playwright MCP and AI agents can
> drive these apps**, which requires `getByRole(role, { name })` to actually work.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo,
under "Accessibility is effectively absent".

The failure mode was found by the gate the same plan asked for, before any of this shipped:

```
Not agent-drivable: nothing matches role "status" named "Loading…".
```
