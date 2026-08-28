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

/* Drei Bilder mit verschiedenen Maßen - so ist erkennbar, welches gerade gilt. */
const stapelPfade = [
  [join(bildOrdner, 'schirm-01.png'), 640, 400],
  [join(bildOrdner, 'schirm-02.png'), 900, 500],
  [join(bildOrdner, 'schirm-03.png'), 520, 340]
].map(([pfad, breite, hoehe]) => {
  writeFileSync(pfad, erzeugePng(breite, hoehe, (x, y) => [(x * 2) % 256, breite % 256, (y * 3) % 256]));
  return pfad;
});

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

/* ----------------------------------------------------------- Bilderstapel */

s.test('mehrere Bilddateien werden zum Stapel', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#stapel-leiste').isVisible(), false, 'die Leiste steht ungefragt da');
      await seite.setInputFiles('#datei-eingabe', stapelPfade);
      await seite.waitForSelector('#stapel-leiste:not([hidden])');
      gleich(await seite.locator('#stapel-stand').innerText(), 'Bild 1 von 3');
      wahr((await seite.locator('#stapel-name').innerText()).includes('schirm-01'), 'der Dateiname fehlt');
      gleich(await seite.locator('#quelle-masse').innerText(), '640 × 400');
      gleich(await seite.locator('#stapel-zurueck').isDisabled(), true, 'am Anfang lässt sich zurückgehen');
      gleich(await seite.locator('#stapel-weiter').isDisabled(), false);
      wahr((await seite.locator('#aufnahme-meldung').innerText()).includes('3 Bilder'), 'die Zahl wird nicht gemeldet');
    },
    { hash: AUFNAHME }
  ));

s.test('durch den Stapel lässt sich vor und zurück gehen', () =>
  mitSeite(
    async (seite) => {
      await seite.setInputFiles('#datei-eingabe', stapelPfade);
      await seite.waitForSelector('#stapel-leiste:not([hidden])');

      await seite.click('#stapel-weiter');
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '900 × 500');
      gleich(await seite.locator('#stapel-stand').innerText(), 'Bild 2 von 3');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 0 · y 0 · 900 × 500', 'der Ausschnitt folgt dem neuen Bild nicht');

      await seite.click('#stapel-weiter');
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '520 × 340');
      gleich(await seite.locator('#stapel-weiter').isDisabled(), true, 'am Ende lässt sich weitergehen');

      await seite.click('#stapel-zurueck');
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '900 × 500');
      gleich(await seite.locator('#stapel-stand').innerText(), 'Bild 2 von 3');
    },
    { hash: AUFNAHME }
  ));

s.test('aus dem Stapel lässt sich jedes Bild einzeln aufnehmen', () =>
  mitSeite(
    async (seite) => {
      await seite.setInputFiles('#datei-eingabe', stapelPfade);
      await seite.waitForSelector('#stapel-leiste:not([hidden])');
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.fill('#feld-titel', 'Erstes Bild');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');

      await seite.click('#stapel-weiter');
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '900 × 500');
      await seite.fill('#feld-titel', 'Zweites Bild');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '2');

      const liste = await eingangImSpeicher(seite);
      gleich(liste[0].titel, 'Zweites Bild');
      gleich(liste[0].ausschnitt.breite, 900, 'das zweite Bild wurde nicht in seiner Größe aufgenommen');
      wahr(liste[0].quelle.name.includes('schirm-02'), 'die Herkunft nennt die falsche Datei: ' + liste[0].quelle.name);
      gleich(liste[1].ausschnitt.breite, 640);
      wahr(liste[1].quelle.name.includes('schirm-01'), 'die erste Herkunft stimmt nicht');
    },
    { hash: AUFNAHME }
  ));

s.test('eine andere Quelle beendet den Stapel', () =>
  mitSeite(
    async (seite) => {
      await seite.setInputFiles('#datei-eingabe', stapelPfade);
      await seite.waitForSelector('#stapel-leiste:not([hidden])');
      await seite.click('#quelle-beispiel');
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '1440 × 900');
      gleich(await seite.locator('#stapel-leiste').isVisible(), false, 'die Stapelleiste bleibt stehen');
    },
    { hash: AUFNAHME }
  ));

