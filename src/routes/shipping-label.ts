import { PNG } from 'pngjs';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';
import type { Capturer } from '../video.ts';
import { rgbaToMono } from '../image.ts';
import { ReceiptBuilder } from '../bitmap-font.ts';

const WIDTH_BYTES = 72; // 576px / 8 — matches the raster encoder and image pipeline
const PAD_ROWS = 16; // blank rows appended after the image so the cutter doesn't slice through it

type ShippingLabelBody = {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  /** Workshop serial number, e.g. "003". Free-form, printed as-is if given. */
  serialNumber?: string;
  /** Base64-encoded PNG of the engraving design (data URI prefix optional). */
  engravingImage?: string;
};

export function shippingLabelRoute(printer: Printer, queue: PrintQueue, capturer: Capturer): Route {
  return {
    method: 'POST',
    path: '/api/printer/shipping-label',
    handler: async (_req, res, body) => {
      const { name, address, postalCode, city, serialNumber, engravingImage } =
        (body as ShippingLabelBody) || {};
      if (!name || !address || !postalCode || !city) {
        json(res, 400, { error: 'Missing "name", "address", "postalCode" or "city" field' });
        return;
      }

      let bitmap: { data: Uint8Array; height: number } | null = null;
      if (engravingImage) {
        try {
          const base64 = engravingImage.replace(/^data:image\/png;base64,/, '');
          const png = PNG.sync.read(Buffer.from(base64, 'base64'));
          bitmap = rgbaToMono(new Uint8Array(png.data), png.width, png.height, {
            dither: true,
          });
        } catch {
          json(res, 400, { error: 'Invalid "engravingImage" PNG data' });
          return;
        }
      }

      // Build the text block in memory (not via printer.execute) so it can be
      // merged with the engraving image into a single raster job — printing
      // them as separate jobs would cut the paper in between.
      const builder = new ReceiptBuilder();
      builder.feed(1);
      if (serialNumber) {
        builder.textLarge(serialNumber, 'center');
      }
      builder.line();
      builder.bold(name);
      builder.text(address);
      builder.text(`${postalCode} ${city}`);
      builder.line();
      builder.feed(bitmap ? 1 : 2);
      const textBlock = builder.build();

      let combined = textBlock.data;
      let combinedHeight = textBlock.height;

      if (bitmap) {
        // Pad a bit of blank paper below the design before cutting.
        const padded = new Uint8Array(bitmap.data.length + WIDTH_BYTES * PAD_ROWS);
        padded.set(bitmap.data, 0);
        const paddedHeight = bitmap.height + PAD_ROWS;

        const merged = new Uint8Array(textBlock.data.length + padded.length);
        merged.set(textBlock.data, 0);
        merged.set(padded, textBlock.data.length);

        combined = merged;
        combinedHeight = textBlock.height + paddedHeight;
      }

      const { video } = await capturer.captureAndPrint(() =>
        queue.enqueue(() => printer.sendBitmap(combined, combinedHeight)),
      );

      json(res, 200, { ok: true, video });
    },
  };
}
