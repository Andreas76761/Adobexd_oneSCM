#!/usr/bin/env node
/**
 * Sichtprüfung: legt Bildschirmaufnahmen der fertigen Seite ab.
 * Automatisch prüfbar ist nur, was eindeutig entscheidbar ist - das Aussehen
 * selbst wird angesehen.
 *
 *   node Testing/schuss.mjs [Zielordner]     (Vorgabe: Testing/berichte)
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { baueVorschau, findeChromium } from './hilfen/seite.mjs';

const wurzel = join(import.meta.dirname, '..');
const ziel = process.argv[2] || join(wurzel, 'Testing', 'berichte');
mkdirSync(ziel, { recursive: true });

const start = findeChromium();
if (!start) {
  console.error('Kein Chromium gefunden – CHROMIUM_PFAD setzen.');
  process.exit(1);
}
const { chromium } = await import('playwright-core');
const adresse = pathToFileURL(baueVorschau(join(wurzel, 'dist', 'index.html'))).href;
const browser = await chromium.launch({ executablePath: start, args: ['--no-sandbox'] });

const ansichten = [
  { name: 'liste-hell', optionen: {} },
  { name: 'liste-dunkel', optionen: { thema: 'dark' } },
  { name: 'detail-regler', optionen: { hash: '#id=SCR-2025-004&a=alle' } },
  { name: 'detail-dunkel', optionen: { hash: '#id=SCR-2025-009&a=alle', thema: 'dark' } },
  { name: 'telefon', optionen: { viewport: { width: 390, height: 844 } } }
];

for (const { name, optionen } of ansichten) {
  const kontext = await browser.newContext({
    viewport: optionen.viewport || { width: 1500, height: 1000 },
    colorScheme: optionen.thema || 'light'
  });
  const seite = await kontext.newPage();
  await seite.goto(adresse + (optionen.hash || ''), { waitUntil: 'load' });
  await seite.waitForSelector('html[data-bereit="ja"]');
  await seite.waitForTimeout(600);
  await seite.screenshot({ path: join(ziel, name + '.png') });
  await kontext.close();
  console.log(`${name}.png`);
}

await browser.close();
console.log(`\nAufnahmen liegen in ${ziel}`);
