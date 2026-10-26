/**
 * Browserprüfung des Registers Output: aus Design fertige Dokumente in
 * mehreren Sprachen, Rollen und Sparten – Vorschau, Word, PDF, PowerPoint
 * und alles in einem Verzeichnis. Dazu die Lupe: ein Bild groß, mit Text,
 * Rezept, Labels und Kapitel.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Output – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const OUTPUT = '#ans=output';

/** Die Ablage der Seite nachgebildet: jede Datei landet in __abgelegt. */
const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({
        filename: auftrag.filename,
        groesse: auftrag.data.size || 0,
        typ: auftrag.data.type || ''
      });
      return { status: 'saved' };
    } } };`;

/** Ein Ordner mit Unterordnern; jeder Pfad wird festgehalten. */
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
          window.__geschrieben.push({ pfad: [...pfad, name].join('/'), groesse: blob.size || 0 });
        },
        close: async () => {}
      })
    }),
    values: async function* () {}
  });
  window.showDirectoryPicker = async () => baueOrdner([]);`;

/** Zwei Bilder an zwei Stellen, eines deutsch, eines englisch. */
async function zweiSprachen(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  for (const [titel, stelle, sprache] of [
    ['Vorlagenliste', '7.5.1', 'de'],
    ['Formular', '7.5.2', 'en']
  ]) {
    await seite.fill('#feld-titel', titel);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.fill('#feld-notiz', 'Die Liste zeigt alle Vorlagen des Marktes.');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(180);
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', stelle);
    await seite.evaluate(() => {
      document.getElementById('markier-labels').open = true;
    });
    await seite.selectOption('#label-sprache', sprache);
    await seite.selectOption('#label-rolle_label', 'dealer');
    await seite.selectOption('#label-sparte', 'pkw');
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(250);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(120);
  }
}

