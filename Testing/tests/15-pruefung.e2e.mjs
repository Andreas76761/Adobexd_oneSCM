/**
 * Browserprüfung der Ansicht Prüfung: drei Agenten über dem Bestand.
 * Geprüft wird, dass sie nach Regeln urteilen, ihre Befunde benennen, den Weg
 * dorthin zeigen – und dass der Bericht ohne Claude zustande kommt.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Prüfung – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const PRUEFUNG = '#ans=pruefung';

const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size || String(auftrag.data).length });
      return { status: 'saved' };
    } } };`;

/** Zwei Aufnahmen: eine zugeordnet, eine ohne Stelle. */
async function zweiAufnahmen(seite) {
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
  await seite.click('#markier-sichern');
  await seite.waitForTimeout(250);
}

s.test('die drei Agenten stellen sich vor, bevor sie laufen', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#pruefung-ansicht').isVisible(), true);
      gleich(await seite.locator('.pruef-agent').count(), 3);
      const namen = await seite.locator('.pruef-agent h3').allInnerTexts();
      gleich(namen.join('|'), 'Roter Faden|Audit|Empfehlung');
      gleich(await seite.locator('#pruef-bericht').isDisabled(), true, 'ein leerer Bericht ließe sich sichern');
      wahr(
        (await seite.locator('.pruef-agent').first().innerText()).includes('Noch nicht gelaufen'),
        'der Zustand vor dem Lauf fehlt'
      );
      wahr(
        (await seite.locator('#pruefung-ansicht .band-hinweis').first().innerText()).includes('entscheiden tun die Regeln'),
        'die Rolle von Claude wird nicht genannt'
      );
    },
    { hash: PRUEFUNG }
  ));

s.test('ein Lauf nennt Kennzahlen, Befunde und die betroffenen Bilder', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.waitForSelector('#pruefung-ansicht:not([hidden])');
      await seite.click('#pruef-alle');
      await seite.waitForFunction(() => document.querySelectorAll('.pruef-kennzahlen').length === 3, null, { timeout: 8000 });

      const faden = seite.locator('.pruef-agent[data-agent="faden"]');
      wahr((await faden.innerText()).includes('ohne Stelle'), 'das Bild ohne Stelle fällt nicht auf');
      gleich(await faden.locator('.pruef-kennzahlen .eingang-kachel-wert').first().innerText(), '2');

      // Jeder Befund nennt seine Bilder - und sie führen in den Editor.
      const befund = faden.locator('.pruef-befund', { hasText: 'ohne Stelle' }).first();
      wahr((await befund.locator('.pruef-kennung').count()) >= 1, 'die Kennung fehlt am Befund');
      await befund.locator('.pruef-kennung').first().click();
      await seite.waitForSelector('#markieren-ansicht:not([hidden])');

      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      wahr(
        /3 Agenten gelaufen|Befund/.test(await seite.locator('#pruef-meldung').innerText()),
        'die Rückmeldung fehlt'
      );
      // Die Empfehlung weist auf das leere Kapitel und die Zuordnung hin.
      const empfehlung = seite.locator('.pruef-agent[data-agent="empfehlung"]');
      wahr((await empfehlung.innerText()).includes('zuordnen'), await empfehlung.innerText());
      wahr((await empfehlung.innerText()).includes('aufnehmen'));
    },
    { hash: AUFNAHME }
  ));

