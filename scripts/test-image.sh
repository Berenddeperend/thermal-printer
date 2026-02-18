#!/usr/bin/env bash
# Print a PNG file via the image endpoint
# Usage: ./scripts/test-image.sh <file.png> [base_url] [--dither]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

DITHER=""
POSITIONAL=()
for arg in "$@"; do
  if [[ "$arg" == "--dither" ]]; then
    DITHER="?dither=true"
  else
    POSITIONAL+=("$arg")
  fi
done

FILE="${POSITIONAL[0]:?Usage: $0 <file.png> [base_url] [--dither]}"
BASE_URL="${POSITIONAL[1]:-http://${PRINTER_PI#*@}:3000}"

curl -X POST "$BASE_URL/api/printer/image$DITHER" \
  -H 'Content-Type: image/png' \
  --data-binary "@$FILE"
