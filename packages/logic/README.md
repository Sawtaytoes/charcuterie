# `@charcuterie/logic`

The five Charcuterie state kinds, as framework-free cores with React 19 and Preact
bindings. No components — those are `@charcuterie/ui` (M3).

```
@charcuterie/logic            React 19 binding (default entry)
@charcuterie/logic/core       framework-free factories, zero dependencies
@charcuterie/logic/preact     Preact binding (no preact/compat)
@charcuterie/logic/jotai      optional store adapter
@charcuterie/logic/signals    optional store adapter
```

## The five kinds

| Kind | Question it answers | Used by |
| --- | --- | --- |
| `createVisibility` | Is this shown? | Modal, Drawer, Popover, Tooltip, Disclosure |
| `createVisibilityGroup` | Which **one** is shown? | Tabs, Accordion, a Menu's submenus |
| `createSinglePicker` | Which **one** is chosen? | Radio, Select, segmented control |
| `createMultiplePicker` | Which **set** is chosen? | Checkbox group, multi-select filter |
| `createRovingFocus` | Which one is **tabbable**? | Listbox, Menu, Toolbar, Tab list |
| `createStatus` | Where in a **lifecycle**? | Badge, LiveStatusIndicator, ProgressBar |

The last two are new in v2; see
[the five-state-kinds decision](../../docs/decisions/2026-07-29-five-state-kinds.md).
`createLinkedIds` sits alongside them as shared `aria-controls` / `aria-labelledby`
bookkeeping — it holds no user-facing state, so it is not a sixth kind.

## Shape

Every core is `{ getState, subscribe, ...commands }` plus pure selectors:

```ts
import {
  createVisibilityGroup,
  selectIsKeyVisible,
} from "@charcuterie/logic/core"

const tabs = createVisibilityGroup()

const release = tabs.register("overview")

tabs.show("overview")

selectIsKeyVisible(tabs.getState(), "overview") // true
```

`getState()` returns a **frozen object whose identity changes only when the state does**.
That is load-bearing, not housekeeping: `useSyncExternalStore` re-renders on identity, so
a core that rebuilt its derived arrays on every read would re-render a whole listbox for
nothing — and, in the Preact binding, loop.

The React and Preact hooks flatten that into one object:

```ts
const { register, show, visibleKey } = useVisibilityGroup()
```

They are **uncontrolled**: `visibleKey` is an initial value, and `onChange` is the
observation escape hatch. See
[the uncontrolled-hooks decision](../../docs/decisions/2026-07-29-logic-hooks-are-uncontrolled.md).

## Intent, registration, and what falls out

The four member-having kinds store *what the consumer asked for* and derive the public
answer from that plus who is currently mounted. Three properties come free:

- **A value set before its member mounts is not lost.** It parks in
  `pendingKey`/`pendingValue(s)` and is promoted on registration — which is what makes a
  form's initial value survive its options mounting a tick later.
- **A remount round-trips.** StrictMode's double mount, a route change, a virtualised list
  scrolling a row out and back — the intent was never discarded, so it comes back
  selected.
- **The invariants are true by representation.** "At most one visible" is one field.
  "`selectedValue` is always a registered option or `null`" is a derivation, not a rule six
  commands have to remember.

Registrations are a **multiset**, not a set. Two things register the same key more often
than you would guess, and with a plain set the first unmount unregisters it out from under
the survivor.

`createRovingFocus` breaks the symmetry in one direction on purpose: unregistering the
*focused* member moves focus to its neighbour rather than parking it, because a keyboard
user whose row disappeared expects the next row.

## Store injection

```ts
import { createStoreFromJotai } from "@charcuterie/logic/jotai"

useVisibility({ createStore: createStoreFromJotai(jotaiStore) })
```

The seam has exactly three members — `get`, `set`, `subscribe` — and the default is a
20-line observable ref with no dependencies. Jotai is not a dependency; see
[the store-injection decision](../../docs/decisions/2026-07-29-store-injection-not-a-jotai-dependency.md).

## Testing

```bash
yarn vitest run --project logic       # cores, node
yarn vitest run --project logic-dom   # React + Preact bindings, chromium
```

`src/conformance/` holds **one** model-based suite that runs against five adapters: the
core, the core over a Jotai store, the core over a `@preact/signals-core` store, the React
19 binding, and the Preact binding. fast-check generates random command sequences, applies
each to both a naive reference model and the real thing, and asserts after **every** step.

The DOM adapters mount a host component that renders `null` and rebuild `getState()` from
the **last committed render** — so a binding that failed to re-render reads stale and the
model catches it on the next assertion.

Mutation-checked, because a green suite that cannot fail proves nothing:

| Deliberate regression | Result |
| --- | --- |
| multiset → plain `Set` in `registrations.ts` | 15 core properties fail |
| Preact `useStoreValue` stops subscribing | 10 Preact properties fail, React unaffected |

> **Sandbox note.** `PLAYWRIGHT_BROWSERS_PATH` points at `/opt/pw-browsers`, which ships
> Chromium build 1228; this repo's Playwright wants 1234. Run the browser project with
> `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` until the sandbox image catches
> up.

## What is deliberately not here

Floating positioning, dismiss layers, focus traps, typeahead, virtualisation, and date
logic. Those arrive in M4 on `@floating-ui/react`, which is *controlled by construction* —
you pass state in, it never stores it — so `VisibilityGroup` stays the sole owner. Radix,
Base UI, and Ark UI all own `open` themselves, which is the conflict this package exists to
avoid.
