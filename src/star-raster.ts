// Star Graphic Mode (raster) encoder for Star TSP143IIU+
// Protocol: https://github.com/geftactics/python-StarTSPImage

const ESC = 0x1b;

const ENTER_RASTER = Buffer.from([ESC, 0x2a, 0x72, 0x41]); // ESC * r A
const CONTINUOUS_MODE = Buffer.from([ESC, 0x2a, 0x72, 0x50, 0x30, 0x00]); // ESC * r P 0 \0
const EXIT_RASTER = Buffer.from([ESC, 0x2a, 0x72, 0x42]); // ESC * r B
const PARTIAL_CUT = Buffer.from([ESC, 0x64, 0x03]); // ESC d 3

/**
 * Encode a 1-bit packed bitmap into Star Graphic Mode binary.
 *
 * Input: 1-bit packed bitmap (8 pixels per byte, MSB first),
 *        `widthBytes` bytes per row, row-major order.
 * Output: Buffer ready to send via `lp -o raw`.
 */
export function encode(
  bitmap: Uint8Array,
  widthBytes: number,
  height: number,
  cut = true,
): Buffer {
  const nL = widthBytes & 0xff;
  const nH = (widthBytes >> 8) & 0xff;

  const parts: Buffer[] = [ENTER_RASTER, CONTINUOUS_MODE];

  for (let y = 0; y < height; y++) {
    const offset = y * widthBytes;
    const row = bitmap.subarray(offset, offset + widthBytes);
    const header = Buffer.from([0x62, nL, nH]); // b nL nH
    parts.push(header, Buffer.from(row));
  }

  parts.push(EXIT_RASTER);
  if (cut) parts.push(PARTIAL_CUT);

  return Buffer.concat(parts);
}
