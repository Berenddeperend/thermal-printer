import { config } from '../config.ts';
import type { ReceiptBuilder } from '../bitmap-font.ts';

export type PageviewsData = {
  totalViews: number;
  topPages: Array<{ path: string; views: number }>;
};

export async function fetchPageviews(): Promise<PageviewsData> {
  if (!config.pageviewsUrl) throw new Error('PAGEVIEWS_URL not configured');
  const res = await fetch(config.pageviewsUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Pageviews API ${res.status}`);
  return await res.json() as PageviewsData;
}

export function renderPageviews(b: ReceiptBuilder, data: PageviewsData): void {
  b.feed(1);
  b.bold('minitafeltje.nl', 'center');
  b.line();
  b.text(`Bezoekers: ${data.totalViews.toLocaleString('nl-NL')}`);
  b.feed(1);

  if (data.topPages?.length) {
    b.boldSmall('Top pagina\'s');
    for (const page of data.topPages.slice(0, 10)) {
      const views = String(page.views).padStart(5);
      const maxPath = 72 - 6; // 5 digits + space
      b.textSmall(`${views} ${page.path.slice(0, maxPath)}`);
    }
  }
}
