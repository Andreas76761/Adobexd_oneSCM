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
      // Der Stapel steckt seit 1.50.0 in einem Aufklapper davor - gesucht ist
      // der Hinweis der Ansicht selbst, nicht der im Aufklapper.
      const hinweis = await seite.locator('#import-ansicht > .band-hinweis').first().innerText();
      wahr(hinweis.includes('PDF-Zeichner'), 'die Grenze bei PDF-Seiten wird nicht genannt');
      gleich(await seite.locator('#stapel-zahl').innerText(), 'nichts gewählt');
      gleich(await seite.locator('#stapel-fortlaufend').isDisabled(), true, 'ohne Bilder lässt sich stapeln');
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
      // Eine leere Stelle in der Karte darf nicht als Wort „null" erscheinen.
      wahr(
        !(await seite.locator('.import-figur').first().innerText()).includes('null'),
        'in der Karte steht „null"'
      );
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
      // Die Vorschau liegt seit 1.34.0 in der Browserdatenbank, nicht im
      // localStorage - sie wird dort geprüft.
      const vorschau = await seite.evaluate(
        (kennung) =>
          new Promise((fertig) => {
            const anfrage = indexedDB.open('screenarchiv');
            anfrage.onsuccess = () => {
              const holen = anfrage.result.transaction('vorschauen').objectStore('vorschauen').get(kennung);
              holen.onsuccess = () => fertig(String(holen.result || '').slice(0, 20));
              holen.onerror = () => fertig('');
            };
            anfrage.onerror = () => fertig('');
          }),
        ersteFolie.id
      );
      wahr(vorschau.startsWith('data:image/'), 'die Vorschau fehlt in der Datenbank');
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

s.test('die Stelle für alle lässt sich auswählen statt tippen', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.png]);
      await seite.selectOption('#import-kapitel', '7');
      await seite.waitForFunction(() => !document.getElementById('import-unterkapitel').disabled, null, { timeout: 5000 });
      gleich(await seite.locator('#import-stelle').inputValue(), '7');
      await seite.selectOption('#import-unterkapitel', '7.5');
      gleich(await seite.locator('#import-stelle').inputValue(), '7.5');
      wahr(
        (await seite.locator('#import-stelle-thema').innerText()).includes('Digitale Unterschrift'),
        await seite.locator('#import-stelle-thema').innerText()
      );
      await seite.click('#import-uebernehmen');
      await seite.waitForFunction(() => document.querySelectorAll('.import-figur--fertig').length === 1, null, {
        timeout: 20000
      });
      const [aufnahme] = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? JSON.parse(roh).aufnahmen : [];
      });
      gleich(aufnahme.gliederung, '7.5');
    },
    { hash: IMPORT }
  ));

/* ------------------------------------------- Stapel: ein Durchgang (1.50.0) */

/** Der Stapel steckt in einem Aufklapper - zugeklappt lässt sich nichts bedienen. */
async function oeffneStapel(seite) {
  await seite.evaluate(() => (document.getElementById('import-stapel').open = true));
  await seite.locator('#stapel-fortlaufend').waitFor({ state: 'visible', timeout: 5000 });
}

s.test('der Stapel vergibt die Stellen fortlaufend ab der gewählten (1.50.0)', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx]);
      await oeffneStapel(seite);
      // Ohne Stelle sagt der Stapel, was fehlt - statt irgendwo zu zählen.
      await seite.click('#stapel-fortlaufend');
      wahr(
        (await seite.locator('#import-meldung').innerText()).includes('fehlt die Stelle'),
        await seite.locator('#import-meldung').innerText()
      );

      await seite.fill('#import-stelle', '7.5.1');
      await seite.click('#stapel-fortlaufend');
      const stellen = await seite.locator('.import-figur input[id^=stelle-]').all();
      gleich(await stellen[0].inputValue(), '7.5.1');
      gleich(await stellen[1].inputValue(), '7.5.2', 'die zweite Folie bekam nicht die folgende Stelle');
      wahr(
        (await seite.locator('#import-meldung').innerText()).includes('7.5.1 bis 7.5.2'),
        await seite.locator('#import-meldung').innerText()
      );

      // Geleert wird genauso in einem Zug.
      await seite.click('#stapel-stellen-weg');
      gleich(await seite.locator('.import-figur input[id^=stelle-]').first().inputValue(), '');
    },
    { hash: IMPORT }
  ));

