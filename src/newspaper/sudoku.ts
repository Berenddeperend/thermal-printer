import type { ReceiptBuilder } from '../bitmap-font.ts';

type Grid = number[][];

export type SudokuData = {
  puzzle: Grid;
  difficulty: string;
};

export async function fetchSudoku(): Promise<SudokuData> {
  const url = 'https://sudoku-api.vercel.app/api/dosuku?query={newboard(limit:1){grids{value,difficulty}}}';
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Sudoku API ${res.status}`);
  const json = await res.json() as {
    newboard: { grids: Array<{ value: Grid; difficulty: string }> };
  };
  const grid = json.newboard.grids[0];
  return { puzzle: grid.value, difficulty: grid.difficulty };
}

// CP437 box-drawing char codes
const H_LINE = String.fromCharCode(196);   // ─
const V_LINE = String.fromCharCode(179);   // │
const CROSS = String.fromCharCode(197);    // ┼
const DOT = String.fromCharCode(250);      // ·

function formatRow(row: number[]): string {
  const cells = row.map((v) => v === 0 ? ' ' : String(v));
  const box1 = cells.slice(0, 3).join(' ');
  const box2 = cells.slice(3, 6).join(' ');
  const box3 = cells.slice(6, 9).join(' ');
  return `${box1} ${V_LINE} ${box2} ${V_LINE} ${box3}`;
}

function separatorLine(): string {
  const seg = H_LINE.repeat(5);
  return `${seg}${H_LINE}${CROSS}${H_LINE}${seg}${H_LINE}${CROSS}${H_LINE}${seg}`;
}

export function renderSudoku(b: ReceiptBuilder, data: SudokuData): void {
  b.feed(1);
  b.bold(`Sudoku`, 'center');
  b.text(`${data.difficulty} difficulty`, 'center');
  b.line();
  b.feed(1);

  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) {
      b.textLarge(separatorLine(), 'center');
    }
    b.textLarge(formatRow(data.puzzle[i]), 'center');
  }
}
