#!/usr/bin/env bash
# Print raw RGBA pixel data via the canvas endpoint
# Usage: ./scripts/test-canvas.sh <file.rgba> <width> <height> [base_url]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

FILE="${1:?Usage: $0 <file.rgba> <width> <height> [base_url]}"
WIDTH="${2:?Usage: $0 <file.rgba> <width> <height> [base_url]}"
HEIGHT="${3:?Usage: $0 <file.rgba> <width> <height> [base_url]}"
BASE_URL="${4:-http://${PRINTER_PI#*@}:3000}"

curl -X POST "$BASE_URL/api/printer/canvas?width=$WIDTH&height=$HEIGHT" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary "@$FILE"
