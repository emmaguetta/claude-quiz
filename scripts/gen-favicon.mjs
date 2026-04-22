import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'app/icon.svg'));

const sizes = [16, 32, 48, 64];
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);

const entries = Buffer.alloc(16 * sizes.length);
let offset = 6 + 16 * sizes.length;
for (let i = 0; i < sizes.length; i++) {
  const size = sizes[i];
  const png = pngs[i];
  const e = entries.subarray(i * 16, (i + 1) * 16);
  e.writeUInt8(size === 256 ? 0 : size, 0);
  e.writeUInt8(size === 256 ? 0 : size, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
}

const ico = Buffer.concat([header, entries, ...pngs]);
writeFileSync(join(root, 'app/favicon.ico'), ico);
console.log(`✓ favicon.ico généré (${sizes.join(', ')}px, ${ico.length} bytes)`);
