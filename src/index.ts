import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { config } from './config.ts';
import { createPrinter } from './printer.ts';
import { PrintQueue } from './queue.ts';
import { createCapturer, startVideoCleanupSweep } from './video.ts';
import { createRouter } from './router.ts';
import { healthRoute } from './routes/health.ts';
import { labelRoute } from './routes/label.ts';
import { shippingLabelRoute } from './routes/shipping-label.ts';
import { receiptRoute } from './routes/receipt.ts';
import { imageRoute } from './routes/image.ts';
import { canvasRoute } from './routes/canvas.ts';
import { testRoute } from './routes/test.ts';
import { todoRoute } from './routes/todo.ts';
import { newspaperRoute } from './routes/newspaper.ts';
import { drawingRoute } from './routes/drawing.ts';
import { videoRoute } from './routes/video.ts';

const printer = createPrinter();
const queue = new PrintQueue();
const capturer = createCapturer();

await mkdir(config.videoDir, { recursive: true });
startVideoCleanupSweep();

const handler = createRouter([
  healthRoute(printer, queue),
  labelRoute(printer, queue, capturer),
  shippingLabelRoute(printer, queue, capturer),
  receiptRoute(printer, queue, capturer),
  imageRoute(printer, queue, capturer),
  canvasRoute(printer, queue, capturer),
  testRoute(printer, queue, capturer),
  todoRoute(printer, queue, capturer),
  newspaperRoute(printer, queue, capturer),
  drawingRoute(printer, queue, capturer),
  videoRoute(),
]);

const server = createServer(handler);

server.listen(config.port, () => {
  console.log('print-server listening on :%d (%s)', config.port, config.env);
});
