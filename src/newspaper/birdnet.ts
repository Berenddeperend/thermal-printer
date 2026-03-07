import { config } from '../config.ts';
import type { ReceiptBuilder } from '../bitmap-font.ts';

type BirdnetApiResponse = {
  summary: { total_detections: number; unique_species: number };
  species: Array<{ Com_Name: string; count: number }>;
};

export type BirdnetData = {
  totalDetections: number;
  uniqueSpecies: number;
  species: Array<{ name: string; count: number }>;
};

export async function fetchBirdnet(): Promise<BirdnetData> {
  if (!config.birdnetUrl) throw new Error('BIRDNET_URL not configured');
  const res = await fetch(config.birdnetUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`BirdNET API ${res.status}`);
  const api = await res.json() as BirdnetApiResponse;
  return {
    totalDetections: api.summary.total_detections,
    uniqueSpecies: api.summary.unique_species,
    species: api.species.map(s => ({ name: s.Com_Name, count: s.count })),
  };
}

export function renderBirdnet(b: ReceiptBuilder, data: BirdnetData): void {
  b.feed(1);
  b.bold('BirdNET', 'center');
  b.line();
  b.text(`Detecties: ${data.totalDetections.toLocaleString('nl-NL')}`);
  b.text(`Soorten: ${data.uniqueSpecies}`);
  b.feed(1);

  if (data.species?.length) {
    for (const s of data.species.slice(0, 10)) {
      const count = String(s.count).padStart(4);
      const maxName = 36 - 5; // 4 digits + space
      b.text(`${count} ${s.name.slice(0, maxName)}`);
    }
  }
}
