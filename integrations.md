# Integrations

Future integrations — other projects that call the thermal printer endpoints.

---

## 1. Nonogram Puzzle Prints

When a user submits pixel art on the nonogram website, the server draws it to an HTML canvas and sends it to the printer. Each new puzzle creation triggers a physical print of the pixel art, giving a tangible artifact of the design.

**Steps to build:**

- Add a server-side hook in the nonogram app that fires after a user submits pixel art.
- Render the pixel art to a `<canvas>` element (or use an offscreen canvas / node-canvas on the server) at a resolution that maps well to the 576px printer width.
- Export the canvas as a PNG buffer.
- POST the PNG bytes to `/api/printer/image` with `Content-Type: image/png`.
- Optionally use `?capture=true` to get a verification photo of the printed result.
- Consider adding a small header above the pixel art (puzzle title, author, date) using the `/api/printer/canvas` endpoint with a pre-composed RGBA buffer instead, so text and image are one seamless print.

---

## 2. Guestbook Canvas Drawings

A drawing tool on the website lets visitors sketch something freehand. Submitted drawings get printed on the thermal printer and added to an online gallery. The physical prints could accumulate as a paper guestbook next to the printer.

**Steps to build:**

- Build a canvas-based drawing tool on the website (simple brush, a few colors — keep in mind the printer output is monochrome).
- On submit, export the canvas as RGBA pixel data or a PNG.
- POST to `/api/printer/image` (PNG) or `/api/printer/canvas` (raw RGBA with `?width=N&height=N`).
- Store the drawing server-side (database or filesystem) for the gallery page.
- Add a gallery route that displays all submitted drawings with timestamps.
- Rate-limit submissions to prevent spam prints (e.g. one drawing per IP per hour).
- Optional: use `?capture=true` to photograph the printed drawing and show the photo in the gallery alongside the digital version.

---

## 3. BirdNET Weekly Bird Report

A weekly scheduled job queries the BirdNET-Pi database for the past week's detections and prints a summary report on the thermal printer. A nice physical log of backyard bird activity.

**Steps to build:**

- Set up a cron job (or systemd timer) on the BirdNET-Pi or the RPi4 server that runs weekly (e.g. Sunday morning).
- Query the BirdNET-Pi SQLite database (or its API) for detections from the past 7 days. Aggregate by species: count, first/last seen, confidence scores.
- Format the data as a receipt-style layout: title ("Bird Report — Week of ..."), a table of species sorted by frequency, and a total detection count at the bottom.
- POST the structured data to `/api/printer/receipt` as JSON, or build a dedicated `/api/printer/bird-report` route on the print server with a tailored ReceiptBuilder template (header, species table via `.table()`, totals via `.bold()`).
- Optionally include a small bar chart or sparkline rendered as a 1-bit bitmap for detection-over-time visualization — render it server-side to a canvas, export as RGBA, and embed it in the print job.
- A dedicated route on the print server is the cleaner approach — it keeps print formatting logic where it belongs and the cron job just sends raw data.

---

## 4. Picnic Table Webshop Orders

When a customer places an order for a customized picnic table, the print server prints the order details including a visual of the designed top plate. This gives an immediate physical work order for the workshop.

**Steps to build:**

- Add a webhook or server-side handler in the webshop that fires on new orders.
- Collect order data: customer name, order number, date, table dimensions, customization options, and the top plate canvas design.
- Export the top plate design from the configurator canvas as a PNG.
- Create a dedicated `/api/printer/order` route on the print server that accepts JSON with order metadata and a base64-encoded (or separate multipart) image of the top plate design.
- In the route handler, use ReceiptBuilder to print the order header (order #, date, customer), line items, and customization details. Then use `sendBitmap` to print the top plate design below the text.
- The printed sheet serves as a workshop reference: order info on top, laser engraving design on the bottom. Pin it to the workpiece or job board.

---

## 5. Weekly Pageview Reports

A weekly summary of pageview stats across all websites, printed as a compact report. Since all sites go through the same Caddy instance, Caddy's access logs are the single data source.

**Steps to build:**

- Enable structured access logging in Caddy (JSON format to a log file, one per site or a shared log with host field).
- Write a script that parses the past week's Caddy logs. Group by host/site, count total requests, unique IPs, top pages, and compute week-over-week change if previous data is available.
- Format into a receipt: one section per site with its stats, a summary total at the bottom.
- POST to `/api/printer/receipt` or add a dedicated `/api/printer/pageviews` route with a ReceiptBuilder template.
- Schedule via cron (e.g. Monday morning). The script runs, parses logs, and fires the POST.
- Alternative to raw log parsing: use GoAccess or a lightweight analytics tool that reads Caddy logs and exposes an API or JSON export. The script then reads from that instead of parsing logs directly.
- Consider log rotation — make sure the script reads from the correct log files covering the past 7 days.

---

## 6. Mortise Templates for Woodworking

Print full-scale mortise templates on thermal paper. Glue the print directly onto the workpiece — the mortise outline is exactly the right dimensions and position. No measuring, no marking, just cut.

**Steps to build:**

- Build a simple web UI where you input mortise dimensions (width, depth, offset from edge) and optionally tenon/joint layout parameters.
- Render the template at 1:1 scale on a canvas. The printer is 72mm (576px) wide at 203 DPI — so 1mm ≈ 8px. Calculate pixel dimensions from millimeter inputs accordingly.
- Draw the mortise outline, center lines, and dimension labels onto the canvas. Include a reference scale bar so you can verify the print hasn't been scaled.
- Export as PNG and POST to `/api/printer/image`.
- The thermal paper is ~80mm wide with ~72mm printable area — templates wider than 72mm won't fit. For larger joints, print in sections with alignment marks or print a center-line template and mark the rest manually.
- Could expand to other joint templates: dovetails, box joints, dowel spacing, hinge mortises. Each is just a different canvas layout using the same print pipeline.
