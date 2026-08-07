# syntax=docker/dockerfile:1

# Charcuterie fleet Node base image.
#
# Bakes the invariants every fleet app otherwise repeats — the Node-26
# corepack fix, a non-prompting corepack, ca-certificates, a WORKDIR,
# tini as PID 1, and a non-root default user — so an app's Dockerfile
# becomes `FROM ghcr.io/sawtaytoes/charcuterie-node-base:<major>` plus
# only its own runtime layer (ffmpeg / makemkv / chromium / python /
# entrypoint).
#
# One `ARG NODE_MAJOR` makes the 24<->26 bump a one-line change, and
# the published tag IS the Node major (…:24, …:26) so Renovate bumps
# the `FROM` tag across every consumer.
ARG NODE_MAJOR=26
FROM node:${NODE_MAJOR}-slim

# corepack must never stop to ask in a non-interactive image build.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Node 26's official images unbundled corepack, so a bare
# `corepack enable` is exit-127 on 26 (bit rip-deck + portly at deploy
# time). Install it first — the fix castkit/mux-magic/gallery-downloader
# already use. tini reaps zombies and forwards signals as PID 1;
# ca-certificates for TLS to registries.
RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    ca-certificates \
    tini \
  && rm --recursive --force /var/lib/apt/lists/* \
  && npm install --global corepack@latest \
  && corepack enable \
  && mkdir --parents /app \
  && chown node:node /app

WORKDIR /app

# Secure default. A later stage that needs apt does `USER root` first,
# then drops back to `USER node` before the app runs.
USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
