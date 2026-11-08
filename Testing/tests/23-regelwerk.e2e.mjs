/**
 * Browserprüfung des Registers Regelwerk (F-80) und der Vormerkung (F-79).
 *
 * Geprüft wird, was man nur im Browser sieht: dass eine angelegte Regel an
 * allen drei Orten anschlägt – im Register selbst, als Agent in der
 * Prüfung und vor dem Erzeugen –, und dass vorgemerkte Abschnitte aus dem
 * Handbuch fallen, solange der Schalter aus ist.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Regelwerk – Oberfläche');

const REGELWERK = '#ans=regelwerk';
const AUFNAHME = '#ans=aufnahme';

/** Eine Aufnahme ohne Markt und ohne Notiz – sie verstößt gegen beides. */
async function eineAufnahme(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 8000 });
  await seite.fill('#feld-titel', 'Vertragsmaske');
  await seite.click('#ausloesen');
  await seite.waitForTimeout(250);
}

/** Legt im Register eine Regel an. */
async function legeRegelAn(seite, { art, wert = '', geltung = '', schaerfe = 'hinweis' }) {
  await seite.click('.portal-nav button[data-ansicht="regelwerk"]');
  await seite.waitForSelector('#regelwerk-ansicht:not([hidden])');
  await seite.selectOption('#regel-art', art);
  await seite.waitForTimeout(150);
  if (wert) await seite.fill('#regel-wert', wert).catch(() => seite.selectOption('#regel-wert', wert));
  if (geltung) await seite.fill('#regel-geltung', geltung);
  await seite.selectOption('#regel-schaerfe', schaerfe);
  await seite.waitForTimeout(120);
  await seite.click('#regel-anlegen');
  await seite.waitForTimeout(250);
}

s.test('ohne Regel erklärt sich das Register', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#regelwerk-ansicht').isVisible(), true);
    wahr(
      (await seite.locator('#regelwerk-liste').innerText()).includes('Noch keine Regel'),
      await seite.locator('#regelwerk-liste').innerText()
    );
    gleich(await seite.locator('#regelwerk-stand').innerText(), 'noch keine Regel');
    // Die drei Prüforte stehen da, bevor jemand eine Regel anlegt.
    const hinweis = await seite.locator('#regelwerk-ansicht .band-hinweis').first().innerText();
    wahr(hinweis.includes('Prüfung') && hinweis.includes('Erzeugen'), hinweis);
  }, { hash: REGELWERK }));

s.test('eine Regel wird angelegt und misst sofort am Bestand', () =>
  mitSeite(
    async (seite) => {
      await eineAufnahme(seite);
      await legeRegelAn(seite, { art: 'begruendung', schaerfe: 'hinweis' });
      const liste = await seite.locator('#regelwerk-liste').innerText();
      wahr(liste.includes('Notiz'), liste);
      wahr(liste.includes('Heute:'), 'der Stand am heutigen Bestand fehlt: ' + liste);
      wahr((await seite.locator('#regelwerk-stand').innerText()).includes('1 Regel'), await seite.locator('#regelwerk-stand').innerText());

      // Sie überlebt das Neuladen – sie liegt im Speicher.
      await seite.reload();
      await seite.waitForSelector('#regelwerk-ansicht:not([hidden])');
      await seite.waitForTimeout(300);
      wahr((await seite.locator('#regelwerk-liste').innerText()).includes('Notiz'), 'die Regel ist nicht geblieben');
    },
    { hash: AUFNAHME }
  ));