s.test('ein hierher gezogener Verweis erklärt sich', () =>
  mitSeite(
    async (seite) => {
      await seite.evaluate(() => {
        const uebergabe = new DataTransfer();
        uebergabe.setData('text/uri-list', 'https://example.org/bild.png');
        document.getElementById('quelle-buehne').dispatchEvent(
          new DragEvent('drop', { dataTransfer: uebergabe, bubbles: true, cancelable: true })
        );
      });
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.length > 0);
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(meldung.includes('Verweis'), 'die Ursache wird nicht benannt: ' + meldung);
      wahr(/speichern|freigeben/.test(meldung), 'es wird kein Ausweg genannt: ' + meldung);
      gleich(await seite.locator('#quelle-leer').isVisible(), true, 'es wurde eine Quelle gesetzt');
    },
    { hash: AUFNAHME }
  ));

/* ------------------------------------------------------- Zwischenablage */

/** Erzeugt im Browser ein Einfüge-Ereignis mit einem Bild, wie es ein
    Bildschirmfoto aus der Systemtaste liefert. */
async function fuegeBildEin(seite, base64, typ = 'image/png') {
  await seite.evaluate(
    ([daten, art]) => {
      const roh = atob(daten);
      const bytes = new Uint8Array(roh.length);
      for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
      const uebergabe = new DataTransfer();
      uebergabe.items.add(new File([bytes], 'bildschirmfoto.png', { type: art }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: uebergabe, bubbles: true, cancelable: true }));
    },
    [base64, typ]
  );
}

const pngAlsBase64 = erzeugePng(720, 450, (x, y) => [(x * 2) % 256, 90, (y * 4) % 256]).toString('base64');

s.test('ein eingefügtes Bildschirmfoto wird zur Quelle', () =>
  mitSeite(
    async (seite) => {
      await fuegeBildEin(seite, pngAlsBase64);
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '720 × 450', null, { timeout: 5000 });
      wahr((await seite.locator('#quelle-name').innerText()).includes('Zwischenablage'), 'die Herkunft wird nicht benannt');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 0 · y 0 · 720 × 450');
      gleich(await seite.locator('#ausloesen').isDisabled(), false, 'der Auslöser bleibt gesperrt');
      wahr((await seite.locator('#aufnahme-meldung').innerText()).includes('Zwischenablage'), 'keine Rückmeldung');
    },
    { hash: AUFNAHME }
  ));

s.test('ein eingefügtes Bildschirmfoto lässt sich sofort aufnehmen', () =>
  mitSeite(
    async (seite) => {
      await fuegeBildEin(seite, pngAlsBase64);
      await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled);
      await seite.fill('#feld-titel', 'Eingefügtes Bildschirmfoto');
      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      const [a] = await eingangImSpeicher(seite);
      gleich(a.quelle.art, 'zwischenablage', 'die Herkunft wird nicht festgehalten');
      gleich(a.ausschnitt.breite, 720);
      wahr(a.bild.startsWith('data:image/jpeg;base64,'));
    },
    { hash: AUFNAHME }
  ));

s.test('eingefügter Text stört die Aufnahme nicht', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.evaluate(() => {
        const uebergabe = new DataTransfer();
        uebergabe.setData('text/plain', 'nur Text');
        document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: uebergabe, bubbles: true, cancelable: true }));
      });
      await seite.waitForTimeout(150);
      gleich(await seite.locator('#quelle-masse').innerText(), '1440 × 900', 'die Quelle wurde durch Text ersetzt');
      wahr((await seite.locator('#quelle-name').innerText()).includes('Beispiel'), 'die Quelle hat gewechselt');
    },
    { hash: AUFNAHME }
  ));

