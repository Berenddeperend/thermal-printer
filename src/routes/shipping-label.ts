import { PNG } from 'pngjs';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';
import { rgbaToMono } from '../image.ts';

const WIDTH_BYTES = 72; // 576px / 8 — matches the raster encoder and image pipeline
const PAD_ROWS = 16; // blank rows appended after the image so the cutter doesn't slice through it

type ShippingLabelBody = {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  hasEngraving?: boolean;
  /** Base64-encoded PNG of the engraving design (data URI prefix optional). */
  engravingImage?: string;
};

export function shippingLabelRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/shipping-label',
    handler: async (_req, res, body) => {
      const { name, address, postalCode, city, hasEngraving, engravingImage } =
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
          bitmap = rgbaToMono(new Uint8Array(png.data), png.width, png.height);
        } catch {
          json(res, 400, { error: 'Invalid "engravingImage" PNG data' });
          return;
        }
      }

      await queue.enqueue(async () => {
        await printer.execute(
          (b) => {
            b.feed(1);
            b.line();
            b.bold(name);
            b.text(address);
            b.text(`${postalCode} ${city}`);
            b.feed(1);
            b.boldSmall(hasEngraving ? 'GRAVERING: JA' : 'GRAVERING: NEE');
            if (!bitmap) {
              b.line();
              b.feed(2);
            }
          },
          { cut: !bitmap },
        );

        if (bitmap) {
          // Pad a bit of blank paper below the design before cutting.
          const padded = new Uint8Array(bitmap.data.length + WIDTH_BYTES * PAD_ROWS);
          padded.set(bitmap.data, 0);
          await printer.sendBitmap(padded, bitmap.height + PAD_ROWS, { cut: true });
        }
      });

      json(res, 200, { ok: true });
    },
  };
}
