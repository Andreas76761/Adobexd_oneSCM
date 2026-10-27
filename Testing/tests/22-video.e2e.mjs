/**
 * Browserprüfung des Registers Video: aus einem Bildschirmvideo werden
 * Einzelbilder fürs Handbuch.
 *
 * Das Prüfvideo entsteht in der Seite selbst – eine Leinwand mit vier
 * Masken, über `captureStream` und `MediaRecorder` zu einer WebM-Datei
 * aufgenommen. So liegt keine Beispieldatei im Repo und es braucht kein
 * fremdes Werkzeug.
 */
import { join } from 'node:path';
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Video – Oberfläche');

const VIDEO = '#ans=video';

/**
 * Nimmt in der Seite ein kurzes Video mit `masken` Abschnitten auf und legt
 * es in die Dateieingabe – denselben Weg, den eine gewählte Datei geht.
 */
async function legeVideoEin(seite, masken = 4) {
  const bereit = await seite.evaluate(async (anzahl) => {
    const leinwand = document.createElement('canvas');
    leinwand.width = 320;
    leinwand.height = 240;
    const stift = leinwand.getContext('2d');
    const strom = leinwand.captureStream(10);
    const art = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const schreiber = new MediaRecorder(strom, { mimeType: art });
    const teile = [];
    schreiber.ondataavailable = (e) => e.data.size && teile.push(e.data);
    schreiber.start();
    const farben = ['#14284f', '#14284f', '#5a1e1e', '#1e5032', '#4a3a10', '#20405a'];
    for (let i = 0; i < anzahl; i++) {
      stift.fillStyle = farben[i % farben.length];
      stift.fillRect(0, 0, 320, 240);
      stift.fillStyle = '#ffffff';
      stift.fillRect(30, 30 + (i % 4) * 45, 260, 32);
      await new Promise((f) => setTimeout(f, 700));
    }
    await new Promise((f) => {
      schreiber.onstop = f;
      schreiber.stop();
    });
    const blob = new Blob(teile, { type: 'video/webm' });
    if (!blob.size) return false;
    const datei = new File([blob], 'Vertrag anlegen.webm', { type: 'video/webm' });
    const traeger = new DataTransfer();
    traeger.items.add(datei);
    const eingabe = document.getElementById('video-eingabe');
    eingabe.files = traeger.files;
    eingabe.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, masken);
  wahr(bereit, 'das Prüfvideo ließ sich nicht aufnehmen');
  await seite.waitForFunction(() => !document.getElementById('video-leiste').hidden, null, { timeout: 25000 });
}

s.test('ohne Video sagt die Ansicht, was sie erwartet – und was sie nicht kann', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#video-ansicht').isVisible(), true);
      gleich(await seite.locator('#video-automatisch').isDisabled(), true);
      gleich(await seite.locator('#video-hier').isDisabled(), true);
      gleich(await seite.locator('#video-leiste').isVisible(), false);
      const hinweis = await seite.locator('#video-ansicht > .band-hinweis').first().innerText();
      // Die Grenze wird genannt, nicht verschwiegen: kein Abholen aus Clipchamp.
      wahr(hinweis.includes('holt kein Video ab'), hinweis);
      wahr(hinweis.includes('Clipchamp'), hinweis);
      wahr(hinweis.includes('MP4'), hinweis);
      // Was dieser Browser abspielt, steht da, bevor jemand eine Datei ablegt.
      const formate = await seite.locator('#video-formate').innerText();
      wahr(formate.includes('MP4') || formate.includes('WebM'), formate);
      gleich(await seite.locator('#video-stand').innerText(), 'noch kein Bild herausgenommen');
    },
    { hash: VIDEO }
  ));

s.test('ein Video wird geöffnet und mit Dauer und Maßen genannt', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      const meldung = await seite.locator('#video-meldung').innerText();
      wahr(meldung.includes('Vertrag anlegen.webm'), meldung);
      wahr(meldung.includes('320 × 240 px'), meldung);
      wahr(meldung.includes('bleibt im Browser'), meldung);
      gleich(await seite.locator('#video-spieler').isVisible(), true);
      gleich(await seite.locator('#video-automatisch').isDisabled(), false);
    },
    { hash: VIDEO }
  ));

