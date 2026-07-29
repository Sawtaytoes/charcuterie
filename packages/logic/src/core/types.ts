/**
 * The store seam.
 *
 * Every state kind in this package is a plain factory that owns
 * its state through one injected store. That injection is the
 * single decision the whole package hangs on: it is what lets one
 * library serve React 19 and Preact+signals, and retrofitting it
 * later would be a rewrite rather than a refactor.
 *
 * Jotai is deliberately *not* a hard dependency. Every state kind
 * here is already scoped to a provider subtree, which React
 * context gives free, so atoms buy scoping that is already paid
 * for — while costing ~5–6 KB that `castkit/packages/slatecast`
 * (60 KB gz, `@preact/signals`) will not pay. Signals already do
 * what atoms do there.
 *
 * So the default is a ~20-line observable ref, and
 * `@charcuterie/logic/jotai` / `@charcuterie/logic/signals` swap
 * in the real thing for consumers that already have one.
 */

export type Listener = () => void

export type Unsubscribe = () => void

/**
 * Exactly three members. Anything a store can do beyond `get`,
 * `set`, and `subscribe` is something a *core* should be doing
 * instead — that is what keeps the Jotai and signals adapters
 * around thirty lines each, and what makes them provably
 * interchangeable by running one suite against all of them.
 *
 * `set` takes a value, never an updater function. An updater
 * overload would be ambiguous the moment `Value` is itself a
 * function, and the cores have `getState()` right there.
 */
export type CharcuterieStore<Value> = {
  get: () => Value
  set: (value: Value) => void
  subscribe: (listener: Listener) => Unsubscribe
}

export type CreateCharcuterieStore = <Value>(
  initialValue: Value,
) => CharcuterieStore<Value>

/**
 * Every core takes this. Spelled as its own type because it is
 * the shared half of six different options objects.
 */
export type StoreOptions = {
  createStore?: CreateCharcuterieStore
}

/**
 * The shape every core exposes for reading.
 *
 * `getState` returns a frozen object whose identity changes only
 * when the state actually changes. That is load-bearing, not
 * housekeeping: React's `useSyncExternalStore` and the Preact
 * binding both re-render on identity, so a core that rebuilt its
 * derived arrays on every read would loop forever.
 */
export type ReadableCore<State> = {
  getState: () => Readonly<State>
  subscribe: (listener: Listener) => Unsubscribe
}
