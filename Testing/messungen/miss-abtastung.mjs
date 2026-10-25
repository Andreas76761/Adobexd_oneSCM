/**
 * Misst die Abtastung des Registers Video gegen einen Film mit bekannter
 * Wahrheit (`erzeuge-film.mjs`). Beantwortet die Frage, die bis 1.62.0
 * offen war: **sind die Voreinstellungen geraten oder gemessen?**
 *
 *   node Testing/messungen/miss-abtastung.mjs <ordner mit film.webm>
 *
 * Gewertet wird je Einstellung:
 *   gefunden  – echte Änderungen, zu denen ein Bild in der Nähe liegt
 *   verpasst  – echte Änderungen ohne Bild
 *   zusätzlich – Bilder, die zu keiner echten Änderung gehören (Mauszeiger)
 */
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const ordner = process.argv[2] || join(hier, 'ausgabe');
const wahrheit = JSON.parse(readFileSync(join(ordner, 'wahrheit.json'), 'utf8'));
const film = readFileSync(join(ordner, 'film.webm'));

// Ein Bild zählt als Treffer, wenn es höchstens so weit nach einer echten
// Änderung liegt. Davor zählt es nicht: dann zeigt es den alten Stand.
const FENSTER = 0.9;

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;

const einstellungen = [];
for (const anzahl of [12, 24, 48, 96]) {
  for (const anteil of [0.001, 0.002, 0.005, 0.02]) einstellungen.push({ anzahl, anteil });
}

console.log(`Film: ${wahrheit.dauer}s, ${wahrheit.aenderungen.length} echte Änderungen`);
console.log('');
console.log('Stellen  Schwelle   Bilder  gefunden  verpasst  zusätzlich');
console.log('-'.repeat(60));

const zeilen = [];
for (const { anzahl, anteil } of einstellungen) {
  const kontext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const seite = await kontext.newPage();
  await seite.goto(adresse + '#ans=video');
  await seite.waitForSelector('#video-ansicht:not([hidden])');
  await seite.evaluate((bytes) => {
    const datei = new File([new Uint8Array(bytes)], 'Messung.webm', { type: 'video/webm' });
    const traeger = new DataTransfer();
    traeger.items.add(datei);
    const eingabe = document.getElementById('video-eingabe');
    eingabe.files = traeger.files;
    eingabe.dispatchEvent(new Event('change', { bubbles: true }));
  }, [...film]);
  await seite.waitForFunction(() => !document.getElementById('video-leiste').hidden, null, { timeout: 30000 });

  await seite.selectOption('#video-dichte', String(anzahl));
  await seite.selectOption('#video-schwelle', String(anteil));
  await seite.selectOption('#video-hoechstens', '0');
  await seite.click('#video-automatisch');
  await seite.waitForFunction(() => !document.getElementById('video-automatisch').disabled, null, { timeout: 180000 });
  await seite.waitForTimeout(300);

  const zeiten = await seite.evaluate(() =>
    [...document.querySelectorAll('.video-figur-kopf label')].map((e) => {
      const [m, s] = e.textContent.trim().split(':');
      return Number(m) * 60 + Number(String(s).replace(',', '.'));
    })
  );
  await kontext.close();

  const getroffen = wahrheit.aenderungen.filter((a) => zeiten.some((z) => z >= a.zeit && z - a.zeit <= FENSTER));
  const zusatz = zeiten.filter((z) => !wahrheit.aenderungen.some((a) => z >= a.zeit && z - a.zeit <= FENSTER));
  const zeile = {
    anzahl,
    anteil,
    bilder: zeiten.length,
    gefunden: getroffen.length,
    verpasst: wahrheit.aenderungen.length - getroffen.length,
    zusatz: zusatz.length
  };
  zeilen.push(zeile);
  console.log(
    `${String(anzahl).padStart(7)}  ${String(anteil * 100 + ' %').padStart(8)}  ${String(zeile.bilder).padStart(6)}  ` +
      `${String(zeile.gefunden).padStart(8)}  ${String(zeile.verpasst).padStart(8)}  ${String(zeile.zusatz).padStart(10)}`
  );
}
await browser.close();

console.log('');
const brauchbar = zeilen.filter((z) => z.verpasst === 0).sort((a, b) => a.bilder - b.bilder);
if (brauchbar.length) {
  const b = brauchbar[0];
  console.log(`Sparsamste Einstellung ohne Verlust: ${b.anzahl} Stellen, ${b.anteil * 100} % – ${b.bilder} Bilder, ${b.zusatz} zusätzlich.`);
} else {
  const besser = [...zeilen].sort((a, b) => a.verpasst - b.verpasst || a.bilder - b.bilder)[0];
  console.log(`Keine Einstellung findet alles. Am nächsten: ${besser.anzahl} Stellen, ${besser.anteil * 100} % – ${besser.verpasst} verpasst.`);
}
