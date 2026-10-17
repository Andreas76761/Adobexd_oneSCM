#!/usr/bin/env node
/**
 * Sichtprüfung: legt Bildschirmaufnahmen der fertigen Seite ab.
 * Automatisch prüfbar ist nur, was eindeutig entscheidbar ist - das Aussehen
 * selbst wird angesehen.
 *
 *   node Testing/schuss.mjs [Zielordner]     (Vorgabe: Testing/berichte)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { baueVorschau, findeChromium } from './hilfen/seite.mjs';

const wurzel = join(import.meta.dirname, '..');
const ziel = process.argv[2] || join(wurzel, 'Testing', 'berichte');
mkdirSync(ziel, { recursive: true });

const start = findeChromium();
if (!start) {
  console.error('Kein Chromium gefunden – CHROMIUM_PFAD setzen.');
  process.exit(1);
}
const { chromium } = await import('playwright-core');
const adresse = pathToFileURL(baueVorschau(join(wurzel, 'dist', 'index.html'))).href;
const browser = await chromium.launch({ executablePath: start, args: ['--no-sandbox'] });

/** Nimmt im Studio zwei Bilder auf, damit der Eingang nicht leer aussieht. */
async function fuelleEingang(seite) {
  await seite.click('#quelle-beispiel');
  await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled);
  const reihe = [
    ['Sekundärnavigation ohne Kontrast', 'oneSCM Portal', 'Barrierefreiheit', 'kontrast, navigation'],
    ['Bestellliste als Kachelraster', 'oneSCM Portal', '', '']
  ];
  for (const [titel, projekt, kategorie, begriffe] of reihe) {
    await seite.fill('#feld-titel', titel);
    await seite.fill('#feld-projekt', projekt);
    await seite.selectOption('#feld-kategorie', kategorie);
    await seite.fill('#feld-begriffe', begriffe);
    await seite.click('.preset button[data-preset="tablet"]');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(200);
  }
}

const ansichten = [
  { name: 'liste-hell', optionen: {} },
  { name: 'liste-dunkel', optionen: { thema: 'dark' } },
  { name: 'detail-regler', optionen: { hash: '#id=SCR-2025-004&a=alle' } },
  { name: 'detail-dunkel', optionen: { hash: '#id=SCR-2025-009&a=alle', thema: 'dark' } },
  { name: 'telefon', optionen: { viewport: { width: 390, height: 844 } } },
  { name: 'aufnahme', optionen: { hash: '#ans=aufnahme' }, vorher: fuelleEingang },
  { name: 'aufnahme-dunkel', optionen: { hash: '#ans=aufnahme', thema: 'dark' }, vorher: fuelleEingang },
  {
    name: 'eingang',
    optionen: { hash: '#ans=aufnahme' },
    vorher: async (seite) => {
      await fuelleEingang(seite);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.waitForTimeout(200);
    }
  },
  {
    name: 'eingang-nachpflege',
    optionen: { hash: '#ans=aufnahme' },
    vorher: async (seite) => {
      await fuelleEingang(seite);
      await seite.click('.portal-nav button[data-ansicht="eingang"]');
      await seite.locator('.eingang-karte').first().click();
      await seite.waitForSelector('#eingang-dialog[open]');
      await seite.waitForTimeout(200);
    }
  }
];

for (const { name, optionen, vorher } of ansichten) {
  const kontext = await browser.newContext({
    viewport: optionen.viewport || { width: 1500, height: 1000 },
    colorScheme: optionen.thema || 'light'
  });
  const seite = await kontext.newPage();
  await seite.goto(adresse + (optionen.hash || ''), { waitUntil: 'load' });
  await seite.waitForSelector('html[data-bereit="ja"]');
  await seite.waitForTimeout(600);
  if (vorher) await vorher(seite);
  await seite.screenshot({ path: join(ziel, name + '.png') });
  await kontext.close();
  console.log(`${name}.png`);
}

/* Kompakter Aufnahmemodus. Die Bildschirmfreigabe wird durch einen
   Leinwand-Datenstrom nachgestellt - anders ist sie nicht zu zeigen. */