s.test('das Einfügen wirkt nur in der Aufnahmeansicht', () =>
  mitSeite(async (seite) => {
    await fuegeBildEin(seite, pngAlsBase64);
    await seite.waitForTimeout(200);
    gleich(await seite.locator('.karte').count(), 16, 'das Archiv hat auf das Einfügen reagiert');
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    gleich(await seite.locator('#quelle-leer').isVisible(), true, 'im Archiv eingefügtes Bild wurde übernommen');
  }));

s.test('die Schaltfläche nennt den Weg über die Einfügetaste', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-zwischenablage');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.length > 0);
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(/Strg\+V|Cmd\+V/.test(meldung), 'die Einfügetaste wird nicht genannt: ' + meldung);
    },
    { hash: AUFNAHME }
  ));

s.test('gesperrte Bildschirmfreigabe nennt Ursache und Ausweg', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.length > 0);
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(/eingebettete Ansicht|gesperrt/.test(meldung), 'die Ursache wird nicht benannt: ' + meldung);
      wahr(/Strg\+V|Cmd\+V/.test(meldung), 'der Ausweg über die Einfügetaste fehlt: ' + meldung);
      wahr(/Bild öffnen/.test(meldung), 'der zweite Ausweg fehlt: ' + meldung);
    },
    {
      hash: AUFNAHME,
      initSkript: `Object.defineProperty(document, 'featurePolicy', {
        configurable: true,
        value: { allowsFeature: (name) => name !== 'display-capture' }
      });`
    }
  ));

s.test('gesperrte Freigabe zeigt sichtbar, wohin eingefügt wird', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#einfuege-hinweis').isVisible(), false, 'der Hinweis steht ungefragt da');
      await seite.click('#quelle-bildschirm');
      await seite.waitForSelector('#einfuege-hinweis:not([hidden])');
      // innerText liefert die dargestellte Schreibweise (Versalien aus dem Stil).
      wahr(
        (await seite.locator('#einfuege-hinweis').innerText()).toLowerCase().includes('bereit zum einfügen'),
        'keine Bereitschaftsmarke'
      );
      wahr(/Strg\+V|Cmd\+V/.test(await seite.locator('#einfuege-taste').innerText()), 'die Taste wird nicht genannt');
      gleich(await seite.locator('#quelle-buehne').evaluate((n) => n.classList.contains('wartet')), true, 'die Fläche ist nicht hervorgehoben');
      gleich(await seite.locator('#quelle-leer').isVisible(), false, 'zwei Hinweise gleichzeitig');
      gleich(await seite.evaluate(() => document.activeElement.id), 'quelle-buehne', 'der Fokus liegt nicht auf der Fläche');

      await fuegeBildEin(seite, pngAlsBase64);
      await seite.waitForFunction(() => document.getElementById('einfuege-hinweis').hidden);
      gleich(await seite.locator('#quelle-buehne').evaluate((n) => n.classList.contains('wartet')), false, 'die Bereitschaft bleibt stehen');
    },
    {
      hash: AUFNAHME,
      initSkript: `Object.defineProperty(document, 'featurePolicy', {
        configurable: true,
        value: { allowsFeature: (name) => name !== 'display-capture' }
      });`
    }
  ));

/* --------------------------------------------------- Kompakter Aufnahmemodus */

/**
 * Stellt eine Bildschirmfreigabe nach: ein Leinwand-Datenstrom liefert echte
 * Bilder, damit der Live-Pfad vom Video bis zum Ausschnitt geprüft wird.
 */
const bildschirmNachbau = `
  const leinwand = document.createElement('canvas');
  leinwand.width = 1280; leinwand.height = 720;
  const stift = leinwand.getContext('2d');
  let takt = 0;
  const male = () => {
    stift.fillStyle = takt++ % 2 ? '#2c6fa8' : '#b4432b';
    stift.fillRect(0, 0, 1280, 720);
    stift.fillStyle = '#ffffff';
    stift.fillRect(40, 40, 400, 120);
  };
  male();
  setInterval(male, 100);
  window.__strom = leinwand.captureStream(10);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getDisplayMedia: async () => window.__strom }
  });
`;

