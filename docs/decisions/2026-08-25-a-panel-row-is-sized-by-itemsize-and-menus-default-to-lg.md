# A panel row is sized by `itemSize`, and a menu defaults to `lg`

- **Status:** Accepted
- **Date:** 2026-08-25
- **Type:** Component contract
- **Supersedes:** —
- **Superseded by:** —

## Decision

Every row inside an overlay panel — a `MenuAction`, a `ListboxOption`, a
`ComboboxOption`, and any future one — takes its height, inline padding, gap and type
from **one** shared map, `PANEL_ITEM_SIZE_CLASS[size]`, over the same density-aware
`--control-height-*` / `--control-padding-inline-*` / `--control-gap-*` tokens a
`Button` reads. The size is a prop, `itemSize?: ControlSize`.

Two differences from `CONTROL_SIZE_CLASS`, and both are load-bearing:

- **`min-h-`, not `h-`.** A control on a form row holds one line by contract; an
  option may be rich — an icon, two lines, a trailing `Badge` — and a fixed height
  clips it. The token is a floor here.
- **`py-*`, which a control has none of.** It is what a wrapped second line breathes
  on once `min-h-` stops being the binding constraint.

The defaults differ by component, on purpose:

| Component | Default | At `comfortable` |
| --- | --- | --- |
| `Menu` | `lg` | 2.75rem / 44px |
| `Listbox` | `md` | 2.25rem / 36px |
| `Combobox` | `md` | 2.25rem / 36px |

A `Combobox`'s `itemSize` drives its **search field as well as** its options.

A window shorter than **40rem** steps every panel row down one size, and one shorter
than **30rem** takes it to `sm`. That is `usePanelItemSize`, a `matchMedia` read.

Independently, `Menu`'s panel is now clamped to the space the viewport left it and
scrolls inside that (`useAnchoredOverlay`'s new `isHeightClamped`).

## Context

The owner asked for it directly, and gave the reason:

> I'd like the "menu" popovers to have much taller/thicker options to click, so it's
> easy not to mess them up. […] I personally like larger click areas because it makes
> it easier to not mess up a click. I can be much faster the less precise I need to be
> when clicking.

He attached two screenshots. The first is Mail Sifter's header overflow menu. The
second is this library's own `Combobox`, with the note:

> Like in this combobox example, the button is huge, but the options don't match it.

That second one is a defect rather than a preference, and it had two causes stacked.
The option rows were a hardcoded `px-2 py-1.5 text-sm` — a size **no control in the
library shares** — so an option was always the smaller thing beside the control that
opened it. And the `Combobox` panel's own search field was bigger than the options it
filters, so there were two sizes inside one panel with no prop able to reconcile them.

He asked to keep the picker question open:

> Right now, I want this primarily for the link menu in Mail Sifter and wherever else
> we have one like that. For the other ones, I'd really wanna see what it looks like
> and decide from there and get your thoughts.

So the pickers gained the prop and a conservative default; the fat default is a menu
decision only, until he has looked at the comparison.

## Why

**Why the control tokens rather than a new scale.** A row that is 44px because
somebody typed 44 does not grow on the `kiosk` density and does not shrink on
`compact`. Reading `--control-height-lg` makes "fat" mean 2.75rem on a desktop and
3.75rem on the HyperPixel with no prop change and no re-render, which is the whole
argument the density axis already won
([controls share one height](2026-08-05-controls-share-one-height-no-per-component-touch-floor.md)).
It also makes the picker fix *definitional*: an option is the size of its trigger
because they read the same token, not because two numbers happen to agree today.

**Why `lg` for a menu and `md` for a picker.** A menu item is a pointer target before
it is a list row — read once, then aimed at, usually in a hurry — and a menu rarely
holds more than about eight items, so it can spend height a list cannot. A picker can
hold five hundred, and `md` is the smallest size that answers the actual report,
because it is what the trigger measures.

**Why the step-down is JS and not a CSS media query.** Both were written. CSS is this
library's usual answer, and it cannot do this one: `text-sm` → `text-md` is a Tailwind
bridge onto `--font-size-*`, not a variable a media query can reassign, so a CSS
version means nine new tokens and `text-(length:--panel-item-font-size-lg)` at every
call site — the exact indirection `buildCss.ts` argues against when it explains why
`--text-*` is bridged at all. Stepping the whole `ControlSize` in JS keeps **one
literal class string per size**, which is also the only form `tailwindCandidates.test.ts`
can see. The cost is a re-render on window resize, which is not the axis the library
protects; a scheme, density or variant flip is still a repaint.

**Why the menu panel needed *two* clamps in the same change.** It had none — no
`maxHeightPx`, so no `size` middleware at all. That was survivable at a 32px row and is
not at 44px: nine items are 400px, and the panel simply ran off the bottom of a short
window with no way to reach the last one. The size step-down and the scroll clamp answer
different failures and neither substitutes for the other.

The width is the same shape of bug. A portalled panel is `position: fixed`, so its
shrink-to-fit width stops at the **viewport** rather than at the space `shift` left it
— so a long label produced a panel exactly as wide as a 390px window at `left: 8`,
with 8px of itself off the right edge. Also pre-existing, also size-independent, and
also made reachable by a larger row's type: measured with a real Mail Sifter label,
which is the case that prompted the request.

## Evidence

- Measured in the browser suite, against the token rather than against `44`: a default
  menu item is `>= --control-height-lg`; the same menu in a 600px-tall window is
  strictly shorter. The panel measures **158px → 134px → 116px** at window heights of
  900 / 600 / 460.
- `Combobox`'s search row and its first option are asserted to be the **same** height
  and the **same** font size, which is the owner's screenshot as a test.
- The search row's hand-picked `px-3` is gone. It existed to line the caret up with
  option labels while the option padding was a hardcoded `px-2`; the row is now wrapped
  in the list's own `p-1` and given the same row-size class, so the two cannot drift.
- `MenuAction` also picked up the `-surface-hover` correction from
  [the 2026-08-05 option-row decision](2026-08-05-option-rows-carry-no-base-bg-transparent-and-highlight-with-surface-hover.md),
  which had been applied to `ListboxOption` and `ComboboxOption` and missed here — its
  hover tint was the base-surface one, which is *darker* than `surface-overlay` in
  every dark scheme, and its base `bg-transparent` was the same same-specificity
  clobber that decision removed.
- 1,525 tests pass; typecheck and both linters are clean.
