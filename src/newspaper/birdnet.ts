import { config } from '../config.ts';
import type { ReceiptBuilder } from '../bitmap-font.ts';

export type BirdnetData = {
  totalDetections: number;
  species: Array<{ name: string; count: number }>;
};

export async function fetchBirdnet(): Promise<BirdnetData> {
  if (!config.birdnetUrl) throw new Error('BIRDNET_URL not configured');
  const res = await fetch(config.birdnetUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`BirdNET API ${res.status}`);
  return await res.json() as BirdnetData;
}

export function renderBirdnet(b: ReceiptBuilder, data: BirdnetData): void {
  b.feed(1);
  b.bold('BirdNET', 'center');
  b.line();
  b.text(`Detecties: ${data.totalDetections.toLocaleString('nl-NL')}`);
  b.text(`Soorten: ${data.species.length}`);
  b.feed(1);

  if (data.species?.length) {
    for (const s of data.species.slice(0, 10)) {
      const count = String(s.count).padStart(4);
      const maxName = 36 - 5; // 4 digits + space
      b.text(`${count} ${s.name.slice(0, maxName)}`);
    }
  }
}
