---
"@charcuterie/ui": minor
---

Add `GroupedList`: an always-open list whose rows sit under group headings. Each row takes a `label`, an optional muted `description`, `badges`, richer `content`, and trailing `actions`. The heading names its list (no landmark per group), an empty group is skipped, `emptyState` draws when every group is empty, long text clips with a tooltip while clipped (`isTextTruncated={false}` wraps instead), and the actions wrap under the text in a narrow list.
