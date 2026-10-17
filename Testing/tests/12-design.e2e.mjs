/**
 * Browserprüfung des Designstudios: aus Bildern werden Blätter in
 * Druckauflösung – Quick Guide, One Pager, Releaseletter, Handbuchseite.
 */
import { join } from 'node:path';
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Design – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const DESIGN = '#ans=design';

const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size || String(auftrag.data).length });
      return { status: 'saved' };
    } } };`;

/** Das Studio steht zugeklappt in der Ansicht - zum Prüfen wird es geöffnet. */
async function oeffneStudio(seite) {
  await seite.evaluate(() => {
    document.getElementById('design-studio').open = true;
  });
}

/** Legt Aufnahmen an und ordnet sie Stellen im Handbuch zu. */
async function bilderMitStellen(seite, stellen) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  for (const stelle of stellen) {
    await seite.fill('#feld-titel', 'Schritt ' + stelle);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Formular');
    await seite.fill('#feld-begriffe', 'signatur');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(150);
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', stelle);
    await seite.evaluate(() => {
      document.getElementById('markier-labels').open = true;
    });
    await seite.selectOption('#label-sprache', 'de');
    await seite.selectOption('#label-rolle_label', 'dealer');
    await seite.waitForTimeout(150);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(250);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(120);
  }
  await seite.click('.portal-nav button[data-ansicht="design"]');
  await seite.waitForSelector('#design-ansicht:not([hidden])');
  await seite.waitForFunction(
    () => document.querySelectorAll('.design-blatt').length > 0,
    null,
    { timeout: 15000 }
  );
}

s.test('ohne Inhalt sagt das Studio, was fehlt', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#design-sichern').isDisabled(), true, 'ein leeres Blatt ließe sich sichern');
    wahr(
      (await seite.locator('#design-blaetter').innerText()).includes('Kein Inhalt'),
      'der Hinweis fehlt'
    );
  }, { hash: DESIGN }));

s.test('aus Bildern eines Kapitels entsteht ein Blatt in Druckauflösung', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2', '7.5.4']);
      wahr(
        (await seite.locator('#design-quelle').innerText()).includes('Kapitel · 7.5'),
        'das Kapitel steht nicht zur Wahl'
      );
      const masse = await seite.evaluate(() => {
        const c = document.querySelector('.design-blatt');
        return { breite: c.width, hoehe: c.height };
      });
      // Quick Guide ist A4 quer bei 300 dpi.
      gleich(masse.breite, 3508, 'die Blattbreite stimmt nicht');
      gleich(masse.hoehe, 2480);
      wahr(
        (await seite.locator('#design-meldung').innerText()).includes('3 Bilder'),
        'die Meldung zählt die Bilder nicht'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('jede Vorlage rechnet ihr eigenes Format und ihre Seitenzahl', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2', '7.5.4']);
      const gemessen = {};
      for (const vorlage of ['quickguide', 'onepager', 'releaseletter', 'handbuch']) {
        await seite.selectOption('#design-vorlage', vorlage);
        // Gerechnet wird nebenher - gewartet wird auf den Stand am Container.
        await seite.waitForFunction(
          (v) => document.getElementById('design-blaetter').dataset.vorlage === v,
          vorlage,
          { timeout: 20000 }
        );
        gemessen[vorlage] = await seite.evaluate(() => ({
          seiten: document.querySelectorAll('.design-blatt').length,
          breite: document.querySelector('.design-blatt').width,
          hoehe: document.querySelector('.design-blatt').height
        }));
      }
      gleich(gemessen.quickguide.breite > gemessen.quickguide.hoehe, true, 'der Quick Guide ist nicht quer');
      gleich(gemessen.handbuch.hoehe > gemessen.handbuch.breite, true, 'die Handbuchseite ist nicht hoch');
      gleich(gemessen.releaseletter.seiten, 2, 'der Releaseletter bricht nicht um');
      gleich(gemessen.handbuch.seiten, 1);
    },
    { hash: AUFNAHME }
  ));

s.test('die Texte aus dem Handbuch lassen sich abschalten', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.2']);
      await seite.selectOption('#design-vorlage', 'handbuch');
      await seite.waitForFunction(
        () => {
          const k = document.getElementById('design-blaetter').dataset;
          return k.vorlage === 'handbuch' && k.texte === 'ja';
        },
        null,
        { timeout: 20000 }
      );
      // Mit Texten steht mehr Dunkles auf dem Blatt als ohne.
      const dunkel = () =>
        seite.evaluate(() => {
          const c = document.querySelector('.design-blatt');
          const d = c.getContext('2d').getImageData(Math.round(c.width * 0.6), 0, Math.round(c.width * 0.38), c.height).data;
          let zahl = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i] < 128) zahl++;
          return zahl;
        });
      const mit = await dunkel();
      await seite.click('#design-texte');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.texte === 'nein',
        null,
        { timeout: 20000 }
      );
      const ohne = await dunkel();
      wahr(mit > ohne, `ohne Texte steht nicht weniger auf dem Blatt (${mit} / ${ohne})`);
    },
    { hash: AUFNAHME }
  ));

s.test('die Blätter lassen sich als Bilder und als HTML sichern', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await seite.selectOption('#design-vorlage', 'releaseletter');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'releaseletter',
        null,
        { timeout: 20000 }
      );
      await seite.click('#design-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length >= 1, null, { timeout: 15000 });
      const [erste] = await seite.evaluate(() => window.__abgelegt);
      wahr(/^releaseletter-/.test(erste.filename), 'der Name nennt die Vorlage nicht: ' + erste.filename);
      wahr(erste.groesse > 20000, 'das Blatt ist verdächtig klein');

      await seite.click('#design-html');
      await seite.waitForFunction(() => (window.__abgelegt || []).length >= 2, null, { timeout: 15000 });
      const html = await seite.evaluate(() => window.__abgelegt[window.__abgelegt.length - 1]);
      wahr(/\.html$/.test(html.filename), 'die HTML-Datei fehlt: ' + html.filename);
      wahr(
        /drucken/.test(await seite.locator('#design-meldung').innerText()),
        'der Weg zum PDF wird nicht genannt'
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('das Deckblatt kommt vor die Seiten und nennt den Inhalt', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      const vorher = await seite.locator('.design-blatt').count();
      await oeffneStudio(seite);
      await seite.fill('#design-titel', 'oneSCM – Vorlagen anlegen');
      await seite.fill('#design-untertitel', 'Quick Guide für Dealer');
      await seite.check('#design-deckblatt');
      await seite.waitForFunction(
        (zahl) => document.querySelectorAll('.design-blatt').length === zahl + 1,
        vorher,
        { timeout: 20000 }
      );
      const erste = await seite.locator('.design-rahmen figcaption').first().innerText();
      wahr(erste.startsWith('Deckblatt'), 'das Deckblatt steht nicht vorn: ' + erste);
      // Der Titel wird gedrosselt übernommen - erst wenn das Rechnen zur Ruhe
      // kommt, steht die Meldung endgültig da.
      await seite.waitForFunction(
        () => /mit Deckblatt/.test(document.getElementById('design-meldung').textContent),
        null,
        { timeout: 20000 }
      );

      // Die Einstellung überlebt das Neuladen.
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForFunction(
        () => document.querySelectorAll('.design-blatt').length > 0,
        null,
        { timeout: 20000 }
      );
      await oeffneStudio(seite);
      gleich(await seite.locator('#design-deckblatt').isChecked(), true);
      gleich(await seite.locator('#design-titel').inputValue(), 'oneSCM – Vorlagen anlegen');
      wahr(
        (await seite.locator('.design-rahmen figcaption').first().innerText()).startsWith('Deckblatt'),
        'nach dem Neuladen fehlt das Deckblatt: ' + (await seite.locator('.design-rahmen figcaption').first().innerText())
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Kopf- und Fußzeile lassen sich bestücken', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1']);
      await oeffneStudio(seite);
      // Jeder Teil ist ein Schalter; ohne Teile bleibt die Zeile leer.
      gleich(await seite.locator('#design-kopf-teile input').count(), 5);
      gleich(await seite.locator('#design-fuss-teile input').count(), 5);
      gleich(await seite.locator('#kopf-titel').isChecked(), true);
      gleich(await seite.locator('#kopf-kapitel').isChecked(), false);
      await seite.check('#kopf-kapitel');
      await seite.check('#fuss-hinweis');
      await seite.fill('#design-hinweis', 'Interne Unterlage');
      await seite.waitForTimeout(900);
      const gesichert = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:design');
        return roh ? JSON.parse(roh) : null;
      });
      wahr(gesichert.kopf.includes('kapitel'), 'die Kopfzeile merkt sich den Teil nicht');
      wahr(gesichert.fuss.includes('hinweis'));
      gleich(gesichert.hinweis, 'Interne Unterlage');
      // Die Folge der Teile ist die der Liste, nicht die des Anklickens.
      tieferGleich(gesichert.kopf, ['titel', 'kapitel', 'vorlage', 'seitenzahl']);
    },
    { hash: AUFNAHME }
  ));

s.test('eine eigene Vorlage lässt sich speichern, nutzen und löschen', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await oeffneStudio(seite);
      await seite.fill('#eigen-label', 'Schulungsblatt');
      await seite.fill('#eigen-spalten', '1');
      await seite.fill('#eigen-zeilen', '1');
      await seite.selectOption('#eigen-format', 'a4-quer');
      await seite.click('#eigen-sichern');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'eigen-schulungsblatt',
        null,
        { timeout: 20000 }
      );
      wahr(
        /gespeichert/.test(await seite.locator('#design-meldung').innerText()),
        'die Meldung zum Speichern fehlt: ' + (await seite.locator('#design-meldung').innerText())
      );
      // Ein Bild je Seite: aus zwei Bildern werden zwei Blätter.
      gleich(await seite.locator('.design-blatt').count(), 2);
      const masse = await seite.evaluate(() => {
        const c = document.querySelector('.design-blatt');
        return { breite: c.width, hoehe: c.height };
      });
      wahr(masse.breite > masse.hoehe, 'das Querformat der eigenen Vorlage greift nicht');
      wahr(
        (await seite.locator('#design-vorlage').innerText()).includes('Schulungsblatt (eigene)'),
        'die eigene Vorlage steht nicht in der Auswahl'
      );

      await seite.click('#eigen-loeschen');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'quickguide',
        null,
        { timeout: 20000 }
      );
      wahr(/gelöscht/.test(await seite.locator('#design-meldung').innerText()));
      gleich(await seite.locator('#eigen-loeschen').isDisabled(), true);
    },
    { hash: AUFNAHME }
  ));

s.test('das ganze Handbuch entsteht als eine HTML-Datei', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await oeffneStudio(seite);
      // Vor dem Rechnen steht da, was herauskäme.
      const stand = await seite.locator('#handbuch-umfang-stand').innerText();
      wahr(/Stellen · 2 Bilder/.test(stand), 'der Umfang wird nicht gezählt: ' + stand);

      await seite.fill('#design-titel', 'oneSCM Benutzerhandbuch');
      await seite.fill('#design-hinweis', 'Interne Unterlage');
      await seite.selectOption('#handbuch-groesse', '1600');
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 30000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      gleich(datei.filename, 'handbuch-onescm-benutzerhandbuch.html');
      wahr(datei.groesse > 20000, 'das Handbuch ist verdächtig klein: ' + datei.groesse);
      wahr(
        /gesichert .* 2 Bilder/.test(await seite.locator('#design-meldung').innerText()),
        await seite.locator('#design-meldung').innerText()
      );

      // Die ganze Gliederung nimmt auch die leeren Stellen mit.
      await seite.selectOption('#handbuch-umfang', 'alle');
      await seite.waitForFunction(
        () => /noch ohne Bild/.test(document.getElementById('handbuch-umfang-stand').textContent),
        null,
        { timeout: 5000 }
      );
      wahr(
        /23 Kapitel/.test(await seite.locator('#handbuch-umfang-stand').innerText()),
        await seite.locator('#handbuch-umfang-stand').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
