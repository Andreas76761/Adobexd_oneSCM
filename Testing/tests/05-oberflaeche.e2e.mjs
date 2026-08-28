/**
 * Browserpruefung der fertigen Seite. Getestet wird dist/index.html in
 * derselben Huelle, die das Artifact beim Veroeffentlichen ergaenzt.
 * Ohne playwright-core oder Chromium werden die Faelle uebersprungen.
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const s = suite('Oberfläche (Browser)');

let chromium = null;
let browser = null;
let adresse = null;

async function bereit() {
  if (browser) return true;
  const start = findeChromium();
  if (!start) return false;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (fehler) {
    return false;
  }
  browser = await chromium.launch({ executablePath: start, args: ['--no-sandbox', '--disable-gpu'] });
  adresse = pathToFileURL(baueVorschau(join(wurzel, 'dist', 'index.html'))).href;
  return true;
}

/** Oeffnet die Seite frisch, sammelt Konsolenfehler und raeumt hinterher auf. */
async function mitSeite(fn, optionen = {}) {
  if (!(await bereit())) return 'uebersprungen';
  const kontext = await browser.newContext({ viewport: optionen.viewport || { width: 1440, height: 960 }, colorScheme: optionen.thema || 'light' });
  const seite = await kontext.newPage();
  const fehlerprotokoll = [];
  seite.on('console', (m) => m.type() === 'error' && fehlerprotokoll.push(m.text()));
  seite.on('pageerror', (e) => fehlerprotokoll.push(String(e)));
  // Schriften werden lokal ersetzt: der Test soll ohne Netz laufen.
  await seite.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  try {
    await seite.goto(adresse + (optionen.hash || ''), { waitUntil: 'domcontentloaded' });
    await seite.waitForSelector('html[data-bereit="ja"]', { timeout: 10000 });
    await fn(seite);
    gleich(fehlerprotokoll.length, 0, 'Fehler in der Browserkonsole: ' + fehlerprotokoll.join(' | '));
  } finally {
    await kontext.close();
  }
  return undefined;
}

const karten = (seite) => seite.locator('.karte').count();

s.test('Grundzustand zeigt die aktiven Belege', () =>
  mitSeite(async (seite) => {
    gleich(await seite.title(), 'Screenarchiv oneSCM');
    gleich(await karten(seite), 16, 'Kartenzahl im Grundzustand');
    gleich(await seite.locator('.kachel-wert').first().innerText(), '16');
    gleich(await seite.locator('.karte--archiviert').count(), 0, 'archivierte Belege in der aktiven Ansicht');
    wahr((await seite.locator('#treffer').innerText()).includes('32 Aufnahmen'), 'Trefferzeile nennt die Aufnahmen nicht');
  }));

s.test('Suche grenzt ein und wirkt auf die Kennzahlen', () =>
  mitSeite(async (seite) => {
    await seite.fill('#suche', 'kontrast');
    await seite.waitForFunction(() => document.querySelectorAll('.karte').length === 2);
    gleich(await karten(seite), 2);
    gleich(await seite.locator('.kachel-wert').first().innerText(), '2', 'Kennzahl folgt der Suche nicht');
    wahr((await seite.locator('#zuruecksetzen').innerText()).includes('(1)'), 'aktiver Filter wird nicht gezählt');
  }));

s.test('Facettenfilter und Zähler stimmen überein', () =>
  mitSeite(async (seite) => {
    const knopf = seite.locator('.facette button[data-wert="Admin-Konsole"]');
    const zahl = Number(await knopf.locator('.zahl').innerText());
    await knopf.click();
    await seite.waitForFunction((n) => document.querySelectorAll('.karte').length === n, zahl);
    gleich(await karten(seite), zahl, 'Trefferzahl weicht vom Facettenzähler ab');
    gleich(await knopf.getAttribute('aria-pressed'), 'true');
    const pfade = await seite.locator('.karte-fuss .pfad').allInnerTexts();
    wahr(pfade.every((p) => p.startsWith('Admin-Konsole')), 'fremdes Projekt in der Trefferliste');
  }));

s.test('Archivansicht zeigt ausschließlich abgelöste Belege', () =>
  mitSeite(async (seite) => {
    await seite.click('.segment button[data-archiv="archiv"]');
    await seite.waitForFunction(() => document.querySelectorAll('.karte').length === 4);
    gleich(await seite.locator('.karte--archiviert').count(), 4, 'Archivbelege nicht als solche gekennzeichnet');
    gleich(await seite.locator('.karte .archivmarke').count(), 4);
  }));

