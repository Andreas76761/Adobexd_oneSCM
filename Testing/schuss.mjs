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

/** Nimmt im Studio zwei Bilder auf, damit der Eingang nicht leer aussieht. */
async function fuelleEingang(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled);
  const reihe = [
    ['Sekundärnavigation ohne Kontrast', 'oneSCM Portal', 'Barrierefreiheit', 'kontrast, navigation'],
    ['Bestellliste als Kachelraster', 'oneSCM Portal', '', '']
  ];
  for (const [titel, projekt, kategorie, begriffe] of reihe) {
    await seite.fill('#feld-titel', titel);
    await seite.fill('#feld-projekt', projekt);
    await seite.selectOption('#feld-kategorie', kategorie);
    await seite.fill('#feld-begriffe', begriffe);
    await seite.click('.preset button[data-preset="tablet"]');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(200);
  }
}

const ansichten = [
  { name: 'liste-hell', optionen: {} },
  { name: 'liste-dunkel', optionen: { thema: 'dark' } },
  { name: 'detail-regler', optionen: { hash: '#id=SCR-2025-004&a=alle' } },
  { name: 'detail-dunkel', optionen: { hash: '#id=SCR-2025-009&a=alle', thema: 'dark' } },
  { name: 'telefon', optionen: { viewport: { width: 390, height: 844 } } },
  { name: 'aufnahme', optionen: { hash: '#ans=aufnahme' }, vorher: fuelleEingang },
  { name: 'aufnahme-dunkel', optionen: { hash: '#ans=aufnahme', thema: 'dark' }, vorher: fuelleEingang },
  {
    name: 'eingang',
    optionen: { hash: '#ans=aufnahme' },
    vorher: async (seite) => {
      await fuelleEingang(seite);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForTimeout(200);
    }
  },
  {
    name: 'eingang-nachpflege',
    optionen: { hash: '#ans=aufnahme' },
    vorher: async (seite) => {
      await fuelleEingang(seite);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#eingang-dialog[open]');
      await seite.waitForTimeout(200);
    }
  }
];

for (const { name, optionen, vorher } of ansichten) {
  const kontext = await browser.newContext({
    viewport: optionen.viewport || { width: 1500, height: 1000 },
    colorScheme: optionen.thema || 'light'
  });
  const seite = await kontext.newPage();
  await seite.goto(adresse + (optionen.hash || ''), { waitUntil: 'load' });
  await seite.waitForSelector('html[data-bereit="ja"]');
  await seite.waitForTimeout(600);
  if (vorher) await vorher(seite);
  await seite.screenshot({ path: join(ziel, name + '.png') });
  await kontext.close();
  console.log(`${name}.png`);
}

await browser.close();
console.log(`\nAufnahmen liegen in ${ziel}`);
