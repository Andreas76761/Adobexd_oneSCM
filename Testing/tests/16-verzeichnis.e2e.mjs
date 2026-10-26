/**
 * Browserprüfung der Ansicht Verzeichnis: die Galerie auf die Platte.
 * Der Ordnerzugriff wird nachgebildet – jede geschriebene Datei samt Pfad
 * landet in `window.__geschrieben`, so lässt sich prüfen, was wirklich
 * entstanden wäre.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Verzeichnis – Oberfläche');

const AUFNAHME = '#ans=aufnahme';
const VERZEICHNIS = '#ans=verzeichnis';

/**
 * Ein Ordner mit Unterordnern: `getDirectoryHandle` legt an, jede Datei wird
 * mit vollem Pfad festgehalten.
 */
const ordnerNachbau = `
  window.__geschrieben = [];
  const baueOrdner = (pfad) => ({
    name: pfad.length ? pfad[pfad.length - 1] : 'Screens',
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getDirectoryHandle: async (name) => baueOrdner([...pfad, name]),
    getFileHandle: async (name) => ({
      createWritable: async () => ({
        write: async (blob) => {
          window.__geschrieben.push({
            pfad: [...pfad, name].join('/'),
            groesse: blob.size || String(blob).length,
            typ: blob.type || ''
          });
        },
        close: async () => {}
      })
    }),
    values: async function* () {}
  });
  window.showDirectoryPicker = async () => baueOrdner([]);`;

/** Zwei Aufnahmen, eine davon mit Stelle, Sprache, Rolle und Sparte. */
async function zweiBilder(seite) {
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
  await seite.evaluate(() => {
    document.getElementById('markier-labels').open = true;
  });
  await seite.selectOption('#label-sprache', 'de');
  await seite.selectOption('#label-rolle_label', 'dealer');
  await seite.selectOption('#label-sparte', 'pkw');
  await seite.waitForTimeout(150);
  await seite.click('#markier-sichern');
  await seite.waitForTimeout(250);
  await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
  await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
}

s.test('ohne Ordner erklärt sich die Ansicht und sperrt das Schreiben', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#verzeichnis-ansicht').isVisible(), true);
      gleich(await seite.locator('#verzeichnis-schreiben').isDisabled(), true);
      gleich(await seite.locator('#verzeichnis-waehlen').count(), 1, 'der Knopf zur Ordnerwahl fehlt');
      wahr(
        (await seite.locator('#verzeichnis-plan').innerText()).includes('keine Aufnahme im Eingang'),
        'der leere Eingang bleibt unerklärt'
      );
      wahr((await seite.locator('#verzeichnis-felder').innerText()).includes('{kapitel}'), 'die Platzhalter fehlen');
    },
    { hash: VERZEICHNIS, initSkript: ordnerNachbau }
  ));

s.test('wo kein Ordnerzugriff möglich ist, steht der Grund', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#verzeichnis-waehlen').count(), 0);
      wahr(
        (await seite.locator('#verzeichnis-ordner').innerText()).includes('Chrome oder Edge'),
        'der Weg fehlt: ' + (await seite.locator('#verzeichnis-ordner').innerText())
      );
    },
    {
      hash: VERZEICHNIS,
      initSkript: `Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: undefined });`
    }
  ));

