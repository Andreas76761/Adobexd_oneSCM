/**
 * Browserprüfung der Ansicht Strecke: mehrere Screens als eine Folge und
 * als ein Blatt. Geprüft wird dist/index.html in der Hülle des Artifacts.
 */
import { join } from 'node:path';
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Strecke – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const STRECKE = '#ans=strecke';

const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size || String(auftrag.data).length });
      return { status: 'saved' };
    } } };`;

/** Legt drei Aufnahmen an und wechselt in die Streckenansicht. */
async function dreiAufnahmen(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  for (const titel of ['Vorlagenliste öffnen', 'Filter setzen', 'Vorlage anlegen']) {
    await seite.fill('#feld-titel', titel);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Navigation');
    await seite.fill('#feld-begriffe', 'vorlage');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(120);
  }
  await seite.click('.portal-nav button[data-ansicht="strecke"]');
  await seite.waitForSelector('#strecke-ansicht:not([hidden])');
}

/** Hängt eine Aufnahme als Schritt an und schreibt ihre Anweisung. */
async function schritt(seite, kennung, text) {
  const vorher = await seite.locator('.strecke-schritt').count();
  await seite.selectOption('#strecke-aufnahme', kennung);
  await seite.click('#strecke-anhaengen');
  await seite.waitForFunction(
    (zahl) => document.querySelectorAll('.strecke-schritt').length === zahl,
    vorher + 1,
    { timeout: 5000 }
  );
  await seite.fill('#schritt-text-' + vorher, text);
}

const streckenImSpeicher = (seite) =>
  seite.evaluate(() => {
    const roh = localStorage.getItem('screenarchiv:strecken');
    return roh ? JSON.parse(roh).strecken : [];
  });

s.test('ohne Strecke erklärt sich die Ansicht und sperrt das Blatt', () =>
  mitSeite(async (seite) => {
    await seite.click('.portal-nav button[data-ansicht="strecke"]');
    gleich(await seite.locator('#strecke-ansicht').isVisible(), true);
    gleich(await seite.locator('#strecke-blatt').isDisabled(), true, 'ein leeres Blatt ließe sich sichern');
    gleich(await seite.locator('#strecke-anhaengen').isDisabled(), true);
  }));

s.test('mehrere Screens werden zu einer Folge mit Anweisungen', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Vorlage anlegen');
      await schritt(seite, 'AUF-2026-001', 'Im Menü „Contract Generation“ öffnen');
      await schritt(seite, 'AUF-2026-002', 'Market auf Germany filtern');
      await schritt(seite, 'AUF-2026-003', 'Auf „Create Template“ klicken');
      await seite.waitForFunction(
        () => document.getElementById('strecke-blatt').disabled === false,
        null,
        { timeout: 5000 }
      );
      gleich(
        await seite.locator('#strecke-text').innerText(),
        'Vorlage anlegen\n1. Im Menü „Contract Generation“ öffnen\n2. Market auf Germany filtern\n3. Auf „Create Template“ klicken',
        'die Anweisungen stehen nicht in der Reihenfolge'
      );
      const [strecke] = await streckenImSpeicher(seite);
      gleich(strecke.schritte.length, 3);
      gleich(strecke.schritte[0].text, 'Im Menü „Contract Generation“ öffnen', 'der erste Text wurde überschrieben');
      // Ein Schritt trägt seit 1.25.0 eine Liste von Bildern, nicht eines.
      tieferGleich(strecke.schritte[2].aufnahmen, ['AUF-2026-003']);
      gleich(strecke.schritte[2].art, 'schritt');
    },
    { hash: AUFNAHME }
  ));

s.test('die Reihenfolge lässt sich ändern und ein Schritt entfernen', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Reihenfolge');
      await schritt(seite, 'AUF-2026-001', 'eins');
      await schritt(seite, 'AUF-2026-002', 'zwei');
      await seite.click('#schritt-runter-0');
      await seite.waitForFunction(
        () => document.getElementById('schritt-text-0').value === 'zwei',
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#strecke-text').innerText(), 'Reihenfolge\n1. zwei\n2. eins');
      await seite.click('#schritt-weg-0');
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt').length === 1,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#schritt-text-0').inputValue(), 'eins');
      wahr(
        /mindestens zwei Schritte/.test(await seite.locator('#strecke-meldung').innerText()),
        'die zu kurze Strecke wird nicht beanstandet'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('das Blatt fasst alle Screens in einem Bild zusammen', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Vorlage anlegen');
      await schritt(seite, 'AUF-2026-001', 'Menü öffnen');
      await schritt(seite, 'AUF-2026-002', 'Filter setzen');
      await seite.waitForFunction(() => !document.getElementById('strecke-blatt').disabled, null, { timeout: 5000 });

      // Die Vorschau zeigt dasselbe Blatt - und wächst mit der Aufteilung.
      await seite.waitForFunction(
        () => !document.getElementById('strecke-vorschau').hidden,
        null,
        { timeout: 5000 }
      );
      const nebeneinander = await seite.evaluate(() => {
        const c = document.getElementById('strecke-vorschau');
        return { breite: c.width, hoehe: c.height };
      });
      await seite.selectOption('#strecke-spalten', '1');
      await seite.waitForFunction(
        (vorher) => document.getElementById('strecke-vorschau').height > vorher,
        nebeneinander.hoehe,
        { timeout: 5000 }
      );
      await seite.selectOption('#strecke-spalten', '2');
      await seite.waitForTimeout(400);

      await seite.click('#strecke-blatt');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 8000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      gleich(datei.filename, 'klickstrecke-vorlage-anlegen.png');
      wahr(datei.groesse > 10000, 'das Blatt ist verdächtig klein: ' + datei.groesse);
      wahr(
        /gesichert/.test(await seite.locator('#strecke-meldung').innerText()),
        'die Rückmeldung fehlt'
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('die Strecke überlebt das Neuladen, die Aufnahmen bleiben', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Bleibt bestehen');
      await schritt(seite, 'AUF-2026-001', 'eins');
      await schritt(seite, 'AUF-2026-002', 'zwei');
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="strecke"]');
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt').length === 2,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#strecke-name').inputValue(), 'Bleibt bestehen');
      gleich(await seite.locator('#schritt-text-1').inputValue(), 'zwei');

      await seite.click('#strecke-loeschen');
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt').length === 0,
        null,
        { timeout: 5000 }
      );
      gleich((await streckenImSpeicher(seite)).length, 0);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('.eingang-karte').count(), 3, 'mit der Strecke verschwanden die Aufnahmen');
    },
    { hash: AUFNAHME }
  ));

s.test('ein Schritt nimmt ein zweites Bild parallel auf', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Parallel');
      await schritt(seite, 'AUF-2026-001', 'Beides zugleich füllen');
      await schritt(seite, 'AUF-2026-003', 'Danach speichern');
      await seite.selectOption('#strecke-aufnahme', 'AUF-2026-002');
      await seite.click('#schritt-parallel-0');
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt')[0].querySelectorAll('.schritt-bild').length === 2,
        null,
        { timeout: 5000 }
      );
      // Parallele Bilder werden als 1a und 1b gezählt.
      const marken = await seite.locator('.strecke-schritt').first().locator('figcaption').allInnerTexts();
      tieferGleich(marken, ['1a', '1b']);
      wahr(
        (await seite.locator('#strecke-text').innerText()).includes('(parallel: 2 Bilder)'),
        'der Text nennt die parallelen Bilder nicht'
      );
      const [strecke] = await streckenImSpeicher(seite);
      tieferGleich(strecke.schritte[0].aufnahmen, ['AUF-2026-001', 'AUF-2026-002']);

      // Das zweite Bild wieder herausnehmen.
      await seite.locator('.strecke-schritt').first().locator('.schritt-bild-weg').nth(1).click();
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt')[0].querySelectorAll('.schritt-bild').length === 1,
        null,
        { timeout: 5000 }
      );
      tieferGleich((await streckenImSpeicher(seite))[0].schritte[0].aufnahmen, ['AUF-2026-001']);
    },
    { hash: AUFNAHME }
  ));

s.test('ein Platzhalter hält die Stelle eines fehlenden Bildes', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Mit Lücke');
      await schritt(seite, 'AUF-2026-001', 'Menü öffnen');
      await seite.click('#strecke-platzhalter');
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt--platzhalter').length === 1,
        null,
        { timeout: 5000 }
      );
      wahr(
        /sagt nicht, welches Bild fehlt/.test(await seite.locator('#strecke-meldung').innerText()),
        'der leere Platzhalter wird nicht beanstandet'
      );
      await seite.fill('#schritt-text-1', 'Freigabedialog fehlt noch');
      await seite.waitForFunction(
        () => !document.getElementById('strecke-blatt').disabled,
        null,
        { timeout: 5000 }
      );
      wahr((await seite.locator('#strecke-text').innerText()).includes('2. [Bild fehlt] Freigabedialog fehlt noch'));
      gleich(await seite.locator('.schritt-platzhalter').count(), 1);

      // Ein Bild in den Platzhalter setzen macht ihn zum Schritt.
      await seite.selectOption('#strecke-aufnahme', 'AUF-2026-002');
      await seite.click('#schritt-parallel-1');
      await seite.waitForFunction(
        () => document.querySelectorAll('.strecke-schritt--platzhalter').length === 0,
        null,
        { timeout: 5000 }
      );
      const [strecke] = await streckenImSpeicher(seite);
      gleich(strecke.schritte[1].art, 'schritt');
      tieferGleich(strecke.schritte[1].aufnahmen, ['AUF-2026-002']);
    },
    { hash: AUFNAHME }
  ));

s.test('aus der Strecke wird ein Prozess – als Bild und als BPMN-Datei', () =>
  mitSeite(
    async (seite) => {
      await dreiAufnahmen(seite);
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Vorlage anlegen');
      await schritt(seite, 'AUF-2026-001', 'Menü öffnen');
      await schritt(seite, 'AUF-2026-002', 'Beides füllen');
      await seite.selectOption('#strecke-aufnahme', 'AUF-2026-003');
      await seite.click('#schritt-parallel-1');
      await seite.click('#strecke-platzhalter');
      await seite.fill('#schritt-text-2', 'Freigabedialog fehlt');
      await seite.waitForFunction(
        () => !document.getElementById('strecke-prozess').hidden && document.getElementById('strecke-prozess').width > 400,
        null,
        { timeout: 8000 }
      );
      await seite.click('#strecke-bpmn');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 8000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      gleich(datei.filename, 'prozess-vorlage-anlegen.bpmn');
      wahr(datei.groesse > 1500, 'die BPMN-Datei ist verdächtig klein: ' + datei.groesse);
      wahr(
        /3 Schritte, 1 parallel, 1 Platzhalter/.test(await seite.locator('#strecke-meldung').innerText()),
        'die Rückmeldung zählt nicht: ' + (await seite.locator('#strecke-meldung').innerText())
      );

      await seite.click('#strecke-prozessbild');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 2, null, { timeout: 8000 });
      const bild = (await seite.evaluate(() => window.__abgelegt))[1];
      gleich(bild.filename, 'prozess-vorlage-anlegen.png');
      wahr(bild.groesse > 10000, 'das Prozessbild ist verdächtig klein: ' + bild.groesse);
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
