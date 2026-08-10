# `Listbox` and `Combobox` are the default; `Select` is demoted

**Status:** Accepted
**Date:** 2026-08-10
**Type:** Architecture · API
**Supersedes:** [2026-08-03 — `Listbox` and `Combobox` are siblings of `Select`, not replacements](2026-08-03-listbox-and-combobox-are-siblings-of-select.md)
**Superseded by:** —

## Decision

`Listbox` (short lists, rich options) and `Combobox` (long lists, searchable) are the
**default** choice for picking one of several values. Native `Select` is **demoted, not
deleted**: it stays exported, supported and documented, and it remains the right call in
the specific cases where the platform behaviour is the feature — but reaching for it is now
the exception that has to say so.

`charcuterie/prefer-listbox-over-select` enforces the demotion, and the escape hatch is a
one-line justification:

```tsx
// eslint-disable-next-line charcuterie/prefer-listbox-over-select -- the kiosk's touch build wants the native OS wheel picker
<Select name="quality" />
```

The reason is required, by `charcuterie/require-suppression-reason`. A silent disable would
leave the next reader — very often an agent — with no way to tell a considered native
`Select` from a muted rule.

## Context

The [2026-08-03 record](2026-08-03-listbox-and-combobox-are-siblings-of-select.md) said
native `Select` stays first-class, and justified it on the mobile OS wheel picker, autofill,
`:invalid` and uncontrolled form submission. Every one of those facts is still true. What
was wrong was the **conclusion drawn from them**, and the owner's account of where that
conclusion came from:

> "I believe *you* came up with that, not me, and it was too much trouble at the time to
> convert all the apps. But now that we have them, I wanna change that."

The 08-03 record was written while `Listbox` and `Combobox` were still being built. Keeping
`Select` first-class was, at that moment, indistinguishable from not having a replacement
yet — and the cost of migrating every app's pickers landed on the wrong side of the ledger.
Both of those inputs have changed: the components exist, they ship, and `Combobox` already
has consumers.

## Why

Three things push the default the other way now that the alternatives are real:

- **`<option>` cannot render a `ReactNode`.** This was the 08-03 record's stated reason for
  the siblings existing at all, and it turns out to describe most pickers rather than a few:
  an icon, a second line, a trailing intent-coloured badge, a disabled reason. A default that
  has to be abandoned as soon as the design gets specific is not a good default.
- **Consistency is a real property of a library.** A fleet where some pickers are a native
  dropdown and some are a listbox panel gets two focus treatments, two hover treatments, two
  keyboard feels and two sets of bugs. The library exists to stop exactly that.
- **The agent-behaviour problem is the acute one.** The complaint that started this —
  *"Select or some weird Select is used instead of Listbox or Combobox"* — is agents reaching
  for the wrong component, plus **134 raw `<select>` elements in bambuddy** and 19 in
  spoolbuddy that never reached any charcuterie component at all. Documentation has been in
  place the whole time and moved none of those numbers.

## What `Select` is still for

Unchanged, and it is why this is a demotion rather than a removal. Reach for `Select`, with
the reason in the disable comment, when:

- The **mobile OS picker** is the wanted UI — a touch build where the platform wheel or
  drum beats any in-page panel.
- **Autofill** matters (address/country/state forms the browser wants to complete).
- The form is **submitted without JavaScript** — a real `<select name>` in a `<form action>`
  is the only thing that posts.
- `:invalid` / constraint validation is doing the validation work.

## Deliberately not built: choose by device

The owner's own next thought, recorded so it is not lost and so nobody builds it by
accident:

> "I understand the limitations of a non-native select, but then we'd wanna do native select
> for a mobile device with special UI versus a Windows/Mac/Linux Desktop. In this case, I'd
> like to demote it unless I find a different need."

A `Select` that renders native on touch/mobile and `Listbox`/`Combobox` on desktop is a real
possibility and may well be wanted later. It is **not being built now**, and this record is
not a commitment to build it. Two reasons to leave it alone until it is asked for:

- It is a **runtime-branching component with two different ARIA trees**, so every story,
  test and axe run doubles, and the two halves take different props (`ReactNode` options
  cannot survive the native branch — the thing that would be lost is the reason to use the
  component).
- Picking the branch means a **capability guess** (pointer-coarse, viewport, user agent),
  and a wrong guess is worse than either fixed choice: a desktop user gets a native dropdown
  they cannot search, or a tablet user loses the wheel picker the feature existed for.

Until then, an app that wants native on touch says so per call site with the escape hatch
above, which is one line and reads honestly.

## Enforcement

`@charcuterie/eslint-config` ships this as part of the opt-in component-choice block
(`createComponentChoiceRules({ files })`), alongside `charcuterie/no-raw-select`, which
catches the 153 raw `<select>` elements the demotion does not reach. The block is **opt-in**
because five apps would go red on adoption day; the owner migrates them one at a time.

## Evidence

Owner, 2026-08-10, on the 08-03 record:

> "I believe *you* came up with that, not me, and it was too much trouble at the time to
> convert all the apps. But now that we have them, I wanna change that. I understand the
> limitations of a non-native select, but then we'd wanna do native select for a mobile
> device with special UI versus a Windows/Mac/Linux Desktop. In this case, I'd like to
> demote it unless I find a different need."

Owner, same session, on what agents keep doing:

> "I've been asking Agents to work with Charcuterie and build apps with it, but a lot of
> things seem to be wrong. … Select or some weird Select is used instead of Listbox or
> Combobox."

Measured with `rg -uu` across the fleet on 2026-08-10: raw `<select>` — **134** in
bambuddy-src, **19** in spoolbuddy-src, **2** in
`points-market/packages/web/src/components/LimitsSection.tsx`.
