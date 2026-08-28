/**
 * Browserprüfung des Aufnahmemodus und des Eingangs.
 * Geprüft wird dist/index.html in der Hülle, die das Artifact ergänzt.
 */
import { join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';
import { erzeugePng } from '../hilfen/bild.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Aufnahme – Oberfläche');

/** Ein Bild auf der Platte, das der Datei-Auswahl übergeben werden kann. */
const bildOrdner = mkdtempSync(join(tmpdir(), 'screenarchiv-bild-'));
const bildPfad = join(bildOrdner, 'bildschirm.png');
writeFileSync(bildPfad, erzeugePng(800, 500, (x, y) => [(x * 3) % 256, (y * 5) % 256, 200]));

const AUFNAHME = '#ans=aufnahme';
const heute = () => new Date().toISOString().slice(0, 10);

/** Lädt die Beispielquelle und wartet, bis der Ausschnitt steht. */
async function mitBeispielquelle(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
}

const eingangImSpeicher = (seite) =>
  seite.evaluate(() => {
    const roh = localStorage.getItem('screenarchiv:eingang');
    return roh ? JSON.parse(roh).aufnahmen : [];
  });

/* ------------------------------------------------------------ Navigation */

s.test('die Portalnavigation führt zu den drei Ansichten', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('.portal-nav button').count(), 3);
    gleich(await seite.locator('.portal-nav button[aria-current="page"]').innerText(), 'Archiv');
    gleich(await seite.locator('#archiv-ansicht').isVisible(), true);
    gleich(await seite.locator('#aufnahme-ansicht').isVisible(), false);

    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    gleich(await seite.locator('#aufnahme-ansicht').isVisible(), true);
    gleich(await seite.locator('#archiv-ansicht').isVisible(), false);
    gleich(await seite.locator('#archiv-suchfeld').isVisible(), false, 'die Archivsuche bleibt in der Aufnahme stehen');
    wahr((await seite.evaluate(() => location.hash)).includes('ans=aufnahme'), 'die Ansicht fehlt in der Adresse');

    await seite.click('.portal-nav button[data-ansicht="eingang"]');
    gleich(await seite.locator('#eingang-ansicht').isVisible(), true);
    await seite.click('.portal-nav button[data-ansicht="archiv"]');
    gleich(await seite.locator('.karte').count(), 16, 'das Archiv zeichnet nach der Rückkehr nicht');
  }));

s.test('ein Verweis öffnet die Aufnahme unmittelbar', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#aufnahme-ansicht').isVisible(), true);
      gleich(await seite.locator('.portal-nav button[aria-current="page"]').innerText(), 'Aufnahme');
    },
    { hash: AUFNAHME }
  ));

/* ---------------------------------------------------------------- Quelle */

s.test('ohne Quelle ist das Auslösen gesperrt und erklärt', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#ausloesen').isDisabled(), true);
      gleich(await seite.locator('#quelle-leer').isVisible(), true);
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'kein Ausschnitt');
      gleich(await seite.locator('.preset button[data-preset="voll"]').isDisabled(), true);
      wahr((await seite.locator('#ausloesen').getAttribute('title')).includes('Quelle'), 'der Grund wird nicht genannt');
      await seite.keyboard.press('Space');
      wahr((await seite.locator('#aufnahme-meldung').innerText()).includes('Quelle'), 'die Leertaste meldet nichts');
      gleich((await eingangImSpeicher(seite)).length, 0);
    },
    { hash: AUFNAHME }
  ));

s.test('die Beispielquelle lädt mit vollem Ausschnitt', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      wahr((await seite.locator('#quelle-name').innerText()).startsWith('Beispiel: SCR-'), 'die Quelle wird nicht benannt');
      gleich(await seite.locator('#quelle-masse').innerText(), '1440 × 900');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 0 · y 0 · 1440 × 900');
      gleich(await seite.locator('#ausschnitt-rahmen').isVisible(), true);
      gleich(await seite.locator('#quelle-leer').isVisible(), false);
      gleich(await seite.locator('.preset button[data-preset="mobil"]').isDisabled(), false);
    },
    { hash: AUFNAHME }
  ));

