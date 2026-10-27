/**
 * Browserprüfung des Registers OCR: Text aus Bildern holen, ändern,
 * übernehmen und als Textdatei oder Word-Datei sichern. Claude wird dabei
 * nachgebildet – geprüft wird die Seite, nicht das Lesen.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('OCR – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const OCR = '#ans=ocr';

/** Claude liest: jede Anfrage wird festgehalten, die Antwort ist fest. */
const claudeNachbau = `
  window.__gefragt = [];
  const sample = async (eingabe, optionen = {}) => {
    window.__gefragt.push({
      text: String(eingabe).slice(0, 1200),
      mitBild: Boolean(optionen.images),
      groesse: optionen.images ? optionen.images.size : 0
    });
    await new Promise((f) => setTimeout(f, 30));
    return { text: 'Übersicht Einkauf\\nOffene Freigaben | 47\\nTermintreue | 92,4 %' };
  };
  sample.limits = async () => ({ maxPromptBytes: 65536, images: { maxCount: 4, maxInputBytes: 20000000, mediaTypes: ['image/jpeg'] } });
  window.__abgelegt = [];
  window.claude = { use: async (name) =>
    name === 'sample' ? sample
    : name === 'downloads' ? { save: async (auftrag) => {
        window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size || 0 });
        return { status: 'saved' };
      } }
    : null };`;

/** Claude weist die Anfrage ab - der Grund gehört in die Schlusszeile. */
const claudeAbweisend = `
  const sample = async () => { const e = new Error('nicht erlaubt'); e.code = 'not_granted'; throw e; };
  sample.limits = async () => ({ maxPromptBytes: 65536, images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
  window.claude = { use: async (name) => (name === 'sample' ? sample : null) };`;

/**
 * Beim ersten Lauf liest Claude, beim zweiten antwortet er ohne Text -
 * vertragsgemäß und kein Lesen. Nur so lässt sich prüfen, ob die leere
 * Antwort das Vorhandene löscht.
 */
const claudeDannLeer = `
  window.__leer = false;
  const sample = async () => (window.__leer ? { text: '   ' } : { text: 'Übersicht Einkauf' });
  sample.limits = async () => ({ maxPromptBytes: 65536, images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
  window.claude = { use: async (name) => (name === 'sample' ? sample : null) };`;

/** Claude ohne Bilder: die Fähigkeit ist da, Bilder darf sie nicht sehen. */
const claudeOhneBilder = `
  const sample = async () => ({ text: 'nie gefragt' });
  sample.limits = async () => ({ maxPromptBytes: 65536 });
  window.claude = { use: async (name) => (name === 'sample' ? sample : null) };`;

/** Zwei Aufnahmen mit Stelle. */
async function zweiBilder(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  for (const [titel, stelle] of [
    ['Übersicht Einkauf', '7.5.1'],
    ['Formular', '7.5.2']
  ]) {
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
  await seite.click('.portal-nav button[data-ansicht="ocr"]');
  await seite.waitForSelector('#ocr-ansicht:not([hidden])');
}

s.test('ohne Aufnahme erklärt sich das Register', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#ocr-ansicht').isVisible(), true);
    gleich(await seite.locator('#ocr-lesen').isDisabled(), true);
    gleich(await seite.locator('#ocr-txt').isDisabled(), true);
    wahr(
      (await seite.locator('#ocr-liste').innerText()).includes('Keine Aufnahme in der Arbeitsmenge'),
      await seite.locator('#ocr-liste').innerText()
    );
    // Dass die Seite nicht selbst liest, steht da – nicht im Kleingedruckten.
    wahr(
      /Claude/.test(await seite.locator('#ocr-ansicht .band-hinweis').innerText()),
      'der Weg über Claude wird nicht genannt'
    );
  }, { hash: OCR }));