s.test('die Bildschirmfreigabe liefert eine laufende Quelle', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.getElementById('quelle-masse').textContent === '1280 × 720', null, { timeout: 8000 });
      wahr((await seite.locator('#quelle-name').innerText()).startsWith('Bildschirm'), 'die Quelle wird nicht als Bildschirm geführt');
      gleich(await seite.locator('#ausschnitt-masse').innerText(), 'x 0 · y 0 · 1280 × 720');
      gleich(await seite.locator('#ausloesen').isDisabled(), false);
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('die Freigabe zieht die Ansicht auf die Leiste rechts zusammen', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.evaluate(() => document.body.classList.contains('kompakt')), false, 'die Ansicht startet zusammengezogen');
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });

      gleich(await seite.locator('.portal-nav').isVisible(), false, 'die Navigation nimmt weiter Platz');
      gleich(await seite.locator('#kennzahlen').isVisible(), false);
      gleich(await seite.locator('.unterzeile').isVisible(), false);
      const buehne = await seite.locator('#quelle-buehne').boundingBox();
      const spalte = await seite.locator('.metadaten-spalte').boundingBox();
      wahr(spalte.width <= 290, `die Leiste ist mit ${Math.round(spalte.width)} px nicht schmal`);
      wahr(buehne.width > spalte.width * 3, 'die Live-Ansicht bekommt nicht den Platz');
      wahr(buehne.height > 400, `die Live-Ansicht ist mit ${Math.round(buehne.height)} px zu klein`);
      gleich(await seite.locator('#kompakt-schalter').innerText(), 'Ansicht zurück');
      gleich(await seite.evaluate(() => document.activeElement.id), 'quelle-buehne', 'der Fokus liegt nicht auf der Fläche');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('aus der laufenden Freigabe lassen sich Bilder in Serie aufnehmen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.fill('#feld-titel', 'Erster Ausschnitt');
      await seite.click('.preset button[data-preset="tablet"]');
      const ausschnitt = await seite.locator('#ausschnitt-masse').innerText();

      await seite.locator('#quelle-buehne').focus();
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.keyboard.press('Space');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '2');

      gleich(await seite.locator('#ausschnitt-masse').innerText(), ausschnitt, 'der Ausschnitt bleibt nicht stehen');
      const liste = await eingangImSpeicher(seite);
      gleich(liste.length, 2);
      gleich(liste[0].quelle.art, 'bildschirm', 'die Herkunft wird nicht festgehalten');
      // Das Tablet-Format (1024 × 768) passt nicht in die 720 Bildpunkte hohe
      // Quelle und wird mittig auf 960 × 720 heruntergerechnet.
      gleich(liste[0].ausschnitt.breite, 960);
      gleich(liste[0].ausschnitt.hoehe, 720);
      gleich(liste[1].projekt, 'oneSCM Portal');
      wahr(liste[0].bild.startsWith('data:image/jpeg;base64,'), 'kein Bild aus dem Datenstrom');
      wahr(liste[0].bild.length > 2000, 'das Bild ist verdächtig klein');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('der Auslöseblitz bleibt nicht über der Live-Ansicht liegen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await seite.waitForFunction(() => !document.getElementById('quelle-buehne').classList.contains('blitzt'), null, {
        timeout: 3000
      });
      // Ohne die Klasse gibt es kein Pseudo-Element; geprüft wird der Ruhewert,
      // den die Fläche nach dem Auslaufen der Animation annimmt.
      const ruhe = await seite.evaluate(() => {
        const buehne = document.getElementById('quelle-buehne');
        buehne.classList.add('blitzt');
        buehne.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        const deckung = getComputedStyle(buehne, '::after').opacity;
        buehne.classList.remove('blitzt');
        return deckung;
      });
      wahr(Number(ruhe) < 0.05, `die Blitzfläche kommt bei Deckung ${ruhe} zur Ruhe und verdeckt die Live-Ansicht`);
      gleich(await seite.locator('#quelle-leinwand').isVisible(), true, 'die Live-Ansicht ist verdeckt');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('eine undurchsichtige Datenstrom-Kennung wird nicht als Name gezeigt', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      gleich(await seite.locator('#quelle-name').innerText(), 'Bildschirm: Geteilter Bildschirm');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

/** Liest die Maße des Ausschnitts aus der Anzeige. */
async function liesAusschnitt(seite) {
  const text = await seite.locator('#ausschnitt-masse').innerText();
  const werte = text.match(/x (\d+) · y (\d+) · (\d+) × (\d+)/);
  wahr(werte, 'die Maße sind nicht lesbar: ' + text);
  return { x: +werte[1], y: +werte[2], breite: +werte[3], hoehe: +werte[4] };
}

/** Zieht mit gedrückter Maustaste von einem Punkt zum anderen. */
async function ziehe(seite, vonX, vonY, nachX, nachY) {
  await seite.mouse.move(vonX, vonY);
  await seite.mouse.down();
  await seite.mouse.move(nachX, nachY, { steps: 10 });
  await seite.mouse.up();
}

s.test('der Ausschnitt lässt sich im Kompaktmodus frei ziehen, schieben und an der Ecke fassen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      const leinwand = await seite.locator('#quelle-leinwand').boundingBox();
      // Bildpunkte der Quelle je Bildpunkt am Schirm
      const faktor = 1280 / leinwand.width;
      const nahe = (ist, soll, spanne, was) =>
        wahr(Math.abs(ist - soll) <= spanne, `${was}: ${Math.round(ist)} statt ${Math.round(soll)} (±${spanne})`);

      // 1. Frei aufziehen - zu Beginn deckt die Auswahl die ganze Quelle,
      //    ein Zug darin zieht deshalb einen neuen Ausschnitt auf.
      await ziehe(seite, leinwand.x + 80, leinwand.y + 60, leinwand.x + 380, leinwand.y + 260);
      const gezogen = await liesAusschnitt(seite);
      nahe(gezogen.x, 80 * faktor, 12, 'linke Kante');
      nahe(gezogen.y, 60 * faktor, 12, 'obere Kante');
      nahe(gezogen.breite, 300 * faktor, 16, 'Breite');
      nahe(gezogen.hoehe, 200 * faktor, 16, 'Höhe');

      // 2. Verschieben: Zug in der Mitte des Rahmens
      const rahmen = await seite.locator('#ausschnitt-rahmen').boundingBox();
      await ziehe(
        seite,
        rahmen.x + rahmen.width / 2,
        rahmen.y + rahmen.height / 2,
        rahmen.x + rahmen.width / 2 + 90,
        rahmen.y + rahmen.height / 2 + 50
      );
      const geschoben = await liesAusschnitt(seite);
      nahe(geschoben.x, gezogen.x + 90 * faktor, 12, 'Verschiebung waagerecht');
      nahe(geschoben.y, gezogen.y + 50 * faktor, 12, 'Verschiebung senkrecht');
      gleich(geschoben.breite, gezogen.breite, 'die Größe hat sich beim Schieben geändert');
      gleich(geschoben.hoehe, gezogen.hoehe, 'die Höhe hat sich beim Schieben geändert');

      // 3. Ecke fassen: rechte untere Ecke nach außen ziehen
      const ecke = await seite.locator('.griff-punkt[data-ecke="ru"]').boundingBox();
      await ziehe(seite, ecke.x + ecke.width / 2, ecke.y + ecke.height / 2, ecke.x + ecke.width / 2 + 120, ecke.y + ecke.height / 2 + 70);
      const gefasst = await liesAusschnitt(seite);
      nahe(gefasst.breite, geschoben.breite + 120 * faktor, 16, 'Breite nach dem Ziehen an der Ecke');
      nahe(gefasst.hoehe, geschoben.hoehe + 70 * faktor, 16, 'Höhe nach dem Ziehen an der Ecke');
      gleich(gefasst.x, geschoben.x, 'die linke Kante ist mitgewandert');

      // 4. Was gezogen wurde, wird auch aufgenommen
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      const [gespeichert] = await eingangImSpeicher(seite);
      gleich(gespeichert.ausschnitt.breite, gefasst.breite, 'die Aufnahme hat eine andere Breite als der Ausschnitt');
      gleich(gespeichert.ausschnitt.x, gefasst.x, 'die Aufnahme sitzt an einer anderen Stelle');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('der Ausschnitt bleibt beim Ziehen innerhalb der Quelle', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      const leinwand = await seite.locator('#quelle-leinwand').boundingBox();
      // Weit über den rechten unteren Rand hinaus ziehen
      await ziehe(
        seite,
        leinwand.x + leinwand.width - 60,
        leinwand.y + leinwand.height - 40,
        leinwand.x + leinwand.width + 400,
        leinwand.y + leinwand.height + 300
      );
      const a = await liesAusschnitt(seite);
      wahr(a.x + a.breite <= 1280, `der Ausschnitt ragt rechts hinaus: ${a.x} + ${a.breite}`);
      wahr(a.y + a.hoehe <= 720, `der Ausschnitt ragt unten hinaus: ${a.y} + ${a.hoehe}`);
      wahr(a.breite >= 32 && a.hoehe >= 32, 'der Ausschnitt ist unter die Mindestgröße gerutscht');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('die Leiste zeigt die zuletzt aufgenommene Aufnahme', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#letzte-aufnahme').isVisible(), false, 'der Block steht ungefragt da');
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      await seite.click('#ausloesen');
      await seite.waitForSelector('#letzte-aufnahme:not([hidden])');
      wahr((await seite.locator('#letzte-kennung').innerText()).startsWith('AUF-'), 'keine Kennung');
      wahr((await seite.locator('#letzte-zahl').innerText()).includes('1'), 'kein Zähler');
      wahr((await seite.locator('#letzte-vorschau').getAttribute('src')).startsWith('data:image/jpeg'), 'keine Vorschau');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('die zusammengezogene Ansicht lässt sich wieder aufziehen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      await seite.keyboard.press('Escape');
      await seite.waitForFunction(() => !document.body.classList.contains('kompakt'));
      gleich(await seite.locator('.portal-nav').isVisible(), true, 'die Navigation bleibt verborgen');
      gleich(await seite.locator('#kompakt-schalter').innerText(), 'Kompakt');

      await seite.click('#kompakt-schalter');
      gleich(await seite.evaluate(() => document.body.classList.contains('kompakt')), true, 'der Schalter zieht nicht zusammen');
      await seite.click('#kompakt-schalter');
      gleich(await seite.evaluate(() => document.body.classList.contains('kompakt')), false, 'der Schalter zieht nicht auf');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('das Ende der Freigabe zieht die Ansicht wieder auf', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      await seite.evaluate(() => window.__strom.getVideoTracks()[0].dispatchEvent(new Event('ended')));
      await seite.waitForFunction(() => !document.body.classList.contains('kompakt'));
      wahr((await seite.locator('#aufnahme-meldung').innerText()).includes('beendet'), 'das Ende wird nicht gemeldet');
      gleich(await seite.locator('#ausloesen').isDisabled(), true, 'ohne Quelle bleibt der Auslöser bedienbar');
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

s.test('ein Wechsel in eine andere Ansicht zieht die Leiste wieder auf', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-bildschirm');
      await seite.waitForFunction(() => document.body.classList.contains('kompakt'), null, { timeout: 8000 });
      await seite.evaluate(() => (location.hash = '#ans=eingang'));
      await seite.waitForFunction(() => !document.body.classList.contains('kompakt'));
      gleich(await seite.locator('#eingang-ansicht').isVisible(), true);
    },
    { hash: AUFNAHME, initSkript: bildschirmNachbau }
  ));

/* ------------------------------------------------- Fehlerwege des Auslösers */

s.test('voller Browserspeicher nimmt die Aufnahme zurück und sagt es', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.includes('voll'), null, { timeout: 5000 });
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(meldung.includes('Kontaktbogen'), 'es fehlt der Rat, was zu tun ist: ' + meldung);
      gleich(await seite.locator('#eingang-zahl').isHidden(), true, 'der Zähler zählt eine nicht gespeicherte Aufnahme');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('.eingang-karte').count(), 0, 'die Aufnahme steht trotz vollem Speicher im Eingang');
    },
    {
      hash: AUFNAHME,
      initSkript: `const alt = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k === 'screenarchiv:eingang') { const f = new Error('voll'); f.name = 'QuotaExceededError'; throw f; }
          return alt.call(this, k, v);
        };`
    }
  ));

