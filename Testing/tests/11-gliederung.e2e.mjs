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

s.test('Labels stehen an der Aufnahme und auf Wunsch im Bild', () =>
  mitSeite(
    async (seite) => {
      await aufnahmeAnStelle(seite, '7.5.2');
      await seite.click('#markier-labels summary');
      await seite.selectOption('#label-sprache', 'de');
      await seite.selectOption('#label-rolle_label', 'market');
      await seite.selectOption('#label-sparte', 'pkw');
      await seite.fill('#label-markt', 'Germany');
      await seite.fill('#label-domaene', 'Templates – Market Settings');
      await seite.fill('#label-reiter', 'Documents');
      await seite.fill('#label-schritt_label', 'Create Template');
      await seite.waitForFunction(
        () => document.getElementById('label-kette').textContent.includes('Create Template'),
        null,
        { timeout: 5000 }
      );
      gleich(
        await seite.locator('#label-kette').innerText(),
        'Deutsch · Market · PC · Germany · Templates – Market Settings · Documents · Create Template'
      );

      await seite.click('#label-ins-bild');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 7,
        null,
        { timeout: 5000 }
      );
      // Ein zweites Mal setzt nichts doppelt.
      await seite.click('#label-ins-bild');
      await seite.waitForFunction(
        () => /schon im Bild/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('.marke-zeile').count(), 7);

      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      const aufnahme = await seite.evaluate(
        () => JSON.parse(localStorage.getItem('screenarchiv:eingang')).aufnahmen[0]
      );
      gleich(aufnahme.sprache, 'de');
      gleich(aufnahme.rolle_label, 'market');
      gleich(aufnahme.sparte, 'pkw');
      gleich(aufnahme.markt, 'Germany');
      gleich(aufnahme.reiter, 'Documents');
      const juengste = aufnahme.fassungen[aufnahme.fassungen.length - 1];
      const imBild = juengste.marken.filter((m) => m.art === 'label');
      gleich(imBild.length, 7, 'die Labels fehlen in der Fassung');
      wahr(imBild.some((m) => m.feld === 'sprache'), 'das Sprachlabel trägt sein Feld nicht');

      await seite.click('#label-aus-bild');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 0,
        null,
        { timeout: 5000 }
      );
      wahr(
        (await seite.locator('#label-kette').innerText()).includes('Deutsch'),
        'mit den Marken verschwanden die Angaben'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('ein Label im Bild lässt sich verschieben', () =>
  mitSeite(
    async (seite) => {
      await aufnahmeAnStelle(seite, '7.5.2');
      await seite.click('#markier-labels summary');
      await seite.selectOption('#label-sprache', 'de');
      await seite.click('#label-ins-bild');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      const vorher = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? 0 : 0;
      });
      const masse = await seite.locator('#markier-leinwand').boundingBox();
      await seite.mouse.move(masse.x + 30, masse.y + 20);
      await seite.mouse.down();
      await seite.mouse.move(masse.x + 320, masse.y + 300, { steps: 12 });
      await seite.mouse.up();
      await seite.waitForTimeout(250);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      const marke = await seite.evaluate(() => {
        const fassungen = JSON.parse(localStorage.getItem('screenarchiv:eingang')).aufnahmen[0].fassungen;
        return fassungen[fassungen.length - 1].marken[0];
      });
      wahr(marke.x > 100 && marke.y > 100, 'das Label blieb liegen: ' + JSON.stringify(marke));
      gleich(vorher, 0);
    },
    { hash: AUFNAHME }
  ));

