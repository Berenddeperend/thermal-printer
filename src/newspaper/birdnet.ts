import { config } from '../config.ts';
import type { ReceiptBuilder } from '../bitmap-font.ts';

type BirdnetApiResponse = {
  summary: {
    total_detections: number;
    unique_species: number;
    detections_change_pct: number | null;
    species_change_pct: number | null;
  };
  species: Array<{ Com_Name: string; count: number; change_pct: number | null }>;
};

export type BirdnetData = {
  totalDetections: number;
  uniqueSpecies: number;
  detectionsChangePct: number | null;
  speciesChangePct: number | null;
  species: Array<{ name: string; count: number; changePct: number | null }>;
};

export async function fetchBirdnet(): Promise<BirdnetData> {
  if (!config.birdnetUrl) throw new Error('BIRDNET_URL not configured');
  const res = await fetch(config.birdnetUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`BirdNET API ${res.status}`);
  const api = await res.json() as BirdnetApiResponse;
  return {
    totalDetections: api.summary.total_detections,
    uniqueSpecies: api.summary.unique_species,
    detectionsChangePct: api.summary.detections_change_pct,
    speciesChangePct: api.summary.species_change_pct,
    species: api.species.map(s => ({ name: s.Com_Name, count: s.count, changePct: s.change_pct })),
  };
}

function formatPct(pct: number | null): string {
  if (pct === null) return 'nieuw';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
}

export function renderBirdnet(b: ReceiptBuilder, data: BirdnetData): void {
  b.feed(1);
  b.bold('BirdNET', 'center');
  b.line();
  const detPct = data.detectionsChangePct !== null ? ` (${formatPct(data.detectionsChangePct)})` : '';
  const spPct = data.speciesChangePct !== null ? ` (${formatPct(data.speciesChangePct)})` : '';
  b.text(`Detecties: ${data.totalDetections.toLocaleString('nl-NL')}${detPct}`);
  b.text(`Soorten: ${data.uniqueSpecies}${spPct}`);
  b.feed(1);

  if (data.species?.length) {
    for (const s of data.species.slice(0, 15)) {
      const count = String(s.count).padStart(4);
      const pct = formatPct(s.changePct);
      const pctStr = ` ${pct}`;
      const maxName = 36 - 5 - pctStr.length; // count + space + pct suffix
      const name = s.name.length > maxName ? s.name.slice(0, maxName) : s.name.padEnd(maxName);
      b.text(`${count} ${name}${pctStr}`);
    }
  }
}
