#!/usr/bin/env bash
# Run npm test in every v4 example directory.
set -uo pipefail

export SKIP_DB=1
export JWT_SECRET=dev-secret-change-me-min-32-chars-long
export NODE_ENV=test

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=()

for dir in "$ROOT"/[0-9][0-9]-*; do
  name="$(basename "$dir")"
  echo "======== $name ========"
  cd "$dir"

  if [ ! -d node_modules ]; then
    npm install --no-fund --no-audit --silent
    npm approve-scripts esbuild unrs-resolver 2>/dev/null || true
  fi

  if [ "$name" = "06-database-prisma" ]; then
    npm approve-scripts prisma @prisma/engines 2>/dev/null || true
    npx prisma generate --silent 2>/dev/null || npx prisma generate
  fi

  set +e
  output=$(npm test 2>&1)
  status=$?
  set -e

  echo "$output" | tail -5

  if [ "$status" -eq 0 ]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name"
    FAILED+=("$name")
    echo "$output" | grep -E "FAIL|error TS|Expected" | head -5
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "Failed examples: ${FAILED[*]}"
  exit 1
fi

echo "All 15 examples passed."
