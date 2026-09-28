---
"@charcuterie/ui": minor
---

Add Breadcrumbs: a named `<nav>` around an `<ol>` for the path back up a hierarchy. A rung with an `href` is a routed `TextLink`, a rung with only `onSelect` is a button painted as the same link (for trails over state with no URL), and a last rung with neither is the current page with `aria-current="page"`. A trail of links only has no current rung, for a trail above a heading that already names the page. The trail wraps and never truncates, and the default separator is a CSS chevron, not a glyph.
