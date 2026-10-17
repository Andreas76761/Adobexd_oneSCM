/**
 * Browserprüfung der Ansicht Markieren: unkenntlich machen und erklären.
 * Geprüft wird dist/index.html in der Hülle, die das Artifact ergänzt.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Markieren – Oberfläche');

const MARKIEREN = '#ans=markieren';
const AUFNAHME = '#ans=aufnahme';

/** Legt eine Aufnahme aus der Beispielquelle an und wechselt zum Markieren. */
async function mitAufnahme(seite, titel = 'Bestellübersicht mit Kundendaten') {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  await seite.fill('#feld-titel', titel);
  await seite.fill('#feld-projekt', 'oneSCM Portal');
  await seite.selectOption('#feld-kategorie', 'Formular');
  await seite.fill('#feld-begriffe', 'kundendaten');
  await seite.click('#ausloesen');
  await seite.waitForTimeout(150);
  await seite.click('.portal-nav button[data-ansicht="markieren"]');
  await seite.waitForSelector('#markieren-ansicht:not([hidden])');
  await seite.selectOption('#markier-wahl', 'AUF-2026-001');
  await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 5000 });
}

/** Zieht ein Rechteck auf der Markierfläche auf. */
async function ziehe(seite, x1, y1, x2, y2) {
  const m = await seite.locator('#markier-leinwand').boundingBox();
  await seite.mouse.move(m.x + x1, m.y + y1);
  await seite.mouse.down();
  await seite.mouse.move(m.x + x2, m.y + y2, { steps: 10 });
  await seite.mouse.up();
  await seite.waitForTimeout(120);
}

const letzteMarke = (seite) => seite.locator('.marke-zeile').last().getAttribute('data-marke');

/**
 * Der Eingang, wie ihn die Seite kennt: Metadaten aus dem localStorage, die
 * Vorschauen aus der Browserdatenbank (seit 1.34.0 liegen sie dort).
 */
const eingangImSpeicher = (seite) =>
  seite.evaluate(async () => {
    const roh = localStorage.getItem('screenarchiv:eingang');
    const aufnahmen = roh ? JSON.parse(roh).aufnahmen : [];
    const vorschauen = await new Promise((fertig) => {
      const anfrage = indexedDB.open('screenarchiv');
      anfrage.onsuccess = () => {
        const db = anfrage.result;
        if (!db.objectStoreNames.contains('vorschauen')) return fertig(new Map());
        const karte = new Map();
        const zeiger = db.transaction('vorschauen').objectStore('vorschauen').openCursor();
        zeiger.onsuccess = () => {
          const stand = zeiger.result;
          if (!stand) return fertig(karte);
          karte.set(String(stand.key), stand.value);
          stand.continue();
        };
        zeiger.onerror = () => fertig(karte);
      };
      anfrage.onerror = () => fertig(new Map());
    });
    return aufnahmen.map((a) => ({ ...a, bild: a.bild || vorschauen.get(a.id) || '' }));
  });

s.test('die Navigation führt in die Ansicht Markieren', () =>
  mitSeite(async (seite) => {
    await seite.click('.portal-nav button[data-ansicht="markieren"]');
    gleich(await seite.locator('#markieren-ansicht').isVisible(), true);
    gleich(await seite.locator('#markier-leer').isVisible(), true, 'ohne Aufnahme fehlt die Anleitung');
    gleich(await seite.locator('#markier-sichern').isDisabled(), true);
    wahr(
      (await seite.locator('#markier-erklaerung').innerText()).includes('Original'),
      'der Hinweis auf das Original fehlt'
    );
  }));

