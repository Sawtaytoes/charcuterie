# An unstyled link routes without owning paint

**Status:** Accepted
**Date:** 2026-09-03
**Type:** UI / routing
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-08-10-buttons-are-actions-links-are-navigation.md](2026-08-10-buttons-are-actions-links-are-navigation.md)

## Decision

`@charcuterie/ui` exports `UnstyledLink`. It accepts the platform anchor props with a
required `href`, adds no class or visual state, and sends routable destinations through the
injected `RouterLinkProvider`. External URLs, other schemes, and fragments remain platform
anchors. With no provider, every destination is still a working anchor.

`TextLink` and `ButtonLink` remain the defaults for new UI. `UnstyledLink` is for an
established app-owned treatment whose appearance must not change as routing is added.

## Context

Mux Magic had ten same-view anchors with five distinct app-owned treatments. Its React
Router adapter was already wired, but every one of those anchors reloaded the document.
Replacing them with `TextLink` would also add the library's font weight, focus ring, radius,
underline, and intent colour. The routing repair did not authorize that visual change.

A fleet survey on 2026-09-03 found no other remaining literal same-view anchor in an owned
app. That result makes the current consumer singular, but the missing capability belongs to
the router seam: any established consumer can need to preserve its own paint while adopting
soft navigation. Keeping the primitive in the library also lets Storybook and isolated tests
fall back to `AnchorLink` without installing an app router.

## Why

Calling `useRouterLink` separately in each app would duplicate the destination test and its
no-provider fallback. Importing React Router's `Link` directly would throw in stories and
tests that intentionally render without a router. Repainting an existing link with
`TextLink` would mix a navigation repair with an unrelated design change.

`UnstyledLink` composes the three exported parts already responsible for this behavior:
`useRouterLink`, `getIsRoutedHref`, and `AnchorLink`. It adds no second routing policy.

## Evidence

- Docket task `task_8psl4d1smtjumome`, "Convert the ten raw in-app anchors to router links",
  records the ten call sites and the visual constraint.
- The workspace decision
  `agentic/docs/decisions/2026-09-02-a-router-in-the-tree-is-not-routing-the-links-are-the-check.md`
  records the failed Mux Magic router audit and requires a link-level check.
- Fleet survey command:
  `rg -uu -U '<a\\b[\\s\\S]{0,500}?href=\\{?"/'` over owned app web sources, excluding
  worktrees, dependencies, build output, and external checkouts.
