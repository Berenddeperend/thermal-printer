#!/usr/bin/env bash
# Print a weekly newspaper
# Usage: ./scripts/test-newspaper.sh [base_url]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/../.env" ]] && source "$SCRIPT_DIR/../.env"

BASE_URL="${1:-http://${PRINTER_PI#*@}:3000}"

curl -s -X POST "$BASE_URL/api/printer/newspaper"