s.test('gewählte Bilder werden gelesen und stehen im Feld', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      gleich(await seite.locator('.ocr-zeile').count(), 2);
      wahr(
        (await seite.locator('.ocr-zeile').first().innerText()).includes('noch nicht gelesen'),
        await seite.locator('.ocr-zeile').first().innerText()
      );

      await seite.click('#ocr-alle');
      await seite.waitForTimeout(150);
      gleich(await seite.locator('.ocr-feld').count(), 2);
      gleich(await seite.locator('#ocr-lesen').isDisabled(), false);

      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /2 von 2 Bildern gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 30000 }
      );

      // Claude wurde mit Bild gefragt – und mit der Aufforderung dazu. Die
      // Beispielquelle ist 1440 × 900 Punkte groß, also über der Marke von
      // 1,2 Megapixel: jedes Bild wird in zwei Kacheln gelesen.
      const gefragt = await seite.evaluate(() => window.__gefragt);
      gleich(gefragt.length, 4, '2 Bilder × 2 Kacheln');
      wahr(gefragt.every((g) => g.mitBild && g.groesse > 1000), JSON.stringify(gefragt).slice(0, 300));
      wahr(/Bildschirmfoto/.test(gefragt[0].text), gefragt[0].text);
      wahr(/Teil 1 von 2/.test(gefragt[0].text), 'die Kachel wird nicht benannt: ' + gefragt[0].text);
      wahr(/Teil 2 von 2/.test(gefragt[1].text), gefragt[1].text);
      // Beide Stellen kommen vor - in welcher Reihenfolge, entscheidet der Eingang.
      wahr(gefragt.some((g) => /Stelle im Handbuch: 7\.5\.1/.test(g.text)), 'die Stelle 7.5.1 fehlt');
      wahr(gefragt.some((g) => /Stelle im Handbuch: 7\.5\.2/.test(g.text)), 'die Stelle 7.5.2 fehlt');

      // Der Text steht im Feld und in der Liste.
      const feld = await seite.locator('.ocr-feld textarea').first().inputValue();
      wahr(feld.includes('Offene Freigaben | 47'), feld);
      const zeile = await seite.locator('.ocr-zeile').first().innerText();
      wahr(zeile.includes('gelesen ·') && zeile.includes('2 Kacheln'), zeile);
      wahr(/2 von 2 gelesen/.test(await seite.locator('#ocr-stand').innerText()), await seite.locator('#ocr-stand').innerText());

      // Die Lesung überlebt das Neuladen.
      await seite.reload();
      await seite.waitForSelector('#ocr-ansicht:not([hidden])');
      await seite.click('#ocr-alle');
      await seite.waitForTimeout(200);
      wahr(
        (await seite.locator('.ocr-feld textarea').first().inputValue()).includes('Offene Freigaben'),
        'die Lesung ist nach dem Neuladen weg'
      );
    },
    { hash: AUFNAHME, initSkript: claudeNachbau }
  ));

s.test('die Lesung lässt sich ändern, übernehmen und verwerfen', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /2 von 2 Bildern gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 30000 }
      );

      // Von Hand geändert - und gespeichert.
      await seite.locator('.ocr-feld textarea').first().fill('Von Hand verbessert');
      await seite.waitForTimeout(200);
      const gespeichert = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:ocr')).texte);
      const erste = Object.values(gespeichert).find((e) => e.text === 'Von Hand verbessert');
      wahr(erste && erste.quelle === 'hand', JSON.stringify(gespeichert).slice(0, 200));

      // In die Notiz der Aufnahme übernehmen.
      await seite.locator('.ocr-feld-knoepfe button', { hasText: 'In die Notiz übernehmen' }).first().click();
      await seite.waitForTimeout(250);
      const aufnahmen = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:eingang')).aufnahmen);
      wahr(
        aufnahmen.some((a) => a.notiz === 'Von Hand verbessert'),
        aufnahmen.map((a) => a.notiz).join(' | ')
      );

      // Verwerfen nimmt nur die Lesung.
      await seite.locator('.ocr-feld-knoepfe button', { hasText: 'Lesung verwerfen' }).first().click();
      await seite.waitForTimeout(250);
      gleich(await seite.locator('.ocr-feld textarea').first().inputValue(), '');
      wahr(/1 von 2 gelesen/.test(await seite.locator('#ocr-stand').innerText()), await seite.locator('#ocr-stand').innerText());
      gleich((await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:eingang')).aufnahmen)).length, 2);
    },
    { hash: AUFNAHME, initSkript: claudeNachbau }
  ));

s.test('die Texte werden als Textdatei und als Word-Datei gesichert', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /2 von 2 Bildern gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 30000 }
      );
      await seite.click('#ocr-txt');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 15000 });
      await seite.click('#ocr-docx');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 2, null, { timeout: 15000 });
      const dateien = await seite.evaluate(() => window.__abgelegt);
      wahr(/^texte-\d{4}-\d{2}-\d{2}\.txt$/.test(dateien[0].filename), dateien[0].filename);
      wahr(/^texte-\d{4}-\d{2}-\d{2}\.docx$/.test(dateien[1].filename), dateien[1].filename);
      wahr(dateien[0].groesse > 100, 'die Textdatei ist leer');
      wahr(dateien[1].groesse > 1000, 'die Word-Datei ist zu klein');
    },
    { hash: AUFNAHME, initSkript: claudeNachbau }
  ));

