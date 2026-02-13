import { printer as ThermalPrinter, types as PrinterTypes } from 'node-thermal-printer';
import { config } from './config.ts';

export type Printer = {
  isConnected: () => Promise<boolean>;
  execute: (fn: (p: ThermalPrinter) => void | Promise<void>) => Promise<void>;
};

function createRealPrinter(): Printer {
  const p = new ThermalPrinter({
    type: PrinterTypes.STAR,
    interface: config.printerInterface,
  });

  return {
    isConnected: () => p.isPrinterConnected(),
    execute: async (fn) => {
      p.clear();
      await fn(p);
      await p.execute();
    },
  };
}

function createMockPrinter(): Printer {
  const log = (...args: unknown[]) => console.log('[mock-printer]', ...args);

  const mock = {
    text: (t: string) => log('text:', t),
    println: (t: string) => log('println:', t),
    bold: (on: boolean) => log('bold:', on),
    alignCenter: () => log('alignCenter'),
    alignLeft: () => log('alignLeft'),
    alignRight: () => log('alignRight'),
    drawLine: () => log('drawLine'),
    newLine: () => log('newLine'),
    cut: () => log('cut'),
    printImage: async (path: string) => log('printImage:', path),
    setTextSize: (w: number, h: number) => log('setTextSize:', w, h),
    tableCustom: (rows: unknown[]) => log('tableCustom:', JSON.stringify(rows)),
    clear: () => log('clear'),
    execute: async () => log('execute'),
    isPrinterConnected: async () => true,
  } as unknown as ThermalPrinter;

  return {
    isConnected: async () => true,
    execute: async (fn) => {
      log('--- job start ---');
      await fn(mock);
      log('--- job end ---');
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
