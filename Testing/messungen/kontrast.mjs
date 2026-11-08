/**
 * Der Kontrast jedes sichtbaren Textes – hell und dunkel, alle Ansichten.
 *
 * Es gibt eine Kontrastprüfung seit 1.0, und sie ist nicht falsch: sie
 * sieht den Grund der Seite gegen die Schrift an, und eine Überschrift
 * einer Karte. Zwei Stellen. Die Frage gilt aber allen.
 *
 * Gemessen wird nach WCAG 2.1: **4,5:1** für gewöhnlichen Text, **3:1**
 * für großen (ab 24 px, oder ab 18,66 px fett). Das ist keine Geschmacks-
 * frage, sondern eine Zahl.
 *
 *   node Testing/messungen/kontrast.mjs [--alle]
 *
 * `--alle` nennt jeden Befund statt der schlimmsten je Ansicht.
 */
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const alle = process.argv.includes('--alle');

const ANSICHTEN = [
  ['archiv', 'Archiv'], ['aufnahme', 'Aufnahme'], ['import', 'Import'], ['video', 'Video'],
  ['ausschneiden', 'Ausschneiden'], ['markieren', 'Editor'], ['strecke', 'Strecke'], ['ocr', 'OCR'],
  ['gliederung', 'Gliederung'], ['pruefung', 'Prüfung'], ['design', 'Design'],
  ['output', 'Output'], ['verzeichnis', 'Verzeichnis'], ['eingang', 'Eingang']
];

/** Läuft im Browser: misst jeden sichtbaren Text gegen seinen Grund. */
const MESSUNG = () => {
  const zahlen = (rgb) => (String(rgb).match(/[\d.]+/g) || []).map(Number);
  const leuchte = ([r, g, b]) =>
    0.2126 * [r, g, b].map((k) => (k / 255 <= 0.03928 ? k / 255 / 12.92 : Math.pow((k / 255 + 0.055) / 1.055, 2.4)))[0] +
    0.7152 * [r, g, b].map((k) => (k / 255 <= 0.03928 ? k / 255 / 12.92 : Math.pow((k / 255 + 0.055) / 1.055, 2.4)))[1] +
    0.0722 * [r, g, b].map((k) => (k / 255 <= 0.03928 ? k / 255 / 12.92 : Math.pow((k / 255 + 0.055) / 1.055, 2.4)))[2];

  /** Der Grund hinter einem Element: der erste Vorfahr, der deckt. */
  const grundVon = (el) => {
    for (let k = el; k && k !== document.documentElement; k = k.parentElement) {
      const f = zahlen(getComputedStyle(k).backgroundColor);
      if (f.length >= 3 && (f[3] === undefined || f[3] >= 0.95)) return f.slice(0, 3);
    }
    const f = zahlen(getComputedStyle(document.body).backgroundColor);
    return f.length >= 3 ? f.slice(0, 3) : [255, 255, 255];
  };

  const befunde = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.offsetParent) continue;
    // Nur Elemente mit eigenem Text, nicht die Hüllen darum.
    const eigen = [...el.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim());
    if (!eigen) continue;
    const stil = getComputedStyle(el);
    if (stil.visibility === 'hidden' || Number(stil.opacity) < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const vorn = zahlen(stil.color).slice(0, 3);
    if (vorn.length < 3) continue;
    const hell = leuchte(vorn);
    const dunkel = leuchte(grundVon(el));
    const verhaeltnis = (Math.max(hell, dunkel) + 0.05) / (Math.min(hell, dunkel) + 0.05);
    const groesse = parseFloat(stil.fontSize);
    const fett = Number(stil.fontWeight) >= 700;
    const grenze = groesse >= 24 || (fett && groesse >= 18.66) ? 3 : 4.5;
    if (verhaeltnis + 0.05 < grenze) {
      befunde.push({
        was: el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 34),
        ist: Number(verhaeltnis.toFixed(2)),
        soll: grenze,
        px: Math.round(groesse)
      });
    }
  }
  return befunde;
};

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;

for (const thema of ['light', 'dark']) {
  const kontext = await browser.newContext({ viewport: { width: 1480, height: 1000 }, colorScheme: thema });
  const seite = await kontext.newPage();
  await seite.goto(adresse);
  await seite.waitForSelector('.portal-nav');
  await seite.waitForTimeout(900);
  console.log(`\n=== ${thema === 'light' ? 'hell' : 'dunkel'} ===`);
  let gesamt = 0;
  for (const [kennung, name] of ANSICHTEN) {
    await seite.click(`.portal-nav button[data-ansicht="${kennung}"]`);
    await seite.waitForTimeout(300);
    const befunde = await seite.evaluate(MESSUNG);
    gesamt += befunde.length;
    if (!befunde.length) {
      console.log(`${name.padEnd(13)} –`);
      continue;
    }
    befunde.sort((a, b) => a.ist - b.ist);
    const zeigen = alle ? befunde : befunde.slice(0, 3);
    console.log(`${name.padEnd(13)} ${befunde.length} unter der Grenze`);
    for (const b of zeigen) {
      console.log(`   ${String(b.ist).padStart(5)}:1 (soll ${b.soll}) ${b.px}px  ${b.was.padEnd(24)} ${b.text}`);
    }
  }
  console.log(`Zusammen: ${gesamt}`);
  await kontext.close();
}
await browser.close();
