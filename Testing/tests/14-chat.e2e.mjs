/**
 * Browserprüfung des Suchchats: ein frei bewegliches Fenster, das nach
 * Bildern gefragt wird und Bilder zeigt. Geprüft wird auch der Weg weiter –
 * in den Editor und an die Strecke.
 */
import { join } from 'node:path';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { erzeugeBrowserHelfer } from '../hilfen/browser.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const { mitSeite, schliessen } = erzeugeBrowserHelfer(join(wurzel, 'dist', 'index.html'));
const s = suite('Suchchat – Oberfläche');

const AUFNAHME = '#ans=aufnahme';

/** Legt drei Aufnahmen an und gibt zwei davon Rolle und Stelle. */
async function dreiMitLabels(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 5000 });
  const liste = [
    { titel: 'Vorlagenliste', stelle: '6.2', rolle: 'dealer' },
    { titel: 'Template anlegen', stelle: '6.2', rolle: 'market' },
    { titel: 'Freigabe', stelle: '', rolle: '' }
  ];
  for (const satz of liste) {
    await seite.fill('#feld-titel', satz.titel);
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Navigation');
    await seite.fill('#feld-begriffe', 'vorlage');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(150);
    if (!satz.rolle) continue;
    await seite.click('#letzte-editor');
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden, null, { timeout: 8000 });
    await seite.fill('#markier-stelle', satz.stelle);
    await seite.evaluate(() => {
      document.getElementById('markier-labels').open = true;
    });
    await seite.selectOption('#label-rolle_label', satz.rolle);
    await seite.waitForTimeout(150);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(250);
    await seite.click('.portal-nav button[data-ansicht="aufnahme"]');
    await seite.waitForTimeout(120);
  }
}

/** Öffnet das Fenster und stellt eine Frage. */
async function frage(seite, text) {
  const vorher = await seite.locator('.chat-antwort').count();
  await seite.fill('#chat-frage', text);
  await seite.click('#chat-fragen');
  await seite.waitForFunction(
    (zahl) => document.querySelectorAll('.chat-antwort').length > zahl,
    vorher,
    { timeout: 15000 }
  );
  return seite.locator('.chat-antwort').last();
}

s.test('das Fenster öffnet sich über jeder Ansicht und erklärt sich', () =>
  mitSeite(async (seite) => {
    gleich(await seite.locator('#chat-fenster').isVisible(), false);
    await seite.click('#chat-auf');
    gleich(await seite.locator('#chat-fenster').isVisible(), true);
    gleich(await seite.locator('#chat-auf').getAttribute('aria-expanded'), 'true');
    wahr(
      (await seite.locator('#chat-verlauf').innerText()).includes('Frag nach Bildern'),
      'das leere Fenster bleibt stumm'
    );
    gleich(await seite.locator('.chat-beispiel').count(), 5, 'die Beispiele fehlen');

    // Es liegt über der Ansicht, nicht in ihr: der Wechsel lässt es stehen.
    await seite.click('.portal-nav button[data-ansicht="gliederung"]');
    gleich(await seite.locator('#chat-fenster').isVisible(), true);

    await seite.keyboard.press('Escape');
    gleich(await seite.locator('#chat-fenster').isVisible(), false);
  }));