s.test('eine Datei, die kein Video ist, wird benannt, nicht geöffnet', () =>
  mitSeite(
    async (seite) => {
      await seite.evaluate(() => {
        const datei = new File([new Uint8Array([1, 2, 3])], 'Notiz.txt', { type: 'text/plain' });
        const traeger = new DataTransfer();
        traeger.items.add(datei);
        const eingabe = document.getElementById('video-eingabe');
        eingabe.files = traeger.files;
        eingabe.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await seite.waitForTimeout(400);
      wahr(
        (await seite.locator('#video-meldung').innerText()).includes('sieht nicht nach einem Video aus'),
        await seite.locator('#video-meldung').innerText()
      );
      gleich(await seite.locator('#video-spieler').isVisible(), false);
    },
    { hash: VIDEO }
  ));

s.test('die Abtastung behält die Stellen, an denen sich etwas ändert', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      await seite.selectOption('#video-dichte', '24');
      await seite.selectOption('#video-schwelle', '0.02');
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length > 0, null, { timeout: 90000 });
      await seite.waitForTimeout(600);

      const bilder = await seite.locator('.video-figur').count();
      // Vier Masken: vier Bilder. Mehr wäre Rauschen, weniger ein Verlust.
      wahr(bilder >= 3 && bilder <= 5, 'aus vier Masken wurden ' + bilder + ' Bilder');
      wahr(
        (await seite.locator('#video-meldung').innerText()).includes('abgetasteten Stellen'),
        await seite.locator('#video-meldung').innerText()
      );
      // Das erste Bild sagt, warum es dasteht; die übrigen nennen den Anteil.
      const gruende = await seite.locator('.video-figur figcaption').allInnerTexts();
      wahr(gruende[0].includes('erstes Bild'), gruende[0]);
      wahr(gruende[1].includes('%'), gruende[1]);
      // Die Bilder tragen die volle Auflösung des Videos, nicht die der Vorschau.
      wahr(gruende[0].includes('320 × 240 px'), gruende[0]);
      // Der Übernahmeblock klappt von selbst auf - sonst sähe es aus, als ginge es nicht weiter.
      gleich(await seite.evaluate(() => document.getElementById('video-uebernahme').open), true);
    },
    { hash: VIDEO }
  ));

s.test('ein Bild lässt sich auch von Hand an einer Stelle nehmen', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      await seite.evaluate(() => (document.getElementById('video-spieler').currentTime = 1.5));
      await seite.waitForTimeout(500);
      await seite.click('#video-hier');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length === 1, null, { timeout: 15000 });
      wahr(
        (await seite.locator('.video-figur figcaption').first().innerText()).includes('von Hand'),
        'der Grund steht nicht am Bild'
      );
      // Zweimal dieselbe Stelle gibt kein zweites Bild.
      await seite.click('#video-hier');
      await seite.waitForTimeout(400);
      gleich(await seite.locator('.video-figur').count(), 1);
      wahr(
        (await seite.locator('#video-meldung').innerText()).includes('liegt schon ein Bild'),
        await seite.locator('#video-meldung').innerText()
      );
    },
    { hash: VIDEO }
  ));

