import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

type LabelBody = {
  text: string;
};

export function labelRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/label',
    handler: async (_req, res, body) => {
      const { text } = body as LabelBody;
      if (!text) {
        json(res, 400, { error: 'Missing "text" field' });
        return;
      }

      await queue.enqueue(() =>
        printer.execute((p) => {
          p.println(text);
          p.cut();
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
