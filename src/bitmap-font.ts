// Pure JS text-to-bitmap renderer with embedded 8x16 CP437 font
// Font: Modern DOS 8x16 (public domain, based on IBM VGA 8x16)

const WIDTH_PX = 576; // 72 bytes × 8 bits — matches Star TSP143 print head
const WIDTH_BYTES = 72;
const CHAR_W = 8;
const CHAR_H = 16;
const CHARS_PER_LINE = WIDTH_PX / CHAR_W; // 72

// Embedded 8x16 CP437 bitmap font — 256 glyphs × 16 bytes = 4096 bytes
// Each byte is one row of a glyph (MSB = leftmost pixel)
const FONT = hexToBytes(
  '0000000000000000000000000000000000007e81a58181bd9981817e0000000000007effdbffffc3e7ffff7e00000000000000006ceefefefe7c3810000000000000000010387cfefe7c381000000000000000183c3c5affff5a183c0000000000000010387cfefeee54103800000000000000000000183c3c18000000000000ffffffffffffe7c3c3e7ffffffffffff00000000003c664242663c0000000000ffffffffffc399bdbd99c3ffffffffff00001e0e1a3078cccccccc780000000000003c666666663c187e18180000000000080c0a0a0a08080878f8700000000000101814121a16121272f2620e1e1c0000000010927c6cc66c7c92100000000000000080c0e0f8fef8e0c0800000000000000002060e3efe3e0e060200000000000010387cd61010d67c3810000000000000666666666666660066660000000000007fdbdbdbdb7b1b1b1b1b00000000007cc660386cc6c66c380cc67c0000000000000000000000fefefefe00000000000010387cd61010d67c3810fe000000000010387cd6101010101010000000000000101010101010d67c3810000000000000000010180cfe0c1810000000000000000000103060fe6030100000000000000000000000c0c0c0fe00000000000000000000002442ff4224000000000000000000001038387c7cfefe000000000000000000fefe7c7c3838100000000000000000000000000000000000000000000000183c3c3c1818180018180000000000666622220000000000000000000000000000006c6cfe6c6cfe6c6c000000000010107cd6d670381cd6d67c1010000000006092966c18306cd2920c000000000000386c6c383076dccccc76000000000018180810000000000000000000000000000c18303030303030180c00000000000030180c0c0c0c0c0c1830000000000000000000663cff3c66000000000000000000000018187e18180000000000000000000000000000000030301020000000000000000000fe00000000000000000000000000000000000030300000000000000002060c183060c080000000000000007cc6c6cedef6e6c6c67c0000000000001838781818181818187e0000000000007cc6060c183060c0c6fe0000000000007cc606063c060606c67c0000000000000c1c3c6cccccfe0c0c1e000000000000fec0c0c0fc060606c67c0000000000007cc6c0c0fcc6c6c6c67c000000000000fec606060c18303030300000000000007cc6c6c67cc6c6c6c67c0000000000007cc6c6c6c67e0606c67c000000000000000018180000001818000000000000000000181800000018180810000000000000060c18306030180c060000000000000000007e00007e000000000000000000006030180c060c1830600000000000007cc6c6060c1818001818000000000000003c429da5a5adb6403c000000000000386cc6c6c6fec6c6c6c6000000000000fc6666667c66666666fc0000000000007cc6c6c0c0c0c0c6c67c000000000000fc6666666666666666fc000000000000fe6662687878686266fe000000000000fe6662687878686060f00000000000007cc6c6c0c0cec6c6c67e000000000000c6c6c6c6fec6c6c6c6c60000000000003c18181818181818183c0000000000001e0c0c0c0c0c0ccccc78000000000000e666666c78786c6666e6000000000000f06060606060606266fe00000000000082c6eefefed6c6c6c6c600000000000086c6e6f6fedecec6c6c60000000000007cc6c6c6c6c6c6c6c67c000000000000fc666666667c606060f00000000000007cc6c6c6c6c6c6d6de7c060000000000fc666666667c6c6666e60000000000007cc6c660380c06c6c67c0000000000007e7e5a1818181818183c000000000000c6c6c6c6c6c6c6c6c67c000000000000c6c6c6c6c6c6c66c3810000000000000c6c6c6c6c6d6feeec682000000000000c6c66c7c38387c6cc6c6000000000000666666663c181818183c000000000000fec6860c183060c2c6fe0000000000003c30303030303030303c0000000000000080c06030180c0602000000000000003c0c0c0c0c0c0c0c0c3c00000000000010386cc60000000000000000000000000000000000000000000000ff0000001818100800000000000000000000000000000000780c7ccccccc76000000000000e060607c66666666667c0000000000000000007cc6c0c0c0c67c0000000000001c0c0c7ccccccccccc760000000000000000007cc6c6fec0c67c0000000000001c36307c30303030307800000000000000000076cccccccccc7c0ccc78000000e060606c7666666666e60000000000001818003818181818183c0000000000000c0c001c0c0c0c0c0c0ccccc78000000e06060666c78786c66e60000000000003818181818181818183c000000000000000000ecfed6d6d6d6c6000000000000000000dc6666666666660000000000000000007cc6c6c6c6c67c000000000000000000dc66666666667c6060f00000000000007ccccccccccc7c0c0c1e000000000000de7660606060f00000000000000000007cc660380cc67c000000000000103030fc303030303418000000000000000000cccccccccccc76000000000000000000c6c6c6c6c66c3810000000000000000000c6d6d6d6d6fe6c000000000000000000c6c66c386cc6c6000000000000000000c6c6c6c6c6c67e060cf8000000000000fe8c183060c2fe0000000000000e18181870181818180e00000000000018181818000018181818000000000000701818180e181818187000000000000076dc0000000000000000000000000000000010386cc6c6c6fe000000000000007cc6c6c0c0c0c0c6c67c100870000000cccc00cccccccccccc760000000000060c10007cc6c6fec0c67c00000000003078cc00780c7ccccccc76000000000000cccc00780c7ccccccc760000000000c0601000780c7ccccccc76000000000030483000780c7ccccccc760000000000000000007cc6c0c0c0c67c1008700000183c66007cc6c6fec0c67c000000000000c6c6007cc6c6fec0c67c0000000000c06010007cc6c6fec0c67c0000000000006666003818181818183c0000000000183c66003818181818183c0000000000c06010003818181818183c00000000c6c600386cc6c6fec6c6c6c600000000384438386cc6c6fec6c6c6c6000000000c1820fe66626878686266fe0000000000000000007c12729e90927c0000000000003e6ac8c8ccfcc8c8cace0000000000183c66007cc6c6c6c6c67c000000000000c6c6007cc6c6c6c6c67c0000000000c06010007cc6c6c6c6c67c00000000003078cc00cccccccccccc760000000000c0601000cccccccccccc76000000000000c6c600c6c6c6c6c6c67e060c7800c6c6007cc6c6c6c6c6c6c67c00000000c6c600c6c6c6c6c6c6c6c67c00000000000010107cd6d0d0d67c1010000000000000386c60f060606060f2dc0000000000006666663c187e187e1818000000000000f8ccccf8c4ccdeccccc60000000000000e1b18187e181818181818d8700000060c1000780c7ccccccc760000000000060c10003818181818183c0000000000060c10007cc6c6c6c6c67c0000000000060c1000cccccccccccc7600000000000076dc00dc6666666666660000000076dc0086c6e6f6fedecec6c60000000000380c3c6c36007e000000000000000000003c66663c007e00000000000000000000303000303060c0c6c67c0000000000000000000000fec0c0c0000000000000000000000000fe06060600000000000060e0646c783060dcb60c183e0000000060e0646c78306cdcac3e0c0c00000000001818001818183c3c3c18000000000000000000366cd86c360000000000000000000000d86c366cd80000000000002288228822882288228822882288228855aa55aa55aa55aa55aa55aa55aa55aadd77dd77dd77dd77dd77dd77dd77dd7f1818181818181818181818181818181818181818181818f818181818181818181818181818f818f8181818181818181836363636363636f6363636363636363600000000000000fe36363636363636360000000000f818f818181818181818183636363636f606f63636363636363636363636363636363636363636363636360000000000fe06f636363636363636363636363636f606fe000000000000000036363636363636fe00000000000000001818181818f818f8000000000000000000000000000000f81818181818181818181818181818181f000000000000000018181818181818ff000000000000000000000000000000ff1818181818181818181818181818181f181818181818181800000000000000ff000000000000000018181818181818ff181818181818181818181818181f181f181818181818181836363636363636373636363636363636363636363637303f000000000000000000000000003f303736363636363636363636363636f700ff00000000000000000000000000ff00f73636363636363636363636363637303736363636363636360000000000ff00ff00000000000000003636363636f700f736363636363636361818181818ff00ff000000000000000036363636363636ff00000000000000000000000000ff00ff181818181818181800000000000000ff3636363636363636363636363636363f000000000000000018181818181f181f000000000000000000000000001f181f1818181818181818000000000000003f363636363636363636363636363636ff36363636363636361818181818ff18ff181818181818181818181818181818f80000000000000000000000000000001f1818181818181818ffffffffffffffffffffffffffffffff00000000000000fffffffffffffffffff0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f00f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0fffffffffffffffff0000000000000000000000000074dcc8c8c8dc7600000000000078ccccd8ccc6c6c6dcc0400000000000fe6260606060606060f00000000000000000027eec6c6c6c6c48000000000000fec26030183060c0c2fe0000000000000000007ed0c8c8c8c870000000000000000000ccccccccccccf88080000000000000007ed8181818181000000000000038107cd6d6d6d67c1038000000000000007cc6c6c6fec6c6c67c0000000000007cc6c6c6c6c66c2828ee0000000000003c6230187ccccccccc780000000000000000006edbdbdb7600000000000000000002067cceded6f6e67cc080000000000000003c60c0f8c0603c0000000000007cc6c6c6c6c6c6c6c6c60000000000000000fe0000fe0000fe00000000000000000018187e18180000ff000000000000006030180c18306000fe000000000000000c18306030180c00fe0000000000000e1b1b1818181818181818181818181818181818181818d8d87000000000000000001818007e0018180000000000000000000076dc0076dc00000000000000386c6c3800000000000000000000000000000000000030300000000000000000000000000000003000000000000000000f0c0c0c0c0cec6c6c3c1c0000000000d86c6c6c6c0000000000000000000000384c0c18307c000000000000000000000000007c7c7c7c7c7c7c000000000000000000000000000000000000000000',
);

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

