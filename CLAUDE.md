# Print Server

HTTP print server for Star TSP143IIU+ thermal printer, running on the printer Pi (Raspberry Pi 2, Node.js — not Bun, Pi2 is ARMv7/32-bit, Bun requires aarch64).

## Architecture

Web services POST simple payloads to the print server. All print logic lives on the server — there is no client library. Services are fully decoupled from printer specifics, similar to how ntfy works (fire-and-forget HTTP calls).

```
[Internet]
    │
mywebsite.com/api/printer/*
    │
[RPi4 server] ── Caddy reverse proxy ──→ [Printer Pi (RPi2) on LAN]
                                              │
                                         print-server (Node + --experimental-strip-types)
                                              │
                                         queue → bitmap-font → star-raster → CUPS raw → USB
                                                 RPi Camera Module → CSI
```

### Naming

- **RPi4 server**: hosts personal website, services, and Caddy. Connected to internet. Acts as reverse proxy for the printer Pi.
- **Printer Pi**: RPi2 on local LAN only. No internet access. Runs the print server. Receives proxied requests from the RPi4 server.

### Networking

- The printer Pi is on the local LAN and has internet access.
- The RPi4 server runs Caddy and reverse proxies `mywebsite.com/api/printer/*` to the printer Pi's local IP (e.g. `192.168.2.16:3000`).
- Caddy on the RPi4 server handles TLS termination. The printer Pi only receives plain HTTP from the LAN.

## Stack

- **Runtime**: Node.js 22 LTS with `--experimental-strip-types` (TypeScript, no build step). Run 'nvm use' before running any node commands.
- **Printer pipeline**: Pure JS, one runtime dep (`pngjs`). Text/images → 1-bit bitmap → `encode()` (Star Graphic Mode raster) → `lp -d Star_TSP143 -o raw` (CUPS)
- **Why not node-thermal-printer**: The TSP143IIU+ only supports Star Graphic Mode (raster). Star Line Mode commands (which node-thermal-printer emits) are silently ignored. The CUPS raster pipeline works but takes ~40s. Star Graphic Mode via raw `lp` prints instantly.
- **Printer interface**: CUPS (`lp -d Star_TSP143 -o raw`) — the `usblp` kernel module is blacklisted; CUPS uses libusb directly via the Star CUPS driver
- **Camera**: RPi Camera Module (v2 or v3) via CSI port, controlled via libcamera
- **No framework preference specified** — keep dependencies minimal, native http is fine

## Key Design Decisions

- Routes/templates live on the server. Adding a new print format = adding a route, not touching calling services.
- Print jobs must be serialized through a queue (one job at a time, FIFO). Concurrent POSTs must not interleave.
- No auth by default (private network, proxied through Caddy). Bearer token middleware can be added later.

## Print Pipeline

Two paths into the printer, both ending at the same raster encoder:

```
Text path:    ReceiptBuilder (src/bitmap-font.ts)   → 576px 1-bit bitmap
Image path:   rgbaToMono (src/image.ts)             → 576px 1-bit bitmap
                          ↓
                 encode() (src/star-raster.ts)       → Star Graphic Mode binary
                          ↓
                 lp -d Star_TSP143 -o raw            → CUPS → USB → printer
```

- **Bitmap font**: Embedded 8x16 CP437 font (4096 bytes). 72 chars/line at 1x, 36 chars/line at 2x.
- **Star Graphic Mode protocol**: `ESC * r A` (enter raster) → scanlines → `ESC * r B` (exit) → `ESC d 3` (cut).
- **ReceiptBuilder API**: `.textSmall()` / `.boldSmall()` (1x, 72 chars), `.text()` / `.bold()` (2x, 36 chars), `.textLarge()` / `.boldLarge()` (3x, 24 chars), `.line()`, `.table()`, `.feed()`, `.build()`
- **Image conversion** (`src/image.ts`): `rgbaToMono()` scales RGBA to 576px wide (nearest-neighbor), converts to grayscale, thresholds at 128 (or Floyd-Steinberg dithering via `{ dither: true }`), packs to 1-bit.
- **Text routes** call `printer.execute((b) => { b.text('...'); })` — builder callback renders to bitmap, encodes, and sends.
- **Image routes** call `printer.sendBitmap(data, height)` — sends pre-built 1-bit bitmap directly to the encoder.
- **Known quirk**: w/x/y/z sit 1px lower than other lowercase letters. This is in the font data, not a rendering bug.

### Swapping the Bitmap Font

The font lives in `src/bitmap-font.ts` as a hex string in the `FONT` constant. It's 4096 bytes: 256 characters, 16 bytes each (one byte per pixel row, 8 pixels wide).

To swap it for a different 8x16 bitmap font:

1. Download a `.fnt` or `.bin` file (good source: int10h.org oldschool-pc-fonts)
2. Convert to hex: `xxd -p font.bin | tr -d '\n'`
3. Paste the output into the `FONT` constant, replacing the existing hex string
4. No other code changes needed

## Dev/Deploy

