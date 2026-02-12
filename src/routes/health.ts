import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

export function healthRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'GET',
    path: '/api/printer/health',
    handler: async (_req, res) => {
      const connected = await printer.isConnected();
      json(res, 200, { ok: true, connected, queueDepth: queue.depth });
    },
  };
}