s.test('eine abgedeckte Stelle verändert die Bildpunkte wirklich', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      // Bildpunkte der Stelle vor dem Abdecken merken.
      const vorher = await seite.evaluate(() => {
        const l = document.getElementById('markier-leinwand');
        return Array.from(l.getContext('2d').getImageData(80, 100, 40, 12).data);
      });
      await ziehe(seite, 60, 80, 300, 115);
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      const nachher = await seite.evaluate(() => {
        const l = document.getElementById('markier-leinwand');
        return Array.from(l.getContext('2d').getImageData(80, 100, 40, 12).data);
      });
      wahr(vorher.join(',') !== nachher.join(','), 'die Stelle sieht unverändert aus');
      // Außerhalb der Marke darf sich nichts ändern.
      const aussen = await seite.evaluate(() => {
        const l = document.getElementById('markier-leinwand');
        const d = l.getContext('2d').getImageData(l.width - 30, l.height - 30, 10, 10).data;
        return Array.from(d);
      });
      await ziehe(seite, 60, 200, 100, 240);
      const aussenDanach = await seite.evaluate(() => {
        const l = document.getElementById('markier-leinwand');
        const d = l.getContext('2d').getImageData(l.width - 30, l.height - 30, 10, 10).data;
        return Array.from(d);
      });
      gleich(aussen.join(','), aussenDanach.join(','), 'außerhalb der Marke wurde gemalt');
    },
    { hash: AUFNAHME }
  ));

s.test('Schritte werden nummeriert, beschriftet und ergeben eine Klickstrecke', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await seite.click('#markier-werkzeuge button[data-werkzeug="schritt"]');
      await ziehe(seite, 320, 200, 520, 250);
      await seite.fill('#marke-text-' + (await letzteMarke(seite)), 'Auf „Bestellung anlegen“ klicken');
      await ziehe(seite, 120, 300, 300, 345);
      await seite.fill('#marke-text-' + (await letzteMarke(seite)), 'Lieferant auswählen');
      await seite.waitForFunction(
        () => !document.getElementById('klickstrecke').hidden,
        null,
        { timeout: 5000 }
      );
      gleich(
        await seite.locator('#klickstrecke-text').innerText(),
        '1. Auf „Bestellung anlegen“ klicken\n2. Lieferant auswählen'
      );
      wahr(
        (await seite.locator('#markier-stand').innerText()).includes('2 Schritte'),
        'der Stand zählt die Schritte nicht'
      );

      // Schritt 1 entfernen: die Nummern dürfen keine Lücke lassen.
      await seite.locator('.marke-zeile').first().locator('.knopf').click();
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#klickstrecke-text').innerText(), '1. Lieferant auswählen');
    },
    { hash: AUFNAHME }
  ));

s.test('die gesicherte Fassung liegt neben dem Original, nicht darüber', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      const [vorher] = await eingangImSpeicher(seite);
      await ziehe(seite, 60, 80, 300, 115);
      await seite.waitForFunction(() => !document.getElementById('markier-sichern').disabled, null, { timeout: 5000 });
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /gesichert/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      const [nachher] = await eingangImSpeicher(seite);
      gleich(nachher.bild, vorher.bild, 'das Original wurde überschrieben');
      gleich(nachher.fassungen.length, 1, 'die Fassung fehlt');
      const [fassung] = nachher.fassungen;
      gleich(fassung.nummer, 1);
      wahr(fassung.bild && fassung.bild !== nachher.bild, 'die Fassung trägt kein eigenes Bild');
      gleich(fassung.marken.length, 1);
      gleich(fassung.marken[0].art, 'unkenntlich');
      wahr(String(fassung.erstellt_am).includes('T'), 'der Zeitpunkt fehlt');
      wahr(
        (await seite.locator('#markier-meldung').innerText()).includes('Original'),
        'die Meldung verschweigt, dass das Original bleibt'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('die Marken kommen beim nächsten Öffnen zurück', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await seite.click('#markier-werkzeuge button[data-werkzeug="schritt"]');
      await ziehe(seite, 320, 200, 520, 250);
      await seite.fill('#marke-text-' + (await letzteMarke(seite)), 'Auf „Anlegen“ klicken');
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /gesichert/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="markieren"]');
      await seite.selectOption('#markier-wahl', 'AUF-2026-001');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#klickstrecke-text').innerText(), '1. Auf „Anlegen“ klicken');
      wahr(
        (await seite.locator('#markier-meldung').innerText()).includes('1 Marken'),
        'die zurückgeholten Marken werden nicht genannt'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('„Alle Marken entfernen“ führt zurück zum Original', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await ziehe(seite, 60, 80, 300, 115);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /gesichert/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      await seite.click('#markier-zuruecksetzen');
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 0,
        null,
        { timeout: 5000 }
      );
      const [aufnahme] = await eingangImSpeicher(seite);
      gleich(aufnahme.marken.length, 0);
      gleich(aufnahme.fassungen.length, 2, 'die leere Fassung wird nicht als Stufe geführt');
      gleich(aufnahme.fassungen[1].marken.length, 0, 'die zweite Fassung trägt noch Marken');
      wahr(aufnahme.bild.startsWith('data:image/'), 'das Original fehlt');
    },
    { hash: AUFNAHME }
  ));

