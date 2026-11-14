---
"@charcuterie/server": minor
---

`createStaticHandler` serves only `GET` and `HEAD`. Any other method falls through to the
app, so a `POST` to a real file or a client route reaches the app's own route, 404, or 405
instead of a `200` with the file or the shell. `@hono/node-server` 1.x answered every method
with the file. `createDeploymentHandler` does the same for its two endpoints.

The handler now sets `Cache-Control` only on the response it serves. Before, a miss carried
the header into the app's next handler, so the app's 404 for a missing `/assets/*.js` went
out as `public, max-age=31536000, immutable`. A miss now leaves the app's own headers alone.
