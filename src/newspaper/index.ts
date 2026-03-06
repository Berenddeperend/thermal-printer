import type { ReceiptBuilder } from '../bitmap-font.ts';
import type { WeatherData } from './weather.ts';
import type { PageviewsData } from './pageviews.ts';
import type { BirdnetData } from './birdnet.ts';
import type { SudokuData } from './sudoku.ts';
import { fetchWeather, renderWeather } from './weather.ts';
import { fetchPageviews, renderPageviews } from './pageviews.ts';
import { fetchBirdnet, renderBirdnet } from './birdnet.ts';
import { fetchSudoku, renderSudoku } from './sudoku.ts';

const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

function dutchDate(): string {
  const now = new Date();
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

type NewspaperData = {
  weather: WeatherData | null;
  pageviews: PageviewsData | null;
  birdnet: BirdnetData | null;
  sudoku: SudokuData | null;
};

export async function fetchNewspaperData(): Promise<NewspaperData> {
  const [weather, pageviews, birdnet, sudoku] = await Promise.allSettled([
    fetchWeather(),
    fetchPageviews(),
    fetchBirdnet(),
    fetchSudoku(),
  ]);

  if (weather.status === 'rejected') console.error('[newspaper] weather failed:', weather.reason);
  if (pageviews.status === 'rejected') console.error('[newspaper] pageviews failed:', pageviews.reason);
  if (birdnet.status === 'rejected') console.error('[newspaper] birdnet failed:', birdnet.reason);
  if (sudoku.status === 'rejected') console.error('[newspaper] sudoku failed:', sudoku.reason);

  return {
    weather: weather.status === 'fulfilled' ? weather.value : null,
    pageviews: pageviews.status === 'fulfilled' ? pageviews.value : null,
    birdnet: birdnet.status === 'fulfilled' ? birdnet.value : null,
    sudoku: sudoku.status === 'fulfilled' ? sudoku.value : null,
  };
}

export function renderNewspaper(b: ReceiptBuilder, data: NewspaperData): void {
  b.boldLarge('Berend\'s weekkrant', 'center');
  b.text(dutchDate(), 'center');
  b.line();

  if (data.weather) renderWeather(b, data.weather);
  if (data.pageviews) renderPageviews(b, data.pageviews);
  if (data.birdnet) renderBirdnet(b, data.birdnet);
  if (data.sudoku) renderSudoku(b, data.sudoku);

  b.feed(3);
}
