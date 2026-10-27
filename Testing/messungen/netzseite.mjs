/**
 * Die HTML-Ausgaben an echtem Bildschirminhalt – angesehen, nicht gezählt.
 *
 * Zwei gibt es: das **ganze Handbuch** aus dem Designstudio (F-55) und das
 * Format **HTML** im Register Output (F-56). Beide sind Dateien, die
 * jemand doppelklickt. Die Fragen dazu sind andere als bei PDF:
 *
 *   - Öffnet sie sich **ohne Netz**? Eine Seite, die eine Schrift oder ein
 *     Bild nachlädt, ist im Haus hinter der Firewall leer.
 *   - Steht alles drin, was im PDF steht?
 *   - Lässt sie sich drucken, ohne dass ein Blatt zerfällt?
 *
 *   node Testing/messungen/netzseite.mjs <ordner mit film.webm> [zielordner]
 */
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';
import { DOWNLOAD_NACHBAU, leseMessfilm, bestandAusFilm, sichereDurchKnopf } from './hilfen.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const ordner = process.argv[2] || join(hier, 'ausgabe');
const ziel = process.argv[3] || ordner;
mkdirSync(ziel, { recursive: true });
const { film, wahrheit } = leseMessfilm(ordner);

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const kontext = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
await kontext.addInitScript(DOWNLOAD_NACHBAU);
const seite = await kontext.newPage();
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));

const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;
const anzahl = await bestandAusFilm(seite, adresse, { film, wahrheit });
console.log(`Bestand: ${anzahl} Bilder, Stellen 7.5.1 aufwärts`);

// Der Kontaktbogen (F-23): alle Aufnahmen auf einem Blatt, als eine Datei.
// Die Durchsicht hat seine **Größe** in Verdacht - also gemessen.
await seite.click('.portal-nav button[data-ansicht="eingang"]');
await seite.waitForSelector('#eingang-ansicht:not([hidden])');
await seite.waitForTimeout(600);
const bogen = await sichereDurchKnopf(seite, '#eingang-kontaktbogen', ziel, 'kontaktbogen.html');

await seite.click('.portal-nav button[data-ansicht="design"]');
await seite.waitForSelector('#design-ansicht:not([hidden])');
await seite.waitForTimeout(600);
await seite.evaluate(() => (document.getElementById('design-studio').open = true));
await seite.waitForTimeout(300);
const handbuch = await sichereDurchKnopf(seite, '#handbuch-sichern', ziel, 'handbuch.html');
// Das dritte HTML: die gerechneten Blätter zum Drucken. Dafür muss eine
// Quelle gewählt sein - die Blätter rechnen sich daraufhin von selbst.
const quelle = await seite.locator('#design-quelle option').evaluateAll((o) => {
  const t = o.map((e) => e.value);
  return t.find((w) => w.startsWith('strecke:')) || t.find(Boolean) || '';
});
await seite.selectOption('#design-quelle', quelle);
await seite.waitForFunction(() => !document.getElementById('design-html').disabled, null, { timeout: 180000 });
const blaetter = await sichereDurchKnopf(seite, '#design-html', ziel, 'blaetter.html');

// Dieselben Blätter als HTML über das Register Output.
await seite.click('.portal-nav button[data-ansicht="output"]');
await seite.waitForSelector('#output-ansicht:not([hidden])');
await seite.waitForTimeout(600);
async function hake(kennung, soll) {
  const feld = seite.locator('#' + kennung);
  if ((await feld.isChecked()) !== soll) {
    await feld.click();
    await seite.waitForTimeout(250);
  }
}
for (const [k, soll] of [
  ['output-vorlagen-quickguide', false],
  ['output-vorlagen-ablauf', true],
  ['output-formate-pdf', false],
  ['output-formate-html', true]
]) {
  await hake(k, soll);
}
const streckenWert = await seite.locator('#output-inhalte option').evaluateAll((o) => {
  const t = o.map((e) => ({ wert: e.value }));
  return (t.find((e) => e.wert.startsWith('strecke:')) || t[0] || {}).wert;
});
await seite.selectOption('#output-inhalte', [streckenWert]);
await seite.waitForTimeout(600);
await seite.click('#output-erzeugen');
await seite.waitForFunction(() => !document.getElementById('output-sichern').disabled, null, { timeout: 240000 });
const blatt = await sichereDurchKnopf(seite, '#output-sichern', ziel, 'ablauf.html', 240000);

