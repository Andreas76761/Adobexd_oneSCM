/**
 * Browserprüfung der Projekte: anlegen nach Name, Version und Land, wählen,
 * zählen, löschen – und was davon an den nächsten Aufnahmen hängenbleibt.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Projekte – Oberfläche');

const AUFNAHME = '#ans=aufnahme';

/** Öffnet den Projektblock im Aufnahmeformular. */
const oeffneProjekte = (seite) =>
  seite.evaluate(() => {
    document.getElementById('projekt-verwaltung').open = true;
  });

/** Legt ein Projekt über die drei Felder an. */
async function legeAn(seite, name, version, land) {
  await seite.fill('#projekt-neu-name', name);
  await seite.fill('#projekt-neu-version', version);
  await seite.fill('#projekt-neu-land', land);
  await seite.click('#projekt-anlegen');
  await seite.waitForTimeout(120);
}

/** Eine Aufnahme aus dem Beispielbild, mit dem Titel aus dem Argument. */
async function nimmAuf(seite, titel) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  await seite.fill('#feld-titel', titel);
  await seite.click('#ausloesen');
  await seite.waitForTimeout(200);
}

const projekteImSpeicher = (seite) =>
  seite.evaluate(() => {
    const roh = localStorage.getItem('screenarchiv:projekte');
    return roh ? JSON.parse(roh).projekte : [];
  });

const eingangImSpeicher = (seite) =>
  seite.evaluate(() => {
    const roh = localStorage.getItem('screenarchiv:eingang');
    return roh ? JSON.parse(roh).aufnahmen : [];
  });

s.test('ohne Projekt erklärt der Block, was zu tun ist', () =>
  mitSeite(
    async (seite) => {
      await oeffneProjekte(seite);
      gleich(await seite.locator('#projekt-stand').innerText(), 'noch keins angelegt');
      wahr(
        (await seite.locator('#projekt-liste').innerText()).includes('Noch kein Projekt angelegt'),
        'der leere Block sagt nichts'
      );
      // Die Felder Version und Land stehen am Formular, nicht nur im Projekt.
      gleich(await seite.locator('#feld-version').count(), 1);
      gleich(await seite.locator('#feld-land').count(), 1);
    },
    { hash: AUFNAHME }
  ));

s.test('ein Projekt wird angelegt, gilt sofort und überlebt das Neuladen', () =>
  mitSeite(
    async (seite) => {
      await oeffneProjekte(seite);
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');

      gleich(await seite.locator('#projekt-stand').innerText(), '1 angelegt');
      gleich(await seite.locator('.projekt-zeile').count(), 1);
      gleich(await seite.locator('.projekt-waehlen').first().innerText(), 'oneSCM Portal 2.4 · Germany');
      // Wer anlegt, will damit arbeiten: das Formular ist gefüllt.
      gleich(await seite.locator('#feld-projekt').inputValue(), 'oneSCM Portal');
      gleich(await seite.locator('#feld-version').inputValue(), '2.4');
      gleich(await seite.locator('#feld-land').inputValue(), 'Germany');
      gleich(await seite.locator('.projekt-zeile--gewaehlt').count(), 1);
      // Die Eingabefelder sind wieder leer - das nächste Projekt ist ein neues.
      gleich(await seite.locator('#projekt-neu-name').inputValue(), '');

      const gespeichert = await projekteImSpeicher(seite);
      gleich(gespeichert.length, 1);
      gleich(gespeichert[0].id, 'PRJ-onescm-portal-2-4-germany');

      await seite.reload();
      await seite.waitForSelector('#aufnahme-ansicht:not([hidden])');
      await oeffneProjekte(seite);
      gleich(await seite.locator('#projekt-stand').innerText(), '1 angelegt');
    },
    { hash: AUFNAHME }
  ));

s.test('dieselben drei Teile ein zweites Mal werden abgewiesen', () =>
  mitSeite(
    async (seite) => {
      await oeffneProjekte(seite);
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');
      gleich(await seite.locator('.projekt-zeile').count(), 1, 'die Dublette ist durchgegangen');
      wahr((await seite.locator('#projekt-meldung').innerText()).includes('gibt es schon'),
        await seite.locator('#projekt-meldung').innerText());

      // Ohne Namen geht nichts.
      await legeAn(seite, '', '2.5', 'Korea');
      wahr((await seite.locator('#projekt-meldung').innerText()).includes('Namen'),
        await seite.locator('#projekt-meldung').innerText());

      // Dasselbe Projekt in einem anderen Land ist ein eigenes.
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Korea');
      gleich(await seite.locator('.projekt-zeile').count(), 2);
    },
    { hash: AUFNAHME }
  ));