s.test('ergebnislose Suche erklärt sich und lässt sich zurücksetzen', () =>
  mitSeite(async (seite) => {
    await seite.fill('#suche', 'gibtesnicht');
    await seite.waitForSelector('#leermeldung:not([hidden])');
    gleich(await karten(seite), 0);
    await seite.click('#zuruecksetzen');
    await seite.waitForFunction(() => document.querySelectorAll('.karte').length === 16);
    gleich(await seite.inputValue('#suche'), '', 'Suchfeld wurde nicht geleert');
    gleich(await seite.locator('#zuruecksetzen').isHidden(), true);
  }));

s.test('Detailansicht zeigt Vergleich und Begründung', () =>
  mitSeite(async (seite) => {
    await seite.locator('.karte[data-id="SCR-2025-003"]').click();
    await seite.waitForSelector('dialog[open]');
    gleich(await seite.locator('#detail-titel').innerText(), 'Primäraktion im Checkout hervorgehoben');
    // innerText liefert die dargestellte Schreibweise (Versalien aus dem Stil).
    const text = (await seite.locator('#blatt-spalte').innerText()).toLowerCase();
    for (const feld of ['anlass', 'änderung', 'wirkung', 'quelle']) wahr(text.includes(feld), `Begründung ohne "${feld}"`);
    wahr(text.includes('a/b-test chk-19'), 'Quelle fehlt in der Detailansicht');
    gleich(await seite.locator('.buehne svg').count(), 2, 'Vergleich zeigt nicht beide Aufnahmen');
    gleich(await seite.locator('.metrik').count(), 2, 'Kennzahlen fehlen');
    wahr((await seite.locator('.metrik').first().innerText()).includes('%'), 'Wirkung ohne Prozentangabe');
    gleich(await seite.locator('.legende').count(), 1, 'Legende zu den Serienfarben fehlt');
  }));

s.test('Vergleichsarten lassen sich umschalten', () =>
  mitSeite(async (seite) => {
    await seite.locator('.karte').first().click();
    await seite.waitForSelector('dialog[open]');
    await seite.click('.modus button[data-modus="neben"]');
    gleich(await seite.locator('.buehne--neben svg').count(), 2, 'Nebeneinander zeigt nicht beide Aufnahmen');
    await seite.click('.modus button[data-modus="wechsel"]');
    gleich(await seite.locator('.buehne svg').count(), 1, 'Umschalten zeigt mehr als eine Aufnahme');
    await seite.click('.buehne');
    gleich(await seite.locator('.aufnahme-schild--v').count(), 1, 'Klick schaltet nicht auf Vorher um');
    await seite.click('.modus button[data-modus="regler"]');
    gleich(await seite.locator('.regler').count(), 1);
  }));

s.test('Schieberegler verschiebt die Trennkante', () =>
  mitSeite(async (seite) => {
    await seite.locator('.karte').first().click();
    await seite.waitForSelector('dialog[open]');
    await seite.click('.modus button[data-modus="regler"]');
    const vorher = await seite.locator('.buehne').evaluate((n) => n.style.getPropertyValue('--teiler'));
    gleich(vorher, '50%');
    await seite.locator('.regler').fill('20');
    const nachher = await seite.locator('.buehne').evaluate((n) => n.style.getPropertyValue('--teiler'));
    gleich(nachher, '20%', 'Trennkante folgt dem Regler nicht');
  }));

s.test('Blättern und Schließen über die Tastatur', () =>
  mitSeite(async (seite) => {
    await seite.locator('.karte').first().click();
    await seite.waitForSelector('dialog[open]');
    const erster = await seite.locator('#detail-kopf .kennung').first().innerText();
    await seite.locator('.detail-kopf').click({ position: { x: 5, y: 5 } });
    await seite.keyboard.press('ArrowRight');
    const zweiter = await seite.locator('#detail-kopf .kennung').first().innerText();
    wahr(erster !== zweiter, 'Pfeiltaste blättert nicht weiter');
    await seite.keyboard.press('ArrowLeft');
    gleich(await seite.locator('#detail-kopf .kennung').first().innerText(), erster, 'Zurückblättern misslingt');
    await seite.keyboard.press('Escape');
    await seite.waitForSelector('dialog[open]', { state: 'detached' }).catch(() => {});
    gleich(await seite.locator('dialog[open]').count(), 0, 'Dialog bleibt offen');
    gleich(await seite.evaluate(() => document.activeElement.dataset.id), erster, 'Fokus kehrt nicht zur Karte zurück');
  }));

