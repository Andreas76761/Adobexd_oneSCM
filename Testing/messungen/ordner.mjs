/**
 * Was das Register Verzeichnis wirklich auf die Platte legt.
 *
 * Die Browserprüfung hält von jeder Datei nur Pfad, Größe und Typ fest –
 * den **Inhalt** hat nie jemand angesehen. Dieser Prüfstand schreibt den
 * Ordner wirklich, in einen echten Zielordner, und zeigt danach den Baum
 * samt Beipackzettel und Übersicht.
 *
 *   node Testing/messungen/ordner.mjs <ordner mit film.webm> [zielordner]
 */
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';
import { leseMessfilm, bestandAusFilm } from './hilfen.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const quelle = process.argv[2] || join(hier, 'ausgabe');
const ziel = process.argv[3] || join(quelle, 'galerie');
rmSync(ziel, { recursive: true, force: true });
mkdirSync(ziel, { recursive: true });
const { film, wahrheit } = leseMessfilm(quelle);

/** Ein Ordner im Browser, der jede Datei mit Inhalt festhält. */
const ordnerNachbau = `
  window.__dateien = [];
  const baueOrdner = (pfad) => ({
    name: pfad.length ? pfad[pfad.length - 1] : 'Galerie',
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getDirectoryHandle: async (name) => baueOrdner([...pfad, name]),
    getFileHandle: async (name) => ({
      createWritable: async () => ({
        write: async (daten) => {
          const puffer = typeof daten === 'string'
            ? new TextEncoder().encode(daten)
            : new Uint8Array(await new Blob([daten]).arrayBuffer());
          window.__dateien.push({ pfad: [...pfad, name].join('/'), bytes: Array.from(puffer) });
        },
        close: async () => {}
      })
    }),
    values: async function* () {}
  });
  window.showDirectoryPicker = async () => baueOrdner([]);`;

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const kontext = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
await kontext.addInitScript(ordnerNachbau);
const seite = await kontext.newPage();
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));

const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;
const anzahl = await bestandAusFilm(seite, adresse, { film, wahrheit });
console.log(`Bestand: ${anzahl} Bilder`);

await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
await seite.waitForTimeout(500);
await seite.click('#verzeichnis-waehlen');
await seite.waitForFunction(() => !document.getElementById('verzeichnis-schreiben').disabled, null, { timeout: 30000 });
await seite.waitForTimeout(400);
await seite.click('#verzeichnis-schreiben');
await seite.waitForFunction(
  () => /liegen nun|Abgelegt/.test(document.getElementById('verzeichnis-meldung').textContent),
  null,
  { timeout: 180000 }
);
console.log('Bericht:', (await seite.locator('#verzeichnis-meldung').innerText()).trim());

const dateien = await seite.evaluate(() => window.__dateien);
for (const d of dateien) {
  const voll = join(ziel, d.pfad);
  mkdirSync(dirname(voll), { recursive: true });
  writeFileSync(voll, Buffer.from(d.bytes));
}
console.log(`\n${dateien.length} Datei(en) geschrieben nach ${ziel}\n`);
for (const d of dateien.slice(0, 40)) {
  console.log(`  ${(d.bytes.length / 1024).toFixed(0).padStart(5)} kB  ${d.pfad}`);
}
if (dateien.length > 40) console.log(`  … und ${dateien.length - 40} weitere`);

if (fehler.length) console.log('\nFEHLER in der Seite:', fehler.join(' | '));
else console.log('\nKeine Fehler in der Seite.');
await browser.close();