s.test('der Stapel liest die Stelle aus dem Folientext, sonst bleibt sie leer (1.50.0)', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx]);
      await oeffneStapel(seite);
      // Der Folientext der Vorlage nennt kein Kapitel - dann bleibt es leer.
      await seite.click('#stapel-aus-text');
      gleich(await seite.locator('.import-figur input[id^=stelle-]').first().inputValue(), '');
      wahr(
        (await seite.locator('#import-meldung').innerText()).includes('0 von 2'),
        await seite.locator('#import-meldung').innerText()
      );

      // Steht das Thema im Rezept, findet es sich wieder.
      await seite.fill('.import-figur textarea', 'Dokumentierte Signaturwege im Portal');
      await seite.locator('.import-figur textarea').nth(1).fill('Signaturergebnis');
      await seite.click('#stapel-aus-text');
      const stellen = await seite.locator('.import-figur input[id^=stelle-]').all();
      gleich(await stellen[0].inputValue(), '7.5.1');
      gleich(await stellen[1].inputValue(), '7.5.2');
      wahr(
        (await seite.locator('#import-meldung').innerText()).includes('2 von 2'),
        await seite.locator('#import-meldung').innerText()
      );
    },
    { hash: IMPORT }
  ));

s.test('der Stapel wählt alle und keines und sagt seinen Stand (1.50.0)', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx, dateien.png]);
      await oeffneStapel(seite);
      wahr(
        (await seite.locator('#stapel-zahl').innerText()).includes('3 gewählt'),
        await seite.locator('#stapel-zahl').innerText()
      );
      await seite.click('#stapel-keine');
      gleich(await seite.locator('#stapel-zahl').innerText(), 'nichts gewählt');
      gleich(await seite.locator('#import-uebernehmen').isDisabled(), true);
      await seite.click('#stapel-alle');
      wahr((await seite.locator('#stapel-zahl').innerText()).includes('3 gewählt'));
      // Die Stelle oben zählt für alle, die keine eigene haben.
      await seite.fill('#import-stelle', '7.5.1');
      await seite.click('#stapel-alle');
      wahr(
        (await seite.locator('#stapel-zahl').innerText()).includes('3 mit Stelle'),
        await seite.locator('#stapel-zahl').innerText()
      );
    },
    { hash: IMPORT }
  ));

s.test('die Labels des Stapels gelten für alle Bilder des Durchgangs (1.50.0)', () =>
  mitSeite(
    async (seite) => {
      await liesEin(seite, [dateien.pptx]);
      await oeffneStapel(seite);
      await seite.selectOption('#stapel-sprache', 'en');
      await seite.selectOption('#stapel-rolle_label', 'dealer');
      await seite.selectOption('#stapel-sparte', 'van');
      await seite.fill('#stapel-markt', 'Germany');
      await seite.fill('#stapel-version', '12.2026');
      await seite.fill('#stapel-land', 'DE');
      wahr(
        (await seite.locator('#stapel-zahl').innerText()).includes('6 Label'),
        await seite.locator('#stapel-zahl').innerText()
      );

      await seite.fill('#import-stelle', '7.5.1');
      await seite.click('#stapel-fortlaufend');
      await seite.click('#import-uebernehmen');
      await seite.waitForFunction(() => document.querySelectorAll('.import-figur--fertig').length === 2, null, {
        timeout: 20000
      });
      const aufnahmen = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? JSON.parse(roh).aufnahmen : [];
      });
      gleich(aufnahmen.length, 2);
      for (const aufnahme of aufnahmen) {
        gleich(aufnahme.sprache, 'en');
        gleich(aufnahme.rolle_label, 'dealer');
        gleich(aufnahme.sparte, 'van');
        gleich(aufnahme.markt, 'Germany');
        gleich(aufnahme.version, '12.2026');
        gleich(aufnahme.land, 'DE');
      }
      // Jede Folie behält ihre eigene Stelle - die Labels sind gemeinsam, die Stelle nicht.
      const stellen = aufnahmen.map((a) => a.gliederung).sort();
      gleich(stellen.join(','), '7.5.1,7.5.2');
    },
    { hash: IMPORT }
  ));

s.test('Browser wieder schließen', async () => {
  await schliessen();
  return true;
});

export default s;