s.test('Entf entfernt die gewählte Marke', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await ziehe(seite, 60, 80, 300, 115);
      await ziehe(seite, 60, 200, 260, 240);
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 2,
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('.marke-zeile--gewaehlt').count(), 1, 'die neue Marke ist nicht gewählt');
      await seite.locator('#markier-buehne').focus();
      await seite.keyboard.press('Delete');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Eingang und Kontaktbogen zeigen die bearbeitete Fassung', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await ziehe(seite, 60, 80, 300, 115);
      await seite.click('#markier-werkzeuge button[data-werkzeug="schritt"]');
      await ziehe(seite, 320, 200, 520, 250);
      await seite.fill('#marke-text-' + (await letzteMarke(seite)), 'Auf „Anlegen“ klicken');
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /gesichert/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );

      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      gleich(await seite.locator('.markiert-marke').innerText(), 'Fassung 1');
      const [aufnahme] = await eingangImSpeicher(seite);
      const fassung = aufnahme.fassungen[aufnahme.fassungen.length - 1];
      gleich(
        await seite.locator('.eingang-karte img').first().getAttribute('src'),
        fassung.bild,
        'die Karte zeigt noch das Original'
      );

      await seite.click('#eingang-kontaktbogen');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 5000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(datei.data.includes(fassung.bild.slice(-60)), 'der Bogen trägt nicht die Fassung');
      // Zum Unterscheiden dient ein Stück aus der Mitte: die letzten Zeichen
      // zweier JPEG-Vorschauen desselben Bildschirms können gleich ausfallen,
      // die Mitte nicht - dort liegt die abgedeckte Stelle.
      const mitte = (bild) => bild.slice(Math.floor(bild.length / 2), Math.floor(bild.length / 2) + 200);
      wahr(mitte(aufnahme.bild) !== mitte(fassung.bild), 'Original und Fassung sind nicht zu unterscheiden');
      wahr(!datei.data.includes(mitte(aufnahme.bild)), 'der Bogen trägt das Original');
      wahr(/Fassung 1 . 1 Stelle abgedeckt/.test(datei.data), 'der Bogen verschweigt die Bearbeitung');
    },
    {
      hash: AUFNAHME,
      initSkript: `window.__abgelegt = [];
        window.claude = { use: async (n) => n !== 'downloads' ? null : {
          save: async (a) => { window.__abgelegt.push({ filename: a.filename, data: String(a.data) }); return { status: 'saved' }; } } };`
    }
  ));

s.test('jede Bearbeitung legt eine weitere Fassung an', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await ziehe(seite, 60, 80, 300, 115);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung 1/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      await seite.click('#markier-werkzeuge button[data-werkzeug="rahmen"]');
      await ziehe(seite, 320, 200, 520, 250);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung 2/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );

      const [aufnahme] = await eingangImSpeicher(seite);
      gleich(aufnahme.fassungen.length, 2, 'die zweite Bearbeitung ersetzt die erste');
      gleich(aufnahme.fassungen[0].marken.length, 1, 'die erste Fassung hat ihre Marken verloren');
      gleich(aufnahme.fassungen[1].marken.length, 2);
      wahr(aufnahme.fassungen[0].bild !== aufnahme.fassungen[1].bild, 'beide Fassungen zeigen dasselbe Bild');
      wahr(aufnahme.bild !== aufnahme.fassungen[1].bild, 'das Original wurde überschrieben');

      // Die erste Fassung lässt sich wieder öffnen und weiterbearbeiten.
      await seite.click('#fassung-laden-1');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      wahr(
        /Fassung 1 geöffnet/.test(await seite.locator('#markier-meldung').innerText()),
        'das Öffnen wird nicht gemeldet'
      );
      // Und verwerfen lässt sie sich auch.
      await seite.click('#fassung-weg-1');
      await seite.waitForFunction(
        () => document.querySelectorAll('[id^="fassung-laden-"]').length === 1,
        null,
        { timeout: 5000 }
      );
      const [danach] = await eingangImSpeicher(seite);
      gleich(danach.fassungen.length, 1);
      gleich(danach.fassungen[0].nummer, 2, 'verworfen wurde die falsche Fassung');
      wahr(danach.bild.startsWith('data:image/'), 'das Original ist weg');
    },
    { hash: AUFNAHME }
  ));

