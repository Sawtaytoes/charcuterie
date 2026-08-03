/**
 * The surface an anchored overlay's panel is drawn on — the four
 * tokens `Popover` and `Menu` wrote out byte-identically, and that
 * `Listbox` and `Combobox` are about to write a third and fourth
 * time.
 *
 * Only the *surface* lives here: the raised background, the hairline
 * border, the corner radius, and the elevation. Everything a panel
 * does with that surface — a popover's `max-w-xs p-3`, a menu's
 * `min-w-48 flex flex-col`, a listbox's scroll clamp — is the panel's
 * own and stays at the call site, composed after this with
 * `toClassName`. Pulling the shared half out is what keeps a change
 * to the overlay surface (a new elevation token, say) from having to
 * be made in four places and kept in agreement by hand.
 */
export const PANEL_SURFACE_CLASS =
  "rounded-md border border-border-default bg-surface-overlay shadow-medium"