s.test('Adresszeile trägt den Zustand und stellt ihn wieder her', () =>
  mitSeite(async (seite) => {
    await seite.fill('#suche', 'formular');
    await seite.click('.segment button[data-archiv="alle"]');
    await seite.waitForFunction(() => location.hash.includes('a=alle'));
    const hash = await seite.evaluate(() => location.hash);
    wahr(hash.includes('q=formular'), 'Suchbegriff fehlt in der Adresse');
    const treffer = await karten(seite);
    await seite.reload({ waitUntil: 'domcontentloaded' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    gleich(await karten(seite), treffer, 'Zustand geht beim Neuladen verloren');
    gleich(await seite.inputValue('#suche'), 'formular');
  }));

s.test('Verweis auf einen einzelnen Beleg öffnet dessen Detailansicht', () =>
  mitSeite(
    async (seite) => {
      await seite.waitForSelector('dialog[open]');
      gleich(await seite.locator('#detail-titel').innerText(), 'Statusfarben durch Symbole ergänzt');
    },
    { hash: '#id=SCR-2025-006&a=alle' }
  ));

s.test('Tastenkürzel „/" springt in die Suche', () =>
  mitSeite(async (seite) => {
    await seite.keyboard.press('/');
    gleich(await seite.evaluate(() => document.activeElement.id), 'suche');
    await seite.keyboard.type('archiv');
    gleich(await seite.inputValue('#suche'), 'archiv', 'Der Schrägstrich landet im Suchfeld');
  }));

s.test('kein waagerechter Überlauf auf Telefon und Desktop', async () => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }, { width: 1600, height: 900 }]) {
    const ergebnis = await mitSeite(
      async (seite) => {
        const ueberlauf = await seite.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        wahr(ueberlauf <= 1, `bei ${viewport.width} px Breite läuft die Seite um ${ueberlauf} px über`);
      },
      { viewport }
    );
    if (ergebnis === 'uebersprungen') return 'uebersprungen';
  }
  return undefined;
});

s.test('Filterleiste klappt auf dem Telefon zu und lässt sich öffnen', () =>
  mitSeite(
    async (seite) => {
      gleich(await seite.locator('#filterschub').evaluate((n) => n.open), false, 'Filter verdecken auf dem Telefon die Belege');
      gleich(await seite.locator('.facette button').first().isVisible(), false);
      await seite.click('#filterschub-titel');
      gleich(await seite.locator('.facette button').first().isVisible(), true, 'Filter lassen sich nicht öffnen');
      await seite.click('.segment button[data-archiv="archiv"]');
      await seite.waitForFunction(() => document.querySelectorAll('.karte').length === 4);
      wahr((await seite.locator('#filterschub-titel').innerText()).includes('aktiv'), 'Zusammenfassung nennt keine aktiven Filter');
    },
    { viewport: { width: 390, height: 844 } }
  ));

s.test('dunkles Thema bleibt lesbar', () =>
  mitSeite(
    async (seite) => {
      const werte = await seite.evaluate(() => {
        const stil = getComputedStyle(document.body);
        const karte = document.querySelector('.karte h3');
        return { grund: stil.backgroundColor, schrift: stil.color, kartenschrift: getComputedStyle(karte).color };
      });
      const zahlen = (rgb) => rgb.match(/\d+/g).slice(0, 3).map(Number);
      const leuchte = (rgb) => {
        const [r, g, b] = zahlen(rgb).map((k) => {
          const v = k / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      wahr(leuchte(werte.grund) < 0.1, 'Hintergrund ist im dunklen Thema nicht dunkel: ' + werte.grund);
      wahr(leuchte(werte.schrift) > 0.5, 'Schrift ist im dunklen Thema nicht hell: ' + werte.schrift);
      const kontrast = (leuchte(werte.schrift) + 0.05) / (leuchte(werte.grund) + 0.05);
      wahr(kontrast >= 7, `Kontrast im dunklen Thema nur ${kontrast.toFixed(1)}:1`);
    },
    { thema: 'dark' }
  ));

s.test('Browser wieder schließen', async () => {
  if (!browser) return 'uebersprungen';
  await browser.close();
  browser = null;
  return undefined;
});

export default s;
