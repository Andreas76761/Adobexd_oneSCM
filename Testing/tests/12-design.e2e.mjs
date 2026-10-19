/**
 * Browserprüfung des Designstudios: aus Bildern werden Blätter in
 * Druckauflösung – Quick Guide, One Pager, Releaseletter, Handbuchseite.
 */
import { join } from 'node:path';
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Design – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const DESIGN = '#ans=design';

const ablageNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      window.__abgelegt.push({ filename: auftrag.filename, groesse: auftrag.data.size || String(auftrag.data).length });
      return { status: 'saved' };
    } } };`;

/**
 * Für das PDF reicht die Größe nicht: die Ablage liest die Datei mit und
 * zählt, was drinsteht. Mehr als Text braucht die Prüfung nicht - ein PDF
 * ist Text mit Datenströmen darin.
 */
const pdfNachbau = `
  window.__abgelegt = [];
  window.claude = { use: async (name) => name !== 'downloads' ? null : {
    save: async (auftrag) => {
      const text = await auftrag.data.text();
      window.__abgelegt.push({
        filename: auftrag.filename,
        groesse: auftrag.data.size,
        kopf: text.slice(0, 8),
        seiten: (text.match(/\\/Type\\/Page[^s]/g) || []).length,
        inhalt: text
      });
      return { status: 'saved' };
    } } };`;

/** Das Studio steht zugeklappt in der Ansicht - zum Prüfen wird es geöffnet. */
async function oeffneStudio(seite) {
  await seite.evaluate(() => {
    document.getElementById('design-studio').open = true;
  });
}

/** Legt Aufnahmen an und ordnet sie Stellen im Handbuch zu. */
async function bilderMitStellen(seite, stellen) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  for (const stelle of stellen) {
    await seite.fill('#feld-titel', 'Schritt ' + stelle);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Formular');
    await seite.fill('#feld-begriffe', 'signatur');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(150);
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', stelle);
    await seite.evaluate(() => {
      document.getElementById('markier-labels').open = true;
    });
    await seite.selectOption('#label-sprache', 'de');
    await seite.selectOption('#label-rolle_label', 'dealer');
    await seite.waitForTimeout(150);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(250);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(120);
  }
  await seite.click('.portal-nav button[data-ansicht="design"]');
  await seite.waitForSelector('#design-ansicht:not([hidden])');
  await seite.waitForFunction(
    () => document.querySelectorAll('.design-blatt').length > 0,
    null,
    { timeout: 15000 }
  );
}

s.test('ohne Inhalt sagt das Studio, was fehlt', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#design-sichern').isDisabled(), true, 'ein leeres Blatt ließe sich sichern');
    wahr(
      (await seite.locator('#design-blaetter').innerText()).includes('Kein Inhalt'),
      'der Hinweis fehlt'
    );
  }, { hash: DESIGN }));

s.test('aus Bildern eines Kapitels entsteht ein Blatt in Druckauflösung', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2', '7.5.4']);
      wahr(
        (await seite.locator('#design-quelle').innerText()).includes('Kapitel · 7.5'),
        'das Kapitel steht nicht zur Wahl'
      );
      const masse = await seite.evaluate(() => {
        const c = document.querySelector('.design-blatt');
        return { breite: c.width, hoehe: c.height };
      });
      // Quick Guide ist A4 quer bei 300 dpi.
      gleich(masse.breite, 3508, 'die Blattbreite stimmt nicht');
      gleich(masse.hoehe, 2480);
      wahr(
        (await seite.locator('#design-meldung').innerText()).includes('3 Bilder'),
        'die Meldung zählt die Bilder nicht'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('jede Vorlage rechnet ihr eigenes Format und ihre Seitenzahl', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2', '7.5.4']);
      const gemessen = {};
      for (const vorlage of ['quickguide', 'onepager', 'releaseletter', 'handbuch']) {
        await seite.selectOption('#design-vorlage', vorlage);
        // Gerechnet wird nebenher - gewartet wird auf den Stand am Container.
        await seite.waitForFunction(
          (v) => document.getElementById('design-blaetter').dataset.vorlage === v,
          vorlage,
          { timeout: 20000 }
        );
        gemessen[vorlage] = await seite.evaluate(() => ({
          seiten: document.querySelectorAll('.design-blatt').length,
          breite: document.querySelector('.design-blatt').width,
          hoehe: document.querySelector('.design-blatt').height
        }));
      }
      gleich(gemessen.quickguide.breite > gemessen.quickguide.hoehe, true, 'der Quick Guide ist nicht quer');
      gleich(gemessen.handbuch.hoehe > gemessen.handbuch.breite, true, 'die Handbuchseite ist nicht hoch');
      gleich(gemessen.releaseletter.seiten, 2, 'der Releaseletter bricht nicht um');
      gleich(gemessen.handbuch.seiten, 1);
    },
    { hash: AUFNAHME }
  ));

s.test('die Texte aus dem Handbuch lassen sich abschalten', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.2']);
      await seite.selectOption('#design-vorlage', 'handbuch');
      await seite.waitForFunction(
        () => {
          const k = document.getElementById('design-blaetter').dataset;
          return k.vorlage === 'handbuch' && k.texte === 'ja';
        },
        null,
        { timeout: 20000 }
      );
      // Mit Texten steht mehr Dunkles auf dem Blatt als ohne.
      const dunkel = () =>
        seite.evaluate(() => {
          const c = document.querySelector('.design-blatt');
          const d = c.getContext('2d').getImageData(Math.round(c.width * 0.6), 0, Math.round(c.width * 0.38), c.height).data;
          let zahl = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i] < 128) zahl++;
          return zahl;
        });
      const mit = await dunkel();
      await seite.click('#design-texte');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.texte === 'nein',
        null,
        { timeout: 20000 }
      );
      const ohne = await dunkel();
      wahr(mit > ohne, `ohne Texte steht nicht weniger auf dem Blatt (${mit} / ${ohne})`);
    },
    { hash: AUFNAHME }
  ));

s.test('die Blätter lassen sich als Bilder und als HTML sichern', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await seite.selectOption('#design-vorlage', 'releaseletter');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'releaseletter',
        null,
        { timeout: 20000 }
      );
      await seite.click('#design-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length >= 1, null, { timeout: 15000 });
      const [erste] = await seite.evaluate(() => window.__abgelegt);
      wahr(/^releaseletter-/.test(erste.filename), 'der Name nennt die Vorlage nicht: ' + erste.filename);
      wahr(erste.groesse > 20000, 'das Blatt ist verdächtig klein');

      await seite.click('#design-html');
      await seite.waitForFunction(() => (window.__abgelegt || []).length >= 2, null, { timeout: 15000 });
      const html = await seite.evaluate(() => window.__abgelegt[window.__abgelegt.length - 1]);
      wahr(/\.html$/.test(html.filename), 'die HTML-Datei fehlt: ' + html.filename);
      wahr(
        /drucken/.test(await seite.locator('#design-meldung').innerText()),
        'der Weg zum PDF wird nicht genannt'
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

s.test('die Blätter werden zu einem PDF in A4 und 300 dpi', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await seite.selectOption('#design-vorlage', 'handbuch');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'handbuch',
        null,
        { timeout: 20000 }
      );
      const blaetter = await seite.locator('.design-blatt').count();
      await seite.click('#design-pdf');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 20000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(/\.pdf$/.test(datei.filename), 'keine PDF-Datei: ' + datei.filename);
      wahr(datei.groesse > 20000, 'das PDF ist verdächtig klein: ' + datei.groesse);
      gleich(datei.kopf, '%PDF-1.4', 'der Kopf stimmt nicht: ' + datei.kopf);
      gleich(datei.seiten, blaetter, 'das PDF hat nicht so viele Seiten wie das Studio Blätter zeigt');
      wahr(datei.inhalt.includes('/Filter/DCTDecode'), 'das Bild steckt nicht als JPEG im PDF');
      wahr(/MediaBox\[0 0 595\.\d+ 841\.\d+\]/.test(datei.inhalt), 'die Seite ist nicht A4: ' + datei.inhalt.slice(0, 200));
      wahr(
        /300 dpi/.test(await seite.locator('#design-meldung').innerText()),
        await seite.locator('#design-meldung').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: pdfNachbau }
  ));

s.test('das Deckblatt kommt vor die Seiten und nennt den Inhalt', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      const vorher = await seite.locator('.design-blatt').count();
      await oeffneStudio(seite);
      await seite.fill('#design-titel', 'oneSCM – Vorlagen anlegen');
      await seite.fill('#design-untertitel', 'Quick Guide für Dealer');
      await seite.check('#design-deckblatt');
      await seite.waitForFunction(
        (zahl) => document.querySelectorAll('.design-blatt').length === zahl + 1,
        vorher,
        { timeout: 20000 }
      );
      const erste = await seite.locator('.design-rahmen figcaption').first().innerText();
      wahr(erste.startsWith('Deckblatt'), 'das Deckblatt steht nicht vorn: ' + erste);
      // Der Titel wird gedrosselt übernommen - erst wenn das Rechnen zur Ruhe
      // kommt, steht die Meldung endgültig da.
      await seite.waitForFunction(
        () => /mit Deckblatt/.test(document.getElementById('design-meldung').textContent),
        null,
        { timeout: 20000 }
      );

      // Die Einstellung überlebt das Neuladen.
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="design"]');
      await seite.waitForFunction(
        () => document.querySelectorAll('.design-blatt').length > 0,
        null,
        { timeout: 20000 }
      );
      await oeffneStudio(seite);
      gleich(await seite.locator('#design-deckblatt').isChecked(), true);
      gleich(await seite.locator('#design-titel').inputValue(), 'oneSCM – Vorlagen anlegen');
      wahr(
        (await seite.locator('.design-rahmen figcaption').first().innerText()).startsWith('Deckblatt'),
        'nach dem Neuladen fehlt das Deckblatt: ' + (await seite.locator('.design-rahmen figcaption').first().innerText())
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Kopf- und Fußzeile lassen sich bestücken', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1']);
      await oeffneStudio(seite);
      // Jeder Teil ist ein Schalter; ohne Teile bleibt die Zeile leer.
      gleich(await seite.locator('#design-kopf-teile input').count(), 5);
      gleich(await seite.locator('#design-fuss-teile input').count(), 5);
      gleich(await seite.locator('#kopf-titel').isChecked(), true);
      gleich(await seite.locator('#kopf-kapitel').isChecked(), false);
      await seite.check('#kopf-kapitel');
      await seite.check('#fuss-hinweis');
      await seite.fill('#design-hinweis', 'Interne Unterlage');
      await seite.waitForTimeout(900);
      const gesichert = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:design');
        return roh ? JSON.parse(roh) : null;
      });
      wahr(gesichert.kopf.includes('kapitel'), 'die Kopfzeile merkt sich den Teil nicht');
      wahr(gesichert.fuss.includes('hinweis'));
      gleich(gesichert.hinweis, 'Interne Unterlage');
      // Die Folge der Teile ist die der Liste, nicht die des Anklickens.
      tieferGleich(gesichert.kopf, ['titel', 'kapitel', 'vorlage', 'seitenzahl']);
    },
    { hash: AUFNAHME }
  ));

s.test('eine eigene Vorlage lässt sich speichern, nutzen und löschen', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await oeffneStudio(seite);
      await seite.fill('#eigen-label', 'Schulungsblatt');
      await seite.fill('#eigen-spalten', '1');
      await seite.fill('#eigen-zeilen', '1');
      await seite.selectOption('#eigen-format', 'a4-quer');
      await seite.click('#eigen-sichern');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'eigen-schulungsblatt',
        null,
        { timeout: 20000 }
      );
      wahr(
        /gespeichert/.test(await seite.locator('#design-meldung').innerText()),
        'die Meldung zum Speichern fehlt: ' + (await seite.locator('#design-meldung').innerText())
      );
      // Ein Bild je Seite: aus zwei Bildern werden zwei Blätter.
      gleich(await seite.locator('.design-blatt').count(), 2);
      const masse = await seite.evaluate(() => {
        const c = document.querySelector('.design-blatt');
        return { breite: c.width, hoehe: c.height };
      });
      wahr(masse.breite > masse.hoehe, 'das Querformat der eigenen Vorlage greift nicht');
      wahr(
        (await seite.locator('#design-vorlage').innerText()).includes('Schulungsblatt (eigene)'),
        'die eigene Vorlage steht nicht in der Auswahl'
      );

      await seite.click('#eigen-loeschen');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage === 'quickguide',
        null,
        { timeout: 20000 }
      );
      wahr(/gelöscht/.test(await seite.locator('#design-meldung').innerText()));
      gleich(await seite.locator('#eigen-loeschen').isDisabled(), true);
    },
    { hash: AUFNAHME }
  ));

s.test('das ganze Handbuch entsteht als Word-Datei mit echtem Text', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await oeffneStudio(seite);
      await seite.fill('#design-titel', 'oneSCM Benutzerhandbuch');
      await seite.click('#handbuch-word');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 60000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      gleich(datei.filename, 'handbuch-onescm-benutzerhandbuch.docx');
      wahr(datei.groesse > 20000, 'die Word-Datei ist verdächtig klein: ' + datei.groesse);
      // Das Dokument trägt Überschriften und den Text der Gliederung.
      wahr(datei.inhalt.includes('<w:pStyle w:val="Heading'), 'keine Überschriften im Dokument');
      wahr(datei.inhalt.includes('word/media/bild1.jpeg'), 'kein Bild im Dokument');
      wahr(
        /Text als Text/.test(await seite.locator('#design-meldung').innerText()),
        await seite.locator('#design-meldung').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: pdfNachbau }
  ));

s.test('das ganze Handbuch entsteht als eine HTML-Datei', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await oeffneStudio(seite);
      // Vor dem Rechnen steht da, was herauskäme.
      const stand = await seite.locator('#handbuch-umfang-stand').innerText();
      wahr(/Stellen · 2 Bilder/.test(stand), 'der Umfang wird nicht gezählt: ' + stand);

      await seite.fill('#design-titel', 'oneSCM Benutzerhandbuch');
      await seite.fill('#design-hinweis', 'Interne Unterlage');
      await seite.selectOption('#handbuch-groesse', '1600');
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 30000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      gleich(datei.filename, 'handbuch-onescm-benutzerhandbuch.html');
      wahr(datei.groesse > 20000, 'das Handbuch ist verdächtig klein: ' + datei.groesse);
      wahr(
        /gesichert .* 2 Bilder/.test(await seite.locator('#design-meldung').innerText()),
        await seite.locator('#design-meldung').innerText()
      );

      // Die ganze Gliederung nimmt auch die leeren Stellen mit.
      await seite.selectOption('#handbuch-umfang', 'alle');
      await seite.waitForFunction(
        () => /noch ohne Bild/.test(document.getElementById('handbuch-umfang-stand').textContent),
        null,
        { timeout: 5000 }
      );
      wahr(
        /23 Kapitel/.test(await seite.locator('#handbuch-umfang-stand').innerText()),
        await seite.locator('#handbuch-umfang-stand').innerText()
      );
    },
    { hash: AUFNAHME, initSkript: ablageNachbau }
  ));

/* --------------------------------------------- Die Hausmarke (1.44.0) */

s.test('die Hausmarke färbt die Blätter und steht auf dem Deckblatt', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1', '7.5.2']);
      await oeffneStudio(seite);
      await seite.check('#design-deckblatt');
      await seite.waitForFunction(() => document.querySelectorAll('.design-blatt').length > 1, null, { timeout: 25000 });

      // Das Band oben auf dem Deckblatt trägt die Akzentfarbe der Seite.
      const farbeVorher = await seite.evaluate(() => {
        const l = document.querySelector('.design-blatt');
        const p = l.getContext('2d').getImageData(10, 4, 1, 1).data;
        return [p[0], p[1], p[2]].join(',');
      });

      await seite.evaluate(() => {
        const feld = document.getElementById('marke-akzent');
        feld.value = '#00adef';
        feld.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await seite.waitForFunction(
        () => {
          const l = document.querySelector('.design-blatt');
          if (!l || !l.getContext) return false;
          const p = l.getContext('2d').getImageData(10, 4, 1, 1).data;
          return p[0] === 0 && p[1] === 173 && p[2] === 239;
        },
        null,
        { timeout: 25000 }
      );
      wahr(farbeVorher !== '0,173,239', 'die Farbe war schon vorher die der Hausmarke');

      // Die Wahl überlebt das Neuladen.
      await seite.reload();
      await seite.waitForFunction(() => document.querySelectorAll('.design-blatt').length > 0, null, { timeout: 25000 });
      await oeffneStudio(seite);
      gleich(await seite.locator('#marke-akzent').inputValue(), '#00adef');
      gleich(await seite.locator('#marke-schrift').inputValue(), '');

      // Zurücksetzen bringt das Aussehen der Anwendung zurück.
      await seite.click('#marke-zurueck');
      await seite.waitForFunction(
        () => {
          const l = document.querySelector('.design-blatt');
          if (!l || !l.getContext) return false;
          const p = l.getContext('2d').getImageData(10, 4, 1, 1).data;
          return !(p[0] === 0 && p[1] === 173 && p[2] === 239);
        },
        null,
        { timeout: 25000 }
      );
      const gespeichert = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:design')).marke);
      gleich(gespeichert.akzent, '');
    },
    { hash: AUFNAHME }
  ));

s.test('ein Logo wird übernommen, gezeigt und wieder entfernt', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1']);
      await oeffneStudio(seite);
      // Ein Logo, wie es der Dateidialog liefern würde.
      await seite.evaluate(async () => {
        const l = document.createElement('canvas');
        l.width = 240;
        l.height = 80;
        const s2 = l.getContext('2d');
        s2.fillStyle = '#00adef';
        s2.fillRect(0, 0, 240, 80);
        const blob = await new Promise((f) => l.toBlob(f, 'image/png'));
        const eingabe = document.getElementById('marke-logo');
        const liste = new DataTransfer();
        liste.items.add(new File([blob], 'logo.png', { type: 'image/png' }));
        eingabe.files = liste.files;
        eingabe.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await seite.waitForFunction(
        () => /Logo übernommen/.test(document.getElementById('design-meldung').textContent),
        null,
        { timeout: 25000 }
      );
      gleich(await seite.locator('#marke-schau').isVisible(), true);
      wahr(
        (await seite.locator('#marke-logo-schau').getAttribute('src')).startsWith('data:image/png'),
        'das Logo wird nicht gezeigt'
      );

      await seite.click('#marke-logo-weg');
      await seite.waitForFunction(
        () => document.getElementById('marke-schau').hidden,
        null,
        { timeout: 20000 }
      );
      const gespeichert = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:design')).marke);
      gleich(gespeichert.logo, '');
    },
    { hash: AUFNAHME }
  ));

/* ------------------------------ Sprache der Unterlagen (1.48.0) */

s.test('die Unterlagen lassen sich auf Englisch ausgeben', () =>
  mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1']);
      await oeffneStudio(seite);
      gleich(await seite.locator('#design-sprache').inputValue(), 'de');
      await seite.check('#design-deckblatt');
      await seite.waitForFunction(() => document.querySelectorAll('.design-blatt').length > 1, null, { timeout: 25000 });

      await seite.selectOption('#design-sprache', 'en');
      await seite.waitForFunction(
        () => document.getElementById('design-blaetter').dataset.vorlage !== '',
        null,
        { timeout: 25000 }
      );
      await seite.waitForTimeout(600);

      // Das Handbuch kommt englisch heraus - der Inhalt bleibt deutsch.
      await seite.click('#handbuch-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 40000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(datei.inhalt.includes('<html lang="en"'), 'das Handbuch ist nicht englisch');
      wahr(datei.inhalt.includes('Completion criterion') || datei.inhalt.includes('User manual'), 'die Rahmentexte fehlen');

      // Die Wahl überlebt das Neuladen.
      await seite.reload();
      await seite.waitForFunction(() => document.querySelectorAll('.design-blatt').length > 0, null, { timeout: 25000 });
      await oeffneStudio(seite);
      gleich(await seite.locator('#design-sprache').inputValue(), 'en');
    },
    { hash: AUFNAHME, initSkript: pdfNachbau }
  ));

s.test('die Hausmarke reist als eigene Datei', () => {
  let marke = null;
  return mitSeite(
    async (seite) => {
      await bilderMitStellen(seite, ['7.5.1']);
      await oeffneStudio(seite);
      await seite.evaluate(() => {
        const setze = (id, wert) => {
          const f = document.getElementById(id);
          f.value = wert;
          f.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setze('marke-akzent', '#00adef');
        setze('marke-schrift', 'arial');
        setze('design-sprache', 'en');
      });
      await seite.waitForTimeout(1200);
      await seite.click('#marke-sichern');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 20000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(/^hausmarke-.*\.json$/.test(datei.filename), datei.filename);
      marke = datei.inhalt;
      wahr(marke.includes('"akzent": "#00adef"'), marke.slice(0, 200));
      wahr(marke.includes('"sprache": "en"'), 'die Sprache fehlt in der Datei');
    },
    { hash: AUFNAHME, initSkript: pdfNachbau }
  ).then(() =>
    // Ein zweiter Browser: dieselbe Hausmarke einlesen.
    mitSeite(
      async (seite) => {
        await bilderMitStellen(seite, ['7.5.1']);
        await oeffneStudio(seite);
        gleich(await seite.locator('#marke-akzent').inputValue(), '#b4432b');
        await seite.evaluate((inhalt) => {
          const f = new File([inhalt], 'hausmarke.json', { type: 'application/json' });
          const liste = new DataTransfer();
          liste.items.add(f);
          const eingabe = document.getElementById('marke-laden');
          eingabe.files = liste.files;
          eingabe.dispatchEvent(new Event('change', { bubbles: true }));
        }, marke);
        await seite.waitForFunction(
          () => /übernommen|nicht lesen/.test(document.getElementById('design-meldung').textContent),
          null,
          { timeout: 25000 }
        );
        const meldung = await seite.locator('#design-meldung').innerText();
        wahr(/Hausmarke übernommen/.test(meldung), meldung);
        gleich(await seite.locator('#marke-akzent').inputValue(), '#00adef');
        gleich(await seite.locator('#design-sprache').inputValue(), 'en');
        gleich(await seite.locator('#marke-schrift').inputValue(), 'arial');

        // Eine fremde Datei bekommt den Grund gesagt.
        await seite.evaluate(() => {
          const f = new File(['{"was":1}'], 'fremd.json', { type: 'application/json' });
          const liste = new DataTransfer();
          liste.items.add(f);
          const eingabe = document.getElementById('marke-laden');
          eingabe.files = liste.files;
          eingabe.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await seite.waitForFunction(
          () => /keine Hausmarke/.test(document.getElementById('design-meldung').textContent),
          null,
          { timeout: 20000 }
        );
      },
      { hash: AUFNAHME }
    )
  );
});

s.test('Browser wieder schließen', () => schliessen());

export default s;