s.test('eine Pflichtregel hält das Erzeugen an, ein Hinweis nicht', () =>
  mitSeite(
    async (seite) => {
      await eineAufnahme(seite);
      await legeRegelAn(seite, { art: 'pflichtlabel', wert: 'markt', schaerfe: 'pflicht' });

      // Im Eingang trägt die Aufnahme die Marke.
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      await seite.waitForTimeout(250);
      gleich(await seite.locator('.eingang-karte--regel').count(), 1, 'die Karte nennt den Verstoß nicht');

      // Im Designstudio hält sie das Handbuch an und sagt, warum.
      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForSelector('#design-ansicht:not([hidden])');
      await seite.evaluate(() => (document.getElementById('design-studio').open = true));
      // „alle" nimmt auch Stellen ohne Bild – sonst bliebe der Umfang leer
      // und der Knopf gesperrt, und die Regel käme gar nicht zum Zug.
      await seite.selectOption('#handbuch-umfang', 'alle');
      await seite.waitForTimeout(500);
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(
        () => /Pflichtregel/.test(document.getElementById('design-meldung').textContent),
        null,
        { timeout: 8000 }
      );
      const meldung = await seite.locator('#design-meldung').innerText();
      wahr(meldung.includes('Markt'), meldung);
      wahr(meldung.includes('Regelwerk'), 'der Weg zur Regel wird nicht genannt: ' + meldung);
    },
    { hash: AUFNAHME }
  ));

s.test('der Agent Regelwerk zählt im Register Prüfung mit', () =>
  mitSeite(
    async (seite) => {
      await eineAufnahme(seite);
      await legeRegelAn(seite, { art: 'begruendung', schaerfe: 'hinweis' });
      await seite.click('.portal-nav button[data-ansicht="pruefung"]');
      await seite.waitForSelector('#pruefung-ansicht:not([hidden])');
      gleich(await seite.locator('#pruef-regelwerk').count(), 1, 'der Agent fehlt');
      await seite.click('#pruef-regelwerk');
      await seite.waitForFunction(
        () => document.querySelectorAll('.pruef-kennzahlen').length >= 1,
        null,
        { timeout: 8000 }
      );
      // Die Schilder stehen in Kapitälchen – gelesen wird ohne Rücksicht
      // auf Groß und Klein.
      const karte = (await seite.locator('.pruef-agent', { hasText: 'Regelwerk' }).innerText()).replace(/\n/g, ' ');
      wahr(/regeln\s*1/i.test(karte), karte.slice(0, 220));
      // Ein Hinweis zählt als Hinweis, nicht als Verstoß – nur eine
      // Pflichtregel ist ein Verstoß.
      wahr(/verst(ö|Ö)(ss|SS|ß)e\s*0/i.test(karte), karte.slice(0, 220));
      wahr(/hinweise\s*1/i.test(karte), karte.slice(0, 220));
      wahr(karte.includes('Notiz'), 'der Befund nennt die Regel nicht: ' + karte.slice(0, 220));
    },
    { hash: AUFNAHME }
  ));

s.test('vorgemerkte Abschnitte fallen aus dem Handbuch – bis man sie dazunimmt', () =>
  mitSeite(
    async (seite) => {
      // Die Kapitel 24 und 25 sind vorgemerkt geboren (F-79).
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.waitForSelector('#gliederung-ansicht:not([hidden])');
      await seite.fill('#gliederung-suche', 'Intern');
      await seite.waitForTimeout(350);
      await seite.locator('.stelle-waehlen[data-waehlen="24"]').first().click();
      await seite.waitForSelector('#stelle-vormerkung');
      gleich(await seite.locator('#stelle-vormerkung').inputValue(), 'intern');

      // Eine gewöhnliche Stelle ist nicht vorgemerkt – und lässt sich vormerken.
      await seite.fill('#gliederung-suche', '7.5.1');
      await seite.waitForTimeout(350);
      await seite.locator('.stelle-waehlen[data-waehlen="7.5.1"]').first().click();
      await seite.waitForSelector('#stelle-vormerkung');
      gleich(await seite.locator('#stelle-vormerkung').inputValue(), '');
      await seite.selectOption('#stelle-vormerkung', 'planung');
      await seite.waitForTimeout(300);
      const gespeichert = await seite.evaluate(() =>
        JSON.parse(localStorage.getItem('screenarchiv:texte') || '{}').texte['7.5.1']
      );
      gleich(gespeichert.vormerkung, 'planung', 'die Vormerkung liegt nicht bei den eigenen Texten');

      // Im Designstudio sagt der Umfang, was wegfällt – und der Schalter
      // nimmt es wieder dazu.
      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForSelector('#design-ansicht:not([hidden])');
      await seite.evaluate(() => (document.getElementById('design-studio').open = true));
      await seite.selectOption('#handbuch-umfang', 'alle');
      await seite.waitForTimeout(400);
      const ohne = await seite.locator('#handbuch-umfang-stand').innerText();
      wahr(/nicht in der Ausgabe/.test(ohne), ohne);
      wahr(/In Planung/.test(ohne), ohne);
      await seite.check('#handbuch-vorgemerkt');
      await seite.waitForTimeout(400);
      const mit = await seite.locator('#handbuch-umfang-stand').innerText();
      wahr(/mit\*\*|mit/.test(mit) && /Ausgabe/.test(mit), mit);
      // Mit Schalter sind es mehr Stellen als ohne.
      const zahl = (t) => Number((t.match(/(\d+) Stellen/) || [0, 0])[1]);
      wahr(zahl(mit) > zahl(ohne), `mit ${zahl(mit)} Stellen, ohne ${zahl(ohne)}`);
    },
    { hash: '#ans=gliederung' }
  ));

