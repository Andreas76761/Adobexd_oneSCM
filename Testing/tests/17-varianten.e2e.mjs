/**
 * Browserprüfung der Varianten: dieselbe Maske in anderer Sprache oder Rolle.
 * Geprüft wird das Verbinden im Editor, die Deckungsmatrix in der Gliederung
 * und die Ausgabe einer Strecke in einer anderen Sprache im Designstudio.
 */
import { join } from 'node:path';
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Varianten – Oberfläche');

const AUFNAHME = '#ans=aufnahme';

/**
 * Drei Aufnahmen: dieselbe Stelle auf Deutsch und Englisch, dazu eine
 * zweite Stelle nur auf Deutsch – damit die Matrix eine Lücke hat.
 */
async function dreiMitSprachen(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  const satz = [
    { titel: 'Liste deutsch', stelle: '7.5.1', sprache: 'de' },
    { titel: 'Liste englisch', stelle: '7.5.1', sprache: 'en' },
    { titel: 'Formular deutsch', stelle: '7.5.2', sprache: 'de' }
  ];
  for (const bild of satz) {
    await seite.fill('#feld-titel', bild.titel);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Formular');
    await seite.fill('#feld-begriffe', 'vorlage');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(150);
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', bild.stelle);
    await seite.evaluate(() => {
      document.getElementById('markier-labels').open = true;
    });
    await seite.selectOption('#label-sprache', bild.sprache);
    await seite.selectOption('#label-rolle_label', 'dealer');
    await seite.waitForTimeout(150);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(250);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(120);
  }
}

/**
 * Der Eingang, wie ihn die Seite kennt: Metadaten aus dem localStorage, die
 * Vorschauen aus der Browserdatenbank (seit 1.34.0 liegen sie dort).
 */
const eingangImSpeicher = (seite) =>
  seite.evaluate(async () => {
    const roh = localStorage.getItem('screenarchiv:eingang');
    const aufnahmen = roh ? JSON.parse(roh).aufnahmen : [];
    const vorschauen = await new Promise((fertig) => {
      const anfrage = indexedDB.open('screenarchiv');
      anfrage.onsuccess = () => {
        const db = anfrage.result;
        if (!db.objectStoreNames.contains('vorschauen')) return fertig(new Map());
        const karte = new Map();
        const zeiger = db.transaction('vorschauen').objectStore('vorschauen').openCursor();
        zeiger.onsuccess = () => {
          const stand = zeiger.result;
          if (!stand) return fertig(karte);
          karte.set(String(stand.key), stand.value);
          stand.continue();
        };
        zeiger.onerror = () => fertig(karte);
      };
      anfrage.onerror = () => fertig(new Map());
    });
    return aufnahmen.map((a) => ({ ...a, bild: a.bild || vorschauen.get(a.id) || '' }));
  });

s.test('ohne Aufnahme bleibt der Variantenblock stumm', () =>
  mitSeite(async (seite) => {
    await seite.click('.portal-nav button[data-ansicht="markieren"]');
    await seite.evaluate(() => {
      document.getElementById('markier-varianten').open = true;
    });
    wahr(
      (await seite.locator('#varianten-liste').innerText()).includes('Zuerst eine Aufnahme wählen'),
      'der leere Block erklärt sich nicht'
    );
    gleich(await seite.locator('#varianten-verbinden').isDisabled(), true);
    gleich(await seite.locator('#varianten-loesen').isDisabled(), true);
  }));

