#!/usr/bin/env bash
# Run Biome + build across every independent app. Mirrors the CI lint matrix.
set -euo pipefail

for app in api web-staff web-kds web-order; do
  echo "▶ $app: biome check"
  (cd "apps/$app" && pnpm biome check .)
  echo "▶ $app: build"
  (cd "apps/$app" && pnpm build)
done

echo "✔ all apps clean"
