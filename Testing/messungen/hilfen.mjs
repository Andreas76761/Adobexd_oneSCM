/**
 * Was alle Prüfstände hier gemeinsam brauchen.
 *
 * Vier von ihnen bauten denselben Bestand aus demselben Film – jeder mit
 * seiner eigenen Abschrift derselben fünfundzwanzig Zeilen. Das hat sich
 * gerächt: der Nachbau von `downloads.save` musste in **drei** Dateien
 * repariert werden (er kannte nur Blobs, der Vertrag erlaubt auch
 * Zeichenketten), und die Wartezeile `/gerechnet/` traf in **zwei** Dateien
 * die Meldung „… wird gerechnet …" statt der danach.
 *
 * Zwei Fehler, je mehrfach kopiert – das ist der Nachweis, nicht die
 * Vermutung.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ein Nachbau von `downloads.save`, der nimmt, was der Vertrag erlaubt:
 * `string | Blob | ArrayBuffer | ArrayBufferView`. Ein engerer Nachbau
 * verbirgt genau den Code, der die andere Form schickt.
 */
export const DOWNLOAD_NACHBAU = `
  window.__dateien = [];
  window.claude = { use: async (n) => n !== 'downloads' ? null : { save: async (a) => {
    const roh = typeof a.data === 'string'
      ? new TextEncoder().encode(a.data)
      : new Uint8Array(await new Blob([a.data]).arrayBuffer());
    window.__letzte = Array.from(roh);
    window.__dateien.push({ name: a.filename, groesse: roh.byteLength });
    return { status: 'saved' };
  } } };`;

/** Film und Wahrheit eines Messordners. */
export function leseMessfilm(ordner) {
  return {
    film: readFileSync(join(ordner, 'film.webm')),
    wahrheit: JSON.parse(readFileSync(join(ordner, 'wahrheit.json'), 'utf8'))
  };
}

/**
 * Legt den Film in das Register Video, tastet ihn ab, beschriftet die
 * Bilder mit den bekannten Änderungen und übernimmt sie als Strecke.
 * Danach steht ein Bestand von elf Bildern ab Stelle 7.5.1.
 *
 * Gibt die Zahl der Bilder zurück.
 */
export async function bestandAusFilm(seite, adresse, { film, wahrheit }, stelle = '7.5.1') {
  await seite.goto(adresse + '#ans=video');
  await seite.waitForSelector('#video-ansicht:not([hidden])');
  await seite.evaluate((bytes) => {
    const datei = new File([new Uint8Array(bytes)], 'Servicevertrag anlegen.webm', { type: 'video/webm' });
    const t = new DataTransfer();
    t.items.add(datei);
    const e = document.getElementById('video-eingabe');
    e.files = t.files;
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, [...film]);
  await seite.waitForFunction(() => !document.getElementById('video-leiste').hidden, null, { timeout: 30000 });
  await seite.click('#video-automatisch');
  await seite.waitForFunction(() => !document.getElementById('video-automatisch').disabled, null, { timeout: 180000 });
  await seite.waitForTimeout(400);
  const anzahl = await seite.locator('.video-figur').count();
  const anweisungen = wahrheit.aenderungen.map((a) => a.was);
  for (let i = 0; i < anzahl; i++) {
    await seite.locator('.video-figur textarea').nth(i).fill(anweisungen[i] || `Schritt ${i + 1}`);
  }
  await seite.fill('#video-stelle', stelle);
  await seite.click('#video-fortlaufend');
  await seite.waitForTimeout(300);
  await seite.click('#video-strecke');
  await seite.waitForFunction((n) => document.querySelectorAll('.video-figur--fertig').length >= n, anzahl, {
    timeout: 120000
  });
  return anzahl;
}

/**
 * Drückt einen Knopf und schreibt die Datei heraus, die dabei gesichert
 * wird. Setzt `DOWNLOAD_NACHBAU` voraus.
 */
export async function sichereDurchKnopf(seite, knopf, ziel, name, wartezeit = 180000) {
  const { writeFileSync } = await import('node:fs');
  await seite.evaluate(() => (window.__dateien = []));
  await seite.click(knopf);
  await seite.waitForFunction(() => (window.__dateien || []).length >= 1, null, { timeout: wartezeit });
  const [datei] = await seite.evaluate(() => window.__dateien);
  const bytes = await seite.evaluate(() => window.__letzte);
  const pfad = join(ziel, name);
  writeFileSync(pfad, Buffer.from(bytes));
  console.log(`${name.padEnd(22)} ${(datei.groesse / 1024).toFixed(0)} kB  (${datei.name})`);
  return pfad;
}