type Align = 'left' | 'center' | 'right';

type Column = {
  text: string;
  align?: Align;
  width: number; // fraction 0-1
  bold?: boolean;
};

export class ReceiptBuilder {
  private rows: Uint8Array[] = [];

  /** Render a line of text at 1x size (8x16, 72 chars/line) */
  textSmall(str: string, align: Align = 'left'): this {
    for (const line of this.wrap(str, CHARS_PER_LINE)) {
      this.rows.push(this.renderLine1x(this.pad(line, CHARS_PER_LINE, align), false));
    }
    return this;
  }

  /** Render a line of bold text at 1x size */
  boldSmall(str: string, align: Align = 'left'): this {
    for (const line of this.wrap(str, CHARS_PER_LINE)) {
      this.rows.push(this.renderLine1x(this.pad(line, CHARS_PER_LINE, align), true));
    }
    return this;
  }

  /** Render a line of text at 2x size (16x32, 36 chars/line) */
  text(str: string, align: Align = 'left'): this {
    const maxChars = CHARS_PER_LINE / 2; // 36
    for (const line of this.wrap(str, maxChars)) {
      this.rows.push(this.renderLine2x(this.pad(line, maxChars, align), false));
    }
    return this;
  }

  /** Render a line of bold text at 2x size */
  bold(str: string, align: Align = 'left'): this {
    const maxChars = CHARS_PER_LINE / 2;
    for (const line of this.wrap(str, maxChars)) {
      this.rows.push(this.renderLine2x(this.pad(line, maxChars, align), true));
    }
    return this;
  }

