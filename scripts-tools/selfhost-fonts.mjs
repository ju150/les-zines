// One-shot: download the Google Fonts woff2 files used by the site into public/fonts/
// and emit src/styles/fonts.css with local @font-face rules (RGPD: no more requests
// to fonts.googleapis.com / fonts.gstatic.com at runtime).
// Run: node scripts-tools/selfhost-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Playfair+Display:ital,wght@1,600&family=Manrope:wght@300;400;500;600;700&display=swap';
// A modern UA makes Google serve woff2 (default UA gets ttf).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const SUBSETS = new Set(['latin', 'latin-ext']);

const outDir = path.resolve('public/fonts');
fs.mkdirSync(outDir, { recursive: true });

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

// The css2 payload is a sequence of "/* subset */ @font-face { ... }" blocks.
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)];
let out = '/* Polices auto-hébergées (générées par scripts-tools/selfhost-fonts.mjs) */\n';
let count = 0;
for (const [, subset, face] of blocks) {
  if (!SUBSETS.has(subset)) continue;
  const family = face.match(/font-family:\s*'([^']+)'/)?.[1];
  const style = face.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal';
  const weight = face.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
  const url = face.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!family || !url) continue;
  const slug = family.toLowerCase().replace(/\s+/g, '-');
  const file = `${slug}-${style === 'italic' ? 'italic-' : ''}${weight}-${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  fs.writeFileSync(path.join(outDir, file), buf);
  out += face.replace(/src:\s*url\([^)]+\)\s*format\('woff2'\)/, `src: url('/fonts/${file}') format('woff2')`) + '\n';
  count++;
}
fs.writeFileSync(path.resolve('src/styles/fonts.css'), out);
console.log(`OK: ${count} fichiers woff2 dans public/fonts/, règles dans src/styles/fonts.css`);