/* ------------------------------------------------- Die Dateien ansehen */

/** Öffnet eine Datei ohne Netz und sagt, was sie von draußen holen will. */
async function pruefe(pfad, name) {
  const draussen = [];
  const schau = await kontext.newPage();
  const probleme = [];
  schau.on('pageerror', (e) => probleme.push(String(e)));
  // Jede Anfrage, die nicht die Datei selbst ist, wird abgewiesen und
  // genannt: so sieht man, was im Haus hinter der Firewall fehlen würde.
  await schau.route('**/*', (weg) => {
    const url = weg.request().url();
    if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('about:')) return weg.continue();
    draussen.push(url.slice(0, 80));
    return weg.abort();
  });
  await schau.goto(pathToFileURL(pfad).href);
  await schau.waitForTimeout(1500);
  const masse = await schau.evaluate(() => ({
    bilder: document.querySelectorAll('img').length,
    geladen: [...document.querySelectorAll('img')].filter((i) => i.naturalWidth > 0).length,
    text: document.body.innerText.replace(/\s+/g, ' ').trim().length,
    ueberschriften: document.querySelectorAll('h1,h2,h3,h4').length,
    hoehe: document.body.scrollHeight,
    // Die Sprache gehört an das Dokument: eine englische Unterlage mit
    // `lang="de"` wird falsch vorgelesen und falsch getrennt.
    sprache: document.documentElement.lang,
    alt: [...new Set([...document.querySelectorAll('img')].map((i) => i.alt))].join(' | ')
  }));
  console.log(`\n=== ${name} ===`);
  console.log(`Bilder: ${masse.geladen} von ${masse.bilder} geladen · Überschriften: ${masse.ueberschriften} · Text: ${masse.text} Zeichen · Höhe: ${masse.hoehe} px`);
  console.log(`Sprache am Dokument: ${masse.sprache || '(keine)'} · Bildtext: ${masse.alt}`);
  console.log(draussen.length ? `VON DRAUSSEN: ${[...new Set(draussen)].join(', ')}` : 'Nichts von draußen – die Datei steht für sich.');
  if (probleme.length) console.log('Fehler in der Datei:', probleme.join(' | '));
  await schau.screenshot({ path: join(ziel, name.replace('.html', '') + '-schau.png'), fullPage: false });
  await schau.close();
  return masse;
}

await pruefe(bogen, 'kontaktbogen.html');
await pruefe(handbuch, 'handbuch.html');
await pruefe(blaetter, 'blaetter.html');
await pruefe(blatt, 'ablauf.html');

// Dasselbe auf Englisch (F-66): die Sprache muss am Dokument ankommen.
await seite.click('.portal-nav button[data-ansicht="design"]');
await seite.waitForSelector('#design-ansicht:not([hidden])');
await seite.evaluate(() => (document.getElementById('design-studio').open = true));
await seite.waitForTimeout(300);
await seite.selectOption('#design-sprache', 'en');
await seite.waitForTimeout(600);
await seite.evaluate(() => (document.getElementById('design-studio').open = true));
await seite.waitForTimeout(400);
const handbuchEn = await sichereDurchKnopf(seite, '#handbuch-sichern', ziel, 'handbuch-en.html');
await pruefe(handbuchEn, 'handbuch-en.html');

await seite.click('.portal-nav button[data-ansicht="output"]');
await seite.waitForSelector('#output-ansicht:not([hidden])');
await seite.waitForTimeout(600);
// Die Wahl steht noch; nach dem Sprachwechsel muss nur neu gerechnet
// werden. Erst wenn „Dokumente erzeugen" offen ist, gibt es etwas zu tun.
await seite.selectOption('#output-inhalte', [streckenWert]);
await seite.waitForFunction(() => !document.getElementById('output-erzeugen').disabled, null, { timeout: 60000 });
await seite.click('#output-erzeugen');
await seite.waitForFunction(
  () => /Dokument\(e\) gerechnet/.test(document.getElementById('output-meldung').textContent),
  null,
  { timeout: 240000 }
);
const blattEn = await sichereDurchKnopf(seite, '#output-sichern', ziel, 'ablauf-en.html', 240000);
await pruefe(blattEn, 'ablauf-en.html');

if (fehler.length) console.log('\nFEHLER in der Seite:', fehler.join(' | '));
else console.log('\nKeine Fehler in der Seite.');
await browser.close();
