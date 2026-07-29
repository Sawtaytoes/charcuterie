/**
 * Registration bookkeeping, shared by every kind that has members.
 *
 * A **multiset**, not a set, and that is the whole point. Two
 * things register the same key more often than you would guess:
 * React StrictMode mounts every component twice in development,
 * and a `VisibilityTrigger` plus its `VisibilityTarget` legitimately
 * share one key. With a plain set, the first unmount unregisters
 * the key out from under the survivor — the exact
 * register/unregister race the plan flags `useLinkedIds` as prone
 * to on remount.
 *
 * Insertion order is `Map` insertion order, which is DOM mount
 * order in practice. That is what `RovingFocus` navigates along
 * and what `MultiplePicker` canonicalises its selection against,
 * so "add then remove" and "remove then add" produce the same
 * array.
 */

export type Registrations<Key> = ReadonlyMap<Key, number>

export const emptyRegistrations = <
  Key,
>(): Registrations<Key> => new Map<Key, number>()

export const hasRegistration = <Key>(
  registrations: Registrations<Key>,
  key: Key,
) => registrations.has(key)

/**
 * Insertion-ordered. A re-registration of a key that is still
 * held keeps its original position — `Map.set` on an existing
 * key does not move it — so a StrictMode double-mount cannot
 * reorder a listbox.
 */
export const getRegisteredKeys = <Key>(
  registrations: Registrations<Key>,
) => Object.freeze([...registrations.keys()])

export const addRegistration = <Key>(
  registrations: Registrations<Key>,
  key: Key,
): Registrations<Key> => {
  const next = new Map(registrations)

  next.set(key, (next.get(key) ?? 0) + 1)

  return next
}

/**
 * Drops the key only when the last holder lets go. Unregistering
 * a key that was never registered is a no-op rather than a throw:
 * cleanup functions run in orders nobody controls, and a
 * double-cleanup should not take down an app.
 */
export const removeRegistration = <Key>(
  registrations: Registrations<Key>,
  key: Key,
): Registrations<Key> => {
  const count = registrations.get(key)

  if (count === undefined) {
    return registrations
  }

  const next = new Map(registrations)

  if (count <= 1) {
    next.delete(key)
  } else {
    next.set(key, count - 1)
  }

  return next
}
