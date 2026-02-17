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
sudo apt-get install -y -qq git build-essential cups libcups2-dev libusb-1.0-0-dev

echo "==> Adding user to lp and lpadmin groups..."
sudo usermod -aG lp,lpadmin "$USER"

echo "==> Blacklisting usblp kernel module (CUPS uses libusb directly)..."
echo "blacklist usblp" | sudo tee /etc/modprobe.d/blacklist-usblp.conf > /dev/null
sudo rmmod usblp 2>/dev/null || true

echo "==> Enabling and starting CUPS..."
sudo systemctl enable cups
sudo systemctl start cups

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

echo "==> Building and installing Star CUPS driver..."
if [[ -d drivers/starcupsdrv ]]; then
  cd drivers/starcupsdrv
  sudo make
  sudo make install
  cd "$HOME/thermal-printer"
else
  echo "WARNING: drivers/starcupsdrv not found, skipping driver install."
  echo "Download the Star CUPS driver source and place it in drivers/starcupsdrv/"
fi

echo "==> Registering printer in CUPS..."
# Remove existing printer if present (idempotent)
sudo lpadmin -x Star_TSP143 2>/dev/null || true
# Register printer — adjust USB URI and PPD path after confirming on Pi
sudo lpadmin -p Star_TSP143 -E \
  -v "usb://Star/Star%20TSP143IIU%2B" \
  -m star/tsp143.ppd
sudo cupsenable Star_TSP143
sudo cupsaccept Star_TSP143

echo "==> Setting up systemd service..."
sudo cp print-server.service /etc/systemd/system/print-server.service
sudo systemctl daemon-reload
sudo systemctl enable print-server
sudo systemctl restart print-server

echo "==> Done! Service status:"
systemctl status print-server --no-pager || true
REMOTE

echo "Setup complete."
