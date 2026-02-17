import { PNG } from 'pngjs';
import type { IncomingMessage } from 'node:http';
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

      const dither = getDither(req);
      const rgba = new Uint8Array(png.data);
      const { data, height } = rgbaToMono(rgba, png.width, png.height, { dither });

      await queue.enqueue(() => printer.sendBitmap(data, height));

      json(res, 200, { ok: true });
    },
  };
}

function getDither(req: IncomingMessage): boolean {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return url.searchParams.get('dither') === 'true';
}
