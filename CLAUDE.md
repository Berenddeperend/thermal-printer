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
- **Camera**: RPi Camera Module (v2 or v3) via CSI port, controlled via `rpicam-apps` (built on libcamera)
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

### Environment Variables

- `PORT` — server port (default `3000`)
- `NODE_ENV` — `production` for real printer, anything else for mock
- `CUPS_PRINTER` — CUPS printer name (default `Star_TSP143`)
- `WEATHER_LAT` / `WEATHER_LON` — coordinates for weather forecast (default: Enschede, `52.22` / `6.89`)
- `PAGEVIEWS_URL` — URL for weekly pageview stats endpoint (newspaper section skipped if empty)
- `BIRDNET_URL` — URL for weekly BirdNET-Pi detection stats endpoint (newspaper section skipped if empty)
- `VIDEO_DIR` — directory for captured verification videos (default `data/videos`, relative to the working directory)
- `VIDEO_PREROLL_MS` — how long the camera records before the print job is sent (default `1500`)
- `VIDEO_ACTIVE_MS` — how long the camera keeps recording after the print job is sent (default `1000`)
- `VIDEO_TTL_MS` — how long a video is kept before being swept (default `3600000`, 1 hour)

## Endpoints

- `POST /api/printer/receipt` — JSON `{ items, total }`
- `POST /api/printer/label` — JSON `{ text }`
- `POST /api/printer/shipping-label` — JSON `{ name, address, postalCode, city, serialNumber?, engravingImage? }`. Prints a customer name + address block, with `serialNumber` (a free-form workshop serial, e.g. "003") as a large bold header above the name if given. If `engravingImage` (base64 PNG, data URI prefix optional) is provided, it's converted via `rgbaToMono` with dithering (`{ dither: true }` — the design is mostly light/anti-aliased strokes, thresholding loses too much) and its bitmap rows are merged with the text block's rows into a single buffer, sent as one `sendBitmap` call — printing text and image as separate jobs would cut the paper in between — used by the chicknick webshop's orders admin page to print a physical shipping label + engraving preview on demand.
- `POST /api/printer/image` — raw PNG bytes (`Content-Type: image/png`). Optional `?dither=true` for Floyd-Steinberg dithering.
- `POST /api/printer/canvas` — raw RGBA bytes (`Content-Type: application/octet-stream`, `?width=N&height=N`). Optional `&dither=true` for Floyd-Steinberg dithering.
- `POST /api/printer/todo` — JSON `{ items, title? }`. Prints a todo list with checkboxes. `items` is an array of `{ text, done? }` objects or `{ category, items }` groups. Done items print as `[X]`, pending as `[ ]`. Categories print as bold small-text headers. `title` defaults to today's date in Dutch (e.g. "Maandag 23 februari 2026"). Long items wrap with hanging indent.
- `POST /api/printer/newspaper` — no body. Prints a weekly newspaper with weather forecast (Open-Meteo), minitafeltje.nl pageviews, BirdNET-Pi bird summary, and a sudoku puzzle. Sections are skipped gracefully if their data source is unavailable. Scheduled via systemd timer every Sunday 08:00, or triggered on-demand.
- `POST /api/printer/drawing` — JSON `{ author?, date, drawing }`. `drawing` is a base64-encoded PNG; must be **exactly 576x700**, else 400. `author` defaults to `"anoniem"`. `date` is printed as-is (caller pre-formats). Renders centered author + date header, separator line, then the image below.
- `POST /api/printer/test` — no body, prints a sampler of all text styles
- `GET /api/printer/health` — printer connection status + queue depth
- `GET /api/printer/video/:id.mp4` — serves a captured print-verification video. 404 if not yet written or expired (see "Print Verification Camera" below).

The router returns parsed JSON for `application/json` requests, raw `Buffer` for everything else. Routes type-check what they receive.

Every endpoint above except `health` also captures a short verification video and adds its URL to the response: `{ ok: true, video: "/api/printer/video/<id>.mp4" }`.

### Testing

- JSON endpoints (receipt, label, shipping-label, todo): use Bruno (`bruno/`)
- Binary endpoints (image, canvas) and drawing (base64 PNG inside JSON): use curl scripts (`scripts/`)
  - `./scripts/test-image.sh <file.png> [base_url] [--dither]`
  - `./scripts/test-canvas.sh <file.rgba> <width> <height> [base_url] [--dither]`
  - `./scripts/test-drawing.sh <file.png> <date> [author] [base_url]`
  - Default base URL: `http://192.168.2.16:3000`
- Newspaper: `./scripts/test-newspaper.sh [base_url]` or Bruno `bruno/newspaper.bru`
- Verification video: `./scripts/test-video.sh [text] [base_url]` prints a label and polls the returned `video` URL until it's ready

## Printer Pi Setup Notes

