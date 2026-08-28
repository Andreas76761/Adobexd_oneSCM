#!/usr/bin/env node
/**
 * Sichtprüfung: legt Bildschirmaufnahmen der fertigen Seite ab.
 * Automatisch prüfbar ist nur, was eindeutig entscheidbar ist - das Aussehen
 * selbst wird angesehen.
 *
 *   node Testing/schuss.mjs [Zielordner]     (Vorgabe: Testing/berichte)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
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

/* Kompakter Aufnahmemodus. Die Bildschirmfreigabe wird durch einen
   Leinwand-Datenstrom nachgestellt - anders ist sie nicht zu zeigen. */
{
  const geteilterBildschirm = `
    const leinwand = document.createElement('canvas');
    leinwand.width = 1600; leinwand.height = 900;
    const stift = leinwand.getContext('2d');
    const male = () => {
      stift.fillStyle = '#eef1f5'; stift.fillRect(0, 0, 1600, 900);
      stift.fillStyle = '#22364f'; stift.fillRect(0, 0, 1600, 64);
      stift.fillStyle = '#ffffff'; stift.font = '600 22px sans-serif';
      stift.fillText('Geteilter Bildschirm – Positionsliste', 28, 40);
      stift.fillStyle = '#ffffff'; stift.fillRect(40, 100, 1520, 760);
      stift.strokeStyle = '#d6dbe4';
      for (let i = 0; i < 18; i++) { stift.beginPath(); stift.moveTo(60, 150 + i * 40); stift.lineTo(1540, 150 + i * 40); stift.stroke(); }
      for (let i = 0; i < 8; i++) { stift.beginPath(); stift.moveTo(60 + i * 190, 130); stift.lineTo(60 + i * 190, 840); stift.stroke(); }
      stift.fillStyle = '#4a5769'; stift.font = '13px monospace';
      for (let z = 0; z < 17; z++) for (let sp = 0; sp < 7; sp++)
        stift.fillText(String(1200 + z * 7 + sp), 74 + sp * 190, 175 + z * 40);
    };
    male(); setInterval(male, 200);
    window.__strom = leinwand.captureStream(10);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true, value: { getDisplayMedia: async () => window.__strom }
    });`;

  for (const [name, thema] of [['kompakt', 'light'], ['kompakt-dunkel', 'dark']]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 940 }, colorScheme: thema });
    await kontext.addInitScript(geteilterBildschirm);
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.click('#quelle-bildschirm');
    await seite.waitForFunction(() => document.body.classList.contains('kompakt'));
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.fill('#feld-titel', 'Positionsliste ohne Spaltenbreite');
    await seite.selectOption('#feld-kategorie', 'Layout');
    await seite.fill('#feld-begriffe', 'tabelle, spalten');
    await seite.click('.preset button[data-preset="desktop"]');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(800);
    await seite.screenshot({ path: join(ziel, name + '.png') });
    console.log(name + '.png');
    await kontext.close();
  }
}

/* Der Kontaktbogen zum Herunterladen: erzeugen, ablegen, ansehen. */
{
  const kontext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await kontext.addInitScript(`window.__abgelegt = [];
    window.claude = { use: async (n) => n === 'downloads'
      ? { save: async (a) => { window.__abgelegt.push({ filename: a.filename, data: String(a.data) }); return { status: 'saved' }; } }
      : null };`);
  const seite = await kontext.newPage();
  await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
  await seite.waitForSelector('html[data-bereit="ja"]');
  await fuelleEingang(seite);
  await seite.click('.portal-nav button[data-ansicht="eingang"]');
  await seite.click('#eingang-kontaktbogen');
  await seite.waitForFunction(() => (window.__abgelegt || []).length === 1);
  const [datei] = await seite.evaluate(() => window.__abgelegt);
  const bogenPfad = join(ziel, datei.filename);
  writeFileSync(bogenPfad, datei.data, 'utf8');
  console.log(`${datei.filename} (${(datei.data.length / 1024).toFixed(0)} kB)`);

  const ansicht = await kontext.newPage();
  await ansicht.goto(pathToFileURL(bogenPfad).href, { waitUntil: 'load' });
  await ansicht.waitForTimeout(400);
  await ansicht.screenshot({ path: join(ziel, 'kontaktbogen.png'), fullPage: true });
  console.log('kontaktbogen.png');
  await kontext.close();
}

await browser.close();
console.log(`\nAufnahmen liegen in ${ziel}`);
