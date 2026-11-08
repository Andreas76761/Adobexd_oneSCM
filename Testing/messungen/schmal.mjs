/**
 * Was die Seite auf einem schmalen Bildschirm tut.
 *
 * Die Stilvorlage hat vierundzwanzig Medienabfragen, die kleinste bei
 * 700 px. Angesehen hat die Seite dort nie jemand: jede Prüfung und jede
 * Messung lief bisher bei 1400 bis 1500 px Breite.
 *
 * Gemessen wird das, was sich messen lässt und nicht Geschmack ist:
 *
 *   - **Querscrollen**: ist die Seite breiter als das Fenster? Dann muss
 *     man waagerecht schieben, um Text zu lesen – der härteste Mangel.
 *   - **Überläufer**: welches Element ragt hinaus, und wie weit?
 *   - **Trefferflächen**: Knöpfe unter 24 px Höhe trifft ein Daumen nicht.
 *
 *   node Testing/messungen/schmal.mjs [breite …]
 */
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const breiten = process.argv.slice(2).map(Number).filter(Boolean);
const MASSE = breiten.length ? breiten : [390, 768];

const ANSICHTEN = [
  ['archiv', 'Archiv'], ['aufnahme', 'Aufnahme'], ['import', 'Import'], ['video', 'Video'],
  ['ausschneiden', 'Ausschneiden'], ['markieren', 'Editor'], ['strecke', 'Strecke'], ['ocr', 'OCR'],
  ['gliederung', 'Gliederung'], ['pruefung', 'Prüfung'], ['design', 'Design'],
  ['output', 'Output'], ['verzeichnis', 'Verzeichnis'], ['eingang', 'Eingang']
];

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;

for (const breite of MASSE) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: 900 }, deviceScaleFactor: 2 });
  const seite = await kontext.newPage();
  await seite.goto(adresse);
  await seite.waitForSelector('.portal-nav');
  await seite.waitForTimeout(900);
  console.log(`\n=== ${breite} px ===`);
  for (const [kennung, name] of ANSICHTEN) {
    await seite.click(`.portal-nav button[data-ansicht="${kennung}"]`);
    await seite.waitForTimeout(350);
    const befund = await seite.evaluate((fensterbreite) => {
      const doc = document.documentElement;
      const ueber = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.offsetParent && el !== document.body) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const hinaus = Math.round(r.right - fensterbreite);
        if (hinaus > 1) {
          ueber.push({
            was: el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase(),
            hinaus
          });
        }
      }
      // Nur der äußerste Überläufer je Kette – die Kinder erben ihn.
      ueber.sort((a, b) => b.hinaus - a.hinaus);
      const knoepfe = [...document.querySelectorAll('button, a.knopf, input[type="checkbox"]')]
        .filter((b) => b.offsetParent)
        .map((b) => b.getBoundingClientRect().height)
        .filter((h) => h > 0 && h < 24).length;
      return { quer: Math.round(doc.scrollWidth - fensterbreite), ueber: ueber.slice(0, 3), klein: knoepfe };
    }, breite);
    const zeile =
      `${name.padEnd(13)} quer: ${String(befund.quer).padStart(4)} px` +
      `  kleine Knöpfe: ${String(befund.klein).padStart(3)}` +
      (befund.ueber.length ? `  → ${befund.ueber.map((u) => `${u.was} +${u.hinaus}`).join(', ')}` : '');
    console.log(zeile);
  }
  await kontext.close();
}
await browser.close();