s.test('die Bilder gehen mit Stelle, Labels und Herkunft in den Eingang', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length >= 3, null, { timeout: 90000 });
      await seite.waitForTimeout(600);

      // Der Text wird zum Rezept - hier von Hand, weil Claude in der Prüfung fehlt.
      await seite.locator('.video-figur textarea').first().fill('Im Feld Vertragsnummer die Nummer eingeben.');
      await seite.fill('#video-stelle', '7.5.1');
      await seite.click('#video-fortlaufend');
      await seite.waitForTimeout(400);
      const stellen = await seite.evaluate(() =>
        [...document.querySelectorAll('.video-figur input[id^=video-stelle-]')].map((e) => e.value)
      );
      gleich(stellen[0], '7.5.1');
      gleich(stellen[1], '7.5.2', 'die Stellen laufen nicht weiter');

      await seite.selectOption('#video-label-sprache', 'de');
      await seite.fill('#video-label-markt', 'Germany');
      await seite.click('#video-uebernehmen');
      await seite.waitForFunction(
        () => document.querySelectorAll('.video-figur--fertig').length >= 3,
        null,
        { timeout: 60000 }
      );

      const aufnahmen = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? JSON.parse(roh).aufnahmen : [];
      });
      wahr(aufnahmen.length >= 3, 'im Eingang liegen nur ' + aufnahmen.length);
      for (const aufnahme of aufnahmen) {
        gleich(aufnahme.sprache, 'de');
        gleich(aufnahme.markt, 'Germany');
        gleich(aufnahme.einfuhr.art, 'video');
        gleich(aufnahme.einfuhr.datei, 'Vertrag anlegen.webm');
        wahr(typeof aufnahme.einfuhr.sekunde === 'number', 'der Zeitpunkt fehlt an der Aufnahme');
        // Der Zeitpunkt steht auch als Seitenangabe da, damit er sichtbar ist.
        wahr(/^\d\d:\d\d,\d$/.test(aufnahme.seite), aufnahme.seite);
      }
      const zugeordnet = aufnahmen.map((a) => a.gliederung).filter(Boolean);
      wahr(zugeordnet.includes('7.5.1'), 'die erste Stelle fehlt');
      const mitRezept = aufnahmen.filter((a) => (a.notiz || '').includes('Vertragsnummer'));
      gleich(mitRezept.length, 1, 'der Text wurde nicht zum Rezept');
    },
    { hash: VIDEO }
  ));

s.test('aus dem Video wird eine Klickstrecke in der Reihenfolge des Films (1.57.0)', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length >= 3, null, { timeout: 90000 });
      await seite.waitForTimeout(600);

      // Der gedeutete Text wird zur Anweisung des Schritts - hier von Hand.
      const zahl = await seite.locator('.video-figur textarea').count();
      for (let i = 0; i < zahl; i++) {
        await seite.locator('.video-figur textarea').nth(i).fill(`Schritt ${i + 1} ausführen.`);
      }
      await seite.click('#video-strecke');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur--fertig').length >= 3, null, { timeout: 60000 });
      await seite.waitForTimeout(400);

      const meldung = await seite.locator('#video-meldung').innerText();
      wahr(meldung.includes('die Strecke „Vertrag anlegen"'), meldung);
      wahr(meldung.includes('Schritten'), meldung);

      const strecken = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:strecken');
        return roh ? JSON.parse(roh).strecken : [];
      });
      gleich(strecken.length, 1);
      gleich(strecken[0].name, 'Vertrag anlegen', 'der Name kommt nicht aus der Datei');
      wahr(strecken[0].schritte.length >= 3, 'nur ' + strecken[0].schritte.length + ' Schritte');
      // Jeder Schritt trägt sein Bild und seine Anweisung, in dieser Folge.
      strecken[0].schritte.forEach((schritt, i) => {
        gleich(schritt.art, 'schritt');
        gleich(schritt.aufnahmen.length, 1);
        gleich(schritt.text, `Schritt ${i + 1} ausführen.`);
      });
      // Die Kennungen laufen aufsteigend - die Reihenfolge des Films.
      const kennungen = strecken[0].schritte.map((s) => s.aufnahmen[0]);
      tieferGleich([...kennungen].sort(), kennungen, 'die Schritte stehen nicht in der Folge des Videos');

      // Die Strecke steht offen da, nicht nur im Speicher.
      await seite.click('.portal-nav button[data-ansicht="strecke"]');
      await seite.waitForTimeout(700);
      gleich(await seite.locator('#strecke-name').inputValue(), 'Vertrag anlegen');
      gleich(await seite.locator('.schritt-bilder').count(), strecken[0].schritte.length);
    },
    { hash: VIDEO }
  ));

