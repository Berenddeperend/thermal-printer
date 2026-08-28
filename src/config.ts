export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  cupsName: process.env.CUPS_PRINTER || 'Star_TSP143',
  weatherLat: process.env.WEATHER_LAT || '52.22',
  weatherLon: process.env.WEATHER_LON || '6.89',
  pageviewsUrl: process.env.PAGEVIEWS_URL || '',
  birdnetUrl: process.env.BIRDNET_URL || '',
  videoDir: process.env.VIDEO_DIR || 'data/videos',
  videoPreRollMs: parseInt(process.env.VIDEO_PREROLL_MS || '1500', 10),
  videoActiveMs: parseInt(process.env.VIDEO_ACTIVE_MS || '1500', 10),
  videoTtlMs: parseInt(process.env.VIDEO_TTL_MS || String(60 * 60 * 1000), 10),
} as const;
