import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ReceiptBuilder } from './bitmap-font.ts';
import { encode } from './star-raster.ts';
import { config } from './config.ts';

const execFileAsync = promisify(execFile);

const WIDTH_BYTES = 72;

type PrintOptions = {
  /** Cut the paper after this job. Defaults to true. Set false to chain
   * another execute()/sendBitmap() call onto the same continuous strip
   * (e.g. text followed by an image), cutting only after the last one. */
  cut?: boolean;
};

export type Printer = {
  isConnected: () => Promise<boolean>;
  execute: (fn: (b: ReceiptBuilder) => void, opts?: PrintOptions) => Promise<void>;
  sendBitmap: (data: Uint8Array, height: number, opts?: PrintOptions) => Promise<void>;
};

function createCupsInterface(cupsName: string) {
  return {
    async isPrinterConnected(): Promise<boolean> {
      try {
        const { stdout } = await execFileAsync('lpstat', ['-p', cupsName]);
        return /idle|printing/.test(stdout);
      } catch {
        return false;
      }
    },

    async sendRaw(buffer: Buffer): Promise<void> {
      return new Promise((resolve, reject) => {
        const lp = execFile('lp', ['-d', cupsName, '-o', 'raw', '-'], (err) => {
          if (err) reject(err);
          else resolve();
        });
        lp.stdin!.end(buffer);
      });
    },
  };
}

function createRealPrinter(): Printer {
  const cups = createCupsInterface(config.cupsName);

  return {
    isConnected: () => cups.isPrinterConnected(),
    execute: async (fn, opts) => {
      const builder = new ReceiptBuilder();
      fn(builder);
      const { data, height } = builder.build();
      const raster = encode(data, WIDTH_BYTES, height, opts?.cut ?? true);
      await cups.sendRaw(raster);
    },
    sendBitmap: async (data, height, opts) => {
      const raster = encode(data, WIDTH_BYTES, height, opts?.cut ?? true);
      await cups.sendRaw(raster);
    },
  };
}

function createMockPrinter(): Printer {
  const log = (...args: unknown[]) => console.log('[mock-printer]', ...args);

  return {
    isConnected: async () => true,
    execute: async (fn, opts) => {
      log('--- job start ---');
      const builder = new ReceiptBuilder();
      fn(builder);
      const { width, height } = builder.build();
      log(`rendered ${width}x${height} bitmap (cut=${opts?.cut ?? true})`);
      log('--- job end ---');
    },
    sendBitmap: async (data, height, opts) => {
      log('--- bitmap job start ---');
      log(`sendBitmap ${data.length} bytes, 576x${height} (cut=${opts?.cut ?? true})`);
      log('--- bitmap job end ---');
    },
  };
}

export function createPrinter(): Printer {
  if (config.env === 'production') {
    return createRealPrinter();
  }
  console.log('Using mock printer (NODE_ENV=%s)', config.env);
  return createMockPrinter();
}