s.test('verworfene Bilder verschwinden, übernommene bleiben im Eingang', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      await seite.evaluate(() => (document.getElementById('video-spieler').currentTime = 1.2));
      await seite.waitForTimeout(400);
      await seite.click('#video-hier');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length === 1, null, { timeout: 15000 });
      await seite.click('#video-uebernehmen');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur--fertig').length === 1, null, { timeout: 30000 });

      await seite.click('#video-verwerfen');
      await seite.waitForTimeout(400);
      gleich(await seite.locator('.video-figur').count(), 0);
      wahr(
        (await seite.locator('#video-meldung').innerText()).includes('bleiben im Eingang'),
        await seite.locator('#video-meldung').innerText()
      );
      const aufnahmen = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:eingang');
        return roh ? JSON.parse(roh).aufnahmen : [];
      });
      gleich(aufnahmen.length, 1, 'die übernommene Aufnahme ist mitverschwunden');
    },
    { hash: VIDEO }
  ));

s.test('jeder Durchgang wird festgehalten und mit dem vorigen verglichen (1.59.0)', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      gleich(await seite.locator('#video-laeufe').isVisible(), false, 'ohne Lauf steht das Band schon da');

      await seite.selectOption('#video-dichte', '12');
      await seite.selectOption('#video-schwelle', '0.08');
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.lauf').length >= 1, null, { timeout: 90000 });
      await seite.waitForTimeout(400);
      gleich(await seite.locator('#video-laeufe').isVisible(), true);
      const v1 = await seite.locator('.lauf').first().innerText();
      wahr(v1.includes('V1'), v1);
      wahr(v1.includes('Abtastung 12 Stellen'), v1);
      wahr(v1.includes('Schwelle 8 %'), v1);

      // Zweiter Durchgang mit einer anderen Schwelle.
      await seite.click('#video-verwerfen');
      await seite.waitForTimeout(300);
      await seite.selectOption('#video-schwelle', '0.005');
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.lauf').length >= 2, null, { timeout: 90000 });
      await seite.waitForTimeout(400);

      gleich(await seite.locator('.lauf').count(), 2, 'der erste Durchgang wurde überschrieben');
      const v2 = await seite.locator('.lauf').nth(1).innerText();
      wahr(v2.includes('V2'), v2);
      // Was geändert wurde, steht da - und was es gebracht hat.
      wahr(v2.includes('Geändert:'), v2);
      wahr(v2.includes('Schwelle 8 % → 0,5 %'), v2);
      wahr(
        (await seite.locator('#video-laeufe-stand').innerText()).includes('2 Durchgänge'),
        await seite.locator('#video-laeufe-stand').innerText()
      );

      // Die Regler eines Laufs lassen sich zurückholen.
      await seite.locator('.lauf').first().getByText('Einstellungen übernehmen').click();
      await seite.waitForTimeout(200);
      gleich(await seite.locator('#video-schwelle').inputValue(), '0.08');
      wahr(
        (await seite.locator('#video-meldung').innerText()).includes('Regler von V1'),
        await seite.locator('#video-meldung').innerText()
      );

      // Verwerfen nimmt die Durchgänge, nicht die Bilder.
      await seite.click('#video-laeufe-leeren');
      await seite.waitForTimeout(300);
      gleich(await seite.locator('.lauf').count(), 0);
      gleich(await seite.locator('#video-laeufe').isVisible(), false);
    },
    { hash: VIDEO }
  ));

s.test('ein Durchgang ohne Fund sagt, welche Größe zu ändern ist (1.59.0)', () =>
  mitSeite(
    async (seite) => {
      // Ein Film aus einer einzigen Maske: da ändert sich nichts.
      await legeVideoEin(seite, 1);
      await seite.selectOption('#video-dichte', '24');
      await seite.selectOption('#video-schwelle', '0.08');
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.lauf').length >= 1, null, { timeout: 90000 });
      await seite.waitForTimeout(400);
      const lauf = await seite.locator('.lauf').first().innerText();
      // Entweder nichts gefunden oder nur das erste Bild - beides bekommt
      // einen Rat, und beide Male ist es *eine* Größe.
      wahr(/Schwelle/.test(lauf), lauf);
      gleich(await seite.locator('.lauf-diagnose--offen').count(), 1, 'der Rat fehlt oder gilt als in Ordnung');
    },
    { hash: VIDEO }
  ));