s.test('ein geöffnetes Bild wird zur Quelle', () =>
  mitSeite(
    async (seite) => {
      await seite.setInputFiles('#datei-eingabe', bildPfad);
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '800 × 500', null, { timeout: 5000 });
      wahr((await seite.locator('#quelle-name').innerText()).includes('bildschirm.png'), 'der Dateiname fehlt');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 0 · y 0 · 800 × 500');
      wahr((await seite.locator('#aufnahme-meldung').innerText()).includes('geöffnet'), 'keine Rückmeldung zur Datei');
    },
    { hash: AUFNAHME }
  ));

s.test('die Bildschirmfreigabe meldet sich verständlich, wenn sie nicht geht', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.length > 0);
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(/Bild öffnen|Beispielquelle/.test(meldung), 'die Meldung nennt keinen Ausweg: ' + meldung);
      gleich(await seite.locator('#ausloesen').isDisabled(), true);
    },
    {
      hash: AUFNAHME,
      initSkript: () => {
        // Freigabe wie in einer Vorschau ohne Berechtigung
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: { getDisplayMedia: () => Promise.reject(new Error('Permission denied')) }
        });
      }
    }
  ));

/* ------------------------------------------------------------ Ausschnitt */

s.test('der Ausschnitt lässt sich mit der Maus aufziehen', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      const masse = await seite.locator('#quelle-leinwand').boundingBox();
      await seite.mouse.move(masse.x + 60, masse.y + 40);
      await seite.mouse.down();
      await seite.mouse.move(masse.x + 260, masse.y + 180, { steps: 8 });
      await seite.mouse.up();
      const text = await seite.locator('#ausschnitt-masse').innerText();
      wahr(!text.includes('1440 × 900'), 'der Ausschnitt blieb formatfüllend: ' + text);
      const werte = text.match(/x (\d+) · y (\d+) · (\d+) × (\d+)/).slice(1).map(Number);
      wahr(werte[0] > 20 && werte[1] > 20, 'die Lage stimmt nicht: ' + text);
      wahr(werte[2] > 100 && werte[3] > 80, 'die Größe stimmt nicht: ' + text);
      wahr(werte[0] + werte[2] <= 1440 && werte[1] + werte[3] <= 900, 'der Ausschnitt verlässt die Quelle');
    },
    { hash: AUFNAHME }
  ));

s.test('Vorgaben setzen Aufnahmeformate mittig', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('.preset button[data-preset="mobil"]');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 525 · y 28 · 390 × 844');
      await seite.click('.preset button[data-preset="tablet"]');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 208 · y 66 · 1024 × 768');
      await seite.click('.preset button[data-preset="voll"]');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 0 · y 0 · 1440 × 900');
    },
    { hash: AUFNAHME }
  ));

s.test('Pfeiltasten verschieben den Ausschnitt punktgenau', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('.preset button[data-preset="tablet"]');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('ArrowRight');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 209 · y 66 · 1024 × 768');
      await seite.keyboard.press('Shift+ArrowLeft');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 199 · y 66 · 1024 × 768');
      await seite.keyboard.press('ArrowUp');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 199 · y 65 · 1024 × 768');
    },
    { hash: AUFNAHME }
  ));

/* -------------------------------------------------------------- Auslösen */

s.test('die Leertaste legt die Aufnahme sofort in den Eingang', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-titel', 'Kopfzeile mit Suchfeld');
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.fill('#feld-seite', '/portal/bestellungen');
      await seite.fill('#feld-autor', 'M. Ackermann');
      await seite.fill('#feld-datum', '2025-05-06');
      await seite.click('.preset button[data-preset="tablet"]');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.includes('AUF-'));

      const gespeichert = await eingangImSpeicher(seite);
      gleich(gespeichert.length, 1, 'nichts gespeichert');
      const a = gespeichert[0];
      gleich(a.id, 'AUF-2025-001');
      gleich(a.titel, 'Kopfzeile mit Suchfeld');
      gleich(a.projekt, 'oneSCM Portal');
      gleich(a.seite, '/portal/bestellungen');
      gleich(a.autor, 'M. Ackermann');
      gleich(a.datum, '2025-05-06');
      gleich(a.ausschnitt.breite, 1024);
      gleich(a.quelle.art, 'beispiel');
      wahr(a.bild.startsWith('data:image/jpeg;base64,'), 'das Bild ist kein JPEG');
      wahr(a.bild.length > 2000, 'das Bild ist verdächtig klein');
      wahr(String(a.erfasst_am).includes('T'), 'kein Erfassungszeitpunkt');
      gleich(await seite.locator('#eingang-zahl').innerText(), '1', 'der Zähler in der Navigation zählt nicht');
    },
    { hash: AUFNAHME }
  ));

