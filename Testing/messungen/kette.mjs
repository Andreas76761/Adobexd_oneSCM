/**
 * Die ganze Kette an echtem Bildschirminhalt:
 *
 *   Messfilm → Register Video → Bilder → Strecke → Designstudio → Quick Guide
 *
 * Geprüft wurde bisher jedes Glied für sich, und das mit erfundenen Bildern.
 * Hier läuft einmal alles durch, mit einer oneSCM-ähnlichen Maske in
 * 1280 × 720 – und am Ende liegt eine PDF da, die man ansehen kann.
 *
 *   node Testing/messungen/kette.mjs <ordner mit film.webm> [zielordner]
 */
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const ordner = process.argv[2] || join(hier, 'ausgabe');
const ziel = process.argv[3] || ordner;
mkdirSync(ziel, { recursive: true });
const wahrheit = JSON.parse(readFileSync(join(ordner, 'wahrheit.json'), 'utf8'));
const film = readFileSync(join(ordner, 'film.webm'));

const nachbau = `
  window.__dateien = [];
  window.claude = { use: async (n) => n !== 'downloads' ? null : { save: async (a) => {
    const puffer = await a.data.arrayBuffer();
    window.__letzte = Array.from(new Uint8Array(puffer));
    window.__dateien.push({ name: a.filename, groesse: puffer.byteLength });
    return { status: 'saved' };
  } } };`;

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const kontext = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
await kontext.addInitScript(nachbau);
const seite = await kontext.newPage();
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));

const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;
await seite.goto(adresse + '#ans=video');
await seite.waitForSelector('#video-ansicht:not([hidden])');

// --- 1. Film einlesen -------------------------------------------------
await seite.evaluate((bytes) => {
  const datei = new File([new Uint8Array(bytes)], 'Servicevertrag anlegen.webm', { type: 'video/webm' });
  const t = new DataTransfer();
  t.items.add(datei);
  const e = document.getElementById('video-eingabe');
  e.files = t.files;
  e.dispatchEvent(new Event('change', { bubbles: true }));
}, [...film]);
await seite.waitForFunction(() => !document.getElementById('video-leiste').hidden, null, { timeout: 30000 });
console.log('1. Film:', await seite.locator('#video-meldung').innerText());

// --- 2. Bilder herausnehmen (Voreinstellungen von 1.62.0) --------------
await seite.click('#video-automatisch');
await seite.waitForFunction(() => !document.getElementById('video-automatisch').disabled, null, { timeout: 180000 });
await seite.waitForTimeout(400);
const anzahl = await seite.locator('.video-figur').count();
console.log(`2. Abtastung: ${anzahl} Bilder ·`, await seite.locator('#video-meldung').innerText());

// --- 3. Texte eintragen (was sonst die Deutung liefert) ---------------
const anweisungen = wahrheit.aenderungen.map((a) => a.was);
for (let i = 0; i < anzahl; i++) {
  await seite.locator('.video-figur textarea').nth(i).fill(anweisungen[i] || `Schritt ${i + 1}`);
}

// --- 4. Als Strecke übernehmen ---------------------------------------
await seite.fill('#video-stelle', '7.5.1');
await seite.click('#video-fortlaufend');
await seite.waitForTimeout(300);
await seite.click('#video-strecke');
await seite.waitForFunction((n) => document.querySelectorAll('.video-figur--fertig').length >= n, anzahl, { timeout: 120000 });
await seite.waitForTimeout(500);
console.log('3. Strecke:', await seite.locator('#video-meldung').innerText());

// --- 5. Designstudio: alle vier Unterlagen ---------------------------
await seite.click('.portal-nav button[data-ansicht="design"]');
await seite.waitForSelector('#design-ansicht:not([hidden])');
await seite.waitForTimeout(600);
const streckenWahl = await seite.locator('#design-quelle option').evaluateAll((o) =>
  o.map((e) => ({ wert: e.value, text: e.textContent })).find((e) => /Strecke/i.test(e.text))
);
if (streckenWahl) await seite.selectOption('#design-quelle', streckenWahl.wert);
await seite.waitForTimeout(400);

const vorlagen = await seite.locator('#design-vorlage option').evaluateAll((o) =>
  o.map((e) => ({ wert: e.value, text: e.textContent.trim() }))
);
console.log('4. Vorlagen:', vorlagen.map((v) => v.text).join(' | '));

for (const vorlage of vorlagen) {
  await seite.selectOption('#design-vorlage', vorlage.wert);
  await seite.waitForTimeout(900);
  const blaetter = await seite.locator('.design-blatt, .blatt').count();
  await seite.evaluate(() => (window.__dateien = []));
  await seite.click('#design-pdf');
  await seite.waitForFunction(() => (window.__dateien || []).length >= 1, null, { timeout: 180000 });
  const [datei] = await seite.evaluate(() => window.__dateien);
  const bytes = await seite.evaluate(() => window.__letzte);
  const name = vorlage.wert + '.pdf';
  writeFileSync(join(ziel, name), Buffer.from(bytes));
  console.log(`   ${vorlage.text.padEnd(16)} ${String(blaetter).padStart(2)} Blatt · ${(datei.groesse / 1024).toFixed(0)} kB → ${name}`);
}

if (fehler.length) console.log('FEHLER in der Seite:', fehler.join(' | '));
else console.log('Keine Fehler in der Seite.');
await browser.close();