s.test('die Teilschritte zeigen, was an einer Stelle liegt', () =>
  mitSeite(
    async (seite) => {
      await aufnahmeAnStelle(seite, '7.5.2');
      await seite.click('#markier-labels summary');
      await seite.selectOption('#label-sprache', 'de');
      await seite.fill('#label-reiter', 'Documents');
      await seite.click('#markier-sichern');
      await seite.waitForTimeout(300);

      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.waitForFunction(
        () => document.querySelectorAll('.teilschritt-gruppe').length >= 2,
        null,
        { timeout: 5000 }
      );
      const leiste = await seite.locator('#teilschritt-liste').innerText();
      wahr(/Deutsch/.test(leiste) && /Documents/.test(leiste), 'die Teilschritte fehlen: ' + leiste.replace(/\n/g, ' '));
      gleich(await seite.locator('#teilschritt-stelle').innerText(), 'alle Bilder');

      // Eine Stelle wählen zeigt Teilschritte und Beschreibung dazu.
      await seite.fill('#gliederung-suche', '7.5.2');
      await seite.waitForFunction(
        () => [...document.querySelectorAll('.stelle-nummer')].some((n) => n.textContent === '7.5.2'),
        null,
        { timeout: 5000 }
      );
      await seite.click('[data-waehlen="7.5.2"]');
      await seite.waitForFunction(
        () => !document.getElementById('stelle-beschreibung').hidden,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#teilschritt-stelle').innerText(), '7.5.2');
      const beschreibung = await seite.locator('#stelle-beschreibung').innerText();
      wahr(/Signaturergebnis/.test(beschreibung), 'das Thema fehlt');
      wahr(/Abschlusskriterium/i.test(beschreibung), 'das Abschlusskriterium fehlt');
      wahr(/Quelle/i.test(beschreibung), 'der Nachweis fehlt');
    },
    { hash: AUFNAHME }
  ));

/* --------------------------------------- Das Fortschrittsblatt (1.46.0) */

/** Die Ablage der Seite nachgebildet. */
const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size || 0 });
      return { status: 'saved' };
    } } };`;

s.test('das Fortschrittsblatt zeigt jedes Kapitel und lässt sich sichern', () =>
  mitSeite(
    async (seite) => {
      await aufnahmeAnStelle(seite, '7.5.2');
      await seite.click('.portal-nav button[data-ansicht="gliederung"]');
      await seite.waitForSelector('#fortschritt-schau canvas');

      // Das Blatt ist A4 quer in 300 dpi - und es wird gezeichnet, nicht leer.
      const masse = await seite.locator('#fortschritt-schau canvas').evaluate((l) => [l.width, l.height]);
      gleich(masse[0], 3508);
      gleich(masse[1], 2480);
      const gemalt = await seite.locator('#fortschritt-schau canvas').evaluate((l) => {
        const punkte = l.getContext('2d').getImageData(0, 0, l.width, 40).data;
        let farbig = 0;
        for (let i = 0; i < punkte.length; i += 4) if (punkte[i] !== 255 || punkte[i + 1] !== 255) farbig += 1;
        return farbig;
      });
      wahr(gemalt > 1000, 'das Band oben fehlt – das Blatt ist leer');

      const stand = await seite.locator('#fortschritt-stand').innerText();
      wahr(/1 von \d+ Stellen belegt/.test(stand), stand);
      wahr(/1 Bilder/.test(stand), stand);

      // Die zweite Achse lässt sich wechseln und wirkt.
      await seite.selectOption('#fortschritt-achse', 'rolle_label');
      await seite.waitForTimeout(400);
      gleich(await seite.locator('#fortschritt-achse').inputValue(), 'rolle_label');

      await seite.click('#fortschritt-bild');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 20000 });
      await seite.click('#fortschritt-pdf');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 2, null, { timeout: 20000 });
      const dateien = await seite.evaluate(() => window.__abgelegt);
      wahr(/^fortschritt-\d{4}-\d{2}-\d{2}\.png$/.test(dateien[0].filename), dateien[0].filename);
      wahr(/^fortschritt-\d{4}-\d{2}-\d{2}\.pdf$/.test(dateien[1].filename), dateien[1].filename);
      wahr(dateien[0].groesse > 10000, 'das Bild ist zu klein: ' + dateien[0].groesse);
      wahr(
        /300 dpi/.test(await seite.locator('#fortschritt-meldung').innerText()),
        await seite.locator('#fortschritt-meldung').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
