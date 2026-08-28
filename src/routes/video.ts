import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Route } from '../router.ts';
import { json } from '../router.ts';
import { config } from '../config.ts';

const PREFIX = '/api/printer/video/';
// crypto.randomUUID()'s canonical form only — the primary defense against
// this becoming a path-traversal vector, since it's used to build a fs path.
const VALID_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$/;

export function videoRoute(): Route {
  return {
    method: 'GET',
    path: '/api/printer/video/*',
    handler: async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const filename = url.pathname.slice(PREFIX.length);

      if (!VALID_FILENAME.test(filename)) {
        json(res, 400, { error: 'Invalid video id' });
        return;
      }

      const filePath = path.join(config.videoDir, filename);

      let size: number;
      try {
        size = (await fs.stat(filePath)).size;
      } catch {
        json(res, 404, { error: 'Not found (not ready yet, or expired)' });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': size,
      });
      const stream = createReadStream(filePath);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    },
  };
}
