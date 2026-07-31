import type { StatusTransitions } from "@charcuterie/logic"

/**
 * The one machine the plan wrote down and M2 did not build:
 *
 * > | Toast lifecycle | entering → visible → exiting → removed |
 *
 * It is here rather than in `@charcuterie/logic/core` beside
 * `asyncTransitions` and `connectionTransitions` on purpose. Those
 * two describe *data* — a fetch, a socket — and a Preact app with no
 * components at all still wants them. This one describes an
 * **animation**, which only exists because something is being
 * painted, so it belongs to the component layer.
 */
export type ToastStatus =
  | "entering"
  | "exiting"
  | "removed"
  | "visible"

/**
 * `visible → removed` is deliberately **not** a legal transition,
 * and neither is anything out of `removed`.
 *
 * The first means a toast cannot skip its exit — a dismissal that
 * unmounts the node immediately is the flicker every hand-rolled
 * toast stack has, and making it illegal turns that into a thrown
 * error in a test rather than a jump nobody files.
 *
 * The second makes `removed` terminal, which is what lets the region
 * call `onDismiss` exactly once. `createStatus` throws on an illegal
 * transition, so a second timer firing after the first is a loud
 * failure instead of a duplicate removal.
 *
 * `exiting → visible` **is** legal: pointing at a toast that is
 * already sliding away has to bring it back, or the user is chasing
 * a disappearing message with the cursor.
 */
export const toastTransitions: StatusTransitions<ToastStatus> =
  {
    entering: ["visible", "exiting"],
    exiting: ["removed", "visible"],
    removed: [],
    visible: ["exiting"],
  }
