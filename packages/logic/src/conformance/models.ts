/**
 * Reference models — the "obviously correct" second implementation
 * a model-based test compares against.
 *
 * These are deliberately *naive*. Where the cores use a `Map` of
 * hold counts and rebuild derived arrays only when they change,
 * the models keep a flat array of every hold and recompute
 * everything from scratch on each read. Different data structure,
 * different code path, same answers required — a model that
 * mirrored the implementation line for line would agree with its
 * own bugs.
 *
 * They are also where the *specification* lives. Nothing else in
 * the package writes down, in one place, what the roving-focus
 * neighbour rule is or how mount order survives a remount.
 */

/**
 * A multiset as a flat array of holds.
 *
 * `release` drops the **last** matching hold, which is what
 * reproduces `Map` insertion-order semantics: a key that still
 * has holds left keeps its original position, and one released to
 * zero and re-registered goes to the end.
 */
export class RegistrationModel {
  holds: string[] = []

  register(key: string) {
    this.holds.push(key)
  }

  release(key: string) {
    const index = this.holds.lastIndexOf(key)

    if (index >= 0) {
      this.holds.splice(index, 1)
    }
  }

  has(key: string) {
    return this.holds.includes(key)
  }

  /** First-occurrence order — the mount order the DOM has. */
  get keys() {
    return this.holds.filter(
      (key, index) => this.holds.indexOf(key) === index,
    )
  }
}

export class VisibilityModel {
  isVisible = false

  hide() {
    this.isVisible = false
  }

  setIsVisible(isVisible: boolean) {
    this.isVisible = isVisible
  }

  show() {
    this.isVisible = true
  }

  toggle() {
    this.isVisible = !this.isVisible
  }
}

/**
 * Intent plus registration. `visibleKey` and `pendingKey` are the
 * same intent seen through whether its member is mounted, which
 * is why "at most one visible" needs no enforcement.
 */
export class VisibilityGroupModel {
  registrations = new RegistrationModel()

  wantedKey: string | null = null

  get pendingKey() {
    return this.visibleKey === null ? this.wantedKey : null
  }

  get registeredKeys() {
    return this.registrations.keys
  }

  get visibleKey() {
    return this.wantedKey !== null &&
      this.registrations.has(this.wantedKey)
      ? this.wantedKey
      : null
  }

  hide(key: string) {
    if (this.wantedKey === key) {
      this.wantedKey = null
    }
  }

  hideAll() {
    this.wantedKey = null
  }

  show(key: string) {
    this.wantedKey = key
  }

  toggle(key: string) {
    this.wantedKey = this.wantedKey === key ? null : key
  }
}

export class SinglePickerModel {
  registrations = new RegistrationModel()

  wantedValue: string | null = null

  get pendingValue() {
    return this.selectedValue === null
      ? this.wantedValue
      : null
  }

  get registeredValues() {
    return this.registrations.keys
  }

  get selectedValue() {
    return this.wantedValue !== null &&
      this.registrations.has(this.wantedValue)
      ? this.wantedValue
      : null
  }

  clear() {
    this.wantedValue = null
  }

  select(value: string) {
    this.wantedValue = value
  }

  toggle(value: string) {
    this.wantedValue =
      this.wantedValue === value ? null : value
  }
}

export class MultiplePickerModel {
  registrations = new RegistrationModel()

  /** Selection order, no duplicates. */
  wantedValues: string[] = []

  get pendingValues() {
    return this.wantedValues.filter(
      (value) => !this.registrations.has(value),
    )
  }

  get registeredValues() {
    return this.registrations.keys
  }

  /** Mount order, not selection order. */
  get selectedValues() {
    return this.registrations.keys.filter((value) =>
      this.wantedValues.includes(value),
    )
  }

  clear() {
    this.wantedValues = []
  }

  deselect(value: string) {
    this.wantedValues = this.wantedValues.filter(
      (wanted) => wanted !== value,
    )
  }

  select(value: string) {
    if (!this.wantedValues.includes(value)) {
      this.wantedValues.push(value)
    }
  }

  toggle(value: string) {
    if (this.wantedValues.includes(value)) {
      this.deselect(value)
    } else {
      this.select(value)
    }
  }
}

export class RovingFocusModel {
  isWrapping: boolean

  registrations = new RegistrationModel()

  wantedValue: string | null = null

  constructor({ isWrapping }: { isWrapping: boolean }) {
    this.isWrapping = isWrapping
  }

  get activeIndex() {
    return this.activeValue === null
      ? -1
      : this.registeredValues.indexOf(this.activeValue)
  }

  get activeValue() {
    return this.wantedValue !== null &&
      this.registrations.has(this.wantedValue)
      ? this.wantedValue
      : null
  }

  get pendingValue() {
    return this.activeValue === null
      ? this.wantedValue
      : null
  }

  get registeredValues() {
    return this.registrations.keys
  }

  first() {
    const [firstValue] = this.registeredValues

    if (firstValue !== undefined) {
      this.wantedValue = firstValue
    }
  }

  last() {
    const values = this.registeredValues

    if (values.length > 0) {
      this.wantedValue = values[values.length - 1] as string
    }
  }

  next() {
    this.step(1)
  }

  previous() {
    this.step(-1)
  }

  /**
   * The specification of what unregistering the focused member
   * does: focus moves to the next member in the pre-removal
   * order, or the previous one if it was last, or nowhere if the
   * group is now empty. Parking it as pending — which is what
   * every other kind does — would leave a keyboard user with no
   * tab stop inside a group that still has members.
   */
  release(value: string) {
    const isActiveBefore = this.activeValue === value

    const valuesBefore = this.registeredValues

    this.registrations.release(value)

    if (!isActiveBefore || this.registrations.has(value)) {
      return
    }

    const removedIndex = valuesBefore.indexOf(value)

    const survivors = valuesBefore.filter(
      (survivor) => survivor !== value,
    )

    this.wantedValue =
      survivors[removedIndex] ??
      survivors[removedIndex - 1] ??
      null
  }

  setActiveValue(value: string | null) {
    this.wantedValue = value
  }

  private step(offset: number) {
    const values = this.registeredValues

    if (values.length === 0) {
      return
    }

    if (this.activeIndex === -1) {
      this.wantedValue = (
        offset > 0 ? values[0] : values[values.length - 1]
      ) as string

      return
    }

    const rawIndex = this.activeIndex + offset

    const nextIndex = this.isWrapping
      ? (rawIndex + values.length) % values.length
      : Math.min(Math.max(rawIndex, 0), values.length - 1)

    this.wantedValue = values[nextIndex] as string
  }
}

export class LinkedIdsModel {
  targets = new RegistrationModel()

  triggers = new RegistrationModel()

  get targetIds() {
    return this.targets.keys
  }

  get triggerIds() {
    return this.triggers.keys
  }
}
