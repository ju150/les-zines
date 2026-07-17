// One-shot image optimization (run: node scripts-tools/optimize-images.mjs)
// - Generates the OG card (1200×630) and apple-touch-icon from existing assets
// - Converts the big hero/gallery photos referenced in src/ to resized WebP and removes the originals
// - Recompresses the auto-scanned villa gallery JPEGs in place (same filenames)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('public');

const toWebp = [
  'photos/villa-jardin.jpeg', 'photos/jardin-1.jpg', 'photos/jardin-2.jpg', 'photos/jardin-3.jpg',
  'photos/jardin-5.jpg', 'photos/terrasse.jpeg', 'photos/montuzet.jpeg', 'photos/cap-ferret.jpg',
  'photos/nuit-1.jpeg', 'photos/nuit-2.jpeg',
  'photos/cap-ferret/belisaire.jpg', 'photos/cap-ferret/plage-horizon.jpg',
  'photos/cap-ferret/marche-village.jpg', 'photos/cap-ferret/plage-americains.jpg',
  'photos/cap-ferret/bassin-maree-basse.jpg', 'photos/cap-ferret/presquile.jpg',
  'photos/cap-ferret/sunset-bassin.jpg',
];

const kb = (n) => Math.round(n / 1024) + 'KB';

// OG card + touch icon first: they read originals that get replaced below.
await sharp(path.join(ROOT, 'photos/villa-jardin.jpeg'))
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(path.join(ROOT, 'photos/og.jpg'));
console.log('og.jpg', kb(fs.statSync(path.join(ROOT, 'photos/og.jpg')).size));

await sharp(path.join(ROOT, 'favicon.svg'), { density: 288 })
  .resize(180, 180)
  .png()
  .toFile(path.join(ROOT, 'apple-touch-icon.png'));
console.log('apple-touch-icon.png ok');

for (const rel of toWebp) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) { console.warn('SKIP missing', rel); continue; }
  const out = src.replace(/\.jpe?g$/i, '.webp');
  const before = fs.statSync(src).size;
  await sharp(src).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  const after = fs.statSync(out).size;
  fs.unlinkSync(src);
  console.log(rel, '→ webp', kb(before), '→', kb(after));
}

// Villa galleries are scanned by filename at build time → recompress in place, keep names.
const dirs = ['photos/villa/vie-cuisine', 'photos/villa/chambres', 'photos/villa/sdb', 'photos/villa/terrasses', 'photos/villa/jardin'];
let saved = 0;
for (const d of dirs) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!/\.jpe?g$/i.test(f)) continue;
    const p = path.join(abs, f);
    try {
      // Read into memory first: sharp holding the input handle open blocks the
      // in-place write on Windows.
      const input = fs.readFileSync(p);
      const before = input.length;
      const buf = await sharp(input).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
      if (buf.length < before * 0.9) { fs.writeFileSync(p, buf); saved += before - buf.length; }
    } catch (e) {
      console.warn('FAILED', d + '/' + f, e.message);
    }
  }
}
console.log('villa galleries: saved', (saved / 1048576).toFixed(1) + 'MB in place');
