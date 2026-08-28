/**
 * Screen-Generator: erzeugt deterministische SVG-Mockups von Browser-Oberflaechen.
 *
 * Die Mockups stehen stellvertretend fuer echte Bildschirmaufnahmen. Sie werden
 * bewusst als SVG erzeugt: das Artifact laedt keine externen Bilder (CSP), und
 * SVG bleibt bei 40 Aufnahmen klein genug, um vollstaendig in die Seite zu wandern.
 *
 * Keine IDs, keine Verlaeufe, keine Clip-Pfade - die Mockups werden zu vielen
 * gleichzeitig in dieselbe Seite eingebettet und duerfen sich nicht gegenseitig
 * stoeren.
 */

const SCHRIFT = "'IBM Plex Sans', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const TON = {
  fensterrahmen: '#D8DCE3',
  fensterleiste: '#ECEEF2',
  seite: '#FFFFFF',
  kopf: '#22364F',
  kopfSchrift: '#DDE4EE',
  seitenleiste: '#F4F6F9',
  linie: '#E1E5EB',
  linieStark: '#C6CDD8',
  flaeche: '#F7F8FA',
  akzent: '#2E6BB8',
  akzentHell: '#DCE8F6',
  gut: '#1E7A5A',
  warn: '#8F6410',
  kritisch: '#B03A2E',
  neutral: '#6B7686'
};

const SCHRIFTTON = { niedrig: '#AEB6C2', mittel: '#5C6879', hoch: '#26303F' };
const SCHRIFTTON_LEISE = { niedrig: '#C9CFD8', mittel: '#8F99A8', hoch: '#5C6879' };

const ZEILENHOEHE = { eng: 26, normal: 36, luftig: 48 };

