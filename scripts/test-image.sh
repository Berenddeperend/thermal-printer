#!/usr/bin/env bash
# Print a PNG file via the image endpoint
# Usage: ./scripts/test-image.sh <file.png> [base_url]

set -euo pipefail

FILE="${1:?Usage: $0 <file.png> [base_url]}"
BASE_URL="${2:-http://192.168.2.16:3000}"

curl -X POST "$BASE_URL/api/printer/image" \
  -H 'Content-Type: image/png' \
  --data-binary "@$FILE"