  /** Render a line of text at 3x size (24x48, 24 chars/line) */
  textLarge(str: string, align: Align = 'left'): this {
    const maxChars = CHARS_PER_LINE / 3; // 24
    for (const line of this.wrap(str, maxChars)) {
      this.rows.push(this.renderLine3x(this.pad(line, maxChars, align), false));
    }
    return this;
  }

  /** Render a line of bold text at 3x size */
  boldLarge(str: string, align: Align = 'left'): this {
    const maxChars = CHARS_PER_LINE / 3; // 24
    for (const line of this.wrap(str, maxChars)) {
      this.rows.push(this.renderLine3x(this.pad(line, maxChars, align), true));
    }
    return this;
  }

  /** Draw a horizontal line (1px tall row of black pixels) */
  line(): this {
    const row = new Uint8Array(WIDTH_BYTES);
    row.fill(0xff);
    this.rows.push(row);
    return this;
  }

  /** Render a table row with column layout (2x size, 36 chars) */
  table(columns: Column[]): this {
    const charsPerLine = CHARS_PER_LINE / 2; // 36
    const line = new Uint8Array(charsPerLine);
    let pos = 0;
    for (const col of columns) {
      const colChars = Math.max(1, Math.round(col.width * charsPerLine));
      const padded = this.pad(col.text.slice(0, colChars), colChars, col.align || 'left');
      for (let i = 0; i < colChars && pos < charsPerLine; i++, pos++) {
        line[pos] = padded.charCodeAt(i);
      }
    }
    // Fill remainder with spaces
    while (pos < charsPerLine) line[pos++] = 0x20;

    const str = String.fromCharCode(...line);
    const isBold = columns.some((c) => c.bold);
    this.rows.push(this.renderLine2x(str, isBold));
    return this;
  }

