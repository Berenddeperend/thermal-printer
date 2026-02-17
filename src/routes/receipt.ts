import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

type ReceiptItem = {
  name: string;
  price: number;
};

type ReceiptBody = {
  items: ReceiptItem[];
  total: number;
};

export function receiptRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/receipt',
    handler: async (_req, res, body) => {
      const { items, total } = body as ReceiptBody;
      if (!items?.length || total == null) {
        json(res, 400, { error: 'Missing "items" or "total"' });
        return;
      }

      await queue.enqueue(() =>
        printer.execute((b) => {
          b.line();
          for (const item of items) {
            b.table([
              { text: item.name, align: 'left', width: 0.7 },
              { text: item.price.toFixed(2), align: 'right', width: 0.3 },
            ]);
          }
          b.line();
          b.table([
            { text: 'TOTAL', align: 'left', width: 0.7, bold: true },
            { text: total.toFixed(2), align: 'right', width: 0.3, bold: true },
          ]);
          b.line();
          b.feed(2);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
