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
        printer.execute((p) => {
          p.drawLine();
          for (const item of items) {
            p.tableCustom([
              { text: item.name, align: 'LEFT', width: 0.7 },
              { text: item.price.toFixed(2), align: 'RIGHT', width: 0.3 },
            ]);
          }
          p.drawLine();
          p.tableCustom([
            { text: 'TOTAL', align: 'LEFT', width: 0.7, bold: true },
            { text: total.toFixed(2), align: 'RIGHT', width: 0.3, bold: true },
          ]);
          p.drawLine();
          p.newLine();
          p.cut();
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