const geteilterBildschirm = `
    const leinwand = document.createElement('canvas');
    leinwand.width = 1600; leinwand.height = 900;
    const stift = leinwand.getContext('2d');
    const male = () => {
      stift.fillStyle = '#eef1f5'; stift.fillRect(0, 0, 1600, 900);
      stift.fillStyle = '#22364f'; stift.fillRect(0, 0, 1600, 64);
      stift.fillStyle = '#ffffff'; stift.font = '600 22px sans-serif';
      stift.fillText('Geteilter Bildschirm – Positionsliste', 28, 40);
      stift.fillStyle = '#ffffff'; stift.fillRect(40, 100, 1520, 760);
      stift.strokeStyle = '#d6dbe4';
      for (let i = 0; i < 18; i++) { stift.beginPath(); stift.moveTo(60, 150 + i * 40); stift.lineTo(1540, 150 + i * 40); stift.stroke(); }
      for (let i = 0; i < 8; i++) { stift.beginPath(); stift.moveTo(60 + i * 190, 130); stift.lineTo(60 + i * 190, 840); stift.stroke(); }
      stift.fillStyle = '#4a5769'; stift.font = '13px monospace';
      for (let z = 0; z < 17; z++) for (let sp = 0; sp < 7; sp++)
        stift.fillText(String(1200 + z * 7 + sp), 74 + sp * 190, 175 + z * 40);
    };
    male(); setInterval(male, 200);
    window.__strom = leinwand.captureStream(10);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true, value: { getDisplayMedia: async () => window.__strom }
    });`;

{
  for (const [name, thema] of [['kompakt', 'light'], ['kompakt-dunkel', 'dark']]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 940 }, colorScheme: thema });
    await kontext.addInitScript(geteilterBildschirm);
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.click('#quelle-bildschirm');
    await seite.waitForFunction(() => document.body.classList.contains('kompakt'));
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.fill('#feld-titel', 'Positionsliste ohne Spaltenbreite');
    await seite.selectOption('#feld-kategorie', 'Layout');
    await seite.fill('#feld-begriffe', 'tabelle, spalten');
    await seite.click('.preset button[data-preset="desktop"]');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(800);
    await seite.screenshot({ path: join(ziel, name + '.png') });
    console.log(name + '.png');
    await kontext.close();
  }
}

/* Ausschneiden: Freigabe und Ordnerwahl nachgestellt, Zug im Gange. */
{
  const umgebung = geteilterBildschirm + `
    window.__geschrieben = [];
    window.showDirectoryPicker = async () => ({
      name: 'Bildschirmfotos', queryPermission: async () => 'granted',
      getFileHandle: async (name) => ({ createWritable: async () => ({
        write: async (b) => window.__geschrieben.push({ name, groesse: b.size }), close: async () => {} }) })
    });`;
  for (const [name, thema, imZug] of [['ausschneiden', 'light', true], ['ausschneiden-dunkel', 'dark', false]]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 980 }, colorScheme: thema });
    await kontext.addInitScript(umgebung);
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=ausschneiden', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.fill('#ablage-muster', 'reklamation-{nummer}-{datum}');
    await seite.click('#ordner-waehlen');
    await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked);
    if (imZug) await seite.click('#faehigkeiten summary');
    await seite.click('#schnipsel-start');
    await seite.waitForSelector('#schnipsel-leinwand:not([hidden])');
    await seite.waitForTimeout(400);
    const masse = await seite.locator('#schnipsel-leinwand').boundingBox();
    await seite.mouse.move(masse.x + masse.width * 0.08, masse.y + masse.height * 0.22);
    await seite.mouse.down();
    await seite.mouse.move(masse.x + masse.width * 0.72, masse.y + masse.height * 0.72, { steps: 20 });
    if (imZug) {
      await seite.waitForTimeout(300);
      await seite.screenshot({ path: join(ziel, name + '.png') });
      await seite.mouse.up();
    } else {
      await seite.mouse.up();
      await seite.waitForTimeout(900);
      await seite.screenshot({ path: join(ziel, name + '.png') });
    }
    console.log(name + '.png');
    await kontext.close();
  }
}