const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const r = (x, y, w, h, fill, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${fill}"${rx ? ` rx="${rx}"` : ''}${extra ? ' ' + extra : ''}/>`;

const t = (x, y, inhalt, o = {}) => {
  const { size = 13, fill = '#26303F', weight = 400, anchor = 'start', family = SCHRIFT, spacing = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ''}>${escape(inhalt)}</text>`;
};

const l = (x1, y1, x2, y2, stroke, w = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`;

const kreis = (cx, cy, rad, fill) => `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"/>`;

/** Status-Marke: Farbe plus optional Symbol und Text (nie Farbe allein). */
function statusMarke(x, y, art, mitSymbol, ton) {
  const karte = {
    gut: { farbe: TON.gut, text: 'freigegeben', zeichen: '✓' },
    warn: { farbe: TON.warn, text: 'in Prüfung', zeichen: '!' },
    kritisch: { farbe: TON.kritisch, text: 'abgelehnt', zeichen: '×' }
  }[art];
  let out = r(x, y - 11, mitSymbol ? 104 : 76, 18, karte.farbe + '22', 9);
  if (mitSymbol) {
    out += kreis(x + 12, y - 2, 6, karte.farbe);
    out += t(x + 12, y + 2, karte.zeichen, { size: 9, fill: '#FFFFFF', anchor: 'middle', weight: 700 });
    out += t(x + 24, y + 3, karte.text, { size: 11, fill: karte.farbe, weight: 500 });
  } else {
    out += kreis(x + 11, y - 2, 5, karte.farbe);
    out += t(x + 22, y + 3, karte.text, { size: 11, fill: ton, weight: 400 });
  }
  return out;
}

function balkenText(x, y, breite, hoehe = 8, ton = '#DDE2E9') {
  return r(x, y, breite, hoehe, ton, 4);
}

/* ---------------------------------------------------------------- Rahmen */

function fensterrahmen(b, h, eintrag) {
  const leiste = 38;
  let s = r(0, 0, b, h, TON.fensterrahmen);
  s += r(0, 0, b, leiste, TON.fensterleiste);
  s += kreis(18, leiste / 2, 5, '#D9534F') + kreis(36, leiste / 2, 5, '#E2A33C') + kreis(54, leiste / 2, 5, '#4FA96B');
  const urlB = Math.min(b - 150, 520);
  s += r(74, 9, urlB, 20, '#FFFFFF', 10);
  s += t(86, 23, 'onescm.example' + eintrag.seite, { size: 11, fill: '#6B7686', family: MONO });
  s += t(b - 16, 23, eintrag.browser, { size: 10, fill: '#95A0AE', anchor: 'end', family: MONO });
  return { svg: s, oben: leiste };
}

function anwendungsrahmen(b, h, oben, opt, mobil) {
  const kopfH = mobil ? 44 : 52;
  const seitenB = mobil ? 0 : b > 1200 ? 200 : 156;
  const ton = SCHRIFTTON[opt.kontrast || 'mittel'];
  const tonLeise = SCHRIFTTON_LEISE[opt.kontrast || 'mittel'];
  let s = r(0, oben, b, h - oben, TON.seite);
  s += r(0, oben, b, kopfH, TON.kopf);
  s += r(20, oben + kopfH / 2 - 8, 16, 16, '#7FA8DC', 4);
  s += t(44, oben + kopfH / 2 + 5, 'oneSCM', { size: 14, fill: TON.kopfSchrift, weight: 600 });
  if (!mobil) {
    ['Übersicht', 'Bestellungen', 'Lieferanten', 'Auswertung'].forEach((n, i) => {
      s += t(140 + i * 104, oben + kopfH / 2 + 5, n, { size: 12, fill: i === 0 ? '#FFFFFF' : '#93A4BC' });
    });
    if (opt.suchfeld) {
      s += r(b - 300, oben + kopfH / 2 - 13, 200, 26, '#33486380', 13);
      s += t(b - 284, oben + kopfH / 2 + 5, '⌕  Nummer, Lieferant, Termin', { size: 11, fill: '#9FB1C8', family: MONO });
    }
  } else {
    s += t(b - 20, oben + kopfH / 2 + 5, '☰', { size: 16, fill: TON.kopfSchrift, anchor: 'end' });
  }
  s += kreis(b - 34, oben + kopfH / 2, 12, '#43608A');
  s += t(b - 34, oben + kopfH / 2 + 4, 'MA', { size: 10, fill: '#D5E1F0', anchor: 'middle', weight: 600 });

  const inhaltOben = oben + kopfH;
  if (seitenB) {
    s += r(0, inhaltOben, seitenB, h - inhaltOben, TON.seitenleiste);
    s += l(seitenB, inhaltOben, seitenB, h, TON.linie);
    const punkte = ['Alle Bestellungen', 'Offene Freigaben', 'Wareneingang', 'Reklamationen', 'Stammdaten'];
    punkte.forEach((n, i) => {
      const y = inhaltOben + 32 + i * 30;
      if (i === 1 && opt.kontrast === 'hoch') {
        s += r(0, y - 15, seitenB, 26, TON.akzentHell);
        s += r(0, y - 15, 3, 26, TON.akzent);
      }
      s += t(16, y + 3, n, { size: 12, fill: i === 1 ? (opt.kontrast === 'hoch' ? '#1B4C86' : tonLeise) : tonLeise });
    });
  }
  return { svg: s, inhaltX: seitenB + (mobil ? 16 : 24), inhaltOben, ton, tonLeise, seitenB };
}

/* ------------------------------------------------------------ Archetypen */

function inhaltUebersicht(ctx) {
  const { x, y, b, h, breite, opt, ton, tonLeise, mobil } = ctx;
  void b;
  let s = '';
  let cy = y + 34;
  const gross = opt.hierarchie;
  s += t(x, cy, 'Übersicht Einkauf', { size: gross ? 22 : 15, fill: ton, weight: gross ? 600 : 500 });
  cy += gross ? 14 : 10;
  s += t(x, cy + 12, 'Stand 30.06.2025 · Werk Nord', { size: 11, fill: tonLeise, family: MONO });
  cy += 34;
  if (opt.hinweis) {
    s += r(x, cy, breite, 32, '#FFF6E5', 6) + r(x, cy, 3, 32, TON.warn);
    s += t(x + 14, cy + 20, opt.hinweis, { size: 12, fill: opt.kontrast === 'hoch' ? '#6B4A05' : tonLeise });
    cy += 46;
  }
  const spalten = mobil ? 1 : opt.spalten && opt.spalten > 1 ? opt.spalten : 4;
  const kb = (breite - (spalten - 1) * 14) / spalten;
  const kh = gross ? 92 : 76;
  const kacheln = [
    ['Offene Freigaben', '47', '+6 zur Vorwoche'],
    ['Termintreue', '92,4 %', '+1,8 Punkte'],
    ['Reklamationen', '12', '−3 zur Vorwoche'],
    ['Bestellwert Monat', '1,84 Mio €', '+4,1 %']
  ];
  kacheln.slice(0, spalten === 1 ? 2 : 4).forEach((k, i) => {
    const kx = x + (i % spalten) * (kb + 14);
    const ky = cy + Math.floor(i / spalten) * (kh + 14);
    const wichtig = gross && i < 3;
    s += r(kx, ky, kb, kh, TON.seite, 8) + rahmen(kx, ky, kb, kh, TON.linie, 8);
    if (opt.skelett) {
      s += balkenText(kx + 14, ky + 18, kb * 0.5, 8);
      s += balkenText(kx + 14, ky + 36, kb * 0.35, 16, '#E7EBF0');
      s += balkenText(kx + 14, ky + 60, kb * 0.4, 7);
    } else {
      s += t(kx + 14, ky + 24, k[0], { size: 11, fill: tonLeise, spacing: 0.3 });
      s += t(kx + 14, ky + (wichtig ? 58 : 52), k[1], { size: wichtig ? 26 : 20, fill: ton, weight: 600, family: MONO });
      s += t(kx + 14, ky + kh - 12, k[2], { size: 10, fill: tonLeise, family: MONO });
    }
  });
  cy += Math.ceil((spalten === 1 ? 2 : 4) / spalten) * (kh + 14) + 18;
  s += t(x, cy + 4, 'Letzte Bewegungen', { size: gross ? 15 : 13, fill: ton, weight: gross ? 600 : 500 });
  cy += 22;
  const zh = ZEILENHOEHE[opt.dichte || 'normal'];
  const zeilen = Math.max(2, Math.floor((h - cy - 24) / zh));
  for (let i = 0; i < zeilen; i++) {
    const zy = cy + i * zh;
    s += l(x, zy, x + breite, zy, TON.linie);
    if (opt.skelett) {
      s += balkenText(x, zy + zh / 2 - 4, 120);
      s += balkenText(x + 180, zy + zh / 2 - 4, 200);
      s += balkenText(x + breite - 90, zy + zh / 2 - 4, 90);
    } else {
      s += t(x, zy + zh / 2 + 4, `BST-2025-${1200 + i}`, { size: 11, fill: ton, family: MONO });
      s += t(x + 180, zy + zh / 2 + 4, ['Hansen Stahl AG', 'Nordform GmbH', 'Vogt & Partner', 'Kesselbau Ost'][i % 4], { size: 12, fill: ton });
      s += t(x + breite, zy + zh / 2 + 4, ['12.480 €', '3.290 €', '27.900 €', '990 €'][i % 4], { size: 11, fill: ton, anchor: 'end', family: MONO });
    }
  }
  return s;
}

function inhaltListe(ctx) {
  const { x, y, h, breite, opt, ton, tonLeise, mobil } = ctx;
  const b = ctx.b;
  let s = '';
  let cy = y + 30;
  s += t(x, cy, 'Bestellungen', { size: 17, fill: ton, weight: 600 });
  cy += 22;
  if (opt.suchfeld) {
    s += r(x, cy - 4, Math.min(breite, 320), 28, TON.flaeche, 6) + rahmen(x, cy - 4, Math.min(breite, 320), 28, TON.linieStark, 6);
    s += t(x + 12, cy + 15, '⌕  Suchen', { size: 12, fill: tonLeise });
    cy += 38;
  }
  ['Alle', 'Offen', 'Freigegeben', 'Verspätet'].forEach((f, i) => {
    const fx = x + i * 86;
    if (fx + 78 > x + breite) return;
    s += r(fx, cy, 78, 24, i === 0 ? TON.akzentHell : TON.flaeche, 12);
    s += t(fx + 39, cy + 16, f, { size: 11, fill: i === 0 ? '#1B4C86' : tonLeise, anchor: 'middle' });
  });
  cy += 38;

  if (opt.leerzustand) {
    const mx = x + breite / 2;
    const my = y + (h - y) / 2;
    s += r(mx - 44, my - 78, 88, 60, TON.flaeche, 8) + rahmen(mx - 44, my - 78, 88, 60, TON.linieStark, 8);
    s += l(mx - 28, my - 58, mx + 28, my - 58, TON.linieStark);
    s += l(mx - 28, my - 44, mx + 8, my - 44, TON.linieStark);
    s += t(mx, my + 2, opt.hinweis ? 'Noch keine Anfragen' : 'Keine Daten', { size: 15, fill: ton, weight: 600, anchor: 'middle' });
    if (opt.hinweis) {
      s += t(mx, my + 24, 'Hier erscheinen Ihre Anfragen an Lieferanten,', { size: 12, fill: tonLeise, anchor: 'middle' });
      s += t(mx, my + 42, 'sobald die erste angelegt ist.', { size: 12, fill: tonLeise, anchor: 'middle' });
      s += r(mx - 82, my + 62, 164, 34, opt.primaer ? TON.akzent : TON.flaeche, 6);
      if (!opt.primaer) s += rahmen(mx - 82, my + 62, 164, 34, TON.linieStark, 6);
      s += t(mx, my + 84, opt.hinweis, { size: 12, fill: opt.primaer ? '#FFFFFF' : tonLeise, anchor: 'middle', weight: 500 });
    }
    return s;
  }

  const spalten = mobil ? 1 : opt.spalten || 1;
  if (spalten > 1) {
    const kb = (breite - (spalten - 1) * 16) / spalten;
    const kh = opt.dichte === 'luftig' ? 132 : 108;
    const reihen = Math.floor((h - cy - 20) / (kh + 16));
    for (let i = 0; i < reihen * spalten; i++) {
      const kx = x + (i % spalten) * (kb + 16);
      const ky = cy + Math.floor(i / spalten) * (kh + 16);
      s += r(kx, ky, kb, kh, TON.seite, 8) + rahmen(kx, ky, kb, kh, TON.linie, 8);
      s += t(kx + 14, ky + 26, `BST-2025-${1200 + i}`, { size: 11, fill: tonLeise, family: MONO });
      s += t(kx + 14, ky + 48, ['Hansen Stahl AG', 'Nordform GmbH', 'Vogt & Partner'][i % 3], { size: 13, fill: ton, weight: 500 });
      s += t(kx + 14, ky + 68, ['Termin 14.07.2025', 'Termin 21.07.2025', 'Termin 02.08.2025'][i % 3], { size: 11, fill: tonLeise, family: MONO });
      s += statusMarke(kx + 14, ky + kh - 18, ['gut', 'warn', 'kritisch'][i % 3], !!opt.symbole, tonLeise);
      s += t(kx + kb - 14, ky + kh - 15, ['12.480 €', '3.290 €', '27.900 €'][i % 3], { size: 12, fill: ton, anchor: 'end', family: MONO });
    }
    return s;
  }

  const kopfH = 30;
  if (opt.sticky) {
    s += r(x - (mobil ? 16 : 24), cy - 8, b, kopfH + 12, '#FFFFFF');
    s += r(x - (mobil ? 16 : 24), cy + kopfH + 3, b, 2, '#00000012');
  }
  const spaltenX = mobil ? [0, 0.62] : [0, 0.24, 0.5, 0.68, 0.86];
  const kopf = mobil ? ['Bestellung', 'Betrag'] : ['Nummer', 'Lieferant', 'Termin', 'Status', 'Betrag'];
  kopf.forEach((k, i) => {
    s += t(x + spaltenX[i] * breite, cy + 18, k, { size: 10, fill: tonLeise, spacing: 0.6, weight: 500, anchor: i === kopf.length - 1 ? 'end' : 'start', family: MONO });
  });
  if (kopf.length) s += l(x, cy + kopfH, x + breite, cy + kopfH, TON.linieStark);
  const zh = ZEILENHOEHE[opt.dichte || 'normal'];
  const zeilen = Math.max(3, Math.floor((h - cy - kopfH - 20) / zh));
  for (let i = 0; i < zeilen; i++) {
    const zy = cy + kopfH + i * zh;
    if (i % 2 === 1 && opt.dichte === 'eng') s += r(x, zy, breite, zh, TON.flaeche);
    const mitte = zy + zh / 2 + 4;
    s += t(x, mitte, `BST-2025-${1200 + i}`, { size: 11, fill: ton, family: MONO });
    if (mobil) {
      s += t(x + breite, mitte, ['12.480 €', '3.290 €', '27.900 €', '990 €'][i % 4], { size: 11, fill: ton, anchor: 'end', family: MONO });
    } else {
      s += t(x + 0.24 * breite, mitte, ['Hansen Stahl AG', 'Nordform GmbH', 'Vogt & Partner', 'Kesselbau Ost'][i % 4], { size: 12, fill: ton });
      s += t(x + 0.5 * breite, mitte, ['14.07.2025', '21.07.2025', '02.08.2025', '09.08.2025'][i % 4], { size: 11, fill: ton, family: MONO });
      s += statusMarke(x + 0.68 * breite, mitte - 4, ['gut', 'warn', 'kritisch'][i % 3], !!opt.symbole, tonLeise);
      s += t(x + breite, mitte, ['12.480 €', '3.290 €', '27.900 €', '990 €'][i % 4], { size: 11, fill: ton, anchor: 'end', family: MONO });
    }
    s += l(x, zy + zh, x + breite, zy + zh, TON.linie);
  }
  return s;
}

function inhaltFormular(ctx) {
  const { x, y, h, breite, opt, ton, tonLeise, mobil } = ctx;
  void ctx.b;
  let s = '';
  let cy = y + 34;
  s += t(x, cy, 'Stammdaten bearbeiten', { size: opt.hierarchie ? 22 : 15, fill: ton, weight: opt.hierarchie ? 600 : 500 });
  cy += opt.hierarchie ? 16 : 10;
  s += t(x, cy + 12, 'Beleg LS-2025-0481 · zuletzt geändert 12.06.2025', { size: 11, fill: tonLeise, family: MONO });
  cy += 36;
  if (opt.hinweis && !opt.fehlerAmFeld) {
    s += r(x, cy, breite, 40, '#FBE9E7', 6) + r(x, cy, 3, 40, TON.kritisch);
    s += t(x + 14, cy + 18, opt.hinweis, { size: 12, fill: '#8C2F22', weight: 600 });
    s += t(x + 14, cy + 33, 'Bitte prüfen Sie Ihre Eingaben.', { size: 11, fill: '#8C2F22' });
    cy += 54;
  }
  const felder = [
    ['Firmenname', 'Hansen Stahl AG', false],
    ['Umsatzsteuer-ID', 'DE 811 —', true],
    ['Straße und Hausnummer', 'Werftstraße 14', false],
    ['Postleitzahl', '2411', true],
    ['Ort', 'Rendsburg', false],
    ['Ansprechperson', 'K. Hansen', false]
  ];
  const fb = mobil ? breite : (breite - 24) / 2;
  const fh = opt.dichte === 'luftig' ? 82 : 70;
  felder.forEach((f, i) => {
    const fx = mobil ? x : x + (i % 2) * (fb + 24);
    const fy = cy + Math.floor(i / (mobil ? 1 : 2)) * fh;
    if (fy + 50 > h) return;
    const fehler = f[2] && opt.fehlerAmFeld;
    s += t(fx, fy + 12, f[0], { size: 11, fill: tonLeise, weight: opt.hierarchie ? 500 : 400 });
    s += r(fx, fy + 20, fb, 30, TON.seite, 5);
    s += rahmen(fx, fy + 20, fb, 30, fehler ? TON.kritisch : TON.linieStark, 5, fehler ? 2 : 1);
    s += t(fx + 12, fy + 40, f[1], { size: 12, fill: ton, family: f[0] === 'Postleitzahl' ? MONO : SCHRIFT });
    if (fehler) {
      s += t(fx, fy + 64, f[0] === 'Postleitzahl' ? 'Fünf Ziffern erwartet, z. B. 24768' : 'Format DE + 9 Ziffern erwartet', { size: 10.5, fill: '#8C2F22' });
    }
  });
  cy += Math.ceil(felder.length / (mobil ? 1 : 2)) * fh + 12;
  if (opt.hinweis && opt.fehlerAmFeld && cy + 44 < h) {
    s += r(x, cy, breite, 38, '#EEF3FA', 6) + r(x, cy, 3, 38, TON.akzent);
    s += t(x + 14, cy + 23, opt.hinweis, { size: 12, fill: '#1B4C86' });
    cy += 50;
  }
  if (cy + 40 < h) {
    s += r(x, cy, 132, 34, TON.akzent, 6);
    s += t(x + 66, cy + 22, 'Speichern', { size: 12, fill: '#FFFFFF', anchor: 'middle', weight: 500 });
    s += r(x + 144, cy, 108, 34, TON.seite, 6) + rahmen(x + 144, cy, 108, 34, TON.linieStark, 6);
    s += t(x + 198, cy + 22, 'Abbrechen', { size: 12, fill: tonLeise, anchor: 'middle' });
  }
  return s;
}

function inhaltCheckout(ctx) {
  const { x, y, b, h, breite, opt, ton, tonLeise, mobil } = ctx;
  let s = '';
  let cy = y + 32;
  s += t(x, cy, 'Zahlung', { size: 18, fill: ton, weight: 600 });
  s += t(x + breite, cy, 'Schritt 3 von 4', { size: 11, fill: tonLeise, anchor: 'end', family: MONO });
  cy += 24;
  const linkeB = mobil ? breite : breite * 0.58;
  if (opt.hinweis) {
    s += r(x, cy, linkeB, 34, '#FBE9E7', 6) + r(x, cy, 3, 34, TON.kritisch);
    s += t(x + 14, cy + 22, opt.hinweis, { size: 12, fill: '#8C2F22', weight: 500 });
    cy += 46;
  }
  ['Rechnung', 'Lastschrift', 'Kreditkarte'].forEach((n, i) => {
    const zy = cy + i * 50;
    if (zy + 44 > h) return;
    s += r(x, zy, linkeB, 44, i === 0 ? '#F3F7FC' : TON.seite, 6);
    s += rahmen(x, zy, linkeB, 44, i === 0 ? TON.akzent : TON.linieStark, 6, i === 0 ? 2 : 1);
    s += kreis(x + 20, zy + 22, 7, TON.seite) + rahmen(x + 13, zy + 15, 14, 14, i === 0 ? TON.akzent : TON.linieStark, 7);
    if (i === 0) s += kreis(x + 20, zy + 22, 4, TON.akzent);
    s += t(x + 38, zy + 27, n, { size: 13, fill: ton });
    if (opt.fehlerAmFeld && i === 1) s += t(x + 38, zy + 40, 'IBAN unvollständig – 22 Zeichen erwartet', { size: 10.5, fill: '#8C2F22' });
  });
  cy += 3 * 50 + 12;
  if (!mobil && !opt.panel) {
    const rx = x + breite * 0.64;
    const rb = breite * 0.36;
    s += r(rx, y + 56, rb, 168, TON.flaeche, 8) + rahmen(rx, y + 56, rb, 168, TON.linie, 8);
    s += t(rx + 16, y + 82, 'Zusammenfassung', { size: 12, fill: ton, weight: 600 });
    [['3 Positionen', '1.204,00 €'], ['Versand', '18,00 €'], ['USt. 19 %', '232,18 €']].forEach((z, i) => {
      s += t(rx + 16, y + 108 + i * 22, z[0], { size: 11, fill: tonLeise });
      s += t(rx + rb - 16, y + 108 + i * 22, z[1], { size: 11, fill: ton, anchor: 'end', family: MONO });
    });
    s += l(rx + 16, y + 186, rx + rb - 16, y + 186, TON.linieStark);
    s += t(rx + 16, y + 208, 'Gesamt', { size: 12, fill: ton, weight: 600 });
    s += t(rx + rb - 16, y + 208, '1.454,18 €', { size: 13, fill: ton, anchor: 'end', weight: 600, family: MONO });
  }
  if (opt.panel) {
    const pb = Math.min(320, breite * 0.42);
    s += r(0, ctx.oben, b, h - ctx.oben, '#0E1A2A55');
    s += r(b - pb, ctx.oben, pb, h - ctx.oben, TON.seite);
    s += l(b - pb, ctx.oben, b - pb, h, TON.linieStark);
    s += t(b - pb + 20, ctx.oben + 36, 'Lieferadresse ändern', { size: 14, fill: ton, weight: 600 });
    ['Firma', 'Straße', 'PLZ', 'Ort'].forEach((f, i) => {
      const fy = ctx.oben + 62 + i * 58;
      s += t(b - pb + 20, fy + 12, f, { size: 11, fill: tonLeise });
      s += r(b - pb + 20, fy + 20, pb - 40, 30, TON.seite, 5) + rahmen(b - pb + 20, fy + 20, pb - 40, 30, TON.linieStark, 5);
    });
  }
  const by = Math.min(h - 56, cy);
  const knoepfe = [['Zurück', false], ['Später zahlen', false], ['Zahlungspflichtig bestellen', true]];
  let bx = x;
  knoepfe.forEach(([n, prim]) => {
    const w = n.length * 7.4 + 28;
    const gefuellt = opt.primaer ? prim : true;
    const farbe = opt.primaer ? (prim ? TON.akzent : TON.seite) : '#E6EAF0';
    s += r(bx, by, w, 36, farbe, 6);
    if (!opt.primaer || !prim) s += rahmen(bx, by, w, 36, TON.linieStark, 6);
    s += t(bx + w / 2, by + 23, n, { size: 12, fill: opt.primaer && prim ? '#FFFFFF' : ton, anchor: 'middle', weight: opt.primaer && prim ? 600 : 400 });
    bx += w + 12;
    void gefuellt;
  });
  return s;
}

function inhaltFehler(ctx) {
  const { x, y, b, h, opt, ton, tonLeise } = ctx;
  const mx = x + (b - x - 24) / 2;
  const my = y + (h - y) / 2 - 40;
  let s = t(mx, my - 30, '404', { size: 64, fill: opt.kontrast === 'hoch' ? TON.akzent : '#C3CAD4', anchor: 'middle', weight: 700, family: MONO });
  s += t(mx, my + 10, 'Diese Seite gibt es nicht mehr.', { size: 17, fill: ton, anchor: 'middle', weight: 600 });
  if (opt.hinweis) {
    s += t(mx, my + 36, 'Aufgerufen: /portal/bestellungen/alt', { size: 11, fill: tonLeise, anchor: 'middle', family: MONO });
    s += r(mx - 190, my + 56, 380, 34, TON.seite, 6) + rahmen(mx - 190, my + 56, 380, 34, TON.linieStark, 6);
    s += t(mx - 174, my + 78, '⌕  Im Portal suchen', { size: 12, fill: tonLeise });
    ['Bestellhistorie', 'Offene Freigaben', 'Wareneingang'].forEach((v, i) => {
      s += t(mx - 190, my + 116 + i * 22, '→  ' + v, { size: 12, fill: TON.akzent });
    });
    s += r(mx - 190, my + 190, 200, 36, opt.primaer ? TON.akzent : TON.flaeche, 6);
    s += t(mx - 90, my + 213, 'Zur Übersicht', { size: 12, fill: opt.primaer ? '#FFFFFF' : ton, anchor: 'middle', weight: 500 });
  } else {
    s += t(mx, my + 36, 'Zurück zur Startseite', { size: 12, fill: tonLeise, anchor: 'middle' });
  }
  return s;
}

function inhaltDiagramm(ctx) {
  const { x, y, b, h, breite, opt, ton, tonLeise } = ctx;
  void b;
  const monate = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug'];
  const menge = [42, 55, 48, 63, 71, 66, 78, 84];
  const dauer = [9.2, 8.7, 9.8, 7.4, 6.9, 7.1, 6.2, 5.8];
  const pfad = (werte, px, py, pw, ph, min, max) =>
    werte.map((w, i) => `${i ? 'L' : 'M'}${(px + (i / (werte.length - 1)) * pw).toFixed(1)},${(py + ph - ((w - min) / (max - min)) * ph).toFixed(1)}`).join(' ');
  const achse = (px, py, pw, ph, titel, beschriftung) => {
    let a = t(px, py - 10, titel, { size: 12, fill: ton, weight: 600 });
    for (let i = 0; i <= 3; i++) a += l(px, py + (i / 3) * ph, px + pw, py + (i / 3) * ph, TON.linie);
    monate.forEach((m, i) => (a += t(px + (i / (monate.length - 1)) * pw, py + ph + 16, m, { size: 10, fill: tonLeise, anchor: 'middle', family: MONO })));
    if (beschriftung) a += t(px + pw, py - 10, beschriftung, { size: 10, fill: tonLeise, anchor: 'end', family: MONO });
    return a;
  };
  let s = t(x, y + 30, 'Auswertung Beschaffung', { size: 17, fill: ton, weight: 600 });
  if (opt.doppelachse) {
    const py = y + 76;
    const ph = h - py - 70;
    s += achse(x + 44, py, breite - 88, ph, 'Bestellmenge und Durchlaufzeit');
    s += `<path d="${pfad(menge, x + 44, py, breite - 88, ph, 30, 90)}" fill="none" stroke="${TON.akzent}" stroke-width="2"/>`;
    s += `<path d="${pfad(dauer, x + 44, py, breite - 88, ph, 5, 10)}" fill="none" stroke="${TON.warn}" stroke-width="2" stroke-dasharray="5 3"/>`;
    for (let i = 0; i <= 3; i++) {
      s += t(x + 36, py + (i / 3) * ph + 4, String(90 - i * 20), { size: 10, fill: tonLeise, anchor: 'end', family: MONO });
      s += t(x + breite - 36, py + (i / 3) * ph + 4, (10 - i * 1.7).toFixed(1), { size: 10, fill: TON.warn, family: MONO });
    }
    s += t(x + 44, y + 56, 'linke Achse: Stück · rechte Achse: Tage', { size: 10.5, fill: tonLeise, family: MONO });
  } else {
    const ph = (h - y - 190) / 2;
    const py1 = y + 74;
    const py2 = py1 + ph + 66;
    s += achse(x + 44, py1, breite - 60, ph, 'Bestellmenge', 'Stück');
    s += `<path d="${pfad(menge, x + 44, py1, breite - 60, ph, 30, 90)}" fill="none" stroke="${TON.akzent}" stroke-width="2"/>`;
    s += kreis(x + 44 + (breite - 60), py1 + ph - ((84 - 30) / 60) * ph, 4, TON.akzent);
    s += t(x + 44 + (breite - 60) - 6, py1 + ph - ((84 - 30) / 60) * ph - 10, '84', { size: 11, fill: ton, anchor: 'end', weight: 600, family: MONO });
    s += achse(x + 44, py2, breite - 60, ph, 'Durchlaufzeit', 'Tage');
    s += `<path d="${pfad(dauer, x + 44, py2, breite - 60, ph, 5, 10)}" fill="none" stroke="${TON.warn}" stroke-width="2"/>`;
    s += kreis(x + 44 + (breite - 60), py2 + ph - ((5.8 - 5) / 5) * ph, 4, TON.warn);
    s += t(x + 44 + (breite - 60) - 6, py2 + ph - ((5.8 - 5) / 5) * ph - 10, '5,8', { size: 11, fill: ton, anchor: 'end', weight: 600, family: MONO });
  }
  return s;
}

const rahmen = (x, y, w, h, stroke, rx = 0, sw = 1) =>
  `<rect x="${x + sw / 2}" y="${y + sw / 2}" width="${Math.max(0, w - sw)}" height="${Math.max(0, h - sw)}" fill="none" stroke="${stroke}" stroke-width="${sw}"${rx ? ` rx="${rx}"` : ''}/>`;

const ARCHETYPEN = {
  uebersicht: inhaltUebersicht,
  liste: inhaltListe,
  formular: inhaltFormular,
  checkout: inhaltCheckout,
  fehler: inhaltFehler,
  diagramm: inhaltDiagramm
};

/**
 * Erzeugt das SVG einer Aufnahme.
 * @param {object} eintrag  Eintrag aus data/eintraege.json
 * @param {'vorher'|'nachher'} variante
 * @param {{breite:number,hoehe:number,label:string}} viewport
 */
export function zeichneScreen(eintrag, variante, viewport) {
  const opt = eintrag.screen[variante];
  const b = viewport.breite;
  const h = viewport.hoehe;
  const mobil = b < 500;
  const fenster = fensterrahmen(b, h, eintrag);
  const app = anwendungsrahmen(b, h, fenster.oben, opt, mobil);
  const zeichner = ARCHETYPEN[eintrag.screen.archetyp];
  if (!zeichner) throw new Error(`Unbekannter Archetyp: ${eintrag.screen.archetyp}`);
  const inhalt = zeichner({
    x: app.inhaltX,
    y: app.inhaltOben,
    oben: app.inhaltOben,
    b,
    h,
    breite: b - app.inhaltX - (mobil ? 16 : 24),
    opt,
    ton: app.ton,
    tonLeise: app.tonLeise,
    mobil
  });
  const titel = `${eintrag.titel} – Aufnahme ${variante}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${b} ${h}" width="${b}" height="${h}" role="img" aria-label="${escape(titel)}">`,
    `<title>${escape(titel)}</title>`,
    fenster.svg,
    app.svg,
    inhalt,
    '</svg>'
  ].join('');
}

export const ARCHETYP_NAMEN = Object.keys(ARCHETYPEN);
