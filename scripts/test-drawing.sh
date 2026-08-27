#!/usr/bin/env bash
# Print a drawing (576x700 PNG) with author + date header
# Usage: ./scripts/test-drawing.sh <file.png> <date> [author] [base_url]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

FILE="${1:?Usage: $0 <file.png> <date> [author] [base_url]}"
DATE="${2:?Usage: $0 <file.png> <date> [author] [base_url]}"
AUTHOR="${3:-}"
BASE_URL="${4:-http://${PRINTER_PI#*@}:3000}"

B64=$(base64 < "$FILE" | tr -d '\n')

if [[ -n "$AUTHOR" ]]; then
  PAYLOAD=$(jq -n --arg author "$AUTHOR" --arg date "$DATE" --arg drawing "$B64" \
    '{author: $author, date: $date, drawing: $drawing}')
else
  PAYLOAD=$(jq -n --arg date "$DATE" --arg drawing "$B64" \
    '{date: $date, drawing: $drawing}')
fi

curl -X POST "$BASE_URL/api/printer/drawing" \
  -H 'Content-Type: application/json' \
  --data "$PAYLOAD"
