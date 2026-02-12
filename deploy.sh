#!/usr/bin/env bash
set -euo pipefail

PRINTER_PI="${PRINTER_PI:-printer-pi}"

echo "Deploying to $PRINTER_PI..."
ssh "$PRINTER_PI" 'cd ~/thermal-printer && git pull && npm install && sudo systemctl restart print-server'
echo "Done."
