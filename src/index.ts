import { createServer } from 'node:http';
import { config } from './config.ts';
import { createPrinter } from './printer.ts';
import { PrintQueue } from './queue.ts';
import { createRouter } from './router.ts';
import { healthRoute } from './routes/health.ts';
import { labelRoute } from './routes/label.ts';
import { receiptRoute } from './routes/receipt.ts';
import { imageRoute } from './routes/image.ts';
import { canvasRoute } from './routes/canvas.ts';

const printer = createPrinter();
const queue = new PrintQueue();

const handler = createRouter([
  healthRoute(printer, queue),
  labelRoute(printer, queue),
  receiptRoute(printer, queue),
  imageRoute(printer, queue),
  canvasRoute(printer, queue),
]);

const server = createServer(handler);

server.listen(config.port, () => {
  console.log('print-server listening on :%d (%s)', config.port, config.env);
});