s.test('zwei Aufnahmen werden im Editor verbunden und wieder gelöst', () =>
  mitSeite(
    async (seite) => {
      await dreiMitSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="markieren"]');
      await seite.selectOption('#markier-wahl', 'AUF-2026-001');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      await seite.evaluate(() => {
        document.getElementById('markier-varianten').open = true;
      });
      gleich(await seite.locator('#varianten-stand').innerText(), 'nicht verbunden');
      gleich(await seite.locator('.varianten-zeile').count(), 1);

      await seite.selectOption('#varianten-andere', 'AUF-2026-002');
      await seite.click('#varianten-verbinden');
      await seite.waitForFunction(
        () => document.querySelectorAll('.varianten-zeile').length === 2,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#varianten-stand').innerText(), '2 verbunden');
      wahr(
        /Variantengruppe/.test(await seite.locator('#markier-meldung').innerText()),
        'das Verbinden wird nicht gemeldet'
      );
      const verbunden = await eingangImSpeicher(seite);
      const eine = verbunden.find((a) => a.id === 'AUF-2026-001');
      const andere = verbunden.find((a) => a.id === 'AUF-2026-002');
      wahr(eine.variante && eine.variante === andere.variante, 'die Gruppe steht nicht an den Aufnahmen');
      // Was der Gruppe noch fehlt, steht da – aus dem Bestand, nicht aus 21 Sprachen.
      wahr(
        !(await seite.locator('#varianten-liste').innerText()).includes('Deutsch, Englisch'),
        'als Lücke wird genannt, was vorhanden ist'
      );

      await seite.click('#varianten-loesen');
      await seite.waitForFunction(
        () => document.querySelectorAll('.varianten-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      const geloest = await eingangImSpeicher(seite);
      gleich(geloest.find((a) => a.id === 'AUF-2026-001').variante, '');
    },
    { hash: AUFNAHME }
  ));

s.test('die Deckungsmatrix zeigt Lücken je Stelle und Sprache', () =>
  mitSeite(
    async (seite) => {
      await dreiMitSprachen(seite);
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.waitForSelector('.matrix-gitter');
      const kopf = await seite.locator('.matrix-gitter thead th').allInnerTexts();
      tieferGleich(kopf, ['Stelle', 'Deutsch', 'Englisch', 'ohne', 'gesamt']);
      gleich(await seite.locator('.matrix-gitter tbody tr').count(), 3, 'zwei Stellen und die Summe');
      // 7.5.1 ist in beiden Sprachen belegt, 7.5.2 nur auf Deutsch.
      gleich(await seite.locator('.matrix-zelle--leer').count(), 1);
      wahr(
        (await seite.locator('#matrix-stand').innerText()).includes('1 vollständig'),
        'der Stand zählt nicht: ' + (await seite.locator('#matrix-stand').innerText())
      );

      // Ein Klick auf eine gefüllte Zelle führt ins Bild.
      await seite.locator('.matrix-knopf').first().click();
      await seite.waitForSelector('#markieren-ansicht:not([hidden])');

      // Nach Rolle ist alles belegt - eine Spalte, keine Lücke.
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.selectOption('#matrix-feld', 'rolle_label');
      await seite.waitForFunction(
        () => document.querySelectorAll('.matrix-gitter thead th').length === 4,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('.matrix-zelle--leer').count(), 0);
    },
    { hash: AUFNAHME }
  ));

s.test('das Designstudio gibt dieselbe Strecke in einer anderen Sprache aus', () =>
  mitSeite(
    async (seite) => {
      await dreiMitSprachen(seite);
      // Die deutschen Bilder mit ihren englischen verbinden.
      await seite.click('.portal-nav button[data-ansicht="markieren"]');
      await seite.selectOption('#markier-wahl', 'AUF-2026-001');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      await seite.evaluate(() => {
        document.getElementById('markier-varianten').open = true;
      });
      await seite.selectOption('#varianten-andere', 'AUF-2026-002');
      await seite.click('#varianten-verbinden');
      await seite.waitForFunction(() => document.querySelectorAll('.varianten-zeile').length === 2, null, { timeout: 5000 });

      // Eine Strecke aus dem deutschen Bild und dem Formular.
      await seite.click('.portal-nav button[data-ansicht="strecke"]');
      await seite.click('#strecke-neu');
      await seite.fill('#strecke-name', 'Vorlage anlegen');
      for (const [kennung, text] of [
        ['AUF-2026-001', 'Liste öffnen'],
        ['AUF-2026-003', 'Formular füllen']
      ]) {
        const vorher = await seite.locator('.strecke-schritt').count();
        await seite.selectOption('#strecke-aufnahme', kennung);
        await seite.click('#strecke-anhaengen');
        await seite.waitForFunction((zahl) => document.querySelectorAll('.strecke-schritt').length === zahl, vorher + 1, {
          timeout: 5000
        });
        await seite.fill('#schritt-text-' + vorher, text);
      }

      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForFunction(() => document.querySelectorAll('.design-blatt').length > 0, null, { timeout: 20000 });
      await seite.selectOption('#design-variante', 'sprache:en');
      // Ein Schritt hat keine Entsprechung - das steht in der Meldung.
      await seite.waitForFunction(
        () => /ohne Entsprechung/.test(document.getElementById('design-meldung').textContent),
        null,
        { timeout: 20000 }
      );
      const meldung = await seite.locator('#design-meldung').innerText();
      wahr(/1 Schritt\(e\) ohne Entsprechung: 2/.test(meldung), meldung);
      // Der Titel des Blattes nennt die Sprache.
      wahr(
        (await seite.locator('#design-variante').inputValue()) === 'sprache:en',
        'die Wahl der Variante hält nicht'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