s.test('Nummer und Zeitstempel stehen unter dem Bild', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      const hoch = () => seite.evaluate(() => document.getElementById('markier-leinwand').height);
      const ohne = await seite.evaluate(() => {
        document.getElementById('markier-unterschrift').click();
        return null;
      });
      await seite.waitForTimeout(200);
      const ohneHoehe = await hoch();
      await seite.click('#markier-unterschrift');
      await seite.waitForTimeout(200);
      const mitHoehe = await hoch();
      wahr(mitHoehe > ohneHoehe, 'der Streifen unter dem Bild fehlt');

      // Die Nummern von Hand stehen seit 1.33.0 hinter einem Aufklapper -
      // die Regel ist die Stelle aus der Gliederung.
      await seite.evaluate(() => {
        document.querySelector('.feld--nummern').open = true;
      });
      await seite.fill('#markier-kapitel', '2');
      await seite.fill('#markier-unterkapitel', '3');
      await seite.waitForTimeout(200);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung 1/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      const [aufnahme] = await eingangImSpeicher(seite);
      gleich(aufnahme.kapitel, 2);
      gleich(aufnahme.unterkapitel, 3);

      // Die Gliederung steht danach auch im Eingang an der Karte.
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      wahr(
        (await seite.locator('.eingang-karte .kennung').first().innerText()).startsWith('2.3 ·'),
        'die Gliederungsnummer fehlt auf der Karte'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('der Editor lässt sich aus Aufnahme und Eingang direkt öffnen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#quelle-beispiel');
      await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
      await seite.fill('#feld-titel', 'Vorlagenliste');
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.click('#ausloesen');
      await seite.waitForSelector('#letzte-aufnahme:not([hidden])');

      // Aus der Aufnahme heraus - ohne Umweg über die Auswahl.
      await seite.click('#letzte-editor');
      await seite.waitForSelector('#markieren-ansicht:not([hidden])');
      await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 5000 });
      gleich(await seite.locator('#markier-wahl').inputValue(), 'AUF-2026-001');

      // Und aus der Karte im Eingang.
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.click('[data-editor="AUF-2026-001"]');
      await seite.waitForSelector('#markieren-ansicht:not([hidden])');
      gleich(await seite.locator('#markier-wahl').inputValue(), 'AUF-2026-001');
      gleich(
        await seite.locator('#eingang-dialog').evaluate((d) => d.open),
        false,
        'der Bearbeiten-Knopf öffnet zusätzlich den Dialog'
      );
    },
    { hash: AUFNAHME }
  ));

s.test('das Abdecken lässt sich rückgängig machen und wiederholen', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      const punkte = () =>
        seite.evaluate(() =>
          Array.from(document.getElementById('markier-leinwand').getContext('2d').getImageData(200, 150, 50, 15).data).join()
        );
      const vorher = await punkte();
      await ziehe(seite, 80, 90, 360, 130);
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      const abgedeckt = await punkte();
      wahr(vorher !== abgedeckt, 'die Stelle wurde nicht abgedeckt');

      await seite.click('#markier-rueckgaengig');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 0,
        null,
        { timeout: 5000 }
      );
      gleich(await punkte(), vorher, 'Rückgängig stellt das Bild nicht her');

      await seite.click('#markier-wiederher');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
      gleich(await punkte(), abgedeckt, 'Wiederholen bringt das Abdecken nicht zurück');

      // Dasselbe über die Tastatur.
      await seite.keyboard.press('Control+z');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 0,
        null,
        { timeout: 5000 }
      );
      await seite.keyboard.press('Control+Shift+z');
      await seite.waitForFunction(
        () => document.querySelectorAll('.marke-zeile').length === 1,
        null,
        { timeout: 5000 }
      );
    },
    { hash: AUFNAHME }
  ));