s.test('eine Frage nach Rolle und Kapitel bringt die passenden Bilder', () =>
  mitSeite(
    async (seite) => {
      await dreiMitLabels(seite);
      await seite.click('#chat-auf');
      const antwort = await frage(seite, 'Bilder von Dealer in Kapitel 6.2');
      const satz = await antwort.locator('.chat-satz').innerText();
      wahr(satz.startsWith('1 von 3 Bildern'), 'die Zählung stimmt nicht: ' + satz);
      wahr(satz.includes('Rolle Dealer'), 'die Deutung wird nicht genannt: ' + satz);
      gleich(await antwort.locator('.chat-treffer').count(), 1);
      wahr(
        (await antwort.locator('.chat-treffer-titel').innerText()).includes('Vorlagenliste'),
        'der falsche Treffer steht da'
      );

      // Kein Treffer bleibt nicht stumm.
      const leer = await frage(seite, 'Bilder auf Koreanisch');
      wahr((await leer.locator('.chat-satz').innerText()).startsWith('Kein Treffer für'));
      gleich(await leer.locator('.chat-treffer').count(), 0);

      // Ohne Stelle findet genau das eine Bild ohne Zuordnung.
      const ohne = await frage(seite, 'alles ohne Stelle');
      gleich(await ohne.locator('.chat-treffer').count(), 1);
    },
    { hash: AUFNAHME }
  ));

s.test('ein Beispiel genügt als Frage', () =>
  mitSeite(
    async (seite) => {
      await dreiMitLabels(seite);
      await seite.click('#chat-auf');
      await seite.locator('.chat-beispiel', { hasText: 'ohne Stelle' }).click();
      await seite.waitForFunction(() => document.querySelectorAll('.chat-antwort').length === 1, null, { timeout: 15000 });
      wahr((await seite.locator('.chat-frage').innerText()).includes('ohne Stelle'));
    },
    { hash: AUFNAHME }
  ));

s.test('ein Treffer führt in den Editor und an die Strecke', () =>
  mitSeite(
    async (seite) => {
      await dreiMitLabels(seite);
      await seite.click('#chat-auf');
      const antwort = await frage(seite, 'Vorlagenliste');
      await antwort.locator('.chat-treffer-knoepfe button', { hasText: '→ Strecke' }).first().click();
      wahr(
        /an die Strecke/.test(await seite.locator('#chat-stand').innerText()),
        'der Weg an die Strecke wird nicht gemeldet'
      );
      const strecken = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:strecken');
        return roh ? JSON.parse(roh).strecken : [];
      });
      gleich(strecken.length, 1, 'ohne offene Strecke entsteht keine');
      gleich(strecken[0].schritte.length, 1);

      await antwort.locator('.chat-treffer-knoepfe button', { hasText: 'Editor' }).first().click();
      await seite.waitForSelector('#markieren-ansicht:not([hidden])');
      gleich(await seite.locator('#chat-fenster').isVisible(), false, 'das Fenster bleibt über dem Editor stehen');
    },
    { hash: AUFNAHME }
  ));

s.test('das Fenster lässt sich ziehen und behält die Lage über das Neuladen', () =>
  mitSeite(
    async (seite) => {
      await seite.click('#chat-auf');
      const griff = await seite.locator('#chat-griff').boundingBox();
      await seite.mouse.move(griff.x + griff.width / 2, griff.y + 8);
      await seite.mouse.down();
      await seite.mouse.move(griff.x + griff.width / 2 + 160, griff.y + 108, { steps: 8 });
      await seite.mouse.up();
      const lage = await seite.evaluate(() => {
        const roh = localStorage.getItem('screenarchiv:chat');
        return roh ? JSON.parse(roh) : null;
      });
      wahr(lage && lage.x > 150, 'die Lage wurde nicht gemerkt: ' + JSON.stringify(lage));
      gleich(lage.offen, true);

      await seite.reload({ waitUntil: 'load' });
      await seite.waitForSelector('html[data-bereit="ja"]');
      gleich(await seite.locator('#chat-fenster').isVisible(), true, 'das Fenster kommt geschlossen zurück');
      const nachher = await seite.evaluate(() => {
        const k = document.getElementById('chat-fenster');
        return { links: parseInt(k.style.left, 10), oben: parseInt(k.style.top, 10) };
      });
      gleich(nachher.links, Math.round(lage.x));
      gleich(nachher.oben, Math.round(lage.y));
    },
    { viewport: { width: 1440, height: 1000 } }
  ));

s.test('Browser wieder schließen', () => schliessen());

export default s;
