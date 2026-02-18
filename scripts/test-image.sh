#!/usr/bin/env bash
# Print a PNG file via the image endpoint
# Usage: ./scripts/test-image.sh <file.png> [base_url] [--dither]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

FILE="${1:?Usage: $0 <file.png> [base_url] [--dither]}"
BASE_URL="${2:-http://${PRINTER_PI#*@}:3000}"

QUERY=""
for arg in "$@"; do
  [[ "$arg" == "--dither" ]] && QUERY="?dither=true"
done

curl -X POST "$BASE_URL/api/printer/image$QUERY" \
  -H 'Content-Type: image/png' \
  --data-binary "@$FILE"
