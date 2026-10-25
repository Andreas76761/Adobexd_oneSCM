/**
 * Misst `videoWahl` unmittelbar – ohne Browser, mit ffmpeg als Bildquelle.
 * Die Frage: woran liegt es, dass kleine Änderungen an einer Maske nicht
 * gefunden werden? Gedreht wird an drei Schrauben:
 *
 *   breite   – auf welche Breite verkleinert wird, bevor verglichen wird
 *   punkt    – ab welchem Unterschied ein Bildpunkt als verschieden gilt
 *   anteil   – wie viel Fläche sich ändern muss, damit ein Bild zählt
 *
 *   node Testing/messungen/miss-kern.mjs <ordner mit film.webm>
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as kern from '../../app/src/core.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const ordner = process.argv[2] || join(hier, 'ausgabe');
const wahrheit = JSON.parse(readFileSync(join(ordner, 'wahrheit.json'), 'utf8'));
const film = join(ordner, 'film.webm');
const FENSTER = 0.9;

/** Ein Einzelbild zu einer Sekunde, verkleinert, als rohe Bildpunkte. */
function bildAn(zeit, breite) {
  const hoehe = Math.round((breite * 720) / 1280);
  const roh = execFileSync(
    'ffmpeg',
    ['-loglevel', 'error', '-ss', String(zeit), '-i', film, '-frames:v', '1',
     '-vf', `scale=${breite}:${hoehe}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  return { zeit, daten: new Uint8ClampedArray(roh), breite, hoehe };
}

const STELLEN = kern.videoSchritte(wahrheit.dauer, 48);
const zwischenspeicher = new Map();
const hole = (breite) => {
  if (!zwischenspeicher.has(breite)) zwischenspeicher.set(breite, STELLEN.map((z) => bildAn(z, breite)));
  return zwischenspeicher.get(breite);
};

const werte = (zeiten) => {
  const getroffen = wahrheit.aenderungen.filter((a) => zeiten.some((z) => z >= a.zeit && z - a.zeit <= FENSTER));
  const zusatz = zeiten.filter((z) => !wahrheit.aenderungen.some((a) => z >= a.zeit && z - a.zeit <= FENSTER));
  return { bilder: zeiten.length, gefunden: getroffen.length, verpasst: wahrheit.aenderungen.length - getroffen.length, zusatz: zusatz.length };
};

console.log(`Film ${wahrheit.dauer}s, ${wahrheit.aenderungen.length} echte Änderungen, ${STELLEN.length} Abtaststellen`);
console.log('');
console.log('Breite  Punkt  Anteil   Bilder  gefunden  verpasst  zusätzlich');
console.log('-'.repeat(64));

const zeilen = [];
for (const breite of [192, 320, 480, 640]) {
  const bilder = hole(breite);
  for (const punkt of [12, 24, 36]) {
    for (const anteil of [0.0005, 0.002, 0.005, 0.02]) {
      // videoWahl nimmt die Schwelle für die Fläche; der Punktabstand steckt
      // in bildUnterschied – darum hier nachgebaut, gleiche Rechnung.
      const gewaehlt = [{ zeit: bilder[0].zeit }];
      let letztes = bilder[0];
      for (let i = 1; i < bilder.length; i++) {
        const e = kern.bildUnterschied(letztes, bilder[i], { schwelle: punkt });
        if (e.ok && e.anteil < anteil) continue;
        gewaehlt.push({ zeit: bilder[i].zeit });
        letztes = bilder[i];
      }
      const z = { breite, punkt, anteil, ...werte(gewaehlt.map((g) => g.zeit)) };
      zeilen.push(z);
      console.log(
        `${String(breite).padStart(6)}  ${String(punkt).padStart(5)}  ${String(anteil * 100 + '%').padStart(6)}  ` +
          `${String(z.bilder).padStart(6)}  ${String(z.gefunden).padStart(8)}  ${String(z.verpasst).padStart(8)}  ${String(z.zusatz).padStart(10)}`
      );
    }
  }
}

console.log('');
const ohneVerlust = zeilen.filter((z) => z.verpasst === 0).sort((a, b) => a.bilder - b.bilder);
if (ohneVerlust.length) {
  for (const b of ohneVerlust.slice(0, 5)) {
    console.log(`ohne Verlust: Breite ${b.breite}, Punkt ${b.punkt}, Anteil ${b.anteil * 100}% – ${b.bilder} Bilder, ${b.zusatz} zusätzlich`);
  }
} else {
  const beste = [...zeilen].sort((a, b) => a.verpasst - b.verpasst || a.bilder - b.bilder).slice(0, 5);
  for (const b of beste) console.log(`am nächsten: Breite ${b.breite}, Punkt ${b.punkt}, Anteil ${b.anteil * 100}% – ${b.verpasst} verpasst, ${b.bilder} Bilder`);
}
