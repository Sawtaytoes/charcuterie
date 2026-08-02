# M6f — two defects a consumer found, and the 1.0.0 cut

**Branch:** `fix/m6f-library-defects` (PR #11)
**Gates**, re-run on the integrated result rather than on the branch: lint (biome +
eslint), typecheck, build, contrast clear on all four variants x two schemes with **0**
failing pairs, **499 tests over 72 files** (26 files skipped; was 476 at M6a),
`smoke:storybook` green on **150 entries** (was 147).

M6f is the last phase of M6 and it is two things: the two library defects the consumer
milestones turned up, and the `major` changeset that takes all five packages to `1.0.0`.

---

## 1. The two defects have the same shape

Both are **two components, each individually correct, wrong in composition** — and both
were invisible to this repo's entire suite while being obvious to the first app that
combined them. That is the finding of this milestone, more than either fix.

### `Field` and `Tooltip` could not nest

Both take one child and `cloneElement` onto it. So the obvious thing to write —

```tsx
<Field label="Rename pattern" isRequired>
  <Tooltip label="A JavaScript regular expression.">
    <input />
  </Tooltip>
</Field>
```

— handed `Field`'s `id`, `aria-describedby`, `aria-invalid` and `required` to the `Tooltip`
**component**, which declares none of them. `cloneElement` does not care. React dropped all
four with no warning; TypeScript never saw it, because `Children.only` returns a
`ReactElement` whose props are `any`; every test passed; the render was pixel-identical.
The only symptom was a `<label htmlFor>` pointing at an id nowhere in the document — the
**exact unnamed-textbox defect `Field` exists to prevent**, this time produced by the
library rather than by a consumer.

Silent prop-dropping is the worst version of this, and the fix is the rule that **a slot is
a pass-through**. `SlotProps` + `mergeSlotProps` (both exported) name the five keys a
cloning ancestor injects and define how they merge: last-write-wins for four, and a **join**
for `aria-describedby`, because that one is a *list*. A `Field` naming its description and
its error while a `Tooltip` names its tip is the entire nesting problem in one attribute,
and a plain spread keeps one and loses the other — the same silent drop by a shorter route.

Two things about that type are worth carrying forward.

**The list is closed; the forwarding is not.** The type is five keys because those are the
five with defined merge semantics. The *runtime* forwards everything, via the rest spread
both components already use, and that is load-bearing rather than sloppy: a `Tooltip`
around a `Field` hands down not one attribute but a working component — floating-ui's
`useHover`/`useFocus`/`useDismiss` handlers and `refs.setReference`. A `Field` that
forwarded only the five keys would leave the tip with no trigger and no anchor, which is
mux-magic's `FieldTooltip` defect 1 rebuilt inside the fix for it.

**`SlotProps` is a `Pick`, not a shape.** Three of its five keys are booleans whose names
are the DOM's — `aria-invalid`, `aria-required`, `required` — and the house `is`/`has` rule
selects `typeProperty` with
[no carve-out for external API names](decisions/2026-07-29-is-has-rule-has-no-external-api-carve-out.md),
no widening, and no `eslint-disable` (unused disable directives are themselves an error).
So the type stops declaring a shape and **selects** one out of React's
`InputHTMLAttributes`, which is the honest description of what it always was. Same
reasoning as the `Record<string, boolean>` in `createReactAdapter`: we are not describing
React's shape, we are naming the keys of it we touch. It also gains accuracy for free —
`aria-invalid` picks up React's real type, where `"grammar"` and `"spelling"` are legal,
instead of the `boolean` a hand-written version had narrowed it to.

### `FieldGroup`, because `Field` cannot label two controls

An `id` names one element and a `<label htmlFor>` points at one, so a `Field` over three
inputs names one of them and leaves two anonymous. **Six of mux-magic's sixteen** field
components are in that position — `RegexWithFlagsField` (pattern, flags, sample, and a
checkbox), `NumberWithLookupField`, `LanguageCodeField`, `LanguageCodesField`,
`SubtitleTypesField`, `RenameRegexField` — and every one renders a `FieldLabel` whose
`htmlFor` names at best one of them.

`FieldGroup` renders `<fieldset>` + `<legend>` and does **not** clone. This is the one place
in the library where `<fieldset>` is right, and it is worth stating against
[the decision that rejected it for `AccordionSection`](decisions/2026-07-31-an-accordion-panel-is-a-group-not-a-landmark.md):
that rejection was because a panel holds *prose* and `<fieldset>` is a form-control
grouping. Here the content really is a form-control grouping, so the element means what it
says, `<legend>` names the group natively, and no `role="group"` and no `aria-labelledby`
are needed.

What a group cannot carry is `aria-invalid`, which has no group form — it belongs on the
control that is actually invalid, and `FieldGroup` does not know which one that is. So
`error` is **described, not asserted**: it joins the `<fieldset>`'s `aria-describedby`.
The alternative, cloning `aria-invalid` onto every child, marks the valid ones invalid.
That limitation is stated in the docstring rather than papered over.

### A `LogViewer` inside a collapsed `Accordion` never followed

`AccordionSection` renders its panel `hidden` rather than unmounting it, deliberately: an
unmounted panel loses a scroll position, a partially typed form, and any subscription its
content opened — and the fleet's log panes are exactly that. A `hidden` subtree has **no
layout box**, so `LogViewer`'s mount effect measured `scrollHeight 0` and wrote
`scrollTop = 0`, then never ran again, because neither `isFollowing` nor the lines change
when the section is opened. Measured in mux-magic on a 60-line pane:

```
while collapsed : scrollTop 0   scrollHeight 0     clientHeight 0
after expanding : scrollTop 0   scrollHeight 976   clientHeight 254
```

The log opened on its **first** line. That is this component's own `}, [])` bug — defect 1
in its own docstring — rebuilt out of two components whose individual decisions are both
right, and invisible to both of their test suites: `LogViewer`'s mounted visible,
`Accordion`'s holding content that never measures itself.

A `ResizeObserver` on the pane, live only while following. Not an `IntersectionObserver`:
that answers "is it on screen", which is a different question with two wrong answers here —
a pane below the fold on a long page is not intersecting and has perfectly good layout, and
scrolling the page later would re-fire for no reason. `ResizeObserver` answers "does it
have a box", which is the precondition the measurement actually needs, and per spec it does
not fire at `observe()` time for an element that is not being rendered — so **gaining a box
is the first callback**. It pays for itself twice: a window resize re-wraps the lines and a
following pane belongs at the new bottom.

mux-magic worked around this downstream in a `DisclosedLogViewer` that withheld the pane
until the section had been opened once. **That workaround is now deletable** — see
[Left for someone's hands](#left-for-someone-s-hands).

---

## 2. What the checkpointed WIP actually was

M6f resumed a session killed mid-edit by a usage limit, checkpointed at `f3df089` with a
message warning it might not compile. It compiled and its tests passed. Two things were
wrong with it anyway, and the second is the more interesting.

**It failed both lint gates, and one failure was not cosmetic.** Biome's was import sort and
two wrapped expressions. ESLint's was the `is`/`has` rule on three DOM booleans, which has
no exit — that is what produced the `Pick` above, and it is a better type than the one it
replaced.

**It shipped a regression test that could not fail.** The nesting test closed with
`expect(inner).toHaveAttribute("aria-invalid", "true")` on the `Tooltip`-outside cell and
called that the reverse order. It is not: `Field` writes `aria-invalid` itself, from its own
`error` prop, so that assertion holds whether or not anything arrived from the `Tooltip`
above it. Reverting `Field`'s half of the fix left the whole file green.

This is worth naming as a class. **A regression test is not proven by being green — it is
proven by being red without the fix**, and a test asserting a value the component under
test writes unconditionally is a test of nothing that is nevertheless *counted*, in a suite
whose headline number is how many there are. It was caught by the revert-and-watch step and
by nothing else.

### Each fix, proven by reverting it

| Fix reverted | Regression test | Failure |
| --- | --- | --- |
| `Tooltip`'s `mergeSlotProps` → plain spread | `a slot forwards what an outer slot gave it` | axe: *"Form elements must have labels"* — the unnamed textbox itself, which is the defect's real symptom rather than a proxy for it |
| `Field`'s `mergeSlotProps` → plain object | `a slot forwards what an outer slot gave it, in the other order` | `Unable to find role="tooltip"` |
| `LogViewer`'s `ResizeObserver` deleted | `a pane revealed by a disclosure follows the tail` | `expected 722 to be less than 4` |

The `LogViewer` test asserts `scrollHeight === 0` as an explicit **precondition**, so if a
future `AccordionSection` unmounts its panel or stops using `hidden`, the test fails there
rather than quietly ceasing to test anything.

### Driven in a browser, not only in jsdom

Built Storybook, served it, drove each changed state and screenshotted it
(`__screenshots__/m6f-*.png`, gitignored):

- `components-field--nested`, then **focused the inner control of the `Tooltip`-outside
  cell** — the tip opens from that focus, which is only possible if the handlers, the ref
  and the attribute all reached the `<input>`. `aria-describedby` reads `_r_3_ _r_5_-error`:
  tip then error, outer first.
- `components-field--group` — the `<fieldset>` renders with no border, no inline margin and
  no `min-inline-size: min-content`, all three cleared so it shrinks inside a flex parent.
- `components-logviewer--inside-disclosure`, collapsed and then expanded. After expanding:
  `scrollTop 722 / scrollHeight 976 / clientHeight 254` — **the same `976`/`254` measured in
  mux-magic**, and `722 = 976 - 254`, i.e. pinned exactly to the tail. The pane opens on
  `14:59:00`, its last line.

---

## 3. The 1.0.0 cut

`major` on all five packages, as its own changeset rather than folded into a consumer's, per
[the decision](decisions/2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md). **Nothing in the
bump changes an API** — it is a promise about the ones already here.

**The pending `tokens` minors are folded in, not shipped on the way past.** The first-paint
`var()` fallback and the 19-colour ePaper flat-fill palette were queued in the open Version
Packages PR as `tokens@0.3.0`. Both are `minor` on a `0.x` line, which is to say both are
unreachable behind every consumer's caret — `^0.2.0` means `>=0.2.0 <0.3.0`. Publishing
`0.3.0` on the way to `1.0.0` would have been a release with **no possible audience**, and
it is the precise failure the 1.0.0 decision was written about: `tokens@0.2.0` announced
itself as *"breaking for anyone reading these literals"* and reached nobody, silently,
because the range resolves to the old version instead of failing.

**The last-consumer condition resolved here, and `xander` is not a gap in it.** The decision
says 1.0.0 waits for the last consumer and names `xander` as last in M6's fleet list. That
list was re-scoped by Kevin before M6b was written — *"he's doing his own thing. I can have
him use Charcuterie once we get this settled"* — so the consumers are mux-magic,
image-viewer, plex-channels and gallery-downloader, and M6f is where they end. `ui` is now
imported by five apps: mux-magic (28 files), gallery-downloader (19), image-viewer (14),
rip-deck (11), plex-channels (10). castkit consumes `tokens` and `logic` only, which is
M5b's finding standing rather than a shortfall — the component layer does not reach a
Preact consumer.

### The three whose consumer status was in question

[Decision record](decisions/2026-08-02-sortabletableheader-toast-and-filedropzone-ship-in-1-0-0.md).
Kevin's call is that `SortableTableHeader`, `Toast`/`ToastRegion` and `FileDropZone` all
ship. The evidence is recorded as it actually stands rather than bent to agree, and the
short version is that **the "three consumer-less components" framing was already out of date
by two of them** when it was measured on 2026-08-02:

| Component | Importers | Where |
| --- | --- | --- |
| `SortableTableHeader` | 1 | mux-magic `FileExplorerModal`, 4 columns |
| `Toast` | 2 | image-viewer `FileBrowser`, `PaneGallery` |
| `ToastRegion` | 1 | gallery-downloader `ToastProvider` |
| `FileDropZone` | **0** | nowhere |

Both image-viewer sites take `Toast` **without** `ToastRegion` and supply their own `<ul>`,
deliberately, because `ToastRecord` has no slot for the "Open N folders" control they need —
which is the pair being adopted at exactly the seam it was designed to have, and better
evidence for the split than a consumer taking both would have been.

`FileDropZone` alone is at zero, and the fleet's two candidate drop targets are both
*text*: gallery-downloader's `usePageDropTarget` reads `getData("text")` and never
`.files`, and mux-magic's YAML path is `clipboardData` — paste, not a drop target at all.
Eight real `dataTransfer.files` sites do exist and all eight are in **bambuddy**, which the
library does not reach and is on no milestone's list to.

One number was corrected downward: the hand-rolled sortable-header defect class is **three
sites, not four** — bambuddy's `ForecastPanel` and `InventoryPage`, spoolbuddy's
`SpoolsTable`, none using a `<button>` and none setting `aria-sort`. uc-research's sortable
columns are PrimeNG's `pSortableColumn`, which emits `aria-sort` itself, so it is not an
instance of the defect and counting it inflated a finding that was strong enough without
it. `aria-sort` still appears in **zero** hand-rolled sites fleet-wide.

---

## What M6 turned out to be

M6 was scoped as three things: P1 breadth, the rest of the fleet, and the 1.0.0 cut. All
three happened. None of them was the shape the plan drew.

| | Planned | What it was |
| --- | --- | --- |
| **M6a** | nine P1 components | nine P1 components, plus `packages/conformance` resolved into existing gates rather than built |
| **M6b** | migrate mux-magic | migrated, **and found the two defects M6f fixes** |
| **M6c** | migrate image-viewer | a full `.jsx` + Emotion → TypeScript + Tailwind conversion **first** — 132 files |
| **M6d** | migrate plex-channels | a React + Tailwind frontend built **from `index.html` + `app.js` + `style.css` with no build system** |
| **M6e** | migrate gallery-downloader | same again, from static HTML in `web-server/public/` |
| **M6f** | cut 1.0.0 | cut 1.0.0, **after** fixing what M6b found |

**The fleet half was re-scoped before a line of it was written.** The plan said "migrate the
modernized plex-channels / image-viewer / gallery-downloader". None of the three was
modernized. Two had no build system at all and the third was React 19 on `.jsx` + Emotion
with no TypeScript. So three of M6's five consumer phases were modernization projects that
had to finish before the actual subject of the milestone could start — which is M5b's
finding (*"the component layer does not reach a Preact consumer"*) repeating in a different
key: **the library's reach is a property of the apps, not of the library.**

**Every consumer milestone paid for itself in findings, and the findings got sharper as the
apps got more real.** M5b found the ePaper palette was invented. M6b found two defects that
this repo's 476 tests could not see, because both live in the composition of components that
are individually correct — and composition is what a consumer does and a component library's
own test suite structurally does not. M6f found a third thing of the same kind in its own
predecessor's work: a regression test that could not fail.

**The corrections outnumber the features, and that is the healthy reading.** Of the decision
records M6 produced, most are corrections of something this repo previously asserted: the
ePaper palette claim, the `<label>` with no `htmlFor`, `packages/conformance`, `!important`,
`Menu`'s `label`. M6f adds two more — the `htmlFor` claim swept out of the three places it
survived, and the sortable-header count. A milestone that only added things would have been
a milestone that stopped checking.

### What is genuinely left

- **M7 — `@charcuterie/streams`.** Design doc + four ADRs, already written on
  `feat/m7-streams-design`. It ships no code by design, which is why 1.0.0 is here and not
  there. Building it is unscheduled.
- **`Combobox` (P2).** The six hand-rolled `role="listbox"` controls in the fleet all
  filter, so `Select` was never their answer. Nothing else in P2 has a consumer pushing on
  it.
- **`createLinkedIds` has no consumer across twenty-five components.** Left standing
  deliberately — an honestly-unused state kind is better information than a contrived
  caller. [The M6a decision](decisions/2026-07-31-not-every-boolean-is-a-state-kind.md) said
  whether it earns its place is a question for the 1.0.0 cut. It is now shipped in `1.0.0`,
  so removing it is a `2.0.0` question; that is the cost of the answer being "leave it",
  and it is a cheap one.
- **castkit wants a per-variant token build back** — 5.0 of the 6.0 KB gz it gained is
  palettes a single-variant kiosk can never apply.
- **`xander`**, whenever Kevin wants it. Three vanilla PWAs plus a Python project; it would
  be a fourth modernization, not a migration.

### Left for someone's hands

- **Delete mux-magic's `DisclosedLogViewer`.** It is the downstream workaround for the
  `LogViewer` defect fixed here, and it is only deletable once mux-magic is on `ui@1.0.0`.
  Its branch is `feat/mux-magic-revamp`.
- **Five mux-magic field components should move to `FieldGroup`** —
  `RegexWithFlagsField`, `NumberWithLookupField`, `LanguageCodeField`, `LanguageCodesField`,
  `SubtitleTypesField` — plus `RenameRegexField`, which is a row per rule. Each currently
  has a `FieldLabel` whose `htmlFor` names at most one of its controls.
- **The consumer branches all need the `portal:` → registry flip** onto `1.0.0`. Five
  branches: `mux-magic@feat/mux-magic-revamp`, `rip-deck@feat/charcuterie`,
  `image-viewer@feat/m6c-charcuterie-ui`, `plex-channels@feat/m6d-charcuterie-ui`,
  `gallery-downloader@feat/m6e-react-tailwind`.
- **Three hand-rolled sortable headers are live and keyboard-inaccessible**, in repos that
  are not charcuterie consumers: bambuddy's `ForecastPanel` and `InventoryPage`,
  spoolbuddy's `SpoolsTable`. `onClick` on the `<th>`, direction by icon only, no
  `aria-sort`. Nothing will ever go red about it.
