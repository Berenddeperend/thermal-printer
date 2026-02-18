#!/usr/bin/env bash
# Print raw RGBA pixel data via the canvas endpoint
# Usage: ./scripts/test-canvas.sh <file.rgba> <width> <height> [base_url] [--dither]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

FILE="${1:?Usage: $0 <file.rgba> <width> <height> [base_url] [--dither]}"
WIDTH="${2:?Usage: $0 <file.rgba> <width> <height> [base_url] [--dither]}"
HEIGHT="${3:?Usage: $0 <file.rgba> <width> <height> [base_url] [--dither]}"
BASE_URL="${4:-http://${PRINTER_PI#*@}:3000}"

DITHER=""
for arg in "$@"; do
  [[ "$arg" == "--dither" ]] && DITHER="&dither=true"
done

curl -X POST "$BASE_URL/api/printer/canvas?width=$WIDTH&height=$HEIGHT$DITHER" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary "@$FILE"
