#!/usr/bin/env bash
# Approve esbuild and unrs-resolver install scripts (npm 11+ allowScripts).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for dir in "$ROOT"/[0-9][0-9]-*; do
  name="$(basename "$dir")"
  if [ ! -f "$dir/package.json" ]; then
    continue
  fi
  echo "approve-scripts: $name"
  (
    cd "$dir"
    if [ -d node_modules/esbuild ] || [ -d node_modules/unrs-resolver ]; then
      npm approve-scripts esbuild unrs-resolver 2>/dev/null || true
    fi
  )
done

echo "Done."
