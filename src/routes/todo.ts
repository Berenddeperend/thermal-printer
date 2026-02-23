import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

type TodoBody = {
  items: string[];
  title?: string;
};

const DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

function dutchDate(): string {
  const now = new Date();
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

const PREFIX = '[ ] ';
const INDENT = '    ';
const MAX_CHARS = 36; // 2x scale chars per line

function wrapTodoItem(text: string): string[] {
  const contentWidth = MAX_CHARS - PREFIX.length;
  const lines: string[] = [];
  let remaining = text;
  let isFirst = true;

  while (remaining.length > 0) {
    const prefix = isFirst ? PREFIX : INDENT;
    const width = contentWidth;

    if (remaining.length <= width) {
      lines.push(prefix + remaining);
      break;
    }

    let breakAt = remaining.lastIndexOf(' ', width);
    if (breakAt <= 0) breakAt = width;
    lines.push(prefix + remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
    isFirst = false;
  }

  return lines;
}

export function todoRoute(printer: Printer, queue: PrintQueue): Route {
  return {
    method: 'POST',
    path: '/api/printer/todo',
    handler: async (_req, res, body) => {
      const { items, title } = body as TodoBody;
      if (!items?.length) {
        json(res, 400, { error: 'Missing "items" array' });
        return;
      }

      const header = title || dutchDate();

      await queue.enqueue(() =>
        printer.execute((b) => {
          b.bold(header, 'center');
          b.line();
          b.feed(1);

          for (const item of items) {
            const lines = wrapTodoItem(item);
            for (const line of lines) {
              b.text(line);
            }
          }

          b.feed(2);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
