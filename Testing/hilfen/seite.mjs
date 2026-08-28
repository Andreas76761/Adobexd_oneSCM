/**
 * Baut aus dist/index.html eine vollstaendige HTML-Datei - dieselbe Huelle,
 * die das Artifact-Werkzeug beim Veroeffentlichen ergaenzt. Damit testet die
 * E2E-Pruefung genau das, was spaeter ausgeliefert wird.
 */
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export function baueVorschau(seitenPfad) {
  const inhalt = readFileSync(seitenPfad, 'utf8');
  const ordner = mkdtempSync(join(tmpdir(), 'screenarchiv-'));
  const ziel = join(ordner, 'vorschau.html');
  writeFileSync(
    ziel,
    '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>*{margin:0}</style></head><body>' +
      inhalt +
      '</body></html>',
    'utf8'
  );
  return ziel;
}

/** Sucht den vorinstallierten Chromium-Start (Revision kann wechseln). */
export function findeChromium() {
  if (process.env.CHROMIUM_PFAD) return process.env.CHROMIUM_PFAD;
  const basis = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const kandidaten = readdirSync(basis)
      .filter((n) => n.startsWith('chromium-'))
      .sort()
      .reverse()
      .map((n) => join(basis, n, 'chrome-linux', 'chrome'));
    return kandidaten.find((p) => existsSync(p)) || null;
  } catch (fehler) {
    return null;
  }
}
