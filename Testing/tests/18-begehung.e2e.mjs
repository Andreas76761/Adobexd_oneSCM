/**
 * Begehung: jede Ansicht, jeder sichtbare Befehl.
 *
 * Die übrigen Prüfungen fragen, ob ein Weg zum richtigen Ergebnis führt.
 * Diese fragt etwas Gröberes und darum Wichtiges: bricht irgendwo etwas,
 * wenn man einfach alles drückt? Gezählt werden Seitenfehler, Fehler in der
 * Konsole und eine Seite, die nicht mehr antwortet.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';
import { legeTestdateienAb } from '../hilfen/dateien.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Begehung – alle Befehle');

const dateien = legeTestdateienAb();

/** Ordner, Ablage, Bildschirmfreigabe und Claude nachgebildet. */
const umgebung = `
  window.__abgelegt = []; window.__inhalt = [];
  const baueOrdner = (pfad) => ({
    name: pfad.length ? pfad[pfad.length - 1] : 'Screens',
    queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    getDirectoryHandle: async (n) => baueOrdner([...pfad, n]),
    getFileHandle: async (name) => ({ createWritable: async () => ({
      write: async () => window.__inhalt.push(name), close: async () => {} }) }),
    values: async function* () {}
  });
  window.showDirectoryPicker = async () => baueOrdner([]);
  window.claude = { use: async (n) => n === 'downloads'
    ? { save: async (a) => { window.__abgelegt.push(a.filename); return { status: 'saved' }; } }
    : n === 'sample' ? Object.assign(async () => ({ text: 'Kommentar.' }), { json: async () => ({}) }) : null };
  const l = document.createElement('canvas'); l.width = 1280; l.height = 800;
  const c = l.getContext('2d'); c.fillStyle = '#234'; c.fillRect(0, 0, 1280, 800);
  window.__strom = l.captureStream(5);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true, value: { getDisplayMedia: async () => window.__strom }
  });`;

const ABSCHNITTE = {
  archiv: '#archiv-ansicht',
  aufnahme: '#aufnahme-ansicht',
  import: '#import-ansicht',
  video: '#video-ansicht',
  ausschneiden: '#schnipsel-ansicht',
  markieren: '#markieren-ansicht',
  strecke: '#strecke-ansicht',
  design: '#design-ansicht',
  gliederung: '#gliederung-ansicht',
  pruefung: '#pruefung-ansicht',
  verzeichnis: '#verzeichnis-ansicht',
  ocr: '#ocr-ansicht',
  output: '#output-ansicht',
  eingang: '#eingang-ansicht'
};

/** Zwei Aufnahmen mit Stelle – sonst haben die halben Ansichten nichts zu tun. */
async function grundbestand(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 8000 });
  for (const [titel, stelle] of [
    ['Erste Maske im Portal', '7.5.1'],
    ['Zweite Maske im Portal', '7.5.2']
  ]) {
    await seite.fill('#feld-titel', titel);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Formular');
    await seite.fill('#feld-begriffe', 'vorlage');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(140);
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', stelle);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(200);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(100);
  }
}

/** Was eine Ansicht braucht, damit ihre Befehle überhaupt etwas tun. */
const vorbereitung = {
  async markieren(seite) {
    await seite.selectOption('#markier-wahl', 'AUF-2026-001');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    const masse = await seite.locator('#markier-leinwand').boundingBox();
    await seite.mouse.move(masse.x + 60, masse.y + 60);
    await seite.mouse.down();
    await seite.mouse.move(masse.x + 260, masse.y + 130, { steps: 8 });
    await seite.mouse.up();
    await seite.waitForTimeout(200);
  },
  async strecke(seite) {
    await seite.click('#strecke-neu');
    await seite.fill('#strecke-name', 'Begehung');
    for (const [i, kennung] of ['AUF-2026-001', 'AUF-2026-002'].entries()) {
      await seite.selectOption('#strecke-aufnahme', kennung);
      await seite.click('#strecke-anhaengen');
      await seite.waitForTimeout(150);
      await seite.fill('#schritt-text-' + i, 'Schritt ' + (i + 1));
    }
    await seite.waitForTimeout(400);
  },
  async import(seite) {
    await seite.setInputFiles('#import-eingabe', [dateien.pptx, dateien.png]);
    await seite.waitForFunction(() => document.querySelectorAll('.import-datei').length === 2, null, { timeout: 20000 });
  },
  async verzeichnis(seite) {
    // Der Ordner kann aus der Ansicht Ausschneiden schon offen sein - dann
    // steht dort „anderen Ordner wählen" statt „Ordner wählen".
    if (await seite.locator('#verzeichnis-waehlen').count()) await seite.click('#verzeichnis-waehlen');
    await seite.waitForFunction(() => !document.getElementById('verzeichnis-schreiben').disabled, null, { timeout: 8000 });
  },
  async design(seite) {
    await seite.waitForFunction(() => document.querySelectorAll('.design-blatt').length > 0, null, { timeout: 25000 });
  }
};

/**
 * Drückt in einer Ansicht jeden sichtbaren, nicht gesperrten Befehl. Ein
 * Befehl, den ein vorheriger gesperrt hat, wird übergangen – das ist die
 * Folge des Zustands, kein Fehler.
 */