s.test('Aufnahmen behalten ihre volle Auflösung, der Eingang nur die Vorschau', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      const [satz] = await eingangImSpeicher(seite);
      const stand = { vorschau: satz.bild.length, breite: satz.breite, hoehe: satz.hoehe, voll: satz.voll === true };
      // Der Speicher selbst trägt die Vorschau nicht mehr - nur die Metadaten.
      const imSpeicher = await seite.evaluate(() => localStorage.getItem('screenarchiv:eingang').length);
      wahr(imSpeicher < 4000, 'die Vorschau steht noch im localStorage: ' + imSpeicher + ' Zeichen');
      gleich(stand.voll, true, 'das volle Bild wurde nicht abgelegt');
      gleich(stand.breite, 1440, 'die Quelle wurde heruntergerechnet');
      wahr(stand.vorschau < 400000, 'die Vorschau im Speicher ist zu groß: ' + stand.vorschau);

      // Der Editor arbeitet auf dem vollen Bild, nicht auf der Vorschau.
      const leinwand = await seite.evaluate(() => {
        const c = document.getElementById('markier-leinwand');
        return { breite: c.width, hoehe: c.height };
      });
      gleich(leinwand.breite, 1440, 'der Editor lädt die Vorschau statt des Originals');
      wahr(
        (await seite.locator('#markier-meldung').innerText()).includes('1440 × 900 px'),
        'die Auflösung wird nicht genannt'
      );

      // Und in der Datenbank liegt beides getrennt.
      const schluessel = await seite.evaluate(
        () =>
          new Promise((fertig) => {
            const anfrage = indexedDB.open('screenarchiv');
            anfrage.onsuccess = () => {
              const laden = anfrage.result.transaction('bilder', 'readonly').objectStore('bilder').getAllKeys();
              laden.onsuccess = () => fertig(laden.result);
            };
          })
      );
      wahr(schluessel.includes('AUF-2026-001'), 'das Original fehlt in der Datenbank: ' + schluessel.join());
    },
    { hash: AUFNAHME }
  ));

s.test('die abgedeckte Fassung heißt nach dem, was mit ihr geschah', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await ziehe(seite, 80, 90, 360, 130);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung 1/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      await seite.click('#markier-datei');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 1, null, { timeout: 8000 });
      const [datei] = await seite.evaluate(() => window.__abgelegt);
      wahr(/_blurrt_1\.png$/.test(datei.filename), 'der Name nennt das Abdecken nicht: ' + datei.filename);

      // Ohne Abdecken heißt sie anders.
      await seite.click('#markier-zuruecksetzen');
      await seite.click('#markier-werkzeuge button[data-werkzeug="rahmen"]');
      await ziehe(seite, 100, 200, 300, 250);
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /Fassung 2/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      await seite.click('#markier-datei');
      await seite.waitForFunction(() => (window.__abgelegt || []).length === 2, null, { timeout: 8000 });
      const zweite = await seite.evaluate(() => window.__abgelegt[1]);
      wahr(/_markiert_2\.png$/.test(zweite.filename), 'die zweite Fassung heißt falsch: ' + zweite.filename);
      wahr(zweite.groesse > 20000, 'die abgelegte Datei ist verdächtig klein');
    },
    {
      hash: AUFNAHME,
      initSkript: `window.__abgelegt = [];
        window.claude = { use: async (n) => n !== 'downloads' ? null : {
          save: async (a) => { window.__abgelegt.push({ filename: a.filename, groesse: a.data.size || String(a.data).length }); return { status: 'saved' }; } } };`
    }
  ));

