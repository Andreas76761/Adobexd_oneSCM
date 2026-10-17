/**
 * Browserprüfung der Ansicht Strecke: mehrere Screens als eine Folge und
 * als ein Blatt. Geprüft wird dist/index.html in der Hülle des Artifacts.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
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
      gleich(strecke.schritte[2].aufnahme, 'AUF-2026-003');
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

s.test('Browser wieder schließen', () => schliessen());

export default s;
