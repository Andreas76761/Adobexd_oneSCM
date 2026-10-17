/**
 * Browserprüfung des Imports: aus bestehenden Dateien wird Galerie.
 * Geprüft wird mit echten Dateien – einem PNG, einer Präsentation, einem
 * Word-Dokument, einer PDF ohne Bilder und einem alten Format.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';
import { legeTestdateienAb } from '../hilfen/dateien.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Import – Oberfläche');

const IMPORT = '#ans=import';
const dateien = legeTestdateienAb();

/** Legt Dateien in den Import und wartet, bis die Karten stehen. */
async function liesEin(seite, pfade) {
  await seite.setInputFiles('#import-eingabe', pfade);
  await seite.waitForFunction(
    (anzahl) => document.querySelectorAll('.import-datei').length >= anzahl,
    pfade.length,
    { timeout: 20000 }
  );
}

s.test('ohne Datei sagt der Import, was er erwartet', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#import-ansicht').isVisible(), true);
      gleich(await seite.locator('#import-uebernehmen').isDisabled(), true);
      gleich(await seite.locator('#import-leeren').isDisabled(), true);
      wahr(
        (await seite.locator('#import-liste').innerText()).includes('Noch keine Datei gelesen'),
        'die leere Liste bleibt stumm'
      );
      const hinweis = await seite.locator('#import-ansicht .band-hinweis').first().innerText();
      wahr(hinweis.includes('PDF-Zeichner'), 'die Grenze bei PDF-Seiten wird nicht genannt');
    },
    { hash: IMPORT }
  ));

s.test('ein PNG wird mit voller Auflösung gelesen', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.png]);
      gleich(await seite.locator('.import-figur').count(), 1);
      const bildunterschrift = await seite.locator('.import-figur figcaption').first().innerText();
      wahr(bildunterschrift.includes('360 × 220 px'), 'die Auflösung steht nicht da: ' + bildunterschrift);
      wahr((await seite.locator('.import-art').first().innerText()).includes('BILD'));
      const vorschlag = await seite.locator('.import-figur input[type=text]').first().getAttribute('placeholder');
      gleich(vorschlag, 'Screen Template Market', 'der Dateiname wird nicht zum Titel');
      wahr((await seite.locator('#import-uebernehmen').innerText()).includes('1 Bild'), 'der Knopf zählt nicht');
    },
    { hash: IMPORT }
  ));

s.test('eine Präsentation gibt Bilder je Folie samt Text', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx]);
      gleich(await seite.locator('.import-figur').count(), 2, 'die beiden Folienbilder fehlen');
      const unterschriften = await seite.locator('.import-figur figcaption').allInnerTexts();
      wahr(unterschriften[0].includes('Folie 1'), 'die Folie steht nicht an ihrem Bild: ' + unterschriften[0]);
      wahr(unterschriften[1].includes('Folie 2'));
      // Der Text der Folie steht als Rezept am Bild.
      gleich(await seite.locator('.import-figur textarea').first().inputValue(), 'Template wählen');
      gleich(await seite.locator('.import-figur textarea').nth(1).inputValue(), 'Create Template');
      wahr(
        (await seite.locator('.import-datei').innerText()).includes('image3.emf'),
        'das übergangene EMF wird nicht genannt'
      );
    },
    { hash: IMPORT }
  ));

s.test('Word, altes Format und PDF ohne Bilder werden benannt, nicht verschluckt', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.docx, dateien.alt, dateien.pdfLeer]);
      const text = await seite.locator('#import-liste').innerText();
      // Der Text steht als Rezept am Bild und zusammengefasst hinter dem
      // Aufklapper - geschlossen ist er nicht im sichtbaren Text.
      gleich(await seite.locator('.import-figur textarea').first().inputValue(), 'Vertrag anlegen');
      wahr(text.includes('Text im Dokument'), 'der Aufklapper für den Text fehlt');
      wahr(text.includes('als .pptx bzw. .docx speichern'), 'das alte Format wird nicht erklärt');
      wahr(text.includes('keine JPEG-Bilder'), 'die PDF ohne Bilder bleibt unerklärt');
      gleich(await seite.locator('.import-figur').count(), 1, 'nur das Word-Bild darf übrig bleiben');
    },
    { hash: IMPORT }
  ));

s.test('die gewählten Bilder landen mit Stelle und Rezept im Eingang', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx]);
      await seite.fill('#import-stelle', '6.2 Templates');
      await seite.fill('.import-figur input[type=text]', 'Template wählen – Market');
      await seite.click('#import-uebernehmen');
      await seite.waitForFunction(
        () => document.querySelectorAll('.import-figur--fertig').length === 2,
        null,
        { timeout: 20000 }
      );
      const aufnahmen = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? JSON.parse(roh).aufnahmen : [];
      });
      gleich(aufnahmen.length, 2, 'der Eingang hat die Bilder nicht');
      const ersteFolie = aufnahmen.find((a) => (a.einfuhr || {}).seite === 1);
      wahr(ersteFolie, 'die Herkunft der Folie fehlt');
      gleich(ersteFolie.titel, 'Template wählen – Market');
      gleich(ersteFolie.gliederung, '6.2', 'die Stelle im Handbuch fehlt');
      gleich(ersteFolie.notiz, 'Template wählen');
      gleich(ersteFolie.einfuhr.datei, 'Quickguide oneSCM.pptx');
      gleich(ersteFolie.quelle.breite, 240, 'die volle Auflösung wurde nicht übernommen');
      wahr(ersteFolie.bild.startsWith('data:image/'), 'die Vorschau fehlt');
      wahr((await seite.locator('#import-meldung').innerText()).includes('im Eingang'));
      // Das volle Bild liegt in der Datenbank, nicht im Browserspeicher.
      const inDatenbank = await seite.evaluate(
        (kennung) =>
          new Promise((fertig) => {
            const anfrage = indexedDB.open('screenarchiv');
            anfrage.onsuccess = () => {
              const db = anfrage.result;
              const holen = db.transaction('bilder').objectStore('bilder').get(kennung);
              holen.onsuccess = () => fertig(typeof holen.result === 'string' ? holen.result.slice(0, 20) : '');
              holen.onerror = () => fertig('');
            };
            anfrage.onerror = () => fertig('');
          }),
        ersteFolie.id
      );
      wahr(inDatenbank.startsWith('data:image/png'), 'das volle Bild fehlt in der Datenbank');
    },
    { hash: IMPORT }
  ));

s.test('ein Bild lässt sich abwählen, die Liste leeren', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx]);
      await seite.uncheck('.import-figur input[type=checkbox]');
      wahr((await seite.locator('#import-uebernehmen').innerText()).includes('1 Bild'), 'der Knopf zählt nicht mit');
      await seite.click('#import-leeren');
      gleich(await seite.locator('.import-datei').count(), 0);
      gleich(await seite.locator('#import-uebernehmen').isDisabled(), true);
      wahr((await seite.locator('#import-meldung').innerText()).includes('bleiben im Eingang'));
    },
    { hash: IMPORT }
  ));

s.test('die Vorschau lässt sich auf volle Auflösung stellen', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.png]);
      gleich(await seite.locator('.import-schau--gross').count(), 0);
      await seite.click('.import-schau');
      gleich(await seite.locator('.import-schau--gross').count(), 1);
      const quelle = await seite.locator('.import-schau img').getAttribute('src');
      wahr(quelle.startsWith('data:image/png'), 'in der Lupe steht nicht das volle PNG');
    },
    { hash: IMPORT }
  ));

s.test('Browser wieder schließen', async () => {
  await schliessen();
  return true;
});

export default s;