/* Markieren: eine Stelle abgedeckt, zwei Schritte einer Klickstrecke. */
{
  for (const [name, thema] of [['markieren', 'light'], ['markieren-dunkel', 'dark']]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 1050 }, colorScheme: thema });
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.click('#quelle-beispiel');
    await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled);
    await seite.fill('#feld-titel', 'Bestellübersicht mit Kundendaten');
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Formular');
    await seite.fill('#feld-begriffe', 'kundendaten, freigabe');
    await seite.click('#ausloesen');
    await seite.waitForTimeout(200);
    await seite.click('.portal-nav button[data-ansicht="markieren"]');
    await seite.waitForSelector('#markieren-ansicht:not([hidden])');
    const auswahl = await seite.locator('#markier-wahl option').nth(1).getAttribute('value');
    await seite.selectOption('#markier-wahl', auswahl);
    await seite.waitForFunction(() => !document.getElementById('markier-leinwand').hidden);
    const masse = await seite.locator('#markier-leinwand').boundingBox();
    const ziehe = async (x1, y1, x2, y2) => {
      await seite.mouse.move(masse.x + x1, masse.y + y1);
      await seite.mouse.down();
      await seite.mouse.move(masse.x + x2, masse.y + y2, { steps: 12 });
      await seite.mouse.up();
      await seite.waitForTimeout(150);
    };
    await ziehe(60, 78, 300, 112);
    await seite.click('#markier-werkzeuge button[data-werkzeug="schritt"]');
    await ziehe(330, 196, 540, 248);
    let zeile = await seite.locator('.marke-zeile').last().getAttribute('data-marke');
    await seite.fill('#marke-text-' + zeile, 'Auf „Bestellung anlegen“ klicken');
    await ziehe(120, 300, 320, 348);
    zeile = await seite.locator('.marke-zeile').last().getAttribute('data-marke');
    await seite.fill('#marke-text-' + zeile, 'Lieferant auswählen');
    await seite.fill('#markier-kapitel', '2');
    await seite.fill('#markier-unterkapitel', '3');
    await seite.waitForTimeout(200);
    await seite.click('#markier-sichern');
    await seite.waitForTimeout(400);
    await seite.screenshot({ path: join(ziel, name + '.png') });
    console.log(name + '.png');
    await kontext.close();
  }
}

/* Die Werkbank: zwei Aufnahmen, Begruendung, Kennzahl - ein Belegentwurf. */
{
  for (const [name, thema] of [['werkbank', 'light'], ['werkbank-dunkel', 'dark']]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 1200 }, colorScheme: thema });
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.click('#quelle-beispiel');
    await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled);
    for (const [titel, datum] of [
      ['Sekundärnavigation vorher', '2026-02-01'],
      ['Sekundärnavigation nachher', '2026-03-01']
    ]) {
      await seite.fill('#feld-titel', titel);
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.fill('#feld-seite', '/portal/uebersicht');
      await seite.fill('#feld-datum', datum);
      await seite.selectOption('#feld-kategorie', 'Barrierefreiheit');
      await seite.fill('#feld-begriffe', 'kontrast, navigation');
      await seite.click('#ausloesen');
      await seite.waitForTimeout(150);
    }
    await seite.click('.portal-nav button[data-ansicht="eingang"]');
    await seite.click('#beleg-oeffnen');
    await seite.waitForSelector('#beleg-werkbank:not([hidden])');
    await seite.fill('#beleg-feld-titel', 'Kontrast der Sekundärnavigation angehoben');
    await seite.selectOption('#beleg-feld-viewport', 'desktop');
    await seite.fill('#beleg-feld-autor', 'M. Ackermann');
    await seite.fill(
      '#beleg-feld-anlass',
      'Im Barrierefreiheits-Audit fiel die Sekundärnavigation mit 2,8:1 durch; WCAG 2.2 AA verlangt 4,5:1.'
    );
    await seite.fill(
      '#beleg-feld-aenderung',
      'Textfarbe von Hellgrau auf dunkles Blaugrau gesetzt, aktiver Eintrag mit Markierungsleiste.'
    );
    await seite.fill(
      '#beleg-feld-wirkung',
      'Kontrastverhältnis auf 5,1:1 angehoben, die Suche nach dem aktiven Bereich dauert kürzer.'
    );
    await seite.fill('#beleg-feld-quelle', 'Audit Barrierefreiheit Q1/2026, Befund A-14');
    await seite.fill('#beleg-metrik-name-1', 'Kontrastverhältnis');
    await seite.fill('#beleg-metrik-einheit-1', ':1');
    await seite.fill('#beleg-metrik-vorher-1', '2,8');
    await seite.fill('#beleg-metrik-nachher-1', '5,1');
    await seite.waitForTimeout(300);
    await seite.screenshot({ path: join(ziel, name + '.png') });
    console.log(name + '.png');
    await kontext.close();
  }
}

