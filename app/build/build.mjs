#!/usr/bin/env node
/**
 * Build: setzt aus Daten, Aufnahmen, Kernlogik, Stil und Oberflaeche eine
 * einzelne HTML-Datei zusammen (dist/index.html) - genau das, was das
 * Artifact-Werkzeug veroeffentlicht.
 *
 * Aufruf: npm run build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..', '..');
const lies = (...teile) => readFileSync(join(wurzel, ...teile), 'utf8');

const daten = JSON.parse(lies('data', 'eintraege.json'));
const paket = JSON.parse(lies('package.json'));
const manifest = JSON.parse(lies('data', 'screens', 'manifest.json'));

/* Aufnahmen einsammeln und dem jeweiligen Beleg zuordnen. */
const aufnahmen = {};
for (const a of manifest.aufnahmen) {
  aufnahmen[a.eintrag] = aufnahmen[a.eintrag] || {};
  // Im HTML erhaelt <svg> den Namensraum automatisch; die Angabe entfaellt,
  // damit in der Seite keine externen Adressen stehen.
  aufnahmen[a.eintrag][a.variante] = lies('data', 'screens', a.datei).replace(/ xmlns="[^"]*"/g, '');
}
for (const e of daten.eintraege) {
  const paar = aufnahmen[e.id];
  if (!paar || !paar.vorher || !paar.nachher) {
    throw new Error(`${e.id}: Aufnahme fehlt. Zuerst "npm run screens" ausführen.`);
  }
}

/* Kernlogik einbetten: die export-Schluesselwoerter entfallen, damit die
   Funktionen im selben <script>-Bereich wie die Oberflaeche liegen. */
const kern = lies('app', 'src', 'core.mjs').replace(/^export\s+(const|function|let|class)\b/gm, '$1');
if (/\bexport\b/.test(kern)) throw new Error('core.mjs enthält eine nicht entfernte export-Anweisung.');

const nutzlast = {
  stand: daten.stand,
  version: daten.version,
  vokabular: daten.vokabular,
  eintraege: daten.eintraege,
  aufnahmen
};

/* JSON sicher in ein <script>-Element legen. */
const alsSkript = JSON.stringify(nutzlast)
  .replace(/<\//g, '<\\/')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const seite = lies('app', 'src', 'index.template.html')
  .replace('/*%STYLES%*/', () => lies('app', 'src', 'styles.css'))
  .replace('/*%KERN%*/', () => kern)
  .replace('/*%DATEN%*/', () => `const DATEN = ${alsSkript};`)
  .replace('/*%UI%*/', () => lies('app', 'src', 'ui.js'))
  .replace('/*%AUFNAHME%*/', () => lies('app', 'src', 'aufnahme.js'))
  .replace('/*%SCHNIPSEL%*/', () => lies('app', 'src', 'schnipsel.js'))
  .replace('/*%STAND%*/', daten.stand.split('-').reverse().join('.'))
  .replace('/*%ANZAHL%*/', String(daten.eintraege.length))
  .replace('/*%AUFNAHMEN%*/', String(manifest.anzahl))
  .replace('/*%VERSION%*/', paket.version);

for (const platzhalter of seite.match(/\/\*%[A-Z]+%\*\//g) || []) {
  throw new Error(`Platzhalter nicht ersetzt: ${platzhalter}`);
}

mkdirSync(join(wurzel, 'dist'), { recursive: true });
writeFileSync(join(wurzel, 'dist', 'index.html'), seite, 'utf8');

const kb = (Buffer.byteLength(seite) / 1024).toFixed(0);
console.log(`dist/index.html geschrieben – ${kb} kB, ${daten.eintraege.length} Belege, ${manifest.anzahl} Aufnahmen`);
