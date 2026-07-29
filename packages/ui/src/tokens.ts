/**
 * `@charcuterie/ui/tokens` — the tokens, under the name a React
 * consumer already has installed.
 *
 * The build-graph split between `tokens` and `ui` exists for two
 * consumers that cannot take a React tree: `castkit/packages/views`
 * renders through Satori and needs resolved literals, and
 * `slatecast` has 60 KB gz to spend. Neither should have to install
 * `@charcuterie/ui` to read a colour.
 *
 * That is a build-graph split, **not an API split** — so a React app
 * importing `@charcuterie/ui` gets the tokens from the same package
 * name and never has to know the boundary exists.
 */

export * from "@charcuterie/tokens"
