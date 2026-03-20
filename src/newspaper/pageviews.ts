import { config } from '../config.ts';
import type { ReceiptBuilder } from '../bitmap-font.ts';

type DomainData = {
  total: number;
  period: number;
  pages: Record<string, { total: number; period: number }>;
};

export type PageviewsData = {
  from: string;
  to: string;
  domains: Record<string, DomainData>;
};

const DISPLAY_DOMAINS = ['berendswennenhuis.nl', 'minitafeltje.nl'];

export async function fetchPageviews(): Promise<PageviewsData> {
  if (!config.pageviewsUrl) throw new Error('PAGEVIEWS_URL not configured');
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const from = weekAgo.toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const url = `${config.pageviewsUrl}?from=${from}&to=${to}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Pageviews API ${res.status}`);
  return await res.json() as PageviewsData;
}

function renderDomain(b: ReceiptBuilder, name: string, data: DomainData): void {
  b.feed(1);
  b.bold(name, 'center');
  b.line();
  b.text(`Bezoekers: ${data.period.toLocaleString('nl-NL')}`);
  b.feed(1);

  const pages = Object.entries(data.pages)
    .map(([path, { period }]) => ({ path, views: period }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  if (pages.length) {
    b.boldSmall('Top pagina\'s');
    for (const page of pages) {
      const views = String(page.views).padStart(5);
      const maxPath = 72 - 6; // 5 digits + space
      b.textSmall(`${views} ${page.path.slice(0, maxPath)}`);
    }
  }
}

export function renderPageviews(b: ReceiptBuilder, data: PageviewsData): void {
  for (const domain of DISPLAY_DOMAINS) {
    if (data.domains[domain]) {
      renderDomain(b, domain, data.domains[domain]);
    }
  }
}
