#!/bin/sh
# Run from this package after its build/tests pass. No network or credentials here.
set -eu
output="${1:?usage: release.sh OUTPUT.tar.gz}"
if [ -n "$(git status --porcelain -- .)" ]; then
  echo 'Commit the package before producing a release archive.' >&2
  exit 1
fi
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT INT TERM
mkdir "$stage/model-viewer"
cp -R src dist package.json README.md "$stage/model-viewer/"
cp ../../LICENSE "$stage/model-viewer/LICENSE"
find "$stage/model-viewer/src" -name '*.test.js' -delete
# A runtime marker identifies the exact source commit as well as the package version.
git rev-parse HEAD > "$stage/model-viewer/SOURCE_COMMIT"
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -czf "$output" -C "$stage" model-viewer
sha256sum "$output"
