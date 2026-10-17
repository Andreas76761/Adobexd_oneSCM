/**
 * Browserprüfung der Ansicht Verzeichnis: die Galerie auf die Platte.
 * Der Ordnerzugriff wird nachgebildet – jede geschriebene Datei samt Pfad
 * landet in `window.__geschrieben`, so lässt sich prüfen, was wirklich
 * entstanden wäre.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Verzeichnis – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const VERZEICHNIS = '#ans=verzeichnis';

/**
 * Ein Ordner mit Unterordnern: `getDirectoryHandle` legt an, jede Datei wird
 * mit vollem Pfad festgehalten.
 */
const ordnerNachbau = `
  window.__geschrieben = [];
  const baueOrdner = (pfad) => ({
    name: pfad.length ? pfad[pfad.length - 1] : 'Screens',
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getDirectoryHandle: async (name) => baueOrdner([...pfad, name]),
    getFileHandle: async (name) => ({
      createWritable: async () => ({
        write: async (blob) => {
          window.__geschrieben.push({
            pfad: [...pfad, name].join('/'),
            groesse: blob.size || String(blob).length,
            typ: blob.type || ''
          });
        },
        close: async () => {}
      })
    }),
    values: async function* () {}
  });
  window.showDirectoryPicker = async () => baueOrdner([]);`;

/** Zwei Aufnahmen, eine davon mit Stelle, Sprache, Rolle und Sparte. */
async function zweiBilder(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  for (const titel of ['Vorlagenliste öffnen', 'Zweiter Schritt hier']) {
    await seite.fill('#feld-titel', titel);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Navigation');
    await seite.fill('#feld-begriffe', 'vorlage');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(150);
  }
  await seite.click('#letzte-editor');
  await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
  await seite.fill('#markier-stelle', '6.2');
  await seite.evaluate(() => {
    document.getElementById('markier-labels').open = true;
  });
  await seite.selectOption('#label-sprache', 'de');
  await seite.selectOption('#label-rolle_label', 'dealer');
  await seite.selectOption('#label-sparte', 'pkw');
  await seite.waitForTimeout(150);
  await seite.click('#markier-sichern');
  await seite.waitForTimeout(250);
  await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
  await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
}

s.test('ohne Ordner erklärt sich die Ansicht und sperrt das Schreiben', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#verzeichnis-ansicht').isVisible(), true);
      gleich(await seite.locator('#verzeichnis-schreiben').isDisabled(), true);
      gleich(await seite.locator('#verzeichnis-waehlen').count(), 1, 'der Knopf zur Ordnerwahl fehlt');
      wahr(
        (await seite.locator('#verzeichnis-plan').innerText()).includes('keine Aufnahme im Eingang'),
        'der leere Eingang bleibt unerklärt'
      );
      wahr((await seite.locator('#verzeichnis-felder').innerText()).includes('{kapitel}'), 'die Platzhalter fehlen');
    },
    { hash: VERZEICHNIS, initSkript: ordnerNachbau }
  ));

s.test('wo kein Ordnerzugriff möglich ist, steht der Grund', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#verzeichnis-waehlen').count(), 0);
      wahr(
        (await seite.locator('#verzeichnis-ordner').innerText()).includes('Chrome oder Edge'),
        'der Weg fehlt: ' + (await seite.locator('#verzeichnis-ordner').innerText())
      );
    },
    {
      hash: VERZEICHNIS,
      initSkript: `Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: undefined });`
    }
  ));

s.test('der Plan zeigt jede Datei, bevor eine entsteht', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      const plan = await seite.locator('#verzeichnis-plan').innerText();
      wahr(plan.includes('pc/de/6-2/dealer/'), 'die Ordnung nach Sparte, Sprache, Kapitel, Rolle fehlt: ' + plan);
      wahr(plan.includes('ohne-sparte/ohne-sprache/ohne-kapitel/ohne-rolle/'), 'das ungelabelte Bild fehlt');
      wahr(plan.includes('index.json') && plan.includes('index.csv'), 'die Übersicht fehlt');
      gleich(await seite.evaluate(() => window.__geschrieben.length), 0, 'es wurde ohne Auftrag geschrieben');

      // Ein eigenes Muster wirkt sofort auf den Plan.
      await seite.fill('#verzeichnis-muster', '{jahr}/{kennung}');
      await seite.waitForFunction(
        () => document.getElementById('verzeichnis-plan').textContent.includes('/auf-2026-001.png'),
        null,
        { timeout: 5000 }
      );
      // Und die Schalter nehmen Dateien aus dem Plan.
      await seite.uncheck('#verzeichnis-zettel');
      await seite.uncheck('#verzeichnis-index');
      await seite.waitForFunction(
        () => !document.getElementById('verzeichnis-plan').textContent.includes('index.json'),
        null,
        { timeout: 5000 }
      );
      wahr(!(await seite.locator('#verzeichnis-plan').innerText()).includes('.json'), 'die Zettel bleiben im Plan');
    },
    { hash: AUFNAHME, initSkript: ordnerNachbau }
  ));

s.test('die Galerie wird mit Unterordnern geschrieben und berichtet', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      await seite.click('#verzeichnis-waehlen');
      await seite.waitForFunction(
        () => !document.getElementById('verzeichnis-schreiben').disabled,
        null,
        { timeout: 8000 }
      );
      await seite.click('#verzeichnis-schreiben');
      await seite.waitForFunction(
        () => /liegen nun/.test(document.getElementById('verzeichnis-meldung').textContent),
        null,
        { timeout: 30000 }
      );
      const dateien = await seite.evaluate(() => window.__geschrieben);
      const pfade = dateien.map((d) => d.pfad);
      wahr(
        pfade.some((p) => /^pc\/de\/6-2\/dealer\/.*\.png$/.test(p)),
        'das gelabelte Bild liegt nicht in seiner Ordnung: ' + pfade.join(' | ')
      );
      wahr(pfade.some((p) => /^pc\/de\/6-2\/dealer\/.*\.json$/.test(p)), 'der Beipackzettel fehlt');
      wahr(pfade.includes('index.json') && pfade.includes('index.csv'), 'die Übersicht fehlt');
      // Die Bilder kommen in voller Auflösung, nicht als Vorschau.
      const bild = dateien.find((d) => d.pfad.endsWith('.png'));
      wahr(bild.groesse > 5000, 'das Bild ist verdächtig klein: ' + bild.groesse);
      gleich(bild.typ, 'image/png');
      // Die Übersicht trägt die Bilder mit ihrem Pfad.
      const bericht = await seite.locator('#verzeichnis-meldung').innerText();
      wahr(/2 Bilder/.test(bericht), bericht);
      wahr(/Übersicht/.test(bericht));
    },
    { hash: AUFNAHME, initSkript: ordnerNachbau }
  ));

s.test('das Muster überlebt das Neuladen', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#verzeichnis-muster', '{kapitel}/{kennung}');
      await seite.waitForTimeout(300);
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
      gleich(await seite.locator('#verzeichnis-muster').inputValue(), '{kapitel}/{kennung}');
    },
    { hash: VERZEICHNIS, initSkript: ordnerNachbau }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
