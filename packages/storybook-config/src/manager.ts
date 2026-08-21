import { createElement, type ReactNode } from "react"

/**
 * The manager's own entry types, restated at the width this file
 * uses them.
 *
 * `storybook/manager-api` does export `API_HashEntry`, but every
 * field beyond these three is irrelevant to a label, and a
 * structural type keeps this compiling across the 10.x line if the
 * entry gains members.
 */
export type SidebarEntry = {
  name: string
  tags?: readonly string[]
  type?: string
}

/**
 * The tag that earns the badge.
 *
 * Storybook tags are free-form strings, and the manager builds a
 * group or component entry's tags as the **intersection** of its
 * children's — so `tags: ["deprecated"]` on a story meta lands on
 * the component node in the sidebar as well as on each story under
 * it, and never leaks up to `Components/Controls`, which would need
 * every child deprecated to qualify.
 */
export const DEPRECATED_TAG = "deprecated"

/**
 * Inline styles, and not the design system's tokens.
 *
 * This runs in Storybook's **manager** bundle, which is a separate
 * app from the preview: no Tailwind pass, no `@charcuterie/tokens`
 * custom properties, and no `data-scheme` from our theme axes. The
 * manager has its own light/dark theming, so the badge is drawn in
 * `currentColor` at reduced opacity — legible on either of
 * Storybook's own backgrounds without claiming a colour it cannot
 * check.
 */
const BADGE_STYLE = {
  border: "1px solid currentColor",
  borderRadius: "0.25rem",
  flex: "none",
  fontSize: "0.625rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  lineHeight: 1.7,
  marginInlineStart: "0.5rem",
  opacity: 0.7,
  paddingInline: "0.3rem",
  textTransform: "uppercase",
} as const

const LABEL_STYLE = {
  alignItems: "center",
  display: "inline-flex",
  // The name is the part that may be long; the badge beside it is
  // `flex: none`. Without this the badge sets the row's floor and
  // pushes itself out of a narrow sidebar.
  minWidth: 0,
} as const

const NAME_STYLE = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const

/**
 * Draw a sidebar row: the entry's name, plus a `DEPRECATED` badge
 * when the entry carries the tag.
 *
 * **A label rather than a `Deprecated/` section, deliberately.** A
 * deprecated component moved to its own folder is invisible to the
 * one reader who needs the warning — somebody scanning `Controls`
 * for a picker, who finds `Picker`, `Listbox`, `Combobox` and no
 * reason to think a fourth one exists. Left in place with a badge,
 * the warning is on the path they were already walking, and the
 * component sits next to the replacement it should convert to.
 *
 * The badge is drawn on the **component** node only. Repeating it on
 * `Docs`, `Default`, `All Variants` and `Sized` underneath says
 * nothing the parent has not already said, four more times.
 *
 * **`createElement`, not JSX, and that is not a style choice.** The
 * manager bundle resolves `react` to its own global, but its globals
 * map (`storybook/dist/manager/globals.js`) names only `react`,
 * `react-dom` and `react-dom/client` — **not `react/jsx-runtime`**.
 * Compile this file with the automatic JSX runtime and the import it
 * emits pulls a *second* React into the manager, whose elements the
 * manager's own React does not recognise: the whole sidebar dies
 * with minified React error #31, "objects are not valid as a React
 * child", and the only thing on screen is Storybook's error panel.
 */
export const renderSidebarLabel = (
  item: SidebarEntry,
): ReactNode => {
  const isDeprecated =
    item.type === "component" &&
    (item.tags ?? []).includes(DEPRECATED_TAG)

  if (!isDeprecated) {
    return item.name
  }

  return createElement(
    "span",
    { style: LABEL_STYLE },
    createElement("span", { style: NAME_STYLE }, item.name),
    createElement(
      "span",
      {
        style: BADGE_STYLE,
        title:
          "Deprecated — the component's docs page names its replacement.",
      },
      DEPRECATED_TAG,
    ),
  )
}

/**
 * The fleet's shared manager config. An app's `.storybook/manager.ts`
 * is two lines:
 *
 * ```ts
 * import { addons } from "storybook/manager-api"
 * import { charcuterieManagerConfig } from "@charcuterie/storybook-config/manager"
 *
 * addons.setConfig(charcuterieManagerConfig)
 * ```
 *
 * Spread it if the app has manager config of its own — this object
 * claims only `sidebar.renderLabel`.
 */
export const charcuterieManagerConfig = {
  sidebar: {
    renderLabel: renderSidebarLabel,
  },
}
