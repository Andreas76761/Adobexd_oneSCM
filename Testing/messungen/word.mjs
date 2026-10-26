/**
 * Word und PowerPoint an echtem Bildschirminhalt – und zwar angesehen,
 * nicht nur gezählt.
 *
 * Bei Word ist „Text bleibt Text“ das ganze Versprechen (F-61), und der
 * Rückweg aus Word (F-65) hängt daran: was keine Überschrift ist, findet
 * nicht zurück in die Gliederung.
 *
 *   node Testing/messungen/word.mjs <ordner mit film.webm> [zielordner]
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
await seite.evaluate((bytes) => {
  const datei = new File([new Uint8Array(bytes)], 'Servicevertrag anlegen.webm', { type: 'video/webm' });
  const t = new DataTransfer();
  t.items.add(datei);
  const e = document.getElementById('video-eingabe');
  e.files = t.files;
  e.dispatchEvent(new Event('change', { bubbles: true }));
}, [...film]);
await seite.waitForFunction(() => !document.getElementById('video-leiste').hidden, null, { timeout: 30000 });
await seite.click('#video-automatisch');
await seite.waitForFunction(() => !document.getElementById('video-automatisch').disabled, null, { timeout: 180000 });
await seite.waitForTimeout(400);
const anzahl = await seite.locator('.video-figur').count();
const anweisungen = wahrheit.aenderungen.map((a) => a.was);
for (let i = 0; i < anzahl; i++) {
  await seite.locator('.video-figur textarea').nth(i).fill(anweisungen[i] || `Schritt ${i + 1}`);
}
await seite.fill('#video-stelle', '7.5.1');
await seite.click('#video-fortlaufend');
await seite.waitForTimeout(300);
await seite.click('#video-strecke');
await seite.waitForFunction((n) => document.querySelectorAll('.video-figur--fertig').length >= n, anzahl, { timeout: 120000 });
console.log(`Bestand: ${anzahl} Bilder, Stellen 7.5.1 aufwärts`);

await seite.click('.portal-nav button[data-ansicht="design"]');
await seite.waitForSelector('#design-ansicht:not([hidden])');
await seite.waitForTimeout(600);

/** Drückt einen Knopf und schreibt die Datei heraus. */
async function sichere(knopf, name, wartezeit = 180000) {
  await seite.evaluate(() => (window.__dateien = []));
  await seite.click(knopf);
  await seite.waitForFunction(() => (window.__dateien || []).length >= 1, null, { timeout: wartezeit });
  const [datei] = await seite.evaluate(() => window.__dateien);
  const bytes = await seite.evaluate(() => window.__letzte);
  writeFileSync(join(ziel, name), Buffer.from(bytes));
  console.log(`${name.padEnd(22)} ${(datei.groesse / 1024).toFixed(0)} kB  (${datei.name})`);
}

// Das ganze Handbuch als Word – „Text bleibt Text".
await seite.evaluate(() => (document.getElementById('design-studio').open = true));
await seite.waitForTimeout(300);
await sichere('#handbuch-word', 'handbuch.docx');

// Dieselben Blätter als Word und PowerPoint über das Register Output.
await seite.click('.portal-nav button[data-ansicht="output"]');
await seite.waitForSelector('#output-ansicht:not([hidden])');
await seite.waitForTimeout(600);

/**
 * Hakt ein Kästchen an oder ab – über seine Kennung und mit frischem
 * Zugriff. Jede Änderung baut die ganze Gruppe neu auf; ein gemerkter
 * Verweis zeigt danach ins Leere.
 */
async function hake(kennung, soll) {
  const feld = seite.locator('#' + kennung);
  if ((await feld.isChecked()) !== soll) {
    await feld.click();
    await seite.waitForTimeout(250);
  }
}
for (const [kennung, soll] of [
  ['output-vorlagen-quickguide', false],
  ['output-vorlagen-ablauf', true],
  ['output-formate-pdf', false],
  ['output-formate-docx', true],
  ['output-formate-pptx', true]
]) {
  await hake(kennung, soll);
}
// Ein Inhalt muss gewählt sein, sonst gibt es nichts zu rechnen.
const streckenWert = await seite.locator('#output-inhalte option').evaluateAll((o) => {
  const t = o.map((e) => ({ wert: e.value, text: e.textContent }));
  return (t.find((e) => e.wert.startsWith('strecke:')) || t[0] || {}).wert;
});
await seite.selectOption('#output-inhalte', [streckenWert]);
await seite.waitForTimeout(300);
await seite.waitForTimeout(600);
console.log('Geplant:', await seite.locator('#output-umfang').innerText());
await seite.click('#output-erzeugen');
await seite.waitForFunction(() => !document.getElementById('output-sichern').disabled, null, { timeout: 240000 });
// Jede Datei einzeln abholen: `downloads.save` wird je Datei gerufen.
await seite.evaluate(() => {
  window.__alle = [];
  window.claude = {
    use: async (n) =>
      n !== 'downloads'
        ? null
        : {
            save: async (a) => {
              const puffer = await a.data.arrayBuffer();
              window.__alle.push({ name: a.filename, bytes: Array.from(new Uint8Array(puffer)) });
              return { status: 'saved' };
            }
          }
  };
});
await seite.click('#output-sichern');
await seite.waitForFunction(() => (window.__alle || []).length >= 2, null, { timeout: 240000 });
const alle = await seite.evaluate(() => window.__alle);
for (const d of alle) {
  writeFileSync(join(ziel, d.name), Buffer.from(d.bytes));
  console.log(`Gesichert: ${d.name} (${(d.bytes.length / 1024).toFixed(0)} kB)`);
}

if (fehler.length) console.log('FEHLER in der Seite:', fehler.join(' | '));
else console.log('Keine Fehler in der Seite.');
await browser.close();
