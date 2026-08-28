#!/usr/bin/env node
/**
 * Testlauf des Screenarchivs.
 *
 *   npm test                 alle Testdateien
 *   npm test -- --nur=kern   nur Dateien, deren Name "kern" enthaelt
 *   npm run test:e2e         nur die Browserpruefung
 *
 * Der Bericht landet zusaetzlich in Testing/berichte/letzter-lauf.md.
 */
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const nurFilter = (process.argv.find((a) => a.startsWith('--nur=')) || '').slice(6);

const dateien = readdirSync(join(hier, 'tests'))
  .filter((d) => d.endsWith('.mjs'))
  .filter((d) => !nurFilter || d.includes(nurFilter))
  .sort();

const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const grau = (s) => `\x1b[90m${s}\x1b[0m`;

let bestanden = 0;
let gescheitert = 0;
let uebersprungen = 0;
const bericht = [`# Testlauf ${new Date().toISOString()}`, ''];

for (const datei of dateien) {
  const modul = await import(pathToFileURL(join(hier, 'tests', datei)).href);
  const s = modul.default;
  console.log(`\n${s.name}  ${grau(datei)}`);
  bericht.push(`## ${s.name} (${datei})`, '');
  for (const fall of s.faelle) {
    const start = Date.now();
    try {
      const ergebnis = await fall.fn();
      const dauer = Date.now() - start;
      if (ergebnis === 'uebersprungen') {
        uebersprungen++;
        console.log(`  ${grau('○')} ${fall.beschreibung} ${grau('(übersprungen)')}`);
        bericht.push(`- ○ ${fall.beschreibung} (übersprungen)`);
      } else {
        bestanden++;
        console.log(`  ${gruen('✓')} ${fall.beschreibung} ${grau(dauer + ' ms')}`);
        bericht.push(`- ✓ ${fall.beschreibung} (${dauer} ms)`);
      }
    } catch (fehler) {
      gescheitert++;
      console.log(`  ${rot('✗')} ${fall.beschreibung}`);
      console.log(rot('      ' + String(fehler.message).split('\n').join('\n      ')));
      bericht.push(`- ✗ ${fall.beschreibung}`, '', '```', String(fehler.stack || fehler.message), '```', '');
    }
  }
  bericht.push('');
}

const zusammenfassung = `${bestanden} bestanden, ${gescheitert} gescheitert, ${uebersprungen} übersprungen`;
console.log(`\n${gescheitert ? rot('FEHLGESCHLAGEN') : gruen('ALLE TESTS BESTANDEN')} – ${zusammenfassung}\n`);
bericht.splice(1, 0, '', `**${zusammenfassung}**`);

mkdirSync(join(hier, 'berichte'), { recursive: true });
writeFileSync(join(hier, 'berichte', 'letzter-lauf.md'), bericht.join('\n'), 'utf8');

process.exit(gescheitert ? 1 : 0);