s.test('gesperrter Speicher behält die Aufnahme für die Sitzung', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.fill('#feld-titel', 'Trotzdem da');
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1', null, { timeout: 5000 });
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(meldung.includes('Sitzung'), 'die Einschränkung wird nicht benannt: ' + meldung);
      wahr(!meldung.includes('voll'), 'gesperrter Speicher wird als voll gemeldet');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('.eingang-karte').count(), 1, 'die Aufnahme ging verloren, obwohl sie im Fenster bleiben kann');
      wahr((await seite.locator('#eingang-meldung').innerText()).includes('Kontaktbogen'), 'kein Rat zum Sichern');
    },
    {
      hash: AUFNAHME,
      initSkript: `Storage.prototype.setItem = function () { const f = new Error('gesperrt'); f.name = 'SecurityError'; throw f; };`
    }
  ));

s.test('verweigertes Ausschneiden nennt den Weg, der geht', () =>
  mitSeite(
    async (seite) => {
      await mitBeispielquelle(seite);
      await seite.click('#ausloesen');
      await seite.waitForFunction(() => document.getElementById('aufnahme-meldung').textContent.length > 0);
      const meldung = await seite.locator('#aufnahme-meldung').innerText();
      wahr(meldung.includes('Bildschirmfoto einfügen'), 'kein gangbarer Weg genannt: ' + meldung);
      wahr(!/Tainted|SecurityError/.test(meldung), 'die Meldung wirft mit Fachbegriffen: ' + meldung);
      gleich((await eingangImSpeicher(seite)).length, 0);
    },
    {
      hash: AUFNAHME,
      initSkript: `HTMLCanvasElement.prototype.toDataURL = function () {
        const f = new Error('Tainted canvases may not be exported.'); f.name = 'SecurityError'; throw f;
      };`
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

/* --------------------------------------------------------- Kontaktbogen */

/**
 * Baut eine Ablagefähigkeit nach, die jede Übergabe festhält.
 * `fehler` lässt sie stattdessen mit dem angegebenen Code scheitern.
 * Rückgabe ist Quelltext - eine gebundene Funktion überstünde die Übergabe an
 * den Browser nicht.
 */
const ablageNachbau = (fehler) => `
  window.__abgelegt = [];
  window.claude = {
    use: async (name) => {
      if (name !== 'downloads') return null;
      return {
        save: async (auftrag) => {
          window.__abgelegt.push({ filename: auftrag.filename, data: String(auftrag.data) });
          ${fehler ? `const f = new Error('abgelehnt'); f.code = ${JSON.stringify(fehler)}; throw f;` : ''}
          return { status: 'saved' };
        }
      };
    }
  };
`;

/** Legt zwei Aufnahmen an, eine davon vollständig. */
async function zweiAufnahmen(seite) {
  await mitBeispielquelle(seite);
  await seite.fill('#feld-projekt', 'oneSCM Portal');
  await seite.fill('#feld-titel', 'Vollständige Aufnahme');
  await seite.selectOption('#feld-kategorie', 'Layout');
  await seite.fill('#feld-begriffe', 'raster, dichte');
  await seite.click('#ausloesen');
  await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
  await seite.fill('#feld-titel', 'Offene Aufnahme');
  await seite.selectOption('#feld-kategorie', '');
  await seite.fill('#feld-begriffe', '');
  await seite.click('#ausloesen');
  await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '2');
  await seite.click('.portal-nav button[data-ansicht="eingang"]');
}

s.test('der Kontaktbogen wird als eine HTML-Datei übergeben', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('#eingang-kontaktbogen');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 5000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(/^screenarchiv-kontaktbogen-\d{4}-\d{2}-\d{2}\.html$/.test(datei.filename), 'Dateiname: ' + datei.filename);
      wahr(datei.data.startsWith('<!doctype html>'), 'kein vollständiges Dokument');
      wahr(datei.data.includes('Vollständige Aufnahme') && datei.data.includes('Offene Aufnahme'), 'nicht alle Aufnahmen im Blatt');
      gleich((datei.data.match(/<img /g) || []).length, 2, 'nicht beide Bilder eingebettet');
      wahr(datei.data.includes('data:image/jpeg;base64,'), 'die Bilder sind nicht eingebettet');
      wahr(datei.data.includes('#raster'), 'die Begriffe fehlen');
      wahr(datei.data.includes('unvollständig'), 'die offene Aufnahme ist nicht markiert');
      wahr((await seite.locator('#eingang-meldung').innerText()).includes('gesichert'), 'keine Rückmeldung');
    },
    { hash: AUFNAHME, initSkript: ablageNachbau() }
  ));

