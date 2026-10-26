/**
 * Der Rückweg aus Word (F-65) am echten Umlauf: eine Datei, die die Seite
 * selbst geschrieben hat, **unverändert** wieder hineingeben.
 *
 * Das ist die ehrlichste Probe, die es dafür gibt. Wer nichts ändert, darf
 * keine Änderung angeboten bekommen - sonst weiß beim nächsten Mal niemand
 * mehr, welche der Zeilen in der Liste von Hand geschrieben wurde.
 *
 * Mit `--aendern` wird vorher **eine** Stelle geändert, wie es jemand in
 * Word täte. Dann muss genau diese eine in der Liste stehen - eine Probe,
 * die nur bestanden ist, wenn beide Hälften stimmen.
 *
 *   node Testing/messungen/rueckweg.mjs <handbuch.docx> [--aendern]
 */
import { pathToFileURL } from 'node:url';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const datei = process.argv[2];
if (!datei) {
  console.error('Aufruf: node Testing/messungen/rueckweg.mjs <handbuch.docx> [--aendern]');
  process.exit(1);
}
const aendern = process.argv.includes('--aendern');
const ziel = dirname(datei);
mkdirSync(ziel, { recursive: true });
let bytes = new Uint8Array(readFileSync(datei));

/**
 * Ändert im Dokument das erste Kriterium – so, wie es jemand in Word täte.
 * Gepackt und entpackt wird mit den Werkzeugen der Seite selbst: hier liegt
 * keine fremde Bibliothek, und für diese Probe braucht es auch keine.
 */
const NEUES_KRITERIUM = 'Die Unterschrift ist im Protokoll vermerkt.';
if (aendern) {
  const kern = await import('../../app/src/core.mjs');
  const verzeichnis = kern.leseZipVerzeichnis(bytes);
  const dateien = [];
  let getroffen = false;
  for (const eintrag of verzeichnis) {
    let daten = await kern.entpackeZipEintrag(bytes, eintrag);
    if (daten === null) {
      console.error(`Eintrag ${eintrag.name} ließ sich nicht entpacken.`);
      process.exit(1);
    }
    if (eintrag.name === 'word/document.xml') {
      const xml = new TextDecoder().decode(daten);
      const treffer = xml.match(/(Fertig, wenn: )([^<]{10,})/);
      if (!treffer) {
        console.error('Kein Kriterium gefunden – stammt die Datei aus dem Handbuch-Export?');
        process.exit(1);
      }
      daten = new TextEncoder().encode(xml.replace(treffer[0], treffer[1] + NEUES_KRITERIUM));
      getroffen = true;
    }
    dateien.push({ name: eintrag.name, daten });
  }
  if (!getroffen) {
    console.error('word/document.xml fehlt – das ist keine Word-Datei.');
    process.exit(1);
  }
  bytes = kern.zipSchreiben(dateien);
  console.log(`Geändert wie in Word: erstes Kriterium -> „${NEUES_KRITERIUM}"\n`);
}

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const kontext = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const seite = await kontext.newPage();
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));

const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;
await seite.goto(adresse + '#ans=gliederung');
await seite.waitForSelector('#gliederung-ansicht:not([hidden])');

await seite.evaluate((roh) => {
  const f = new File([new Uint8Array(roh)], 'handbuch.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  const t = new DataTransfer();
  t.items.add(f);
  const e = document.getElementById('ruecklauf-datei');
  e.files = t.files;
  e.dispatchEvent(new Event('change', { bubbles: true }));
}, [...bytes]);
await seite.waitForFunction(
  () => /Stelle|gelesen|keine|Fehler/i.test(document.getElementById('ruecklauf-meldung').textContent),
  null,
  { timeout: 60000 }
);
await seite.waitForTimeout(400);

console.log('Meldung:', (await seite.locator('#ruecklauf-meldung').innerText()).trim());
const zeilen = await seite.locator('.ruecklauf-zeile').evaluateAll((liste) =>
  liste.map((z) => ({
    art: [...z.classList].find((k) => k.startsWith('ruecklauf-zeile--')).replace('ruecklauf-zeile--', ''),
    kopf: (z.querySelector('.ruecklauf-kopf') || {}).textContent?.trim().slice(0, 70) || '',
    alt: (z.querySelector('.ruecklauf-alt') || {}).textContent?.trim().slice(0, 70) || '(leer)',
    neu: (z.querySelector('.ruecklauf-neu') || {}).textContent?.trim().slice(0, 70) || ''
  }))
);
const zahl = (art) => zeilen.filter((z) => z.art === art).length;
console.log(`\nGelesen: ${zeilen.length} Stellen – ${zahl('geaendert')} geändert, ${zahl('gleich')} gleich, ${zahl('unbekannt')} unbekannt`);
console.log(`Angekreuzt: ${await seite.locator('.ruecklauf-kopf input:checked').count()}`);
for (const z of zeilen.slice(0, 4)) {
  console.log(`\n[${z.art}] ${z.kopf}`);
  console.log(`   alt: ${z.alt}`);
  console.log(`   neu: ${z.neu}`);
}

if (aendern) {
  const treffer = zeilen.filter((z) => z.art === 'geaendert');
  const trifftZu = treffer.length === 1 && treffer[0].neu.startsWith(NEUES_KRITERIUM.slice(0, 40));
  console.log(
    `\nErwartet nach einer Änderung: genau 1 geändert, und zwar das Kriterium.`,
    trifftZu ? 'ERFÜLLT' : `NICHT ERFÜLLT – ${treffer.length} angeboten`
  );
  for (const t of treffer) console.log(`   ${t.kopf}  ->  ${t.neu}`);
} else {
  console.log(
    '\nErwartet beim unveränderten Umlauf: 0 geändert.',
    zahl('geaendert') === 0 ? 'ERFÜLLT' : `NICHT ERFÜLLT – ${zahl('geaendert')} angeboten`
  );
}

if (fehler.length) console.log('FEHLER in der Seite:', fehler.join(' | '));
await browser.close();
