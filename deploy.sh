#!/usr/bin/env bash
set -euo pipefail

[[ -f .env ]] && source .env

PRINTER_PI="${PRINTER_PI:-printer-pi}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying to $PRINTER_PI..."
rsync -az --exclude node_modules --exclude .env "$SCRIPT_DIR/" "$PRINTER_PI:~/thermal-printer/"
ssh "$PRINTER_PI" 'source ~/.nvm/nvm.sh && cd ~/thermal-printer && npm install && sudo systemctl restart print-server'
echo "Done."
