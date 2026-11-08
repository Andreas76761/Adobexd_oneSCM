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

/**
 * Nachbau der Ablage, der die Datei mitliest - fuer den Vermerk der
 * internen Fassung reicht der Dateiname nicht. `downloads.save` nimmt laut
 * Vertrag `string | Blob | ArrayBuffer | ArrayBufferView`.
 */
const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      const text = typeof auftrag.data === 'string' ? auftrag.data : await auftrag.data.text();
      window.__abgelegt.push({ filename: auftrag.filename, inhalt: text });
      return { status: 'saved' };
    } } };`;
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

s.test('dieselbe Regel zweimal legt sie nicht zweimal an (1.82.0)', () =>
  mitSeite(
    async (seite) => {
      await legeRegelAn(seite, { art: 'begruendung', schaerfe: 'hinweis' });
      gleich(await seite.locator('.regel-zeile').count(), 1);
      await seite.click('#regel-anlegen');
      await seite.waitForTimeout(300);
      gleich(await seite.locator('.regel-zeile').count(), 1, 'die Regel steht zweimal da');
      wahr(
        /gibt es schon/.test(await seite.locator('#regelwerk-meldung').innerText()),
        await seite.locator('#regelwerk-meldung').innerText()
      );

      // Eine Regel, die nur anders scharf ist, ist eine andere Regel.
      await seite.selectOption('#regel-schaerfe', 'pflicht');
      await seite.waitForTimeout(150);
      await seite.click('#regel-anlegen');
      await seite.waitForTimeout(300);
      gleich(await seite.locator('.regel-zeile').count(), 2);

      // Und Löschen trifft genau eine - die Kennungen sind eindeutig.
      await seite.locator('.regel-zeile').first().locator('button', { hasText: 'Löschen' }).click();
      await seite.waitForTimeout(300);
      gleich(await seite.locator('.regel-zeile').count(), 1, 'Löschen hat mehr als eine Regel getroffen');
    },
    { hash: REGELWERK }
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

s.test('„Nichts Vorgemerktes" haelt erst an, wenn der Schalter an ist (1.80.0)', () =>
  mitSeite(
    async (seite) => {
      // Die Kapitel 24 und 25 sind vorgemerkt geboren. Ein Bild dort hielt
      // bis 1.80.0 jede Ausgabe an - obwohl nichts Vorgemerktes in ihr
      // stand. Die Regel war als Pflicht nie erfuellbar.
      await eineAufnahme(seite);
      await seite.click('#letzte-editor');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      await seite.fill('#markier-stelle', '24.1');
      await seite.click('#markier-sichern');
      await seite.waitForTimeout(300);
      await legeRegelAn(seite, { art: 'keine-vorgemerkten', schaerfe: 'pflicht' });
      // Im Register selbst steht sie als Hinweis da, nicht als Verstoss.
      const vorschau = await seite.locator('#regelwerk-liste').innerText();
      wahr(/vorgemerkte Stelle/.test(vorschau), vorschau);

      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForSelector('#design-ansicht:not([hidden])');
      await seite.evaluate(() => (document.getElementById('design-studio').open = true));
      await seite.selectOption('#handbuch-umfang', 'alle');
      await seite.waitForTimeout(500);
      await seite.click('#handbuch-sichern');
      // Ohne Schalter laeuft es durch: die Meldung nennt keine Pflichtregel.
      await seite.waitForTimeout(2500);
      const ohne = await seite.locator('#design-meldung').innerText();
      wahr(!/Pflichtregel/.test(ohne), 'die Regel haelt an, obwohl nichts Vorgemerktes ausgegeben wird: ' + ohne);

      // Mit Schalter ist die Ausgabe eine interne Fassung - dann haelt sie an.
      await seite.check('#handbuch-vorgemerkt');
      await seite.waitForTimeout(400);
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(
        () => /Pflichtregel/.test(document.getElementById('design-meldung').textContent),
        null,
        { timeout: 8000 }
      );
      const mit = await seite.locator('#design-meldung').innerText();
      wahr(/vorgemerkte Abschnitte/.test(mit), mit);
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

s.test('ein Bild an vorgemerkter Unterstelle kommt auch ueber das Oberkapitel nicht mit (1.80.0)', () =>
  mitSeite(
    async (seite) => {
      // 1.79.0 filterte die Liste der Inhalte - also die Stelle, die jemand
      // anklickt. 7.5 ist nicht vormerkt, 7.5.1 ist es: wer 7.5 waehlte,
      // bekam das Bild von 7.5.1 trotzdem. Im Handbuch fehlte es.
      await eineAufnahme(seite);
      await seite.click('#letzte-editor');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      await seite.fill('#markier-stelle', '7.5.1');
      await seite.click('#markier-sichern');
      await seite.waitForTimeout(300);

      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.waitForSelector('#output-ansicht:not([hidden])');
      await seite.waitForTimeout(400);
      // Ohne Vormerkung steht 7.5 mit seinem einen Bild da.
      wahr(/7\.5 /.test(await seite.locator('#output-inhalte').innerText()), 'ohne Vormerkung fehlt 7.5');
      await seite.selectOption('#output-inhalte', ['kapitel:7.5']);
      await seite.waitForTimeout(400);
      gleich(await seite.locator('.output-zeile td:nth-child(6)').first().innerText(), '1');

      // Jetzt 7.5.1 vormerken - die Wahl 7.5 bleibt stehen, das Bild nicht.
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.waitForSelector('#gliederung-ansicht:not([hidden])');
      await seite.fill('#gliederung-suche', '7.5.1');
      await seite.waitForTimeout(350);
      await seite.locator('.stelle-waehlen[data-waehlen="7.5.1"]').first().click();
      await seite.waitForSelector('#stelle-vormerkung');
      await seite.selectOption('#stelle-vormerkung', 'intern');
      await seite.waitForTimeout(300);

      await seite.click('.portal-nav button[data-ansicht="output"]');
      await seite.waitForSelector('#output-ansicht:not([hidden])');
      await seite.waitForTimeout(400);
      const gewaehlt = await seite.evaluate(() =>
        [...document.getElementById('output-inhalte').selectedOptions].map((o) => o.value)
      );
      gleich(gewaehlt.join(','), 'kapitel:7.5', 'die Wahl 7.5 ist nicht mehr gesetzt: ' + gewaehlt.join(','));
      // Die Zeile verspricht auch nicht mehr ein Bild, das nicht kommt.
      const schild = await seite.evaluate(
        () => [...document.getElementById('output-inhalte').options].find((o) => o.value === 'kapitel:7.5').textContent
      );
      wahr(/\(0\)$/.test(schild.trim()), 'die Liste nennt eine Zahl, die der Plan nicht rechnet: ' + schild);
      gleich(await seite.locator('.output-zeile td:nth-child(6)').first().innerText(), '0', 'das Bild wird weitergerechnet');
      wahr(await seite.locator('#output-erzeugen').isDisabled(), 'Erzeugen steht offen, obwohl kein Bild bleibt');

      // Mit dem Schalter ist es wieder da - eine interne Fassung darf es.
      await seite.check('#output-vorgemerkt');
      await seite.waitForTimeout(400);
      gleich(await seite.locator('.output-zeile td:nth-child(6)').first().innerText(), '1');
    },
    { hash: AUFNAHME }
  ));

s.test('eine interne Fassung tr\u00e4gt es im Namen und im Dokument (1.83.0)', () =>
  mitSeite(
    async (seite) => {
      // Bis 1.82.0 sah eine interne Fassung aus wie die freigegebene. Der
      // Schalter warnte in der Seite; die Datei warnte niemanden mehr.
      await eineAufnahme(seite);
      await seite.click('#letzte-editor');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
      await seite.fill('#markier-stelle', '24.1');
      await seite.click('#markier-sichern');
      await seite.waitForTimeout(300);

      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForSelector('#design-ansicht:not([hidden])');
      await seite.evaluate(() => (document.getElementById('design-studio').open = true));
      await seite.fill('#design-titel', 'oneSCM Handbuch');
      await seite.selectOption('#handbuch-umfang', 'alle');
      await seite.waitForTimeout(500);

      // Ohne Schalter: gew\u00f6hnlicher Name, kein Vermerk.
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 60000 });
      const [frei] = await seite.evaluate(() => window.__abgelegt);
      gleich(frei.filename, 'handbuch-onescm-handbuch.html');
      wahr(!/Interne Fassung/.test(frei.inhalt), 'die freigegebene Unterlage tr\u00e4gt einen Vermerk');

      // Mit Schalter: der Name sagt es, und das Dokument sagt es auch.
      await seite.check('#handbuch-vorgemerkt');
      await seite.waitForTimeout(500);
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 2, null, { timeout: 60000 });
      const intern = (await seite.evaluate(() => window.__abgelegt))[1];
      gleich(intern.filename, 'handbuch-intern-onescm-handbuch.html');
      wahr(/Interne Fassung/.test(intern.inhalt), 'der Vermerk fehlt im Dokument');
      wahr(
        intern.inhalt.indexOf('class="vermerk"') < intern.inhalt.indexOf('<h1>'),
        'der Vermerk steht unter dem Titel statt dar\u00fcber'
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
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
