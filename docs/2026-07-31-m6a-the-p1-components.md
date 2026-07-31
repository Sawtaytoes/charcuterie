# M6a — the nine P1 components

**Branch:** `feat/m6-p1-components`
**Gates:** lint, typecheck, build, **472 tests** (was 383), contrast clear on all four
variants, `smoke:storybook` green on **105 entries** (was 93).

M6 as the plan scopes it is P1 breadth **plus** the rest of the fleet **plus** the 1.0.0
cut. This is the first of those three. The consumer half is M6b–M6e and the cut is M6f; see
[What M6 turned out to be](#what-m6-turned-out-to-be) for why that list changed shape before
a line was written.

---

## The nine

| Component | Fleet sites | What it is built on |
| --- | --- | --- |
| `Select` | **18** (12 native, 6 listbox) | a real `<select>`; **no state kind** |
| `Field` | **16** | one `useUniqueId`, a conditional join |
| `Accordion` | **11** | `VisibilityGroup`, or `MultiplePicker` when `isMultiple` |
| `LogViewer` | 3 repos | `useState`, deliberately |
| `Menu` | 1 | `RovingFocus` + `@floating-ui/react` |
| `Tooltip` | 1 | `useVisibility` + `useHover`/`useFocus`/`useDismiss` |
| `SortableTableHeader` | 1 | nothing — it is a `<th>` and a `<button>` |
| `Toast` + `ToastRegion` | **0 in React** | `Status`, on the machine the plan wrote down |
| `FileDropZone` | **0 in React** | a `<label>` around a real `<input type="file">` |

The last three were surveyed before building and reported as having no React consumer.
Kevin's call was to build all nine as planned. That is recorded because the evidence table
above should not be read later as a claim that they were all equally justified — the honest
version is that six were, and three ship on the plan's authority.

`Toast`'s existence still paid: the plan specified a four-state lifecycle in M2 and M2 never
built it.

---

## Six things the fleet gets wrong that no gate it has can see

Each of these is why the component exists, rather than a nice observation found afterwards.

### 1. Two owners for one fact, live, in the app M6b migrates

mux-magic's `JobStepsDisclosure` is built on `<details>`, which **owns `open`**. It also
wants the state in a Jotai atom so a job can be expanded from elsewhere. Reconciling them
takes three mechanisms:

```tsx
const detailsRef = useRef<HTMLDetailsElement>(null)
const skipNextToggleRef = useRef(isOpen)

useEffect(() => {
  if (detailsRef.current) detailsRef.current.open = isOpen
}, [isOpen])

const handleToggle = (event) => {
  if (skipNextToggleRef.current) {
    skipNextToggleRef.current = false
    return          // ← swallow the toggle our own write just fired
  }
  setStepsOpen(…)
}
```

A ref to reach past React, an effect to push state into the DOM, and a guard to stop the
DOM's echo coming back. This is the argument `Popover` makes about Radix, aimed at the
platform — and it is the clearest evidence in the repo for why `Accordion` is a
`<button aria-expanded>` rather than a `<details name="…">`. (The other reason: **a
`<summary>` cannot be disabled**, and four of the eleven sites have a section that is
unreachable until a job produces it.)

### 2. A `role="tooltip"` that nothing references

`FieldTooltip` is 130 lines of hand-rolled positioning, including a `computePosition` that
reimplements `flip` and `shift` against `window.innerHeight`. Three defects, all of which
render perfectly:

1. **No `aria-describedby` anywhere.** `role="tooltip"` is not a live region and does
   nothing on its own — the tip is a floating node nobody is pointed at.
2. **Pointer only.** `onPointerEnter`/`onPointerLeave` and no `onFocus`. WCAG 2.1.1.
3. **No Escape.** WCAG 1.4.13.

All three come from one place: the ARIA is written by hand *beside* the behaviour instead of
falling out of it.

### 3. An auto-scroll that follows nothing

```tsx
useEffect(() => {
  const pane = paneRef.current
  if (pane) pane.scrollTop = pane.scrollHeight
}, [])          // ← empty deps
```

It runs **once**, on mount, when the pane is empty and `scrollHeight` *is* `clientHeight`.
Every line after that arrives below the fold. It is the shape everyone writes.

The naive fix is worse — scrolling to the bottom on every render yanks a user who scrolled
back to read an error — so following is pinned to the user's own position, with a **Jump to
latest** button. The pin test carries 4px of slack, because a fractional device pixel ratio
means `scrollTop + clientHeight` never lands exactly on `scrollHeight`; an equality test
un-pins the pane on a 125% display and nowhere else.

That pane is also handled by `data-log-id` — a `data-testid` under a different name.
`sourceRules.test.ts` bans the practice, not the spelling.

### 4. `aria-sort` exists nowhere in the fleet

Not in mux-magic, not in rip-deck, not in castkit. The one sortable table renders the state
as a character:

```tsx
{sortDirection === "asc" ? "▲" : "▼"}
```

A screen reader announces "black up-pointing triangle" if the font has it — and this
sandbox's headless Chromium does not, so the same glyph measures **blank** in a screenshot.

**axe has no rule for a missing `aria-sort`**, because a table with none is simply not
sorted as far as the accessibility tree knows. `SortableTableHeader` is therefore the one
component here whose payoff is not duplication but a class of failure invisible to every
gate the fleet has.

`none` is not the same as absent, either: absent means "not sortable", so a table that omits
it on the unsorted columns tells a screen-reader user the other four cannot be sorted at
all.

### 5. A `<label>` with no `htmlFor`

mux-magic's `FieldLabel`. It looks correct, reads correctly to a sighted user, and gives a
screen reader an unnamed textbox.

### 6. A drag target with no keyboard path

gallery-downloader's page **gets the hard part right** — `dragenter`/`dragleave` fire once
per *element* crossed, and it keeps a `dragDepth` counter, which is the correct fix and is
reproduced here with credit.

What it has no answer for is that **there is no keyboard gesture for drag-and-drop**. WCAG
2.5.7 requires a single-pointer alternative and the honest one has existed since 1995. So
the zone is a `<label>` around a real `<input type="file">` and the drop handlers are an
enhancement on a control that already works without them. That ordering is the whole design;
building the zone first and bolting on an "or browse" link is how the fleet's version ended
up with an `alert()` as its error channel.

---

## Four corrections to *this* repo's rules, each caught by a gate

### A menu is named by its trigger

`Menu` was written with a required `label`, by direct analogy with `Popover`'s `heading`.
`useRole` puts `aria-labelledby` on the panel pointing at the trigger, and that beats
`aria-label` — so the menu was already named "Bay 3", from the button, and **the prop was
discarded with no type error, no lint, no axe violation, and an identical render.**

The rule the earlier components teach is narrower than it looked: *an overlay with no
trigger relationship needs its own name.*
[Decision](decisions/2026-07-31-a-menu-is-named-by-its-trigger.md).

### An accordion panel is a `group`, not a landmark

`role="region"` is the APG's own suggestion **and** its own caveat. Four accordions on one
board is four landmarks named "Disc" and a failing `landmark-unique` — which a real page
listing jobs reproduces exactly. Dropping the role outright was the second attempt and was
wrong in a way that looked right: `aria-labelledby` on a roleless `<div>` is **inert**.
[Decision](decisions/2026-07-31-an-accordion-panel-is-a-group-not-a-landmark.md).

### Not every boolean is a state kind

`LogViewer`'s `isFollowing` is `useState`. The kinds earn their keep on **registered**,
**composed**, or **shared** state, and this is none of the three; `useVisibility` would have
fit mechanically at the cost of `isVisible` meaning "is following".

The same milestone closed the opposite question: the plan expected `useLinkedIds` to do
`Field`'s `aria-describedby` wiring, and a field's ids are static exactly as `Tabs` found —
so **`createLinkedIds` has no consumer across twenty-five components.** Left standing rather
than fixed. [Decision](decisions/2026-07-31-not-every-boolean-is-a-state-kind.md).

### `Select` owns no state at all

A `<select>` holds its value in the DOM. The reader's test for the whole library is now "does
the platform already store this" — a tab bar's selection has no DOM representation, a
select's does.
[Decision](decisions/2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md).

---

## Three failure modes worth carrying forward

### `biome check --write --unsafe` silently rebuilt the bug it was fixing

`yarn lint` applies unsafe fixes. Twice in this milestone it deleted correct code and
nothing but a test noticed:

- **`useExhaustiveDependencies`** removed `shownLines` from `LogViewer`'s follow effect. The
  effect body reads `pane.scrollHeight`, which is a *consequence* of the lines having
  rendered, so the linter saw an untraceable dependency and called it unnecessary.
  Removing it leaves the effect running only when `isFollowing` flips — **mux-magic's
  `}, [])` bug, rebuilt inside the component written to fix it.**
- **`noNoninteractiveTabindex`** removed the `tabIndex` a scroll container needs. Only the
  axe run beside it (`scrollable-region-focusable`) noticed.

Both now carry `biome-ignore` with the reason. This is the third time this pattern has been
recorded — see
[`!important` is for Storybook's chrome only](decisions/2026-07-31-important-is-for-storybook-chrome-only.md)
— and the shape is always the same: an unsafe autofix, a correct-looking diff, and one
unrelated gate catching it.

### `mountStory` never removed its canvas

Every mount left its `<div>` in `document.body` for the whole file, and nothing noticed for
three milestones — every component up to M6 lays out **in flow**, so a stale copy sits
harmlessly below the live one and every query is scoped anyway.

`ToastRegion` is the first `position: fixed` component in the library. A previous test's
toast stack is pinned to the same corner of the viewport as the live one, so
`userEvent.click` — which clicks by **coordinates** — drove the wrong element while every
query still returned the right one. It failed as "the toast did not go away", one test after
the toast it was actually clicking.

### `<input type="file">` has no role

HTML-AAM defines none. testing-library matches it to nothing; **Playwright's role engine
calls it a button.** So `page.getByRole("button", { name })` finds it in a real agent run
while `canvas.getByRole` cannot find it in the test that exists to prove agent-drivability.

`FileDropZone` is the one component exempt from `expectAgentDrivable`, using
`getByLabelText` — which is what `page.getByLabel(…).setInputFiles(…)` does anyway.
**The most accessible file control is the one the role model has no name for**, and that is
a hole in the platform rather than in the component.
[Decision](decisions/2026-07-31-a-file-input-has-no-role.md).

---

## What M6 turned out to be

The plan's M6 reads:

> P1 breadth … + rest of fleet: mux-magic (deleting its Radix Popover re-export), then the
> **modernized** plex-channels / image-viewer / gallery-downloader, then xander.

None of that modernization happened. Surveyed at the start of this milestone:

| Consumer | Actually | Can consume `@charcuterie/ui`? |
| --- | --- | --- |
| mux-magic | React 19 + Tailwind, already on tokens | **yes** — the real component consumer |
| image-viewer | React 19 + Vite, but **`.jsx`** and **Emotion** | after a TS + Tailwind migration |
| plex-channels | `web/index.html` + `app.js` + `style.css`, no build | no |
| gallery-downloader | `web-server/public/*/index.html`, vanilla | no |
| xander | three vanilla PWAs + one Python project | no |

This is M5b's finding repeating — the component layer reaches React + Tailwind consumers and
nothing else.

**Kevin's call:** modernize image-viewer, plex-channels and gallery-downloader to React +
Tailwind so they can consume the library; **leave xander alone** — "he's doing his own thing.
I can have him use Charcuterie once we get this settled."

So the remaining shape of M6 is:

- **M6b** — mux-magic, deleting its Radix Popover re-export. The one consumer that can take
  these components today, and the source of most of the evidence above.
- **M6c** — image-viewer: TypeScript + Tailwind v4, then migrate.
- **M6d** — plex-channels: React + Tailwind, then migrate.
- **M6e** — gallery-downloader: React + Tailwind, then migrate.
- **M6f** — cut **1.0.0** on all five packages, as its own `major` changeset
  ([decision](decisions/2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md)).

xander is out of M6 entirely and is not a blocker for the 1.0.0 cut.

### Carried in from M5b, still open

`packages/conformance` was not built in M5b and is still not built. It is not a blocker for
any of M6b–M6e; it should be resolved before M6f, since 1.0.0 is a stability claim.

### What M6b already knows

The survey above was done by reading the code, so M6b starts with its work order:

- `PortalDropdown`, `CommandPicker`, `LinkPicker`, `EnumPicker`, `PathPicker`,
  `AssFieldPicker`, `RenameTargetPicker` are **comboboxes**, not `Select` callers. They stay
  put until P2.
- The twelve native `<select>` sites are `Select` callers.
- `JobCard`, `JobStepRow`, `GenericRunResults`, `ErrorRow`, `JobLogsDisclosure`,
  `ConvertLosslessRunResults`, `WhenBuilder`, `ApplyIfBuilder`, `StepLogs`,
  `JobStepsDisclosure` are `Accordion` callers — ten of the eleven.
- `JobLogsDisclosure`, `StepLogs` are `LogViewer` callers.
- `FieldLabel` and the fifteen files around it are `Field` callers.
- `FieldTooltip` is deleted by `Tooltip`; `TypePicker` is a `Menu` wearing a listbox's job
  and needs deciding case by case.
- `FileExplorerModal` is the `SortableTableHeader` caller.
