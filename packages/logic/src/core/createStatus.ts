/**
 * The fifth kind — **Status**. A tiny typed finite state machine.
 *
 * The larger of the two additions to the original three-kind
 * thesis, and the one that earns its ADR. The existing model
 * covers binary state (Visibility) and set membership (Single and
 * Multiple Selection). It has nothing for *ordered lifecycles*,
 * and the fleet is full of them:
 *
 * | Where | States |
 * | --- | --- |
 * | `ripdeck` bay | idle → ripping → verifying → complete \| failed \| quarantined \| held |
 * | `mux-magic` `StatusBadge` | pending → running → completed \| failed \| cancelled |
 * | Connection indicator, 4 repos, all different | connecting → connected → reconnecting → disconnected |
 * | Toast lifecycle | entering → visible → exiting → removed |
 * | Async request | idle → loading → success → error |
 * | `castkit` optimistic mutation | predicted → confirmed \| timed-out |
 *
 * Every one of those is a stringly-typed `Record<string, string>`
 * today, which is why `ripdeck` declares an identical `TONE_CLASS`
 * map in two files and why nothing stops a bay going from
 * `complete` back to `ripping`.
 *
 * **Deliberately not XState.** XState owns state, which is the
 * same conflict that rules out Radix for the overlay kinds, and it
 * is heavy. What is actually needed is four things: an exhaustive
 * TS union, a compile error on an unhandled state, a runtime throw
 * on an illegal transition, and the same model-based test
 * treatment the other kinds get. That is this file.
 */

import { createStore as createDefaultStore } from "./createStore.ts"
import type {
  CreateCharcuterieStore,
  ReadableCore,
} from "./types.ts"

export type StatusTransitions<State extends string> =
  Readonly<Record<State, readonly State[]>>

export type StatusState<State extends string> = {
  status: State
}

export type StatusOptions<State extends string> = {
  createStore?: CreateCharcuterieStore
  initialState: State
  onChange?: (status: State) => void
  transitions: StatusTransitions<State>
}

export type Status<State extends string> = ReadableCore<
  StatusState<State>
> & {
  /** Whether `transitionTo` would succeed. */
  can: (status: State) => boolean
  is: (status: State) => boolean
  reset: () => void
  /** Throws on an illegal transition. */
  transitionTo: (status: State) => void
}

export const selectStatus = <State extends string>(
  state: StatusState<State>,
) => state.status

/**
 * Exhaustiveness helper. A `switch` over a machine's states that
 * calls this in its `default` stops compiling the day a state is
 * added — which is the entire reason a component should consume a
 * shared machine definition rather than a `Record<string, string>`.
 *
 * ```ts
 * switch (status) {
 *   case "connected": return "success"
 *   ...
 *   default: return assertNeverStatus(status)
 * }
 * ```
 */
export const assertNeverStatus = (status: never): never => {
  throw new Error(
    `Unhandled status: ${JSON.stringify(status)}. A state was added to the machine and this switch was not updated.`,
  )
}

/**
 * States no sequence of legal transitions can reach from
 * `initialState`. Almost always a typo in the transition table —
 * a `failed` nobody can get to is a badge variant that will never
 * render.
 *
 * Exported because it is a property of a *definition*, not of a
 * running machine, so it belongs in a machine's own test rather
 * than in this one's runtime.
 */
export const getUnreachableStates = <State extends string>(
  transitions: StatusTransitions<State>,
  initialState: State,
) => {
  const reached = new Set<State>([initialState])

  const queue: State[] = [initialState]

  while (queue.length > 0) {
    const current = queue.shift() as State

    for (const next of transitions[current] ?? []) {
      if (!reached.has(next)) {
        reached.add(next)

        queue.push(next)
      }
    }
  }

  return (Object.keys(transitions) as State[]).filter(
    (status) => !reached.has(status),
  )
}

export const createStatus = <State extends string>({
  createStore = createDefaultStore,
  initialState,
  onChange,
  transitions,
}: StatusOptions<State>): Status<State> => {
  if (!(initialState in transitions)) {
    throw new Error(
      `createStatus: initialState "${initialState}" is not a state in the transition table.`,
    )
  }

  const store = createStore<StatusState<State>>(
    Object.freeze({ status: initialState }),
  )

  const can = (status: State) =>
    (transitions[store.get().status] ?? []).includes(status)

  return {
    can,

    getState: store.get,

    is: (status) => store.get().status === status,

    /**
     * Back to the initial state unconditionally. Not a
     * transition — a machine that has reached a terminal state
     * usually has no legal edge home, and "throw this one away
     * and start again" is what a retry button does.
     */
    reset: () => {
      if (store.get().status === initialState) {
        return
      }

      store.set(Object.freeze({ status: initialState }))

      onChange?.(initialState)
    },

    subscribe: store.subscribe,

    transitionTo: (status) => {
      const { status: current } = store.get()

      if (status === current) {
        return
      }

      if (!can(status)) {
        // Loud on purpose. A silent no-op here is a bay stuck on
        // `ripping` forever with nothing in the log to say why.
        throw new Error(
          `Illegal status transition: "${current}" → "${status}". Legal from "${current}": ${
            (transitions[current] ?? []).join(", ") ||
            "(none)"
          }.`,
        )
      }

      store.set(Object.freeze({ status }))

      onChange?.(status)
    },
  }
}
