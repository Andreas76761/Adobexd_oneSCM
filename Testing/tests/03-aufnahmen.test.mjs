/** Prueft die erzeugten Bildschirmaufnahmen (data/screens). */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { zeichneScreen } from '../../data/generator/screens.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const screens = join(wurzel, 'data', 'screens');
const daten = JSON.parse(readFileSync(join(wurzel, 'data', 'eintraege.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(screens, 'manifest.json'), 'utf8'));
const viewports = Object.fromEntries(daten.vokabular.viewports.map((v) => [v.id, v]));
const lies = (name) => readFileSync(join(screens, name), 'utf8');

const s = suite('Aufnahmen');

s.test('zu jedem Beleg liegen Vorher und Nachher vor', () => {
  gleich(manifest.anzahl, daten.eintraege.length * 2, 'Anzahl der Aufnahmen passt nicht zum Bestand');
  const dateien = new Set(readdirSync(screens).filter((d) => d.endsWith('.svg')));
  for (const e of daten.eintraege) {
    for (const variante of ['vorher', 'nachher']) {
      wahr(dateien.has(`${e.id}-${variante}.svg`), `${e.id}: Aufnahme "${variante}" fehlt`);
    }
  }
  gleich(dateien.size, manifest.anzahl, 'im Ordner liegen mehr oder weniger Dateien als im Manifest');
});

s.test('jede Aufnahme ist wohlgeformtes SVG mit Titel', () => {
  for (const a of manifest.aufnahmen) {
    const svg = lies(a.datei);
    wahr(svg.startsWith('<svg '), `${a.datei}: beginnt nicht mit <svg`);
    wahr(svg.trimEnd().endsWith('</svg>'), `${a.datei}: endet nicht mit </svg>`);
    wahr(/<title>[^<]+<\/title>/.test(svg), `${a.datei}: ohne <title> für Screenreader`);
    wahr(/role="img"/.test(svg) && /aria-label="/.test(svg), `${a.datei}: ohne Bildrolle oder Beschriftung`);
    const offen = (svg.match(/<(rect|text|line|circle|path)\b/g) || []).length;
    wahr(offen > 20, `${a.datei}: verdächtig wenig Inhalt (${offen} Elemente)`);
  }
});

s.test('Maße stimmen mit dem Aufnahmeformat überein', () => {
  for (const a of manifest.aufnahmen) {
    const e = daten.eintraege.find((x) => x.id === a.eintrag);
    const v = viewports[e.viewport];
    const svg = lies(a.datei);
    wahr(svg.includes(`viewBox="0 0 ${v.breite} ${v.hoehe}"`), `${a.datei}: viewBox passt nicht zu ${v.label}`);
    gleich(a.breite, v.breite, `${a.datei}: Breite im Manifest falsch`);
  }
});

s.test('keine kaputten Werte im Markup', () => {
  for (const a of manifest.aufnahmen) {
    const svg = lies(a.datei);
    for (const gift of ['NaN', 'undefined', 'null"', 'Infinity']) {
      wahr(!svg.includes(gift), `${a.datei}: enthält "${gift}"`);
    }
  }
});

s.test('keine externen Verweise und keine kollidierenden IDs', () => {
  for (const a of manifest.aufnahmen) {
    // Die Namensraum-Angabe ist kein Abruf und darf stehen bleiben.
    const svg = lies(a.datei).replace(/xmlns(:\w+)?="[^"]*"/g, '');
    wahr(!/https?:\/\//.test(svg), `${a.datei}: verweist nach außen – im Artifact blockiert die CSP das`);
    wahr(!/xlink:href|<image\b|<use\b/.test(svg), `${a.datei}: nutzt eingebundene Ressourcen`);
    wahr(!/\sid="/.test(svg), `${a.datei}: vergibt IDs – 40 Aufnahmen in einer Seite würden kollidieren`);
  }
});

s.test('Vorher und Nachher unterscheiden sich sichtbar', () => {
  for (const e of daten.eintraege) {
    const v = lies(`${e.id}-vorher.svg`);
    const n = lies(`${e.id}-nachher.svg`);
    wahr(v !== n, `${e.id}: beide Aufnahmen sind identisch`);
    const abstand = Math.abs(v.length - n.length) + (v.slice(0, 4000) === n.slice(0, 4000) ? 0 : 1000);
    wahr(abstand > 40, `${e.id}: Unterschied ist zu geringfügig, um im Vergleich sichtbar zu sein`);
  }
});

s.test('Erzeugung ist wiederholbar (deterministisch)', () => {
  for (const e of daten.eintraege.slice(0, 6)) {
    for (const variante of ['vorher', 'nachher']) {
      const frisch = zeichneScreen(e, variante, viewports[e.viewport]);
      gleich(frisch, lies(`${e.id}-${variante}.svg`), `${e.id}-${variante}: erneute Erzeugung weicht ab`);
    }
  }
});

s.test('Gesamtgröße bleibt für eine einzelne Seite tragbar', () => {
  const summe = manifest.aufnahmen.reduce((a, x) => a + x.bytes, 0);
  wahr(summe < 4 * 1024 * 1024, `Aufnahmen belegen ${(summe / 1024 / 1024).toFixed(1)} MB`);
});

export default s;
