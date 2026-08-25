---
"@charcuterie/logic": minor
---

`useFlipList` — a re-ordered list animates from where it was, instead of cutting

FLIP for a list React itself renders: measure each keyed child before the commit,
measure again after, and play the difference back as a transform that decays to
nothing. The element never travels — it is already where it belongs.

Two apps had grown this shape independently (queuepilot's poster grid, Docket's phase
list), which is the threshold for it moving here.

```tsx
const listRef = useFlipList({ signature: ids.join(",") })

<ul ref={listRef}>
  {ids.map((id) => <li data-flip-key={id} key={id}>…</li>)}
</ul>
```

Duration and easing are read from `--duration-normal` and `--easing-standard` rather
than hard-coded, so a re-order moves at the same speed as every transition around it.
That also means `prefers-reduced-motion` needs no separate test in the hook: the tokens
collapse every duration to `0ms` inside that media query, and a zero returns early.

`isAnimating: false` suppresses the motion for a paint that is not a re-order — opening
a different list entirely, or the first paint of one.
