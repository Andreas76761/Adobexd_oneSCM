/**
 * Was die Register tun, wenn Claude **nicht** antwortet.
 *
 * Vier Register fragen Claude über die Fähigkeit `sample`: Suchchat, OCR,
 * Prüfung und Video. Der Vertrag kennt dafür mehrere Ausgänge – die
 * Fähigkeit fehlt, die Anfrage wird abgelehnt, zu viele Anfragen, eine
 * Antwort, die keine ist. Die Prüfungen nehmen bisher nur den guten Fall.
 *
 * Gefragt wird je Register und je Ausgang:
 *   1. Sagt die Seite, was los ist – oder schweigt sie?
 *   2. Ist der Knopf danach wieder offen, oder hängt der Lauf fest?
 *   3. Bleibt die Seite fehlerfrei?
 *
 *   node Testing/messungen/fehlschlag.mjs [ordner mit film.webm]
 *
 * Ohne den Ordner bleibt das Register Video aus: es braucht einen Film,
 * und ohne ihn ist sein Knopf zu Recht gesperrt.
 */
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { baueVorschau, findeChromium } from '../hilfen/seite.mjs';

const hier = dirname(new URL(import.meta.url).pathname);
const adresse = pathToFileURL(baueVorschau(join(hier, '..', '..', 'dist', 'index.html'))).href;
// Das Register Video braucht einen Film; ohne ihn ist sein Knopf zu Recht
// gesperrt und sein Fehlerweg nicht zu fahren.
const filmPfad = process.argv[2] ? join(process.argv[2], 'film.webm') : '';
const film = filmPfad ? [...readFileSync(filmPfad)] : null;

/** Die Ausgänge, die der Vertrag von `sample` kennt. */
const AUSGAENGE = {
  'fehlt (use gibt null)': `window.claude = { use: async () => null };`,
  'abgelehnt (not_granted)': `
    const f = async () => { const e = new Error('nicht erlaubt'); e.code = 'not_granted'; throw e; };
    f.json = f; f.limits = async () => ({ images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
    window.claude = { use: async (n) => (n === 'sample' ? f : null) };`,
  'zu viele (rate_limited)': `
    const f = async () => { const e = new Error('zu viele'); e.code = 'rate_limited'; throw e; };
    f.json = f; f.limits = async () => ({ images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
    window.claude = { use: async (n) => (n === 'sample' ? f : null) };`,
  'gute Antwort': `
    const f = async () => ({ text: 'gut' });
    f.json = async () => ({ sprache: 'en', text: '', nur: [] });
    f.limits = async () => ({ images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
    window.claude = { use: async (n) => (n === 'sample' ? f : null) };`,
  'leere Antwort': `
    const f = async () => ({ text: '' });
    f.json = async () => ({});
    f.limits = async () => ({ images: { maxCount: 4, mediaTypes: ['image/jpeg'] } });
    window.claude = { use: async (n) => (n === 'sample' ? f : null) };`
};

const browser = await chromium.launch({ executablePath: findeChromium(), args: ['--no-sandbox', '--disable-gpu'] });

/** Ein Register unter einem Ausgang; gibt Meldung und Knopfzustand zurück. */
async function probiere(ausgang, name, lauf) {
  const kontext = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await kontext.addInitScript(AUSGAENGE[ausgang]);
  const seite = await kontext.newPage();
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(String(e).slice(0, 120)));
  seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text().slice(0, 120)));
  let zeile = { meldung: '(nichts)', offen: null };
  try {
    zeile = await lauf(seite);
  } catch (f) {
    zeile = { meldung: 'HÄNGT: ' + String(f.message).slice(0, 70), offen: false };
  }
  await kontext.close();
  return { ...zeile, fehler };
}

/** Prüfung: einen Agenten laufen lassen, dann kommentieren lassen. */
async function laufPruefung(seite) {
  await seite.goto(adresse + '#ans=pruefung');
  await seite.waitForSelector('#pruefung-ansicht:not([hidden])');
  await seite.click('#pruef-alle');
  await seite.waitForSelector('[id^="pruef-claude-"]', { timeout: 30000 });
  const knopf = seite.locator('[id^="pruef-claude-"]').first();
  await knopf.click();
  await seite.waitForTimeout(2500);
  return {
    meldung: (await seite.locator('#pruef-meldung').innerText()).trim().slice(0, 130),
    offen: !(await seite.locator('[id^="pruef-claude-"]').first().isDisabled())
  };
}