s.test('Kapitel, Unterkapitel und Stelle lassen sich auswählen', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      // Die Auswahl beginnt bei den Kapiteln; tiefere Ebenen warten.
      wahr((await seite.locator('#stelle-kapitel option').count()) > 10, 'die Kapitel fehlen');
      gleich(await seite.locator('#stelle-unterkapitel').isDisabled(), true);
      const erstes = await seite.locator('#stelle-kapitel option').nth(1).innerText();
      wahr(/^\d+\s{2}\S/.test(erstes), 'Nummer und Name stehen nicht zusammen: ' + erstes);

      await seite.selectOption('#stelle-kapitel', '7');
      await seite.waitForFunction(() => !document.getElementById('stelle-unterkapitel').disabled, null, { timeout: 5000 });
      const unter = await seite.locator('#stelle-unterkapitel option').allInnerTexts();
      wahr(unter.some((u) => u.startsWith('7.5')), unter.slice(0, 4).join(' | '));
      gleich(await seite.locator('#markier-stelle').inputValue(), '7');

      await seite.selectOption('#stelle-unterkapitel', '7.5');
      await seite.waitForFunction(() => !document.getElementById('stelle-schritt').disabled, null, { timeout: 5000 });
      await seite.selectOption('#stelle-schritt', '7.5.2');
      gleich(await seite.locator('#markier-stelle').inputValue(), '7.5.2');
      gleich(await seite.locator('#markier-stelle-thema').innerText(), 'Signaturergebnis');

      // Getippt wirkt genauso - die Auswahl zieht nach.
      await seite.fill('#markier-stelle', '6.2');
      await seite.waitForFunction(
        () => document.getElementById('stelle-kapitel').value === '6',
        null,
        { timeout: 5000 }
      );
      gleich(await seite.locator('#stelle-unterkapitel').inputValue(), '6.2');

      // Die Stelle wandert mit der Fassung an die Aufnahme.
      await seite.click('#markier-sichern');
      await seite.waitForFunction(
        () => /gesichert/.test(document.getElementById('markier-meldung').textContent),
        null,
        { timeout: 5000 }
      );
      const [aufnahme] = await eingangImSpeicher(seite);
      gleich(aufnahme.gliederung, '6.2');
    },
    { hash: AUFNAHME }
  ));

s.test('die Labels tragen ihr Zeichen – auch im Bild', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      await seite.evaluate(() => {
        document.getElementById('markier-labels').open = true;
      });
      await seite.selectOption('#label-rolle_label', 'hq');
      await seite.selectOption('#label-sparte', 'van');
      // Das Zeichen der Beschriftung folgt dem Wert.
      gleich(
        await seite.locator('label[for="label-rolle_label"] use').getAttribute('href'),
        '#sym-rolle-hq',
        'die Rolle zeigt ihr eigenes Zeichen nicht'
      );
      gleich(await seite.locator('label[for="label-sparte"] use').getAttribute('href'), '#sym-sparte-van');
      wahr((await seite.locator('#label-kette').innerText()).includes('Van'), await seite.locator('#label-kette').innerText());

      // Im Bild steht die Marke mit Zeichen - sie wird dadurch breiter.
      await seite.click('#label-ins-bild');
      await seite.waitForTimeout(300);
      const marken = await seite.evaluate(() =>
        [...document.querySelectorAll('#markier-liste .marke-art')].map((k) => k.textContent)
      );
      wahr(marken.length >= 2, 'die Labels stehen nicht im Bild: ' + marken.join(', '));
    },
    { hash: AUFNAHME }
  ));

s.test('der Speicher trägt Metadaten, die Datenbank die Vorschauen', () =>
  mitSeite(
    async (seite) => {
      await mitAufnahme(seite);
      // Zehn Aufnahmen – im alten Stand wären das 380 kB im localStorage.
      await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
      for (let i = 0; i < 9; i++) {
        await seite.fill('#feld-titel', 'Maske ' + i);
        await seite.fill('#feld-projekt', 'oneSCM Portal');
        await seite.selectOption('#feld-kategorie', 'Formular');
        await seite.fill('#feld-begriffe', 'reihe');
        await seite.click('#ausloesen');
        await seite.waitForTimeout(120);
      }
      const stand = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return { zeichen: roh.length, anzahl: JSON.parse(roh).aufnahmen.length, mitBild: roh.includes('data:image/') };
      });
      gleich(stand.anzahl, 10);
      gleich(stand.mitBild, false, 'im Speicher steht noch ein Bild');
      wahr(stand.zeichen / stand.anzahl < 1200, 'je Aufnahme zu viel im Speicher: ' + Math.round(stand.zeichen / stand.anzahl));

      // Nach dem Neuladen sind die Vorschauen wieder da.
      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForFunction(
        () => {
          const bilder = [...document.querySelectorAll('.eingang-karte img')];
          return bilder.length === 10 && bilder.every((b) => b.src.startsWith('data:image/jpeg'));
        },
        null,
        { timeout: 10000 }
      );
      const nachher = await eingangImSpeicher(seite);
      gleich(nachher.length, 10);
      wahr(nachher.every((a) => a.bild.startsWith('data:image/')), 'eine Vorschau kam nicht zurück');
    },
    { hash: AUFNAHME }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
