import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';
import { fetchNewspaperData, renderNewspaper } from '../newspaper/index.ts';

export function newspaperRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/newspaper',
    handler: async (_req, res) => {
      // Fetch all data before entering the queue so we don't block printing
      const data = await fetchNewspaperData();

      await queue.enqueue(() =>
        printer.execute((b) => {
          renderNewspaper(b, data);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