s.test('das gewählte Projekt trägt Version und Land in die nächsten Aufnahmen', () =>
  mitSeite(
    async (seite) => {
      await oeffneProjekte(seite);
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');
      await legeAn(seite, 'oneSCM Portal', '2.3', 'Korea');
      // Angelegt wurde zuletzt 2.3 · Korea - das gilt jetzt.
      await nimmAuf(seite, 'Vorlagenliste alt');

      // Zurück auf 2.4 · Germany und ein zweites Bild.
      await oeffneProjekte(seite);
      const germany = seite.locator('.projekt-waehlen', { hasText: 'Germany' });
      await germany.click();
      await seite.waitForTimeout(150);
      await nimmAuf(seite, 'Vorlagenliste neu');

      const aufnahmen = await eingangImSpeicher(seite);
      gleich(aufnahmen.length, 2);
      const alt = aufnahmen.find((a) => a.titel === 'Vorlagenliste alt');
      const neu = aufnahmen.find((a) => a.titel === 'Vorlagenliste neu');
      gleich(alt.version, '2.3');
      gleich(alt.land, 'Korea');
      gleich(neu.version, '2.4');
      gleich(neu.land, 'Germany');

      // Die Liste zählt, was an jedem Projekt hängt.
      await oeffneProjekte(seite);
      const zeilen = await seite.locator('.projekt-zeile .kennung').allInnerTexts();
      gleich(zeilen.filter((z) => z === '1 Bild').length, 2, zeilen.join(' | '));

      // Im Eingang lässt sich das Land nachtragen und wird gefunden.
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      await seite.fill('#eingang-suche', 'Korea');
      await seite.waitForTimeout(200);
      gleich(await seite.locator('#eingang-raster .eingang-karte').count(), 1, 'nach dem Land lässt sich nicht suchen');
    },
    { hash: AUFNAHME }
  ));

s.test('ein von Hand getipptes Projekt wird vorgeschlagen und übernommen', () =>
  mitSeite(
    async (seite) => {
      // Von Hand getippt, nicht angelegt.
      await seite.click('#quelle-beispiel');
      await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
      await seite.fill('#feld-titel', 'Handgetippt');
      await seite.fill('#feld-projekt', 'Admin-Konsole');
      await seite.fill('#feld-version', '1.0');
      await seite.fill('#feld-land', 'Austria');
      await seite.click('#ausloesen');
      await seite.waitForTimeout(200);

      await oeffneProjekte(seite);
      gleich(await seite.locator('.projekt-zeile--offen').count(), 1);
      wahr(
        (await seite.locator('.projekt-zeile--offen').innerText()).includes('Admin-Konsole 1.0 · Austria'),
        await seite.locator('.projekt-zeile--offen').innerText()
      );
      await seite.locator('.projekt-zeile--offen button').click();
      await seite.waitForTimeout(150);
      gleich(await seite.locator('.projekt-zeile--offen').count(), 0, 'der Vorschlag steht noch da');
      gleich(await seite.locator('#projekt-stand').innerText(), '1 angelegt');
      gleich((await projekteImSpeicher(seite)).length, 1);
    },
    { hash: AUFNAHME }
  ));

s.test('ein gelöschtes Projekt nimmt keine Bilder mit', () =>
  mitSeite(
    async (seite) => {
      await oeffneProjekte(seite);
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');
      await nimmAuf(seite, 'Bleibt da');

      await oeffneProjekte(seite);
      await seite.locator('.projekt-zeile button', { hasText: 'Löschen' }).click();
      await seite.waitForTimeout(150);
      // Das Projekt ist weg - aber es steht noch an einem Bild, also wieder
      // als Vorschlag da.
      gleich(await seite.locator('.projekt-zeile--gewaehlt').count(), 0);
      gleich(await seite.locator('.projekt-zeile--offen').count(), 1);
      wahr((await seite.locator('#projekt-meldung').innerText()).includes('Die Bilder bleiben'),
        await seite.locator('#projekt-meldung').innerText());
      gleich((await eingangImSpeicher(seite)).length, 1, 'das Bild ist mitgegangen');
    },
    { hash: AUFNAHME }
  ));

s.test('Version und Land lassen sich im Eingang nachtragen', () =>
  mitSeite(
    async (seite) => {
      await nimmAuf(seite, 'Ohne Projektstand');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#bearbeite-version');
      await seite.fill('#bearbeite-version', '2.5');
      await seite.fill('#bearbeite-land', 'Spain');
      await seite.click('#bearbeite-speichern');
      await seite.waitForTimeout(250);
      const aufnahmen = await eingangImSpeicher(seite);
      gleich(aufnahmen[0].version, '2.5');
      gleich(aufnahmen[0].land, 'Spain');
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