s.test('das Register Output lässt Vorgemerktes ebenso weg (1.79.0)', () =>
  mitSeite(
    async (seite) => {
      // Bis 1.78.0 filterte nur das Designstudio: im Register Output stand
      // eine vorgemerkte Stelle zur Wahl und wurde auch gerechnet. Zwei
      // Wege, zwei Antworten.
      await eineAufnahme(seite);
      // Das Bild an eine vorgemerkte Stelle hängen.
      await seite.click('#letzte-editor');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      await seite.fill('#markier-stelle', '24.1');
      await seite.click('#markier-sichern');
      await seite.waitForTimeout(300);

      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.waitForSelector('#output-ansicht:not([hidden])');
      await seite.waitForTimeout(400);
      const ohne = await seite.locator('#output-inhalte').innerText();
      wahr(!/24\.1/.test(ohne), 'die vorgemerkte Stelle steht zur Wahl: ' + ohne);
      wahr(
        /vorgemerkte/.test(await seite.locator('#output-vorgemerkt-stand').innerText()),
        await seite.locator('#output-vorgemerkt-stand').innerText()
      );

      // Mit dem Schalter steht sie da – eine interne Fassung ist möglich.
      await seite.check('#output-vorgemerkt');
      await seite.waitForTimeout(400);
      wahr(/24\.1/.test(await seite.locator('#output-inhalte').innerText()), 'mit Schalter fehlt sie immer noch');

      // Und wer sie wählt und den Schalter wieder ausmacht, rechnet sie
      // nicht stillschweigend weiter.
      await seite.selectOption('#output-inhalte', ['kapitel:24.1']);
      await seite.waitForTimeout(300);
      await seite.uncheck('#output-vorgemerkt');
      await seite.waitForTimeout(400);
      gleich(await seite.locator('.output-zeile').count(), 0, 'die vorgemerkte Stelle wird weitergerechnet');
    },
    { hash: AUFNAHME }
  ));

s.test('der Baum zeigt, was vorgemerkt ist (1.79.0)', () =>
  mitSeite(async (seite) => {
    await seite.fill('#gliederung-suche', 'Intern');
    await seite.waitForTimeout(350);
    // Gelesen wird der Text im Markup: angezeigt wird er in Kapitälchen,
    // und `allInnerTexts` liefert dann „INTERN".
    const marken = await seite.evaluate(() =>
      [...document.querySelectorAll('.gliederung-baum .regel-marke')].map((e) => e.textContent.trim())
    );
    wahr(marken.includes('Intern'), 'der Baum nennt die Vormerkung nicht: ' + marken.join(' | '));
  }, { hash: '#ans=gliederung' }));

s.test('Browser wieder schließen', () => schliessen());

export default s;
