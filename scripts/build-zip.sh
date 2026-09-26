#!/usr/bin/env bash
set -euo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
output="$root/dist/utmkeeperflow.zip"

mkdir -p "$root/dist"
# git archive packages committed files only; worktree attributes let this script
# honor .gitattributes even before it has been committed.
git -C "$root" archive \
  --format=zip \
  --worktree-attributes \
  --prefix=utmkeeperflow/ \
  --output="$output" \
  HEAD

printf 'Created %s from committed HEAD (%s)\n' "$output" "$(git -C "$root" rev-parse --short HEAD)"