s.test('der Plan zeigt jede Datei, bevor eine entsteht', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      const plan = await seite.locator('#verzeichnis-plan').innerText();
      wahr(plan.includes('pc/de/6-2/dealer/'), 'die Ordnung nach Sparte, Sprache, Kapitel, Rolle fehlt: ' + plan);
      wahr(plan.includes('ohne-sparte/ohne-sprache/ohne-kapitel/ohne-rolle/'), 'das ungelabelte Bild fehlt');
      wahr(plan.includes('index.json') && plan.includes('index.csv'), 'die Übersicht fehlt');
      gleich(await seite.evaluate(() => window.__geschrieben.length), 0, 'es wurde ohne Auftrag geschrieben');

      // Ein eigenes Muster wirkt sofort auf den Plan.
      await seite.fill('#verzeichnis-muster', '{jahr}/{kennung}');
      await seite.waitForFunction(
        () => document.getElementById('verzeichnis-plan').textContent.includes('/auf-2026-001.png'),
        null,
        { timeout: 5000 }
      );
      // Und die Schalter nehmen Dateien aus dem Plan.
      await seite.uncheck('#verzeichnis-zettel');
      await seite.uncheck('#verzeichnis-index');
      await seite.waitForFunction(
        () => !document.getElementById('verzeichnis-plan').textContent.includes('index.json'),
        null,
        { timeout: 5000 }
      );
      wahr(!(await seite.locator('#verzeichnis-plan').innerText()).includes('.json'), 'die Zettel bleiben im Plan');
    },
    { hash: AUFNAHME, initSkript: ordnerNachbau }
  ));

s.test('die Galerie wird mit Unterordnern geschrieben und berichtet', () =>
  mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      await seite.click('#verzeichnis-waehlen');
      await seite.waitForFunction(
        () => !document.getElementById('verzeichnis-schreiben').disabled,
        null,
        { timeout: 8000 }
      );
      await seite.click('#verzeichnis-schreiben');
      await seite.waitForFunction(
        () => /liegen nun/.test(document.getElementById('verzeichnis-meldung').textContent),
        null,
        { timeout: 30000 }
      );
      const dateien = await seite.evaluate(() => window.__geschrieben);
      const pfade = dateien.map((d) => d.pfad);
      wahr(
        pfade.some((p) => /^pc\/de\/6-2\/dealer\/.*\.png$/.test(p)),
        'das gelabelte Bild liegt nicht in seiner Ordnung: ' + pfade.join(' | ')
      );
      wahr(pfade.some((p) => /^pc\/de\/6-2\/dealer\/.*\.json$/.test(p)), 'der Beipackzettel fehlt');
      wahr(pfade.includes('index.json') && pfade.includes('index.csv'), 'die Übersicht fehlt');
      // Die Bilder kommen in voller Auflösung, nicht als Vorschau.
      const bild = dateien.find((d) => d.pfad.endsWith('.png'));
      wahr(bild.groesse > 5000, 'das Bild ist verdächtig klein: ' + bild.groesse);
      gleich(bild.typ, 'image/png');
      // Die Übersicht trägt die Bilder mit ihrem Pfad.
      const bericht = await seite.locator('#verzeichnis-meldung').innerText();
      wahr(/2 Bilder/.test(bericht), bericht);
      wahr(/Übersicht/.test(bericht));
    },
    { hash: AUFNAHME, initSkript: ordnerNachbau }
  ));

s.test('das Muster überlebt das Neuladen', () =>
  mitSeite(
    async (seite) => {
      await seite.fill('#verzeichnis-muster', '{kapitel}/{kennung}');
      await seite.waitForTimeout(300);
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
      gleich(await seite.locator('#verzeichnis-muster').inputValue(), '{kapitel}/{kennung}');
    },
    { hash: VERZEICHNIS, initSkript: ordnerNachbau }
  ));

/* --------------------------------------- Die Projektdatei (1.45.0) */

/** Die Ablage, die das Paket als Bytes festhält. */
const paketNachbau = `
  window.__dateien = [];
  window.claude = { use: async (n) => n !== 'downloads' ? null : { save: async (a) => {
    const puffer = await a.data.arrayBuffer();
    window.__paket = Array.from(new Uint8Array(puffer));
    window.__dateien.push({ name: a.filename, groesse: puffer.byteLength });
    return { status: 'saved' };
  } } };`;

