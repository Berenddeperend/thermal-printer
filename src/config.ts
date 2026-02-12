export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  printerInterface: process.env.PRINTER_INTERFACE || '/dev/usb/lp0',
} as const;
