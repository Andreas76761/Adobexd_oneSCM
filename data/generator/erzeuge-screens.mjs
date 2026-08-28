#!/usr/bin/env node
/**
 * Erzeugt aus data/eintraege.json alle Aufnahmen nach data/screens/.
 * Aufruf: npm run screens
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zeichneScreen } from './screens.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..', '..');
const zielOrdner = join(wurzel, 'data', 'screens');

const daten = JSON.parse(readFileSync(join(wurzel, 'data', 'eintraege.json'), 'utf8'));
const viewports = Object.fromEntries(daten.vokabular.viewports.map((v) => [v.id, v]));

mkdirSync(zielOrdner, { recursive: true });
for (const datei of readdirSync(zielOrdner)) {
  if (datei.endsWith('.svg') || datei === 'manifest.json') unlinkSync(join(zielOrdner, datei));
}

const manifest = [];
let bytes = 0;
for (const eintrag of daten.eintraege) {
  const viewport = viewports[eintrag.viewport];
  if (!viewport) throw new Error(`${eintrag.id}: unbekannter Viewport "${eintrag.viewport}"`);
  for (const variante of ['vorher', 'nachher']) {
    const svg = zeichneScreen(eintrag, variante, viewport);
    const name = `${eintrag.id}-${variante}.svg`;
    writeFileSync(join(zielOrdner, name), svg, 'utf8');
    bytes += Buffer.byteLength(svg);
    manifest.push({
      datei: name,
      eintrag: eintrag.id,
      variante,
      viewport: eintrag.viewport,
      breite: viewport.breite,
      hoehe: viewport.hoehe,
      aufgenommen: eintrag.screen[variante].aufgenommen,
      bytes: Buffer.byteLength(svg)
    });
  }
}
writeFileSync(
  join(zielOrdner, 'manifest.json'),
  JSON.stringify({ erzeugt_aus: 'data/eintraege.json', anzahl: manifest.length, aufnahmen: manifest }, null, 2),
  'utf8'
);
console.log(`${manifest.length} Aufnahmen erzeugt (${(bytes / 1024).toFixed(1)} kB) → data/screens/`);
