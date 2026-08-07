# charcuterie-node-base — the fleet Node base image

`ghcr.io/sawtaytoes/charcuterie-node-base:<NODE_MAJOR>` — the Docker delivery channel of
the shared build tooling. Bakes the invariants every fleet app otherwise copies, so an
app's Dockerfile is `FROM` this plus only its own runtime layer.

## What it bakes

- **Node** via `node:${NODE_MAJOR}-slim` — one `ARG NODE_MAJOR` (default 26); the tag IS
  the major (`:24`, `:26`).
- **The Node-26 corepack fix** — `npm install -g corepack@latest && corepack enable`
  (a bare `corepack enable` is exit-127 on Node 26) + `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`.
- `ca-certificates`, **`tini` as PID 1**, `WORKDIR /app`, and a non-root **`USER node`**.

## Using it in an app

```dockerfile
ARG NODE_MAJOR=26
FROM ghcr.io/sawtaytoes/charcuterie-node-base:${NODE_MAJOR} AS base
# ... builder + runtime stages — see Dockerfile.builder.template
```

A runtime stage that needs OS packages drops to root for apt, then back:

```dockerfile
USER root
RUN apt-get update && apt-get install --yes --no-install-recommends ffmpeg \
  && rm --recursive --force /var/lib/apt/lists/*
USER node
```

Files here: `Dockerfile` (the image), `Dockerfile.builder.template` (the shared
builder/runtime skeleton the scaffolding CLI emits), `dockerignore.template` (copy to a
repo root as `.dockerignore`).

## Delivery & updates

Built + pushed by [`.github/workflows/docker-base-image.yml`](../../.github/workflows/docker-base-image.yml)
on every change here (PRs build without pushing — the build is the verification). Public
registry so GitHub-hosted runners **and** Forgejo/LAN builds can pull it. Bumping Node =
change the matrix + consumers' `FROM` tag; Renovate propagates the tag.

> **Image name** follows the `@charcuterie/<tool>-config` functional-naming convention.
> Confirm with the owner before first publish if a different name is preferred — it only
> appears in this workflow's `tags` and consumers' `FROM`.
