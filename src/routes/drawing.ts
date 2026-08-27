import { PNG } from 'pngjs';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';
import { rgbaToMono } from '../image.ts';

type DrawingBody = {
  author?: unknown;
  date?: unknown;
  drawing?: unknown;
};

export function drawingRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/drawing',
    handler: async (_req, res, body) => {
      if (typeof body !== 'object' || body === null || body instanceof Buffer) {
        json(res, 400, { error: 'Expected JSON object' });
        return;
      }
      const { author, date, drawing } = body as DrawingBody;
      if (typeof date !== 'string' || date.length === 0) {
        json(res, 400, { error: 'date is required (non-empty string)' });
        return;
      }
      if (typeof drawing !== 'string' || drawing.length === 0) {
        json(res, 400, { error: 'drawing is required (base64 PNG)' });
        return;
      }
      if (author !== undefined && typeof author !== 'string') {
        json(res, 400, { error: 'author must be a string' });
        return;
      }
      const displayAuthor = author && author.length > 0 ? author : 'anoniem';

      let png: PNG;
      try {
        png = PNG.sync.read(Buffer.from(drawing, 'base64'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        json(res, 400, { error: `Invalid PNG data: ${message}` });
        return;
      }
      if (png.width !== 576 || png.height !== 700) {
        json(res, 400, { error: `Image must be 576x700 (got ${png.width}x${png.height})` });
        return;
      }

      const rgba = new Uint8Array(png.data);
      const { data, height } = rgbaToMono(rgba, png.width, png.height);

      await queue.enqueue(() =>
        printer.execute((b) => {
          b.boldLarge(displayAuthor, 'center');
          b.text(date, 'center');
          b.line();
          b.feed(1);
          b.bitmap(data, height);
          b.feed(3);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