/** Kreuzt alle Werte der Achse an. */
const alleWerte = (seite) =>
  seite.evaluate(() => {
    for (const k of document.querySelectorAll('#output-werte input')) {
      k.checked = true;
      k.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

s.test('ohne Inhalt erklärt sich das Register', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#output-ansicht').isVisible(), true);
    gleich(await seite.locator('#output-erzeugen').isDisabled(), true);
    gleich(await seite.locator('#output-sichern').isDisabled(), true);
    wahr(
      (await seite.locator('#output-liste').innerText()).includes('Noch kein Dokument geplant'),
      await seite.locator('#output-liste').innerText()
    );
    // Vorlagen und Formate stehen zur Wahl, auch ohne Bild. Seit 1.64.0
    // gehört „Bildschirmablauf" dazu - gezählt wird gegen den Kern, damit
    // eine weitere Vorlage hier nicht wieder eine Zahl von Hand verlangt.
    wahr(
      (await seite.locator('#output-vorlagen').innerText()).includes('Bildschirmablauf'),
      await seite.locator('#output-vorlagen').innerText()
    );
    gleich(await seite.locator('#output-vorlagen input').count(), 5);
    gleich(await seite.locator('#output-formate input').count(), 4);
  }, { hash: OUTPUT }));

s.test('die Inhalte stehen nach Kapiteln geordnet', () =>
  mitSeite(
    async (seite) => {
      await zweiSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.waitForSelector('#output-ansicht:not([hidden])');
      const gruppen = await seite.locator('#output-inhalte optgroup').evaluateAll((liste) =>
        liste.map((g) => g.label)
      );
      wahr(gruppen.length > 0, 'die Inhalte sind nicht gruppiert');
      wahr(gruppen.some((g) => g.startsWith('7 ')), 'das Kapitel 7 fehlt als Gruppe: ' + gruppen.join(' | '));
      const stellen = await seite.locator('#output-inhalte option').allInnerTexts();
      wahr(stellen.some((o) => o.includes('7.5.1')), stellen.join(' | '));
    },
    { hash: AUFNAHME }
  ));

s.test('je Sprache entsteht ein Dokument – mit Kapitel und Labels', () =>
  mitSeite(
    async (seite) => {
      await zweiSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.waitForSelector('#output-ansicht:not([hidden])');
      await seite.selectOption('#output-inhalte', ['kapitel:7.5.1', 'kapitel:7.5.2']);
      await alleWerte(seite);
      await seite.waitForTimeout(250);

      // Eine Vorlage, zwei Inhalte, zwei Sprachen: vier Dokumente, zwei leer.
      gleich(await seite.locator('.output-zeile').count(), 4);
      gleich(await seite.locator('.output-zeile--leer').count(), 2);
      const umfang = await seite.locator('#output-umfang').innerText();
      wahr(/4 Dokument\(e\)/.test(umfang) && /2 ohne Bild/.test(umfang), umfang);

      // Die Tabelle nennt Kapitel und Labels.
      const kopf = await seite.locator('.output-gitter thead th').allInnerTexts();
      wahr(kopf.includes('Kapitel') && kopf.includes('Labels'), kopf.join(' | '));
      const zeile = await seite.locator('.output-zeile').first().innerText();
      wahr(zeile.includes('7.5.1'), zeile);
      wahr(/PC|Dealer|Deutsch/.test(zeile), zeile);

      await seite.click('#output-erzeugen');
      await seite.waitForFunction(
        () => /gerechnet/.test(document.getElementById('output-meldung').textContent),
        null,
        { timeout: 40000 }
      );
      // Die Vorschau zeigt das erste Dokument: Blätter, Bilder, Kapitel.
      await seite.waitForSelector('.output-schau .design-blatt', { timeout: 20000 });
      wahr(
        (await seite.locator('#output-schau').innerText()).includes('Kapitel: 7.5.1'),
        await seite.locator('#output-schau').innerText()
      );
      gleich(await seite.locator('.output-bild').count(), 1);
    },
    { hash: AUFNAHME }
  ));

s.test('die Dokumente werden als PDF, Word und PowerPoint gesichert', () =>
  mitSeite(
    async (seite) => {
      await zweiSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.selectOption('#output-inhalte', ['kapitel:7.5.1']);
      await alleWerte(seite);
      await seite.waitForTimeout(200);
      for (const format of ['docx', 'pptx']) {
        await seite.locator(`#output-formate input[id$="-${format}"]`).check();
      }
      await seite.waitForTimeout(150);
      await seite.click('#output-erzeugen');
      await seite.waitForFunction(
        () => /gerechnet/.test(document.getElementById('output-meldung').textContent),
        null,
        { timeout: 40000 }
      );
      await seite.click('#output-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length >= 3, null, { timeout: 30000 });
      const dateien = await seite.evaluate(() => window.__abgelegt);
      const namen = dateien.map((d) => d.filename);
      wahr(namen.some((n) => /\.pdf$/.test(n)), namen.join(', '));
      wahr(namen.some((n) => /\.docx$/.test(n)), namen.join(', '));
      wahr(namen.some((n) => /\.pptx$/.test(n)), namen.join(', '));
      wahr(namen.every((n) => n.startsWith('quickguide-')), namen.join(', '));
      for (const datei of dateien) wahr(datei.groesse > 5000, `${datei.filename} ist zu klein: ${datei.groesse}`);
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('alle Dokumente landen in einem Verzeichnis', () =>
  mitSeite(
    async (seite) => {
      await zweiSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.selectOption('#output-inhalte', ['kapitel:7.5.1', 'kapitel:7.5.2']);
      await alleWerte(seite);
      await seite.waitForTimeout(200);
      await seite.click('#output-erzeugen');
      await seite.waitForFunction(
        () => /gerechnet/.test(document.getElementById('output-meldung').textContent),
        null,
        { timeout: 40000 }
      );
      await seite.click('#output-ordner');
      await seite.waitForFunction(() => (window.__geschrieben || []).length >= 2, null, { timeout: 30000 });
      const pfade = (await seite.evaluate(() => window.__geschrieben)).map((d) => d.pfad);
      // output/<Variante>/<Vorlage>/<Datei>
      wahr(pfade.includes('output/de/quickguide/quickguide-7-5-1-dokumentierte-signaturwege-de.pdf'), pfade.join(' | '));
      wahr(pfade.includes('output/en/quickguide/quickguide-7-5-2-signaturergebnis-en.pdf'), pfade.join(' | '));
      wahr(
        /in „Screens\/output" geschrieben/.test(await seite.locator('#output-meldung').innerText()),
        await seite.locator('#output-meldung').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: ordnerNachbau }
  ));

/* ------------------------------------------------------------- Die Lupe */

s.test('die Lupe zeigt ein Bild groß – mit Text, Rezept, Labels und Kapitel', () =>
  mitSeite(
    async (seite) => {
      await zweiSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      gleich(await seite.locator('.eingang-karte .lupe-knopf').count(), 2);
      await seite.locator('.lupe-knopf').first().click();
      await seite.waitForSelector('#lupe-dialog[open]');

      const angaben = await seite.locator('#lupe-angaben').innerText();
      wahr(/Die Liste zeigt alle Vorlagen des Marktes/.test(angaben), angaben);
      wahr(/Kapitel/i.test(angaben) && /7\.5/.test(angaben), angaben);
      wahr(/Sprache: /.test(angaben) && /Rolle: Dealer/.test(angaben), angaben);
      wahr(/Rezept/i.test(angaben) && /Ausschnitt/.test(angaben), angaben);
      // Das Bild steht groß da und wird in voller Auflösung nachgeladen.
      gleich(await seite.locator('#lupe-bild img').count(), 1);
      await seite.waitForFunction(
        () => /AUF-2026-/.test(document.getElementById('lupe-stand').textContent),
        null,
        { timeout: 10000 }
      );

      // Der Weg in die Gliederung schließt das Fenster.
      await seite.locator('#lupe-angaben button', { hasText: 'In der Gliederung zeigen' }).click();
      await seite.waitForSelector('#gliederung-ansicht:not([hidden])');
      gleich(await seite.locator('#lupe-dialog[open]').count(), 0);
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
