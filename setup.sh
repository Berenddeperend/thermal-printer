#!/usr/bin/env bash
set -euo pipefail

[[ -f .env ]] && source .env

PRINTER_PI="${PRINTER_PI:-printer-pi}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Setting up $PRINTER_PI..."

# Phase 1: Install system packages + nvm (on Pi)
ssh "$PRINTER_PI" bash -s <<'REMOTE'
set -euo pipefail

echo "==> Installing system packages..."
sudo apt-get clean
sudo apt-get update -qq
sudo apt-get install -y -qq git build-essential

echo "==> Adding user to lp group (USB printer access)..."
sudo usermod -aG lp "$USER"

echo "==> Installing nvm..."
if [[ ! -d "$HOME/.nvm" ]]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
REMOTE

# Phase 2: Push repo from Mac to Pi (Pi has no internet)
echo "==> Syncing repo to Pi..."
rsync -az --exclude node_modules --exclude .env "$SCRIPT_DIR/" "$PRINTER_PI:~/thermal-printer/"

# Phase 3: Install Node + deps + systemd service (on Pi)
ssh "$PRINTER_PI" bash -s <<'REMOTE'
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"

cd "$HOME/thermal-printer"

echo "==> Installing Node (from .nvmrc)..."
nvm install
nvm use

echo "==> Installing npm dependencies..."
npm install

echo "==> Setting up systemd service..."
sudo cp print-server.service /etc/systemd/system/print-server.service
sudo systemctl daemon-reload
sudo systemctl enable print-server
sudo systemctl restart print-server

echo "==> Done! Service status:"
systemctl status print-server --no-pager || true
REMOTE

echo "Setup complete."
