#!/bin/sh
# Run from this package after its build and tests pass. No network or
# credentials here: it writes an installable archive, and uploading it to
# Forgejo's generic package registry is a separate step (see README).
set -eu
output="${1:?usage: release.sh OUTPUT.tar.gz [VERSION]}"
# A release candidate carries its own version, so it can never be mistaken
# for the release cut from the merged commit.
version="${2:-}"
if [ -n "$(git status --porcelain -- .)" ]; then
  echo 'Commit the package before producing a release archive.' >&2
  exit 1
fi
if [ ! -f dist/index.js ] || [ ! -f dist/styles.css ]; then
  echo 'Run pnpm build first: the archive ships dist, not src.' >&2
  exit 1
fi
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT INT TERM
mkdir "$stage/email-viewer"
cp -R dist README.md "$stage/email-viewer/"
cp ../../LICENSE "$stage/email-viewer/LICENSE"
# A consumer installs this by URL, so the manifest must carry no workspace
# protocol and nothing only this repository can resolve.
node -e '
const fs = require("node:fs")
const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"))
delete manifest.devDependencies
delete manifest.scripts
for (const key of Object.keys(manifest.exports)) {
  const entry = manifest.exports[key]
  if (typeof entry === "object") delete entry.source
}
manifest.files = ["dist", "README.md", "LICENSE", "SOURCE_COMMIT"]
if (process.argv[2]) manifest.version = process.argv[2]
fs.writeFileSync(process.argv[1], JSON.stringify(manifest, null, 2) + "\n")
' "$stage/email-viewer/package.json" "$version"
# A runtime marker identifies the exact source commit as well as the version.
git rev-parse HEAD > "$stage/email-viewer/SOURCE_COMMIT"
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -czf "$output" -C "$stage" email-viewer
sha256sum "$output"