  /** Add blank lines (each is CHAR_H pixels tall) */
  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.rows.push(new Uint8Array(WIDTH_BYTES * CHAR_H));
    }
    return this;
  }

  /** Build final 1-bit packed bitmap */
  build(): { data: Uint8Array; width: number; height: number } {
    const totalBytes = this.rows.reduce((sum, r) => sum + r.length, 0);
    const data = new Uint8Array(totalBytes);
    let offset = 0;
    for (const row of this.rows) {
      data.set(row, offset);
      offset += row.length;
    }
    const height = totalBytes / WIDTH_BYTES;
    return { data, width: WIDTH_PX, height };
  }

  // -- private helpers --

  /** Render a string of exactly `CHARS_PER_LINE` characters to a bitmap (1x size) */
  private renderLine1x(str: string, bold: boolean): Uint8Array {
    const buf = new Uint8Array(WIDTH_BYTES * CHAR_H);
    for (let row = 0; row < CHAR_H; row++) {
      for (let col = 0; col < CHARS_PER_LINE; col++) {
        const ch = str.charCodeAt(col) & 0xff;
        let byte = FONT[ch * 16 + row];
        if (bold) byte |= (byte >> 1); // OR with 1px right shift = bold
        const byteIndex = row * WIDTH_BYTES + col;
        buf[byteIndex] = byte;
      }
    }
    return buf;
  }

  /** Render a string at 2x size (16x32 per char) */
  private renderLine2x(str: string, bold: boolean): Uint8Array {
    const charsPerLine = CHARS_PER_LINE / 2; // 36
    const charH2 = CHAR_H * 2; // 32
    const buf = new Uint8Array(WIDTH_BYTES * charH2);
    for (let row = 0; row < CHAR_H; row++) {
      for (let col = 0; col < charsPerLine; col++) {
        const ch = str.charCodeAt(col) & 0xff;
        let byte = FONT[ch * 16 + row];
        if (bold) byte |= (byte >> 1);
        // Expand 8 bits to 16 bits (each bit doubled horizontally)
        let wide = 0;
        for (let b = 7; b >= 0; b--) {
          if (byte & (1 << b)) {
            wide |= (3 << (b * 2)); // two bits for each source bit
          }
        }
        const hi = (wide >> 8) & 0xff;
        const lo = wide & 0xff;
        const baseCol = col * 2;
        // Write to two rows (double vertically)
        const r1 = row * 2;
        const r2 = r1 + 1;
        buf[r1 * WIDTH_BYTES + baseCol] = hi;
        buf[r1 * WIDTH_BYTES + baseCol + 1] = lo;
        buf[r2 * WIDTH_BYTES + baseCol] = hi;
        buf[r2 * WIDTH_BYTES + baseCol + 1] = lo;
      }
    }
    return buf;
  }

  /** Render a string at 3x size (24x48 per char) */
  private renderLine3x(str: string, bold: boolean): Uint8Array {
    const charsPerLine = CHARS_PER_LINE / 3; // 24
    const charH3 = CHAR_H * 3; // 48
    const buf = new Uint8Array(WIDTH_BYTES * charH3);
    for (let row = 0; row < CHAR_H; row++) {
      for (let col = 0; col < charsPerLine; col++) {
        const ch = str.charCodeAt(col) & 0xff;
        let byte = FONT[ch * 16 + row];
        if (bold) byte |= (byte >> 1);
        // Expand 8 bits to 24 bits (each bit tripled horizontally)
        let wide = 0;
        for (let b = 7; b >= 0; b--) {
          if (byte & (1 << b)) {
            wide |= (7 << (b * 3)); // three bits for each source bit
          }
        }
        // 24 bits = 3 bytes per char
        const b0 = (wide >> 16) & 0xff;
        const b1 = (wide >> 8) & 0xff;
        const b2 = wide & 0xff;
        const baseCol = col * 3;
        // Write to three rows (triple vertically)
        for (let ry = 0; ry < 3; ry++) {
          const destRow = row * 3 + ry;
          buf[destRow * WIDTH_BYTES + baseCol] = b0;
          buf[destRow * WIDTH_BYTES + baseCol + 1] = b1;
          buf[destRow * WIDTH_BYTES + baseCol + 2] = b2;
        }
      }
    }
    return buf;
  }

  private pad(str: string, width: number, align: Align): string {
    if (str.length >= width) return str.slice(0, width);
    const gap = width - str.length;
    switch (align) {
      case 'center': {
        const left = Math.floor(gap / 2);
        return ' '.repeat(left) + str + ' '.repeat(gap - left);
      }
      case 'right':
        return ' '.repeat(gap) + str;
      default:
        return str + ' '.repeat(gap);
    }
  }

  private wrap(str: string, maxLen: number): string[] {
    if (str.length <= maxLen) return [str];
    const lines: string[] = [];
    let remaining = str;
    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        lines.push(remaining);
        break;
      }
      // Try to break at last space within maxLen
      let breakAt = remaining.lastIndexOf(' ', maxLen);
      if (breakAt <= 0) breakAt = maxLen;
      lines.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    return lines;
  }
}
