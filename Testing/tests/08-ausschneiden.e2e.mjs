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
          getFile: async () => new File([e.blob], e.name, { type: 'image/png', lastModified: e.zeit })
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
