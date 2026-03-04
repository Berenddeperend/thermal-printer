import { config } from '../config.ts';
import type { ReceiptBuilder } from '../bitmap-font.ts';

const DAYS_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Helder',
  1: 'Licht bewolkt',
  2: 'Bewolkt',
  3: 'Betrokken',
  45: 'Mist',
  48: 'Rijpmist',
  51: 'Lichte motregen',
  53: 'Motregen',
  55: 'Zware motregen',
  56: 'IJzel',
  57: 'Zware ijzel',
  61: 'Lichte regen',
  63: 'Regen',
  65: 'Zware regen',
  66: 'IJsregen',
  67: 'Zware ijsregen',
  71: 'Lichte sneeuw',
  73: 'Sneeuw',
  75: 'Zware sneeuw',
  77: 'Korrelsneeuw',
  80: 'Lichte buien',
  81: 'Buien',
  82: 'Zware buien',
  85: 'Sneeuwbuien',
  86: 'Zware sneeuwbuien',
  95: 'Onweer',
  96: 'Onweer + hagel',
  99: 'Zwaar onweer',
};

type DailyForecast = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
};

export type WeatherData = {
  days: Array<{
    date: Date;
    high: number;
    low: number;
    description: string;
  }>;
};

export async function fetchWeather(): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${config.weatherLat}&longitude=${config.weatherLon}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Amsterdam&forecast_days=7`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json() as { daily: DailyForecast };
  const d = json.daily;

  return {
    days: d.time.map((t, i) => ({
      date: new Date(t),
      high: Math.round(d.temperature_2m_max[i]),
      low: Math.round(d.temperature_2m_min[i]),
      description: WMO_DESCRIPTIONS[d.weather_code[i]] || `Code ${d.weather_code[i]}`,
    })),
  };
}

export function renderWeather(b: ReceiptBuilder, data: WeatherData): void {
  b.feed(1);
  b.bold('Weer', 'center');
  b.line();

  for (const day of data.days) {
    const dayName = DAYS_NL[day.date.getUTCDay()];
    const dateStr = `${day.date.getUTCDate()}/${day.date.getUTCMonth() + 1}`;
    const temp = `${day.low}/${day.high}`;

    // Format: "ma 3/3   Bewolkt        2/8"
    const left = `${dayName} ${dateStr}`;
    const right = temp;
    const middle = day.description;

    // At 2x scale, 36 chars total
    const midSpace = 36 - left.length - right.length - middle.length - 2;
    if (midSpace > 0) {
      b.text(`${left} ${middle}${' '.repeat(midSpace)} ${right}`);
    } else {
      // Truncate description if needed
      const available = 36 - left.length - right.length - 2;
      b.text(`${left} ${middle.slice(0, available)} ${right}`);
    }
  }
}
