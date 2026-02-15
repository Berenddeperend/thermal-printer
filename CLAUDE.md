# Print Server

HTTP print server for Star TSP143IIU+ thermal printer, running on the printer Pi (Raspberry Pi 2, Node.js — not Bun, Pi2 is ARMv7/32-bit, Bun requires aarch64).

## Architecture

Web services POST simple payloads to the print server. All print logic lives on the server — there is no client library. Services are fully decoupled from printer specifics, similar to how ntfy works (fire-and-forget HTTP calls).

```
[Internet]
    │
berendswennenhuis.nl/api/printer/*
    │
[RPi4 server] ── Caddy reverse proxy ──→ [Printer Pi (RPi2) on LAN]
                                              │
                                         print-server (Node + --experimental-strip-types)
                                              │
                                         queue → node-thermal-printer → USB
                                                 RPi Camera Module → CSI
```

### Naming

- **RPi4 server**: hosts personal website, services, and Caddy. Connected to internet. Acts as reverse proxy for the printer Pi.
- **Printer Pi**: RPi2 on local LAN only. No internet access. Runs the print server. Receives proxied requests from the RPi4 server.

### Networking

- The printer Pi is NOT connected to the internet, only to the local LAN.
- The RPi4 server runs Caddy and reverse proxies `berendswennenhuis.nl/api/printer/*` to the printer Pi's local IP (e.g. `192.168.1.X:3000`).
- Caddy on the RPi4 server handles TLS termination. The printer Pi only receives plain HTTP from the LAN.

## Stack

- **Runtime**: Node.js 22 LTS with `--experimental-strip-types` (TypeScript, no build step). Run 'nvm use' before running any node commands.
- **Printer lib**: node-thermal-printer (PrinterTypes.STAR)
- **Printer interface**: /dev/usb/lp0 (USB)
- **Camera**: RPi Camera Module (v2 or v3) via CSI port, controlled via libcamera
- **No framework preference specified** — keep dependencies minimal, native http is fine

## Key Design Decisions

- Routes/templates live on the server. Adding a new print format = adding a route, not touching calling services.
- Print jobs must be serialized through a queue (one job at a time, FIFO). Concurrent POSTs must not interleave.
- Clear printer buffer before each job to prevent state leaking from failed prints.
- No auth by default (private network, proxied through Caddy). Bearer token middleware can be added later.
- printImage paths resolve on the printer Pi, not the caller.

## Dev/Deploy

- **Dev on macOS, deploy to printer Pi running Raspberry Pi OS Lite (32-bit Bookworm)**
- .nvmrc to use correct node version. Run `nvm use` before running node commands.
- Printer is mocked in development: wrap printer in a service, switch on NODE_ENV. Mock logs method calls to console instead of printing.
- Deploy script: SSH into printer Pi from mac (same LAN) → git pull → npm install (must run on Pi due to native deps from build-essential) → systemctl restart print-server
- systemd unit file manages the process (auto-start on boot, restart on crash)
- No Docker — overkill for a single-purpose Pi2 project

## Endpoints Pattern

- `POST /api/printer/receipt` — structured payload like `{ items, total }`
- `POST /api/printer/label` — simple payload like `{ text }`
- `GET /api/printer/health` — printer connection status + queue depth

These are examples. Routes are added as needed.

## Printer Pi Setup Notes

- `sudo apt-get install build-essential` required for node-thermal-printer native deps
- `sudo usermod -a -G lp $USER` for USB printer access
- Verify printer: `lsusb` (Star Micronics), `ls /dev/usb/lp0`
- Install Node.js 22 via NodeSource (armv7 builds available)

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

## Developer Profile

Experienced JS/TS web developer. Prefers short, professional communication. No unnecessary abstractions.
