// RGBA → 1-bit monochrome bitmap conversion for image printing
// Output: 1-bit packed (8 pixels/byte, MSB first), 72 bytes/row (576px)

const TARGET_WIDTH = 576;
const TARGET_WIDTH_BYTES = 72;

/**
 * Convert RGBA pixel data to a 1-bit packed bitmap suitable for Star Graphic Mode.
 *
 * - Scales to 576px wide (nearest-neighbor), maintains aspect ratio
 * - Grayscale via luminance: 0.299*R + 0.587*G + 0.114*B
 * - Threshold at 128: dark pixels → 1 (black), light → 0 (white)
 * - Packs 8 pixels per byte, MSB first, 72 bytes per row
 */
export function rgbaToMono(
  rgba: Uint8Array,
  srcWidth: number,
  srcHeight: number,
): { data: Uint8Array; height: number } {
  const scale = TARGET_WIDTH / srcWidth;
  const dstHeight = Math.round(srcHeight * scale);

  const out = new Uint8Array(TARGET_WIDTH_BYTES * dstHeight);

  for (let y = 0; y < dstHeight; y++) {
    const srcY = Math.min(Math.floor(y / scale), srcHeight - 1);
    for (let x = 0; x < TARGET_WIDTH; x++) {
      const srcX = Math.min(Math.floor(x / scale), srcWidth - 1);
      const i = (srcY * srcWidth + srcX) * 4;

      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const a = rgba[i + 3];

      // Blend alpha against white background
      const af = a / 255;
      const rr = r * af + 255 * (1 - af);
      const gg = g * af + 255 * (1 - af);
      const bb = b * af + 255 * (1 - af);

      const gray = 0.299 * rr + 0.587 * gg + 0.114 * bb;

      if (gray < 128) {
        const byteIndex = y * TARGET_WIDTH_BYTES + (x >> 3);
        out[byteIndex] |= 0x80 >> (x & 7);
      }
    }
  }

  return { data: out, height: dstHeight };
}
