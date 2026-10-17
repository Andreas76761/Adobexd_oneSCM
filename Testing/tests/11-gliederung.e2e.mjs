/**
 * Browserprüfung der Gliederung: 1153 Stellen aus der Arbeitsmappe des
 * Projekts, die Zahl der Bilder je Stelle und die Zuordnung im Editor.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Gliederung – Oberfläche');

const GLIEDERUNG = '#ans=gliederung';
const AUFNAHME = '#ans=aufnahme';

/** Legt eine Aufnahme an und ordnet sie einer Stelle zu. */
async function aufnahmeAnStelle(seite, stelle) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  await seite.fill('#feld-titel', 'Signaturergebnis prüfen');
  await seite.fill('#feld-projekt', 'oneSCM Portal');
  await seite.selectOption('#feld-kategorie', 'Formular');
  await seite.fill('#feld-begriffe', 'signatur');
  await seite.click('#ausloesen');
  await seite.waitForSelector('#letzte-aufnahme:not([hidden])');
  await seite.click('#letzte-editor');
  await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
  await seite.fill('#markier-stelle', stelle);
  await seite.waitForTimeout(200);
  await seite.click('#markier-sichern');
  await seite.waitForFunction(
    () => /Fassung 1/.test(document.getElementById('markier-meldung').textContent),
    null,
    { timeout: 5000 }
  );
}

s.test('die Gliederung des Handbuchs steht vollständig in der Seite', () =>
  mitSeite(async (seite) => {
    await seite.waitForFunction(
      () => document.querySelectorAll('.gliederung-baum > .stelle').length > 20,
      null,
      { timeout: 5000 }
    );
    wahr((await seite.locator('#gliederung-stand').innerText()).includes('1153'), 'die Zahl der Stellen stimmt nicht');
    const kennzahlen = await seite.locator('.gliederung-kennzahlen').innerText();
    wahr(/23/.test(kennzahlen), 'die 23 Kapitel fehlen: ' + kennzahlen.replace(/\n/g, ' '));
    // Die oberste Ebene steht da, die Unterkapitel erst nach dem Aufklappen.
    gleich(await seite.locator('.stelle--ebene2').count(), 0, 'alles ist schon aufgeklappt');
    await seite.locator('.stelle--ebene1 .stelle-schalter').first().click();
    await seite.waitForFunction(() => document.querySelectorAll('.stelle--ebene2').length > 0, null, { timeout: 5000 });
  }, { hash: GLIEDERUNG }));

s.test('die Suche findet Stellen und zeigt ihren Zusammenhang', () =>
  mitSeite(async (seite) => {
    await seite.fill('#gliederung-suche', 'signaturergebnis');
    await seite.waitForFunction(
      () => document.getElementById('gliederung-stand').textContent.startsWith('1 von'),
      null,
      { timeout: 5000 }
    );
    const text = await seite.locator('.gliederung-baum').innerText();
    wahr(text.includes('7.5.2'), 'die Stelle fehlt');
    wahr(text.includes('Digitale Unterschrift'), 'das übergeordnete Kapitel fehlt');
    await seite.fill('#gliederung-suche', 'gibtesnicht');
    await seite.waitForFunction(
      () => document.getElementById('gliederung-stand').textContent.startsWith('0 von'),
      null,
      { timeout: 5000 }
    );
    gleich(await seite.locator('.stelle-zeile').count(), 0, 'ohne Treffer steht trotzdem etwas da');
  }, { hash: GLIEDERUNG }));

s.test('ein zugeordnetes Bild zählt an seiner Stelle und darüber', () =>
  mitSeite(
    async (seite) => {
      await aufnahmeAnStelle(seite, '7.5.2');
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.fill('#gliederung-suche', '7.5.2');
      // Die Suche ist gedrosselt - gewartet wird auf die gefilterte Liste.
      await seite.waitForFunction(
        () =>
          [...document.querySelectorAll('.stelle-nummer')].some((n) => n.textContent === '7.5.2') &&
          document.querySelectorAll('.stelle-zeile').length < 20,
        null,
        { timeout: 5000 }
      );
      const zahlen = await seite.evaluate(() =>
        [...document.querySelectorAll('.stelle-zeile')].map((z) => ({
          nummer: z.querySelector('.stelle-nummer').textContent,
          zahl: z.querySelector('.stelle-zahl').textContent
        }))
      );
      const stelle = zahlen.find((z) => z.nummer === '7.5.2');
      const kapitel = zahlen.find((z) => z.nummer === '7');
      wahr(stelle && kapitel, 'die Stellen fehlen: ' + JSON.stringify(zahlen));
      gleich(stelle.zahl, '1', 'die Stelle zählt ihr Bild nicht');
      gleich(kapitel.zahl, '0 (1)', 'das Kapitel zählt das Bild des Unterkapitels nicht mit');
      const kennzahlen = await seite.locator('.gliederung-kennzahlen').innerText();
      wahr(/BILDER ZUGEORDNET\n1/i.test(kennzahlen), 'die Kennzahl stimmt nicht: ' + kennzahlen.replace(/\n/g, '|'));
    },
    { hash: AUFNAHME }
  ));

s.test('der Editor nennt das Thema der Stelle und warnt bei unbekannten', () =>
  mitSeite(
    async (seite) => {
      await aufnahmeAnStelle(seite, '7.5.2');
      gleich(await seite.locator('#markier-stelle-thema').innerText(), 'Signaturergebnis');
      await seite.fill('#markier-stelle', '99.9.9');
      await seite.waitForTimeout(250);
      wahr(
        (await seite.locator('#markier-stelle-thema').innerText()).includes('steht nicht in der Gliederung'),
        'eine erfundene Stelle wird nicht beanstandet'
      );
      // Die Vorschläge kommen aus der Gliederung, nicht aus dem Nichts.
      await seite.fill('#markier-stelle', 'signatur');
      await seite.waitForFunction(
        () => document.querySelectorAll('#gliederung-vorschlaege option').length > 3,
        null,
        { timeout: 5000 }
      );
      const erste = await seite.locator('#gliederung-vorschlaege option').first().getAttribute('value');
      wahr(/^[0-9]/.test(erste), 'der Vorschlag trägt keine Nummer: ' + erste);
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