s.test('das Vorgehen überdauert den Film und steht beim nächsten da (1.59.0)', () =>
  mitSeite(
    async (seite) => {
      await seite.evaluate(() => (document.getElementById('video-vorgehen').open = true));
      await seite.waitForTimeout(300);
      // Die eingebaute Aufforderung ist einsehbar, nicht verborgen.
      const vorlage = await seite.evaluate(() => document.getElementById('vorgehen-vorlage-text').textContent);
      wahr(vorlage.includes('Imperativ'), vorlage.slice(0, 80));
      gleich(await seite.locator('#video-vorgehen-stand').innerText(), 'eingebaute Aufforderung');

      await seite.fill('#vorgehen-aufforderung', 'Nenne nur die Maske, sonst nichts.');
      await seite.selectOption('#vorgehen-stufe', 'complex');
      await seite.click('#vorgehen-sichern');
      await seite.waitForTimeout(300);
      gleich(await seite.locator('#video-vorgehen-stand').innerText(), 'eigene Aufforderung');
      wahr(
        (await seite.locator('#vorgehen-meldung').innerText()).includes('nächsten Film'),
        await seite.locator('#vorgehen-meldung').innerText()
      );
      const gespeichert = await seite.evaluate(() => JSON.parse(localStorage.getItem('screenarchiv:videovorgehen')));
      gleich(gespeichert.stufe, 'complex');
      gleich(gespeichert.aufforderung, 'Nenne nur die Maske, sonst nichts.');

      await seite.click('#vorgehen-zurueck');
      await seite.waitForTimeout(300);
      gleich(await seite.locator('#vorgehen-aufforderung').inputValue(), '');
      gleich(await seite.locator('#video-vorgehen-stand').innerText(), 'eingebaute Aufforderung');
    },
    { hash: VIDEO }
  ));

/** Versperrt den ersten Weg: Objektadressen führen ins Leere. */
function ohneObjektadressen() {
  const echt = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (gegenstand) =>
    gegenstand instanceof Blob && String(gegenstand.type || '').startsWith('video/')
      ? 'blob:gesperrt-fuer-die-pruefung'
      : echt(gegenstand);
}

s.test('ist der erste Weg versperrt, öffnet der zweite – ohne falsche Ursache (1.61.0)', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 3);
      // Der zweite Weg hat geöffnet: Leiste da, Maße bekannt.
      gleich(await seite.locator('#video-leiste').isVisible(), true);
      const meldung = await seite.locator('#video-meldung').innerText();
      wahr(meldung.includes('320 × 240 px'), meldung);
      // Und vor allem: das Format wurde *nicht* beschuldigt.
      wahr(!meldung.includes('kein MP4'), meldung);
      wahr(!meldung.includes('Chrome, Edge oder Safari'), meldung);
      // Danach läuft alles weiter wie sonst.
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length >= 2, null, { timeout: 90000 });
      wahr((await seite.locator('.video-figur').count()) >= 2, 'ohne Objektadresse kam kein Bild heraus');
    },
    // Die versperrte Adresse schlägt in der Konsole auf - das ist der Zweck.
    { hash: VIDEO, initSkript: ohneObjektadressen, erwarteteFehler: ['blob:gesperrt-fuer-die-pruefung'] }
  ));

/**
 * Zählt die Bildpunkte in der Akzentfarbe im zweiten Vorschaubild des
 * Eingangs. Gelesen wird das Bild, das die Seite ohnehin schon gezeichnet
 * hat – ein Bild im `evaluate` nachzuladen ist unzuverlässig.
 */
async function akzentpunkte(seite) {
  await seite.click('.portal-nav button[data-ansicht="eingang"]');
  await seite.waitForSelector('.eingang-karte img');
  await seite.waitForTimeout(400);
  return seite.evaluate(() => {
    const bilder = [...document.querySelectorAll('.eingang-karte img')];
    // Die erste Aufnahme hat keinen Vorgänger und darum keinen Rahmen.
    const bild = bilder[Math.min(1, bilder.length - 1)];
    const l = document.createElement('canvas');
    l.width = bild.naturalWidth;
    l.height = bild.naturalHeight;
    const stift = l.getContext('2d');
    stift.drawImage(bild, 0, 0);
    const daten = stift.getImageData(0, 0, l.width, l.height).data;
    let zahl = 0;
    for (let i = 0; i < daten.length; i += 4) {
      if (daten[i] > 120 && daten[i] - daten[i + 2] > 50 && daten[i] - daten[i + 1] > 50) zahl += 1;
    }
    return zahl;
  });
}

