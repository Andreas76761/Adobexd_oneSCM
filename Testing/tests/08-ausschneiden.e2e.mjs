/**
 * Browserprüfung des Schnipsel-Modus: Ablageziele festlegen, Bildschirm
 * freigeben, Bereich aufziehen, beim Loslassen ablegen.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Ausschneiden – Oberfläche');

const SCHNEIDEN = '#ans=ausschneiden';

/** Bildschirmfreigabe durch einen Leinwand-Datenstrom vertreten. */
const bildschirm = `
  const l = document.createElement('canvas'); l.width = 1280; l.height = 800;
  const c = l.getContext('2d');
  let n = 0;
  const male = () => {
    c.fillStyle = n++ % 2 ? '#2c6fa8' : '#1f5f96'; c.fillRect(0, 0, 1280, 800);
    c.fillStyle = '#ffffff'; c.fillRect(60, 60, 500, 200);
  };
  male(); setInterval(male, 100);
  window.__strom = l.captureStream(10);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true, value: { getDisplayMedia: async () => window.__strom }
  });`;

/** Ordnerwahl nachbilden und jeden Schreibvorgang festhalten. */
const ordnerNachbau = `
  window.__geschrieben = [];
  window.__inhalt = [];
  const ordner = {
    name: 'Bildschirmfotos',
    queryPermission: async () => 'granted',
    getFileHandle: async (name) => ({
      createWritable: async () => ({
        write: async (blob) => {
          window.__geschrieben.push({ name, groesse: blob.size, typ: blob.type });
          window.__inhalt.push({ name, blob, zeit: Date.now() + window.__inhalt.length });
        },
        close: async () => {}
      })
    }),
    values: async function* () {
      for (const e of window.__inhalt) {
        yield {
          kind: 'file',
          name: e.name,
          getFile: async () => new File([e.blob], e.name, { type: e.blob.type, lastModified: e.zeit })
        };
      }
    }
  };
  window.showDirectoryPicker = async () => ordner;`;