async function druecke(seite, ansicht, { auchLoeschen = false } = {}) {
  const abschnitt = ABSCHNITTE[ansicht];
  await seite.evaluate((a) => {
    for (const d of document.querySelectorAll(a + ' details')) d.open = true;
  }, abschnitt);
  await seite.waitForTimeout(200);
  const knoepfe = await seite.$$eval(abschnitt + ' button', (liste) =>
    liste.map((b, i) => ({ i, id: b.id, text: (b.textContent || '').trim().slice(0, 44) }))
  );
  let gedrueckt = 0;
  for (const knopf of knoepfe) {
    const zerstoert = /löschen|verwerfen|leeren|entfernen/i.test(knopf.text);
    if (zerstoert !== auchLoeschen) continue;
    const wahl = seite.locator(abschnitt + ' button').nth(knopf.i);
    if (!(await wahl.isVisible()) || (await wahl.isDisabled())) continue;
    await wahl.click({ timeout: 8000 });
    gedrueckt += 1;
    await seite.waitForTimeout(240);
    // Dialoge wieder schließen und zurück in die Ansicht, falls ein Befehl
    // woanders hinführt (der Editor etwa wird aus mehreren Ansichten geöffnet).
    await seite.evaluate(() => {
      for (const d of document.querySelectorAll('dialog[open]')) d.close();
    });
    if (await seite.locator(abschnitt).isHidden()) {
      await seite.click(`.portal-nav button[data-ansicht="${ansicht}"]`);
      await seite.waitForTimeout(200);
    }
  }
  return gedrueckt;
}

s.test('jede Ansicht hält jedem ihrer Befehle stand', () =>
  mitSeite(
    async (seite) => {
      await grundbestand(seite);
      let gesamt = 0;
      for (const ansicht of Object.keys(ABSCHNITTE)) {
        await seite.click(`.portal-nav button[data-ansicht="${ansicht}"]`);
        await seite.waitForSelector(ABSCHNITTE[ansicht] + ':not([hidden])');
        await seite.waitForTimeout(300);
        if (vorbereitung[ansicht]) await vorbereitung[ansicht](seite);
        gesamt += await druecke(seite, ansicht);
        gleich(
          await seite.evaluate(() => document.documentElement.dataset.bereit),
          'ja',
          `nach ${ansicht} antwortet die Seite nicht mehr`
        );
      }
      wahr(gesamt > 80, 'es wurden zu wenige Befehle erreicht: ' + gesamt);
      // Die Ablage hat gearbeitet: Blätter, Berichte, Dateien.
      wahr((await seite.evaluate(() => window.__abgelegt.length)) > 0, 'kein Befehl hat etwas abgelegt');
    },
    { hash: '#ans=aufnahme', initSkript: umgebung, viewport: { width: 1500, height: 1000 } }
  ));

s.test('auch Löschen, Verwerfen und Leeren brechen nichts', () =>
  mitSeite(
    async (seite) => {
      await grundbestand(seite);
      for (const ansicht of ['markieren', 'strecke', 'import', 'eingang', 'gliederung']) {
        await seite.click(`.portal-nav button[data-ansicht="${ansicht}"]`);
        await seite.waitForSelector(ABSCHNITTE[ansicht] + ':not([hidden])');
        await seite.waitForTimeout(250);
        if (vorbereitung[ansicht]) await vorbereitung[ansicht](seite);
        await druecke(seite, ansicht, { auchLoeschen: true });
        gleich(
          await seite.evaluate(() => document.documentElement.dataset.bereit),
          'ja',
          `nach dem Löschen in ${ansicht} antwortet die Seite nicht mehr`
        );
      }
      // Nach dem Leeren steht die Seite da und erklärt sich, statt zu brechen.
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      wahr(
        (await seite.locator('#eingang-ansicht').innerText()).length > 20,
        'der leere Eingang sagt nichts mehr'
      );
    },
    { hash: '#ans=aufnahme', initSkript: umgebung, viewport: { width: 1500, height: 1000 } }
  ));

s.test('die Tastaturbefehle greifen auch nach dem Wechsel der Ansicht', () =>
  mitSeite(
    async (seite) => {
      // „/" springt in die Suche, Esc schließt, Leertaste löst aus.
      await seite.keyboard.press('/');
      gleich(await seite.evaluate(() => document.activeElement.id), 'suche');
      await seite.keyboard.press('Escape');

      await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
      await seite.click('#quelle-beispiel');
      await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 8000 });
      await seite.fill('#feld-titel', 'Mit der Leertaste');
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.selectOption('#feld-kategorie', 'Formular');
      await seite.fill('#feld-begriffe', 'taste');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(
        () => /AUF-/.test(document.getElementById('aufnahme-meldung').textContent),
        null,
        { timeout: 8000 }
      );
      const aufnahmen = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? JSON.parse(roh).aufnahmen : [];
      });
      gleich(aufnahmen.length, 1, 'die Leertaste löst nicht aus');

      // Im Editor nimmt Strg+Z die letzte Marke zurück.
      await seite.click('.portal-nav button[data-ansicht="markieren"]');
      await seite.selectOption('#markier-wahl', aufnahmen[0].id);
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      const masse = await seite.locator('#markier-leinwand').boundingBox();
      await seite.mouse.move(masse.x + 50, masse.y + 50);
      await seite.mouse.down();
      await seite.mouse.move(masse.x + 240, masse.y + 120, { steps: 6 });
      await seite.mouse.up();
      await seite.waitForFunction(() => !document.getElementById('markier-rueckgaengig').disabled, null, { timeout: 5000 });
      await seite.keyboard.press('Control+z');
      await seite.waitForFunction(() => document.getElementById('markier-rueckgaengig').disabled, null, { timeout: 5000 });
    },
    { initSkript: umgebung, viewport: { width: 1500, height: 1000 } }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