s.test('der ganze Bestand wandert in eine Projektdatei und wieder zurück', () => {
  let paket = null;
  return mitSeite(
    async (seite) => {
      await zweiBilder(seite);
      // zweiBilder endet im Verzeichnis.
      wahr(
        (await seite.locator('#paket-stand').innerText()).includes('2 Aufnahme'),
        await seite.locator('#paket-stand').innerText()
      );
      // Ein eigenes Vorgehen für das Register Video - es soll mitreisen.
      await seite.click('.portal-nav button[data-ansicht="video"]');
      await seite.evaluate(() => (document.getElementById('video-vorgehen').open = true));
      await seite.fill('#vorgehen-aufforderung', 'Nenne nur die Maske, sonst nichts.');
      await seite.selectOption('#vorgehen-stufe', 'complex');
      await seite.click('#vorgehen-sichern');
      await seite.waitForTimeout(300);
      // Ein eigener Text aus dem Rückweg aus Word (F-65) - er ist Inhalt,
      // nicht Einstellung, und muss mitreisen. Sonst verliert ihn jeder,
      // der den Bestand weitergibt.
      await seite.evaluate(() =>
        localStorage.setItem(
          'screenarchiv:texte',
          JSON.stringify({
            version: 1,
            texte: {
              '7.5.1': { text: 'Im Haus neu geschrieben.', geaendert_am: '2026-10-26T00:00:00.000Z' }
            }
          })
        )
      );
      await seite.reload();
      await seite.waitForSelector('.portal-nav');
      await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
      await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');

      // Auch das Namensmuster ist eine Verabredung dieses Projekts.
      await seite.fill('#verzeichnis-muster', '{kapitel}/{kennung}_{titel}');
      await seite.waitForTimeout(250);

      await seite.click('#paket-sichern');
      await seite.waitForFunction(() => (window.__dateien || []).length === 1, null, { timeout: 60000 });
      const [datei] = await seite.evaluate(() => window.__dateien);
      wahr(/^screenarchiv-\d{4}-\d{2}-\d{2}\.zip$/.test(datei.name), datei.name);
      wahr(datei.groesse > 50000, 'die Projektdatei ist zu klein: ' + datei.groesse);
      wahr(
        /2 Aufnahmen, \d+ Bilder/.test(await seite.locator('#paket-meldung').innerText()),
        await seite.locator('#paket-meldung').innerText()
      );
      paket = await seite.evaluate(() => window.__paket);
    },
    { hash: AUFNAHME, initSkript: paketNachbau }
  ).then(() =>
    // Ein zweiter Browser, leer: dort wird die Datei eingelesen.
    mitSeite(
      async (seite) => {
        gleich(await seite.locator('.eingang-karte').count(), 0);
        await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
        await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
        await seite.evaluate(async (bytes) => {
          const datei = new File([new Uint8Array(bytes)], 'screenarchiv.zip', { type: 'application/zip' });
          const liste = new DataTransfer();
          liste.items.add(datei);
          const eingabe = document.getElementById('paket-datei');
          eingabe.files = liste.files;
          eingabe.dispatchEvent(new Event('change', { bubbles: true }));
        }, paket);
        await seite.waitForFunction(
          () => /ergänzt|nicht einlesen/.test(document.getElementById('paket-meldung').textContent),
          null,
          { timeout: 60000 }
        );
        const meldung = await seite.locator('#paket-meldung').innerText();
        wahr(/2 Aufnahme\(n\) und \d+ Bild\(er\) ergänzt/.test(meldung), meldung);
        wahr(
          (await seite.locator('#paket-bericht').innerText()).includes('Aufnahme(n)'),
          await seite.locator('#paket-bericht').innerText()
        );

        // Die Bilder sind da - samt frisch gerechneter Vorschau.
        await seite.click('.portal-nav button[data-ansicht="eingang"]');
        await seite.waitForSelector('#eingang-ansicht:not([hidden])');
        gleich(await seite.locator('.eingang-karte').count(), 2);
        const quellen = await seite.locator('.eingang-karte img').evaluateAll((liste) => liste.map((i) => i.src.slice(0, 15)));
        wahr(quellen.every((q) => q === 'data:image/jpeg'), quellen.join(' | '));
        // Und das volle Bild liegt in der Datenbank, nicht nur die Vorschau.
        const volle = await seite.evaluate(
          () =>
            new Promise((fertig) => {
              const anfrage = indexedDB.open('screenarchiv');
              anfrage.onsuccess = () => {
                const db = anfrage.result;
                if (!db.objectStoreNames.contains('bilder')) return fertig(0);
                const zaehler = db.transaction('bilder').objectStore('bilder').count();
                zaehler.onsuccess = () => fertig(zaehler.result);
                zaehler.onerror = () => fertig(0);
              };
              anfrage.onerror = () => fertig(0);
            })
        );
        wahr(volle >= 2, 'die vollen Bilder fehlen in der Datenbank: ' + volle);

        // Das Vorgehen des Registers Video ist mitgereist (1.60.0): eine
        // Arbeitsweise wie die Wortliste, nicht nur Bilder.
        wahr(
          (await seite.locator('#paket-bericht').innerText()).includes('Vorgehen für das Register Video'),
          await seite.locator('#paket-bericht').innerText()
        );
        const vorgehen = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:videovorgehen')));
        gleich(vorgehen.aufforderung, 'Nenne nur die Maske, sonst nichts.');
        gleich(vorgehen.stufe, 'complex');
        await seite.click('.portal-nav button[data-ansicht="video"]');
        await seite.evaluate(() => (document.getElementById('video-vorgehen').open = true));
        await seite.waitForTimeout(300);
        gleich(await seite.locator('#vorgehen-aufforderung').inputValue(), 'Nenne nur die Maske, sonst nichts.');

        // Und die eigenen Texte aus dem Rückweg aus Word (1.68.0). Bis
        // 1.67.0 blieben sie zurück: wer den Bestand weitergab, gab jede
        // im Haus geschriebene Zeile verloren.
        wahr(
          (await seite.locator('#paket-bericht').innerText()).includes('eigene(r) Text'),
          await seite.locator('#paket-bericht').innerText()
        );
        const texte = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:texte') || 'null'));
        wahr(texte && texte.texte && texte.texte['7.5.1'], 'die eigenen Texte sind nicht mitgereist');
        gleich(texte.texte['7.5.1'].text, 'Im Haus neu geschrieben.');
        // Sie liegen auch über der Gliederung, nicht nur im Speicher.
        await seite.click('.portal-nav button[data-ansicht="gliederung"]');
        await seite.waitForSelector('#gliederung-ansicht:not([hidden])');
        await seite.waitForTimeout(300);
        wahr(
          (await seite.locator('#ruecklauf-stand').innerText()).includes('1'),
          await seite.locator('#ruecklauf-stand').innerText()
        );

        // Und das Namensmuster (1.68.0) – dieselbe Art Sache wie das
        // Vorgehen: wer anders ablegt, legt anderswohin ab.
        await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
        await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
        gleich(await seite.locator('#verzeichnis-muster').inputValue(), '{kapitel}/{kennung}_{titel}');
        wahr(
          (await seite.locator('#paket-bericht').innerText()).includes('Namensmuster'),
          await seite.locator('#paket-bericht').innerText()
        );
      },
      { hash: AUFNAHME }
    )
  );
});

s.test('eine fremde Datei wird benannt, nicht verschluckt', () =>
  mitSeite(
    async (seite) => {
      await seite.click('.portal-nav button[data-ansicht="verzeichnis"]');
      await seite.waitForSelector('#verzeichnis-ansicht:not([hidden])');
      await seite.evaluate(() => {
        const datei = new File(['kein zip'], 'fremd.zip', { type: 'application/zip' });
        const liste = new DataTransfer();
        liste.items.add(datei);
        const eingabe = document.getElementById('paket-datei');
        eingabe.files = liste.files;
        eingabe.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await seite.waitForFunction(
        () => /nicht einlesen/.test(document.getElementById('paket-meldung').textContent),
        null,
        { timeout: 20000 }
      );
      wahr(
        /ZIP-Archiv/.test(await seite.locator('#paket-meldung').innerText()),
        await seite.locator('#paket-meldung').innerText()
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