- **Dev on macOS, deploy to printer Pi running Raspberry Pi OS Lite (32-bit Bookworm)**
- .nvmrc to use correct node version. Run `nvm use` before running node commands.
- Printer is mocked in development: wrap printer in a service, switch on NODE_ENV. Mock logs method calls to console instead of printing.
- Deploy script: SSH into printer Pi from mac (same LAN) → git pull → npm install → systemctl restart print-server
- systemd unit file manages the process (auto-start on boot, restart on crash)
- No Docker — overkill for a single-purpose Pi2 project

## Endpoints

- `POST /api/printer/receipt` — JSON `{ items, total }`
- `POST /api/printer/label` — JSON `{ text }`
- `POST /api/printer/image` — raw PNG bytes (`Content-Type: image/png`). Optional `?dither=true` for Floyd-Steinberg dithering.
- `POST /api/printer/canvas` — raw RGBA bytes (`Content-Type: application/octet-stream`, `?width=N&height=N`). Optional `&dither=true` for Floyd-Steinberg dithering.
- `POST /api/printer/test` — no body, prints a sampler of all text styles
- `GET /api/printer/health` — printer connection status + queue depth

The router returns parsed JSON for `application/json` requests, raw `Buffer` for everything else. Routes type-check what they receive.

### Testing

- JSON endpoints (receipt, label): use Bruno (`bruno/`)
- Binary endpoints (image, canvas): use curl scripts (`scripts/`)
  - `./scripts/test-image.sh <file.png> [base_url] [--dither]`
  - `./scripts/test-canvas.sh <file.rgba> <width> <height> [base_url] [--dither]`
  - Default base URL: `http://192.168.2.16:3000`

## Printer Pi Setup Notes

- `sudo apt-get install cups libcups2-dev libusb-1.0-0-dev` for CUPS
- `sudo usermod -aG lp,lpadmin $USER` for printer + CUPS admin access
- Blacklist `usblp` kernel module: `echo "blacklist usblp" | sudo tee /etc/modprobe.d/blacklist-usblp.conf`
- Star CUPS driver: bundled as `Star_CUPS_Driver-3.17.0_linux.tar.gz` in repo root (official Star tarball, hidden behind a form on their site). `setup.sh` handles extraction and build.
- Register printer: `sudo lpadmin -p Star_TSP143 -E -v "usb://Star/Star%20TSP143IIU%2B" -m star/tsp143.ppd`
- Verify: `lpstat -p Star_TSP143` (should show idle), `echo test | lp -d Star_TSP143 -o raw`
- Verify USB: `lsusb` (Star Micronics)
- Install Node.js 22 via nvm (armv7 builds available)

---

## v1.1 — Print Verification Camera

A camera mounted above/beside the printer captures a photo of each print. The photo is returned directly in the HTTP response.

### How it works

1. Service POSTs to a print endpoint.
2. Print job executes (paper feeds out).
3. Brief delay to allow paper to settle (configurable, ~1-2s).
4. Camera captures a still via `libcamera-still` (spawned as child process).
5. The JPEG bytes are returned as the HTTP response body with `Content-Type: image/jpeg`.

No images are saved on the printer Pi. No cleanup needed. No URLs to manage. The caller receives raw JPEG bytes and decides what to do with them (save, display, discard).

### Technical approach

- Use `child_process.execFile` to call `libcamera-still` with flags for output to stdout (`-o -`), so the image is captured directly into a Node buffer without writing to disk.
- Camera settings (resolution, quality, rotation) configured via libcamera CLI flags.
- Lower resolution is fine (e.g. 1280x720 or even 640x480) — this is verification, not archival. Keeps response size small.
- The photo capture is part of the queued job, so it's serialized with prints — no race conditions between capture and the next print job.

### Response behavior

- By default, print endpoints return JSON `{ ok: true }` (v1.0 behavior).
- If the caller wants a photo, it sends a header like `X-Capture: true` or a query param `?capture=true`.
- When capture is requested, the response is `Content-Type: image/jpeg` instead of JSON.
- This keeps v1.0 behavior intact for services that don't care about verification.

### Tradeoff

Responses are slower when capture is enabled — the endpoint blocks until print + settle delay + photo capture completes. This is inherent to the feature. If fire-and-forget + async photo delivery is needed later, that's v1.2 territory (job ID + webhook/polling).

### Setup notes

- RPi2 has a standard 15-pin CSI port. Camera Module v2 or v3 works.
- Raspberry Pi OS Bookworm uses libcamera by default (not raspistill).
- Test camera: `libcamera-still -o test.jpg`
- Mount the camera so it has a clear view of where the paper exits the printer. Consider lighting — a small LED strip helps with consistent photo quality.

## Workflow

- When adding or changing endpoints/params, always update the corresponding test scripts (`scripts/`) and/or Bruno collection (`bruno/`) to reflect the change. Keep CLAUDE.md endpoint docs and testing section in sync too.

## Developer Profile

Experienced JS/TS web developer. Prefers short, professional communication. No unnecessary abstractions.