/* Die Strecke: drei Screens, eine Folge, ein Blatt. */
{
  for (const [name, thema] of [['strecke', 'light'], ['strecke-dunkel', 'dark']]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 1150 }, colorScheme: thema });
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.click('#quelle-beispiel');
    await seite.waitForFunction(() => !document.getElementById('ausloesen').disabled);
    for (const titel of ['Vorlagenliste öffnen', 'Filter setzen', 'Vorlage anlegen']) {
      await seite.fill('#feld-titel', titel);
      await seite.fill('#feld-projekt', 'oneSCM Portal');
      await seite.selectOption('#feld-kategorie', 'Navigation');
      await seite.fill('#feld-begriffe', 'vorlage');
      await seite.click('#ausloesen');
      await seite.waitForTimeout(120);
    }
    await seite.click('.portal-nav button[data-ansicht="strecke"]');
    await seite.waitForSelector('#strecke-ansicht:not([hidden])');
    await seite.click('#strecke-neu');
    await seite.fill('#strecke-name', 'Vorlage anlegen');
    const texte = [
      'Im Menü „Contract Generation“ öffnen',
      'Market auf Germany filtern',
      'Auf „Create Template“ klicken'
    ];
    for (let i = 0; i < texte.length; i++) {
      const kennung = await seite.locator('#strecke-aufnahme option').nth(i).getAttribute('value');
      await seite.selectOption('#strecke-aufnahme', kennung);
      await seite.click('#strecke-anhaengen');
      await seite.waitForTimeout(120);
      await seite.fill('#schritt-text-' + i, texte[i]);
    }
    await seite.waitForTimeout(900);
    await seite.screenshot({ path: join(ziel, name + '.png') });
    console.log(name + '.png');
    if (name === 'strecke') {
      const blatt = await seite.evaluate(() => document.getElementById('strecke-vorschau').toDataURL('image/png'));
      writeFileSync(join(ziel, 'strecke-blatt.png'), Buffer.from(blatt.split(',')[1], 'base64'));
      console.log('strecke-blatt.png');
    }
    await kontext.close();
  }
}

/* Der Kontaktbogen zum Herunterladen: erzeugen, ablegen, ansehen. */
{
  const kontext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await kontext.addInitScript(`window.__abgelegt = [];
    window.claude = { use: async (n) => n === 'downloads'
      ? { save: async (a) => { window.__abgelegt.push({ filename: a.filename, data: String(a.data) }); return { status: 'saved' }; } }
      : null };`);
  const seite = await kontext.newPage();
  await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
  await seite.waitForSelector('html[data-bereit="ja"]');
  await fuelleEingang(seite);
  await seite.click('.portal-nav button[data-ansicht="eingang"]');
  await seite.click('#eingang-kontaktbogen');
  await seite.waitForFunction(() => (window.__abgelegt || []).length === 1);
  const [datei] = await seite.evaluate(() => window.__abgelegt);
  const bogenPfad = join(ziel, datei.filename);
  writeFileSync(bogenPfad, datei.data, 'utf8');
  console.log(`${datei.filename} (${(datei.data.length / 1024).toFixed(0)} kB)`);

  const ansicht = await kontext.newPage();
  await ansicht.goto(pathToFileURL(bogenPfad).href, { waitUntil: 'load' });
  await ansicht.waitForTimeout(400);
  await ansicht.screenshot({ path: join(ziel, 'kontaktbogen.png'), fullPage: true });
  console.log('kontaktbogen.png');
  await kontext.close();
}

