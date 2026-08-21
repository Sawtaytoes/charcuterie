# Native `Select` is deprecated, and the platform hatch is closed

**Status:** Accepted
**Date:** 2026-08-20
**Type:** Architecture · API
**Supersedes:** [2026-08-10 — `Listbox` and `Combobox` are the default; `Select` is demoted](2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
**Superseded by:** — *(the "moved to `Deprecated/Select`" clause only, by [2026-08-21 — A deprecation is a badge in place, and the sidebar has groups](2026-08-21-a-deprecation-is-a-badge-in-place-and-the-sidebar-has-groups.md); the deprecation itself stands)*

## Decision

**`Select` is deprecated.** Nothing new gets a native `<select>` — not in this library, not
in any app that consumes it.

- `Picker` is the replacement, and it is a near drop-in: same `label`, `options`, `value`,
  `onChange`.
- `Listbox` when the trigger is something other than a button; `Combobox` when the list is
  long enough to want typing.
- The component **stays exported**, carrying `@deprecated`, so the fleet's existing call
  sites keep compiling while they are converted. That is the only reason it is still there.

**The four-platform-cases exception is closed.** The 08-10 record kept native `Select` legal
where the platform behaviour was the feature — the mobile OS wheel picker, autofill,
`:invalid`, and a form that posts with no JS on the page — provided the call site said which
in a one-line reason on its lint suppression. That exception is gone. A native `Select` is
now **a new decision record**, argued here, not a judgement made at a call site; the disable
comment cites the record rather than inventing its own reason.

## Context

The owner, on being asked nothing and volunteering it:

> "Charcuterie, deprecate native Select please. No more."
>
> "I don't want agents using it."

The 08-10 record demoted `Select` and shipped `charcuterie/prefer-listbox-over-select` to
enforce the demotion. Ten days later the fleet's numbers say the demotion did not take:

| Repo | `<Select>` | raw `<select>` |
| --- | --- | --- |
| mux-magic | 9 | 26 |
| docket | 7 | 2 |
| board-game-picker | 5 | 2 |
| mail-sifter | 3 | 4 |
| image-viewer | 3 | 5 |
| queuepilot | 2 | 27 |
| gallery-downloader | 2 | 7 |
| portly-controllers | 1 | 0 |
| points-market | 0 | 1 |
| bambuddy | 0 | **152** |
| spoolbuddy | 0 | 19 |
| **total** | **32** | **245** |

`prefer-listbox-over-select` is enabled in **none** of them, because the component-choice
block is opt-in and no consumer has opted in. And on 2026-08-20 an agent built a *new* native
`Select` in mail-sifter and then cited that repo's own `AGENTS.md` back at the owner as the
reason not to change it — the file said "`Select` is the correct control for plain string
options". The fleet-side half of this is settled in the workspace's own decision records
(*"`Listbox` is the picker in every owned app"*, same day); this record is the library half.

What matters here is *why* an agent could read the library and come away with permission. A
demotion is a preference with a stated list of exceptions attached, and an exception is
exactly the shape an agent optimises toward: it reads the four platform cases, finds one that
sounds nearly true of the thing it is building, writes the sentence, and the rule goes quiet.
Not one of those four has ever applied to an app in this fleet — every app is a JS SPA, no
app autofills a picker, no app validates through `:invalid`, and the touch surfaces are kiosk
Pis running our own UI. A hatch nobody has opened in the life of the fleet was not buying
anything, and it was costing the rule its teeth.

## Why

- **The popup is painted by the OS, and that is the whole objection.** `appearance-none`
  reaches the closed control and stops there; the open list is the platform's, so no token,
  no class and no amount of care makes it match the app around it. The owner's word for what
  Windows does with it is "awful". A library exists to stop a fleet from having two focus
  treatments, two hover treatments and two keyboard feels, and one native `<select>` in a
  form is enough to have both.
- **A deprecation is legible to an agent in a way a demotion is not.** `@deprecated` strikes
  the identifier through at the import site, the sidebar entry now says `Deprecated/Select`,
  the docs page opens with a banner, and the lint message names `Picker` as the drop-in.
  Every one of those is read *while the wrong thing is being written*, which is where the
  documentation the 08-10 record relied on never was.
- **The replacement is no longer aspirational.** In August the answer to "use `Listbox`
  instead" was thirty lines of trigger assembly that four repos each wrote for themselves —
  which is
  [why `Picker` exists](2026-08-13-picker-is-the-assembled-listbox-and-listbox-stays-trigger-agnostic.md).
  With `Picker` shipped, converting a `Select` is a rename plus a `label`. The migration cost
  that made the 08-03 record keep `Select` first-class, and the 08-10 record stop at a
  demotion, is now roughly zero.

## What changed in the code

- `Select`, `SelectProps`, `SelectItem`, `SelectOption` and `SelectOptionGroup` carry
  `@deprecated` with the replacement named.
- `packages/ui/src/index.ts` says at the export site why it is still exported.
- The Storybook entry moved from `Components/Select` to **`Deprecated/Select`**, and its docs
  page leads with a before/after banner. The sidebar is the first place an agent looks for a
  picker.
- `charcuterie/prefer-listbox-over-select` now reports a deprecation rather than a missing
  justification, and its message names `Picker` first. The **rule id is unchanged** — it is
  the one piece of consumer-facing API here, no consumer has enabled it yet, and renaming it
  would break the one that does first for no gain.
- `Field`'s stories, docs and prose demonstrate the slot with a `Picker`. A story is a copy
  source, and the one that said "select" was teaching the deprecated control.

## What this does not change

- **The rules stay opt-in.** `createComponentChoiceRules` is still not folded into the base
  config, for the reason the 08-10 record gave: five apps would go red on adoption day, and a
  config that turns a repo red is a config that gets reverted rather than migrated. It would
  also light up this library's own source, which renders the raw elements on purpose.
- **Existing call sites are a backlog, not a violation to fix in whatever repo you are
  passing through.** Converting mux-magic's nine is mux-magic's change, with its own screenshots.
- **Native-on-touch / `Listbox`-on-desktop is still deliberately not built.** The 08-10
  record's reasoning is untouched and this record strengthens it: two ARIA trees behind one
  name doubles every story, test and axe run, `ReactNode` options cannot survive the native
  branch, and a wrong capability guess is worse than either fixed choice.

## What has no replacement

`Listbox` has **no `<optgroup>` equivalent**, so a grouped picker — `SelectOptionGroup` — is
the one shape this deprecation does not cover. That is a gap in `Listbox` and a change to
`Listbox` if an app needs it; it is not a reason to reach for the native control, and it is
recorded here so the next reader does not have to rediscover it.

## Removal

`Select` is removed in the **next major of `@charcuterie/ui`** (currently 3.2.0), once the
fleet's 32 call sites are converted. It is not removed now because that would break eight
repos' builds on an upgrade they did not ask for, which turns a deprecation into a reason to
pin the version — the one outcome that would keep native selects on screen longest.

## Evidence

Owner, 2026-08-20: *"Charcuterie, deprecate native Select please. No more."* and, when the
scope was being settled, *"I don't want agents using it."*

Call sites measured on 2026-08-20 with `rg -uu -c '<Select\b'` (and `'<select\b'`) per repo
root — `-uu` because the sibling repos are nested inside the workspace root and a plain `rg`
returns zero across every one of them. `rg -uu` for `prefer-listbox-over-select` in consumer
repos returned nothing at all.
