export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  cupsName: process.env.CUPS_PRINTER || 'Star_TSP143',
  weatherLat: process.env.WEATHER_LAT || '52.22',
  weatherLon: process.env.WEATHER_LON || '6.89',
  pageviewsUrl: process.env.PAGEVIEWS_URL || '',
  birdnetUrl: process.env.BIRDNET_URL || '',
} as const;
