#!/usr/bin/env bash
# Print raw RGBA pixel data via the canvas endpoint
# Usage: ./scripts/test-canvas.sh <file.rgba> <width> <height> [base_url] [--dither]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

DITHER=""
POSITIONAL=()
for arg in "$@"; do
  if [[ "$arg" == "--dither" ]]; then
    DITHER="&dither=true"
  else
    POSITIONAL+=("$arg")
  fi
done

FILE="${POSITIONAL[0]:?Usage: $0 <file.rgba> <width> <height> [base_url] [--dither]}"
WIDTH="${POSITIONAL[1]:?Usage: $0 <file.rgba> <width> <height> [base_url] [--dither]}"
HEIGHT="${POSITIONAL[2]:?Usage: $0 <file.rgba> <width> <height> [base_url] [--dither]}"
BASE_URL="${POSITIONAL[3]:-http://${PRINTER_PI#*@}:3000}"

curl -X POST "$BASE_URL/api/printer/canvas?width=$WIDTH&height=$HEIGHT$DITHER" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary "@$FILE"
