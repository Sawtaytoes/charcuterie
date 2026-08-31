---
"@charcuterie/ui": minor
---

`Tabs` takes routed items. A tab with an `href` renders as a real `<a href>` through the
`RouterLinkProvider` seam, so a section that has an address survives reload, Back and
"open in a new tab". Pass `activeHref` to select this mode; `Nav`'s `resolveActiveKey`
decides which tab is current.

The routed bar is a named `<nav>` of links with `aria-current="page"`, not a `tablist` —
`role="tab"` on an anchor overrides the link role. Both modes share one paint definition,
so a routed tab and a panel tab are drawn identically.

Existing `Tabs` call sites are unchanged.