/** Ein Bild in den Eingang legen - ohne das ist OCR zu Recht gesperrt. */
async function legeBildAn(seite) {
  await seite.goto(adresse + '#ans=aufnahme');
  await seite.waitForSelector('#aufnahme-ansicht:not([hidden])');
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled, null, { timeout: 15000 });
  await seite.fill('#feld-titel', 'Übersicht Einkauf');
  await seite.click('#ausloesen');
  await seite.waitForTimeout(400);
}

/** OCR: ein Bild lesen lassen. */
async function laufOcr(seite) {
  await legeBildAn(seite);
  await seite.click('.portal-nav button[data-ansicht="ocr"]');
  await seite.waitForSelector('#ocr-ansicht:not([hidden])');
  await seite.waitForTimeout(500);
  await seite.click('#ocr-alle');
  await seite.waitForTimeout(300);
  if (await seite.locator('#ocr-lesen').isDisabled()) return { meldung: 'KNOPF GESPERRT – mit Bild falsch', offen: false };
  await seite.click('#ocr-lesen');
  await seite.waitForTimeout(3000);
  return {
    meldung: (await seite.locator('#ocr-meldung').innerText()).trim().slice(0, 130),
    offen: !(await seite.locator('#ocr-lesen').isDisabled())
  };
}

/** Video: einen Film öffnen, ein Bild von Hand nehmen, deuten lassen. */
async function laufVideo(seite) {
  await seite.goto(adresse + '#ans=video');
  await seite.waitForSelector('#video-ansicht:not([hidden])');
  await seite.evaluate((bytes) => {
    const datei = new File([new Uint8Array(bytes)], 'Probe.webm', { type: 'video/webm' });
    const t = new DataTransfer();
    t.items.add(datei);
    const e = document.getElementById('video-eingabe');
    e.files = t.files;
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, film);
  await seite.waitForFunction(() => !document.getElementById('video-leiste').hidden, null, { timeout: 60000 });
  await seite.click('#video-hier');
  await seite.waitForSelector('.video-figur', { timeout: 30000 });
  await seite.waitForTimeout(400);
  if (await seite.locator('#video-deuten').isDisabled()) return { meldung: 'KNOPF GESPERRT – mit Bild falsch', offen: false };
  await seite.click('#video-deuten');
  await seite.waitForTimeout(3000);
  return {
    meldung: (await seite.locator('#video-meldung').innerText()).trim().slice(0, 130),
    offen: !(await seite.locator('#video-deuten').isDisabled())
  };
}

/** Suchchat: eine Frage stellen. */
async function laufChat(seite) {
  await seite.goto(adresse + '#ans=archiv');
  await seite.waitForSelector('.portal-nav');
  await seite.click('#chat-auf');
  await seite.waitForSelector('#chat-fenster:not([hidden])', { timeout: 10000 });
  await seite.fill('#chat-frage', 'Zeig mir die Formulare auf Englisch');
  await seite.click('#chat-fragen');
  await seite.waitForTimeout(2500);
  const texte = await seite.locator('#chat-verlauf > *').allInnerTexts();
  return {
    meldung: (texte[texte.length - 1] || '(nichts)').replace(/\s+/g, ' ').trim().slice(0, 160),
    offen: !(await seite.locator('#chat-fragen').isDisabled())
  };
}

const ergebnisse = [];
for (const ausgang of Object.keys(AUSGAENGE)) {
  for (const [name, lauf] of [
    ['Suchchat', laufChat],
    ['Prüfung', laufPruefung],
    ['OCR', laufOcr],
    ...(film ? [['Video', laufVideo]] : [])
  ]) {
    const r = await probiere(ausgang, name, lauf);
    ergebnisse.push({ ausgang, register: name, ...r });
  }
}

console.log('');
for (const r of ergebnisse) {
  console.log(`${r.register.padEnd(10)} ${r.ausgang.padEnd(24)} offen: ${String(r.offen).padEnd(5)} ${r.meldung}`);
  if (r.fehler.length) console.log(`${''.padEnd(36)}FEHLER: ${[...new Set(r.fehler)].join(' | ')}`);
}
await browser.close();