s.test('ein einzelner Agent läuft allein und zählt neu', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.click('#pruef-audit');
      await seite.waitForFunction(
        () => document.querySelectorAll('.pruef-agent[data-agent="audit"] .pruef-kennzahlen').length === 1,
        null,
        { timeout: 8000 }
      );
      gleich(await seite.locator('.pruef-kennzahlen').count(), 1, 'die anderen Agenten liefen mit');
      gleich(await seite.locator('#pruef-audit').innerText(), 'Neu prüfen');
      gleich(await seite.locator('#pruef-bericht').isDisabled(), false);
      // Das Audit beanstandet die fehlenden Labels, nicht die Folge.
      wahr(
        (await seite.locator('.pruef-agent[data-agent="audit"]').innerText()).includes('ohne Sprache'),
        'die fehlenden Labels fallen nicht auf'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('der Bericht wird als Text gesichert – ohne Claude', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.click('#pruef-alle');
      await seite.waitForFunction(() => document.querySelectorAll('.pruef-kennzahlen').length === 3, null, { timeout: 8000 });
      await seite.click('#pruef-bericht');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 8000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(/^pruefbericht-\d{4}-\d{2}-\d{2}\.txt$/.test(datei.filename), datei.filename);
      wahr(datei.groesse > 400, 'der Bericht ist verdächtig kurz: ' + datei.groesse);

      // Ohne die Fähigkeit sample bleibt der Kommentar aus - und sagt es.
      await seite.click('#pruef-claude-audit');
      await seite.waitForFunction(
        () => /Claude nicht fragen/.test(document.getElementById('pruef-meldung').textContent),
        null,
        { timeout: 8000 }
      );
      gleich(await seite.locator('.pruef-kommentar').count(), 0);
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('Claude kommentiert, wenn die Fähigkeit da ist – als Kommentar', () =>
  mitSeite(
    async (seite) => {
      await zweiAufnahmen(seite);
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.click('#pruef-faden');
      await seite.waitForFunction(() => document.querySelectorAll('.pruef-kennzahlen').length === 1, null, { timeout: 8000 });
      await seite.click('#pruef-claude-faden');
      await seite.waitForSelector('.pruef-kommentar');
      wahr(
        (await seite.locator('.pruef-kommentar p').first().innerText()).includes('Zuerst die Zuordnung'),
        'der Kommentar steht nicht da'
      );
      wahr(
        (await seite.locator('.pruef-kommentar').innerText()).includes('Ein Kommentar, kein Befund'),
        'der Kommentar wird nicht als solcher gekennzeichnet'
      );
      // Was Claude bekam, war der Bericht - nicht mehr.
      const frage = await seite.evaluate(() => window.__gefragt);
      wahr(frage.includes('## Roter Faden'), 'Claude bekam nicht den Bericht: ' + String(frage).slice(0, 120));
    },
    {
      hash: AUFNAHME,
      initSkript: `
        window.claude = { use: async (name) => name !== 'sample' ? null : Object.assign(
          async (eingabe) => { window.__gefragt = typeof eingabe === 'string' ? eingabe : JSON.stringify(eingabe);
                               return { text: 'Zuerst die Zuordnung nachziehen.' }; },
          { json: async () => ({}) }
        ) };`
    }
  ));

/* ------------------------------------------- Projektvergleich (1.37.0) */

/**
 * Zwei Fassungen desselben Projekts: 2.3 hat 6.2 und 6.4, 2.4 hat 6.2 und
 * 6.3 – also eine neue und eine entfallene Stelle.
 */
async function zweiFassungen(seite) {
  const satz = [
    ['2.3', 'Liste alt', '6.2'],
    ['2.3', 'Freigaben alt', '6.4'],
    ['2.4', 'Liste neu', '6.2'],
    ['2.4', 'Vorlagen neu', '6.3']
  ];
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  await seite.evaluate(() => {
    document.getElementById('projekt-verwaltung').open = true;
  });
  for (const version of ['2.3', '2.4']) {
    await seite.fill('#projekt-neu-name', 'oneSCM Portal');
    await seite.fill('#projekt-neu-version', version);
    await seite.fill('#projekt-neu-land', 'Germany');
    await seite.click('#projekt-anlegen');
    await seite.waitForTimeout(120);
  }
  let nummer = 0;
  for (const [version, titel, stelle] of satz) {
    nummer++;
    await seite.fill('#feld-version', version);
    await seite.fill('#feld-titel', titel);
    await seite.click('#ausloesen');
    await seite.waitForTimeout(180);
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', stelle);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(220);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(120);
  }
}

s.test('ohne zwei Projekte erklärt sich der Vergleich', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#vergleich-sichern').isDisabled(), true);
    wahr(
      (await seite.locator('#vergleich-tabelle').innerText()).includes('Noch kein zweites Projekt'),
      await seite.locator('#vergleich-tabelle').innerText()
    );
    gleich(await seite.locator('#vergleich-stand').innerText(), 'dafür braucht es zwei Projekte');
  }, { hash: PRUEFUNG }));

s.test('der Vergleich zweier Fassungen nennt neu, entfallen und gemeinsam', () =>
  mitSeite(
    async (seite) => {
      await zweiFassungen(seite);
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.waitForSelector('#pruefung-ansicht:not([hidden])');
      await seite.selectOption('#vergleich-a', 'PRJ-onescm-portal-2-3-germany');
      await seite.selectOption('#vergleich-b', 'PRJ-onescm-portal-2-4-germany');
      await seite.waitForSelector('.vergleich-gitter');

      const stand = await seite.locator('#vergleich-stand').innerText();
      wahr(/1 neu · 1 nur vorher · 1 in beiden/.test(stand), stand);
      gleich(await seite.locator('.vergleich-zeile').count(), 3);
      gleich(await seite.locator('.vergleich-zeile--neu').count(), 1);
      gleich(await seite.locator('.vergleich-zeile--entfallen').count(), 1);
      wahr(
        (await seite.locator('.vergleich-zeile--neu').innerText()).includes('6.3'),
        await seite.locator('.vergleich-zeile--neu').innerText()
      );

      // Die Spalten tragen die Namen der beiden Projekte.
      const kopf = await seite.locator('.vergleich-gitter thead th').allInnerTexts();
      wahr(kopf.some((k) => k.includes('2.3 · Germany')) && kopf.some((k) => k.includes('2.4 · Germany')), kopf.join(' | '));

      // Ein Klick auf die Stelle führt in die Gliederung.
      await seite.locator('.vergleich-zeile .matrix-knopf').first().click();
      await seite.waitForSelector('#gliederung-ansicht:not([hidden])');

      // Dasselbe Projekt zweimal vergleicht nichts.
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.selectOption('#vergleich-b', 'PRJ-onescm-portal-2-3-germany');
      await seite.waitForTimeout(200);
      gleich(await seite.locator('#vergleich-sichern').isDisabled(), true);
      wahr(
        (await seite.locator('#vergleich-tabelle').innerText()).includes('Zwei verschiedene Projekte'),
        await seite.locator('#vergleich-tabelle').innerText()
      );
    },
    { hash: AUFNAHME }
  ));

s.test('der Vergleich wird als Text gesichert', () =>
  mitSeite(
    async (seite) => {
      await zweiFassungen(seite);
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.selectOption('#vergleich-a', 'PRJ-onescm-portal-2-3-germany');
      await seite.selectOption('#vergleich-b', 'PRJ-onescm-portal-2-4-germany');
      await seite.waitForSelector('.vergleich-gitter');
      await seite.click('#vergleich-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 8000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(/^projektvergleich-\d{4}-\d{2}-\d{2}\.txt$/.test(datei.filename), datei.filename);
      wahr(
        /1 neu, 1 nur vorher/.test(await seite.locator('#pruef-meldung').innerText()),
        await seite.locator('#pruef-meldung').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
