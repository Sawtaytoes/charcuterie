# A routed tab is a `Tabs` tab with an `href`, and `Nav` keeps the app's destinations

**Status:** Accepted
**Date:** 2026-08-31
**Type:** Component + API contract
**Supersedes:** —
**Amends:**
[`Nav` is the one navigation component, and `NavBar` is deprecated](2026-08-27-nav-is-the-one-navigation-component-and-navbar-is-deprecated.md)
— its Decision 0 is scoped to the app's **destinations**; it does not reach a bar that
divides one screen. Every other clause of that record stands.
**Superseded by:** —

## Decision

**1. `Tabs` takes routed items.** A `TabLinkItem` is a `NavItem` plus `isDisabled`, and a
`Tabs` given `activeHref` renders every trigger as a real `<a href>` through the existing
`RouterLinkProvider` seam.

```tsx
<Tabs
  activeHref={pathname}
  label="Bay 3 sections"
  tabs={[
    { href: `${base}`, label: "Overview" },
    { href: `${base}/tasks`, label: "Tasks" },
  ]}
/>
<Outlet />
```

**2. The two modes are drawn identically, from one definition.** `toTabTriggerClass` is the
single source for a tab's paint, read by both `TabTrigger` (the `<button>`) and `TabLink`
(the `<a href>`). `Tabs.test.tsx` compares the two computed styles property by property.

**3. `activeHref` is the discriminant, and it is required in routed mode.** `tabs` alone
cannot carry the split — TypeScript does not narrow a union by the shape of an array's
elements, so a bar mixing panel items and routed items would type-check and then render half
a navigation.

**4. The routed bar is a `<nav>` of links, NOT a `tablist`.** No `role="tab"`, no
`role="tabpanel"`, no `aria-controls`; `aria-current="page"` marks the section you are in.

**5. Which routed tab is current is `Nav`'s `resolveActiveKey`, imported rather than
restated.** Whole-segment matching, deepest match wins, the root is exact, an external item
is never current, and the query string and fragment are stripped first.

**6. `Nav` still owns the app's destinations.** The header row, the side rail, the collapsed
rail and the Narrow View's menu are `Nav` + `useNavLayout`. A routed `Tabs` renders no rail,
no fold and no menu. The line is **top-level destinations versus the sections of one
screen**, and the owner drew it himself.

**7. A disabled routed tab is not a link at all** — a `<span aria-disabled="true">`.

## Context

The owner, looking at Docket's project page:

> "Docket Projects view. Charcuterie has a tabs component. Why aren't we using that here?"

The page was already using Charcuterie: `Nav` with `layout="bar"`, four `NavItem`s pointing
at `/projects/:id`, `/tasks`, `/lanes` and `/phases`, with an `<Outlet />` under it. So the
question was not "why is this hand-rolled". It was **why does it not look like Tabs**, and
the answer was that `Nav`'s current item is a filled pill and `Tabs`' is an underline.

Two options went to him: give `TabItem` an `href`, or give `Nav`'s `bar` an underline
appearance. He picked the first. Told that Decision 0 of the 08-27 record — *"There is
exactly ONE navigation component, and it is `Nav`"* — appeared to block it, he scoped that
record rather than reversing it:

> "Keep option 1 anyway. This is not a top-level navigation, it's a sub-navigation inside a
> specific project listing."

## Why

**The fleet had two answers to one question, and neither was chosen.** Docket's project
sections are a `Nav` in a pill; Docket's Settings sections are a `Tabs` in an underline.
They are adjacent screens in one app, doing the same job — *pick one of a handful of
sections* — and they disagree because the routed one had no component to be. That is the
same failure mode the 08-27 record was written about, arriving from the other direction.

**The owner's line is better than the one first proposed.** The recommendation put to him
split on *"is this a URL?"*, which would have made `Nav` the answer for every routed bar and
left the paint mismatch permanent. His split — **destinations versus sections of a screen** —
is the one that predicts the rest of the behaviour. A destination bar folds into a menu,
re-parents into a rail, and collapses to glyphs, because the app is large and its
destinations must survive a 390px window. A section bar does none of that: it lives inside
the screen it divides, and there is nowhere for it to fold to. `Nav` carries
`useNavLayout`, `useToolbarOverflow`, five layouts and a `Popover`; a routed `Tabs` carries
none of them and should not.

**`role="tab"` on an anchor is an accessibility defect, not a styling choice.** The role
overrides the link role, so a screen reader announces a disclosure. The reader then expects
a panel to appear beside the bar; instead the address changes and the page under them is
replaced. `aria-controls` is unimplementable here anyway — the section's content is the
router's, rendered through an `<Outlet />` the component cannot see. Keeping the APG pattern
for the panel bar and dropping it for the routed bar is what makes both honest, and it costs
nothing visible, because the *paint* was the thing being reused all along.

**Sharing `resolveActiveKey` rather than writing a second matcher.** The 08-27 record
documents four traps in that function — `/board` is a string prefix of `/boardgames`, two
current items say nothing, `/` matches everything without an exemption, and a filter in the
query string silently un-marks the tab. `NavBar` shipped with the second of those. A private
matcher inside `Tabs` would have been a fifth chance to ship them again.

**A disabled anchor is the version that looks right and is not.** `<a>` has no `disabled`
attribute. The tempting shape — a real `href` plus `aria-disabled="true"` — greys out
correctly, is skipped by nothing, and still navigates on Enter and on a middle click.

## Evidence

The call site that prompted it is `docket/packages/web/src/screens/ProjectScreen.tsx:63-105`
— `Nav layout="bar"` over `<Outlet />`. Docket's own `Tabs` call sites, for contrast, are
`SettingsScreen.tsx` and `TriageScreen.tsx`, neither of which is routed.

The paint mismatch is `Nav/NavLink.tsx:74` (`bg-intent-neutral-surface`, the pill) against
`Tabs/TabTrigger.tsx:22-30` (the border edge, now `Tabs/tabStyles.ts`).

Fleet survey with `rg -uu` from the Repos root: `Tabs` is used by `docket` (2 screens) and
`mail-sifter` (1). Neither is routed, so **no existing call site changes** — the union's
panel member is the old `TabsProps` unchanged, and the 8 Tabs tests that existed before
this work still pass untouched.

`Tabs.test.tsx` pins the parts a screenshot cannot show: that the routed bar has no
`tablist`, no `tab` and no `tabpanel` in it; that exactly one link is `aria-current` and it
is the deepest match, including on a child route; that a disabled tab has no `href` at all;
that an external tab gets `target` and `rel` and is never current; that an `activeHref` the
bar does not contain marks nothing rather than guessing; and that the routed and panel
triggers agree on seven computed style properties.

Gates on this branch: `build`, `typecheck`, `lint`, `test` (1,757 passing), `check:contrast`
(113 pairs per scheme, 0 failing), `build:storybook`, and `smoke:storybook` (433 entries).
