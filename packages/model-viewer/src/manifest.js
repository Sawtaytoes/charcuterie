/** Resolve old query presets as well as the versioned manifest's named views. */
export function initialView(manifest, query) {
  const alias = Object.entries(
    manifest.queryViews || {},
  ).find(([key]) => {
    const entries = [...new URLSearchParams(key)]
    return (
      entries.length > 0 &&
      entries.every(
        ([parameter, value]) =>
          query.get(parameter) === value,
      )
    )
  })?.[1]
  const name =
    alias ||
    query.get("view") ||
    manifest.initialView ||
    "iso"
  return ["iso", "front", "right", "top"].includes(name) ||
    Object.hasOwn(manifest.views || {}, name)
    ? name
    : "iso"
}
