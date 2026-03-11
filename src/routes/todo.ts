import type { Route } from '../router.ts';
import { json } from '../router.ts';
import type { Printer } from '../printer.ts';
import type { PrintQueue } from '../queue.ts';

type TodoItem = { text: string; done?: boolean } | { category: string; items: { text: string; done?: boolean }[] };

type TodoBody = {
  items: TodoItem[];
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

const MAX_CHARS = 36; // 2x scale chars per line

function wrapTodoItem(text: string, done: boolean): string[] {
  const prefix = done ? '[X] ' : '[ ] ';
  const indent = '    ';
  const contentWidth = MAX_CHARS - prefix.length;
  const lines: string[] = [];
  let remaining = text;
  let isFirst = true;

  while (remaining.length > 0) {
    const pfx = isFirst ? prefix : indent;
    const width = contentWidth;

    if (remaining.length <= width) {
      lines.push(pfx + remaining);
      break;
    }

    let breakAt = remaining.lastIndexOf(' ', width);
    if (breakAt <= 0) breakAt = width;
    lines.push(pfx + remaining.slice(0, breakAt));
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
            if ('category' in item) {
              b.feed(1);
              b.boldSmall(item.category.toUpperCase());
              for (const sub of item.items) {
                for (const line of wrapTodoItem(sub.text, sub.done ?? false)) {
                  b.text(line);
                }
              }
            } else {
              for (const line of wrapTodoItem(item.text, item.done ?? false)) {
                b.text(line);
              }
            }
          }

          b.feed(2);
        }),
      );

      json(res, 200, { ok: true });
    },
  };
}