/* Das Ordnerband im Archiv mit geoeffnetem Beipackzettel. */
{
  const umgebung = geteilterBildschirm + `
    window.__inhalt = [];
    const ordner = {
      name: 'Bildschirmfotos', queryPermission: async () => 'granted',
      getFileHandle: async (name) => ({ createWritable: async () => ({
        write: async (b) => window.__inhalt.push({ name, blob: b, zeit: Date.now() + window.__inhalt.length }),
        close: async () => {} }) }),
      values: async function* () {
        for (const e of window.__inhalt) {
          yield { kind: 'file', name: e.name,
            getFile: async () => new File([e.blob], e.name, { type: e.blob.type, lastModified: e.zeit }) };
        }
      }
    };
    window.showDirectoryPicker = async () => ordner;`;
  for (const [name, thema] of [['archiv-zettel', 'light'], ['archiv-zettel-dunkel', 'dark']]) {
    const kontext = await browser.newContext({ viewport: { width: 1500, height: 1040 }, colorScheme: thema });
    await kontext.addInitScript(umgebung);
    const seite = await kontext.newPage();
    await seite.goto(adresse + '#ans=aufnahme', { waitUntil: 'load' });
    await seite.waitForSelector('html[data-bereit="ja"]');
    await seite.fill('#feld-titel', 'Positionsliste ohne Spaltenbreite');
    await seite.fill('#feld-projekt', 'oneSCM Portal');
    await seite.selectOption('#feld-kategorie', 'Layout');
    await seite.fill('#feld-begriffe', 'tabelle, spalten');
    await seite.fill('#feld-notiz', 'Bei 1280 px abgeschnitten');

    await seite.click('.portal-nav button[data-ansicht="ausschneiden"]');
    await seite.fill('#ablage-muster', 'reklamation-{nummer}-{datum}');
    await seite.click('#ordner-waehlen');
    await seite.waitForFunction(() => document.getElementById('ziel-ordner').checked);
    // Nur in den Ordner - so zeigt das Bild die Uebernahme, nicht den Weg
    // zurueck zu einer Aufnahme, die ohnehin schon im Eingang laege.
    await seite.uncheck('#ziel-eingang');
    await seite.click('#schnipsel-start');
    await seite.waitForSelector('#schnipsel-leinwand:not([hidden])');
    await seite.waitForTimeout(400);
    const masse = await seite.locator('#schnipsel-leinwand').boundingBox();
    await seite.mouse.move(masse.x + masse.width * 0.08, masse.y + masse.height * 0.22);
    await seite.mouse.down();
    await seite.mouse.move(masse.x + masse.width * 0.72, masse.y + masse.height * 0.72, { steps: 20 });
    await seite.mouse.up();
    await seite.waitForFunction(() => (window.__inhalt || []).length === 2);

    await seite.click('.portal-nav button[data-ansicht="archiv"]');
    await seite.waitForSelector('#ordner-band:not([hidden])');
    await seite.waitForFunction(() => document.querySelectorAll('#ordner-streifen .streifen-bild').length === 1);
    await seite.click('#ordner-streifen .streifen-bild');
    await seite.waitForSelector('#ordner-zettel:not([hidden])');
    await seite.click('#zettel-uebernehmen');
    await seite.waitForFunction(() => /AUF-/.test(document.getElementById('zettel-meldung').textContent));
    await seite.click('.zettel-roh summary');
    await seite.waitForTimeout(300);
    await seite.screenshot({ path: join(ziel, name + '.png') });
    console.log(name + '.png');
    await kontext.close();
  }
}

await browser.close();
console.log(`\nAufnahmen liegen in ${ziel}`);
