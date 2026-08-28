/**
 * Gemeinsame Browserhilfe fuer die Oberflaechenpruefungen.
 * Jede Testdatei bekommt ihren eigenen Browser; fehlt playwright-core oder
 * Chromium, melden die Faelle "uebersprungen" statt zu scheitern.
 */
import { pathToFileURL } from 'node:url';
import { gleich } from './pruefe.mjs';
import { baueVorschau, findeChromium } from './seite.mjs';

export function erzeugeBrowserHelfer(seitenPfad) {
  let browser = null;
  let adresse = null;

  async function bereit() {
    if (browser) return true;
    const start = findeChromium();
    if (!start) return false;
    let chromium;
    try {
      ({ chromium } = await import('playwright-core'));
    } catch (fehler) {
      return false;
    }
    browser = await chromium.launch({ executablePath: start, args: ['--no-sandbox', '--disable-gpu'] });
    adresse = pathToFileURL(baueVorschau(seitenPfad)).href;
    return true;
  }

  /** Oeffnet die Seite frisch, sammelt Konsolenfehler und raeumt hinterher auf. */
  async function mitSeite(fn, optionen = {}) {
    if (!(await bereit())) return 'uebersprungen';
    const kontext = await browser.newContext({
      viewport: optionen.viewport || { width: 1440, height: 960 },
      colorScheme: optionen.thema || 'light'
    });
    if (optionen.initSkript) await kontext.addInitScript(optionen.initSkript);
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

  async function schliessen() {
    if (!browser) return 'uebersprungen';
    await browser.close();
    browser = null;
    return undefined;
  }

  return { mitSeite, schliessen };
}
