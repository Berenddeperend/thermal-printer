import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

export function imageRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/image',
    raw: true,
    handler: async (req, res, body) => {
      const contentType = req.headers['content-type'] || '';
      if (contentType !== 'image/png') {
        json(res, 400, { error: 'Content-Type must be image/png' });
        return;
      }

      const imageBuffer = body as Buffer;
      if (!imageBuffer || imageBuffer.length === 0) {
        json(res, 400, { error: 'Empty request body' });
        return;
      }

      const tempPath = join(tmpdir(), `print-${randomUUID()}.png`);

      try {
        await writeFile(tempPath, imageBuffer);

        await queue.enqueue(async () => {
          try {
            await printer.execute(async (p) => {
              await p.printImage(tempPath);
              p.cut();
            });
          } finally {
            await unlink(tempPath).catch(() => {});
          }
        });

        json(res, 200, { ok: true });
      } catch (err) {
        await unlink(tempPath).catch(() => {});
        throw err;
      }
    },
  };
}