/** Nimmt Bilder heraus und übernimmt sie – mit oder ohne Rahmen. */
async function bilderMitRahmen(seite, mitRahmen) {
  await legeVideoEin(seite, 4);
  await seite.click('#video-automatisch');
  await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length >= 3, null, { timeout: 90000 });
  await seite.waitForTimeout(400);
  // Der Schalter steckt im Übernahmeband; das klappt beim ersten Bild auf.
  await seite.evaluate(() => (document.getElementById('video-uebernahme').open = true));
  if (!mitRahmen) await seite.uncheck('#video-rahmen');
  await seite.click('#video-uebernehmen');
  await seite.waitForFunction(() => document.querySelectorAll('.video-figur--fertig').length >= 3, null, { timeout: 60000 });
}

s.test('der geänderte Bereich wird ins übernommene Bild gezeichnet (1.63.0)', () =>
  mitSeite(
    async (seite) => {
      await legeVideoEin(seite, 4);
      await seite.click('#video-automatisch');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur').length >= 3, null, { timeout: 90000 });
      await seite.waitForTimeout(400);
      await seite.evaluate(() => (document.getElementById('video-uebernahme').open = true));
      gleich(await seite.locator('#video-rahmen').isChecked(), true, 'der Rahmen ist nicht vorgesehen');
      await seite.click('#video-uebernehmen');
      await seite.waitForFunction(() => document.querySelectorAll('.video-figur--fertig').length >= 3, null, { timeout: 60000 });

      // Geprüft wird am Bildpunkt, nicht an einer Einstellung.
      const rot = await akzentpunkte(seite);
      wahr(rot > 20, 'im Bild steht kein Rahmen: ' + rot + ' Punkte in der Akzentfarbe');
    },
    { hash: VIDEO }
  ));

s.test('ohne Schalter bleibt das Bild unberührt (1.63.0)', () =>
  mitSeite(
    async (seite) => {
      await bilderMitRahmen(seite, false);
      gleich(await akzentpunkte(seite), 0, 'es wurde trotzdem ein Rahmen gezeichnet');
    },
    { hash: VIDEO }
  ));

s.test('eine leere Antwort lässt die Fortschrittszeile nicht stehen (1.71.0)', () =>
  mitSeite(
    async (seite) => {
      // Bis 1.70.0 stand am Ende `if (fertig)`: kam nichts zurück und
      // scheiterte auch nichts – eine vertragsgemäße leere Antwort –,
      // blieb „Bild bei 00:00,0 wird gedeutet …" stehen. Niemand konnte
      // sehen, dass der Lauf vorbei war.
      await legeVideoEin(seite, 3);
      await seite.click('#video-hier');
      await seite.waitForSelector('.video-figur', { timeout: 20000 });
      await seite.click('#video-deuten');
      await seite.waitForFunction(
        () => /nichts gedeutet/.test(document.getElementById('video-meldung').textContent),
        null,
        { timeout: 30000 }
      );
      const meldung = await seite.locator('#video-meldung').innerText();
      wahr(!meldung.includes('wird gedeutet'), 'die Fortschrittszeile steht noch: ' + meldung);
      wahr(meldung.includes('von Hand'), meldung);
      // Und der Knopf lädt weiter ein, es noch einmal zu versuchen.
      gleich(await seite.locator('#video-deuten').isDisabled(), false);
    },
    {
      hash: VIDEO,
      initSkript: `
        const sample = async () => ({ text: '   ' });
        sample.limits = async () => ({ maxPromptBytes: 65536, images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
        window.claude = { use: async (name) => (name === 'sample' ? sample : null) };`
    }
  ));

s.test('Browser wieder schließen', async () => {
  await schliessen();
  return true;
});

export default s;