s.test('das gespeicherte Bild trägt die Maße des Ausschnitts', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('.preset button[data-preset="mobil"]');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.includes('AUF-'));
      const masse = await seite.evaluate(async () => {
        const a = JSON.parse(localStorage.getItem('screenarchiv:eingang')).aufnahmen[0];
        const bild = new Image();
        await new Promise((fertig) => {
          bild.onload = fertig;
          bild.src = a.bild;
        });
        return { breite: bild.naturalWidth, hoehe: bild.naturalHeight, ausschnitt: a.ausschnitt };
      });
      gleich(masse.breite, 390, 'die Bildbreite passt nicht zum Ausschnitt');
      gleich(masse.hoehe, 844);
      gleich(masse.ausschnitt.breite, 390);
    },
    { hash: AUFNAHME }
  ));

s.test('mehrere Aufnahmen hintereinander behalten die Metadaten', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-projekt', 'Admin-Konsole');
      await seite.fill('#feld-titel', 'Erste Aufnahme');
      await seite.fill('#feld-datum', '2025-06-02');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      gleich(await seite.inputValue('#feld-titel'), '', 'der Titel bleibt für die nächste Aufnahme stehen');
      gleich(await seite.inputValue('#feld-projekt'), 'Admin-Konsole', 'das Projekt wurde geleert');
      gleich(await seite.inputValue('#feld-datum'), '2025-06-02', 'das Datum wurde geleert');

      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '2');
      const liste = await eingangImSpeicher(seite);
      gleich(liste.length, 2);
      gleich(liste[0].id, 'AUF-2025-002', 'die zweite Aufnahme zählt nicht hoch');
      wahr(liste[0].titel.includes('Admin-Konsole'), 'ohne Titel entsteht kein Vorschlag: ' + liste[0].titel);
      gleich(liste[0].projekt, 'Admin-Konsole');
    },
    { hash: AUFNAHME }
  ));

s.test('die Leertaste löst nicht aus, während getippt wird', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('#feld-titel');
      await seite.keyboard.type('Zwei Wörter');
      gleich((await eingangImSpeicher(seite)).length, 0, 'das Tippen hat ausgelöst');
      gleich(await seite.inputValue('#feld-titel'), 'Zwei Wörter', 'das Leerzeichen kam nicht im Feld an');
      await seite.locator('#feld-notiz').focus();
      await seite.keyboard.press('Space');
      gleich((await eingangImSpeicher(seite)).length, 0, 'die Notiz löst aus');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
    },
    { hash: AUFNAHME }
  ));

s.test('ein Datum in der Zukunft verhindert die Aufnahme', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-datum', '2099-01-01');
      gleich(await seite.locator('#ausloesen').isDisabled(), true, 'der Auslöser bleibt bedienbar');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      wahr((await seite.locator('#aufnahme-meldung').innerText()).includes('Zukunft'), 'der Grund wird nicht genannt');
      gleich((await eingangImSpeicher(seite)).length, 0);
      await seite.fill('#feld-datum', heute());
      gleich(await seite.locator('#ausloesen').isDisabled(), false, 'nach der Korrektur bleibt gesperrt');
    },
    { hash: AUFNAHME }
  ));

s.test('der Auslöser am Bildschirm tut dasselbe wie die Leertaste', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      gleich((await eingangImSpeicher(seite)).length, 1);
    },
    { hash: AUFNAHME }
  ));

/* --------------------------------------------------------------- Eingang */

s.test('die Aufnahme erscheint im Eingang als unvollständig', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-titel', 'Fehlermeldung im Formular');
      await seite.fill('#feld-projekt', 'Lieferanten-Cockpit');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');

      gleich(await seite.locator('.eingang-karte').count(), 1);
      const karte = seite.locator('.eingang-karte').first();
      wahr((await karte.innerText()).includes('Fehlermeldung im Formular'), 'der Titel fehlt auf der Karte');
      wahr((await karte.innerText()).includes('Kategorie fehlt'), 'die fehlende Kategorie wird nicht angezeigt');
      gleich(await karte.locator('.offen-marke').count(), 1);
      gleich(await karte.locator('img').count(), 1, 'die Vorschau fehlt');
      wahr((await karte.locator('img').getAttribute('src')).startsWith('data:image/jpeg'), 'kein eingebettetes Bild');
      wahr((await seite.locator('#eingang-kennzahlen').innerText()).includes('1'), 'die Kennzahlen bleiben leer');
    },
    { hash: AUFNAHME }
  ));