- `sudo apt-get install cups libcups2-dev libusb-1.0-0-dev` for CUPS
- `sudo usermod -aG lp,lpadmin $USER` for printer + CUPS admin access
- Blacklist `usblp` kernel module: `echo "blacklist usblp" | sudo tee /etc/modprobe.d/blacklist-usblp.conf`
- Star CUPS driver: bundled as `Star_CUPS_Driver-3.17.0_linux.tar.gz` in repo root (official Star tarball, hidden behind a form on their site). `setup.sh` handles extraction and build.
- Register printer: `sudo lpadmin -p Star_TSP143 -E -v "usb://Star/Star%20TSP143IIU%2B" -m star/tsp143.ppd`
- Verify: `lpstat -p Star_TSP143` (should show idle), `echo test | lp -d Star_TSP143 -o raw`
- Verify USB: `lsusb` (Star Micronics)
- Install Node.js 22 via nvm (armv7 builds available)
- `sudo apt-get install ffmpeg` for muxing captured verification videos to `.mp4` (see "Print Verification Camera" below)

---

## Print Verification Camera

A camera mounted above/beside the printer records a short clip of each print. The clip is saved to disk and its URL is added to the print endpoint's JSON response — the response is never blocked waiting for it.

### How it works

1. Service POSTs to a print endpoint.
2. Server generates a random ID and starts the camera recording immediately (`rpicam-vid`), *before* the print job is sent — this catches the paper actually feeding out, not just the aftermath.
3. After a pre-roll delay (`VIDEO_PREROLL_MS`, tunable — the right value depends on real camera-init latency, measured on hardware), the print job is sent.
4. The camera keeps recording for `VIDEO_ACTIVE_MS` more, then stops. Total recording length is `VIDEO_PREROLL_MS + VIDEO_ACTIVE_MS`.
5. The HTTP response returns as soon as the print job completes — `{ ok: true, video: "/api/printer/video/<id>.mp4" }` — well before the video file exists.
6. In the background, the raw `.h264` capture is muxed to `.mp4` via `ffmpeg` (`-c copy`, fast lossless remux, no re-encode) and saved under `VIDEO_DIR`. Once that finishes, `GET /api/printer/video/<id>.mp4` starts returning `200`; until then (or if capture/mux fails) it 404s.
7. Videos older than `VIDEO_TTL_MS` (default 1 hour) are deleted by an in-process sweep that runs every 5 minutes.

This supersedes the original v1.1 sketch of this feature, which returned a JPEG still inline in the response (`X-Capture` header, no file ever saved). That approach is not implemented — this save-to-disk, poll-the-URL design is what's built.

### Technical approach

- `child_process.execFile` (same idiom as `lp` in `src/printer.ts`) calls `rpicam-vid` — **not** `libcamera-vid`/`libcamera-still`, those binary names don't exist on current Raspberry Pi OS (Bookworm/trixie renamed `libcamera-apps` to `rpicam-apps`).
- Recording resolution/bitrate/framerate (400x300, 15fps, ~500kbps) are hardcoded constants in `src/video.ts`, not env vars — they're hardware-tuning knobs set once during bring-up, unlike the pre-roll timing.
- Capture + mux run fully detached from the request (`src/video.ts`'s `Capturer.captureAndPrint`) — failures are logged and clean up their own partial files, never surfacing to the HTTP caller.
- Camera captures are serialized against each other through their own `PrintQueue` instance, separate from the print queue (the camera is a separate device from the printer's USB port) — but this capture queue is never awaited before a response returns, so one request's capture backlog can't stall another request's print.
- **Known contention risk**: `go2rtc` (a separate systemd service on the printer Pi) also uses `rpicam-vid` on-demand for live streaming. If someone is actively viewing that stream at the exact moment a print fires, the verification capture can fail to acquire the camera (single-consumer device). This is accepted as a rare, low-stakes edge case — a failed capture just means that print's video 404s; it doesn't affect printing itself.
- Development uses a mock capturer (mirrors `createMockPrinter()` in `src/printer.ts`) — same timing contract, but only logs, no real camera/ffmpeg calls, no file written.

### Setup notes

- RPi2 has a standard 15-pin CSI port. Camera Module v2 or v3 works.
- Raspberry Pi OS Bookworm/trixie uses `rpicam-apps` by default (not `libcamera-apps`, not `raspistill`).
- Test camera: `rpicam-hello --list-cameras`, `rpicam-vid -t 1000 -o test.h264`.
- `ffmpeg` must be installed (`sudo apt-get install ffmpeg`) for the raw-`.h264`-to-`.mp4` mux step.
- Mount the camera so it has a clear view of where the paper exits the printer. Consider lighting — a small LED strip helps with consistent video quality.
- `VIDEO_PREROLL_MS` needs tuning on real hardware once footage is reviewed — if the clip misses the start of the paper feed, increase it.

## Workflow

- When adding or changing endpoints/params, always update the corresponding test scripts (`scripts/`) and/or Bruno collection (`bruno/`) to reflect the change. Keep CLAUDE.md endpoint docs and testing section in sync too.

## Developer Profile

Experienced JS/TS web developer. Prefers short, professional communication. No unnecessary abstractions.