/** Ablagefähigkeit nachbilden. */
const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size, typ: auftrag.data.type });
      return { status: 'saved' };
    } } };`;

const eingangImSpeicher = (seite) =>
  seite.evaluate(() => {
    const roh = localStorage.getItem('screenarchiv:eingang');
    return roh ? JSON.parse(roh).aufnahmen : [];
  });

/** Gibt frei und zieht einen Bereich auf; das Loslassen schneidet aus. */
async function ziehe(seite, x1, y1, x2, y2) {
  const m = await seite.locator('#schnipsel-leinwand').boundingBox();
  await seite.mouse.move(m.x + x1, m.y + y1);
  await seite.mouse.down();
  await seite.mouse.move(m.x + x2, m.y + y2, { steps: 10 });
  await seite.mouse.up();
}

async function starteFreigabe(seite) {
  await seite.click('#schnipsel-start');
  await seite.waitForSelector('#schnipsel-leinwand:not([hidden])', { timeout: 8000 });
}

/* -------------------------------------------------------------- Zugang */

s.test('die Navigation führt in die Ansicht Ausschneiden', () =>
  mitSeite(async (seite) => {
    await seite.click('.portal-nav button[data-ansicht="ausschneiden"]');
    gleich(await seite.locator('#schnipsel-ansicht').isVisible(), true);
    gleich(await seite.locator('#archiv-ansicht').isVisible(), false);
    wahr((await seite.evaluate(() => location.hash)).includes('ans=ausschneiden'), 'die Ansicht fehlt in der Adresse');
    gleich(await seite.locator('#schnipsel-leer').isVisible(), true, 'die Anleitung fehlt');
  }));

/* -------------------------------------------------------------- Ablage */

s.test('vorgegeben ist der Eingang, die Ziele stehen zur Wahl', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('.ablage-ziel').count(), 3);
      gleich(await seite.locator('#ziel-eingang').isChecked(), true);
      gleich(await seite.locator('#ziel-ordner').isChecked(), false);
      gleich(await seite.locator('#ziel-datei').isChecked(), false);
      gleich(await seite.locator('#schnipsel-ziel').innerText(), 'Eingang');
      gleich(await seite.locator('#schnipsel-start').isDisabled(), false);
    },
    { hash: SCHNEIDEN }
  ));

s.test('ohne Ziel ist das Ausschneiden gesperrt und erklärt sich', () =>
  mitSeite(
    async (seite) => {
      await seite.uncheck('#ziel-eingang');
      await seite.waitForSelector('#ablage-warnung:not([hidden])');
      gleich(await seite.locator('#schnipsel-start').isDisabled(), true);
      wahr((await seite.locator('#ablage-warnung').innerText()).includes('kein'), 'die Warnung nennt das Problem nicht');
      gleich(await seite.locator('#schnipsel-ziel').innerText(), 'kein Ziel');
      await seite.check('#ziel-eingang');
      gleich(await seite.locator('#schnipsel-start').isDisabled(), false, 'nach der Korrektur bleibt gesperrt');
    },
    { hash: SCHNEIDEN }
  ));

s.test('das Namensmuster zeigt sein Ergebnis sofort', () =>
  mitSeite(
    async (seite) => {
      wahr((await seite.locator('#muster-beispiel').innerText()).endsWith('.png'), 'kein Beispielname');
      await seite.fill('#ablage-muster', 'beleg-{nummer}-{datum}');
      await seite.waitForFunction(() =>
        document.getElementById('muster-beispiel').textContent.includes('beleg-001-')
      );
      const beispiel = await seite.locator('#muster-beispiel').innerText();
      wahr(/beleg-001-\d{4}-\d{2}-\d{2}\.png$/.test(beispiel), 'das Beispiel stimmt nicht: ' + beispiel);
    },
    { hash: SCHNEIDEN }
  ));

s.test('die Ablageeinstellung überlebt das Neuladen, der Ordner nicht', () =>
  mitSeite(
    async (seite) => {
      await seite.check('#ziel-datei');
      await seite.uncheck('#ziel-eingang');
      await seite.fill('#ablage-muster', 'schnipsel-{zeit}');
      // click statt check: die Wahl läuft über den Ordnerdialog, das Kästchen
      // wird erst nach dessen Antwort gesetzt.
      await seite.locator('#ziel-ordner').click();
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });

      await seite.reload({ waitUntil: 'domcontentloaded' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      gleich(await seite.locator('#ziel-datei').isChecked(), true, 'die Dateiwahl ging verloren');
      gleich(await seite.locator('#ziel-eingang').isChecked(), false);
      gleich(await seite.inputValue('#ablage-muster'), 'schnipsel-{zeit}');
      gleich(await seite.locator('#ziel-ordner').isChecked(), false, 'der Ordnerzugriff wurde fälschlich gemerkt');
    },
    { hash: SCHNEIDEN, initSkript: ordnerNachbau }
  ));

s.test('ohne Ordnerfreigabe im Browser wird das ehrlich gesagt', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('schnipsel-meldung').textContent.length > 0);
      const meldung = await seite.locator('#schnipsel-meldung').innerText();
      wahr(/Ordner/.test(meldung), 'die Meldung nennt das Problem nicht: ' + meldung);
      wahr(/Eingang|Einzeldatei/.test(meldung), 'es wird kein Ausweg genannt: ' + meldung);
      gleich(await seite.locator('#ziel-ordner').isChecked(), false);
    },
    {
      hash: SCHNEIDEN,
      initSkript: `Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: undefined });`
    }
  ));

/* --------------------------------------------------------- Ausschneiden */

s.test('ein aufgezogener Bereich wird beim Loslassen ausgeschnitten', () =>
  mitSeite(
    async (seite) => {
      await starteFreigabe(seite);
      wahr((await seite.locator('#schnipsel-meldung').innerText()).includes('aufziehen'), 'keine Anleitung nach dem Start');
      gleich(await seite.locator('#schnipsel-ende').isVisible(), true);
      gleich(await seite.locator('#schnipsel-start').isDisabled(), true, 'der Start bleibt bedienbar');

      await ziehe(seite, 40, 30, 340, 230);
      await seite.waitForFunction(() => document.getElementById('schnipsel-meldung').textContent.includes('Ausgeschnitten'), null, { timeout: 5000 });

      const [aufnahme] = await eingangImSpeicher(seite);
      wahr(aufnahme, 'nichts im Eingang');
      gleich(aufnahme.quelle.art, 'bildschirm');
      wahr(aufnahme.ausschnitt.breite > 200, 'der Bereich ist zu klein geraten: ' + aufnahme.ausschnitt.breite);
      wahr(aufnahme.bild.startsWith('data:image/jpeg;base64,'), 'kein Bild abgelegt');
      gleich(await seite.locator('#eingang-zahl').innerText(), '1', 'der Zähler in der Navigation zählt nicht');
      gleich(await seite.locator('#schnipsel-letzte').isVisible(), true, 'die Rückmeldung fehlt');
      wahr((await seite.locator('#schnipsel-zahl').innerText()).includes('Eingang'), 'das Ziel wird nicht genannt');
      gleich(await seite.locator('#schnipsel-rahmen').isVisible(), false, 'der Rahmen bleibt stehen');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm }
  ));

s.test('mehrere Schnipsel hintereinander', () =>
  mitSeite(
    async (seite) => {
      await starteFreigabe(seite);
      await ziehe(seite, 30, 30, 230, 180);
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');
      await ziehe(seite, 260, 200, 520, 400);
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '2');
      const liste = await eingangImSpeicher(seite);
      gleich(liste.length, 2);
      wahr(liste[0].ausschnitt.x > liste[1].ausschnitt.x, 'der zweite Bereich liegt nicht weiter rechts');
      wahr((await seite.locator('#schnipsel-zahl').innerText()).includes('2 Aufnahmen'), 'der Zähler stimmt nicht');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm }
  ));

s.test('der Schnipsel landet im gewählten Ordner', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      wahr((await seite.locator('#schnipsel-ziel').innerText()).includes('Bildschirmfotos'), 'der Ordner wird nicht genannt');

      await starteFreigabe(seite);
      await ziehe(seite, 40, 40, 300, 240);
      // Bild und Beipackzettel: zwei Dateien je Schnipsel
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });
      const [datei, zettel] = await seite.evaluate(() => window.__geschrieben);
      gleich(datei.name, 'schirm-001.png', 'der Dateiname folgt nicht dem Muster');
      gleich(datei.typ, 'image/png', 'in den Ordner wird kein PNG geschrieben');
      wahr(datei.groesse > 1000, 'die Datei ist verdächtig klein');
      gleich(zettel.name, 'schirm-001.json', 'der Beipackzettel heißt nicht wie das Bild');
      gleich(zettel.typ, 'application/json');
      wahr((await seite.locator('#schnipsel-zahl').innerText()).includes('Bildschirmfotos/schirm-001.png'), 'das Ziel wird nicht genannt');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('der Schnipsel lässt sich als einzelne Datei sichern', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'einzeln-{nummer}');
      await seite.check('#ziel-datei');
      await seite.uncheck('#ziel-eingang');
      await starteFreigabe(seite);
      await ziehe(seite, 50, 50, 350, 250);
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 2, null, { timeout: 5000 });
      const [datei, zettel] = await seite.evaluate(() => window.__abgelegt);
      gleich(datei.filename, 'einzeln-001.png');
      gleich(datei.typ, 'image/png');
      gleich(zettel.filename, 'einzeln-001.json', 'der Beipackzettel fehlt beim Sichern');
      gleich((await eingangImSpeicher(seite)).length, 0, 'trotz abgewähltem Eingang wurde dort abgelegt');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ablageNachbau }
  ));

s.test('mehrere Ziele zugleich', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'beides-{nummer}');
      await seite.check('#ziel-datei');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 40, 320, 260);
      await seite.waitForFunction(
        () => (window.__geschrieben || []).length === 2 && (window.__abgelegt || []).length === 2,
        null,
        { timeout: 5000 }
      );
      gleich((await eingangImSpeicher(seite)).length, 1, 'der Eingang ging leer aus');
      const meldung = await seite.locator('#schnipsel-meldung').innerText();
      wahr(meldung.includes('Eingang') && meldung.includes('beides-001.png'), 'nicht alle Ziele gemeldet: ' + meldung);
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau + ablageNachbau }
  ));

/* --------------------------------------------------------------- Ende */

s.test('Esc beendet das Ausschneiden und hält den Datenstrom an', () =>
  mitSeite(
    async (seite) => {
      await starteFreigabe(seite);
      await seite.keyboard.press('Escape');
      await seite.waitForFunction(() => document.getElementById('schnipsel-leinwand').hidden);
      gleich(await seite.locator('#schnipsel-start').isDisabled(), false, 'ein neuer Start ist nicht möglich');
      gleich(await seite.locator('#schnipsel-ende').isVisible(), false);
      gleich(
        await seite.evaluate(() => window.__strom.getVideoTracks()[0].readyState),
        'ended',
        'der Datenstrom läuft weiter'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm }
  ));

s.test('ein Ansichtswechsel beendet die Freigabe', () =>
  mitSeite(
    async (seite) => {
      await starteFreigabe(seite);
      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForFunction(() => window.__strom.getVideoTracks()[0].readyState === 'ended');
      gleich(await seite.locator('.karte').count(), 16, 'das Archiv zeichnet nicht');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm }
  ));

s.test('das Ende der Freigabe von außen wird bemerkt', () =>
  mitSeite(
    async (seite) => {
      await starteFreigabe(seite);
      await seite.evaluate(() => window.__strom.getVideoTracks()[0].dispatchEvent(new Event('ended')));
      await seite.waitForFunction(() => document.getElementById('schnipsel-leinwand').hidden);
      gleich(await seite.locator('#schnipsel-leer').isVisible(), true, 'die Anleitung kommt nicht zurück');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm }
  ));

/* ------------------------------------------------------- Beipackzettel */

s.test('der Beipackzettel trägt alle Metadaten', () =>
  mitSeite(
    async (seite) => {
      // Metadaten kommen aus der Ansicht Aufnahme
      await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
      await seite.fill('#feld-titel', 'Preisspalte zu schmal');
      await seite.fill('#feld-projekt', 'Lieferanten-Cockpit');
      await seite.fill('#feld-seite', '/cockpit/positionen');
      await seite.fill('#feld-autor', 'M. Ackermann');
      await seite.selectOption('#feld-kategorie', 'Layout');
      await seite.fill('#feld-begriffe', '#Spaltenbreite, preis, SPALTENBREITE');
      await seite.fill('#feld-notiz', 'Bei 1280 px abgeschnitten');
      await seite.fill('#feld-datum', '2026-08-31');

      await seite.click('.portal-nav button[data-ansicht="ausschneiden"]');
      await seite.fill('#ablage-muster', 'beleg-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 40, 340, 260);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });

      const inhalt = await seite.evaluate(async () => {
        const eintrag = window.__inhalt.find((e) => e.name.endsWith('.json'));
        return await eintrag.blob.text();
      });
      const zettel = JSON.parse(inhalt);
      gleich(zettel.bild, 'beleg-001.png', 'der Zettel nennt das Bild nicht');
      gleich(zettel.titel, 'Preisspalte zu schmal');
      gleich(zettel.projekt, 'Lieferanten-Cockpit');
      gleich(zettel.seite, '/cockpit/positionen');
      gleich(zettel.kategorie, 'Layout');
      gleich(zettel.autor, 'M. Ackermann');
      gleich(zettel.datum, '2026-08-31');
      gleich(zettel.notiz, 'Bei 1280 px abgeschnitten');
      gleich(zettel.begriffe.join(','), 'spaltenbreite,preis', 'Begriffe nicht vereinheitlicht');
      gleich(zettel.quelle.art, 'bildschirm');
      wahr(zettel.ausschnitt.breite > 100, 'die Ausschnittmaße fehlen');
      wahr(String(zettel.erzeugt_von).startsWith('Screenarchiv 1.'), 'die Anwendung wird nicht genannt: ' + zettel.erzeugt_von);
      wahr(String(zettel.erfasst_am).includes('T'), 'kein Zeitpunkt');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('ohne Beipackzettel bleibt es bei einer Datei', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await seite.uncheck('#ablage-beipack');
      await starteFreigabe(seite);
      await ziehe(seite, 40, 40, 300, 240);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 1, null, { timeout: 5000 });
      await seite.waitForTimeout(300);
      gleich(await seite.evaluate(() => window.__geschrieben.length), 1, 'trotz Abwahl wurde ein Zettel geschrieben');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('die Zeile zum Beipackzettel erscheint nur bei Datei-Zielen', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#beipack-zeile').isVisible(), false, 'die Zeile steht ohne Dateiziel da');
      await seite.check('#ziel-datei');
      await seite.waitForSelector('#beipack-zeile:not([hidden])');
      gleich(await seite.locator('#ablage-beipack').isChecked(), true, 'der Zettel ist nicht voreingestellt');
      wahr((await seite.locator('#beipack-beispiel').innerText()).endsWith('.json'), 'kein Beispielname');
    },
    { hash: SCHNEIDEN }
  ));

/* --------------------------------------------------- Sichtbarkeit im Archiv */

s.test('aufgenommene Bilder erscheinen im Archiv als eigenes Band', () =>
  mitSeite(
    async (seite) => {
      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      gleich(await seite.locator('#eigene-aufnahmen').isVisible(), false, 'das Band steht ohne Aufnahmen da');

      await seite.click('.portal-nav button[data-ansicht="ausschneiden"]');
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 320, 230);
      await seite.waitForFunction(() => document.getElementById('eingang-zahl').textContent === '1');

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#eigene-aufnahmen:not([hidden])');
      wahr((await seite.locator('#eigene-stand').innerText()).includes('1 Aufnahme'), 'der Stand fehlt');
      gleich(await seite.locator('#eigene-streifen .streifen-bild').count(), 1);
      wahr(
        (await seite.locator('#eigene-streifen img').getAttribute('src')).startsWith('data:image/jpeg'),
        'die Vorschau fehlt'
      );
      wahr((await seite.locator('#eigene-aufnahmen').innerText()).includes('nicht im Belegbestand'), 'der Unterschied wird nicht erklärt');
      gleich(await seite.locator('.karte').count(), 16, 'der Belegbestand hat sich verändert');

      await seite.click('#eigene-streifen .streifen-bild');
      gleich(await seite.locator('#eingang-ansicht').isVisible(), true, 'der Klick führt nicht in den Eingang');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm }
  ));

s.test('das Archiv zeigt den Inhalt des gewählten Ordners', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });
      await ziehe(seite, 60, 60, 360, 300);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 4, null, { timeout: 5000 });

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      gleich(await seite.locator('#ordner-name').innerText(), 'Bildschirmfotos');
      await seite.waitForFunction(() => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 2, null, { timeout: 5000 });
      const namen = await seite.locator('#ordner-streifen .kennung').allInnerTexts();
      gleich(namen.join('|'), 'schirm-002.png|schirm-001.png', 'die neuesten stehen nicht vorn');
      wahr((await seite.locator('#ordner-stand').innerText()).includes('2 Bilder'), 'der Stand stimmt nicht');
      wahr(
        (await seite.locator('#ordner-streifen img').first().getAttribute('src')).startsWith('data:image/png'),
        'die Vorschau kommt nicht aus der Datei'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('das Archiv zeigt den Beipackzettel der Ordnerdatei', () =>
  mitSeite(
    async (seite) => {
      // Metadaten kommen aus der Ansicht Aufnahme
      await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
      await seite.fill('#feld-titel', 'Kopfzeile ohne Kontrast');
      await seite.fill('#feld-begriffe', 'kontrast, kopfzeile');
      await seite.click('.portal-nav button[data-ansicht="ausschneiden"]');

      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 1,
        null,
        { timeout: 5000 }
      );
      const namen = await seite.locator('#ordner-streifen .kennung').allInnerTexts();
      gleich(namen.join('|'), 'schirm-001.png', 'die .json darf keine eigene Kachel bekommen');
      gleich(await seite.locator('#ordner-streifen .zettel-marke').innerText(), 'Zettel');
      wahr(
        (await seite.locator('#ordner-stand').innerText()).includes('Beipackzettel'),
        'der Stand nennt den Zettel nicht'
      );

      gleich(await seite.locator('#ordner-zettel').isVisible(), false, 'der Zettel steht ungefragt offen');
      await seite.click('#ordner-streifen .streifen-bild');
      await seite.waitForSelector('#ordner-zettel:not([hidden])');
      gleich(await seite.locator('#zettel-datei').innerText(), 'schirm-001.json');
      gleich(await seite.locator('#zettel-warnung').isVisible(), false, 'ein eigener Zettel wird beanstandet');

      const zeilen = await seite.evaluate(() => {
        const paare = {};
        const liste = document.getElementById('zettel-liste');
        const dts = [...liste.querySelectorAll('dt')];
        for (const dt of dts) paare[dt.textContent] = dt.nextElementSibling.textContent;
        return paare;
      });
      gleich(zeilen.Bild, 'schirm-001.png');
      gleich(zeilen.Titel, 'Kopfzeile ohne Kontrast');
      gleich(zeilen.Begriffe, 'kontrast, kopfzeile');
      wahr(/px ab /.test(zeilen.Ausschnitt), 'der Ausschnitt fehlt: ' + zeilen.Ausschnitt);
      gleich(zeilen.Autor, '—', 'ein leeres Feld wird nicht als leer gezeigt');

      // Das Original stammt aus der Datei, nicht aus dem Gedaechtnis der Seite.
      await seite.click('.zettel-roh summary');
      const roh = await seite.locator('#zettel-quelltext').innerText();
      const geschrieben = await seite.evaluate(async () => {
        const treffer = window.__inhalt.find((e) => e.name.endsWith('.json'));
        return await treffer.blob.text();
      });
      gleich(JSON.parse(roh).titel, JSON.parse(geschrieben).titel);

      await seite.click('#zettel-zu');
      await seite.waitForFunction(() => document.getElementById('ordner-zettel').hidden, null, { timeout: 5000 });
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('eine Ordnerdatei wird samt Zettel in den Eingang übernommen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
      await seite.fill('#feld-titel', 'Kopfzeile ohne Kontrast');
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.selectOption('#feld-kategorie', 'Barrierefreiheit');
      await seite.fill('#feld-begriffe', 'kontrast, kopfzeile');
      await seite.click('.portal-nav button[data-ansicht="ausschneiden"]');
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });

      // Nur in den Ordner ablegen - der Eingang bleibt leer, bis uebernommen wird.
      await seite.uncheck('#ziel-eingang');
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });
      gleich((await eingangImSpeicher(seite)).length, 0, 'ohne Eingangsziel darf nichts im Eingang liegen');

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 1,
        null,
        { timeout: 5000 }
      );
      await seite.click('#ordner-streifen .streifen-bild');
      await seite.waitForSelector('#ordner-zettel:not([hidden])');
      gleich(
        await seite.locator('#zettel-uebernehmen').innerText(),
        'In den Eingang übernehmen'
      );

      await seite.click('#zettel-uebernehmen');
      await seite.waitForFunction(
        () => /AUF-/.test(document.getElementById('zettel-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      const liste = await eingangImSpeicher(seite);
      gleich(liste.length, 1, 'die Übernahme kommt nicht im Speicher an');
      const [aufnahme] = liste;
      gleich(aufnahme.titel, 'Kopfzeile ohne Kontrast');
      gleich(aufnahme.projekt, 'oneSCM Portal');
      gleich(aufnahme.kategorie, 'Barrierefreiheit');
      gleich(aufnahme.begriffe.join(','), 'kontrast,kopfzeile');
      gleich(aufnahme.herkunft.ordner, 'Bildschirmfotos');
      gleich(aufnahme.herkunft.datei, 'schirm-001.png');
      wahr(aufnahme.bild.startsWith('data:image/jpeg'), 'das Bild wird nicht als JPEG abgelegt');
      wahr(aufnahme.ausschnitt.breite > 0, 'die Ausschnittmaße des Zettels fehlen');

      // Kein zweites Mal: die Kachel traegt die Kennung, der Knopf fuehrt hin.
      await seite.waitForFunction(
        () => /Im Eingang zeigen/.test(document.getElementById('zettel-uebernehmen').textContent),
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#ordner-streifen .eingang-marke').innerText(), aufnahme.id);
      wahr(
        (await seite.locator('#eingang-zahl').innerText()).includes('1'),
        'die Navigation zählt die Übernahme nicht mit'
      );
      await seite.click('#zettel-uebernehmen');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      gleich((await eingangImSpeicher(seite)).length, 1, 'die Datei wurde ein zweites Mal übernommen');
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('nachgetragene Metadaten gehen in den Zettel im Ordner zurück', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });

      // Die Aufnahme im Eingang kennt ihre Datei im Ordner.
      const [vorher] = await eingangImSpeicher(seite);
      gleich(vorher.herkunft.datei, 'schirm-001.png', 'die Herkunft fehlt der Aufnahme');
      gleich(vorher.herkunft.zettel, 'schirm-001.json');
      gleich(vorher.kategorie, '', 'die Kategorie war beim Ausschneiden nicht gesetzt');

      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#eingang-dialog[open]');
      await seite.selectOption('#bearbeite-kategorie', 'Barrierefreiheit');
      await seite.fill('#bearbeite-begriffe', 'kontrast, nachgetragen');
      await seite.click('#bearbeite-zettel');
      await seite.waitForFunction(
        () => /neu geschrieben/.test(document.getElementById('bearbeite-meldung').textContent),
        null,
        { timeout: 5000 }
      );

      const zettel = await seite.evaluate(async () => {
        const treffer = window.__inhalt.filter((e) => e.name === 'schirm-001.json').pop();
        return JSON.parse(await treffer.blob.text());
      });
      gleich(zettel.kategorie, 'Barrierefreiheit', 'die Nachpflege steht nicht in der Datei');
      gleich(zettel.begriffe.join(','), 'kontrast,nachgetragen');
      gleich(zettel.bild, 'schirm-001.png', 'der Zettel verliert sein Bild');
      gleich(zettel.herkunft, undefined, 'die Herkunft gehört nicht in den Zettel');
      gleich(
        (await eingangImSpeicher(seite))[0].kategorie,
        'Barrierefreiheit',
        'der Eingang behält den alten Stand'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('ohne offenen Ordner sagt der Eingang, warum der Zettel nicht geht', () =>
  mitSeite(
    async (seite) => {
      // Eine Aufnahme mit Herkunft, aber ohne geoeffneten Ordner.
      await seite.evaluate(() => {
        const stand = {
          version: 1,
          aufnahmen: [
            {
              id: 'AUF-2026-001',
              titel: 'Aus einer früheren Sitzung',
              projekt: 'oneSCM Portal',
              kategorie: 'Layout',
              status: 'in Prüfung',
              rolle: 'einzeln',
              datum: '2026-01-05',
              begriffe: ['tabelle'],
              notiz: '',
              ausschnitt: { x: 0, y: 0, breite: 300, hoehe: 200 },
              quelle: { art: 'bildschirm', name: 'Freigabe', breite: 1440, hoehe: 900 },
              erfasst_am: '2026-01-05T08:00:00.000Z',
              bild: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
              herkunft: { ordner: 'Bildschirmfotos', datei: 'schirm-001.png', zettel: 'schirm-001.json' }
            }
          ]
        };
        localStorage.setItem('screenarchiv:eingang', JSON.stringify(stand));
      });
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#eingang-dialog[open]');
      gleich(await seite.locator('#bearbeite-zettel').count(), 0, 'ohne Ordner darf der Knopf nichts versprechen');
      const hinweis = await seite.locator('#bearbeite-zettel-hinweis').innerText();
      wahr(/Bildschirmfotos/.test(hinweis) && /Ausschneiden/.test(hinweis), 'der Hinweis nennt den Weg nicht: ' + hinweis);
    },
    { hash: SCHNEIDEN }
  ));

s.test('ein Bild ohne Zettel wird im Ordnerband als solches gezeigt', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await seite.waitForSelector('#beipack-zeile:not([hidden])');
      await seite.uncheck('#ablage-beipack');
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 1, null, { timeout: 5000 });

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 1,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#ordner-streifen .zettel-marke').innerText(), 'kein Zettel');
      gleich(
        await seite.evaluate(() => document.querySelector('#ordner-streifen .streifen-bild').tagName),
        'DIV',
        'ohne Zettel darf die Kachel nichts versprechen'
      );
      wahr(
        (await seite.locator('#ordner-stand').innerText()).includes('0 mit Beipackzettel'),
        'der Stand verschweigt den fehlenden Zettel'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('ein Zettel ohne Bild wird im Band gezeigt, nicht verschwiegen', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });
      // Das Bild verschwindet - von Hand verschoben, wie es im Alltag vorkommt.
      await seite.evaluate(() => {
        window.__inhalt = window.__inhalt.filter((e) => !e.name.endsWith('.png'));
      });

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild--zettel').length === 1,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#ordner-streifen .kennung').innerText(), 'schirm-001.json');
      gleich(await seite.locator('#ordner-streifen .zettel-marke--allein').innerText(), 'ohne Bild');
      wahr(
        (await seite.locator('#ordner-stand').innerText()).includes('1 Zettel ohne Bild'),
        'der Stand nennt den verwaisten Zettel nicht'
      );
      await seite.click('#ordner-streifen .streifen-bild--zettel');
      await seite.waitForSelector('#ordner-zettel:not([hidden])');
      gleich(await seite.locator('#zettel-datei').innerText(), 'schirm-001.json');
      gleich(
        await seite.locator('#zettel-uebernehmen').isVisible(),
        false,
        'ein Zettel ohne Bild darf keine Übernahme versprechen'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('die Zettelschau nimmt den Fokus, Esc gibt ihn zurück', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#ablage-muster', 'schirm-{nummer}');
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      await starteFreigabe(seite);
      await ziehe(seite, 40, 30, 300, 220);
      await seite.waitForFunction(() => (window.__geschrieben || []).length === 2, null, { timeout: 5000 });

      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 1,
        null,
        { timeout: 5000 }
      );
      await seite.click('#ordner-streifen .streifen-bild');
      await seite.waitForSelector('#ordner-zettel:not([hidden])');
      gleich(
        await seite.evaluate(() => document.activeElement.id),
        'ordner-zettel',
        'die Schau nimmt den Fokus nicht'
      );
      await seite.keyboard.press('Escape');
      await seite.waitForFunction(() => document.getElementById('ordner-zettel').hidden, null, { timeout: 5000 });
      gleich(
        await seite.evaluate(() => document.activeElement.dataset.datei),
        'schirm-001.png',
        'der Fokus kommt nicht an die Kachel zurück'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('das Ordnerband filtert und zeigt auf Wunsch mehr', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      // 14 Bilder unterschiedlichen Namens direkt in den Ordner legen.
      await seite.evaluate(() => {
        const bild = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
        for (let i = 1; i <= 14; i++) {
          const name = (i <= 4 ? 'beleg-' : 'schirm-') + String(i).padStart(3, '0') + '.png';
          window.__inhalt.push({ name, blob: bild, zeit: Date.now() + i });
        }
      });
      await seite.click('.portal-nav button[data-ansicht="archiv"]');
      await seite.waitForSelector('#ordner-band:not([hidden])');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 12,
        null,
        { timeout: 5000 }
      );
      wahr((await seite.locator('#ordner-stand').innerText()).includes('14 Bilder'), 'der Stand zählt falsch');
      wahr(
        (await seite.locator('#ordner-stand').innerText()).includes('neueste 12 gezeigt'),
        'der Stand verschweigt die Begrenzung'
      );
      gleich(await seite.locator('#ordner-mehr').isVisible(), true, 'ohne Knopf bleibt der Rest unerreichbar');

      await seite.click('#ordner-mehr');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 14,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#ordner-mehr').isVisible(), false, 'der Knopf bleibt, obwohl alles gezeigt wird');

      await seite.fill('#ordner-suche', 'beleg');
      await seite.waitForFunction(
        () => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 4,
        null,
        { timeout: 5000 }
      );
      wahr(
        (await seite.locator('#ordner-stand').innerText()).includes('4 von 14'),
        'der Stand nennt die Filterung nicht'
      );
    },
    { hash: SCHNEIDEN, initSkript: bildschirm + ordnerNachbau }
  ));

s.test('ohne gewählten Ordner bleibt das Ordnerband weg', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#ordner-band').isVisible(), false);
  }));

s.test('der gewählte Ordner wird für das nächste Mal gemerkt', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#ordner-waehlen');
      await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked, null, { timeout: 5000 });
      const gemerkt = await seite.evaluate(
        () =>
          new Promise((fertig) => {
            const anfrage = indexedDB.open('screenarchiv', 1);
            anfrage.onsuccess = () => {
              const holen = anfrage.result.transaction('zugriffe', 'readonly').objectStore('zugriffe').get('ordner');
              holen.onsuccess = () => fertig(holen.result ? holen.result.name : null);
              holen.onerror = () => fertig(null);
            };
            anfrage.onerror = () => fertig(null);
          })
      );
      gleich(gemerkt, 'Bildschirmfotos', 'der Ordner wurde nicht gemerkt');
    },
    {
      hash: SCHNEIDEN,
      // Ein Zugriff ohne Funktionen: nur so lässt sich der Nachbau in die
      // Datenbank kopieren. Echte Ordnerzugriffe sind dafür eigens vorgesehen.
      initSkript: `window.showDirectoryPicker = async () => ({ name: 'Bildschirmfotos' });`
    }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