s.test('Kategorie und Begriffe lassen sich nachträglich ergänzen', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-titel', 'Sekundärnavigation');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#eingang-dialog[open]');

      gleich(await seite.inputValue('#bearbeite-titel'), 'Sekundärnavigation');
      await seite.selectOption('#bearbeite-kategorie', 'Barrierefreiheit');
      await seite.fill('#bearbeite-projekt', 'oneSCM Portal');
      await seite.fill('#bearbeite-begriffe', '#Kontrast, navigation, KONTRAST');
      await seite.fill('#bearbeite-notiz', 'Audit A-14');
      await seite.click('#bearbeite-speichern');
      await seite.waitForSelector('#eingang-dialog[open]', { state: 'detached' }).catch(() => {});

      const gespeichert = (await eingangImSpeicher(seite))[0];
      gleich(gespeichert.kategorie, 'Barrierefreiheit');
      gleich(gespeichert.projekt, 'oneSCM Portal');
      gleich(gespeichert.begriffe.join(','), 'kontrast,navigation', 'Begriffe nicht vereinheitlicht');
      gleich(gespeichert.notiz, 'Audit A-14');

      const karte = seite.locator('.eingang-karte').first();
      gleich(await karte.locator('.offen-marke').count(), 0, 'die Karte gilt weiter als unvollständig');
      wahr((await karte.innerText()).includes('#kontrast'), 'die Begriffe stehen nicht auf der Karte');
    },
    { hash: AUFNAHME }
  ));

s.test('der Eingang lässt sich durchsuchen und filtern', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      for (const [titel, kategorie] of [['Erste Ansicht', 'Layout'], ['Zweite Ansicht', '']]) {
        await seite.fill('#feld-titel', titel);
        await seite.fill('#feld-projekt', 'oneSCM Portal');
        await seite.selectOption('#feld-kategorie', kategorie);
        await seite.fill('#feld-begriffe', kategorie ? 'raster' : '');
        await seite.click('#ausloesen');
        await seite.waitForTimeout(120);
      }
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('.eingang-karte').count(), 2);

      await seite.fill('#eingang-suche', 'zweite');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 1);
      wahr((await seite.locator('#eingang-treffer').innerText()).includes('von 2'), 'die Trefferzeile bleibt stehen');
      await seite.fill('#eingang-suche', 'raster');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 1);
      wahr((await seite.locator('.eingang-karte').first().innerText()).includes('Erste'), 'Begriffe werden nicht durchsucht');

      await seite.fill('#eingang-suche', '');
      await seite.click('.eingang-zustand button[data-zustand="offen"]');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 1);
      wahr((await seite.locator('.eingang-karte').first().innerText()).includes('Zweite'), 'der falsche Satz gilt als offen');
      await seite.click('.eingang-zustand button[data-zustand="fertig"]');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 1);
      wahr((await seite.locator('.eingang-karte').first().innerText()).includes('Erste'));
      await seite.click('.eingang-zustand button[data-zustand="alle"]');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 2);
    },
    { hash: AUFNAHME }
  ));

s.test('die Sortierung im Eingang greift', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      for (const titel of ['Bravo', 'Alpha']) {
        await seite.fill('#feld-titel', titel);
        await seite.click('#ausloesen');
        await seite.waitForTimeout(120);
      }
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      const titel = async () => (await seite.locator('.eingang-karte h3').allInnerTexts()).join('|');
      gleich(await titel(), 'Alpha|Bravo', 'zuletzt aufgenommen steht nicht oben');
      await seite.selectOption('#eingang-sortierung', 'alt');
      gleich(await titel(), 'Bravo|Alpha');
      await seite.selectOption('#eingang-sortierung', 'titel');
      gleich(await titel(), 'Alpha|Bravo');
    },
    { hash: AUFNAHME }
  ));

s.test('eine Aufnahme lässt sich löschen', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#eingang-dialog[open]');
      await seite.click('#bearbeite-loeschen');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 0);
      gleich((await eingangImSpeicher(seite)).length, 0, 'im Speicher liegt die Aufnahme noch');
      gleich(await seite.locator('#eingang-zahl').isHidden(), true, 'der Zähler bleibt stehen');
      gleich(await seite.locator('#eingang-leer').isVisible(), true);
    },
    { hash: AUFNAHME }
  ));

