#!/usr/bin/env bash
# Print a label and poll for its verification video
# Usage: ./scripts/test-video.sh [text] [base_url]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

TEXT="${1:-video test}"
BASE_URL="${2:-http://${PRINTER_PI#*@}:3000}"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/printer/label" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"$TEXT\"}")

echo "Response: $RESPONSE"

VIDEO_PATH=$(echo "$RESPONSE" | grep -o '"video":"[^"]*"' | cut -d'"' -f4)
if [[ -z "$VIDEO_PATH" ]]; then
  echo "No video field in response" >&2
  exit 1
fi

VIDEO_URL="$BASE_URL$VIDEO_PATH"
echo "Polling $VIDEO_URL ..."

for _ in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$VIDEO_URL")
  if [[ "$STATUS" == "200" ]]; then
    echo "Video ready: $VIDEO_URL"
    exit 0
  fi
  sleep 0.5
done

echo "Video not ready after 10s" >&2
exit 1