s.test('ohne Bilderlaubnis sagt die Ansicht, was bleibt', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /keine Bilder sehen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 15000 }
      );
      // Die Felder bleiben – von Hand geht es weiter.
      gleich(await seite.locator('.ocr-feld textarea').count(), 2);
    },
    { hash: AUFNAHME, initSkript: claudeOhneBilder }
  ));

s.test('wird abgewiesen, steht der Grund in der Schlusszeile (1.71.0)', () =>
  mitSeite(
    async (seite) => {
      // Bis 1.70.0 setzte der Fangzweig die genaue Meldung – und die
      // Schlusszeile überschrieb sie eine Zeile später. Übrig blieb
      // „0 von 2 Bildern gelesen, 2 nicht." ohne jeden Hinweis darauf, ob
      // sich ein zweiter Versuch lohnt.
      await zweiBilder(seite);
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /Bildern gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 15000 }
      );
      const meldung = await seite.locator('#ocr-meldung').innerText();
      wahr(meldung.includes('nicht erlaubt'), meldung);
      wahr(meldung.includes('0 von 2 Bildern gelesen'), meldung);
    },
    { hash: AUFNAHME, initSkript: claudeAbweisend }
  ));

s.test('eine leere Antwort löscht keinen Text (1.71.0)', () =>
  mitSeite(
    async (seite) => {
      // Bis 1.70.0 zählte eine leere Antwort als gelesen – und
      // `setzeOcrText('')` löschte dabei, was schon dastand.
      await zweiBilder(seite);
      // Erst ein echter Lauf, damit überhaupt ein Text dasteht.
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /2 von 2 Bildern gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 60000 }
      );
      // Ein großes Bild wird in Kacheln gelesen; der Text steht dann
      // mehrzeilig da. Geprüft wird, dass überhaupt etwas dasteht.
      const vorher = await seite.locator('.ocr-feld textarea').first().inputValue();
      wahr(vorher.includes('Übersicht Einkauf'), vorher);

      // Jetzt derselbe Knopf, und Claude antwortet ohne Text.
      await seite.evaluate(() => (window.__leer = true));
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /nichts gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 60000 }
      );
      const meldung = await seite.locator('#ocr-meldung').innerText();
      wahr(meldung.includes('0 von 2 Bildern gelesen'), meldung);
      wahr(meldung.includes('bleibt stehen'), meldung);
      // Und die Lesung von vorhin steht noch da.
      gleich(await seite.locator('.ocr-feld textarea').first().inputValue(), vorher);
    },
    { hash: AUFNAHME, initSkript: claudeDannLeer }
  ));

s.test('der Eingang findet, was im Bild steht', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      await seite.click('#ocr-alle');
      await seite.click('#ocr-lesen');
      await seite.waitForFunction(
        () => /2 von 2 Bildern gelesen/.test(document.getElementById('ocr-meldung').textContent),
        null,
        { timeout: 30000 }
      );

      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForSelector('#eingang-ansicht:not([hidden])');
      gleich(await seite.locator('.eingang-karte').count(), 2);

      // „Freigaben" steht in keinem Feld, nur in der Lesung.
      await seite.fill('#eingang-suche', 'Freigaben');
      await seite.waitForTimeout(500);
      gleich(await seite.locator('.eingang-karte').count(), 2, 'beide Lesungen tragen das Wort');
      gleich(await seite.locator('.lesung-marke').count(), 2, 'die Karte sagt nicht, woher der Treffer kommt');

      // Ein Wort aus dem Titel trifft ohne Marke.
      await seite.fill('#eingang-suche', 'Formular');
      await seite.waitForTimeout(500);
      gleich(await seite.locator('.eingang-karte').count(), 1);
      gleich(await seite.locator('.lesung-marke').count(), 0);

      // Ein Wort, das nirgends steht, trifft nichts.
      await seite.fill('#eingang-suche', 'Kaffeemaschine');
      await seite.waitForTimeout(500);
      gleich(await seite.locator('.eingang-karte').count(), 0);
    },
    { hash: AUFNAHME, initSkript: claudeNachbau }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
