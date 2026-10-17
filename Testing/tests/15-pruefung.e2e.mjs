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
        (await seite.locator('#pruefung-ansicht .band-hinweis').innerText()).includes('entscheiden tun die Regeln'),
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

s.test('Browser wieder schließen', () => schliessen());

export default s;