s.test('der Kontaktbogen enthält nur die sichtbare Auswahl', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('.eingang-zustand button[data-zustand="offen"]');
      await seite.waitForFunction(() => document.querySelectorAll('.eingang-karte').length === 1);
      await seite.click('#eingang-kontaktbogen');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1);
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(datei.data.includes('Offene Aufnahme'), 'die gefilterte Aufnahme fehlt');
      wahr(!datei.data.includes('Vollständige Aufnahme'), 'eine ausgefilterte Aufnahme steht im Blatt');
      gleich((datei.data.match(/<img /g) || []).length, 1);
      wahr(datei.data.includes('1 von 2 Aufnahmen'), 'der Ausschnitt wird im Blatt nicht benannt');
    },
    { hash: AUFNAHME, initSkript: ablageNachbau() }
  ));

s.test('ein abgebrochenes Sichern wird gemeldet, nicht wiederholt', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('#eingang-kontaktbogen');
      await seite.waitForFunction(() => document.getElementById('eingang-meldung').textContent.includes('abgebrochen'), null, { timeout: 5000 });
      gleich(await seite.evaluate(() => window.__abgelegt.length), 1, 'die Übergabe wurde wiederholt');
      gleich(await seite.locator('#eingang-dialog').evaluate((n) => n.open), false, 'der Ersatzweg wird fälschlich angeboten');
    },
    { hash: AUFNAHME, initSkript: ablageNachbau('declined') }
  ));

