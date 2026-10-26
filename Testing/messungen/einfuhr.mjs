/**
 * Der Umlauf durch den Import: eine Office-Datei, die die Seite selbst
 * geschrieben hat, über das Register Import wieder hineingeben.
 *
 * Dieselbe Frage wie beim Rückweg aus Word (F-65), nur für Bilder: was der
 * Schreiber schreibt, muss der Leser wiederfinden. Geprüft wird, wie viele
 * Bilder ankommen, welchen Text sie tragen und ob „Stelle aus dem Text"
 * daraus etwas machen kann.
 *
 *   node Testing/messungen/einfuhr.mjs <datei.docx|.pptx> [weitere …]
 */
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const dateien = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!dateien.length) {
  console.error('Aufruf: node Testing/messungen/einfuhr.mjs <datei.docx|.pptx> [weitere …]');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const kontext = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const seite = await kontext.newPage();
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;

for (const pfad of dateien) {
  const bytes = readFileSync(pfad);
  const name = basename(pfad);
  // Jede Datei für sich: der Eingang des Registers überdauert das Neuladen.
  await seite.goto(adresse + '#ans=import');
  await seite.waitForSelector('#import-ansicht:not([hidden])');
  if (await seite.locator('.import-figur').count()) {
    await seite.click('#import-leeren');
    await seite.waitForTimeout(300);
  }
  await seite.evaluate(
    ([roh, dateiname]) => {
      const f = new File([new Uint8Array(roh)], dateiname);
      const t = new DataTransfer();
      t.items.add(f);
      const e = document.getElementById('import-eingabe');
      e.files = t.files;
      e.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [[...bytes], name]
  );
  // Erst wenn die Meldung fertig ist – „wird gelesen …" zählt nicht.
  await seite.waitForFunction(
    () => /gelesen\.|kein|nicht/i.test(document.getElementById('import-meldung').textContent),
    null,
    { timeout: 180000 }
  );
  await seite.waitForTimeout(800);

  const anzahl = await seite.locator('.import-figur').count();
  console.log(`\n=== ${name} (${(bytes.length / 1024).toFixed(0)} kB) ===`);
  console.log('Meldung:', (await seite.locator('#import-meldung').innerText()).trim().split('\n')[0]);
  console.log(`Bilder: ${anzahl}`);

  // Der Text, den jedes Bild mitbekommen hat – daraus soll die Stelle kommen.
  // Der Träger ist, was `stapelAusText` liest: Titel, Folienname, Notiz.
  const traeger = await seite.locator('.import-figur').evaluateAll((liste) =>
    liste.map((f) => (f.querySelector('.import-figur-kopf') || {}).textContent?.trim() || '')
  );
  const notizen = await seite.locator('.import-figur').evaluateAll((liste) =>
    liste.map((f) => {
      const bild = f.querySelector('figcaption');
      const rezept = f.querySelector('textarea[id^="notiz-"]');
      return `${bild ? bild.textContent.split('·').pop().trim() : '-'} :: ${(rezept ? rezept.value : '').slice(0, 70)}`;
    })
  );
  const eindeutig = [...new Set(notizen)];
  console.log(`Verschiedene Folientexte: ${eindeutig.length} von ${notizen.length}`);
  for (const n of eindeutig.slice(0, 3)) console.log('   ' + n);
  const verschieden = new Set(traeger);
  console.log(`Verschiedene Träger: ${verschieden.size} (${[...verschieden].slice(0, 4).map((t) => t.slice(0, 40)).join(' | ')})`);

  // „Stelle aus dem Text" über alle Bilder.
  await seite.evaluate(() => (document.getElementById('import-stapel').open = true));
  await seite.waitForTimeout(200);
  await seite.click('#stapel-alle');
  await seite.waitForTimeout(300);
  const knopf = seite.locator('#stapel-aus-text');
  if (await knopf.count()) {
    await knopf.click();
    await seite.waitForTimeout(500);
    console.log('Stelle aus dem Text:', (await seite.locator('#import-meldung').innerText()).trim().split('\n')[0]);
  } else {
    console.log('Stelle aus dem Text: Knopf nicht gefunden.');
  }
  const stellen = await seite.locator('.import-figur').evaluateAll((liste) =>
    liste.map((f) => (f.querySelector('input[id^="stelle-"]') || {}).value || '')
  );
  const gefuellt = stellen.filter(Boolean);
  console.log(`Stellen gesetzt: ${gefuellt.length} von ${anzahl}`);
  console.log(`Verschiedene Stellen: ${new Set(gefuellt).size} (${[...new Set(gefuellt)].slice(0, 6).join(', ')})`);
}

if (fehler.length) console.log('\nFEHLER in der Seite:', fehler.join(' | '));
else console.log('\nKeine Fehler in der Seite.');
await browser.close();
