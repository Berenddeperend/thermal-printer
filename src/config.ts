export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  cupsName: process.env.CUPS_PRINTER || 'Star_TSP143',
} as const;
