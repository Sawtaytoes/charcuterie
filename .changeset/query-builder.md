---
"@charcuterie/logic": minor
"@charcuterie/ui": minor
---

Add `QueryBuilder` (`@charcuterie/ui`) and `createTree` (`@charcuterie/logic`): a generic, arbitrarily-nestable group editor with an opaque leaf value **and** an opaque group combinator. `createTree` is a headless normalized-tree state core (add/remove/move/patch, stable ids, `serialize`) with React and Preact bindings; `QueryBuilder` renders nestable combinator groups with a `renderLeaf` render-prop. Built to be shared by Mail Sifter's nested mail rules (AND/OR) and mux-magic's job DSL (any/all/none).
