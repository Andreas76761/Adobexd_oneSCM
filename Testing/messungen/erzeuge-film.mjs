/**
 * Erzeugt einen Bildschirmfilm einer oneSCM-ähnlichen Maske – und schreibt
 * daneben, WANN sich etwas Wesentliches geändert hat.
 *
 * Warum der Umweg über Einzelbilder: ein Mitschnitt aus der Seite heraus
 * (Leinwand + MediaRecorder) zeichnet die Maske nicht mit – was dabei
 * herauskommt, ist ein leerer Hintergrund mit einem Mauszeiger. Hier wird
 * darum je Takt ein echtes Bildschirmfoto gemacht und ffmpeg setzt daraus
 * den Film zusammen. Damit ist auch die Wahrheit exakt: jede Änderung liegt
 * auf einem bekannten Takt.
 *
 *   node Testing/messungen/erzeuge-film.mjs <zielordner>
 *
 * Braucht ffmpeg. Heraus kommen `film.webm` und `wahrheit.json`.
 */
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const ziel = process.argv[2] || join(hier, 'ausgabe');
const bilder = join(ziel, 'takte');
rmSync(bilder, { recursive: true, force: true });
mkdirSync(bilder, { recursive: true });

const TAKT = 10; // Bilder je Sekunde
const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });
const seite = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await seite.goto(pathToFileURL(join(hier, 'maske.html')).href);

/**
 * Der Ablauf als Liste: je Eintrag die Dauer in Takten, die Änderung an der
 * Maske (oder keine) und wohin die Maus wandert. Nur Einträge mit `was`
 * sind echte Änderungen – sie bilden die Wahrheit.
 */
const ablauf = [
  { takte: 6, maus: [300, 200] },
  { takte: 6, maus: [330, 215] },
  { takte: 5, was: 'Vertragsnummer fokussiert', tu: () => document.getElementById('f1').classList.add('fokus'), maus: [330, 215] },
  { takte: 6, was: 'Vertragsnummer getippt', tu: () => (document.getElementById('f1').value = 'SV-2026-004711'), maus: [335, 218] },
  { takte: 5, maus: [700, 215] },
  { takte: 6, was: 'Kundennummer getippt', tu: () => { document.getElementById('f1').classList.remove('fokus'); document.getElementById('f2').value = '10045329'; }, maus: [700, 215] },
  { takte: 4, maus: [1050, 215] },
  { takte: 5, was: 'Auswahlliste offen', tu: () => { const l = document.getElementById('liste'); l.hidden = false; l.style.left = '980px'; l.style.top = '236px'; }, maus: [1050, 250] },
  { takte: 6, was: 'Markt gewählt', tu: () => { document.getElementById('liste').hidden = true; document.getElementById('f3').selectedIndex = 1; }, maus: [1050, 230] },
  { takte: 5, maus: [330, 300] },
  { takte: 6, was: 'Laufzeit und Sparte', tu: () => { document.getElementById('f4').value = '36 Monate'; document.getElementById('f5').value = 'PC'; }, maus: [330, 300] },
  { takte: 5, maus: [640, 480] },
  { takte: 7, was: 'Positionen geladen', tu: () => (document.getElementById('zeilen').innerHTML =
      '<tr><td>10</td><td>Wartung Plus</td><td>jährlich</td><td>480,00 €</td></tr>' +
      '<tr><td>20</td><td>Verschleiß</td><td>jährlich</td><td>240,00 €</td></tr>'), maus: [640, 480] },
  { takte: 5, maus: [1150, 610] },
  { takte: 7, was: 'Dialog offen', tu: () => (document.getElementById('dialog').hidden = false), maus: [700, 420] },
  { takte: 7, was: 'Dialog bestätigt', tu: () => { document.getElementById('dialog').hidden = true; document.getElementById('hinweis').hidden = false; document.getElementById('f6').value = 'in Prüfung'; }, maus: [700, 420] },
  { takte: 5, maus: [400, 140] },
  { takte: 8, was: 'Reiter Fahrzeug', tu: () => { document.getElementById('r1').classList.remove('an'); document.getElementById('r2').classList.add('an'); }, maus: [400, 140] }
];

const wahrheit = [];
let takt = 0;
for (const schritt of ablauf) {
  if (schritt.tu) {
    await seite.evaluate(schritt.tu);
    wahrheit.push({ zeit: Number((takt / TAKT).toFixed(2)), was: schritt.was });
  }
  const [vonX, vonY] = (ablauf[ablauf.indexOf(schritt) - 1] || { maus: [300, 200] }).maus;
  for (let i = 0; i < schritt.takte; i++) {
    // Die Maus wandert über die Takte hinweg – sie ist der häufigste Grund
    // für eine Änderung, die keine ist.
    const anteil = (i + 1) / schritt.takte;
    const x = Math.round(vonX + (schritt.maus[0] - vonX) * anteil);
    const y = Math.round(vonY + (schritt.maus[1] - vonY) * anteil);
    await seite.evaluate(([mx, my]) => {
      const z = document.getElementById('zeiger');
      z.style.left = mx + 'px';
      z.style.top = my + 'px';
    }, [x, y]);
    await seite.screenshot({ path: join(bilder, String(takt).padStart(4, '0') + '.png') });
    takt += 1;
  }
}
await browser.close();

execFileSync('ffmpeg', [
  '-loglevel', 'error', '-y', '-framerate', String(TAKT),
  '-i', join(bilder, '%04d.png'),
  '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '1500k', '-r', '25',
  join(ziel, 'film.webm')
]);
rmSync(bilder, { recursive: true, force: true });

const dauer = Number((takt / TAKT).toFixed(2));
writeFileSync(join(ziel, 'wahrheit.json'), JSON.stringify({ dauer, takt: TAKT, aenderungen: wahrheit }, null, 2));
console.log(`film.webm – ${dauer}s, ${takt} Takte`);
console.log(`${wahrheit.length} echte Änderungen:`);
for (const a of wahrheit) console.log(`  ${String(a.zeit).padStart(6)}s  ${a.was}`);