s.test('ein abgelehntes Dateiformat stößt keinen Ersatzweg an', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('#eingang-kontaktbogen');
      await seite.waitForFunction(
        () => document.getElementById('eingang-meldung').textContent.toLowerCase().includes('dateiformat'),
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#eingang-dialog').evaluate((n) => n.open), false, 'nach einem abgelehnten Format erscheint der Ersatzweg');
    },
    { hash: AUFNAHME, initSkript: ablageNachbau('extension_not_enabled') }
  ));

s.test('ohne Ablagefähigkeit führt der Kontaktbogen zum Ersatzweg', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('#eingang-kontaktbogen');
      await seite.waitForSelector('#eingang-ausgabe');
      wahr(
        (await seite.locator('#eingang-dialog-inhalt .hinweis-archiv').innerText()).includes('Kontaktbogen'),
        'der Hinweis nennt den Kontaktbogen nicht'
      );
      const ausgabe = JSON.parse(await seite.inputValue('#eingang-ausgabe'));
      gleich(ausgabe.anzahl, 2);
    },
    { hash: AUFNAHME }
  ));

s.test('bei leerem Eingang ist das Sichern gesperrt', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#eingang-kontaktbogen').isDisabled(), true);
      gleich(await seite.locator('#eingang-sichern').isDisabled(), true);
    },
    { hash: '#ans=eingang' }
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
