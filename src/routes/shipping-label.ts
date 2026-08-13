import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

type ShippingLabelBody = {
  name: string;
  address: string;
  postalCode: string;
  city: string;
};

export function shippingLabelRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/shipping-label',
    handler: async (_req, res, body) => {
      const { name, address, postalCode, city } = (body as ShippingLabelBody) || {};
      if (!name || !address || !postalCode || !city) {
        json(res, 400, { error: 'Missing "name", "address", "postalCode" or "city" field' });
        return;
      }

      await queue.enqueue(() =>
        printer.execute((b) => {
          b.feed(1);
          b.line();
          b.bold(name);
          b.text(address);
          b.text(`${postalCode} ${city}`);
          b.line();
          b.feed(2);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