s.test('„Eingang leeren" fragt einmal nach', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.click('#eingang-leeren');
      gleich((await eingangImSpeicher(seite)).length, 1, 'der erste Klick löscht schon');
      wahr((await seite.locator('#eingang-leeren').innerText()).includes('Wirklich'), 'es wird nicht nachgefragt');
      await seite.click('#eingang-leeren');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 0);
      gleich((await eingangImSpeicher(seite)).length, 0);
    },
    { hash: AUFNAHME }
  ));

s.test('der Eingang überlebt das Neuladen', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-titel', 'Bleibt erhalten');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.reload({ waitUntil: 'domcontentloaded' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      gleich(await seite.locator('#eingang-zahl').innerText(), '1', 'nach dem Neuladen ist der Eingang leer');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      wahr((await seite.locator('.eingang-karte').first().innerText()).includes('Bleibt erhalten'));
    },
    { hash: AUFNAHME }
  ));

s.test('Sichern bietet ohne Ablagefähigkeit einen Ersatzweg', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-titel', 'Zur Ausgabe');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.click('#eingang-sichern');
      await seite.waitForSelector('#eingang-ausgabe');
      const ausgabe = JSON.parse(await seite.inputValue('#eingang-ausgabe'));
      gleich(ausgabe.anzahl, 1);
      gleich(ausgabe.mit_bildern, false);
      gleich(ausgabe.aufnahmen[0].titel, 'Zur Ausgabe');
      wahr(ausgabe.aufnahmen[0].bild_bytes > 0, 'die Bildgröße fehlt in der Ausgabe');
    },
    { hash: AUFNAHME }
  ));

/* ------------------------------------------------------------- Zusammenspiel */

s.test('das Archiv bleibt von der Aufnahme unberührt', () =>
  mitSeite(async (seite) => {
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await mitBeispielquelle(seite);
    await seite.click('#ausloesen');
    await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
    await seite.click('.portal-nav button[data-ansicht="archiv"]');
    gleich(await seite.locator('.karte').count(), 16, 'die Belegzahl im Archiv hat sich verändert');
    await seite.fill('#suche', 'kontrast');
    await seite.waitForFunction(() => document.querySelectorAll('.karte').length === 2);
  }));

s.test('die Aufnahme läuft auf dem Telefon nicht über', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      const ueberlauf = await seite.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      wahr(ueberlauf <= 1, `die Seite läuft um ${ueberlauf} px über`);
      gleich(await seite.locator('#metadaten').isVisible(), true, 'die Metadaten fehlen auf dem Telefon');
    },
    { hash: AUFNAHME, viewport: { width: 390, height: 844 } }
  ));

s.test('das dunkle Thema trägt auch die Aufnahme', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      const werte = await seite.evaluate(() => {
        const feld = document.getElementById('feld-titel');
        const knopf = document.getElementById('ausloesen');
        return {
          grund: getComputedStyle(document.body).backgroundColor,
          feldGrund: getComputedStyle(feld).backgroundColor,
          feldSchrift: getComputedStyle(feld).color,
          knopfGrund: getComputedStyle(knopf).backgroundColor,
          knopfSchrift: getComputedStyle(knopf).color
        };
      });
      const leuchte = (rgb) =>
        rgb
          .match(/\d+/g)
          .slice(0, 3)
          .map((k) => {
            const v = k / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          })
          .reduce((a, b, i) => a + b * [0.2126, 0.7152, 0.0722][i], 0);
      wahr(leuchte(werte.feldGrund) < 0.12, 'Eingabefelder bleiben hell: ' + werte.feldGrund);
      wahr(leuchte(werte.feldSchrift) > 0.5, 'die Schrift in den Feldern bleibt dunkel: ' + werte.feldSchrift);
      // Schrift auf farbiger Fläche: im dunklen Thema ist der Akzent hell,
      // weiße Schrift darauf wäre zu schwach.
      const hell = leuchte(werte.knopfSchrift);
      const dunkel = leuchte(werte.knopfGrund);
      const kontrast = (Math.max(hell, dunkel) + 0.05) / (Math.min(hell, dunkel) + 0.05);
      wahr(kontrast >= 4.5, `Der Auslöser hat nur ${kontrast.toFixed(1)}:1 Kontrast`);
    },
    { hash: AUFNAHME, thema: 'dark' }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
