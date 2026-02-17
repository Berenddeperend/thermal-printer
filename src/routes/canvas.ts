import type { IncomingMessage } from 'node:http';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';
import { rgbaToMono } from '../image.ts';

function getQueryParam(req: IncomingMessage, name: string): string | null {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return url.searchParams.get(name);
}

export function canvasRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/canvas',
    handler: async (req, res, body) => {
      if (!(body instanceof Buffer)) {
        json(res, 400, { error: 'Expected raw RGBA body with Content-Type: application/octet-stream' });
        return;
      }

      const widthStr = getQueryParam(req, 'width');
      const heightStr = getQueryParam(req, 'height');

      if (!widthStr || !heightStr) {
        json(res, 400, { error: 'Missing required query params: width, height' });
        return;
      }

      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);

      if (!width || !height || width <= 0 || height <= 0) {
        json(res, 400, { error: 'Invalid width or height' });
        return;
      }

      const expectedBytes = width * height * 4;
      if (body.length !== expectedBytes) {
        json(res, 400, { error: `Expected ${expectedBytes} bytes (${width}x${height}x4 RGBA), got ${body.length}` });
        return;
      }

      const rgba = new Uint8Array(body);
      const mono = rgbaToMono(rgba, width, height);

      await queue.enqueue(() => printer.sendBitmap(mono.data, mono.height));

      json(res, 200, { ok: true });
    },
  };
}
