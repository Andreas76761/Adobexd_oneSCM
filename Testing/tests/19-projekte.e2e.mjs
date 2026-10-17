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

/* ------------------------------------------------ Arbeitsmenge (1.36.0) */

/** Zwei Projekte, drei Bilder: zwei in 2.4, eines in 2.3, jedes mit Stelle. */
async function zweiProjekteDreiBilder(seite) {
  await oeffneProjekte(seite);
  await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');
  await nimmAuf(seite, 'Liste 2.4');
  await nimmAuf(seite, 'Formular 2.4');
  await oeffneProjekte(seite);
  await legeAn(seite, 'oneSCM Portal', '2.3', 'Germany');
  await nimmAuf(seite, 'Liste 2.3');
  // Jedes Bild bekommt eine Stelle, damit die Gliederung zählen kann.
  for (const [kennung, stelle] of [
    ['AUF-2026-001', '7.5.1'],
    ['AUF-2026-002', '7.5.2'],
    ['AUF-2026-003', '7.5.1']
  ]) {
    await seite.click('.portal-nav button[data-ansicht="markieren"]');
    await seite.selectOption('#markier-wahl', kennung);
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', stelle);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(200);
  }
  await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
  await seite.waitForTimeout(150);
}

s.test('die Arbeitsmenge im Kopf nennt jedes Projekt mit seiner Zahl', () =>
  mitSeite(
    async (seite) => {
      await zweiProjekteDreiBilder(seite);
      const einträge = await seite.locator('#projekt-wahl option').allInnerTexts();
      gleich(einträge[0], 'alle Projekte (3)');
      wahr(einträge.includes('oneSCM Portal 2.4 · Germany (2)'), einträge.join(' | '));
      wahr(einträge.includes('oneSCM Portal 2.3 · Germany (1)'), einträge.join(' | '));
      gleich(await seite.locator('#projekt-wahl-stand').innerText(), '', 'ohne Wahl steht kein Stand da');
    },
    { hash: AUFNAHME }
  ));

s.test('die gewählte Arbeitsmenge gilt in Eingang, Gliederung und Verzeichnis', () =>
  mitSeite(
    async (seite) => {
      await zweiProjekteDreiBilder(seite);
      await seite.selectOption('#projekt-wahl', 'PRJ-onescm-portal-2-4-germany');
      await seite.waitForTimeout(250);
      wahr(
        (await seite.locator('#projekt-wahl-stand').innerText()).includes('2 von 3'),
        await seite.locator('#projekt-wahl-stand').innerText()
      );

      // Eingang: nur die beiden Bilder aus 2.4.
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      gleich(await seite.locator('#eingang-raster .eingang-karte').count(), 2);
      gleich(await seite.locator('#eingang-treffer').innerText(), '2 Aufnahmen');

      // Gliederung: gezählt wird die Arbeitsmenge, nicht der Eingang.
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.waitForSelector('#gliederung-ansicht:not([hidden])');
      const kacheln = await seite.locator('#gliederung-kennzahlen .eingang-kachel').allInnerTexts();
      // Die Schilder stehen in Versalien - verglichen wird klein geschrieben.
      const zugeordnet = kacheln.find((k) => k.toLowerCase().startsWith('bilder zugeordnet'));
      wahr(zugeordnet && /\b2\b/.test(zugeordnet), 'Kacheln: ' + kacheln.join(' | '));
      wahr(zugeordnet && zugeordnet.toLowerCase().includes('arbeitsmenge'), 'Kachel: ' + zugeordnet);

      // Verzeichnis: der Plan nennt nur die Bilder der Arbeitsmenge.
      await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
      await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
      const plan = await seite.locator('#verzeichnis-plan').innerText();
      wahr(plan.includes('auf-2026-001') && plan.includes('auf-2026-002'), plan.slice(0, 400));
      wahr(!plan.includes('auf-2026-003'), 'ein fremdes Bild steht im Plan');

      // Editor: die Wahl zeigt die Arbeitsmenge – und das Bild, das gerade
      // offen ist, auch wenn es nicht dazugehört. Sonst verschwände es unter
      // der Hand.
      await seite.click('.portal-nav button[data-ansicht="markieren"]');
      const wahl = await seite.locator('#markier-wahl option').allInnerTexts();
      gleich(wahl.length, 4, wahl.join(' | '));
      wahr(wahl.some((w) => w.includes('AUF-2026-003')), 'das offene Bild fehlt: ' + wahl.join(' | '));

      // Ist ein Bild der Arbeitsmenge offen, stehen nur deren Bilder da.
      await seite.selectOption('#markier-wahl', 'AUF-2026-001');
      await seite.waitForTimeout(250);
      gleich(await seite.locator('#markier-wahl option').count(), 3, 'ein Eintrag plus zwei Bilder');

      // Die Wahl überlebt das Neuladen – gleich in welcher Ansicht.
      await seite.reload();
      await seite.waitForFunction(
        () => document.getElementById('projekt-wahl').options.length > 1,
        null,
        { timeout: 8000 }
      );
      gleich(await seite.locator('#projekt-wahl').inputValue(), 'PRJ-onescm-portal-2-4-germany');
    },
    { hash: AUFNAHME }
  ));

s.test('„Nur dieses" in der Liste setzt dieselbe Arbeitsmenge und nimmt sie zurück', () =>
  mitSeite(
    async (seite) => {
      await zweiProjekteDreiBilder(seite);
      await oeffneProjekte(seite);
      await seite.locator('.projekt-zeile', { hasText: '2.3' }).locator('button', { hasText: 'Nur dieses' }).click();
      await seite.waitForTimeout(250);
      gleich(await seite.locator('#projekt-wahl').inputValue(), 'PRJ-onescm-portal-2-3-germany');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('#eingang-raster .eingang-karte').count(), 1);

      await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
      await oeffneProjekte(seite);
      await seite.locator('.projekt-zeile', { hasText: '2.3' }).locator('button', { hasText: 'Alle zeigen' }).click();
      await seite.waitForTimeout(250);
      gleich(await seite.locator('#projekt-wahl').inputValue(), '');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('#eingang-raster .eingang-karte').count(), 3);
    },
    { hash: AUFNAHME }
  ));

s.test('eine leere Arbeitsmenge sagt, woran es liegt', () =>
  mitSeite(
    async (seite) => {
      await oeffneProjekte(seite);
      await legeAn(seite, 'Admin-Konsole', '1.0', 'Austria');
      await nimmAuf(seite, 'Gehört zur Konsole');
      // Ein zweites Projekt ohne Bilder.
      await oeffneProjekte(seite);
      await legeAn(seite, 'oneSCM Portal', '2.4', 'Germany');
      await seite.selectOption('#projekt-wahl', 'PRJ-onescm-portal-2-4-germany');
      await seite.waitForTimeout(200);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      gleich(await seite.locator('#eingang-raster .eingang-karte').count(), 0);
      wahr(
        (await seite.locator('#eingang-leer-text').innerText()).includes('oneSCM Portal 2.4 · Germany'),
        await seite.locator('#eingang-leer-text').innerText()
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
