import { PNG } from 'pngjs';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';
import { rgbaToMono } from '../image.ts';

export function imageRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/image',
    handler: async (req, res, body) => {
      if (!(body instanceof Buffer)) {
        json(res, 400, { error: 'Expected raw PNG body with Content-Type: image/png' });
        return;
      }

      let png: PNG;
      try {
        png = PNG.sync.read(body);
      } catch {
        json(res, 400, { error: 'Invalid PNG data' });
        return;
      }

      const rgba = new Uint8Array(png.data);
      const { data, height } = rgbaToMono(rgba, png.width, png.height);

      await queue.enqueue(() => printer.sendBitmap(data, height));

      json(res, 200, { ok: true });
    },
  };
}
