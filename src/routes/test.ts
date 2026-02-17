import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

export function testRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/test',
    handler: async (_req, res) => {
      await queue.enqueue(() =>
        printer.execute((b) => {
          b.bold('TEXT STYLE SAMPLER', 'center');
          b.line();
          b.feed(1);

          b.text('text() left aligned');
          b.text('text() center aligned', 'center');
          b.text('text() right aligned', 'right');
          b.feed(1);

          b.bold('bold() left aligned');
          b.bold('bold() center aligned', 'center');
          b.bold('bold() right aligned', 'right');
          b.feed(1);

          b.textLarge('textLarge() left');
          b.textLarge('textLarge() center', 'center');
          b.textLarge('textLarge() right', 'right');
          b.feed(1);

          b.boldLarge('boldLarge() left');
          b.boldLarge('boldLarge() center', 'center');
          b.boldLarge('boldLarge() right', 'right');
          b.feed(1);

          b.line();
          b.bold('TABLE LAYOUT', 'center');
          b.line();
          b.table([
            { text: 'Left col', align: 'left', width: 0.5 },
            { text: 'Right col', align: 'right', width: 0.5 },
          ]);
          b.table([
            { text: 'Bold left', align: 'left', width: 0.5, bold: true },
            { text: 'Bold right', align: 'right', width: 0.5, bold: true },
          ]);
          b.table([
            { text: 'Col 1', align: 'left', width: 0.33 },
            { text: 'Col 2', align: 'center', width: 0.34 },
            { text: 'Col 3', align: 'right', width: 0.33 },
          ]);
          b.feed(1);

          b.line();
          b.bold('WORD WRAP', 'center');
          b.line();
          b.text('This is a long line of text that should automatically wrap to the next line when it exceeds the maximum character width of the printer.');
          b.feed(1);

          b.boldLarge('Large text also wraps nicely across lines');
          b.feed(2);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
