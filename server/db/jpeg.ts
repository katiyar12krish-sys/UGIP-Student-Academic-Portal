// Pure JPEG checking/cleaning (no web framework), so it can be unit-tested on its own.
const MIN_SIDE = 64, MAX_SIDE = 1024;

/** Accepts only a real baseline/progressive JPEG, drops EXIF/GPS and every other metadata segment, returns clean bytes + size. */
export function cleanJpeg(b: Buffer): { bytes: Buffer; width: number; height: number } | { error: string } {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return { error: 'Not a JPEG image' };
  const out: Buffer[] = [b.subarray(0, 2)];
  let i = 2, width = 0, height = 0, sawScan = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return { error: 'Damaged JPEG' };
    while (b[i + 1] === 0xff) i++;                       // fill bytes
    const marker = b[i + 1];
    if (marker === 0xd9) { out.push(b.subarray(i, i + 2)); i += 2; break; }            // EOI
    if (marker >= 0xd0 && marker <= 0xd7 || marker === 0x01) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > b.length) return { error: 'Damaged JPEG' };
    const seg = b.subarray(i, i + 2 + len);
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) { height = b.readUInt16BE(i + 5); width = b.readUInt16BE(i + 7); }
    const metadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;           // APP1..APP15 (EXIF, XMP, ICC...) and comments
    if (!metadata) out.push(seg);
    i += 2 + len;
    if (marker === 0xda) {                                                             // SOS: entropy-coded data follows up to EOI
      sawScan = true;
      const end = b.lastIndexOf(Buffer.from([0xff, 0xd9]));
      if (end < i) return { error: 'Damaged JPEG' };
      out.push(b.subarray(i, end + 2));
      i = b.length;
      break;
    }
  }
  if (!sawScan || !width || !height) return { error: 'Damaged JPEG' };
  if (width < MIN_SIDE || height < MIN_SIDE) return { error: `Photo is too small (minimum ${MIN_SIDE}px)` };
  if (width > MAX_SIDE || height > MAX_SIDE) return { error: `Photo is too large (maximum ${MAX_SIDE}px per side)` };
  return { bytes: Buffer.concat(out), width, height };
}
