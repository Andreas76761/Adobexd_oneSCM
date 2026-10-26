/**
 * Kernlogik des Screen-Archivs: Suche, Filter, Sortierung, Kennzahlen,
 * Wirkungsberechnung und Zustand in der Adresszeile.
 *
 * Dieses Modul kennt kein DOM. Es wird vom Build in die Seite eingebettet und
 * von Testing/tests/*.test.mjs direkt importiert - beide nutzen dieselbe Quelle.
 */

export const STANDARD_ZUSTAND = {
  suche: '',
  projekte: [],
  kategorien: [],
  status: [],
  viewports: [],
  archiv: 'aktiv',
  sortierung: 'datum-neu',
  auswahl: null,
  ansicht: 'archiv'
};

export const ARCHIV_ANSICHTEN = ['aktiv', 'archiv', 'alle'];

/** Hauptansichten der Seite (Navigation oben links). */
export const ANSICHTEN = [
  'archiv',
  'aufnahme',
  'import',
  'video',
  'ausschneiden',
  'markieren',
  'strecke',
  'design',
  'gliederung',
  'pruefung',
  'verzeichnis',
  'output',
  'ocr',
  'eingang'
];

export const SORTIERUNGEN = [
  { id: 'datum-neu', label: 'Neueste zuerst' },
  { id: 'datum-alt', label: 'Älteste zuerst' },
  { id: 'wirkung', label: 'Stärkste Wirkung' },
  { id: 'titel', label: 'Titel A–Z' }
];

/** Status-Art fuer die semantische Farbgebung (getrennt vom Akzent der Seite). */
export const STATUS_ART = {
  'übernommen': 'gut',
  'in Prüfung': 'warn',
  'verworfen': 'neutral'
};

/** Robuste Zuordnung Status -> semantische Art, unabhaengig von der Schreibweise. */
export function statusArt(status) {
  const gesucht = normalisiereLang(status);
  const treffer = Object.keys(STATUS_ART).find((k) => normalisiereLang(k) === gesucht);
  return treffer ? STATUS_ART[treffer] : 'neutral';
}

const AKZENTE = /[̀-ͯ]/g;

/** Kleinschreibung, Umlaute auf Grundbuchstaben, Akzente entfernt. */
export function normalisiere(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(AKZENTE, '')
    .trim();
}

/** Zweite Schreibweise: ae/oe/ue - damit beide Tippweisen treffen. */
export function normalisiereLang(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(AKZENTE, '')
    .trim();
}

/** Durchsuchbarer Text eines Eintrags in beiden Schreibweisen. */
export function suchIndex(eintrag) {
  const roh = [
    eintrag.id,
    eintrag.titel,
    eintrag.projekt,
    eintrag.seite,
    eintrag.kategorie,
    eintrag.status,
    eintrag.autor,
    eintrag.browser,
    eintrag.datum,
    (eintrag.tags || []).join(' '),
    eintrag.begruendung?.anlass,
    eintrag.begruendung?.aenderung,
    eintrag.begruendung?.wirkung,
    eintrag.begruendung?.quelle,
    eintrag.archiv_grund,
    (eintrag.metriken || []).map((m) => m.name).join(' ')
  ]
    .filter(Boolean)
    .join('   ');
  return normalisiere(roh) + '   ' + normalisiereLang(roh);
}

/** Alle Suchbegriffe muessen vorkommen (UND-Verknuepfung). */
export function passtZuSuche(eintrag, suche, index) {
  const begriffe = String(suche || '').split(/\s+/).filter(Boolean);
  if (!begriffe.length) return true;
  const heuhaufen = index || suchIndex(eintrag);
  return begriffe.every((b) => heuhaufen.includes(normalisiere(b)) || heuhaufen.includes(normalisiereLang(b)));
}

const IN = (liste, wert) => !liste || liste.length === 0 || liste.includes(wert);

/**
 * Filtert Eintraege. `ausser` blendet eine Dimension aus - das brauchen die
 * Facettenzaehler, damit die eigene Gruppe nicht ihre Alternativen wegfiltert.
 */
export function filtere(eintraege, zustand, ausser = null) {
  const z = { ...STANDARD_ZUSTAND, ...zustand };
  return eintraege.filter((e) => {
    if (ausser !== 'archiv') {
      if (z.archiv === 'aktiv' && e.archiviert) return false;
      if (z.archiv === 'archiv' && !e.archiviert) return false;
    }
    if (ausser !== 'projekte' && !IN(z.projekte, e.projekt)) return false;
    if (ausser !== 'kategorien' && !IN(z.kategorien, e.kategorie)) return false;
    if (ausser !== 'status' && !IN(z.status, e.status)) return false;
    if (ausser !== 'viewports' && !IN(z.viewports, e.viewport)) return false;
    if (ausser !== 'suche' && !passtZuSuche(e, z.suche, e.__index)) return false;
    return true;
  });
}

/** Relative Verbesserung einer Kennzahl in Prozent; positiv = besser geworden. */
export function verbesserung(metrik) {
  if (!metrik || typeof metrik.vorher !== 'number' || typeof metrik.nachher !== 'number') return null;
  if (metrik.vorher === 0) return null;
  const roh = (metrik.nachher - metrik.vorher) / Math.abs(metrik.vorher);
  const gerichtet = metrik.richtung === 'kleiner_besser' ? -roh : roh;
  return gerichtet * 100;
}

/** Mittlere Wirkung eines Eintrags ueber alle seine Kennzahlen. */
export function mittlereWirkung(eintrag) {
  const werte = (eintrag.metriken || []).map(verbesserung).filter((w) => w !== null);
  if (!werte.length) return null;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}

export function sortiere(eintraege, schluessel = 'datum-neu') {
  const liste = [...eintraege];
  const nachTitel = (a, b) => a.titel.localeCompare(b.titel, 'de');
  switch (schluessel) {
    case 'datum-alt':
      return liste.sort((a, b) => a.datum.localeCompare(b.datum) || nachTitel(a, b));
    case 'titel':
      return liste.sort(nachTitel);
    case 'wirkung':
      return liste.sort((a, b) => {
        const wa = mittlereWirkung(a);
        const wb = mittlereWirkung(b);
        if (wa === null && wb === null) return nachTitel(a, b);
        if (wa === null) return 1;
        if (wb === null) return -1;
        return wb - wa || nachTitel(a, b);
      });
    case 'datum-neu':
    default:
      return liste.sort((a, b) => b.datum.localeCompare(a.datum) || nachTitel(a, b));
  }
}

export function kennzahlen(eintraege) {
  const wirkungen = eintraege.map(mittlereWirkung).filter((w) => w !== null);
  const daten = eintraege.map((e) => e.datum).sort();
  const zaehle = (s) => eintraege.filter((e) => normalisiereLang(e.status) === normalisiereLang(s)).length;
  return {
    anzahl: eintraege.length,
    aufnahmen: eintraege.length * 2,
    uebernommen: zaehle('uebernommen'),
    inPruefung: zaehle('in Pruefung'),
    verworfen: zaehle('verworfen'),
    archiviert: eintraege.filter((e) => e.archiviert).length,
    projekte: new Set(eintraege.map((e) => e.projekt)).size,
    mittlereWirkung: wirkungen.length ? wirkungen.reduce((a, b) => a + b, 0) / wirkungen.length : null,
    von: daten[0] || null,
    bis: daten[daten.length - 1] || null
  };
}

/** Zaehlt je Facettenwert, wie viele Eintraege bei Auswahl uebrig blieben. */
export function facetten(eintraege, zustand, vokabular) {
  const zaehle = (dimension, werteliste, feld) => {
    const grundmenge = filtere(eintraege, zustand, dimension);
    return werteliste.map((wert) => ({
      wert,
      anzahl: grundmenge.filter((e) => e[feld] === wert).length,
      aktiv: (zustand[dimension] || []).includes(wert)
    }));
  };
  return {
    projekte: zaehle('projekte', vokabular.projekte, 'projekt'),
    kategorien: zaehle('kategorien', vokabular.kategorien, 'kategorie'),
    status: zaehle('status', vokabular.status, 'status'),
    viewports: zaehle('viewports', vokabular.viewports.map((v) => v.id), 'viewport').map((f) => ({
      ...f,
      label: vokabular.viewports.find((v) => v.id === f.wert)?.label || f.wert
    }))
  };
}

export function anzahlAktiverFilter(zustand) {
  const z = { ...STANDARD_ZUSTAND, ...zustand };
  return (
    z.projekte.length +
    z.kategorien.length +
    z.status.length +
    z.viewports.length +
    (z.suche ? 1 : 0) +
    (z.archiv !== STANDARD_ZUSTAND.archiv ? 1 : 0)
  );
}

/* ------------------------------------------------- Zustand in der Adresse */

const FELDER = [
  ['suche', 'q'],
  ['projekte', 'p'],
  ['kategorien', 'k'],
  ['status', 's'],
  ['viewports', 'v'],
  ['archiv', 'a'],
  ['sortierung', 'sort'],
  ['auswahl', 'id'],
  ['ansicht', 'ans']
];

export function zustandZuQuery(zustand) {
  const z = { ...STANDARD_ZUSTAND, ...zustand };
  const p = new URLSearchParams();
  for (const [feld, kurz] of FELDER) {
    const wert = z[feld];
    if (Array.isArray(wert)) {
      if (wert.length) p.set(kurz, wert.join('~'));
    } else if (wert && wert !== STANDARD_ZUSTAND[feld]) {
      p.set(kurz, String(wert));
    }
  }
  return p.toString();
}

export function queryZuZustand(query) {
  const p = new URLSearchParams(String(query || '').replace(/^[#?]/, ''));
  const z = { ...STANDARD_ZUSTAND, projekte: [], kategorien: [], status: [], viewports: [] };
  for (const [feld, kurz] of FELDER) {
    if (!p.has(kurz)) continue;
    const roh = p.get(kurz);
    if (Array.isArray(STANDARD_ZUSTAND[feld])) z[feld] = roh.split('~').filter(Boolean);
    else z[feld] = roh;
  }
  if (!ARCHIV_ANSICHTEN.includes(z.archiv)) z.archiv = STANDARD_ZUSTAND.archiv;
  if (!SORTIERUNGEN.some((s) => s.id === z.sortierung)) z.sortierung = STANDARD_ZUSTAND.sortierung;
  if (!ANSICHTEN.includes(z.ansicht)) z.ansicht = STANDARD_ZUSTAND.ansicht;
  return z;
}

/* --------------------------------------------------------- Formatierungen */

export function formatiereDatum(iso) {
  if (!iso) return '–';
  const [j, m, t] = String(iso).split('-');
  return `${t}.${m}.${j}`;
}

export function formatiereZahl(wert, stellen = 1) {
  if (wert === null || wert === undefined || Number.isNaN(wert)) return '–';
  return Number(wert)
    .toFixed(stellen)
    .replace('.', ',')
    .replace(/,0$/, '');
}

export function formatiereWirkung(prozent) {
  if (prozent === null || prozent === undefined) return '–';
  const zeichen = prozent > 0 ? '+' : prozent < 0 ? '−' : '±';
  return `${zeichen}${formatiereZahl(Math.abs(prozent), 1)} %`;
}

/** Vorbereitung der Daten: Suchindex einmalig anhaengen. */
export function bereiteVor(eintraege) {
  return eintraege.map((e) => ({ ...e, __index: suchIndex(e) }));
}

/* =========================================================================
   Aufnahme und Eingang (ab v1.1.0)

   Der Aufnahmemodus haelt einen Ausschnitt einer Quelle fest und legt ihn im
   Eingang ab. Kategorie und Begriffe duerfen fehlen und werden nachtraeglich
   ergaenzt - genau dafuer gibt es die Ansicht "Eingang".
   ========================================================================= */

export const EINGANG_SCHLUESSEL = 'screenarchiv:eingang';
export const EINGANG_VERSION = 2;
export const MINDEST_AUSSCHNITT = 32;
export const HOECHSTZAHL_BEGRIFFE = 12;

export const ROLLEN = [
  { id: 'einzeln', label: 'Einzelaufnahme' },
  { id: 'vorher', label: 'Vorher' },
  { id: 'nachher', label: 'Nachher' }
];

export const EINGANG_SORTIERUNGEN = [
  { id: 'neu', label: 'Zuletzt aufgenommen' },
  { id: 'alt', label: 'Zuerst aufgenommen' },
  { id: 'titel', label: 'Titel A–Z' },
  { id: 'projekt', label: 'Projekt' }
];

export const EINGANG_ZUSTAENDE = [
  { id: 'alle', label: 'Alle' },
  { id: 'offen', label: 'Unvollständig' },
  { id: 'fertig', label: 'Vollständig' }
];

/** Leerer Entwurf; `vorlage` uebernimmt die Angaben der letzten Aufnahme. */
export function leereAufnahme(heute, vorlage = {}) {
  const entwurf = {
    titel: '',
    projekt: vorlage.projekt || '',
    seite: vorlage.seite || '',
    kategorie: vorlage.kategorie || '',
    status: vorlage.status || 'in Prüfung',
    rolle: vorlage.rolle || 'einzeln',
    browser: vorlage.browser || '',
    autor: vorlage.autor || '',
    datum: vorlage.datum || heute,
    begriffe: [...(vorlage.begriffe || [])],
    notiz: '',
    gliederung: String(vorlage.gliederung || ''),
    // Das Projekt ist ein Dreiklang: Name, Version, Land.
    version: String(vorlage.version || ''),
    land: String(vorlage.land || '')
  };
  // Sprache, Rolle, Sparte und Markt gehoeren an die Aufnahme, nicht erst an
  // die Nachpflege: wer eine Reihe aufnimmt, nimmt sie in *einer* Sprache und
  // fuer *eine* Rolle auf. Darum wandern sie aus der Vorlage mit.
  for (const feld of LABEL_FELDER) entwurf[feld.id] = String(vorlage[feld.id] || '');
  return entwurf;
}

/** Fortlaufende Kennung je Jahr: AUF-2025-001 */
export function naechsteAufnahmeKennung(vorhandene, datum) {
  const jahr = String(datum || '').slice(0, 4) || String(new Date().getFullYear());
  const hoechste = (vorhandene || [])
    .map((a) => String(a.id || ''))
    .filter((id) => id.startsWith(`AUF-${jahr}-`))
    .map((id) => Number(id.slice(-3)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `AUF-${jahr}-${String(hoechste + 1).padStart(3, '0')}`;
}

/** Freitext zu einer sauberen Begriffsliste: klein, ohne Rauten, ohne Dubletten. */
export function normalisiereBegriffe(eingabe) {
  const roh = Array.isArray(eingabe) ? eingabe : String(eingabe || '').split(/[,;\n]/);
  const gesehen = new Set();
  const begriffe = [];
  for (const teil of roh) {
    const wort = String(teil)
      .replace(/^\s*#/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .slice(0, 40);
    if (!wort || gesehen.has(wort)) continue;
    gesehen.add(wort);
    begriffe.push(wort);
    if (begriffe.length >= HOECHSTZAHL_BEGRIFFE) break;
  }
  return begriffe;
}

export const begriffeAlsText = (begriffe) => (begriffe || []).join(', ');

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

export function istGueltigesDatum(text) {
  if (!ISO_DATUM.test(String(text || ''))) return false;
  const d = new Date(text + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

/**
 * Prueft, ob ausgeloest werden darf. Titel, Projekt, Kategorie und Begriffe
 * duerfen fehlen - sie werden im Eingang nachgetragen.
 */
export function pruefeEntwurf(entwurf, quelle, ausschnitt, heute) {
  const probleme = [];
  if (!quelle || !quelle.breite || !quelle.hoehe) {
    probleme.push({ feld: 'quelle', text: 'Zuerst eine Quelle wählen: Bildschirmfoto einfügen, ein Bild öffnen, den Bildschirm freigeben oder die Beispielquelle nehmen.' });
  } else if (!ausschnitt || ausschnitt.breite < MINDEST_AUSSCHNITT || ausschnitt.hoehe < MINDEST_AUSSCHNITT) {
    probleme.push({ feld: 'ausschnitt', text: `Der Ausschnitt ist zu klein – mindestens ${MINDEST_AUSSCHNITT} × ${MINDEST_AUSSCHNITT} Bildpunkte.` });
  }
  if (!istGueltigesDatum(entwurf?.datum)) {
    probleme.push({ feld: 'datum', text: 'Datum fehlt oder ist unvollständig (JJJJ-MM-TT).' });
  } else if (heute && entwurf.datum > heute) {
    probleme.push({ feld: 'datum', text: 'Das Datum liegt in der Zukunft.' });
  }
  return probleme;
}

/** Haelt den Ausschnitt innerhalb der Quelle und ueber der Mindestgroesse. */
export function begrenzeAusschnitt(rechteck, quelle, mindest = MINDEST_AUSSCHNITT) {
  const grenzeB = Math.max(mindest, Math.min(quelle.breite, Math.round(rechteck.breite)));
  const grenzeH = Math.max(mindest, Math.min(quelle.hoehe, Math.round(rechteck.hoehe)));
  return {
    x: Math.max(0, Math.min(Math.round(rechteck.x), quelle.breite - grenzeB)),
    y: Math.max(0, Math.min(Math.round(rechteck.y), quelle.hoehe - grenzeH)),
    breite: grenzeB,
    hoehe: grenzeH
  };
}

/**
 * Vorgabeausschnitte: 'voll' nimmt die ganze Quelle, ein Viewport-Bezeichner
 * legt dessen Seitenverhaeltnis mittig auf die Quelle.
 */
export function presetAusschnitt(name, quelle, viewports = []) {
  if (!quelle || !quelle.breite || !quelle.hoehe) return null;
  if (name === 'voll') return { x: 0, y: 0, breite: quelle.breite, hoehe: quelle.hoehe };
  const viewport = viewports.find((v) => v.id === name);
  if (!viewport) return null;
  const massstab = Math.min(quelle.breite / viewport.breite, quelle.hoehe / viewport.hoehe, 1);
  const breite = Math.round(viewport.breite * massstab);
  const hoehe = Math.round(viewport.hoehe * massstab);
  return begrenzeAusschnitt(
    { x: Math.round((quelle.breite - breite) / 2), y: Math.round((quelle.hoehe - hoehe) / 2), breite, hoehe },
    quelle
  );
}

/** Titel bleibt nie leer: ohne Eingabe entsteht ein sprechender Ersatz. */
export function titelVorschlag(entwurf, kennung) {
  const eigener = String(entwurf?.titel || '').trim();
  if (eigener) return eigener;
  const teile = [entwurf?.projekt, entwurf?.seite].map((t) => String(t || '').trim()).filter(Boolean);
  const nummer = String(kennung || '').slice(-3);
  return teile.length ? `${teile.join(' ')} – Aufnahme ${nummer}` : `Aufnahme ${nummer} vom ${formatiereDatum(entwurf?.datum)}`;
}

/** Baut den fertigen Eingangssatz aus Entwurf, Bild und Ausschnitt. */
export function baueAufnahme({ entwurf, bild, ausschnitt, quelle, kennung, erfasstAm }) {
  return {
    id: kennung,
    titel: titelVorschlag(entwurf, kennung),
    projekt: String(entwurf.projekt || '').trim(),
    seite: String(entwurf.seite || '').trim(),
    kategorie: String(entwurf.kategorie || '').trim(),
    status: entwurf.status || 'in Prüfung',
    rolle: entwurf.rolle || 'einzeln',
    browser: String(entwurf.browser || '').trim(),
    autor: String(entwurf.autor || '').trim(),
    datum: entwurf.datum,
    begriffe: normalisiereBegriffe(entwurf.begriffe || []),
    notiz: String(entwurf.notiz || '').trim(),
    ausschnitt: { ...ausschnitt },
    quelle: { art: quelle.art, name: quelle.name || '', breite: quelle.breite, hoehe: quelle.hoehe },
    erfasst_am: erfasstAm,
    bild,
    // Stelle und Labels, soweit schon bekannt - leere Felder bleiben leer.
    ...(String(entwurf.gliederung || '').trim() ? { gliederung: String(entwurf.gliederung).trim() } : {}),
    ...(String(entwurf.version || '').trim() ? { version: String(entwurf.version).trim() } : {}),
    ...(String(entwurf.land || '').trim() ? { land: String(entwurf.land).trim() } : {}),
    ...Object.fromEntries(
      LABEL_FELDER.map((feld) => [feld.id, String(entwurf[feld.id] || '').trim()]).filter(([, wert]) => wert)
    )
  };
}

/** Vollständig heißt: nachträgliche Pflege ist erledigt. */
export function istVollstaendig(aufnahme) {
  return Boolean(
    aufnahme &&
      String(aufnahme.titel || '').trim() &&
      String(aufnahme.projekt || '').trim() &&
      String(aufnahme.kategorie || '').trim() &&
      (aufnahme.begriffe || []).length > 0
  );
}

/**
 * Der Suchtext einer Aufnahme wird je Satz einmal gerechnet und gemerkt. Bei
 * tausend Aufnahmen spart das je Tastendruck tausend Zusammenbauten; weil
 * Aufnahmen beim Aendern ersetzt werden, verfaellt der Merkzettel von selbst.
 */
const SUCHINDEX = new WeakMap();

export function eingangSuchIndex(aufnahme) {
  const gemerkt = aufnahme && typeof aufnahme === 'object' ? SUCHINDEX.get(aufnahme) : undefined;
  if (gemerkt !== undefined) return gemerkt;
  const roh = [
    aufnahme.id,
    aufnahme.titel,
    aufnahme.projekt,
    aufnahme.version,
    aufnahme.land,
    aufnahme.seite,
    aufnahme.kategorie,
    aufnahme.status,
    aufnahme.autor,
    aufnahme.browser,
    aufnahme.datum,
    aufnahme.notiz,
    (aufnahme.begriffe || []).join(' ')
  ]
    .filter(Boolean)
    .join('   ');
  const text = normalisiere(roh) + '   ' + normalisiereLang(roh);
  if (aufnahme && typeof aufnahme === 'object') SUCHINDEX.set(aufnahme, text);
  return text;
}

/**
 * Der Suchtext einer Lesung aus dem Register OCR. Er steht nicht am Bild,
 * sondern daneben - darum ein eigener Merkzettel, der an derselben Stelle
 * verfällt wie die Lesung selbst.
 */
const OCR_SUCHINDEX = new WeakMap();

export function ocrSuchIndex(eintrag) {
  if (!eintrag || typeof eintrag !== 'object') return '';
  const gemerkt = OCR_SUCHINDEX.get(eintrag);
  if (gemerkt !== undefined) return gemerkt;
  const roh = String(eintrag.text || '');
  const text = roh ? normalisiere(roh) + '   ' + normalisiereLang(roh) : '';
  OCR_SUCHINDEX.set(eintrag, text);
  return text;
}

/**
 * Filtert den Eingang. Mit `texte` (den Lesungen aus dem Register OCR)
 * durchsucht die Suche auch, was *im Bild* steht - „Termintreue" findet dann
 * das Bild, auf dem das Wort steht, auch wenn es in keinem Feld vorkommt.
 */
export function filtereEingang(liste, auswahl = {}, texte = null) {
  const { suche = '', kategorien = [], projekte = [], zustand = 'alle' } = auswahl;
  return (liste || []).filter((a) => {
    if (zustand === 'offen' && istVollstaendig(a)) return false;
    if (zustand === 'fertig' && !istVollstaendig(a)) return false;
    if (kategorien.length && !kategorien.includes(a.kategorie)) return false;
    if (projekte.length && !projekte.includes(a.projekt)) return false;
    const lesung = texte && texte[a.id] ? ocrSuchIndex(texte[a.id]) : '';
    if (!passtZuSuche(a, suche, eingangSuchIndex(a) + (lesung ? '   ' + lesung : ''))) return false;
    return true;
  });
}

/** Trifft die Suche nur die Lesung? Dann sagt die Karte, woher der Treffer kommt. */
export function trefferAusLesung(aufnahme, suche, texte = null) {
  const lesung = texte && texte[aufnahme.id] ? ocrSuchIndex(texte[aufnahme.id]) : '';
  if (!lesung || !String(suche || '').trim()) return false;
  return !passtZuSuche(aufnahme, suche, eingangSuchIndex(aufnahme)) &&
    passtZuSuche(aufnahme, suche, eingangSuchIndex(aufnahme) + '   ' + lesung);
}

export function sortiereEingang(liste, schluessel = 'neu') {
  const kopie = [...(liste || [])];
  const nachTitel = (a, b) => String(a.titel).localeCompare(String(b.titel), 'de');
  switch (schluessel) {
    case 'alt':
      return kopie.sort((a, b) => String(a.erfasst_am).localeCompare(String(b.erfasst_am)) || nachTitel(a, b));
    case 'titel':
      return kopie.sort(nachTitel);
    case 'projekt':
      return kopie.sort((a, b) => String(a.projekt).localeCompare(String(b.projekt), 'de') || nachTitel(a, b));
    case 'neu':
    default:
      return kopie.sort((a, b) => String(b.erfasst_am).localeCompare(String(a.erfasst_am)) || nachTitel(a, b));
  }
}

export function eingangKennzahlen(liste) {
  const alle = liste || [];
  const fertig = alle.filter(istVollstaendig).length;
  return {
    anzahl: alle.length,
    fertig,
    offen: alle.length - fertig,
    projekte: new Set(alle.map((a) => a.projekt).filter(Boolean)).size,
    begriffe: new Set(alle.flatMap((a) => a.begriffe || [])).size,
    bytes: schaetzeBytes(alle)
  };
}

export function schaetzeBytes(liste) {
  return (liste || []).reduce((summe, a) => summe + String(a.bild || '').length + 400, 0);
}

export function formatiereBytes(bytes) {
  if (!bytes) return '0 kB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${formatiereZahl(bytes / 1024 / 1024, 1)} MB`;
}

/** Liest den Speicher nachsichtig: kaputte Sätze werden übergangen, nicht geworfen. */
export function leseEingang(text) {
  if (!text) return [];
  let inhalt;
  try {
    inhalt = JSON.parse(text);
  } catch (fehler) {
    return [];
  }
  const liste = Array.isArray(inhalt) ? inhalt : inhalt && Array.isArray(inhalt.aufnahmen) ? inhalt.aufnahmen : [];
  return (
    liste
      // Seit 1.34.0 liegt die Vorschau in der Browserdatenbank, nicht mehr im
      // localStorage: ein Satz *ohne* Bild ist darum gueltig - es kommt gleich
      // nach. Ein Satz mit Bild (aelterer Stand) behaelt es.
      .filter((a) => a && typeof a === 'object' && a.id)
      .filter((a) => a.bild === undefined || a.bild === '' || String(a.bild).startsWith('data:image/'))
      .map((a) => ({
        ...a,
        bild: typeof a.bild === 'string' ? a.bild : '',
        titel: String(a.titel || a.id),
        begriffe: normalisiereBegriffe(a.begriffe || []),
        datum: istGueltigesDatum(a.datum) ? a.datum : String(a.erfasst_am || '').slice(0, 10),
        ausschnitt: a.ausschnitt || { x: 0, y: 0, breite: 0, hoehe: 0 }
      }))
  );
}

/**
 * Schreibt den Eingang **ohne** die Vorschauen: sie liegen in der
 * Browserdatenbank. Eine Vorschau wiegt 37 Kilobyte, die Metadaten einer
 * Aufnahme ein halbes - so reicht derselbe Speicher statt fuer 135 Aufnahmen
 * fuer einige tausend.
 */
export function schreibeEingang(liste) {
  return JSON.stringify({
    version: EINGANG_VERSION,
    vorschauen: 'datenbank',
    aufnahmen: (liste || []).map(({ bild, ...rest }) => rest)
  });
}

/** Die Vorschauen, die neu in die Datenbank gehoeren. */
export function offeneVorschauen(liste = [], schonAbgelegt = new Set()) {
  return liste
    .filter((a) => a && a.id && a.bild && !schonAbgelegt.has(a.id))
    .map((a) => [a.id, a.bild]);
}

/**
 * Ausgabeformat zum Übernehmen in data/eintraege.json.
 * Ohne `mitBildern` bleiben die Bilddaten draußen - dann ist die Ausgabe klein
 * genug, um sie zur Not von Hand aus einem Textfeld zu kopieren.
 */
export function eingangAlsExport(liste, stand, mitBildern = false) {
  return JSON.stringify(
    {
      version: `${EINGANG_VERSION}.0.0`,
      erzeugt: stand,
      anzahl: (liste || []).length,
      mit_bildern: Boolean(mitBildern),
      aufnahmen: (liste || []).map(({ bild, ...rest }) =>
        mitBildern ? { ...rest, bild } : { ...rest, bild_bytes: String(bild || '').length }
      )
    },
    null,
    2
  );
}

/* =========================================================================
   Kontaktbogen (ab v1.2.0)

   Erzeugt aus dem Eingang EINE in sich geschlossene HTML-Datei: alle Bilder
   als Daten-Adresse eingebettet, alle Metadaten daneben, Druckregeln fuer den
   Weg ins PDF. Bewusst ohne jeden externen Verweis - das Blatt soll auch in
   zehn Jahren ohne Netz aufgehen.
   ========================================================================= */

/** Groessengrenze der Ablagefaehigkeit (16 MiB). */
export const HOECHSTGROESSE_DATEI = 16 * 1024 * 1024;

const MASKEN = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Maskiert Freitext fuer die Ausgabe in HTML. */
export function maskiereHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (z) => MASKEN[z]);
}

const KONTAKTBOGEN_STIL = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 32px 28px 60px; background: #fff; color: #14181f;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px; line-height: 1.55;
}
.blatt { max-width: 1100px; margin: 0 auto; }
.kopf { display: flex; gap: 18px; align-items: flex-start; border-bottom: 2px solid #14181f; padding-bottom: 16px; }
.stempel {
  flex: none; width: 52px; height: 52px; display: grid; place-items: center;
  border: 2px solid #b4432b; color: #b4432b; border-radius: 3px; transform: rotate(-4deg);
  font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; letter-spacing: .08em;
}
h1 { margin: 0; font-size: 25px; letter-spacing: -.02em; }
.kopf-zeile { margin-top: 4px; color: #5c6675; font-size: 13px; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.summe { display: flex; flex-wrap: wrap; gap: 10px 26px; margin: 16px 0 6px; font-size: 13px; color: #5c6675; }
.summe b { color: #14181f; font-weight: 600; }
.auswahl { margin: 4px 0 0; font-size: 13px; color: #8a6110; }
.satz {
  display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 22px;
  padding: 22px 0; border-bottom: 1px solid #d6dbe4; page-break-inside: avoid; break-inside: avoid;
}
.satz img { display: block; width: 100%; height: auto; border: 1px solid #d6dbe4; background: #f6f7fa; }
.satz-kopf { display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; }
.kennung { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: #5c6675; }
.offen {
  font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10px; letter-spacing: .06em;
  text-transform: uppercase; background: #f6eedc; color: #8a6110; padding: 2px 7px; border-radius: 2px;
}
h2 { margin: 6px 0 12px; font-size: 17px; line-height: 1.3; }
dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 5px 16px; margin: 0; font-size: 13px; }
dt { color: #5c6675; }
dd { margin: 0; }
.begriffe { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.begriffe span {
  font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px;
  background: #eef0f4; border-radius: 2px; padding: 2px 7px;
}
.notiz { margin-top: 12px; padding-left: 12px; border-left: 3px solid #d6dbe4; color: #4a5769; font-size: 13px; }
.herkunft { margin-top: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #8892a0; }
.leer { padding: 60px 0; text-align: center; color: #5c6675; }
.fuss { margin-top: 26px; font-size: 12px; color: #8892a0; }
@media print {
  body { padding: 0; font-size: 11pt; }
  .satz { padding: 14pt 0; }
  .fuss { position: static; }
  a { text-decoration: none; color: inherit; }
}
@page { margin: 14mm; }
`;

/**
 * Ein Kontaktbogen zeigt die bearbeitete Fassung, wenn es eine gibt - dort
 * sind die personenbezogenen Stellen abgedeckt. Dass es eine Bearbeitung ist,
 * steht dabei: ein stillschweigend verändertes Bild waere unredlich.
 */
function fassungZeile(aufnahme) {
  const juengste = neuesteFassung(aufnahme);
  if (!juengste) return '';
  const z = markenZusammenfassung(juengste.marken);
  const teile = [
    z.unkenntlich ? `${z.unkenntlich} ${z.unkenntlich === 1 ? 'Stelle' : 'Stellen'} abgedeckt` : '',
    z.rahmen ? `${z.rahmen} ${z.rahmen === 1 ? 'Rahmen' : 'Rahmen'}` : '',
    z.schritte ? `${z.schritte} Schritte` : ''
  ].filter(Boolean);
  return `Fassung ${juengste.nummer} – ${teile.join(', ') || 'ohne Marken'}`;
}

function kontaktbogenSatz(aufnahme) {
  const m = maskiereHtml;
  const zeile = (bezeichnung, wert) =>
    wert ? `<dt>${m(bezeichnung)}</dt><dd>${m(wert)}</dd>` : '';
  const rolle = { vorher: 'Vorher', nachher: 'Nachher', einzeln: 'Einzelaufnahme' }[aufnahme.rolle] || aufnahme.rolle;
  const quelle =
    { bildschirm: 'Bildschirm', datei: 'Datei', beispiel: 'Beispiel' }[aufnahme.quelle?.art] || 'Quelle';
  const a = aufnahme.ausschnitt || {};
  return `
      <article class="satz">
        <div><img src="${m(anzeigeBild(aufnahme))}" alt="${m(aufnahme.titel)}"></div>
        <div>
          <div class="satz-kopf">
            <span class="kennung">${m(kapitelKennung(aufnahme) ? `${kapitelKennung(aufnahme)} · ${aufnahme.id}` : aufnahme.id)}</span>
            <span class="kennung">${m(formatiereDatum(aufnahme.datum))}</span>
            ${istVollstaendig(aufnahme) ? '' : '<span class="offen">unvollständig</span>'}
          </div>
          <h2>${m(aufnahme.titel)}</h2>
          <dl>
            ${zeile('Projekt', aufnahme.projekt)}
            ${zeile('Seite', aufnahme.seite)}
            ${zeile('Kategorie', aufnahme.kategorie)}
            ${zeile('Status', aufnahme.status)}
            ${zeile('Rolle', rolle)}
            ${zeile('Erfasst von', aufnahme.autor)}
            ${zeile('Browser', aufnahme.browser)}
            ${zeile('Fassung', fassungZeile(aufnahme))}
          </dl>
          ${
            (aufnahme.begriffe || []).length
              ? `<div class="begriffe">${aufnahme.begriffe.map((b) => `<span>#${m(b)}</span>`).join('')}</div>`
              : ''
          }
          ${aufnahme.notiz ? `<p class="notiz">${m(aufnahme.notiz)}</p>` : ''}
          <p class="herkunft">${m(quelle)}: ${m(aufnahme.quelle?.name || '–')} · Ausschnitt ${m(a.breite)} × ${m(a.hoehe)} bei x ${m(a.x)}, y ${m(a.y)} · erfasst ${m(String(aufnahme.erfasst_am || '').replace('T', ' ').slice(0, 16))}</p>
        </div>
      </article>`;
}

/**
 * Baut den Kontaktbogen als vollständiges HTML-Dokument.
 * @param {Array} aufnahmen  die auszugebenden Aufnahmen (bereits gefiltert)
 * @param {{stand?: string, auswahl?: string, gesamt?: number}} angaben
 */
export function baueKontaktbogen(aufnahmen, angaben = {}) {
  const liste = aufnahmen || [];
  const m = maskiereHtml;
  const k = eingangKennzahlen(liste);
  const stand = angaben.stand || '';
  const titel = `Screenarchiv – Kontaktbogen ${formatiereDatum(stand)}`;
  const auswahlHinweis =
    angaben.auswahl && angaben.gesamt && angaben.gesamt !== liste.length
      ? `<p class="auswahl">Ausschnitt aus dem Eingang: ${m(angaben.auswahl)} – ${liste.length} von ${angaben.gesamt} Aufnahmen.</p>`
      : '';
  const inhalt = liste.length
    ? liste.map(kontaktbogenSatz).join('')
    : '<p class="leer">Keine Aufnahmen in dieser Auswahl.</p>';

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${m(titel)}</title>
<style>${KONTAKTBOGEN_STIL}</style>
</head>
<body>
<div class="blatt">
  <header class="kopf">
    <span class="stempel">SCR</span>
    <div>
      <h1>Kontaktbogen</h1>
      <p class="kopf-zeile">Aufnahmen aus dem Screenarchiv · Stand <span class="mono">${m(formatiereDatum(stand))}</span></p>
    </div>
  </header>
  <p class="summe">
    <span><b>${liste.length}</b> ${liste.length === 1 ? 'Aufnahme' : 'Aufnahmen'}</span>
    <span><b>${k.offen}</b> unvollständig</span>
    <span><b>${k.projekte}</b> ${k.projekte === 1 ? 'Projekt' : 'Projekte'}</span>
    <span><b>${k.begriffe}</b> ${k.begriffe === 1 ? 'Begriff' : 'Begriffe'}</span>
  </p>
  ${auswahlHinweis}
  ${inhalt}
  <p class="fuss">
    Alle Bilder sind in diese Datei eingebettet – sie funktioniert ohne Netzverbindung.
    Zum Ablegen als PDF im Browser drucken (Strg+P / Cmd+P).
  </p>
</div>
</body>
</html>`;
}

/* =========================================================================
   Ablage der Schnipsel (ab v1.7.0)

   Vor dem Ausschneiden wird festgelegt, wohin die Bilder gehen. Drei Ziele
   lassen sich einzeln oder gemeinsam waehlen; welche moeglich sind, entscheidet
   der Browser und die umgebende Ansicht - nicht diese Datei.
   ========================================================================= */

/* ------------------------------------------------- Beleg aus zwei Aufnahmen */

export const BELEGENTWURF_VERSION = 1;
export const MINDEST_BEGRUENDUNG = 20;
export const RICHTUNGEN = [
  { id: 'groesser_besser', label: 'größer ist besser' },
  { id: 'kleiner_besser', label: 'kleiner ist besser' }
];

/** Die naechste freie Belegkennung eines Jahres: SCR-JJJJ-NNN. */
export function naechsteBelegKennung(vorhandene, datum) {
  const jahr = String(datum || '').slice(0, 4) || String(new Date().getFullYear());
  const hoechste = (vorhandene || [])
    .map((e) => String((e && e.id) || e || ''))
    .filter((id) => id.startsWith(`SCR-${jahr}-`))
    .map((id) => Number(id.slice(-3)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `SCR-${jahr}-${String(hoechste + 1).padStart(3, '0')}`;
}

/** Leerer Belegentwurf; was aus den Aufnahmen bekannt ist, steht schon drin. */
export function leererBelegentwurf(vorher = {}, nachher = {}) {
  const nimm = (feld) => String(nachher[feld] || vorher[feld] || '').trim();
  return {
    titel: '',
    projekt: nimm('projekt'),
    seite: nimm('seite'),
    kategorie: nimm('kategorie'),
    status: 'in Prüfung',
    viewport: '',
    browser: nimm('browser'),
    autor: nimm('autor'),
    datum: String(nachher.datum || '').trim(),
    tags: normalisiereBegriffe([...(vorher.begriffe || []), ...(nachher.begriffe || [])]),
    anlass: '',
    aenderung: '',
    wirkung: '',
    quelle: '',
    metriken: [{ name: '', einheit: '', vorher: '', nachher: '', richtung: 'groesser_besser' }]
  };
}

/** Eine Kennzahl ist entweder leer oder vollstaendig - halb gilt nicht. */
function pruefeMetrik(metrik, nummer) {
  const leer = ['name', 'einheit', 'vorher', 'nachher'].every((f) => String(metrik[f] ?? '').trim() === '');
  if (leer) return { leer: true, probleme: [] };
  const probleme = [];
  if (!String(metrik.name || '').trim()) probleme.push({ feld: `metrik-name-${nummer}`, text: `Kennzahl ${nummer}: der Name fehlt.` });
  if (!String(metrik.einheit || '').trim()) probleme.push({ feld: `metrik-einheit-${nummer}`, text: `Kennzahl ${nummer}: die Einheit fehlt.` });
  for (const seite of ['vorher', 'nachher']) {
    const zahl = Number(String(metrik[seite] ?? '').replace(',', '.'));
    if (!Number.isFinite(zahl) || String(metrik[seite] ?? '').trim() === '') {
      probleme.push({ feld: `metrik-${seite}-${nummer}`, text: `Kennzahl ${nummer}: ${seite} ist keine Zahl.` });
    }
  }
  if (!RICHTUNGEN.some((r) => r.id === metrik.richtung)) {
    probleme.push({ feld: `metrik-richtung-${nummer}`, text: `Kennzahl ${nummer}: die Richtung fehlt.` });
  }
  return { leer: false, probleme };
}

/**
 * Prueft einen Belegentwurf so streng wie die Datenpruefung des Bestands -
 * ein Beleg ohne Begruendung ist wertlos, und das soll hier auffallen, nicht
 * erst beim Einpflegen.
 */
export function pruefeBelegentwurf(entwurf = {}, vorher, nachher, vokabular = {}) {
  const probleme = [];
  const melde = (feld, text) => probleme.push({ feld, text });

  if (!vorher || !nachher) melde('paar', 'Ein Beleg braucht zwei Aufnahmen: eine vorher, eine nachher.');
  else if (vorher.id === nachher.id) melde('paar', 'Vorher und nachher dürfen nicht dieselbe Aufnahme sein.');

  if (!String(entwurf.titel || '').trim()) melde('titel', 'Der Titel fehlt.');
  for (const [feld, name] of [['projekt', 'Projekt'], ['seite', 'Seite'], ['kategorie', 'Kategorie']]) {
    if (!String(entwurf[feld] || '').trim()) melde(feld, `${name} fehlt.`);
  }
  for (const [feld, liste, name] of [
    ['projekt', vokabular.projekte, 'Projekt'],
    ['kategorie', vokabular.kategorien, 'Kategorie'],
    ['status', vokabular.status, 'Status']
  ]) {
    const wert = String(entwurf[feld] || '').trim();
    if (wert && Array.isArray(liste) && liste.length && !liste.includes(wert)) {
      melde(feld, `${name} „${wert}“ steht nicht im Vokabular – im Bestand muss es zuerst ergänzt werden.`);
    }
  }
  const viewports = (vokabular.viewports || []).map((v) => v.id || v);
  if (!String(entwurf.viewport || '').trim()) melde('viewport', 'Der Viewport fehlt.');
  else if (viewports.length && !viewports.includes(entwurf.viewport)) melde('viewport', 'Dieser Viewport ist unbekannt.');

  if (!istGueltigesDatum(entwurf.datum)) melde('datum', 'Das Datum fehlt oder ist unvollständig.');
  else if (vorher && nachher && istGueltigesDatum(vorher.datum) && vorher.datum > entwurf.datum) {
    melde('datum', 'Die Vorher-Aufnahme ist jünger als der Beleg – vorher und nachher vertauscht?');
  }
  if (vorher && nachher && istGueltigesDatum(vorher.datum) && istGueltigesDatum(nachher.datum) && vorher.datum > nachher.datum) {
    melde('paar', 'Die Vorher-Aufnahme ist jünger als die Nachher-Aufnahme.');
  }

  if (!normalisiereBegriffe(entwurf.tags || []).length) melde('tags', 'Mindestens ein Schlagwort wird gebraucht.');

  for (const [feld, name] of [
    ['anlass', 'Anlass'],
    ['aenderung', 'Änderung'],
    ['wirkung', 'Wirkung'],
    ['quelle', 'Quelle']
  ]) {
    const wert = String(entwurf[feld] || '').trim();
    if (!wert) melde(feld, `${name} fehlt – ohne Begründung ist ein Beleg wertlos.`);
    else if (feld !== 'quelle' && wert.length < MINDEST_BEGRUENDUNG) {
      melde(feld, `${name} ist zu knapp (mindestens ${MINDEST_BEGRUENDUNG} Zeichen).`);
    }
  }
  if (String(entwurf.status || '') === 'verworfen' && !/verworfen/i.test(String(entwurf.wirkung || ''))) {
    melde('wirkung', 'Bei Status „verworfen“ muss im Wirkungstext stehen, warum die Variante nicht kam.');
  }

  const metriken = entwurf.metriken || [];
  const gefuellt = metriken.filter((m, i) => {
    const ergebnis = pruefeMetrik(m, i + 1);
    probleme.push(...ergebnis.probleme);
    return !ergebnis.leer;
  });
  if (!gefuellt.length) melde('metrik-name-1', 'Mindestens eine Kennzahl mit Wert vorher und nachher wird gebraucht.');

  return probleme;
}

/** Die gefuellten Kennzahlen als Zahlen, in der Form des Bestands. */
export function metrikenAusEntwurf(entwurf = {}) {
  return (entwurf.metriken || [])
    .filter((m) => String(m.name || '').trim() && String(m.vorher ?? '').trim() !== '' && String(m.nachher ?? '').trim() !== '')
    .map((m) => ({
      name: String(m.name).trim(),
      einheit: String(m.einheit || '').trim(),
      vorher: Number(String(m.vorher).replace(',', '.')),
      nachher: Number(String(m.nachher).replace(',', '.')),
      richtung: RICHTUNGEN.some((r) => r.id === m.richtung) ? m.richtung : 'groesser_besser'
    }));
}

/**
 * Baut den Belegentwurf, wie er die Seite verlaesst. Der Eintrag hat die Form
 * des Bestands - bis auf `screen`: die gezeichneten Aufnahmen entstehen im
 * Projekt aus Archetyp und Schaltern, das kann diese Seite nicht wissen. Die
 * beiden echten Bilder liegen daneben und dienen als Vorlage.
 */
export function baueBelegentwurf({ entwurf = {}, vorher, nachher, kennung, anwendung, mitBildern = true }) {
  const alsAufnahme = (a) =>
    a
      ? {
          id: a.id,
          titel: a.titel,
          datum: a.datum,
          erfasst_am: a.erfasst_am,
          ausschnitt: a.ausschnitt ? { ...a.ausschnitt } : null,
          quelle: a.quelle ? { ...a.quelle } : null,
          herkunft: a.herkunft ? { ...a.herkunft } : null,
          bild: mitBildern ? a.bild : undefined
        }
      : null;
  return {
    belegentwurf: BELEGENTWURF_VERSION,
    erzeugt_von: `Screenarchiv ${anwendung || ''}`.trim(),
    erzeugt_am: new Date().toISOString(),
    hinweis:
      'Eintrag für data/eintraege.json. Vor dem Einpflegen fehlt nur screen: ' +
      'Archetyp und Schalter werden im Projekt gesetzt, die beiden Bilder dienen als Vorlage.',
    eintrag: {
      id: kennung,
      titel: String(entwurf.titel || '').trim(),
      projekt: String(entwurf.projekt || '').trim(),
      seite: String(entwurf.seite || '').trim(),
      kategorie: String(entwurf.kategorie || '').trim(),
      status: entwurf.status || 'in Prüfung',
      viewport: entwurf.viewport || '',
      browser: String(entwurf.browser || '').trim(),
      autor: String(entwurf.autor || '').trim(),
      datum: entwurf.datum || '',
      tags: normalisiereBegriffe(entwurf.tags || []),
      begruendung: {
        anlass: String(entwurf.anlass || '').trim(),
        aenderung: String(entwurf.aenderung || '').trim(),
        wirkung: String(entwurf.wirkung || '').trim(),
        quelle: String(entwurf.quelle || '').trim()
      },
      metriken: metrikenAusEntwurf(entwurf),
      archiviert: false,
      archiviert_am: null,
      archiv_grund: null,
      screen: null
    },
    aufnahmen: { vorher: alsAufnahme(vorher), nachher: alsAufnahme(nachher) }
  };
}

export const ABLAGE_SCHLUESSEL = 'screenarchiv:ablage';

export const ABLAGE_STANDARD = {
  eingang: true,
  ordner: false,
  datei: false,
  beipack: true,
  muster: 'screenarchiv-{datum}-{nummer}'
};

export const BEIPACKZETTEL_VERSION = 2; // seit 1.17.0 mit Marken

/**
 * Der Beipackzettel: alle Metadaten neben der Bilddatei, gleicher Name, Endung
 * .json. Ohne ihn traegt eine abgelegte Datei nur, was ins Namensmuster passt.
 * Feste Feldfolge, auch wenn Werte leer sind - so bleibt die Form vorhersagbar.
 */
export function baueBeipackzettel({ entwurf = {}, bildname, ausschnitt, quelle, erfasstAm, anwendung, marken }) {
  const liste = markenAlsAblage(marken || entwurf.marken || []);
  return JSON.stringify(
    {
      beipackzettel: BEIPACKZETTEL_VERSION,
      erzeugt_von: `Screenarchiv ${anwendung || ''}`.trim(),
      bild: bildname || '',
      erfasst_am: erfasstAm || '',
      datum: entwurf.datum || '',
      titel: String(entwurf.titel || '').trim(),
      projekt: String(entwurf.projekt || '').trim(),
      version: String(entwurf.version || '').trim(),
      land: String(entwurf.land || '').trim(),
      seite: String(entwurf.seite || '').trim(),
      kategorie: String(entwurf.kategorie || '').trim(),
      status: entwurf.status || '',
      rolle: entwurf.rolle || '',
      begriffe: normalisiereBegriffe(entwurf.begriffe || []),
      notiz: String(entwurf.notiz || '').trim(),
      autor: String(entwurf.autor || '').trim(),
      browser: String(entwurf.browser || '').trim(),
      ausschnitt: ausschnitt ? { ...ausschnitt } : null,
      quelle: quelle ? { art: quelle.art, name: quelle.name || '', breite: quelle.breite, hoehe: quelle.hoehe } : null,
      // Seit Zettelversion 2: was auf dem Bild liegt. Wurde etwas unkenntlich
      // gemacht, steht das hier - sonst waere der Eingriff spurlos.
      unkenntlich_gemacht: liste.filter((m) => m.art === 'unkenntlich').length,
      marken: liste
    },
    null,
    2
  );
}

/**
 * Feldfolge und Bezeichnungen fuer die Anzeige eines gelesenen Beipackzettels.
 * Gleiche Reihenfolge wie baueBeipackzettel - wer den Zettel in der Datei und
 * in der Anzeige vergleicht, findet die Zeilen an derselben Stelle.
 */
export const BEIPACK_FELDER = [
  ['bild', 'Bild'],
  ['erfasst_am', 'Erfasst am'],
  ['datum', 'Datum'],
  ['titel', 'Titel'],
  ['projekt', 'Projekt'],
  ['version', 'Version'],
  ['land', 'Land'],
  ['seite', 'Seite'],
  ['kategorie', 'Kategorie'],
  ['status', 'Status'],
  ['rolle', 'Rolle'],
  ['begriffe', 'Begriffe'],
  ['notiz', 'Notiz'],
  ['autor', 'Autor'],
  ['browser', 'Browser'],
  ['ausschnitt', 'Ausschnitt'],
  ['quelle', 'Quelle'],
  ['unkenntlich_gemacht', 'Unkenntlich gemacht'],
  ['marken', 'Marken'],
  ['erzeugt_von', 'Erzeugt von']
];

/** Ein Wert des Zettels als Text; zusammengesetzte Felder lesbar gefasst. */
function beipackWert(schluessel, wert) {
  if (wert === null || wert === undefined) return '';
  if (schluessel === 'begriffe') {
    return Array.isArray(wert) ? wert.join(', ') : String(wert).trim();
  }
  if (schluessel === 'ausschnitt') {
    if (typeof wert !== 'object') return String(wert).trim();
    const zahlen = ['breite', 'hoehe', 'x', 'y'].map((feld) => Number(wert[feld]));
    if (!zahlen.every((zahl) => Number.isFinite(zahl))) return '';
    const [breite, hoehe, x, y] = zahlen.map(Math.round);
    return `${breite} \u00d7 ${hoehe} px ab ${x}, ${y}`;
  }
  if (schluessel === 'unkenntlich_gemacht') {
    const zahl = Number(wert);
    if (!Number.isFinite(zahl) || zahl <= 0) return '';
    return `${zahl} ${zahl === 1 ? 'Stelle' : 'Stellen'} abgedeckt`;
  }
  if (schluessel === 'marken') {
    if (!Array.isArray(wert) || !wert.length) return '';
    const z = markenZusammenfassung(wert);
    return [
      z.unkenntlich ? `${z.unkenntlich} unkenntlich` : '',
      z.rahmen ? `${z.rahmen} Rahmen` : '',
      z.schritte ? `${z.schritte} Schritte` : ''
    ]
      .filter(Boolean)
      .join(' \u00b7 ');
  }
  if (schluessel === 'quelle') {
    if (typeof wert !== 'object') return String(wert).trim();
    const name = String(wert.name || '').trim();
    const art = String(wert.art || '').trim();
    const kopf = name && art ? `${name} (${art})` : name || art;
    const breite = Number(wert.breite);
    const hoehe = Number(wert.hoehe);
    const mass =
      Number.isFinite(breite) && Number.isFinite(hoehe) && breite && hoehe
        ? `${Math.round(breite)} \u00d7 ${Math.round(hoehe)} px`
        : '';
    return [kopf, mass].filter(Boolean).join(' \u00b7 ');
  }
  return String(wert).trim();
}

/**
 * Liest einen Beipackzettel zur Anzeige. Der Zettel kommt aus dem Dateisystem
 * und kann von Hand geaendert worden sein - darum wird jeder Fehler benannt
 * statt verschluckt, und fremde Felder werden gemeldet statt verworfen.
 */
export function leseBeipackzettel(text) {
  let daten;
  try {
    daten = JSON.parse(String(text == null ? '' : text));
  } catch (fehler) {
    return { ok: false, grund: 'Die Datei ist kein lesbares JSON.', zeilen: [], fremd: [] };
  }
  if (!daten || typeof daten !== 'object' || Array.isArray(daten)) {
    return { ok: false, grund: 'Die Datei enthaelt kein Objekt mit Feldern.', zeilen: [], fremd: [] };
  }
  const bekannt = BEIPACK_FELDER.map(([schluessel]) => schluessel).concat('beipackzettel');
  const zeilen = BEIPACK_FELDER.map(([schluessel, bezeichnung]) => {
    const wert = beipackWert(schluessel, daten[schluessel]);
    return { schluessel, bezeichnung, wert, leer: wert === '' };
  });
  const version = Number(daten.beipackzettel);
  return {
    ok: true,
    version: Number.isFinite(version) ? version : 0,
    kuenftig: Number.isFinite(version) && version > BEIPACKZETTEL_VERSION,
    fremd: Object.keys(daten).filter((schluessel) => !bekannt.includes(schluessel)),
    zeilen,
    daten
  };
}

/** Gleicher Name wie das Bild, andere Endung. */
export function beipackzettelName(bildname) {
  return String(bildname || '').replace(/\.[a-z0-9]+$/i, '') + '.json';
}

/* ------------------------------------------- Import: ZIP, PDF, Bilder */

/**
 * PPTX, DOCX und XLSX sind ZIP-Archive. Ausgepackt wird mit Bordmitteln:
 * `DecompressionStream('deflate-raw')` kann Deflate, und das ist das
 * Verfahren, das Office verwendet. Eine Fremdbibliothek waere in der
 * Inhaltsrichtlinie des Artifacts ohnehin gesperrt.
 */
const ZIP_ENDE = 0x06054b50;
const ZIP_EINTRAG = 0x02014b50;

function leseU16(bytes, ab) {
  return bytes[ab] | (bytes[ab + 1] << 8);
}
function leseU32(bytes, ab) {
  return (bytes[ab] | (bytes[ab + 1] << 8) | (bytes[ab + 2] << 16) | (bytes[ab + 3] << 24)) >>> 0;
}

/** Das Inhaltsverzeichnis eines ZIP: Name, Verfahren, Lage, Groesse. */
export function leseZipVerzeichnis(bytes) {
  const daten = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  // Das Ende steht hinten und ist hoechstens 64 KiB vom Dateiende entfernt.
  let ende = -1;
  for (let i = daten.length - 22; i >= Math.max(0, daten.length - 66000); i--) {
    if (leseU32(daten, i) === ZIP_ENDE) {
      ende = i;
      break;
    }
  }
  if (ende < 0) return [];
  const anzahl = leseU16(daten, ende + 10);
  let ab = leseU32(daten, ende + 16);
  const eintraege = [];
  for (let i = 0; i < anzahl && ab + 46 <= daten.length; i++) {
    if (leseU32(daten, ab) !== ZIP_EINTRAG) break;
    const verfahren = leseU16(daten, ab + 10);
    const komprimiert = leseU32(daten, ab + 20);
    const roh = leseU32(daten, ab + 24);
    const nameLaenge = leseU16(daten, ab + 28);
    const zusatz = leseU16(daten, ab + 30);
    const kommentar = leseU16(daten, ab + 32);
    const lage = leseU32(daten, ab + 42);
    const name = new TextDecoder('utf-8').decode(daten.subarray(ab + 46, ab + 46 + nameLaenge));
    eintraege.push({ name, verfahren, komprimiert, roh, lage });
    ab += 46 + nameLaenge + zusatz + kommentar;
  }
  return eintraege;
}

/** Packt einen Eintrag aus; nur „gespeichert" und „Deflate" kommen vor. */
export async function entpackeZipEintrag(bytes, eintrag) {
  const daten = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const kopf = eintrag.lage;
  if (leseU32(daten, kopf) !== 0x04034b50) return null;
  const nameLaenge = leseU16(daten, kopf + 26);
  const zusatz = leseU16(daten, kopf + 28);
  const ab = kopf + 30 + nameLaenge + zusatz;
  const roh = daten.subarray(ab, ab + eintrag.komprimiert);
  if (eintrag.verfahren === 0) return roh.slice();
  if (eintrag.verfahren !== 8 || typeof DecompressionStream !== 'function') return null;
  try {
    const strom = new Blob([roh]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(strom).arrayBuffer());
  } catch (fehler) {
    return null;
  }
}

export const BILD_ENDUNGEN = /\.(png|jpe?g|gif|webp|bmp|tiff?|emf|wmf)$/i;

const BILD_TYPEN = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp'
};

export function bildTyp(name) {
  const endung = String(name || '').split('.').pop().toLowerCase();
  return BILD_TYPEN[endung] || '';
}

/**
 * Die Bilder eines Office-Dokuments. PPTX und DOCX legen sie unter
 * `ppt/media/` bzw. `word/media/`; EMF und WMF kommen vor, kann der Browser
 * aber nicht anzeigen - sie werden genannt und uebergangen.
 */
export function officeBilder(eintraege = []) {
  const medien = eintraege.filter((e) => /^(ppt|word|xl)\/media\//i.test(e.name) && BILD_ENDUNGEN.test(e.name));
  const lesbar = medien.filter((e) => bildTyp(e.name));
  return {
    bilder: lesbar.sort((a, b) => natuerlich(a.name, b.name)),
    uebergangen: medien.filter((e) => !bildTyp(e.name)).map((e) => e.name)
  };
}

/** image10 gehoert hinter image9, nicht dazwischen. */
export function natuerlich(a, b) {
  const teileA = String(a).match(/\d+|\D+/g) || [];
  const teileB = String(b).match(/\d+|\D+/g) || [];
  for (let i = 0; i < Math.max(teileA.length, teileB.length); i++) {
    const x = teileA[i] || '';
    const y = teileB[i] || '';
    const beideZahl = /^\d+$/.test(x) && /^\d+$/.test(y);
    const vergleich = beideZahl ? Number(x) - Number(y) : x.localeCompare(y);
    if (vergleich) return vergleich;
  }
  return 0;
}

/** Text aus einer Office-XML: die Textknoten in ihrer Reihenfolge. */
export function officeText(xml) {
  const text = typeof xml === 'string' ? xml : new TextDecoder('utf-8').decode(xml || new Uint8Array());
  // <a:t> in Folien, <w:t> in Word, <t> in Tabellen.
  const stuecke = [...text.matchAll(/<(?:a:|w:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:a:|w:)?t>/g)].map((t) =>
    t[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
  return stuecke.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Die Textträger eines Office-Archivs in ihrer Reihenfolge: bei PPTX die
 * Folien, bei DOCX das eine Dokument, bei XLSX die Zeichenkettentabelle. Zu
 * jedem gehoert die Beziehungsdatei - sie sagt, welche Medien darin stecken
 * und in welcher Reihenfolge. Nur darum laesst sich ein Bild einer Folie
 * zuordnen: im Archiv liegen alle Medien in einem Topf.
 */
export function officeFolien(eintraege = []) {
  const finde = (name) => eintraege.find((e) => String(e.name).toLowerCase() === name) || null;
  const folien = eintraege
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name))
    .sort((a, b) => natuerlich(a.name, b.name));
  if (folien.length) {
    return folien.map((e, i) => ({
      art: 'folie',
      nummer: i + 1,
      name: `Folie ${i + 1}`,
      xml: e,
      rels: finde(String(e.name).toLowerCase().replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels'))
    }));
  }
  // Ein Word-Dokument ist **ein** Traeger, aber kein Foliensatz: wer seine
  // Bilder einzeln braucht, teilt es mit `wordAbschnitte` an den
  // Ueberschriften. Die Art sagt, dass das noetig ist.
  const wort = finde('word/document.xml');
  if (wort) return [{ art: 'wort', nummer: 1, name: 'Dokument', xml: wort, rels: finde('word/_rels/document.xml.rels') }];
  const tabelle = finde('xl/sharedstrings.xml');
  if (tabelle) return [{ art: 'tabelle', nummer: 1, name: 'Tabelle', xml: tabelle, rels: null }];
  return [];
}

/** Die Mediennamen einer Beziehungsdatei - in der Reihenfolge des Traegers. */
export function medienAusRels(xml) {
  const text = typeof xml === 'string' ? xml : new TextDecoder('utf-8').decode(xml || new Uint8Array());
  const namen = [];
  for (const treffer of text.matchAll(/Target="([^"]*media\/[^"]+)"/g)) {
    const name = treffer[1].split('/').pop();
    if (BILD_ENDUNGEN.test(name) && !namen.includes(name)) namen.push(name);
  }
  return namen;
}

/**
 * Ein Word-Dokument in Abschnitte: jede Überschrift beginnt einen, die
 * Absätze und Bilder darunter gehören dazu.
 *
 * Ohne diese Teilung bekäme in einem Handbuch mit elf Kapiteln **jedes**
 * Bild den Text des ganzen Dokuments. Bis 1.66.0 war das so, und „Stellen
 * aus dem Folientext" meldete darauf elf von elf zugeordnet - alle auf
 * dieselbe Stelle. Eine Fehlmeldung ist schlimmer als keine Zuordnung.
 *
 * `rels` ist `word/_rels/document.xml.rels`; nur sie sagt, welche Kennung
 * im Dokument welche Mediendatei meint.
 */
export function wordAbschnitte(xml = '', rels = '') {
  const relsText = typeof rels === 'string' ? rels : new TextDecoder('utf-8').decode(rels || new Uint8Array());
  const ziele = new Map();
  for (const treffer of relsText.matchAll(/<Relationship\b[^>]*\/?>/g)) {
    const id = (treffer[0].match(/Id="([^"]+)"/) || [])[1];
    const ziel = (treffer[0].match(/Target="([^"]+)"/) || [])[1];
    if (id && ziel && BILD_ENDUNGEN.test(ziel)) ziele.set(id, ziel.split('/').pop());
  }

  const text = typeof xml === 'string' ? xml : new TextDecoder('utf-8').decode(xml || new Uint8Array());
  const abschnitte = [];
  // Was vor der ersten Überschrift steht, geht nicht verloren.
  let aktuell = { art: 'wort', nummer: 1, name: 'Dokument', text: '', medien: [] };
  abschnitte.push(aktuell);
  for (const treffer of text.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const stueck = treffer[0];
    const inhalt = officeText(stueck);
    const vorlage = (stueck.match(/<w:pStyle\s+w:val="([^"]+)"/) || [])[1] || '';
    if (/^Heading[0-9]$/.test(vorlage) && inhalt) {
      aktuell = { art: 'wort', nummer: abschnitte.length + 1, name: inhalt, text: inhalt, medien: [] };
      abschnitte.push(aktuell);
      continue;
    }
    if (inhalt) aktuell.text = aktuell.text ? `${aktuell.text} ${inhalt}` : inhalt;
    // `r:embed` ist der heutige Weg, `r:id` der ältere (VML). Eine Kennung,
    // die kein Bild meint - etwa ein Verweis -, steht nicht in `ziele`.
    for (const bezug of stueck.matchAll(/r:(?:embed|id)="([^"]+)"/g)) {
      const name = ziele.get(bezug[1]);
      if (name && !aktuell.medien.includes(name)) aktuell.medien.push(name);
    }
  }
  // Ein leerer Vorspann ist kein Abschnitt.
  const brauchbar = abschnitte.filter((a, i) => i > 0 || a.text || a.medien.length);
  return brauchbar.map((a, i) => ({ ...a, nummer: i + 1 }));
}

/**
 * Eingebettete Bilder einer PDF-Datei. Gelesen werden Bildstroeme mit
 * `/DCTDecode` - das sind JPEG-Daten, die sich unveraendert herausloesen
 * lassen. Ganze Seiten zu zeichnen ist etwas anderes: dafuer braucht es
 * einen PDF-Zeichner, und den gibt es hier nicht.
 */
export function pdfBilder(bytes) {
  const daten = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (daten.length < 5 || String.fromCharCode(...daten.subarray(0, 5)) !== '%PDF-') {
    return { bilder: [], hinweis: 'Das ist keine PDF-Datei.' };
  }
  const bilder = [];
  // JPEG-Stroeme beginnen mit FF D8 FF und enden mit FF D9 - zwischen
  // "stream" und "endstream" liegt genau dieser Block.
  for (let i = 0; i + 3 < daten.length; i++) {
    if (daten[i] !== 0xff || daten[i + 1] !== 0xd8 || daten[i + 2] !== 0xff) continue;
    let ende = -1;
    for (let j = i + 3; j + 1 < daten.length; j++) {
      if (daten[j] === 0xff && daten[j + 1] === 0xd9) {
        ende = j + 2;
        break;
      }
    }
    if (ende < 0) break;
    if (ende - i > 1024) bilder.push({ name: `bild-${bilder.length + 1}.jpg`, typ: 'image/jpeg', daten: daten.slice(i, ende) });
    i = ende;
  }
  return {
    bilder,
    hinweis: bilder.length
      ? ''
      : 'In dieser PDF-Datei stehen keine JPEG-Bilder. Seiten als Bild zu zeichnen kann diese Seite nicht – dafür bräuchte es einen PDF-Zeichner, den die Inhaltsrichtlinie des Artifacts nicht zulässt.'
  };
}

/** Woran eine Datei erkannt wird - an der Endung, nicht am Zufall. */
export function dateiArt(name) {
  const text = String(name || '').toLowerCase();
  if (/\.(png|jpe?g|gif|webp)$/.test(text)) return 'bild';
  if (text.endsWith('.pptx')) return 'pptx';
  if (text.endsWith('.docx')) return 'docx';
  if (text.endsWith('.xlsx')) return 'xlsx';
  if (text.endsWith('.pdf')) return 'pdf';
  if (/\.(ppt|doc|xls)$/.test(text)) return 'alt';
  return 'unbekannt';
}

/** Ein Titel aus Dateiname und Nummer - ohne Endung, lesbar. */
export function importTitel(dateiname, nummer, gesamt) {
  const basis = String(dateiname || 'Import')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  return gesamt > 1 ? `${basis} (${nummer}/${gesamt})` : basis;
}

/* --------------------------------- Designvorlagen und Seitenaufbau */

/**
 * Die Ausgabeformate. Gerechnet wird in Bildpunkten bei 300 dpi - was auf
 * Papier soll, muss in dieser Aufloesung vorliegen, sonst ist die Schrift im
 * Druck unscharf.
 */
export const FORMATE = [
  { id: 'a4-hoch', label: 'A4 hoch', breite: 2480, hoehe: 3508 },
  { id: 'a4-quer', label: 'A4 quer', breite: 3508, hoehe: 2480 },
  { id: 'bildschirm', label: 'Bildschirm 16:9', breite: 3840, hoehe: 2160 }
];

/**
 * Die Vorlagen. Jede sagt, wie viele Bilder auf eine Seite gehoeren, wie
 * breit die Textspalte ist und ob ein Deckblatt davorsteht.
 */
export const VORLAGEN = [
  {
    id: 'quickguide',
    label: 'Quick Guide',
    zweck: 'Eine Seite je Aufgabe: Schritte nebeneinander, kurzer Text darunter.',
    format: 'a4-quer',
    spalten: 3,
    zeilen: 2,
    textspalte: 0,
    deckblatt: false,
    textlaenge: 180
  },
  {
    id: 'onepager',
    label: 'One Pager',
    zweck: 'Alles auf eine Seite: bis zu vier Bilder, Text daneben.',
    format: 'a4-hoch',
    spalten: 2,
    zeilen: 2,
    textspalte: 0,
    deckblatt: false,
    textlaenge: 240
  },
  {
    id: 'releaseletter',
    label: 'Releaseletter',
    zweck: 'Zwei Bilder je Seite mit Fließtext – was neu ist und warum.',
    format: 'a4-hoch',
    spalten: 1,
    zeilen: 2,
    textspalte: 0.38,
    deckblatt: true,
    textlaenge: 420
  },
  {
    // Fuer Bildschirmfilme: ein Mitschnitt ist 16:9, und in den uebrigen
    // Vorlagen bleibt davon fast die halbe Zelle leer (gemessen: 49 % beim
    // Releaseletter, 43 % beim One Pager). Hier passt der Zuschnitt zum
    // Inhalt - 1 Prozent Rest.
    id: 'ablauf',
    label: 'Bildschirmablauf',
    zweck: 'Vier breite Bildschirmfotos je Seite, Anweisung daneben – für 16:9.',
    format: 'a4-hoch',
    spalten: 1,
    zeilen: 4,
    textspalte: 0.42,
    deckblatt: false,
    textlaenge: 260
  },
  {
    id: 'handbuch',
    label: 'Handbuchseite',
    zweck: 'Ein Bild je Schritt, Text in der Spalte daneben, Kapitelkopf.',
    format: 'a4-hoch',
    spalten: 1,
    zeilen: 3,
    textspalte: 0.34,
    deckblatt: false,
    textlaenge: 300
  }
];

export const vorlage = (id) => VORLAGEN.find((v) => v.id === id) || VORLAGEN[0];
export const format = (id) => FORMATE.find((f) => f.id === id) || FORMATE[0];

/** Kuerzt auf Wortgrenze - ein mitten im Wort abgeschnittener Satz wirkt kaputt. */
export function kuerzeText(text, grenze) {
  const sauber = String(text || '').replace(/\s+/g, ' ').trim();
  if (sauber.length <= grenze) return sauber;
  const schnitt = sauber.slice(0, grenze);
  const letzte = schnitt.lastIndexOf(' ');
  return (letzte > grenze * 0.6 ? schnitt.slice(0, letzte) : schnitt).replace(/[,;:.\s]+$/, '') + ' …';
}

/**
 * Der Text zu einem Schritt. Ohne Texte aus dem Handbuch steht nur die
 * Anweisung da; mit ihnen kommen Thema und Abschlusskriterium der Stelle
 * dazu - die Gliederung ist die Quelle, nicht eine Erfindung der Seite.
 */
export function schrittText({ anweisung, aufnahme = {}, gliederung = [], mitTexten = true, grenze = 300 }) {
  const stelle = gliederung.find((e) => e.nummer === String(aufnahme.gliederung || ''));
  const zeilen = [];
  const kopf = String(anweisung || aufnahme.titel || '').trim();
  if (kopf) zeilen.push(kopf);
  if (mitTexten && stelle) {
    if (stelle.thema && stelle.thema !== kopf) zeilen.push(stelle.thema);
    if (stelle.kriterium) zeilen.push(kuerzeText(stelle.kriterium, grenze));
  }
  return zeilen;
}

/**
 * Teilt die Schritte auf Seiten auf und rechnet jede Kachel aus. Ohne DOM,
 * damit sich die Aufteilung pruefen laesst: Rand, Kopfhoehe, Spalten, Zeilen
 * und die Textspalte ergeben die Masse jeder Kachel.
 */
export function seitenAufteilung(schritte = [], { vorlage: v, format: f, mitTexten = true } = {}) {
  const vor = typeof v === 'string' ? vorlage(v) : v || VORLAGEN[0];
  const fmt = typeof f === 'string' ? format(f) : f || format(vor.format);
  const rand = Math.round(fmt.breite * 0.045);
  const kopfHoehe = Math.round(fmt.hoehe * 0.075);
  const fussHoehe = Math.round(fmt.hoehe * 0.035);
  const abstand = Math.round(fmt.breite * 0.022);
  const jeSeite = Math.max(1, vor.spalten * vor.zeilen);
  const seiten = [];
  for (let i = 0; i < Math.max(schritte.length, 1); i += jeSeite) {
    const teil = schritte.slice(i, i + jeSeite);
    // Eine Seite mit drei statt sechs Bildern soll nicht halb leer bleiben:
    // gerechnet wird mit den Zeilen, die wirklich gebraucht werden.
    const zeilenGenutzt = Math.max(1, Math.ceil(teil.length / vor.spalten));
    const kacheln = teil.map((schritt, j) => {
      const spalte = j % vor.spalten;
      const zeile = Math.floor(j / vor.spalten);
      const innenBreite = fmt.breite - 2 * rand;
      const innenHoehe = fmt.hoehe - kopfHoehe - fussHoehe - rand;
      const kachelBreite = Math.floor((innenBreite - abstand * (vor.spalten - 1)) / vor.spalten);
      const kachelHoehe = Math.floor((innenHoehe - abstand * (zeilenGenutzt - 1)) / zeilenGenutzt);
      const textBreite = Math.round(kachelBreite * vor.textspalte);
      const bildBreite = kachelBreite - (textBreite ? textBreite + abstand : 0);
      return {
        nummer: i + j + 1,
        schritt,
        x: rand + spalte * (kachelBreite + abstand),
        y: kopfHoehe + zeile * (kachelHoehe + abstand),
        breite: kachelBreite,
        hoehe: kachelHoehe,
        bildBreite,
        // Ohne Textspalte steht der Text unter dem Bild, sonst daneben.
        textBreite: textBreite || kachelBreite,
        textNeben: textBreite > 0,
        bildHoehe: textBreite ? kachelHoehe : Math.round(kachelHoehe * 0.74)
      };
    });
    seiten.push({ nummer: seiten.length + 1, kacheln, rand, kopfHoehe, fussHoehe, zeilen: zeilenGenutzt });
  }
  const gesamt = seiten.length;
  return {
    vorlage: vor,
    format: fmt,
    mitTexten,
    seiten: seiten.map((s) => ({ ...s, von: gesamt }))
  };
}

/** Der Dateiname eines Blattes: Vorlage, Name, Seitenzahl. */
export function seitenName(vorlageId, name, nummer, von) {
  const basis = bereinigeDateiname(`${vorlageId}-${name || 'ohne-namen'}`) || 'blatt';
  return von > 1 ? `${basis}-seite-${String(nummer).padStart(2, '0')}.png` : `${basis}.png`;
}

/* ------------------------------- Strecken: mehrere Bilder, eine Folge */

export const STRECKEN_SCHLUESSEL = 'screenarchiv:strecken';
export const STRECKEN_VERSION = 1;
export const BLATT_SPALTEN = [
  { id: '1', label: 'untereinander', spalten: 1 },
  { id: '2', label: 'zwei nebeneinander', spalten: 2 },
  { id: '3', label: 'drei nebeneinander', spalten: 3 }
];

/** Eine leere Strecke; der Name traegt sie durch die Ablage. */
export function leereStrecke(name = '', zeit = Date.now()) {
  return {
    id: `STR-${zeit.toString(36)}`,
    name: String(name || '').trim(),
    spalten: 2,
    schritte: [],
    geaendert_am: new Date(zeit).toISOString()
  };
}

/**
 * Ein Schritt: seine Bilder, seine Anweisung, seine Art. Mehrere Bilder in
 * *einem* Schritt heissen: sie gehoeren zusammen und laufen nebeneinander -
 * zwei Rollen sehen denselben Schritt verschieden, oder zwei Reiter werden
 * zugleich gefuellt. Im Prozess wird daraus eine parallele Teilung.
 */
export function streckeSchritt(aufnahme, text = '') {
  const kennung = String(aufnahme && aufnahme.id ? aufnahme.id : aufnahme || '');
  return { art: 'schritt', aufnahmen: kennung ? [kennung] : [], text: String(text || '') };
}

/**
 * Ein Platzhalter: ein Schritt, dessen Bild noch fehlt. Er steht bewusst in
 * der Folge - eine Luecke, die man sieht, wird gefuellt; eine, die fehlt,
 * wird vergessen.
 */
export function platzhalterSchritt(text = '') {
  return { art: 'platzhalter', aufnahmen: [], text: String(text || '') };
}

/** Haengt ein weiteres Bild an einen Schritt - parallel, nicht danach. */
export function fuegeParallelHinzu(schritte = [], index, kennung) {
  const id = String(kennung || '');
  if (!id || index < 0 || index >= schritte.length) return schritte;
  // Wer ein Bild bekommt, ist kein Platzhalter mehr.
  return schritte.map((s, i) =>
    i === index && !(s.aufnahmen || []).includes(id)
      ? { ...s, art: 'schritt', aufnahmen: [...(s.aufnahmen || []), id] }
      : s
  );
}

/** Nimmt ein Bild aus einem Schritt; das letzte macht ihn zum Platzhalter. */
export function entferneParallel(schritte = [], index, kennung) {
  const id = String(kennung || '');
  if (index < 0 || index >= schritte.length) return schritte;
  return schritte.map((s, i) => {
    if (i !== index) return s;
    const bleibt = (s.aufnahmen || []).filter((a) => a !== id);
    return bleibt.length ? { ...s, aufnahmen: bleibt } : { ...s, art: 'platzhalter', aufnahmen: [] };
  });
}

/** Die Marke eines Bildes im Blatt: „3" allein, „3a" und „3b" parallel. */
export function schrittMarke(nummer, zahl, stelle) {
  return zahl > 1 ? `${nummer}${String.fromCharCode(97 + stelle)}` : String(nummer);
}

/** Verschiebt einen Schritt; ausserhalb der Folge passiert nichts. */
export function verschiebeSchritt(schritte = [], index, richtung) {
  const ziel = index + richtung;
  if (index < 0 || index >= schritte.length || ziel < 0 || ziel >= schritte.length) return schritte;
  const kopie = [...schritte];
  [kopie[index], kopie[ziel]] = [kopie[ziel], kopie[index]];
  return kopie;
}

/**
 * Die Schritte mit ihren Aufnahmen - ohne die Aufnahme ist ein Schritt
 * wertlos, und eine geloeschte Aufnahme soll die Strecke nicht sprengen.
 */
export function streckeMitAufnahmen(strecke = {}, eingang = []) {
  return (strecke.schritte || [])
    .map((schritt, i) => {
      const kennungen = schritt.aufnahmen || (schritt.aufnahme ? [schritt.aufnahme] : []);
      const gefunden = kennungen.map((k) => eingang.find((a) => a.id === k) || null);
      return {
        nummer: i + 1,
        art: schritt.art === 'platzhalter' ? 'platzhalter' : 'schritt',
        text: String(schritt.text || ''),
        aufnahmen: gefunden.filter(Boolean),
        // Das erste Bild traegt den Schritt - daran haengen Blatt und Vorlage.
        aufnahme: gefunden.find(Boolean) || null,
        fehlen: kennungen.filter((k, j) => !gefunden[j]),
        kennungen
      };
    })
    .filter((schritt) => schritt.art === 'platzhalter' || schritt.aufnahme);
}

/**
 * Die Bilder eines Blattes, flach und in der Reihenfolge der Folge. Ein
 * Schritt mit zwei Bildern gibt zwei Kacheln - „3a" und „3b" -, ein
 * Platzhalter gibt eine leere Kachel in festem Seitenverhaeltnis.
 */
export function blattBilder(schritte = []) {
  const flach = [];
  for (const schritt of schritte) {
    if (schritt.art === 'platzhalter' || !schritt.aufnahmen.length) {
      flach.push({ schritt, aufnahme: null, marke: String(schritt.nummer), platzhalter: true });
      continue;
    }
    schritt.aufnahmen.forEach((aufnahme, k) => {
      flach.push({
        schritt,
        aufnahme,
        marke: schrittMarke(schritt.nummer, schritt.aufnahmen.length, k),
        platzhalter: false
      });
    });
  }
  return flach;
}

/** Was der Strecke noch fehlt, bevor sie ein Blatt werden kann. */
export function pruefeStrecke(strecke = {}, eingang = []) {
  const probleme = [];
  if (!String(strecke.name || '').trim()) probleme.push({ feld: 'name', text: 'Die Strecke braucht einen Namen.' });
  const schritte = strecke.schritte || [];
  if (schritte.length < 2) probleme.push({ feld: 'schritte', text: 'Eine Strecke braucht mindestens zwei Schritte.' });
  schritte.forEach((schritt, i) => {
    const kennungen = schritt.aufnahmen || (schritt.aufnahme ? [schritt.aufnahme] : []);
    const fehlen = kennungen.filter((k) => !eingang.some((a) => a.id === k));
    for (const k of fehlen) {
      probleme.push({ feld: 'schritt-' + i, text: `Schritt ${i + 1}: die Aufnahme ${k} fehlt im Eingang.` });
    }
    // Ein Platzhalter *darf* ohne Bild stehen - er sagt ja, dass eines fehlt.
    if (schritt.art !== 'platzhalter' && !kennungen.length) {
      probleme.push({ feld: 'schritt-' + i, text: `Schritt ${i + 1} hat kein Bild.` });
    }
    if (!String(schritt.text || '').trim()) {
      probleme.push({
        feld: 'text-' + i,
        text:
          schritt.art === 'platzhalter'
            ? `Platzhalter ${i + 1} sagt nicht, welches Bild fehlt.`
            : `Schritt ${i + 1} hat keine Anweisung.`
      });
    }
  });
  return probleme;
}

/** Die Strecke als Text - dieselbe Folge, nur ohne Bilder. */
export function streckeAlsText(strecke = {}, eingang = []) {
  const zeilen = streckeMitAufnahmen(strecke, eingang).map((s) => {
    const anweisung = String(s.text || '').trim() || '(ohne Anweisung)';
    if (s.art === 'platzhalter') return `${s.nummer}. [Bild fehlt] ${anweisung}`;
    const stelle = kapitelKennung(s.aufnahme) ? `  [${kapitelKennung(s.aufnahme)}]` : '';
    const parallel = s.aufnahmen.length > 1 ? `  (parallel: ${s.aufnahmen.length} Bilder)` : '';
    return `${s.nummer}. ${anweisung}${stelle}${parallel}`;
  });
  return [String(strecke.name || '').trim(), ...zeilen].filter(Boolean).join('\n');
}

/**
 * Rechnet den Platzbedarf eines Blattes aus: wie viele Spalten, wie breit
 * jede Kachel, wie hoch die Zeilen. Ohne DOM, damit es pruefbar bleibt.
 */
export function blattRaster(bilder = [], { spalten = 2, breite = 1600, abstand = 24, textHoehe = 64, kopfHoehe = 96 } = {}) {
  const anzahl = bilder.length;
  if (!anzahl) return { breite, hoehe: kopfHoehe, spalten: 0, kacheln: [] };
  const spaltenZahl = Math.max(1, Math.min(spalten, anzahl));
  const kachelBreite = Math.floor((breite - abstand * (spaltenZahl + 1)) / spaltenZahl);
  const kacheln = [];
  let y = kopfHoehe;
  let zeilenHoehe = 0;
  bilder.forEach((bild, i) => {
    const spalte = i % spaltenZahl;
    // Ein Platzhalter hat kein Bild und damit kein Maß - er bekommt das
    // Seitenverhaeltnis eines Bildschirms, damit die Zeile nicht einbricht.
    const bildBreite = Math.max(1, bild.breite || 1600);
    const bildHoehe = Math.max(1, bild.hoehe || 1000);
    const massstab = kachelBreite / bildBreite;
    const hoehe = Math.round(bildHoehe * massstab) + textHoehe;
    if (spalte === 0 && i > 0) {
      y += zeilenHoehe + abstand;
      zeilenHoehe = 0;
    }
    zeilenHoehe = Math.max(zeilenHoehe, hoehe);
    kacheln.push({
      x: abstand + spalte * (kachelBreite + abstand),
      y,
      breite: kachelBreite,
      bildHoehe: hoehe - textHoehe,
      hoehe,
      nummer: i + 1,
      marke: bild.marke || String(i + 1),
      platzhalter: Boolean(bild.platzhalter)
    });
  });
  return { breite, hoehe: y + zeilenHoehe + abstand, spalten: spaltenZahl, kacheln };
}

/** Liest abgelegte Strecken; unbrauchbares faellt weg. */
export function leseStrecken(text) {
  if (!text) return [];
  let inhalt;
  try {
    inhalt = JSON.parse(text);
  } catch (fehler) {
    return [];
  }
  const liste = Array.isArray(inhalt) ? inhalt : inhalt && Array.isArray(inhalt.strecken) ? inhalt.strecken : [];
  return liste
    .filter((s) => s && typeof s === 'object' && s.id)
    .map((s) => ({
      id: String(s.id),
      name: String(s.name || ''),
      spalten: Number(s.spalten) || 2,
      geaendert_am: String(s.geaendert_am || ''),
      // Der alte Satz trug ein Bild je Schritt (`aufnahme`); daraus wird eine
      // Liste. Platzhalter kommen ohne Bild durch, alles andere braucht eines.
      schritte: Array.isArray(s.schritte)
        ? s.schritte
            .map((x) => {
              if (!x || typeof x !== 'object') return null;
              const art = x.art === 'platzhalter' ? 'platzhalter' : 'schritt';
              const aufnahmen = (Array.isArray(x.aufnahmen) ? x.aufnahmen : x.aufnahme ? [x.aufnahme] : [])
                .map((a) => String(a || ''))
                .filter(Boolean);
              if (art === 'schritt' && !aufnahmen.length) return null;
              return { art, aufnahmen, text: String(x.text || '') };
            })
            .filter(Boolean)
        : []
    }));
}

export function schreibeStrecken(strecken = []) {
  return JSON.stringify({ version: STRECKEN_VERSION, stand: new Date().toISOString(), strecken });
}

/* ------------------------------------------- Prozess: die Strecke als BPMN */

/**
 * Masse des Prozessbildes. BPMN rechnet in Punkten; die Werte entsprechen
 * dem, was die ueblichen Werkzeuge (bpmn.io, Camunda) selbst setzen - so
 * sieht das Diagramm dort nicht verzogen aus.
 */
export const BPMN_MASSE = {
  ereignis: 36,
  aufgabeBreite: 170,
  aufgabeHoehe: 90,
  tor: 50,
  luecke: 60,
  zeile: 130,
  rand: 60
};

/**
 * Baut den Prozess aus der Strecke: Start, je Schritt eine Aufgabe, am Ende
 * ein Ende. Ein Schritt mit mehreren Bildern wird zu einer *parallelen
 * Teilung* - genau das heisst „nebeneinander" in einem Prozess: die Zweige
 * laufen gleichzeitig und treffen sich wieder.
 *
 * Gerechnet wird mit Koordinaten, damit das Diagramm auch im fremden
 * Werkzeug steht statt dort erst gelegt werden zu muessen.
 */
export function bpmnAufbau(strecke = {}, eingang = []) {
  const schritte = streckeMitAufnahmen(strecke, eingang);
  const m = BPMN_MASSE;
  const breiteste = schritte.reduce((hoch, s) => Math.max(hoch, s.aufnahmen.length || 1), 1);
  const bandHoehe = (breiteste - 1) * m.zeile + m.aufgabeHoehe;
  const mitte = m.rand + bandHoehe / 2;
  const knoten = [];
  const kanten = [];
  let x = m.rand;
  let vorher = 'start';

  const lege = (knoten_) => {
    knoten.push(knoten_);
    return knoten_.id;
  };
  const verbinde = (von, nach) => {
    kanten.push({ id: `fluss_${kanten.length + 1}`, von, nach });
  };

  lege({ id: 'start', art: 'start', name: 'Start', x, y: mitte - m.ereignis / 2, breite: m.ereignis, hoehe: m.ereignis });
  x += m.ereignis + m.luecke;

  schritte.forEach((schritt, i) => {
    const nummer = i + 1;
    const anweisung = String(schritt.text || '').trim();
    if (schritt.art === 'platzhalter' || schritt.aufnahmen.length <= 1) {
      const aufnahme = schritt.aufnahmen[0] || null;
      const id = lege({
        id: 'schritt_' + nummer,
        art: schritt.art === 'platzhalter' ? 'platzhalter' : 'aufgabe',
        name: `${nummer}. ${anweisung || (aufnahme ? aufnahme.titel : 'Bild fehlt')}`,
        hinweis: aufnahme ? `${aufnahme.id}${kapitelKennung(aufnahme) ? ' · ' + kapitelKennung(aufnahme) : ''}` : 'Bild fehlt noch',
        x,
        y: mitte - m.aufgabeHoehe / 2,
        breite: m.aufgabeBreite,
        hoehe: m.aufgabeHoehe
      });
      verbinde(vorher, id);
      vorher = id;
      x += m.aufgabeBreite + m.luecke;
      return;
    }

    // Parallel: Teilung, ein Zweig je Bild, Vereinigung.
    const teilung = lege({
      id: 'teilung_' + nummer,
      art: 'teilung',
      name: '',
      x,
      y: mitte - m.tor / 2,
      breite: m.tor,
      hoehe: m.tor
    });
    verbinde(vorher, teilung);
    x += m.tor + m.luecke;
    const anzahl = schritt.aufnahmen.length;
    const obenAn = mitte - ((anzahl - 1) * m.zeile + m.aufgabeHoehe) / 2;
    const zweige = schritt.aufnahmen.map((aufnahme, k) => {
      const id = lege({
        id: `schritt_${nummer}_${k + 1}`,
        art: 'aufgabe',
        name: `${schrittMarke(nummer, anzahl, k)}. ${anweisung || aufnahme.titel}`,
        hinweis: `${aufnahme.id}${kapitelKennung(aufnahme) ? ' · ' + kapitelKennung(aufnahme) : ''} · ${aufnahme.titel}`,
        x,
        y: obenAn + k * m.zeile,
        breite: m.aufgabeBreite,
        hoehe: m.aufgabeHoehe
      });
      verbinde(teilung, id);
      return id;
    });
    x += m.aufgabeBreite + m.luecke;
    const vereinigung = lege({
      id: 'vereinigung_' + nummer,
      art: 'vereinigung',
      name: '',
      x,
      y: mitte - m.tor / 2,
      breite: m.tor,
      hoehe: m.tor
    });
    for (const zweig of zweige) verbinde(zweig, vereinigung);
    vorher = vereinigung;
    x += m.tor + m.luecke;
  });

  const ende = lege({
    id: 'ende',
    art: 'ende',
    name: 'Ende',
    x,
    y: mitte - m.ereignis / 2,
    breite: m.ereignis,
    hoehe: m.ereignis
  });
  verbinde(vorher, ende);

  return {
    knoten,
    kanten,
    breite: x + m.ereignis + m.rand,
    hoehe: m.rand * 2 + bandHoehe,
    schritte
  };
}

const BPMN_TYPEN = {
  start: 'startEvent',
  ende: 'endEvent',
  aufgabe: 'userTask',
  platzhalter: 'task',
  teilung: 'parallelGateway',
  vereinigung: 'parallelGateway'
};

/**
 * Der Prozess als BPMN 2.0. Mit Diagrammteil (`BPMNDiagram`), damit die
 * Datei in bpmn.io, Camunda oder Signavio sofort etwas zeigt - ohne ihn
 * waere die Datei gueltig und doch leer.
 */
export function streckeAlsBpmn(strecke = {}, eingang = [], { erzeugt = new Date().toISOString(), anwendung = '' } = {}) {
  const aufbau = bpmnAufbau(strecke, eingang);
  const m = maskiereHtml;
  const kennung = String(strecke.id || 'STR').replace(/[^A-Za-z0-9_-]/g, '_');
  const prozess = 'Prozess_' + kennung;
  const nachId = new Map(aufbau.knoten.map((k) => [k.id, k]));
  const raus = (id) => aufbau.kanten.filter((k) => k.von === id);
  const rein = (id) => aufbau.kanten.filter((k) => k.nach === id);

  const elemente = aufbau.knoten.map((k) => {
    const typ = BPMN_TYPEN[k.art];
    const inhalt = [
      k.hinweis ? `      <bpmn:documentation>${m(k.hinweis)}</bpmn:documentation>` : '',
      ...rein(k.id).map((kante) => `      <bpmn:incoming>${kante.id}</bpmn:incoming>`),
      ...raus(k.id).map((kante) => `      <bpmn:outgoing>${kante.id}</bpmn:outgoing>`)
    ].filter(Boolean);
    const anfang = `    <bpmn:${typ} id="${k.id}"${k.name ? ` name="${m(k.name)}"` : ''}`;
    return inhalt.length ? `${anfang}>\n${inhalt.join('\n')}\n    </bpmn:${typ}>` : `${anfang} />`;
  });

  const fluesse = aufbau.kanten.map(
    (kante) => `    <bpmn:sequenceFlow id="${kante.id}" sourceRef="${kante.von}" targetRef="${kante.nach}" />`
  );

  const formen = aufbau.knoten.map(
    (k) =>
      `      <bpmndi:BPMNShape id="Form_${k.id}" bpmnElement="${k.id}"${
        k.art === 'teilung' || k.art === 'vereinigung' ? ' isMarkerVisible="true"' : ''
      }>\n        <dc:Bounds x="${k.x}" y="${Math.round(k.y)}" width="${k.breite}" height="${k.hoehe}" />\n      </bpmndi:BPMNShape>`
  );

  const linien = aufbau.kanten.map((kante) => {
    const von = nachId.get(kante.von);
    const nach = nachId.get(kante.nach);
    const vonY = Math.round(von.y + von.hoehe / 2);
    const nachY = Math.round(nach.y + nach.hoehe / 2);
    const punkte = [
      `          <di:waypoint x="${von.x + von.breite}" y="${vonY}" />`,
      // Ein Knick, wenn die Zweige nicht auf einer Hoehe liegen - sonst
      // zeichnen die Werkzeuge eine Schraege durch die Kacheln.
      vonY !== nachY ? `          <di:waypoint x="${nach.x - 20}" y="${vonY}" />` : '',
      vonY !== nachY ? `          <di:waypoint x="${nach.x - 20}" y="${nachY}" />` : '',
      `          <di:waypoint x="${nach.x}" y="${nachY}" />`
    ].filter(Boolean);
    return `      <bpmndi:BPMNEdge id="Linie_${kante.id}" bpmnElement="${kante.id}">\n${punkte.join('\n')}\n      </bpmndi:BPMNEdge>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Erzeugt aus einer Klickstrecke des Screenarchivs${anwendung ? ' ' + anwendung : ''} am ${erzeugt} -->
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitionen_${kennung}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${prozess}" name="${m(String(strecke.name || 'Klickstrecke'))}" isExecutable="false">
${[...elemente, ...fluesse].join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagramm_${kennung}">
    <bpmndi:BPMNPlane id="Flaeche_${kennung}" bpmnElement="${prozess}">
${[...formen, ...linien].join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

/* ------------------------------------------- Auflösung und Vorschauen */

/**
 * Die Vorschau im Eingang ist klein, das Original bleibt gross. Der
 * localStorage fasst rund fuenf Megabyte - ein einziger Bildschirm in voller
 * Aufloesung waere schon ein Zehntel davon. Darum: Vorschau in den Speicher,
 * volles Bild in die Browserdatenbank.
 */
export const VORSCHAU_BREITE = 760;
export const VORSCHAU_GUETE = 0.78;
export const HOECHSTE_BILDBREITE = 4096;

/**
 * Der Name der abgelegten Fassung. Wurde etwas unkenntlich gemacht, heisst
 * die Datei danach - wer sie weitergibt, sieht am Namen, dass sie bearbeitet
 * ist: `bestelluebersicht_blurrt_2.png`.
 */
export function fassungName(bildname, nummer, mitUnkenntlich) {
  const text = String(bildname || 'bild.png');
  const punkt = text.lastIndexOf('.');
  const basis = punkt > 0 ? text.slice(0, punkt) : text;
  const endung = punkt > 0 ? text.slice(punkt) : '';
  const art = mitUnkenntlich ? 'blurrt' : 'markiert';
  return `${basis}_${art}_${Number(nummer) || 1}${endung}`;
}

/* ----------------------------- Fassungen: das Original und seine Stufen */

/**
 * Eine Aufnahme hat ein Original und beliebig viele Fassungen. Das Original
 * wird nie ueberschrieben; jede Bearbeitung legt eine weitere Fassung daneben,
 * mit eigener Nummer, eigenem Zeitpunkt und den Marken, aus denen sie
 * entstanden ist. So laesst sich jede Stufe wieder oeffnen, weiterbearbeiten
 * oder verwerfen.
 */
export function naechsteFassungsnummer(fassungen = []) {
  return fassungen.reduce((hoechste, f) => Math.max(hoechste, Number(f.nummer) || 0), 0) + 1;
}

export function baueFassung({ nummer, bild, marken = [], notiz = '', erstelltAm }) {
  return {
    nummer,
    bild,
    marken: markenAlsAblage(marken),
    notiz: String(notiz || '').trim(),
    erstellt_am: erstelltAm || new Date().toISOString()
  };
}

/**
 * Liest die Fassungen einer Aufnahme. Aeltere Staende kannten nur eine
 * einzelne bearbeitete Fassung (`bild_markiert`) - die wird als Fassung 1
 * gelesen, damit nichts verlorengeht.
 */
export function leseFassungen(aufnahme = {}) {
  const roh = Array.isArray(aufnahme.fassungen) ? aufnahme.fassungen : [];
  const gelesen = roh
    .filter((f) => f && typeof f.bild === 'string' && f.bild.startsWith('data:image/'))
    .map((f, i) => ({
      nummer: Number(f.nummer) || i + 1,
      bild: f.bild,
      marken: leseMarken(f.marken),
      notiz: String(f.notiz || ''),
      erstellt_am: String(f.erstellt_am || '')
    }));
  if (gelesen.length) return gelesen.sort((a, b) => a.nummer - b.nummer);
  if (typeof aufnahme.bild_markiert === 'string' && aufnahme.bild_markiert.startsWith('data:image/')) {
    return [
      {
        nummer: 1,
        bild: aufnahme.bild_markiert,
        marken: leseMarken(aufnahme.marken),
        notiz: 'aus einer früheren Fassung übernommen',
        erstellt_am: String(aufnahme.markiert_am || '')
      }
    ];
  }
  return [];
}

/** Die juengste Fassung, sonst null. */
export function neuesteFassung(aufnahme = {}) {
  const fassungen = leseFassungen(aufnahme);
  return fassungen.length ? fassungen[fassungen.length - 1] : null;
}

/**
 * Ein Platzhalter fuer den Augenblick, in dem eine Vorschau noch aus der
 * Datenbank kommt. Ein leeres `src` laedt die Seite selbst und zeigt ein
 * kaputtes Bild - das sieht nach Fehler aus, wo keiner ist.
 */
export const PLATZHALTER_BILD =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10"><rect width="16" height="10" fill="%23E4E8EF"/></svg>'
  );

/** Was gezeigt wird: die juengste Fassung, sonst das Original. */
export function anzeigeBild(aufnahme = {}) {
  const fassung = neuesteFassung(aufnahme);
  return (fassung && fassung.bild) || aufnahme.bild || PLATZHALTER_BILD;
}

/* ------------------------------------------- Labels: wer, wo, womit */

/**
 * Ein Bild allein sagt nicht, fuer wen es gilt. Dieselbe Maske sieht fuer
 * Dealer und HQ verschieden aus, in Pkw anders als in Van, auf Deutsch anders
 * als auf Koreanisch. Darum traegt jedes Bild seine Labels - und zeigt sie
 * auf Wunsch im Bild selbst.
 */
export const SPRACHEN = [
  { id: 'de', label: 'Deutsch', kurz: 'DE' },
  { id: 'en', label: 'Englisch', kurz: 'EN' },
  { id: 'fr', label: 'Französisch', kurz: 'FR' },
  { id: 'sk', label: 'Slowakisch', kurz: 'SK' },
  { id: 'cs', label: 'Tschechisch', kurz: 'CS' },
  { id: 'ms', label: 'Malaiisch', kurz: 'MS' },
  { id: 'ko', label: 'Koreanisch', kurz: 'KO' },
  { id: 'hi', label: 'Hindi', kurz: 'HI' },
  { id: 'de-ch', label: 'Deutsch (Schweiz)', kurz: 'DE-CH' },
  { id: 'fr-ch', label: 'Französisch (Schweiz)', kurz: 'FR-CH' },
  { id: 'it', label: 'Italienisch', kurz: 'IT' },
  { id: 'es', label: 'Spanisch', kurz: 'ES' },
  { id: 'pt', label: 'Portugiesisch', kurz: 'PT' },
  { id: 'pl', label: 'Polnisch', kurz: 'PL' },
  { id: 'hu', label: 'Ungarisch', kurz: 'HU' },
  { id: 'ro', label: 'Rumänisch', kurz: 'RO' },
  { id: 'tr', label: 'Türkisch', kurz: 'TR' },
  { id: 'ja', label: 'Japanisch', kurz: 'JA' },
  { id: 'zh', label: 'Chinesisch', kurz: 'ZH' },
  { id: 'nl', label: 'Niederländisch', kurz: 'NL' },
  { id: 'ar', label: 'Arabisch', kurz: 'AR' }
];

export const ROLLEN_LABEL = [
  { id: 'dealer', label: 'Dealer', lang: 'Händler und Werkstatt', alias: ['Händler'], symbol: 'rolle-dealer' },
  { id: 'market', label: 'Market', lang: 'Landesgesellschaft', alias: ['Landesgesellschaft'], symbol: 'rolle-market' },
  { id: 'hq', label: 'HQ', lang: 'Zentrale', alias: ['Headquarter', 'Zentrale'], symbol: 'rolle-hq' },
  { id: 'mo', label: 'MO', lang: 'Market Organisation', alias: ['Marktorganisation'], symbol: 'rolle-mo' }
];

/**
 * Die Sparten heissen im Haus PC (Passenger Cars) und Van. Die Kennung bleibt
 * `pkw` - abgelegte Bilder sollen beim Umbenennen des Schildes nicht ihre
 * Zuordnung verlieren.
 */
export const SPARTEN = [
  { id: 'pkw', label: 'PC', lang: 'Passenger Cars (Pkw)', alias: ['Pkw', 'Passenger Cars'], symbol: 'sparte-pkw' },
  { id: 'van', label: 'Van', lang: 'Vans', alias: ['Transporter'], symbol: 'sparte-van' }
];

/**
 * Die Labelfelder in fester Folge. Sprache, Rolle und Sparte haben eine feste
 * Auswahl; Markt, Domaene, Reiter und Schritt kommen aus dem System und
 * waeren als feste Liste schon morgen falsch - dort wird getippt, und die
 * Seite schlaegt vor, was schon verwendet wurde.
 */
export const LABEL_FELDER = [
  { id: 'sprache', label: 'Sprache', symbol: 'sprache', werte: SPRACHEN },
  { id: 'rolle_label', label: 'Rolle', symbol: 'rolle', werte: ROLLEN_LABEL },
  { id: 'sparte', label: 'Sparte', symbol: 'sparte', werte: SPARTEN },
  { id: 'markt', label: 'Markt', symbol: 'markt', frei: true },
  { id: 'version', label: 'Version', symbol: 'version', frei: true },
  { id: 'land', label: 'Land', symbol: 'land', frei: true },
  { id: 'domaene', label: 'Domäne', symbol: 'domaene', frei: true },
  { id: 'reiter', label: 'Reiter', symbol: 'reiter', frei: true },
  { id: 'schritt_label', label: 'Schritt', symbol: 'schritt', frei: true }
];

/**
 * Das Zeichen zu einem *angezeigten* Labelwert. Gesucht wird am Klartext,
 * weil Marken im Bild ihren Text tragen, nicht die Kennung.
 */
export function symbolZuLabel(feldId, text) {
  const feld = LABEL_FELDER.find((f) => f.id === feldId);
  if (!feld) return '';
  const treffer = (feld.werte || []).find((w) => w.label === String(text || '').trim());
  return (treffer && treffer.symbol) || feld.symbol || '';
}

/** Der angezeigte Wert eines Labels: aus der Liste oder wie getippt. */
export function labelWert(feldId, wert) {
  const feld = LABEL_FELDER.find((f) => f.id === feldId);
  if (!feld) return String(wert || '');
  if (feld.frei) return String(wert || '').trim();
  const treffer = (feld.werte || []).find((w) => w.id === wert);
  return treffer ? treffer.label : String(wert || '');
}

/** Alle gesetzten Labels einer Aufnahme, in fester Folge. */
export function labelListe(aufnahme = {}) {
  return LABEL_FELDER.map((feld) => ({
    feld: feld.id,
    bezeichnung: feld.label,
    symbol: feld.symbol,
    wert: labelWert(feld.id, aufnahme[feld.id])
  })).filter((l) => l.wert);
}

/** Die Labels als eine Zeile - fuer Karte, Zettel und Bildunterschrift. */
export function labelKette(aufnahme = {}, trenner = ' · ') {
  return labelListe(aufnahme)
    .map((l) => l.wert)
    .join(trenner);
}

/**
 * Was bisher verwendet wurde - als Vorschlag fuer die freien Felder. So
 * entsteht das Vokabular aus der Arbeit, nicht aus einer Vermutung.
 */
export function labelVorschlaege(aufnahmen = [], feldId) {
  const gezaehlt = new Map();
  for (const aufnahme of aufnahmen) {
    const wert = String(aufnahme[feldId] || '').trim();
    if (!wert) continue;
    gezaehlt.set(wert, (gezaehlt.get(wert) || 0) + 1);
  }
  return [...gezaehlt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([wert]) => wert);
}

/**
 * Die Teilschritte einer Stelle: welche Sprachen, Domaenen, Reiter und
 * Schritte dort liegen - jeweils mit Zahl. Das ist die Navigation rechts
 * neben der Gliederung.
 */
export function teilschritte(aufnahmen = [], stelle) {
  // Ohne gewaehlte Stelle gelten alle Bilder - auch die noch nicht
  // zugeordneten; sonst waere die Leiste am Anfang immer leer.
  const passend = stelle ? aufnahmen.filter((a) => gehoertZu(String(a.gliederung || ''), stelle)) : aufnahmen;
  return LABEL_FELDER.map((feld) => {
    const gezaehlt = new Map();
    for (const aufnahme of passend) {
      const wert = labelWert(feld.id, aufnahme[feld.id]);
      if (!wert) continue;
      gezaehlt.set(wert, (gezaehlt.get(wert) || 0) + 1);
    }
    return {
      feld: feld.id,
      bezeichnung: feld.label,
      symbol: feld.symbol,
      werte: [...gezaehlt.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        // Jeder Wert bringt sein eigenes Zeichen mit, wo es eines gibt -
        // Dealer sieht anders aus als HQ, PC anders als Van.
        .map(([wert, zahl]) => ({ wert, zahl, symbol: symbolZuLabel(feld.id, wert) }))
    };
  }).filter((f) => f.werte.length);
}

/* ----------------------------------------- Gliederung des Handbuchs */

/**
 * Die Gliederung kommt aus der Arbeitsmappe des Projekts: drei Ebenen,
 * dazu "Uebergaenge" (T14-15), die zwischen zwei Kapiteln vermitteln und
 * selbst keine Nummer in der Ordnung tragen.
 */
export function leseGliederung(roh = {}) {
  const liste = Array.isArray(roh.eintraege) ? roh.eintraege : [];
  // Die Beschreibungen stehen einmal in einer Tabelle; die Eintraege
  // verweisen darauf. Dieselbe Begruendung steht an 159 Stellen - sie
  // tausendfach abzulegen waere Verschwendung.
  const texte = Array.isArray(roh.texte) ? roh.texte : [];
  const text = (verweis) => (Number.isInteger(verweis) && texte[verweis]) || '';
  return liste
    .filter((e) => e && e.nummer && e.thema)
    .map((e) => ({
      nummer: String(e.nummer),
      thema: String(e.thema),
      ebene: Number(e.ebene) || 0,
      art: e.art === 'uebergang' ? 'uebergang' : 'kapitel',
      kriterium: text(e.kriterium),
      notiz: text(e.notiz),
      text: text(e.text)
    }));
}

/**
 * Der Baum zur flachen Liste: jede Stelle kennt ihre Kinder. Fehlt eine
 * Zwischenstufe - die Anhaenge A.1, B.1 fuehren kein eigenes "A" -, wird sie
 * ergaenzt, damit nichts an der Wurzel haengt, wo es nicht hingehoert.
 */
export function gliederungBaum(eintraege = []) {
  const knoten = new Map();
  for (const eintrag of eintraege) {
    if (eintrag.art === 'uebergang') continue;
    knoten.set(eintrag.nummer, { ...eintrag, kinder: [] });
  }
  const ergaenze = (nummer) => {
    if (knoten.has(nummer)) return knoten.get(nummer);
    const istBuchstabe = /^[A-Z]+$/.test(nummer);
    const knoten_ = {
      nummer,
      thema: istBuchstabe ? `Anhang ${nummer}` : `Kapitel ${nummer}`,
      ebene: nummer.split('.').length,
      art: 'gruppe',
      kinder: []
    };
    knoten.set(nummer, knoten_);
    return knoten_;
  };
  for (const eintrag of [...knoten.values()]) {
    const teile = eintrag.nummer.split('.');
    if (teile.length < 2) continue;
    ergaenze(teile.slice(0, -1).join('.')).kinder.push(eintrag);
  }
  return [...knoten.values()].filter((k) => k.nummer.split('.').length === 1);
}

/** Gehoert eine Nummer zu einer Stelle oder darunter? 6.2 traegt 6.2.3. */
export function gehoertZu(nummer, stelle) {
  const a = String(nummer || '');
  const b = String(stelle || '');
  return a === b || a.startsWith(b + '.');
}

/**
 * Zaehlt die Bilder je Stelle der Gliederung: eigene und die der
 * Unterkapitel. Ohne Summe waere ein Kapitel immer leer - die Bilder haengen
 * an der dritten Ebene.
 */
export function zaehleBilder(eintraege = [], aufnahmen = []) {
  const eigene = new Map();
  for (const aufnahme of aufnahmen) {
    const stelle = String(aufnahme.gliederung || '').trim();
    if (!stelle) continue;
    eigene.set(stelle, (eigene.get(stelle) || 0) + 1);
  }
  // Die Summe je Stelle entsteht von unten nach oben: jede belegte Stelle
  // zaehlt sich ihren Vorfahren zu. Der umgekehrte Weg - jede der 1153
  // Stellen gegen jede belegte pruefen - kostet bei vielen Bildern ein
  // Vielfaches und liefert dasselbe.
  const summen = new Map();
  for (const [stelle, zahl] of eigene) {
    for (const teil of stelleTeile(stelle)) summen.set(teil, (summen.get(teil) || 0) + zahl);
  }
  const zahlen = new Map();
  for (const eintrag of eintraege) {
    if (eintrag.art === 'uebergang') continue;
    zahlen.set(eintrag.nummer, { eigene: eigene.get(eintrag.nummer) || 0, gesamt: summen.get(eintrag.nummer) || 0 });
  }
  const ohneStelle = aufnahmen.filter((a) => !String(a.gliederung || '').trim()).length;
  const unbekannt = [...eigene.keys()].filter((stelle) => !zahlen.has(stelle));
  return { zahlen, ohneStelle, unbekannt };
}

/* ------------------------------- Stapelverarbeitung beim Import (1.50.0) */

/**
 * Die nächsten Stellen der Gliederung ab einer Nummer - in der Ordnung, in
 * der sie im Handbuch stehen. Ein Foliensatz läuft ein Kapitel entlang;
 * damit bekommt jede Folie ihre Stelle, ohne dass jemand vierzigmal dasselbe
 * Auswahlfeld bedient.
 *
 * `nurBlaetter`: nur Stellen ohne Unterstellen - dort hängen die Bilder.
 */
export function folgendeStellen(gliederung = [], start = '', anzahl = 1, { nurBlaetter = true } = {}) {
  const kapitel = gliederung.filter((e) => e.art !== 'uebergang');
  const blatt = (eintrag) => !kapitel.some((e) => e.nummer !== eintrag.nummer && gehoertZu(e.nummer, eintrag.nummer));
  const liste = nurBlaetter ? kapitel.filter(blatt) : kapitel;
  const ab = liste.findIndex((e) => e.nummer === String(start || '').trim());
  if (ab < 0) return [];
  return liste.slice(ab, ab + Math.max(0, anzahl)).map((e) => e.nummer);
}

/**
 * Die Stelle, die am besten zu einem Text passt - etwa zum Titel einer
 * Folie. Gewertet wird, wie viele Wörter des Themas vorkommen; eine Nummer
 * im Text wiegt schwerer als ein Wort. Ohne klaren Treffer kommt nichts
 * zurück: eine geratene Zuordnung wäre schlimmer als keine.
 */
export function stelleAusText(gliederung = [], text = '') {
  const roh = String(text || '').trim();
  if (roh.length < 3) return '';
  const gesucht = normalisiereLang(roh);
  // Eine Nummer im Text entscheidet, wenn es sie gibt.
  const nummer = roh.match(/\b([0-9]{1,2}(?:\.[0-9]{1,2}){1,3})\b/);
  if (nummer && gliederung.some((e) => e.nummer === nummer[1])) return nummer[1];

  let bester = '';
  let bestesGewicht = 0;
  let besterAnteil = 0;
  for (const eintrag of gliederung) {
    if (eintrag.art === 'uebergang') continue;
    const woerter = normalisiereLang(eintrag.thema)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);
    if (!woerter.length) continue;
    const treffer = woerter.filter((w) => gesucht.includes(w)).length;
    if (!treffer) continue;
    const anteil = treffer / woerter.length;
    // Bei gleichem Anteil gewinnt die tiefere Stelle - dort stehen die Masken.
    const gewicht = anteil + (eintrag.ebene || 1) * 0.001;
    if (gewicht > bestesGewicht) {
      bestesGewicht = gewicht;
      besterAnteil = anteil;
      bester = eintrag.nummer;
    }
  }
  // Die Hälfte der Wörter ist ein Zufall, kein Treffer - es braucht mehr.
  return besterAnteil > 0.5 ? bester : '';
}

/* ============================================================ Video (1.55.0)

   Ein Bildschirmvideo ist eine Folge von Masken - und genau die braucht ein
   Handbuch. Was die Seite daraus macht: Einzelbilder in voller Auflösung,
   an den Stellen, an denen sich etwas geändert hat.

   Was sie *nicht* kann, steht ausdrücklich da: ein Video irgendwo abholen.
   Die Seite darf nichts aus dem Netz laden (Inhaltsrichtlinie des
   Artifacts), und Clipchamp gibt seine Projekte nur über den eigenen
   Export heraus. Der Weg ist: dort als MP4 exportieren, die Datei hier
   ablegen. Alles Weitere geschieht im Browser, ohne dass die Datei ihn
   verlässt.
   ========================================================================= */

/** Was ein Browser üblicherweise abspielt. MOV und MKV je nach Browser. */
export const VIDEO_FORMATE = ['mp4', 'webm', 'ogv', 'ogg', 'm4v', 'mov', 'mkv'];

export function istVideo(name) {
  const text = String(name || '').toLowerCase();
  return VIDEO_FORMATE.some((art) => text.endsWith('.' + art));
}

/** Sekunden als Zeitangabe: 83,4 wird zu „01:23,4". */
export function zeitText(sekunden) {
  const zahl = Number(sekunden);
  if (!Number.isFinite(zahl) || zahl < 0) return '00:00,0';
  const ganz = Math.floor(zahl);
  const zehntel = Math.min(9, Math.floor((zahl - ganz) * 10));
  const minuten = Math.floor(ganz / 60);
  const rest = ganz % 60;
  return `${String(minuten).padStart(2, '0')}:${String(rest).padStart(2, '0')},${zehntel}`;
}

/** Dieselbe Zeit für einen Dateinamen: ohne Doppelpunkt und Komma. */
export function zeitKennung(sekunden) {
  return zeitText(sekunden).replace(':', 'm').replace(',', 's');
}

/**
 * Die Zeitpunkte, an denen das Video abgetastet wird - gleichmäßig verteilt,
 * der erste nicht bei 0 und der letzte nicht am Ende: ein Videoanfang ist oft
 * schwarz, und hinter dem letzten Bild liegt bei manchen Formaten nichts mehr.
 */
export function videoSchritte(dauer, anzahl = 24, { ab = 0, bis = 0 } = {}) {
  const laenge = Number(dauer);
  if (!Number.isFinite(laenge) || laenge <= 0) return [];
  const menge = Math.max(1, Math.floor(anzahl));
  const start = Math.max(0, Math.min(Number(ab) || 0, laenge));
  const ende = bis > start ? Math.min(Number(bis), laenge) : laenge;
  const spanne = ende - start;
  if (spanne <= 0) return [Number(start.toFixed(3))];
  // Die Mitte jedes Abschnitts - so liegt kein Punkt auf einem Schnitt.
  return Array.from({ length: menge }, (unbenutzt, i) =>
    Number((start + (spanne * (i + 0.5)) / menge).toFixed(3))
  );
}

/**
 * Aus abgetasteten Bildern die behalten, die etwas Neues zeigen. Das erste
 * zählt immer; jedes weitere nur, wenn es sich vom zuletzt behaltenen
 * deutlich genug unterscheidet. Gemessen wird mit `bildUnterschied` - also
 * an Bildpunkten, nicht an Bedeutung.
 *
 * `bilder` sind `{ zeit, daten, breite, hoehe }` wie von einer Leinwand.
 */
export function videoWahl(bilder = [], { anteil = 0.002, hoechstens = 0 } = {}) {
  const liste = bilder.filter((b) => b && Number.isFinite(Number(b.zeit)));
  if (!liste.length) return [];
  const gewaehlt = [{ zeit: liste[0].zeit, anteil: 1, bereich: null, grund: 'erstes Bild' }];
  let letztes = liste[0];
  for (let i = 1; i < liste.length; i++) {
    const ergebnis = bildUnterschied(letztes, liste[i]);
    // Ohne Vergleich (andere Maße, fehlende Punkte) wird behalten, nicht
    // verworfen: ein Bild zu viel ist besser als ein fehlendes.
    const wert = ergebnis.ok ? ergebnis.anteil : 1;
    if (ergebnis.ok && wert < anteil) continue;
    gewaehlt.push({
      zeit: liste[i].zeit,
      anteil: wert,
      // Wo sich etwas geaendert hat - der Fingerzeig fuers Blatt.
      bereich: bereichAusVergleich(ergebnis),
      grund: ergebnis.ok ? unterschiedText(ergebnis) : ergebnis.grund
    });
    letztes = liste[i];
  }
  if (hoechstens > 0 && gewaehlt.length > hoechstens) {
    // Zu viele: die mit der größten Änderung behalten, das erste immer.
    const rest = gewaehlt
      .slice(1)
      .sort((a, b) => b.anteil - a.anteil)
      .slice(0, hoechstens - 1)
      .sort((a, b) => a.zeit - b.zeit);
    return [gewaehlt[0], ...rest];
  }
  return gewaehlt;
}

/**
 * Was dieser Browser abspielt, in einem Satz. Clipchamp exportiert MP4 mit
 * H.264 - und ausgerechnet das fehlt manchen Browsern unter Linux, weil der
 * Verfahrensschutz an der Auslieferung haengt. Darum wird gefragt, bevor
 * jemand eine Datei ablegt, und nicht erst danach.
 *
 * `kann` ist `{ mp4, webm }` mit den Antworten von `canPlayType`
 * ('probably', 'maybe' oder '').
 */
export function videoFormatBericht(kann = {}) {
  const mp4 = Boolean(kann.mp4);
  const webm = Boolean(kann.webm);
  if (mp4 && webm) return { ok: true, text: 'Dieser Browser spielt MP4 (H.264) und WebM – aus Clipchamp genügt der übliche MP4-Export.' };
  if (mp4) return { ok: true, text: 'Dieser Browser spielt MP4 (H.264) – aus Clipchamp genügt der übliche MP4-Export.' };
  if (webm) {
    return {
      ok: false,
      text:
        'Dieser Browser spielt kein MP4 (H.264), nur WebM. Das kommt unter Linux vor, wo der Browser ohne dieses ' +
        'Verfahren ausgeliefert wird. Entweder die Seite in Chrome, Edge oder Safari öffnen, oder das Video ' +
        'vorher in WebM umwandeln.'
    };
  }
  return {
    ok: false,
    text: 'Dieser Browser meldet, dass er weder MP4 noch WebM abspielt. Dann geht hier kein Video – bitte eine andere Anwendung oder einen anderen Browser verwenden.'
  };
}

/** Bis zu dieser Groesse lohnt der zweite Weg ueber eine Datenadresse. */
export const VIDEO_ZWEITER_WEG = 8 * 1024 * 1024;

/**
 * Warum ein Video nicht laeuft - und zwar nur das, was man wissen kann.
 *
 * Der erste Entwurf gab hier immer die Auskunft ueber die Formate aus. Das
 * ist falsch, sobald der Browser sagt, er *koenne* das Format: dann liegt
 * es nicht am Verfahren, und "als MP4 exportieren" waere ein Rat ins Leere.
 * Was es stattdessen ist, laesst sich von hier aus nicht entscheiden - also
 * wird es auch nicht behauptet.
 *
 * `kann` ist `{ mp4, webm }` wie bei `videoFormatBericht`.
 */
export function videoFehlerBericht({ kann = {}, typ = '', groesse = 0, zweiterWegGenutzt = false } = {}) {
  const art = String(typ || '').toLowerCase();
  const istMp4 = art.includes('mp4') || art.includes('quicktime');
  const istWebm = art.includes('webm') || art.includes('ogg');
  // Nur wenn der Browser das Verfahren wirklich nicht kennt, ist es das.
  const formatSchuld = (istMp4 && !kann.mp4) || (istWebm && !kann.webm) || (!istMp4 && !istWebm && !kann.mp4 && !kann.webm);
  if (formatSchuld) return { grund: 'format', text: videoFormatBericht(kann).text };
  if (!zweiterWegGenutzt && groesse > 0 && groesse <= VIDEO_ZWEITER_WEG) {
    return { grund: 'zweiter-weg', text: 'Der erste Weg hat nicht geöffnet – es wird ein zweiter versucht …' };
  }
  return {
    grund: 'unbekannt',
    text:
      'Dieser Browser gibt an, das Format zu kennen – es liegt also nicht daran. ' +
      'Möglich ist eine beschädigte Datei, ein Film ohne Bildspur, oder eine Umgebung, ' +
      'die der Seite das Abspielen aus dem Arbeitsspeicher verwehrt. ' +
      'Was hilft: die Datei in einem anderen Player öffnen – läuft sie dort, liegt es an dieser Umgebung, ' +
      'und die Bilder lassen sich über das Register Import einzeln hereinholen.'
  };
}

/**
 * Die veraenderten Bereiche zu *einem* Rahmen, in Anteilen der Bildflaeche
 * (0..1). Warum ueberhaupt: in einem Quick Guide steht ein Bildschirmfoto
 * von 1280 x 720 in einer Spalte von neun Zentimetern. Wer darauf ein
 * ausgefuelltes Feld finden soll, braucht einen Fingerzeig - und wo zu
 * zeigen ist, hat der Vergleich schon ausgerechnet.
 *
 * Winzige Nebenschauplaetze (ein wandernder Mauszeiger) bleiben draussen:
 * gezaehlt wird nur, was mindestens ein Zehntel der veraenderten Flaeche
 * ausmacht. Ein Rahmen um alles waere kein Fingerzeig.
 */
export function bereichAusVergleich(ergebnis = {}, { anteilDerGroessten = 0.25, hoechstens = 0.5 } = {}) {
  if (!ergebnis.ok || !Array.isArray(ergebnis.bereiche) || !ergebnis.bereiche.length) return null;
  const breite = Math.max(1, ergebnis.breite || 1);
  const hoehe = Math.max(1, ergebnis.hoehe || 1);
  const sortiert = [...ergebnis.bereiche].sort((a, b) => (b.kacheln || 0) - (a.kacheln || 0));
  const groesste = sortiert[0].kacheln || 1;

  // Der groesste Bereich ist gesetzt; jeder weitere kommt nur dazu, wenn er
  // selbst ins Gewicht faellt *und* den Rahmen nicht aufblaeht. Sonst waere
  // ein wandernder Mauszeiger am anderen Bildrand genug, um aus dem
  // Fingerzeig einen Rahmen um alles zu machen.
  let kasten = { links: sortiert[0].x, oben: sortiert[0].y, rechts: sortiert[0].x + sortiert[0].breite, unten: sortiert[0].y + sortiert[0].hoehe };
  let teile = 1;
  for (const b of sortiert.slice(1)) {
    if ((b.kacheln || 0) < groesste * anteilDerGroessten) continue;
    const versuch = {
      links: Math.min(kasten.links, b.x),
      oben: Math.min(kasten.oben, b.y),
      rechts: Math.max(kasten.rechts, b.x + b.breite),
      unten: Math.max(kasten.unten, b.y + b.hoehe)
    };
    const flaeche = ((versuch.rechts - versuch.links) * (versuch.unten - versuch.oben)) / (breite * hoehe);
    if (flaeche > hoechstens) continue;
    kasten = versuch;
    teile += 1;
  }
  return {
    x: Math.max(0, kasten.links / breite),
    y: Math.max(0, kasten.oben / hoehe),
    breite: Math.min(1, (kasten.rechts - kasten.links) / breite),
    hoehe: Math.min(1, (kasten.unten - kasten.oben) / hoehe),
    teile
  };
}

/**
 * Derselbe Rahmen in Bildpunkten eines Bildes, mit etwas Luft darum. Ein
 * Rahmen, der fast das ganze Bild umfasst, sagt nichts - dann kommt keiner.
 */
export function rahmenAusBereich(bereich, breite, hoehe, { luft = 0.012, hoechstens = 0.82 } = {}) {
  if (!bereich || !breite || !hoehe) return null;
  if (bereich.breite * bereich.hoehe > hoechstens) return null;
  const x = Math.max(0, Math.round((bereich.x - luft) * breite));
  const y = Math.max(0, Math.round((bereich.y - luft) * hoehe));
  const b = Math.min(breite - x, Math.round((bereich.breite + luft * 2) * breite));
  const h = Math.min(hoehe - y, Math.round((bereich.hoehe + luft * 2) * hoehe));
  return b > 2 && h > 2 ? { x, y, breite: b, hoehe: h } : null;
}

/** Der Name eines herausgenommenen Bildes - Datei, Nummer, Zeit. */
export function videoBildname(dateiname, zeit, nummer = 1) {
  const stamm =
    String(dateiname || 'video')
      .replace(/\.[^.]+$/, '')
      .replace(/[^0-9A-Za-zÄÖÜäöüß _-]+/g, '')
      .trim() || 'video';
  return `${stamm} ${String(nummer).padStart(2, '0')} ${zeitKennung(zeit)}`;
}

/**
 * Die Aufforderung an Claude: aus den Bildern eines Bildschirmvideos einen
 * Text fürs Handbuch. Gefragt wird nach einem Satz je Bild - was der
 * Benutzer an dieser Stelle tut -, nicht nach einer Bildbeschreibung.
 */
export function videoAufforderung(bild = {}, { titel = '', stelle = '', nummer = 1, von = 1 } = {}) {
  return [
    'Du siehst ein Einzelbild aus einem Bildschirmvideo der Anwendung oneSCM (Mercedes-Benz, Servicevertragswesen).',
    von > 1 ? `Es ist Bild ${nummer} von ${von} einer Folge; die Bilder laufen zeitlich hintereinander.` : '',
    'Schreibe in höchstens zwei Sätzen, was der Benutzer an dieser Stelle tut – als Anweisung für ein Benutzerhandbuch,',
    'im Imperativ und auf Deutsch („Im Feld Vertragsnummer die Nummer eingeben und auf Suchen klicken.").',
    'Nenne Masken, Felder und Schaltflächen bei ihrem sichtbaren Namen. Deute nichts hinein, was nicht zu sehen ist.',
    'Ist auf dem Bild keine Handlung zu erkennen, schreibe nur, welche Maske zu sehen ist.',
    'Antworte nur mit dem Text, ohne Einleitung, ohne Nummer und ohne Schlusssatz.',
    titel ? `Titel des Videos: ${titel}` : '',
    stelle ? `Stelle im Handbuch: ${stelle}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Was von einer Antwort übrig bleibt: ein Satz, ohne Nummer davor und ohne
 * Anführungszeichen drumherum. Eine leere Antwort bleibt leer - erfunden
 * wird nichts.
 */
export function videoText(antwort) {
  return String(antwort || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/^(?:bild\s*)?\d+[.):]\s*/i, '')
    .replace(/^[„"'»]/, '')
    .replace(/[“"'«]$/, '')
    .trim();
}

/** Was unten in der Ansicht steht: wie viele Bilder, über welche Spanne. */
export function videoStand(bilder = [], dauer = 0) {
  if (!bilder.length) return 'noch kein Bild herausgenommen';
  const zeiten = bilder.map((b) => Number(b.zeit) || 0);
  const gedeutet = bilder.filter((b) => String(b.text || '').trim()).length;
  return (
    `${bilder.length} Bild${bilder.length === 1 ? '' : 'er'} · ` +
    `${zeitText(Math.min(...zeiten))} bis ${zeitText(Math.max(...zeiten))}` +
    (dauer ? ` von ${zeitText(dauer)}` : '') +
    (gedeutet ? ` · ${gedeutet} gedeutet` : '')
  );
}

/* ======================================== Gebrauch: die Probe (1.56.0)

   Die Durchsicht (1.50.0) nannte sechs Funktionen, die wahrscheinlich tot
   sind - und konnte es nicht entscheiden: *es gibt keine Nutzungsdaten.*
   Die Seite zaehlt nichts und schickt nichts weg, und das ist Absicht.

   Der zweite Teil davon bleibt. Der erste nicht: was jemand selbst benutzt,
   darf er selbst wissen. Darum zaehlt die Seite jetzt mit - im `localStorage`
   des eigenen Browsers, nirgendwo sonst. Nichts davon verlaesst den Rechner,
   nichts reist in der Projektdatei mit, und ein Knopf setzt alles zurueck.

   Damit wird aus "wahrscheinlich tot" eine Frage mit Antwort: nach ein paar
   Wochen Arbeit steht da, welcher Befehl nie gedrueckt wurde.

   Was sich so *nicht* messen laesst, steht ausdruecklich dabei: eine
   Kennzahlenleiste wird angesehen, nicht gedrueckt. Fuer sie gibt diese
   Probe nichts her - und behauptet es auch nicht.
   ========================================================================= */

export const GEBRAUCH_SCHLUESSEL = 'screenarchiv:gebrauch';

/** Ab wann ein Befehl als „benutzt" gilt und nicht mehr als Ausrutscher. */
export const GEBRAUCH_SELTEN = 3;

/**
 * Die Verdachtsfaelle der Durchsicht, mit dem Bedienelement, an dem sie
 * haengen. `messbar: false` heisst: das laesst sich durch Zaehlen nicht
 * beantworten - dann steht es als offene Frage da, nicht als Befund.
 */
export const BEOBACHTETE = [
  { kennung: 'modus:schieber', feature: 'F-06', label: 'Vergleichsart Schieber', wo: 'Beleg', messbar: true },
  { kennung: 'modus:nebeneinander', feature: 'F-06', label: 'Vergleichsart nebeneinander', wo: 'Beleg', messbar: true },
  { kennung: 'modus:ueberblendung', feature: 'F-06', label: 'Vergleichsart Überblendung', wo: 'Beleg', messbar: true },
  { kennung: 'modus:unterschied', feature: 'F-06', label: 'Vergleichsart Unterschied', wo: 'Beleg', messbar: true },
  { kennung: 'strecke-bpmn', feature: 'F-41', label: 'Prozess als BPMN', wo: 'Strecke', messbar: true },
  { kennung: 'beleg-oeffnen', feature: 'F-29', label: 'Beleg bilden', wo: 'Eingang', messbar: true },
  { kennung: 'details:faehigkeiten', feature: 'F-30', label: '„Was hier geht" aufgeklappt', wo: 'Ausschneiden', messbar: true },
  { kennung: 'eingang-kontaktbogen', feature: 'F-23', label: 'Kontaktbogen sichern', wo: 'Eingang', messbar: true },
  { kennung: '', feature: 'F-08/F-09', label: 'Kennzahlenvergleich und Kennzahlenleiste', wo: 'Archiv', messbar: false }
];

const leererStand = (seit) => ({ seit: seit || '', befehle: {}, ansichten: {} });

/** Der Stand aus dem Speicher; ein unlesbarer gilt als keiner. */
export function leseGebrauch(roh, heute = '') {
  try {
    const daten = JSON.parse(roh || 'null');
    if (!daten || typeof daten !== 'object') return leererStand(heute);
    const zahlen = (teil) =>
      Object.fromEntries(
        Object.entries(teil && typeof teil === 'object' ? teil : {})
          .filter(([, wert]) => Number.isFinite(Number(wert)) && Number(wert) > 0)
          .map(([name, wert]) => [String(name), Math.floor(Number(wert))])
      );
    return {
      seit: typeof daten.seit === 'string' ? daten.seit : heute,
      befehle: zahlen(daten.befehle),
      ansichten: zahlen(daten.ansichten)
    };
  } catch (fehler) {
    return leererStand(heute);
  }
}

export function schreibeGebrauch(stand) {
  return JSON.stringify(stand && typeof stand === 'object' ? stand : leererStand(''));
}

/**
 * Einen Druck zaehlen. Gibt einen neuen Stand zurueck - der alte bleibt, wie
 * er war, damit sich das ohne Browser pruefen laesst.
 */
export function zaehleGebrauch(stand, art, kennung, heute = '') {
  const name = String(kennung || '').trim();
  const fach = art === 'ansicht' ? 'ansichten' : 'befehle';
  if (!name) return stand;
  const alt = stand && typeof stand === 'object' ? stand : leererStand(heute);
  return {
    seit: alt.seit || heute,
    befehle: { ...alt.befehle },
    ansichten: { ...alt.ansichten },
    [fach]: { ...alt[fach], [name]: (alt[fach][name] || 0) + 1 }
  };
}

/** Wie viele Tage zwischen zwei Datumsangaben liegen - mindestens einer. */
export function tageSeit(seit, heute) {
  const a = Date.parse(seit || '');
  const b = Date.parse(heute || '');
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.max(1, Math.round((b - a) / 86400000));
}

/**
 * Was die Zaehlung ueber die Verdachtsfaelle sagt. Sie urteilt nicht - sie
 * sortiert: nie gedrueckt, selten gedrueckt, benutzt. Und sie sagt, wie
 * lange gezaehlt wurde, weil eine Woche nichts beweist.
 */
export function gebrauchBericht(stand = {}, heute = '', { selten = GEBRAUCH_SELTEN } = {}) {
  const befehle = (stand && stand.befehle) || {};
  const ansichten = (stand && stand.ansichten) || {};
  const tage = tageSeit(stand && stand.seit, heute);
  const gesamt = Object.values(befehle).reduce((summe, z) => summe + z, 0);

  const mitZahl = BEOBACHTETE.filter((b) => b.messbar).map((b) => ({ ...b, zahl: befehle[b.kennung] || 0 }));
  const bericht = {
    tage,
    gesamt,
    ansichten: Object.entries(ansichten)
      .map(([name, zahl]) => ({ name, zahl }))
      .sort((a, b) => b.zahl - a.zahl),
    nie: mitZahl.filter((b) => b.zahl === 0),
    selten: mitZahl.filter((b) => b.zahl > 0 && b.zahl < selten),
    benutzt: mitZahl.filter((b) => b.zahl >= selten),
    nichtMessbar: BEOBACHTETE.filter((b) => !b.messbar)
  };
  // Je nach Lage ein anderer Satz - und nie ein Urteil ohne Grundlage.
  if (!gesamt) {
    bericht.urteil = 'Noch nichts gezählt. Die Probe beginnt mit dem ersten Befehl.';
  } else if (tage < 7) {
    bericht.urteil = `Erst ${tage} ${tage === 1 ? 'Tag' : 'Tage'} und ${gesamt} ${gesamt === 1 ? 'Befehl' : 'Befehle'} – zu wenig für ein Urteil. Nach ein paar Wochen Arbeit sagt diese Liste etwas.`;
  } else if (!bericht.nie.length) {
    bericht.urteil = `In ${tage} Tagen wurde jeder beobachtete Befehl mindestens einmal gebraucht. Kein Fall zum Entfernen.`;
  } else {
    bericht.urteil =
      `In ${tage} Tagen und ${gesamt} ${gesamt === 1 ? 'Befehl' : 'Befehlen'} nie gedrückt: ` +
      `${bericht.nie.map((b) => b.label).join(', ')}. Das ist ein Grund zu fragen, nicht zu löschen.`;
  }
  return bericht;
}

/** Dieselbe Auskunft als Text - für den Bericht der Prüfung. */
export function gebrauchText(bericht = {}) {
  const zeilen = ['Gebrauch', '='.repeat(8), '', bericht.urteil || '', ''];
  const block = (titel, liste) => {
    if (!liste || !liste.length) return;
    zeilen.push(titel);
    for (const eintrag of liste) {
      zeilen.push(`  ${eintrag.feature}  ${eintrag.label} (${eintrag.wo})` + (eintrag.zahl === undefined ? '' : ` – ${eintrag.zahl}×`));
    }
    zeilen.push('');
  };
  block('Nie gedrückt', bericht.nie);
  block('Selten gedrückt', bericht.selten);
  block('Benutzt', bericht.benutzt);
  block('Durch Zählen nicht zu beantworten', bericht.nichtMessbar);
  if (bericht.ansichten && bericht.ansichten.length) {
    zeilen.push('Ansichten geöffnet');
    for (const a of bericht.ansichten) zeilen.push(`  ${a.name} – ${a.zahl}×`);
    zeilen.push('');
  }
  zeilen.push('Diese Zahlen stehen allein im Browser dieses Rechners.');
  return zeilen.join('\n');
}

/**
 * Aus uebernommenen Videobildern eine Strecke. Ein Bildschirmvideo *ist*
 * eine Klickstrecke - die Reihenfolge steckt schon drin und soll nicht von
 * Hand nachgebaut werden. Der gedeutete Text wird zur Anweisung des
 * Schritts.
 *
 * `bilder` sind `{ uebernommen, zeit, text }` in zeitlicher Folge; ohne
 * Kennung im Eingang kann ein Bild kein Schritt werden und faellt weg.
 */
export function streckeAusVideo(bilder = [], name = '', zeit = Date.now()) {
  const folge = bilder
    .filter((b) => b && b.uebernommen)
    .slice()
    .sort((a, b) => (Number(a.zeit) || 0) - (Number(b.zeit) || 0));
  const strecke = leereStrecke(name || 'Video', zeit);
  return { ...strecke, schritte: folge.map((b) => streckeSchritt(b.uebernommen, String(b.text || '').trim())) };
}

/** Der Name einer Strecke aus einem Video: der Dateiname ohne Endung. */
export function streckenNameAusVideo(dateiname) {
  return (
    String(dateiname || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Video'
  );
}

/* ============================ Durchgänge im Video (1.59.0) ===============

   Beides, was dieses Register tut, ist *nicht sicher*: welche Stellen ein
   Abtasten behaelt, haengt an drei Reglern und am Film; was Claude in einem
   Bild sieht, ist eine Deutung. Ein Durchgang kann danebengehen, und das
   ist kein Fehler, sondern die Natur der Sache.

   Was daraus folgt, ist nicht "besser raten", sondern: den Durchgang
   festhalten. Jeder Lauf merkt sich, *mit welchen Einstellungen* er lief
   und *was dabei herauskam*. Dann laesst sich vergleichen, zuruecknehmen
   und gezielt eine Stellschraube drehen - statt noch einmal von vorn zu
   raten.

   Drei Dinge, die ein Lauf beantworten muss:
     1. Was habe ich geaendert?        -> `laufVergleich`
     2. Was hat es gebracht?           -> dieselbe Auskunft, mit Zahlen
     3. Was soll ich als naechstes aendern?  -> `laufDiagnose`
   ========================================================================= */

export const VORGEHEN_SCHLUESSEL = 'screenarchiv:videovorgehen';

/** Die Stufen, die `sample` kennt - teurer heisst gruendlicher, nicht wahrer. */
export const MODELLSTUFEN = [
  { id: 'quick', label: 'schnell', erklaerung: 'kurze Antworten, für viele Bilder' },
  { id: 'default', label: 'normal', erklaerung: 'die Vorgabe' },
  { id: 'complex', label: 'gründlich', erklaerung: 'für dichte Masken mit viel Text' }
];

/** Die Regler des Abtastens, mit Namen fuer den Vergleich zweier Laeufe. */
export const LAUF_REGLER = [
  { id: 'anzahl', label: 'Abtastung', einheit: ' Stellen' },
  { id: 'anteil', label: 'Schwelle', einheit: '', alsProzent: true },
  { id: 'hoechstens', label: 'Höchstens', einheit: ' Bilder', null: 'alle' }
];

/** Ein Lauf, wie er in der Liste steht. Reine Angaben, keine Bilder. */
export function videoLauf(nummer, art, einstellungen = {}, ergebnis = {}) {
  return {
    nummer: Math.max(1, Math.floor(Number(nummer) || 1)),
    art: art === 'deutung' ? 'deutung' : 'abtastung',
    zeit: new Date().toISOString(),
    einstellungen: { ...einstellungen },
    ergebnis: { ...ergebnis }
  };
}

const reglerText = (regler, wert) => {
  if (regler.null !== undefined && !wert) return regler.null;
  if (regler.alsProzent) return String(Number(wert) * 100).replace('.', ',') + ' %';
  return `${wert}${regler.einheit || ''}`;
};

/** Die Einstellungen eines Laufs in einer Zeile. */
export function laufText(lauf = {}) {
  if (lauf.art === 'deutung') {
    const stufe = MODELLSTUFEN.find((m) => m.id === lauf.einstellungen.stufe);
    return `Deutung · ${(stufe && stufe.label) || lauf.einstellungen.stufe || 'normal'}`;
  }
  return LAUF_REGLER.map((r) => `${r.label} ${reglerText(r, lauf.einstellungen[r.id])}`).join(' · ');
}

/**
 * Was sich zwischen zwei Laeufen geaendert hat - und was es gebracht hat.
 * Ohne Vorgaenger gibt es nichts zu vergleichen; das ist keine Antwort, die
 * erfunden werden muesste.
 */
export function laufVergleich(lauf = {}, vorher = null) {
  if (!vorher) return '';
  if (lauf.art !== vorher.art) return '';
  const aenderungen = [];
  if (lauf.art === 'abtastung') {
    for (const regler of LAUF_REGLER) {
      const a = vorher.einstellungen[regler.id];
      const b = lauf.einstellungen[regler.id];
      if (String(a) !== String(b)) {
        aenderungen.push(`${regler.label} ${reglerText(regler, a)} → ${reglerText(regler, b)}`);
      }
    }
  } else if (lauf.einstellungen.stufe !== vorher.einstellungen.stufe) {
    aenderungen.push(`Stufe ${vorher.einstellungen.stufe} → ${lauf.einstellungen.stufe}`);
  }
  const alt = Number(vorher.ergebnis.zahl) || 0;
  const neu = Number(lauf.ergebnis.zahl) || 0;
  const wirkung = alt === neu ? `gleich viele (${neu})` : `${alt} → ${neu}`;
  if (!aenderungen.length) {
    // Dieselben Regler, ein anderes Ergebnis: das liegt am Film, nicht an
    // der Einstellung - und dann ist es gut, das zu wissen.
    return alt === neu ? 'nichts geändert, gleiches Ergebnis' : `nichts geändert, trotzdem ${wirkung}`;
  }
  return `${aenderungen.join(', ')} · ${wirkung}`;
}

/**
 * Welche Stellschraube als naechstes zu drehen ist. Die Antwort nennt *eine*
 * Groesse, nicht drei - wer drei auf einmal dreht, weiss hinterher nicht,
 * welche gewirkt hat.
 */
export function laufDiagnose(lauf = {}) {
  const e = lauf.ergebnis || {};
  const s = lauf.einstellungen || {};
  if (lauf.art === 'deutung') {
    if (!e.zahl) return { ok: false, text: 'Kein Bild gedeutet. Erst prüfen, ob Claude hier Bilder sehen darf.' };
    if (e.gescheitert) {
      return { ok: false, text: `${e.gescheitert} Bild(er) ohne Antwort. Weniger auf einmal senden, oder die Stufe auf „gründlich" stellen.` };
    }
    return { ok: true, text: `${e.zahl} gedeutet. Was nicht stimmt, lässt sich im Feld ändern – es bleibt eine Deutung.` };
  }
  if (!e.zahl) {
    return {
      ok: false,
      text:
        'Nichts gefunden. Eine Größe ändern, nicht drei: zuerst die Schwelle senken ' +
        `(jetzt ${reglerText(LAUF_REGLER[1], s.anteil)}) – erst wenn das nichts bringt, feiner abtasten.`
    };
  }
  if (e.zahl === 1 && (Number(s.anzahl) || 0) > 12) {
    return { ok: false, text: 'Nur das erste Bild. Das Video ändert sich kaum, oder die Schwelle ist zu hoch – sie zuerst senken.' };
  }
  if (s.hoechstens && e.gefunden > s.hoechstens) {
    return {
      ok: false,
      text: `${e.gefunden} gefunden, ${s.hoechstens} behalten – die Grenze hat geschnitten. Entweder sie anheben oder die Schwelle erhöhen.`
    };
  }
  if (e.zahl >= (Number(s.anzahl) || 0) * 0.8) {
    return { ok: false, text: 'Fast jede abgetastete Stelle zählt als Änderung – die Schwelle ist zu niedrig, oder im Film bewegt sich dauernd etwas (ein Mauszeiger genügt).' };
  }
  return { ok: true, text: `${e.zahl} Bilder aus ${s.anzahl} Stellen – ein brauchbarer Durchgang.` };
}

/* --------------------------- Das Vorgehen: einmal einrichten, wiederverwenden */

/**
 * Was ueber ein einzelnes Video hinaus gilt: die Aufforderung an Claude, die
 * Modellstufe und die Regler, mit denen begonnen wird. Beim naechsten Film
 * steht dasselbe da - darin liegt der Unterschied zwischen einem Einfall
 * und einem Vorgehen.
 */
export const STANDARD_VORGEHEN = {
  aufforderung: '',
  stufe: 'default',
  anzahl: 24,
  // 0,2 % und nicht 2 %: an einem Messfilm mit bekannten Aenderungen gemessen
  // (Testing/messungen). Bei 2 % wurden 3 von 10 Aenderungen gefunden, bei
  // 0,2 % alle zehn. Ein ausgefuelltes Feld ist in einer Maske von
  // 1280 x 720 nur zwei Promille der Flaeche.
  anteil: 0.002,
  hoechstens: 20
};

export function leseVorgehen(text) {
  try {
    const roh = JSON.parse(text || 'null');
    if (!roh || typeof roh !== 'object') return { ...STANDARD_VORGEHEN };
    const zahl = (wert, ersatz) => (Number.isFinite(Number(wert)) && Number(wert) >= 0 ? Number(wert) : ersatz);
    return {
      aufforderung: typeof roh.aufforderung === 'string' ? roh.aufforderung : '',
      stufe: MODELLSTUFEN.some((m) => m.id === roh.stufe) ? roh.stufe : STANDARD_VORGEHEN.stufe,
      anzahl: zahl(roh.anzahl, STANDARD_VORGEHEN.anzahl),
      anteil: zahl(roh.anteil, STANDARD_VORGEHEN.anteil),
      hoechstens: zahl(roh.hoechstens, STANDARD_VORGEHEN.hoechstens)
    };
  } catch (fehler) {
    return { ...STANDARD_VORGEHEN };
  }
}

export function schreibeVorgehen(vorgehen) {
  return JSON.stringify({ ...STANDARD_VORGEHEN, ...(vorgehen || {}) });
}

/** Die Durchgänge als Text - zum Weitergeben, was gewirkt hat. */
export function laeufeText(laeufe = [], titel = '') {
  const zeilen = [`Durchgänge${titel ? ' – ' + titel : ''}`, '='.repeat(12), ''];
  if (!laeufe.length) zeilen.push('Noch kein Durchgang.');
  laeufe.forEach((lauf, i) => {
    zeilen.push(`V${lauf.nummer}  ${laufText(lauf)}`);
    zeilen.push(`     Ergebnis: ${lauf.ergebnis.zahl || 0}`);
    const vergleich = laufVergleich(lauf, laeufe[i - 1] || null);
    if (vergleich) zeilen.push(`     Geändert: ${vergleich}`);
    zeilen.push(`     ${laufDiagnose(lauf).text}`);
    zeilen.push('');
  });
  return zeilen.join('\n');
}

/** Sucht in Nummer und Thema; ohne Suchtext kommt alles zurueck. */
export function sucheGliederung(eintraege = [], text) {
  const gesucht = normalisiereLang(String(text || ''));
  if (!gesucht) return eintraege;
  const teile = gesucht.split(/\s+/);
  return eintraege.filter((e) => {
    const heuhaufen = normalisiereLang(`${e.nummer} ${e.thema}`);
    return teile.every((t) => heuhaufen.includes(t));
  });
}

/**
 * Die Vorfahren einer Stelle samt ihr selbst: „7.5.2" wird zu
 * `['7', '7.5', '7.5.2']`. Damit laesst sich eine Auswahl Kapitel →
 * Unterkapitel → Stelle fuellen, ohne die Gliederung zu durchsuchen.
 */
export function stelleTeile(nummer) {
  const text = String(nummer || '').trim();
  if (!text) return [];
  const teile = text.split('.');
  return teile.map((_, i) => teile.slice(0, i + 1).join('.'));
}

/**
 * Die Eintraege einer Ebene - wahlweise nur unterhalb einer Stelle. Daraus
 * entstehen die Auswahlfelder: Kapitel (Ebene 1), Unterkapitel (Ebene 2),
 * Stelle (Ebene 3). Uebergaenge sind keine Stellen und fallen weg.
 */
export function gliederungEbene(eintraege = [], ebene = 1, eltern = '') {
  return eintraege.filter(
    (e) =>
      e.art !== 'uebergang' &&
      e.ebene === ebene &&
      (!eltern || (gehoertZu(e.nummer, eltern) && e.nummer !== eltern))
  );
}

/** Nummer und Thema in einer Zeile - so steht eine Stelle in jeder Auswahl. */
export function stelleLabel(eintrag) {
  if (!eintrag) return '';
  return `${eintrag.nummer}  ${eintrag.thema}`;
}

/** Die Stelle mit ihrem Thema, wie sie an einem Bild steht. */
export function gliederungKennung(eintraege = [], nummer) {
  const stelle = String(nummer || '').trim();
  if (!stelle) return '';
  const treffer = eintraege.find((e) => e.nummer === stelle);
  return treffer ? `${treffer.nummer} ${treffer.thema}` : stelle;
}

/* --------------------------------- Nummerierung nach Kapitel und Zeit */

/**
 * Jedes Bild bekommt eine Stelle in der Gliederung: Kapitel und Unterkapitel.
 * Die Nummer traegt die Ordnung einer Anleitung - "2.3" steht zwischen "2.2"
 * und "2.4", unabhaengig davon, wann das Bild entstanden ist.
 */
export function kapitelKennung(aufnahme = {}) {
  // Seit 1.21.0 traegt eine Aufnahme ihre Stelle in der Gliederung des
  // Handbuchs; die beiden Zahlen von 1.18.0 gelten weiter, wenn keine da ist.
  const stelle = String(aufnahme.gliederung || '').trim();
  if (stelle) return stelle;
  const kapitel = Number(aufnahme.kapitel);
  if (!Number.isFinite(kapitel) || kapitel <= 0) return '';
  const unter = Number(aufnahme.unterkapitel);
  return Number.isFinite(unter) && unter > 0 ? `${kapitel}.${unter}` : String(kapitel);
}

/** Die naechste freie Unterkapitelnummer in einem Kapitel. */
export function naechsteUnterkapitelnummer(liste = [], kapitel) {
  const zahl = Number(kapitel);
  if (!Number.isFinite(zahl) || zahl <= 0) return 1;
  return (
    liste
      .filter((a) => Number(a.kapitel) === zahl)
      .reduce((hoechste, a) => Math.max(hoechste, Number(a.unterkapitel) || 0), 0) + 1
  );
}

/** Sortiert nach Gliederung; was keine Nummer hat, steht hinten. */
/**
 * Vergleicht zwei Gliederungsnummern Teil fuer Teil: „6.2" steht vor „6.10",
 * und „A.1" neben Zahlen. Der Vergleich ist die Grundlage fuer die Frage, ob
 * eine Folge gegen die Gliederung laeuft.
 */
export function vergleicheKapitel(a, b) {
  const teile = (text) => String(text || '').split('.').map((t) => (/^\d+$/.test(t) ? Number(t) : t));
  const x = teile(a);
  const y = teile(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i];
    const q = y[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (typeof p === 'number' && typeof q === 'number') {
      if (p !== q) return p - q;
    } else if (String(p) !== String(q)) {
      return String(p).localeCompare(String(q));
    }
  }
  return 0;
}

export function sortiereNachKapitel(liste = []) {
  const schluessel = (a) => [Number(a.kapitel) || 9999, Number(a.unterkapitel) || 9999];
  return [...liste].sort((a, b) => {
    const [ka, ua] = schluessel(a);
    const [kb, ub] = schluessel(b);
    return ka - kb || ua - ub || String(a.id).localeCompare(String(b.id));
  });
}

/** Zeitstempel in der Schreibweise dieser Seite: 17.10.2026, 08:14. */
export function formatiereZeitpunkt(iso) {
  const text = String(iso || '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return formatiereDatum(text.slice(0, 10));
  const [tag, zeit] = text.split('T');
  return `${formatiereDatum(tag)}, ${zeit.slice(0, 5)}`;
}

/**
 * Die Bildunterschrift, die in das Bild gebrannt wird: Gliederungsnummer,
 * Titel und Zeitpunkt. Ohne Nummer bleibt die Nummer weg, nicht die Zeile -
 * der Zeitpunkt ist der eigentliche Beleg.
 */
export function bildunterschrift(aufnahme = {}, zeitpunkt) {
  const nummer = kapitelKennung(aufnahme);
  const zeit = formatiereZeitpunkt(zeitpunkt || aufnahme.erfasst_am || aufnahme.datum);
  return [nummer, String(aufnahme.titel || '').trim(), zeit].filter(Boolean).join('  ·  ');
}

/* ------------------------------------- Marken: unkenntlich und erklaert */

export const MINDEST_MARKE = 8;
export const MARKEN_ARTEN = [
  {
    id: 'unkenntlich',
    label: 'Unkenntlich machen',
    hinweis: 'Personenbezogenes abdecken: Benutzerkennung, FIN, Adresse, Name.'
  },
  { id: 'rahmen', label: 'Rahmen', hinweis: 'Eine Bedienfläche hervorheben, mit oder ohne Beschriftung.' },
  { id: 'schritt', label: 'Schritt der Klickstrecke', hinweis: 'Nummerierter Rahmen mit Text – 1, 2, 3 …' },
  // Labels werden nicht aufgezogen, sondern aus den Angaben gesetzt - darum
  // stehen sie nicht in der Werkzeugleiste.
  { id: 'label', label: 'Label', hinweis: 'Sprache, Rolle, Sparte, Markt – aus den Angaben der Aufnahme.', intern: true }
];
export const WERKZEUGE = MARKEN_ARTEN.filter((a) => !a.intern);

export const UNKENNTLICH_STUFEN = [
  { id: 'grob', label: 'grob', raster: 24 },
  { id: 'mittel', label: 'mittel', raster: 12 },
  { id: 'fein', label: 'fein', raster: 6 }
];

export const istMarkenart = (art) => MARKEN_ARTEN.some((a) => a.id === art);

/** Die naechste freie Schrittnummer - Luecken werden nicht wiederverwendet. */
export function naechsteSchrittnummer(marken = []) {
  return (
    marken
      .filter((m) => m && m.art === 'schritt')
      .reduce((hoechste, m) => Math.max(hoechste, Number(m.nummer) || 0), 0) + 1
  );
}

/** Eine neue Marke; die Kennung traegt die Zeit, damit sie eindeutig bleibt. */
export function leereMarke(art, rechteck, marken = [], zeit = Date.now()) {
  return {
    id: `M-${zeit.toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`,
    art: istMarkenart(art) ? art : 'rahmen',
    x: Math.round(rechteck.x),
    y: Math.round(rechteck.y),
    breite: Math.round(rechteck.breite),
    hoehe: Math.round(rechteck.hoehe),
    text: '',
    stufe: 'mittel',
    nummer: art === 'schritt' ? naechsteSchrittnummer(marken) : null
  };
}

/** Verschiebt eine Marke; sie bleibt dabei vollstaendig im Bild. */
export function bewegeMarke(marke, dx, dy, quelle) {
  return begrenzeMarke(
    { x: marke.x + dx, y: marke.y + dy, breite: marke.breite, hoehe: marke.hoehe },
    quelle
  );
}

/** Haelt eine Marke im Bild und auf Mindestmass. */
export function begrenzeMarke(rechteck, quelle) {
  return begrenzeAusschnitt(rechteck, quelle, MINDEST_MARKE);
}

/**
 * Nummeriert die Schritte in der Reihenfolge, in der sie stehen, neu durch.
 * Nach dem Loeschen von Schritt 2 soll keine Luecke bleiben - eine
 * Klickstrecke mit 1, 3, 4 liest sich wie ein Fehler.
 */
export function nummeriereSchritte(marken = []) {
  let lauf = 0;
  return marken.map((m) => (m.art === 'schritt' ? { ...m, nummer: ++lauf } : m));
}

/** Zaehlt, was auf dem Bild liegt. */
export function markenZusammenfassung(marken = []) {
  const zaehle = (art) => marken.filter((m) => m && m.art === art).length;
  return {
    gesamt: marken.length,
    unkenntlich: zaehle('unkenntlich'),
    rahmen: zaehle('rahmen'),
    schritte: zaehle('schritt')
  };
}

/** Was an den Marken noch fehlt; ein Schritt ohne Text erklaert nichts. */
export function pruefeMarken(marken = []) {
  const probleme = [];
  for (const marke of marken) {
    if (marke.art === 'schritt' && !String(marke.text || '').trim()) {
      probleme.push({ id: marke.id, text: `Schritt ${marke.nummer} hat keinen Text.` });
    }
  }
  return probleme;
}

/** Die Klickstrecke als Text - fuer Kontaktbogen, Zettel und Zwischenablage. */
export function klickstreckeAlsText(marken = []) {
  return marken
    .filter((m) => m.art === 'schritt')
    .sort((a, b) => (a.nummer || 0) - (b.nummer || 0))
    .map((m) => `${m.nummer}. ${String(m.text || '').trim() || '(ohne Text)'}`)
    .join('\n');
}

/**
 * Die Marken, wie sie neben dem Bild abgelegt werden. Bewusst ohne Bilddaten:
 * sie beschreiben, was wo liegt, und lassen sich damit spaeter wieder
 * anzeigen oder aendern.
 */
export function markenAlsAblage(marken = []) {
  return marken.map((m) => ({
    id: m.id,
    art: m.art,
    x: m.x,
    y: m.y,
    breite: m.breite,
    hoehe: m.hoehe,
    text: String(m.text || '').trim(),
    stufe: m.art === 'unkenntlich' ? m.stufe || 'mittel' : undefined,
    nummer: m.art === 'schritt' ? m.nummer : undefined,
    feld: m.art === 'label' ? m.feld : undefined
  }));
}

/** Liest abgelegte Marken zurueck; alles Unbekannte faellt weg. */
export function leseMarken(liste) {
  if (!Array.isArray(liste)) return [];
  return nummeriereSchritte(
    liste
      .filter((m) => m && istMarkenart(m.art) && ['x', 'y', 'breite', 'hoehe'].every((f) => Number.isFinite(Number(m[f]))))
      .map((m, i) => ({
        id: String(m.id || `M-gelesen-${i}`),
        art: m.art,
        x: Math.round(Number(m.x)),
        y: Math.round(Number(m.y)),
        breite: Math.max(1, Math.round(Number(m.breite))),
        hoehe: Math.max(1, Math.round(Number(m.hoehe))),
        text: String(m.text || ''),
        stufe: UNKENNTLICH_STUFEN.some((s) => s.id === m.stufe) ? m.stufe : 'mittel',
        nummer: m.art === 'schritt' ? Number(m.nummer) || null : null,
        feld: m.art === 'label' ? String(m.feld || '') : ''
      }))
  );
}

/** Das Raster, mit dem eine Stelle unkenntlich gemacht wird. */
export function rasterZuStufe(stufe) {
  const treffer = UNKENNTLICH_STUFEN.find((s) => s.id === stufe);
  return (treffer || UNKENNTLICH_STUFEN[1]).raster;
}


/* ------------------------------------------------- Was hier geht (1.16.0) */

/**
 * Beschreibt, was diese Umgebung hergibt - und was statt dessen geht, wenn
 * etwas fehlt. Lieber vorher ehrlich als hinterher eine Fehlermeldung: die
 * Faehigkeiten haengen am Browser, am Geraet und an der Huelle, in der die
 * Seite laeuft, nicht an der Seite selbst.
 */
export function beschreibeFaehigkeiten(lage = {}) {
  const zeile = (name, geht, ja, nein) => ({ name, geht, text: geht ? ja : nein });
  return [
    zeile(
      'Ordner auf dem Rechner',
      Boolean(lage.ordner),
      'Einmal wählen, danach schreibt die Seite jede Aufnahme still hinein. Liegt der Ordner in einem Sync-Ordner (OneDrive, SharePoint, Nextcloud), landen die Dateien dort mit.',
      'Dieser Browser kennt die Ordnerwahl nicht (Firefox und Safari bisher). Es bleiben Eingang und Einzeldatei.'
    ),
    zeile(
      'Einzeln als Datei sichern',
      Boolean(lage.datei),
      'Jede Aufnahme wird einzeln bestätigt und landet im Download-Ordner.',
      'Diese Ansicht darf keine Dateien ablegen. Die Angaben lassen sich als Text herauskopieren.'
    ),
    zeile(
      'Bildschirm freigeben',
      Boolean(lage.freigabe),
      'Fenster, Tab oder ganzen Bildschirm freigeben und daraus ausschneiden.',
      lage.beruehrung
        ? 'Auf Telefon und Tablet gibt es keine Bildschirmfreigabe. Stattdessen ein Bildschirmfoto aufnehmen und über „Bild öffnen“ hereinholen.'
        : 'Diese eingebettete Ansicht darf den Bildschirm nicht freigeben – das entscheidet die Hülle, nicht die Seite. Bildschirmfoto mit der Systemtaste aufnehmen und einfügen oder öffnen.'
    ),
    zeile(
      'Aus der Zwischenablage',
      Boolean(lage.zwischenablage),
      'Bildschirmfoto mit der Systemtaste aufnehmen und mit Strg+V bzw. ⌘V einfügen.',
      'Diese Umgebung gibt die Zwischenablage nicht frei. „Bild öffnen“ führt zum selben Ergebnis.'
    ),
    zeile(
      'Eingang über das Neuladen hinaus',
      Boolean(lage.speicher),
      'Die Aufnahmen bleiben im Browser dieses Geräts gespeichert.',
      'Dieser Browser gibt der Ansicht keinen Speicher. Aufnahmen gelten nur für diese Sitzung – vorher sichern.'
    ),
    zeile(
      'Netzablage, SharePoint, Datenbank',
      false,
      '',
      'Die veröffentlichte Seite darf keine Verbindung nach außen aufbauen – das sperrt die Inhaltsrichtlinie des Artifacts, nicht eine fehlende Funktion. Der Weg dorthin führt über einen Ordner, der mit SharePoint oder OneDrive synchronisiert wird.'
    )
  ];
}

/* ------------------------------------------- Metadaten in der PNG-Datei */

/**
 * PNG traegt Text in eigenen Abschnitten. Geschrieben wird `iTXt`: nur der
 * kann UTF-8, und der Beipackzettel steckt voller Umlaute. `tEXt` waere auf
 * Latin-1 beschraenkt und verstuemmelte „Prüfung“ zu „PrÃ¼fung“.
 */
export const PNG_SCHLUESSEL = 'screenarchiv';

const PNG_KENNUNG = [137, 80, 78, 71, 13, 10, 26, 10];

/* Tabelle nach der PNG-Spezifikation; einmal gerechnet, danach nachgeschlagen. */
const CRC_TABELLE = (() => {
  const tabelle = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c >>> 0;
  }
  return tabelle;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const istPng = (bytes) => bytes && bytes.length > 8 && PNG_KENNUNG.every((b, i) => bytes[i] === b);

function zahlAus(bytes, ab) {
  return ((bytes[ab] << 24) | (bytes[ab + 1] << 16) | (bytes[ab + 2] << 8) | bytes[ab + 3]) >>> 0;
}

function baueAbschnitt(typ, daten) {
  const kopf = new TextEncoder().encode(typ);
  const abschnitt = new Uint8Array(12 + daten.length);
  const sicht = new DataView(abschnitt.buffer);
  sicht.setUint32(0, daten.length);
  abschnitt.set(kopf, 4);
  abschnitt.set(daten, 8);
  const pruefbereich = new Uint8Array(4 + daten.length);
  pruefbereich.set(kopf, 0);
  pruefbereich.set(daten, 4);
  sicht.setUint32(8 + daten.length, crc32(pruefbereich));
  return abschnitt;
}

/** Ein iTXt-Abschnitt: Schlüssel, unkomprimiert, ohne Sprache, Text in UTF-8. */
function baueITXt(schluessel, text) {
  const kodierer = new TextEncoder();
  const name = kodierer.encode(String(schluessel).slice(0, 79));
  const inhalt = kodierer.encode(String(text));
  const daten = new Uint8Array(name.length + 5 + inhalt.length);
  daten.set(name, 0);
  // name \0 komprimiert(0) verfahren(0) sprache \0 uebersetzterName \0 text
  daten[name.length] = 0;
  daten[name.length + 1] = 0;
  daten[name.length + 2] = 0;
  daten[name.length + 3] = 0;
  daten[name.length + 4] = 0;
  daten.set(inhalt, name.length + 5);
  return baueAbschnitt('iTXt', daten);
}

/**
 * Legt Texte in eine PNG-Datei, unmittelbar vor `IEND`. Die Bilddaten bleiben
 * unberuehrt - es wird nichts neu kodiert, nur ein Abschnitt eingeschoben.
 * Ist das keine PNG-Datei, kommt sie unveraendert zurueck.
 */
export function legeTextInPng(bytes, texte = []) {
  const quelle = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!istPng(quelle) || !texte.length) return quelle;
  let ab = 8;
  let vorIend = -1;
  while (ab + 8 <= quelle.length) {
    const laenge = zahlAus(quelle, ab);
    const typ = String.fromCharCode(quelle[ab + 4], quelle[ab + 5], quelle[ab + 6], quelle[ab + 7]);
    if (typ === 'IEND') {
      vorIend = ab;
      break;
    }
    ab += 12 + laenge;
  }
  if (vorIend < 0) return quelle;
  const neue = texte
    .filter((t) => t && t.schluessel && String(t.text || '').length)
    .map((t) => baueITXt(t.schluessel, t.text));
  if (!neue.length) return quelle;
  const zusatz = neue.reduce((summe, a) => summe + a.length, 0);
  const ergebnis = new Uint8Array(quelle.length + zusatz);
  ergebnis.set(quelle.subarray(0, vorIend), 0);
  let schreibAb = vorIend;
  for (const abschnitt of neue) {
    ergebnis.set(abschnitt, schreibAb);
    schreibAb += abschnitt.length;
  }
  ergebnis.set(quelle.subarray(vorIend), schreibAb);
  return ergebnis;
}

/**
 * Liest die Texte einer PNG-Datei: `iTXt` (UTF-8) und `tEXt` (Latin-1), damit
 * auch Dateien aus anderen Werkzeugen gelesen werden. Komprimierte Texte
 * werden uebergangen statt falsch geraten.
 */
export function liesTextAusPng(bytes) {
  const quelle = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const gefunden = {};
  if (!istPng(quelle)) return gefunden;
  const leser = new TextDecoder('utf-8');
  let ab = 8;
  while (ab + 8 <= quelle.length) {
    const laenge = zahlAus(quelle, ab);
    const typ = String.fromCharCode(quelle[ab + 4], quelle[ab + 5], quelle[ab + 6], quelle[ab + 7]);
    const daten = quelle.subarray(ab + 8, ab + 8 + laenge);
    if (typ === 'IEND') break;
    if (typ === 'iTXt' || typ === 'tEXt') {
      const trenner = daten.indexOf(0);
      if (trenner > 0) {
        const schluessel = leser.decode(daten.subarray(0, trenner));
        if (typ === 'tEXt') {
          gefunden[schluessel] = new TextDecoder('latin1').decode(daten.subarray(trenner + 1));
        } else if (daten[trenner + 1] === 0) {
          // unkomprimiert: Sprache und uebersetzter Name sind zwei weitere Nullen
          let lauf = trenner + 3;
          let nullen = 0;
          while (lauf < daten.length && nullen < 2) {
            if (daten[lauf] === 0) nullen++;
            lauf++;
          }
          gefunden[schluessel] = leser.decode(daten.subarray(lauf));
        }
      }
    }
    ab += 12 + laenge;
  }
  return gefunden;
}

/** Die Texte, die neben die Bilddaten gehoeren: lesbare Zeile und ganzer Zettel. */
export function pngTexte(zettel, anwendung) {
  let daten = {};
  try {
    daten = JSON.parse(zettel) || {};
  } catch (fehler) {
    daten = {};
  }
  const zeile = [daten.titel, daten.projekt, daten.seite, daten.datum].filter(Boolean).join(' · ');
  return [
    { schluessel: 'Description', text: zeile },
    { schluessel: 'Software', text: `Screenarchiv ${anwendung || ''}`.trim() },
    { schluessel: PNG_SCHLUESSEL, text: zettel }
  ];
}

/* --------------------------------------------- Uebernahme aus dem Ordner */

/**
 * Ein abgelegtes Bild wird ueber Ordner und Dateiname wiedererkannt - nicht
 * ueber seinen Inhalt. Damit faellt auf, was schon im Eingang liegt, auch
 * nach einem Neuladen.
 */
export function herkunftSchluessel(ordner, datei) {
  return `${String(ordner || '').trim().toLowerCase()}/${String(datei || '').trim().toLowerCase()}`;
}

/** Die bereits uebernommene Aufnahme zu einer Datei, sonst null. */
export function findeUebernahme(liste, ordner, datei) {
  const gesucht = herkunftSchluessel(ordner, datei);
  return (
    (liste || []).find(
      (a) => a && a.herkunft && herkunftSchluessel(a.herkunft.ordner, a.herkunft.datei) === gesucht
    ) || null
  );
}

/** Nur vollstaendige Zahlenangaben gelten; halbe Masse werden nicht geraten. */
function rechteckOderNull(wert) {
  if (!wert || typeof wert !== 'object') return null;
  const zahlen = ['x', 'y', 'breite', 'hoehe'].map((feld) => Number(wert[feld]));
  if (!zahlen.every((zahl) => Number.isFinite(zahl))) return null;
  const [x, y, breite, hoehe] = zahlen;
  return { x, y, breite, hoehe };
}

/**
 * Baut aus einem gelesenen Beipackzettel wieder eine Aufnahme fuer den
 * Eingang. Der Zettel ist die einzige Quelle der Metadaten - fehlt eine
 * Angabe, bleibt sie leer, statt erfunden zu werden. Die Herkunft bleibt
 * vermerkt, damit dieselbe Datei nicht zweimal hereinkommt.
 */
export function aufnahmeAusZettel({ daten = {}, bild, kennung, ordner, datei, zettelDatei, erfasstAm }) {
  const jetzt = erfasstAm || new Date().toISOString();
  const erfasst = String(daten.erfasst_am || '').trim() || jetzt;
  const entwurf = {
    titel: daten.titel,
    projekt: daten.projekt,
    seite: daten.seite,
    kategorie: daten.kategorie,
    status: daten.status || 'in Prüfung',
    rolle: daten.rolle || 'einzeln',
    browser: daten.browser,
    autor: daten.autor,
    datum: istGueltigesDatum(daten.datum) ? daten.datum : erfasst.slice(0, 10),
    begriffe: Array.isArray(daten.begriffe) ? daten.begriffe : normalisiereBegriffe(daten.begriffe || []),
    notiz: daten.notiz
  };
  const quelleRoh = daten.quelle && typeof daten.quelle === 'object' ? daten.quelle : {};
  const aufnahme = baueAufnahme({
    entwurf,
    bild,
    ausschnitt: rechteckOderNull(daten.ausschnitt) || { x: 0, y: 0, breite: 0, hoehe: 0 },
    quelle: {
      art: String(quelleRoh.art || 'datei'),
      name: String(quelleRoh.name || datei || ''),
      breite: Number(quelleRoh.breite) || 0,
      hoehe: Number(quelleRoh.hoehe) || 0
    },
    kennung,
    erfasstAm: erfasst
  });
  const gelesen = leseMarken(daten.marken);
  if (gelesen.length) aufnahme.marken = markenAlsAblage(gelesen);
  aufnahme.herkunft = {
    ordner: String(ordner || ''),
    datei: String(datei || ''),
    zettel: String(zettelDatei || ''),
    uebernommen_am: jetzt
  };
  return aufnahme;
}

/**
 * Passt ein Dateiname zur Ordnersuche? Ohne Suchtext passt jeder. Gesucht wird
 * mit aufgeloesten Umlauten auf beiden Seiten - abgelegte Namen sind
 * entschaerft (`gruen-...`), getippt wird aber `grün`.
 */
export function passtDateiname(name, suche) {
  const gesucht = normalisiereLang(String(suche || ''));
  if (!gesucht) return true;
  const kleiner = normalisiereLang(String(name || ''));
  return gesucht.split(/\s+/).every((teil) => kleiner.includes(teil));
}

/**
 * Kann der Beipackzettel dieser Aufnahme im Ordner nachgeschrieben werden?
 * Jede Absage nennt ihren Grund - "geht nicht" allein hilft niemandem weiter.
 */
export function zettelZiel(aufnahme, ordnername) {
  const herkunft = (aufnahme && aufnahme.herkunft) || null;
  if (!herkunft || !herkunft.datei) {
    return { moeglich: false, grund: 'Diese Aufnahme stammt nicht aus einer Datei im Ordner.' };
  }
  if (!String(ordnername || '').trim()) {
    return {
      moeglich: false,
      grund: `Der Ordner ${herkunft.ordner} ist nicht geöffnet – in der Ansicht Ausschneiden wählen.`
    };
  }
  if (String(ordnername).trim().toLowerCase() !== String(herkunft.ordner || '').trim().toLowerCase()) {
    return {
      moeglich: false,
      grund: `Geöffnet ist ${ordnername}, diese Aufnahme stammt aus ${herkunft.ordner}.`
    };
  }
  return {
    moeglich: true,
    bild: herkunft.datei,
    datei: herkunft.zettel || beipackzettelName(herkunft.datei)
  };
}

export const ABLAGE_ZIELE = [
  { id: 'eingang', label: 'Eingang in dieser Seite', hinweis: 'Bleibt im Browser, überlebt kein Löschen der Browserdaten.' },
  { id: 'ordner', label: 'Ordner auf dem Rechner', hinweis: 'Einmal wählen, danach schreibt die Seite jede Aufnahme still hinein.' },
  { id: 'datei', label: 'Einzeln als Datei sichern', hinweis: 'Jede Aufnahme wird einzeln bestätigt.' }
];

export const MUSTER_FELDER = [
  { feld: '{kapitel}', erklaerung: 'Gliederungsnummer, etwa 2-3' },
  { feld: '{datum}', erklaerung: 'Aufnahmedatum, JJJJ-MM-TT' },
  { feld: '{zeit}', erklaerung: 'Uhrzeit, SS-MM-SS' },
  { feld: '{nummer}', erklaerung: 'laufende Nummer, dreistellig' },
  { feld: '{projekt}', erklaerung: 'Projekt aus den Metadaten' },
  { feld: '{titel}', erklaerung: 'Titel aus den Metadaten' },
  { feld: '{kategorie}', erklaerung: 'Kategorie aus den Metadaten' }
];

/** Macht aus beliebigem Text einen unbedenklichen Dateinamensbestandteil. */
export function bereinigeDateiname(text) {
  return normalisiereLang(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Setzt das Muster in einen Dateinamen um. Ein unbekannter Platzhalter wird
 * als Wort uebernommen ({schirm} -> "schirm") - so faellt ein Tippfehler im
 * Dateinamen auf, statt still zu verschwinden.
 */
export function dateinameAus(muster, felder = {}, endung = 'png') {
  const werte = {
    // Die Gliederungsnummer traegt einen Punkt, der im Dateinamen nichts zu
    // suchen hat - aus 2.3 wird 2-3.
    '{kapitel}': String(felder.kapitel || '').replace(/\./g, '-'),
    '{datum}': felder.datum || '',
    '{zeit}': felder.zeit || '',
    '{nummer}': felder.nummer || '',
    '{projekt}': felder.projekt || '',
    '{titel}': felder.titel || '',
    '{kategorie}': felder.kategorie || ''
  };
  let name = String(muster || ABLAGE_STANDARD.muster);
  for (const [platzhalter, wert] of Object.entries(werte)) {
    name = name.split(platzhalter).join(bereinigeDateiname(wert));
  }
  name = bereinigeDateiname(name) || 'aufnahme';
  return `${name}.${endung}`;
}

/** Mindestens ein Ziel muss gewaehlt sein, sonst ginge die Aufnahme verloren. */
export function pruefeAblage(ablage) {
  const a = { ...ABLAGE_STANDARD, ...ablage };
  const probleme = [];
  if (!a.eingang && !a.ordner && !a.datei) {
    probleme.push({ feld: 'ziel', text: 'Kein Ablageziel gewählt – die Aufnahme hätte keinen Ort.' });
  }
  if (!String(a.muster || '').trim()) {
    probleme.push({ feld: 'muster', text: 'Das Namensmuster ist leer.' });
  }
  return probleme;
}

export function leseAblage(text) {
  if (!text) return { ...ABLAGE_STANDARD };
  try {
    const roh = JSON.parse(text);
    return {
      eingang: roh.eingang !== false,
      // Ein Ordner gilt nur fuer die Sitzung: der Zugriff darauf laesst sich
      // nicht mitspeichern, er muss jedes Mal neu erlaubt werden.
      ordner: false,
      datei: Boolean(roh.datei),
      beipack: roh.beipack !== false,
      muster: typeof roh.muster === 'string' && roh.muster.trim() ? roh.muster : ABLAGE_STANDARD.muster
    };
  } catch (fehler) {
    return { ...ABLAGE_STANDARD };
  }
}

export function schreibeAblage(ablage) {
  const a = { ...ABLAGE_STANDARD, ...ablage };
  return JSON.stringify({ eingang: a.eingang, datei: a.datei, beipack: a.beipack, muster: a.muster });
}

/** Kurzfassung der gewaehlten Ziele fuer die Anzeige. */
export function beschreibeAblage(ablage, ordnername) {
  const a = { ...ABLAGE_STANDARD, ...ablage };
  const teile = [];
  if (a.eingang) teile.push('Eingang');
  if (a.ordner) teile.push(ordnername ? `Ordner „${ordnername}“` : 'Ordner');
  if (a.datei) teile.push('Datei');
  return teile.length ? teile.join(' + ') : 'kein Ziel';
}

/* =========================================================================
   Suchchat – nach Bildern fragen, Bilder bekommen.

   Die Frage wird *hier* gedeutet, nicht geraten: aus „Dealer in Kapitel 6 auf
   Englisch" wird ein Filter mit Rolle, Stelle und Sprache, und was nicht
   erkannt wird, bleibt Freitext. Das läuft ohne Netz und ist prüfbar.

   Steht die Fähigkeit `sample` zur Verfügung, darf Claude dieselbe Frage in
   denselben Filter übersetzen – angewendet wird er auch dann hier. Die
   Oberfläche zeigt also nie etwas anderes, als dieser Filter hergibt.
   ========================================================================= */

export const CHAT_SCHLUESSEL = 'screenarchiv:chat';

export const CHAT_BEISPIELE = [
  'Bilder von Dealer in Kapitel 6',
  'Templates auf Englisch',
  'alles ohne Stelle',
  'unkenntlich gemachte Bilder',
  'die letzten 5 aus dem Import'
];

/** Die Filterfelder, die eine Frage setzen kann - und nichts darüber hinaus. */
/** Wörter, die eine Frage trägt, ohne sie einzuschränken. */
const FUELLWOERTER = new Set([
  'zeige','zeig','mir','alle','alles','gemacht','gemachte','gemachten','letzten','neuesten','ersten','bilder','bild',
  'aufnahmen','aufnahme','screens','screen','von','vom','aus','dem','der','die','das','den','ein','eine','einen','in',
  'im','auf','mit','und','fuer','zu','zum','bitte','welche','gibt','es','habe','hast','suche','finde','wo','ist','sind',
  'nach','noch','ohne','nur','gib'
]);

export const CHAT_FELDER = ['sprache', 'rolle_label', 'sparte', 'markt', 'stelle', 'text', 'grenze', 'nur'];

const CHAT_NUR = [
  { id: 'unkenntlich', worte: ['unkenntlich', 'geblurrt', 'blurrt', 'anonymisiert', 'verpixelt'] },
  { id: 'markiert', worte: ['markiert', 'rahmen', 'kommentiert'] },
  { id: 'import', worte: ['import', 'importiert', 'pptx', 'docx', 'pdf', 'powerpoint', 'word'] },
  { id: 'ohneStelle', worte: ['ohne stelle', 'ohne kapitel', 'nicht zugeordnet', 'unzugeordnet'] },
  { id: 'unvollstaendig', worte: ['unvollstaendig', 'offen', 'in pruefung'] }
];

/**
 * Deutet eine Frage. Erkannt werden Rolle, Sparte, Sprache, Markt, Stelle in
 * der Gliederung, eine Anzahl („die letzten 5") und eine Handvoll
 * Eigenschaften; der Rest bleibt Freitext. Was erkannt wurde, wird genannt -
 * eine stille Deutung wäre schlimmer als keine.
 */
export function deuteFrage(frage, gliederung = []) {
  const roh = String(frage || '').trim();
  // Satzzeichen raus - aber kein Punkt zwischen Ziffern: „6.2" ist eine Stelle.
  const klein = ' ' + normalisiereLang(roh).replace(/[,;!?]/g, ' ').replace(/\.(?!\d)/g, ' ') + ' ';
  const filter = { sprache: '', rolle_label: '', sparte: '', markt: '', stelle: '', text: '', grenze: 0, nur: [] };
  const erkannt = [];
  let rest = klein;

  const nimm = (muster) => {
    const treffer = rest.match(muster);
    if (!treffer) return null;
    rest = rest.replace(treffer[0], ' ');
    return treffer;
  };

  // Trifft die ganze Frage genau eine Stelle der Gliederung, ist sie gemeint:
  // „Market Settings" ist dann das Kapitel 6.2 und nicht die Rolle Market.
  const ganzeFrage = klein
    .split(/\s+/)
    .filter((w) => w && !FUELLWOERTER.has(w))
    .join(' ');
  const alsStelle = ganzeFrage && gliederung.length ? sucheGliederung(gliederung, ganzeFrage) : [];
  if (alsStelle.length === 1) {
    filter.stelle = alsStelle[0].nummer;
    erkannt.push(`Stelle ${alsStelle[0].nummer} (${alsStelle[0].thema})`);
    return { filter, erkannt, frage: roh };
  }

  // Der Markt zuerst: „Markt Germany" nennt ein Land - und „Market" ist
  // daneben auch eine Rolle. Wer das Feld nennt, meint das Feld.
  const marktTreffer = rest.match(/\s(?:markt|market|land)\s+([a-z-]{2,})\s/);
  if (marktTreffer && !FUELLWOERTER.has(marktTreffer[1])) {
    rest = rest.replace(marktTreffer[0], ' ');
    filter.markt = marktTreffer[1];
    erkannt.push(`Markt ${marktTreffer[1]}`);
  }

  // Rolle, Sparte, Sprache: feste Vokabulare, darum sicher zu erkennen. Neben
  // dem Schild gelten die gebräuchlichen Namen - wer „Pkw" tippt, meint PC.
  const namen = (wert) => [wert.label, ...(wert.alias || [])].map(normalisiereLang).filter(Boolean);
  for (const rolle of ROLLEN_LABEL) {
    if (namen(rolle).some((name) => nimm(new RegExp(`\\s${name}\\s`)))) {
      filter.rolle_label = rolle.id;
      erkannt.push(`Rolle ${rolle.label}`);
      break;
    }
  }
  for (const sparte of SPARTEN) {
    if (namen(sparte).some((name) => nimm(new RegExp(`\\s${name}\\s`)))) {
      filter.sparte = sparte.id;
      erkannt.push(`Sparte ${sparte.label}`);
      break;
    }
  }
  for (const sprache of SPRACHEN) {
    const name = normalisiereLang(sprache.label).replace(/[()]/g, '');
    if (nimm(new RegExp(`\\s(auf\\s)?${name}\\s`))) {
      filter.sprache = sprache.id;
      erkannt.push(`Sprache ${sprache.label}`);
      break;
    }
  }

  // Anzahl zuerst: „die letzten 5" ist keine Stelle 5.
  const anzahl =
    nimm(/\s(?:letzten|neuesten|ersten|top)\s+([0-9]{1,3})\s/) || nimm(/\s([0-9]{1,3})\s(?:bilder|aufnahmen|screens)\s/);
  if (anzahl) {
    filter.grenze = Number(anzahl[1]);
    erkannt.push(`höchstens ${filter.grenze}`);
  }

  // Stelle: „Kapitel 6" nur mit Schlüsselwort, „6.2.3" auch ohne - eine
  // nackte Zahl wäre sonst jede Mengenangabe.
  const nummer =
    nimm(/\s(?:kapitel|abschnitt|stelle)\s*([0-9]+(?:\.[0-9]+){0,3})\s/) || nimm(/\s([0-9]+(?:\.[0-9]+){1,3})\s/);
  if (nummer) {
    filter.stelle = nummer[1];
    erkannt.push(`Stelle ${nummer[1]}`);
  }

  for (const eigenschaft of CHAT_NUR) {
    for (const wort of eigenschaft.worte) {
      if (rest.includes(' ' + normalisiereLang(wort) + ' ') || rest.includes(' ' + normalisiereLang(wort) + 'e ')) {
        filter.nur.push(eigenschaft.id);
        erkannt.push(eigenschaft.id === 'ohneStelle' ? 'ohne Stelle' : eigenschaft.id);
        rest = rest.replace(new RegExp(`\\s${normalisiereLang(wort)}e?\\s`, 'g'), ' ');
        break;
      }
    }
  }

  // Markt, falls er oben noch nicht gelesen wurde.
  const markt = filter.markt ? null : rest.match(/\s(?:markt|market|land)\s+([a-z-]{2,})\s/);
  if (markt && !FUELLWOERTER.has(markt[1])) {
    rest = rest.replace(markt[0], ' ');
    filter.markt = markt[1];
    erkannt.push(`Markt ${markt[1]}`);
  }

  // Was übrig bleibt, ist Freitext - ohne Füllwörter, die nichts filtern.
  const worte = rest.split(/\s+/).filter((w) => w && !FUELLWOERTER.has(w));
  filter.text = worte.join(' ').trim();

  // Ein Thema der Gliederung statt einer Nummer: „Templates" findet 6.2.
  if (!filter.stelle && filter.text && gliederung.length) {
    const treffer = sucheGliederung(gliederung, filter.text);
    if (treffer.length === 1) {
      filter.stelle = treffer[0].nummer;
      erkannt.push(`Stelle ${treffer[0].nummer} (${treffer[0].thema})`);
    }
  }
  if (filter.text) erkannt.push(`Text „${filter.text}"`);

  return { filter, erkannt, frage: roh };
}

/** Wendet den Filter an. Die Reihenfolge ist die der Gliederung, dann die Zeit. */
export function findeBilder(eingang = [], filter = {}, gliederung = []) {
  const nur = new Set(filter.nur || []);
  const text = normalisiereLang(filter.text || '');
  const gefunden = eingang.filter((a) => {
    if (filter.sprache && a.sprache !== filter.sprache) return false;
    if (filter.rolle_label && a.rolle_label !== filter.rolle_label) return false;
    if (filter.sparte && a.sparte !== filter.sparte) return false;
    if (filter.markt && !normalisiereLang(a.markt || '').includes(normalisiereLang(filter.markt))) return false;
    if (filter.stelle && !gehoertZu(String(a.gliederung || ''), filter.stelle)) return false;
    if (nur.has('ohneStelle') && String(a.gliederung || '').trim()) return false;
    // Unkenntlich heißt: eine Fassung tragt eine Marke dieser Art - der
    // Dateiname allein wäre nur eine Behauptung.
    if (nur.has('unkenntlich') && !leseFassungen(a).some((f) => (f.marken || []).some((m) => m.art === 'unkenntlich')))
      return false;
    if (nur.has('markiert') && !leseFassungen(a).length) return false;
    if (nur.has('import') && !a.einfuhr) return false;
    if (nur.has('unvollstaendig') && istVollstaendig(a)) return false;
    if (text && !eingangSuchIndex(a).includes(text)) return false;
    return true;
  });
  const sortiert = sortiereNachKapitel(gefunden);
  return filter.grenze ? sortiert.slice(0, filter.grenze) : sortiert;
}

/** Der Satz, mit dem die Antwort beginnt - nie „nichts gefunden" allein. */
export function chatAntwortText({ erkannt = [], filter = {} }, treffer = [], gesamt = 0) {
  const womit = erkannt.length ? erkannt.join(', ') : 'ohne erkennbare Einschränkung';
  if (!gesamt) return `Im Eingang liegt noch kein Bild. ${womit} – da ist nichts zu finden.`;
  if (!treffer.length) {
    return `Kein Treffer für ${womit}. Von ${gesamt} Bildern passt keines; weniger einschränken oder die Stelle prüfen.`;
  }
  const mehr = filter.grenze && treffer.length === filter.grenze ? ' (auf die gewünschte Zahl gekürzt)' : '';
  return `${treffer.length} von ${gesamt} Bildern: ${womit}${mehr}.`;
}

/** Die Lage des Fensters - beweglich heißt: sie bleibt, wo sie gelassen wurde. */
export function leseChatlage(text) {
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return null;
  }
  if (!inhalt || typeof inhalt !== 'object') return null;
  const zahl = (wert, ersatz) => (Number.isFinite(Number(wert)) ? Number(wert) : ersatz);
  return {
    x: zahl(inhalt.x, 24),
    y: zahl(inhalt.y, 96),
    breite: Math.max(280, zahl(inhalt.breite, 380)),
    hoehe: Math.max(240, zahl(inhalt.hoehe, 460)),
    offen: Boolean(inhalt.offen)
  };
}

export function schreibeChatlage(lage = {}) {
  return JSON.stringify({
    x: Math.round(lage.x || 0),
    y: Math.round(lage.y || 0),
    breite: Math.round(lage.breite || 380),
    hoehe: Math.round(lage.hoehe || 460),
    offen: Boolean(lage.offen)
  });
}

/** Hält das Fenster im Bild - außerhalb wäre es unerreichbar. */
export function haltImBild(lage = {}, sicht = { breite: 1280, hoehe: 800 }) {
  const breite = Math.min(Math.max(280, lage.breite || 380), Math.max(280, sicht.breite - 16));
  const hoehe = Math.min(Math.max(240, lage.hoehe || 460), Math.max(240, sicht.hoehe - 16));
  return {
    ...lage,
    breite,
    hoehe,
    x: Math.min(Math.max(8, lage.x || 0), Math.max(8, sicht.breite - breite - 8)),
    y: Math.min(Math.max(8, lage.y || 0), Math.max(8, sicht.hoehe - hoehe - 8))
  };
}

/* =========================================================================
   Drei Agenten – roter Faden, Audit, Empfehlung.

   Alle drei prüfen nach Regeln, nicht nach Gefühl: was sie sagen, lässt sich
   am Bestand nachrechnen, und jeder Befund nennt die Bilder, um die es geht.
   Claude darf das Ergebnis hinterher kommentieren – entscheiden tun die
   Regeln. Ein Agent, der raten müsste, sagte besser nichts.
   ========================================================================= */

export const AGENTEN = [
  {
    id: 'faden',
    label: 'Roter Faden',
    zweck: 'Erzählt die Galerie eine Geschichte? Folge, Lücken, Sprünge, gemischte Sprachen und Rollen.'
  },
  {
    id: 'audit',
    label: 'Audit',
    zweck: 'Ist jedes Bild vollständig, zugeordnet, gelabelt und in der Auflösung, die der Druck braucht?'
  },
  {
    id: 'sprache',
    label: 'Sprache',
    zweck: 'Heißt dasselbe überall gleich? Wortliste, Schreibweisen und die Sprache der Texte gegen das Label.'
  },
  {
    id: 'empfehlung',
    label: 'Empfehlung',
    zweck: 'Was als nächstes zu tun ist – nach Gewicht sortiert, mit dem Weg dorthin.'
  }
];

/** Die Grenzen, an denen die Agenten messen. Offen, damit sie prüfbar sind. */
export const PRUEF_GRENZEN = {
  druckbreite: 1280, // darunter wird die Schrift im Druck unscharf
  titelLaenge: 8,
  strecke: 3, // ab so vielen Bildern je Stelle lohnt eine Folge
  personendaten: ['fin', 'vin', 'user id', 'userid', 'benutzer-id', 'adresse', 'kundennummer', 'iban', 'kennwort', 'passwort', 'e-mail', 'email']
};

const befund = (art, titel, text, zusatz = {}) => ({
  art,
  titel,
  text,
  kennungen: zusatz.kennungen || [],
  stelle: zusatz.stelle || '',
  weg: zusatz.weg || '',
  gewicht: zusatz.gewicht || (art === 'fehler' ? 3 : art === 'warnung' ? 2 : 1)
});

/** Nach Gewicht, dann nach Art - das Wichtigste steht oben. */
function sortiereBefunde(befunde) {
  const rang = { fehler: 0, warnung: 1, hinweis: 2 };
  return [...befunde].sort((a, b) => b.gewicht - a.gewicht || rang[a.art] - rang[b.art] || a.titel.localeCompare(b.titel));
}

/* ------------------------------------------------------------ Roter Faden */

/**
 * Der rote Faden prüft die *Folge*: ob die Bilder einer Stelle eine Reihe
 * bilden, ob eine Folge Lücken hat und ob in einer Folge Sprache oder Rolle
 * mitten im Weg wechseln. Ein Wechsel ist kein Fehler - er muss nur gewollt
 * sein, und darum wird er genannt.
 */
export function pruefeFaden(eingang = [], gliederung = [], strecken = []) {
  const befunde = [];
  const { zahlen, ohneStelle, unbekannt } = zaehleBilder(gliederung, eingang);
  const inStrecken = new Set();
  for (const strecke of strecken) {
    for (const schritt of strecke.schritte || []) for (const k of schritt.aufnahmen || []) inStrecken.add(k);
  }

  for (const strecke of strecken) {
    const name = strecke.name || 'ohne Namen';
    const schritte = streckeMitAufnahmen(strecke, eingang);
    if (schritte.length < 2) {
      befunde.push(
        befund('warnung', `Folge „${name}" ist keine Folge`, `Sie hat ${schritte.length} Schritt(e). Eine Folge beginnt bei zwei.`, {
          weg: 'strecke',
          gewicht: 2
        })
      );
    }
    const ohneText = schritte.filter((s) => !String(s.text || '').trim());
    if (ohneText.length) {
      befunde.push(
        befund('fehler', `Folge „${name}": ${ohneText.length} Schritt(e) ohne Anweisung`, 'Ein Bild ohne Anweisung erzählt nichts.', {
          kennungen: ohneText.map((s) => (s.aufnahme ? s.aufnahme.id : `Schritt ${s.nummer}`)),
          weg: 'strecke',
          gewicht: 4
        })
      );
    }
    const luecken = schritte.filter((s) => s.art === 'platzhalter');
    if (luecken.length) {
      befunde.push(
        befund('warnung', `Folge „${name}": ${luecken.length} Platzhalter`, `Es fehlen noch Bilder: ${luecken.map((s) => s.text || `Schritt ${s.nummer}`).join('; ')}`, {
          weg: 'strecke',
          gewicht: 3
        })
      );
    }
    // Sprache und Rolle dürfen wechseln - aber nicht unbemerkt.
    for (const feld of ['sprache', 'rolle_label']) {
      const werte = [...new Set(schritte.flatMap((s) => s.aufnahmen.map((a) => a[feld]).filter(Boolean)))];
      if (werte.length > 1) {
        befunde.push(
          befund(
            'hinweis',
            `Folge „${name}" mischt ${feld === 'sprache' ? 'Sprachen' : 'Rollen'}`,
            `In einer Folge stehen ${werte.map((w) => labelWert(feld, w)).join(', ')}. Für ein Handbuch ist je Sprache und Rolle eine eigene Folge klarer.`,
            { weg: 'strecke', gewicht: 2 }
          )
        );
      }
    }
    // Läuft die Folge gegen die Gliederung, ist entweder die Folge oder die
    // Zuordnung falsch - beides lohnt einen Blick.
    const stellen = schritte.map((s) => (s.aufnahme ? String(s.aufnahme.gliederung || '') : '')).filter(Boolean);
    const rueckwaerts = stellen.filter((stelle, i) => i > 0 && vergleicheKapitel(stelle, stellen[i - 1]) < 0);
    if (rueckwaerts.length) {
      befunde.push(
        befund('hinweis', `Folge „${name}" läuft gegen die Gliederung`, `Nach ${stellen.join(' → ')} springt sie zurück. Entweder ist die Reihenfolge gewollt – oder eine Zuordnung sitzt falsch.`, {
          weg: 'strecke',
          gewicht: 1
        })
      );
    }
  }

  // Stellen mit Bildern, die keine Folge erzählt.
  for (const eintrag of gliederung) {
    const zahl = zahlen.get(eintrag.nummer) || { eigene: 0, gesamt: 0 };
    if (zahl.eigene < PRUEF_GRENZEN.strecke) continue;
    const bilder = eingang.filter((a) => String(a.gliederung || '') === eintrag.nummer);
    if (bilder.every((a) => !inStrecken.has(a.id))) {
      befunde.push(
        befund('warnung', `${eintrag.nummer} hat ${zahl.eigene} Bilder, aber keine Folge`, `„${eintrag.thema}" wäre eine Anleitung – bisher sind es einzelne Bilder.`, {
          kennungen: bilder.map((a) => a.id),
          stelle: eintrag.nummer,
          weg: 'strecke',
          gewicht: 3
        })
      );
    }
  }

  // Eine Lücke mitten in einer Reihe von Unterkapiteln.
  for (const eintrag of gliederung.filter((e) => e.ebene === 1)) {
    const kinder = gliederung.filter((e) => e.ebene === 2 && gehoertZu(e.nummer, eintrag.nummer));
    const mit = kinder.filter((k) => (zahlen.get(k.nummer) || {}).gesamt);
    if (mit.length < 2 || mit.length === kinder.length) continue;
    const ersteMit = kinder.indexOf(mit[0]);
    const letzteMit = kinder.indexOf(mit[mit.length - 1]);
    const luecken = kinder.slice(ersteMit, letzteMit + 1).filter((k) => !(zahlen.get(k.nummer) || {}).gesamt);
    if (luecken.length) {
      befunde.push(
        befund('warnung', `Kapitel ${eintrag.nummer}: ${luecken.length} Lücke(n) mitten in der Reihe`, `Belegt sind ${mit.length} von ${kinder.length} Unterkapiteln; ohne Bild bleiben ${luecken.map((l) => l.nummer).join(', ')}. Eine Lücke zwischen belegten Stellen fällt im Handbuch auf.`, {
          stelle: eintrag.nummer,
          weg: 'gliederung',
          gewicht: 3
        })
      );
    }
  }

  if (ohneStelle) {
    befunde.push(
      befund('warnung', `${ohneStelle} Bild(er) ohne Stelle`, 'Ohne Stelle im Handbuch stehen sie in keinem Kapitel und in keiner Vorlage.', {
        kennungen: eingang.filter((a) => !String(a.gliederung || '').trim()).map((a) => a.id),
        weg: 'editor',
        gewicht: 3
      })
    );
  }
  if (unbekannt.length) {
    befunde.push(
      befund('fehler', `${unbekannt.length} unbekannte Stelle(n)`, `Diese Nummern stehen an Bildern, aber nicht in der Gliederung: ${unbekannt.join(', ')}.`, {
        weg: 'gliederung',
        gewicht: 4
      })
    );
  }

  const inFolge = eingang.filter((a) => inStrecken.has(a.id)).length;
  return {
    agent: 'faden',
    befunde: sortiereBefunde(befunde),
    kennzahlen: [
      { schild: 'Bilder', wert: String(eingang.length) },
      { schild: 'in einer Folge', wert: `${inFolge}`, zusatz: eingang.length ? `${Math.round((inFolge / eingang.length) * 100)} %` : '–' },
      { schild: 'Folgen', wert: String(strecken.length) },
      { schild: 'ohne Stelle', wert: String(ohneStelle) }
    ]
  };
}

/* ------------------------------------------------------------------ Audit */

/**
 * Das Audit prüft jedes Bild für sich: Vollständigkeit, Zuordnung, Labels,
 * Auflösung. Dazu ein Hinweis, wo im Text personenbezogene Daten genannt
 * sind, ohne dass etwas unkenntlich gemacht wurde - das ist kein Urteil,
 * sondern ein Blick, der sich lohnt.
 */
export function pruefeAudit(eingang = [], gliederung = [], strecken = []) {
  const befunde = [];
  const sammle = (pruefung) => eingang.filter(pruefung).map((a) => a.id);

  const unvollstaendig = sammle((a) => !istVollstaendig(a));
  if (unvollstaendig.length) {
    befunde.push(
      befund('warnung', `${unvollstaendig.length} Bild(er) unvollständig`, 'Es fehlt Titel, Projekt, Kategorie oder ein Schlagwort.', {
        kennungen: unvollstaendig,
        weg: 'eingang',
        gewicht: 3
      })
    );
  }

  const klein = eingang.filter((a) => Number(a.breite || a.quelle?.breite || 0) > 0 && Number(a.breite || a.quelle?.breite || 0) < PRUEF_GRENZEN.druckbreite);
  if (klein.length) {
    befunde.push(
      befund('warnung', `${klein.length} Bild(er) unter ${PRUEF_GRENZEN.druckbreite} px breit`, 'Für A4 bei 300 dpi ist das zu wenig – im Druck wird die Schrift unscharf.', {
        kennungen: klein.map((a) => a.id),
        weg: 'eingang',
        gewicht: 3
      })
    );
  }

  const nurVorschau = sammle((a) => !a.voll);
  if (nurVorschau.length) {
    befunde.push(
      befund('fehler', `${nurVorschau.length} Bild(er) nur als Vorschau`, 'Das volle Bild liegt nicht in der Browserdatenbank – für den Druck fehlt die Auflösung. Neu aufnehmen oder neu importieren.', {
        kennungen: nurVorschau,
        weg: 'eingang',
        gewicht: 4
      })
    );
  }

  for (const feld of ['sprache', 'rolle_label', 'sparte']) {
    const ohne = sammle((a) => !a[feld]);
    if (!ohne.length) continue;
    befunde.push(
      befund(ohne.length === eingang.length ? 'warnung' : 'hinweis', `${ohne.length} Bild(er) ohne ${LABEL_FELDER.find((f) => f.id === feld).label}`, 'Ohne dieses Label lässt sich nicht nach ihm suchen und es steht in keiner Bildunterschrift.', {
        kennungen: ohne,
        weg: 'editor',
        gewicht: 2
      })
    );
  }

  // Zwei Bilder mit demselben Titel sind im Handbuch nicht zu unterscheiden.
  const nachTitel = new Map();
  for (const a of eingang) {
    const schluessel = normalisiereLang(a.titel || '');
    if (!schluessel) continue;
    nachTitel.set(schluessel, [...(nachTitel.get(schluessel) || []), a.id]);
  }
  const doppelt = [...nachTitel.values()].filter((liste) => liste.length > 1);
  if (doppelt.length) {
    befunde.push(
      befund('hinweis', `${doppelt.length} Titel doppelt belegt`, 'Gleiche Titel sind in einer Bildunterschrift nicht zu unterscheiden.', {
        kennungen: doppelt.flat(),
        weg: 'eingang',
        gewicht: 2
      })
    );
  }

  const kurz = sammle((a) => String(a.titel || '').trim().length < PRUEF_GRENZEN.titelLaenge);
  if (kurz.length) {
    befunde.push(
      befund('hinweis', `${kurz.length} Titel zu knapp`, `Unter ${PRUEF_GRENZEN.titelLaenge} Zeichen sagt ein Titel in der Regel nichts.`, {
        kennungen: kurz,
        weg: 'eingang',
        gewicht: 1
      })
    );
  }

  // Personenbezogene Daten im Text, aber nichts abgedeckt.
  const verdacht = eingang.filter((a) => {
    const text = normalisiereLang(`${a.titel || ''} ${a.notiz || ''} ${(a.begriffe || []).join(' ')}`);
    const genannt = PRUEF_GRENZEN.personendaten.some((wort) => text.includes(normalisiereLang(wort)));
    const abgedeckt = leseFassungen(a).some((f) => (f.marken || []).some((m) => m.art === 'unkenntlich'));
    return genannt && !abgedeckt;
  });
  if (verdacht.length) {
    befunde.push(
      befund('warnung', `${verdacht.length} Bild(er) nennen personenbezogene Daten, ohne etwas abzudecken`, 'Im Text stehen Begriffe wie FIN, User ID oder Adresse, am Bild ist aber nichts unkenntlich gemacht. Das ist kein Urteil – nur ein Blick, der sich lohnt.', {
        kennungen: verdacht.map((a) => a.id),
        weg: 'editor',
        gewicht: 4
      })
    );
  }

  // Verwaiste Schritte: die Folge verweist auf ein Bild, das es nicht gibt.
  const verwaist = [];
  for (const strecke of strecken) {
    for (const schritt of strecke.schritte || []) {
      for (const k of schritt.aufnahmen || []) if (!eingang.some((a) => a.id === k)) verwaist.push(k);
    }
  }
  if (verwaist.length) {
    befunde.push(
      befund('fehler', `${verwaist.length} Verweis(e) auf gelöschte Bilder`, `In Folgen stehen Schritte, deren Bild im Eingang fehlt: ${[...new Set(verwaist)].join(', ')}.`, {
        weg: 'strecke',
        gewicht: 4
      })
    );
  }

  const stellen = new Set(gliederung.map((e) => e.nummer));
  const falsch = sammle((a) => String(a.gliederung || '').trim() && !stellen.has(String(a.gliederung).trim()));
  if (falsch.length) {
    befunde.push(
      befund('fehler', `${falsch.length} Bild(er) an einer Stelle, die es nicht gibt`, 'Die Nummer steht nicht in der Gliederung – im Handbuch landet das Bild nirgends.', {
        kennungen: falsch,
        weg: 'editor',
        gewicht: 4
      })
    );
  }

  const sauber = eingang.length - new Set(befunde.flatMap((b) => b.kennungen)).size;
  return {
    agent: 'audit',
    befunde: sortiereBefunde(befunde),
    kennzahlen: [
      { schild: 'Bilder', wert: String(eingang.length) },
      { schild: 'ohne Befund', wert: String(Math.max(0, sauber)) },
      { schild: 'Befunde', wert: String(befunde.length) },
      { schild: 'davon Fehler', wert: String(befunde.filter((b) => b.art === 'fehler').length) }
    ]
  };
}

/* ------------------------------------------------------------- Empfehlung */

/* ------------------------------------------------------------ Sprache */

/**
 * Die Wortliste: was wie heißen soll. Ein Handbuch, in dem dieselbe Sache
 * dreimal anders heißt, ist kein Handbuch. Die Liste ist eine Vorgabe, kein
 * Gesetz - sie lässt sich ändern, und was fehlt, wird nicht geprüft.
 */
export const WORTLISTE_SCHLUESSEL = 'screenarchiv:woerter';
export const WORTLISTE_VERSION = 1;

/** Ein Anfang aus dem Sprachgebrauch des Projekts; änderbar in der Ansicht. */
export const STANDARD_WORTLISTE = [
  { falsch: 'Dealer', richtig: 'Händler', sprache: 'de' },
  { falsch: 'Market', richtig: 'Markt', sprache: 'de' },
  { falsch: 'Contract', richtig: 'Vertrag', sprache: 'de' },
  { falsch: 'Customer', richtig: 'Kunde', sprache: 'de' },
  { falsch: 'Template', richtig: 'Vorlage', sprache: 'de' },
  { falsch: 'Approval', richtig: 'Freigabe', sprache: 'de' },
  { falsch: 'Händler', richtig: 'Dealer', sprache: 'en' },
  { falsch: 'Vertrag', richtig: 'Contract', sprache: 'en' },
  { falsch: 'Freigabe', richtig: 'Approval', sprache: 'en' },
  { falsch: 'OneSCM', richtig: 'oneSCM' },
  { falsch: 'One SCM', richtig: 'oneSCM' },
  { falsch: 'Service Vertrag', richtig: 'Servicevertrag' },
  { falsch: 'Mercedes Benz', richtig: 'Mercedes-Benz' }
];

/** Eine Zeile je Regel: „falsch -> richtig", dahinter die Sprache in Klammern. */
export function wortlisteAlsText(liste = []) {
  return liste
    .filter((r) => r && r.falsch && r.richtig)
    .map((r) => `${r.falsch} -> ${r.richtig}${r.sprache ? ` (${r.sprache})` : ''}`)
    .join('\n');
}

export function wortlisteAusText(text) {
  const regeln = [];
  for (const zeile of String(text || '').split(/\r?\n/)) {
    const sauber = zeile.trim();
    if (!sauber || sauber.startsWith('#')) continue;
    const teile = sauber.split(/->|→/);
    if (teile.length < 2) continue;
    const falsch = teile[0].trim();
    const rest = teile.slice(1).join('->').trim();
    const sprache = (rest.match(/\(([a-zA-Z-]{2,5})\)\s*$/) || [])[1] || '';
    const richtig = rest.replace(/\([a-zA-Z-]{2,5}\)\s*$/, '').trim();
    if (!falsch || !richtig) continue;
    regeln.push({ falsch, richtig, sprache: sprache.toLowerCase() });
  }
  return regeln;
}

export function leseWortliste(text) {
  try {
    const inhalt = JSON.parse(text || 'null');
    const liste = Array.isArray(inhalt) ? inhalt : inhalt && Array.isArray(inhalt.regeln) ? inhalt.regeln : null;
    if (!liste) return [...STANDARD_WORTLISTE];
    const sauber = liste
      .filter((r) => r && r.falsch && r.richtig)
      .map((r) => ({ falsch: String(r.falsch), richtig: String(r.richtig), sprache: String(r.sprache || '').toLowerCase() }));
    return sauber.length ? sauber : [];
  } catch (fehler) {
    return [...STANDARD_WORTLISTE];
  }
}

export function schreibeWortliste(liste = []) {
  return JSON.stringify({ version: WORTLISTE_VERSION, regeln: liste });
}

/* Häufige Wörter, an denen sich die Sprache eines Satzes erkennen lässt. */
const SPRACHMERKMALE = {
  de: ['der', 'die', 'das', 'und', 'mit', 'für', 'fuer', 'von', 'im', 'auf', 'wird', 'nicht', 'eine', 'ein', 'zum', 'zur', 'anlegen', 'öffnen', 'oeffnen', 'speichern', 'bearbeiten', 'auswählen', 'auswaehlen'],
  en: ['the', 'and', 'with', 'for', 'from', 'of', 'is', 'are', 'new', 'open', 'save', 'edit', 'select', 'create', 'settings', 'overview']
};

/**
 * Die Sprache eines Textes - geraten an häufigen Wörtern, nicht gemessen.
 * Ohne deutliches Übergewicht gibt es keine Antwort; so entsteht aus einem
 * Titel wie „Status" kein Befund.
 */
export function spracheDesTextes(text) {
  const woerter = normalisiereLang(text).split(/[^a-z0-9äöüß]+/).filter(Boolean);
  if (woerter.length < 3) return '';
  const zaehle = (liste) => woerter.filter((w) => liste.includes(w)).length;
  const de = zaehle(SPRACHMERKMALE.de);
  const en = zaehle(SPRACHMERKMALE.en);
  if (de >= 2 && de > en) return 'de';
  if (en >= 2 && en > de) return 'en';
  return '';
}

/** Dieselbe Sache, verschieden geschrieben: „oneSCM", „OneSCM", „One SCM". */
export function schreibweisen(texte = []) {
  const gruppen = new Map();
  for (const text of texte) {
    for (const wort of String(text || '').match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9-]{2,}/g) || []) {
      const schluessel = normalisiereLang(wort).replace(/[^a-z0-9]/g, '');
      if (schluessel.length < 4) continue;
      const bisher = gruppen.get(schluessel) || new Map();
      bisher.set(wort, (bisher.get(wort) || 0) + 1);
      gruppen.set(schluessel, bisher);
    }
  }
  return [...gruppen.values()]
    .filter((formen) => formen.size > 1)
    .map((formen) => [...formen].sort((a, b) => b[1] - a[1]).map(([wort, zahl]) => ({ wort, zahl })))
    .sort((a, b) => b.reduce((s, f) => s + f.zahl, 0) - a.reduce((s, f) => s + f.zahl, 0));
}

/**
 * Der vierte Agent: heißt dasselbe überall gleich? Geprüft werden die Texte
 * am Bild (Titel, Notiz, Begriffe), die Texte der Strecken und - wenn
 * vorhanden - die Lesungen aus dem Register OCR. Alles in der Seite, ohne
 * Claude: eine Wortliste ist eine Regel, keine Meinung.
 */
export function pruefeSprache(eingang = [], gliederung = [], strecken = [], { wortliste = STANDARD_WORTLISTE, ocr = {} } = {}) {
  const befunde = [];
  const texteVon = (a) =>
    [a.titel, a.notiz, (a.begriffe || []).join(' '), (ocr[a.id] && ocr[a.id].text) || ''].filter(Boolean).join('\n');

  // 1. Die Wortliste: ein verbotenes Wort, wo ein anderes stehen soll.
  const nachRegel = new Map();
  for (const aufnahme of eingang) {
    const text = texteVon(aufnahme);
    if (!text.trim()) continue;
    const sprache = String(aufnahme.sprache || '');
    for (const regel of wortliste) {
      if (regel.sprache && sprache && regel.sprache !== sprache) continue;
      if (regel.sprache && !sprache) continue;
      // Eine Regel, die nur die Schreibweise meint („OneSCM" → „oneSCM"),
      // muss auf Groß und Klein achten - sonst trifft sie das Richtige mit.
      const nurSchreibweise =
        normalisiereLang(regel.falsch).replace(/[^a-z0-9]/g, '') ===
        normalisiereLang(regel.richtig).replace(/[^a-z0-9]/g, '');
      const muster = new RegExp(
        `(^|[^\\p{L}])${regel.falsch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`,
        nurSchreibweise ? 'u' : 'iu'
      );
      if (!muster.test(text)) continue;
      const schluessel = `${regel.falsch}→${regel.richtig}`;
      nachRegel.set(schluessel, [...(nachRegel.get(schluessel) || []), aufnahme.id]);
    }
  }
  for (const [regel, kennungen] of nachRegel) {
    const [falsch, richtig] = regel.split('→');
    befunde.push(
      befund('warnung', `„${falsch}" statt „${richtig}" in ${kennungen.length} Bild(ern)`,
        `Die Wortliste sieht „${richtig}" vor. Im Text des Bildes steht „${falsch}".`, {
        kennungen,
        weg: 'eingang',
        gewicht: 2
      })
    );
  }

  // 2. Der Text spricht eine andere Sprache als sein Label.
  const fremd = eingang.filter((a) => {
    const label = String(a.sprache || '');
    if (!label) return false;
    const erkannt = spracheDesTextes([a.titel, a.notiz].filter(Boolean).join(' '));
    return erkannt && erkannt !== label;
  });
  if (fremd.length) {
    befunde.push(
      befund('hinweis', `${fremd.length} Bild(er) mit Text in einer anderen Sprache`,
        'Der Titel oder die Notiz liest sich nicht wie das Label „Sprache" sagt. Entweder das Label oder der Text gehört geändert.', {
        kennungen: fremd.map((a) => a.id),
        weg: 'eingang',
        gewicht: 2
      })
    );
  }

  // 3. Dieselbe Sache, verschieden geschrieben.
  const formen = schreibweisen(eingang.map((a) => a.titel)).slice(0, 5);
  for (const gruppe of formen) {
    const woerter = gruppe.map((f) => `${f.wort} (${f.zahl}×)`).join(', ');
    befunde.push(
      befund('hinweis', `Uneinheitliche Schreibweise: ${gruppe.map((f) => f.wort).join(' / ')}`,
        `In den Titeln steht dasselbe Wort verschieden: ${woerter}. Eine Schreibweise wählen.`, {
        kennungen: eingang
          .filter((a) => gruppe.some((f) => String(a.titel || '').includes(f.wort)))
          .map((a) => a.id),
        weg: 'eingang',
        gewicht: 1
      })
    );
  }

  // 4. Schritte ohne Text erklären nichts - das prüft auch der rote Faden,
  //    hier zählt die Sprache: ein Schritt, der kein Satz ist.
  const kurzeSchritte = [];
  for (const strecke of strecken) {
    (strecke.schritte || []).forEach((schritt, i) => {
      const text = String(schritt.text || '').trim();
      if (text && text.length < 12) kurzeSchritte.push(`${strecke.name || 'Strecke'} · Schritt ${i + 1}`);
    });
  }
  if (kurzeSchritte.length) {
    befunde.push(
      befund('hinweis', `${kurzeSchritte.length} Schritt(e) mit sehr kurzem Text`,
        `Unter zwölf Zeichen steht selten eine Anweisung: ${kurzeSchritte.slice(0, 6).join(', ')}.`, {
        weg: 'strecke',
        gewicht: 1
      })
    );
  }

  const mitText = eingang.filter((a) => texteVon(a).trim()).length;
  const gelesen = eingang.filter((a) => ocr[a.id]).length;
  return {
    agent: 'sprache',
    befunde: sortiereBefunde(befunde),
    kennzahlen: [
      { schild: 'Geprüfte Texte', wert: String(mitText), zusatz: `von ${eingang.length} Bildern` },
      { schild: 'Regeln', wert: String(wortliste.length), zusatz: 'in der Wortliste' },
      { schild: 'Lesungen dabei', wert: String(gelesen), zusatz: gelesen ? 'aus dem Register OCR' : 'keine' },
      { schild: 'Befunde', wert: String(befunde.length), zusatz: befunde.length ? 'zu klären' : 'nichts zu klären' }
    ]
  };
}

/**
 * Die Empfehlung sagt, was als nächstes zu tun ist. Sie urteilt nicht über
 * Bilder, sondern über den Weg zum Handbuch: wo Bilder fehlen, wo aus
 * Bildern eine Folge werden kann und wo aus einer Folge eine Seite.
 */
export function empfehlungen(eingang = [], gliederung = [], strecken = []) {
  const befunde = [];
  const { zahlen, ohneStelle } = zaehleBilder(gliederung, eingang);
  const kapitel = gliederung.filter((e) => e.ebene === 1 && e.art !== 'uebergang');
  const belegt = kapitel.filter((e) => (zahlen.get(e.nummer) || {}).gesamt);

  if (ohneStelle) {
    befunde.push(
      befund('hinweis', `${ohneStelle} Bild(er) zuordnen`, 'Im Editor eine Stelle im Handbuch setzen – danach stehen sie in Gliederung und Designstudio zur Verfügung.', {
        kennungen: eingang.filter((a) => !String(a.gliederung || '').trim()).map((a) => a.id),
        weg: 'editor',
        gewicht: 5
      })
    );
  }

  // Aus Bildern eine Folge machen.
  const ohneFolge = gliederung.filter((e) => {
    const zahl = zahlen.get(e.nummer) || {};
    if ((zahl.eigene || 0) < PRUEF_GRENZEN.strecke) return false;
    const bilder = eingang.filter((a) => String(a.gliederung || '') === e.nummer).map((a) => a.id);
    return !strecken.some((s) => (s.schritte || []).some((sch) => (sch.aufnahmen || []).some((k) => bilder.includes(k))));
  });
  for (const e of ohneFolge.slice(0, 5)) {
    befunde.push(
      befund('hinweis', `Folge für ${e.nummer} anlegen`, `„${e.thema}" hat ${(zahlen.get(e.nummer) || {}).eigene} Bilder. Als Folge mit Anweisungen wird daraus eine Anleitung – und daraus ein Blatt.`, {
        stelle: e.nummer,
        weg: 'strecke',
        gewicht: 4
      })
    );
  }

  // Aus einer Folge eine Seite machen.
  for (const strecke of strecken) {
    const schritte = streckeMitAufnahmen(strecke, eingang);
    if (schritte.length < 2) continue;
    if (schritte.some((s) => !String(s.text || '').trim() || s.art === 'platzhalter')) continue;
    befunde.push(
      befund('hinweis', `Blatt aus „${strecke.name || 'ohne Namen'}" erzeugen`, `${schritte.length} Schritte, alle mit Anweisung – im Designstudio wird daraus ein Quick Guide, One Pager, Releaseletter oder eine Handbuchseite.`, {
        weg: 'design',
        gewicht: 4
      })
    );
  }

  // Kapitel ohne jedes Bild - die größten zuerst.
  const leer = kapitel
    .filter((e) => !(zahlen.get(e.nummer) || {}).gesamt)
    .map((e) => ({ eintrag: e, kinder: gliederung.filter((k) => k.ebene > 1 && gehoertZu(k.nummer, e.nummer)).length }))
    .sort((a, b) => b.kinder - a.kinder);
  for (const { eintrag, kinder } of leer.slice(0, 3)) {
    befunde.push(
      befund('hinweis', `Kapitel ${eintrag.nummer} aufnehmen`, `„${eintrag.thema}" hat ${kinder} Stellen und kein einziges Bild – das größte offene Stück.`, {
        stelle: eintrag.nummer,
        weg: 'aufnahme',
        gewicht: 3
      })
    );
  }

  // Übersetzungen: wo eine Sprache steht und eine zweite fehlt.
  const sprachen = new Set(eingang.map((a) => a.sprache).filter(Boolean));
  if (sprachen.size === 1 && eingang.length >= 3) {
    const [eine] = [...sprachen];
    befunde.push(
      befund('hinweis', 'Zweite Sprache fehlt vollständig', `Alle gelabelten Bilder stehen auf ${labelWert('sprache', eine)}. Für ein Handbuch in mehreren Märkten braucht es dieselbe Folge je Sprache.`, {
        weg: 'editor',
        gewicht: 2
      })
    );
  }

  // Rollen: eine Rolle allein deckt oneSCM nicht ab.
  const rollen = new Set(eingang.map((a) => a.rolle_label).filter(Boolean));
  if (rollen.size === 1 && eingang.length >= 3) {
    const fehlen = ROLLEN_LABEL.filter((r) => !rollen.has(r.id)).map((r) => r.label);
    befunde.push(
      befund('hinweis', 'Nur eine Rolle belegt', `Bisher nur ${labelWert('rolle_label', [...rollen][0])}; es fehlen ${fehlen.join(', ')}.`, {
        weg: 'editor',
        gewicht: 2
      })
    );
  }

  const platzhalter = strecken.reduce(
    (summe, s) => summe + (s.schritte || []).filter((sch) => sch.art === 'platzhalter').length,
    0
  );
  if (platzhalter) {
    befunde.push(
      befund('hinweis', `${platzhalter} Platzhalter füllen`, 'In den Folgen stehen Lücken, die auf ein Bild warten – sie sind die kürzeste Liste offener Aufnahmen.', {
        weg: 'strecke',
        gewicht: 5
      })
    );
  }

  if (!befunde.length) {
    befunde.push(
      befund('hinweis', 'Nichts zu empfehlen', 'Jedes Bild ist zugeordnet, jede Folge vollständig, jedes Kapitel belegt. Das ist selten – dann lohnt der Blick ins Designstudio.', {
        weg: 'design',
        gewicht: 1
      })
    );
  }

  return {
    agent: 'empfehlung',
    befunde: sortiereBefunde(befunde),
    kennzahlen: [
      { schild: 'Kapitel belegt', wert: `${belegt.length}`, zusatz: `von ${kapitel.length}` },
      {
        schild: 'Deckung',
        wert: kapitel.length ? `${Math.round((belegt.length / kapitel.length) * 100)} %` : '–'
      },
      { schild: 'Folgen fertig', wert: String(strecken.filter((s) => !pruefeStrecke(s, eingang).length).length) },
      { schild: 'Platzhalter', wert: String(platzhalter) }
    ]
  };
}

/** Führt einen der drei Agenten aus. Ein unbekannter Name liefert nichts. */
export function fuehreAgent(id, eingang = [], gliederung = [], strecken = [], mehr = {}) {
  if (id === 'faden') return pruefeFaden(eingang, gliederung, strecken);
  if (id === 'audit') return pruefeAudit(eingang, gliederung, strecken);
  if (id === 'sprache') return pruefeSprache(eingang, gliederung, strecken, mehr);
  if (id === 'empfehlung') return empfehlungen(eingang, gliederung, strecken);
  return { agent: String(id || ''), befunde: [], kennzahlen: [] };
}

/** Der Bericht als Text - zum Sichern, Weitergeben und Nachlesen. */
export function berichtAlsText(ergebnisse = [], { stand = new Date().toISOString(), anwendung = '' } = {}) {
  const zeilen = [`Prüfbericht Screenarchiv${anwendung ? ' ' + anwendung : ''}`, `Stand: ${formatiereZeitpunkt(stand)}`, ''];
  for (const ergebnis of ergebnisse) {
    const agent = AGENTEN.find((a) => a.id === ergebnis.agent);
    zeilen.push(`## ${agent ? agent.label : ergebnis.agent}`, '');
    zeilen.push((ergebnis.kennzahlen || []).map((k) => `${k.schild}: ${k.wert}${k.zusatz ? ` (${k.zusatz})` : ''}`).join(' · '), '');
    if (!(ergebnis.befunde || []).length) zeilen.push('Kein Befund.', '');
    for (const b of ergebnis.befunde || []) {
      zeilen.push(`[${b.art}] ${b.titel}`);
      zeilen.push(`    ${b.text}`);
      if (b.kennungen.length) zeilen.push(`    Betrifft: ${b.kennungen.slice(0, 20).join(', ')}${b.kennungen.length > 20 ? ' …' : ''}`);
      zeilen.push('');
    }
    if (ergebnis.kommentar) zeilen.push('Kommentar von Claude:', ergebnis.kommentar, '');
  }
  return zeilen.join('\n');
}

/* =========================================================================
   Designstudio, vollständig – Deckblatt, Kopf, Fuß, eigene Vorlagen.

   Was eine Unterlage professionell macht, ist nicht ein Effekt, sondern die
   immer gleiche Ordnung: ein Deckblatt, das sagt, was man in der Hand hält,
   eine Kopfzeile, die auf jeder Seite dasselbe nennt, eine Fußzeile mit
   Stand und Herkunft – und eine Vorlage, die man einmal einrichtet und
   wiederfindet.
   ========================================================================= */

export const DESIGN_SCHLUESSEL = 'screenarchiv:design';
export const DESIGN_VERSION = 1;

/** Die wählbaren Teile der Kopfzeile. Reihenfolge ist Anzeigefolge. */
export const KOPF_TEILE = [
  { id: 'titel', label: 'Titel' },
  { id: 'kapitel', label: 'Stelle im Handbuch' },
  { id: 'projekt', label: 'Projekt' },
  { id: 'vorlage', label: 'Vorlage' },
  { id: 'seitenzahl', label: 'Seitenzahl' }
];

export const FUSS_TEILE = [
  { id: 'herkunft', label: 'Screenarchiv und Fassung' },
  { id: 'stand', label: 'Stand (Datum, Uhrzeit)' },
  { id: 'labels', label: 'Sparte, Rolle, Sprache' },
  { id: 'hinweis', label: 'Eigener Hinweis' },
  { id: 'seitenzahl', label: 'Seitenzahl' }
];

/** Die Vorgaben des Studios - so sieht es aus, bevor etwas eingestellt wird. */
/**
 * Die Marke: Farbe, Schrift und Logo der Unterlagen. Ohne Angabe gelten die
 * Token der Seite - wer ein Haus hat, trägt sie hier ein. Mehr als diese
 * drei Dinge macht ein Erscheinungsbild nicht aus, solange die Ordnung
 * stimmt; und mehr kann eine Seite ohne die Hausschrift auch nicht.
 */
export const MARKEN_SCHRIFTEN = [
  { id: '', label: 'wie die Seite (Archivo)', familie: '' },
  { id: 'plex', label: 'IBM Plex Sans', familie: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: 'arial', label: 'Arial', familie: 'Arial, Helvetica, sans-serif' },
  { id: 'helvetica', label: 'Helvetica', familie: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: 'georgia', label: 'Georgia (Serife)', familie: "Georgia, 'Times New Roman', serif" },
  { id: 'verdana', label: 'Verdana', familie: 'Verdana, Geneva, sans-serif' }
];

/** Ein Logo größer als das wäre im Speicher des Browsers ein Klotz. */
export const LOGO_GRENZE = 200 * 1024;

export function leereHausmarke() {
  return { akzent: '', tinte: '', schrift: '', logo: '' };
}

/** Nimmt nur an, was sich zeichnen lässt: Farbe als #rrggbb, Logo als Bild. */
export function leseHausmarke(roh = {}) {
  const farbe = (wert) => (/^#[0-9a-fA-F]{6}$/.test(String(wert || '')) ? String(wert).toLowerCase() : '');
  const logo = String(roh.logo || '');
  return {
    akzent: farbe(roh.akzent),
    tinte: farbe(roh.tinte),
    schrift: MARKEN_SCHRIFTEN.some((s) => s.id && s.id === roh.schrift) ? String(roh.schrift) : '',
    logo: /^data:image\/(png|jpeg|gif|webp|svg\+xml);/.test(logo) && logo.length <= LOGO_GRENZE ? logo : ''
  };
}

/** Die Schriftfamilie zu einer Wahl - leer heißt: die der Seite. */
export function markenSchrift(id) {
  return (MARKEN_SCHRIFTEN.find((s) => s.id === id) || { familie: '' }).familie;
}

/* ----------------------------------- Die Hausmarke als eigene Datei (1.49.0) */

export const MARKENDATEI_VERSION = 1;

/**
 * Das Erscheinungsbild allein: Farbe, Schrift, Logo, Sprache, Kopf- und
 * Fußzeile, Deckblatt und die eigenen Vorlagen. Ohne Bilder, ohne Bestand -
 * eine Datei, die ein Kollege einliest und danach dieselben Unterlagen baut.
 */
export function markendateiAngaben(einstellungen = {}, { anwendung = '', stand = new Date().toISOString() } = {}) {
  const e = leseDesignEinstellungen(JSON.stringify(einstellungen));
  return {
    hausmarke: MARKENDATEI_VERSION,
    erzeugt_von: `Screenarchiv ${anwendung}`.trim(),
    erzeugt_am: stand,
    marke: e.marke,
    sprache: e.sprache,
    kopf: e.kopf,
    fuss: e.fuss,
    deckblatt: e.deckblatt,
    labels: e.labels,
    texte: e.texte,
    vorlage: e.vorlage,
    format: e.format,
    vorlagen: e.eigene
  };
}

/** Eine Markendatei lesen - nachsichtig, aber ohne fremde Felder zu glauben. */
export function leseMarkendatei(text) {
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return { ok: false, grund: 'Die Datei enthält keine lesbaren Angaben.' };
  }
  if (!inhalt || typeof inhalt !== 'object' || !inhalt.hausmarke) {
    return { ok: false, grund: 'Das ist keine Hausmarke des Screenarchivs.' };
  }
  const marke = leseHausmarke(inhalt.marke || {});
  const eigene = (Array.isArray(inhalt.vorlagen) ? inhalt.vorlagen : []).map(eigeneVorlage).filter(Boolean);
  return {
    ok: true,
    version: Number(inhalt.hausmarke) || 0,
    kuenftig: (Number(inhalt.hausmarke) || 0) > MARKENDATEI_VERSION,
    erzeugt_von: String(inhalt.erzeugt_von || ''),
    marke,
    sprache: AUSGABE_SPRACHEN.some((s) => s.id === inhalt.sprache) ? inhalt.sprache : 'de',
    kopf: Array.isArray(inhalt.kopf) ? inhalt.kopf.filter((k) => KOPF_TEILE.some((x) => x.id === k)) : null,
    fuss: Array.isArray(inhalt.fuss) ? inhalt.fuss.filter((f) => FUSS_TEILE.some((x) => x.id === f)) : null,
    deckblatt: typeof inhalt.deckblatt === 'boolean' ? inhalt.deckblatt : null,
    vorlagen: eigene
  };
}

/** Was eine Markendatei mitbringt, in einem Satz. */
export function markendateiBericht(gelesen = {}) {
  if (!gelesen.ok) return gelesen.grund || 'Die Datei ließ sich nicht lesen.';
  const teile = [
    gelesen.marke.akzent ? `Akzent ${gelesen.marke.akzent}` : '',
    gelesen.marke.schrift ? `Schrift ${gelesen.marke.schrift}` : '',
    gelesen.marke.logo ? 'Logo' : '',
    `Sprache ${gelesen.sprache}`,
    gelesen.vorlagen.length ? `${gelesen.vorlagen.length} eigene Vorlage(n)` : ''
  ].filter(Boolean);
  return teile.join(' · ') + (gelesen.erzeugt_von ? ` · aus ${gelesen.erzeugt_von}` : '');
}

export function leereDesignEinstellungen() {
  return {
    marke: leereHausmarke(),
    sprache: 'de',
    vorlage: 'quickguide',
    format: '',
    texte: true,
    labels: true,
    deckblatt: false,
    kopf: ['titel', 'vorlage', 'seitenzahl'],
    fuss: ['herkunft', 'stand'],
    titel: '',
    untertitel: '',
    hinweis: '',
    eigene: []
  };
}

/** Liest die Einstellungen nachsichtig; Unbekanntes faellt weg. */
export function leseDesignEinstellungen(text) {
  const vorgabe = leereDesignEinstellungen();
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return vorgabe;
  }
  if (!inhalt || typeof inhalt !== 'object') return vorgabe;
  const nurBekannte = (liste, erlaubt) =>
    (Array.isArray(liste) ? liste : []).map((x) => String(x)).filter((x) => erlaubt.some((e) => e.id === x));
  return {
    ...vorgabe,
    ...inhalt,
    vorlage: String(inhalt.vorlage || vorgabe.vorlage),
    format: FORMATE.some((f) => f.id === inhalt.format) ? inhalt.format : '',
    texte: inhalt.texte !== false,
    labels: inhalt.labels !== false,
    deckblatt: Boolean(inhalt.deckblatt),
    kopf: Array.isArray(inhalt.kopf) ? nurBekannte(inhalt.kopf, KOPF_TEILE) : vorgabe.kopf,
    fuss: Array.isArray(inhalt.fuss) ? nurBekannte(inhalt.fuss, FUSS_TEILE) : vorgabe.fuss,
    titel: String(inhalt.titel || ''),
    untertitel: String(inhalt.untertitel || ''),
    hinweis: String(inhalt.hinweis || ''),
    marke: leseHausmarke(inhalt.marke || {}),
    sprache: AUSGABE_SPRACHEN.some((s) => s.id === inhalt.sprache) ? inhalt.sprache : 'de',
    eigene: (Array.isArray(inhalt.eigene) ? inhalt.eigene : []).map(eigeneVorlage).filter(Boolean)
  };
}

export function schreibeDesignEinstellungen(einstellungen = {}) {
  return JSON.stringify({ version: DESIGN_VERSION, ...leseDesignEinstellungen(JSON.stringify(einstellungen)) });
}

/**
 * Eine eigene Vorlage. Sie hat die Form der eingebauten, damit alles
 * Weitere - Seitenrechnung, Namen, Ausgabe - nicht unterscheiden muss, ob
 * sie eingebaut oder selbst eingerichtet ist.
 */
export function eigeneVorlage(satz = {}) {
  const label = String(satz.label || '').trim();
  if (!label) return null;
  const grenzen = (wert, klein, gross, ersatz) => {
    const zahl = Number(wert);
    return Number.isFinite(zahl) ? Math.min(gross, Math.max(klein, Math.round(zahl))) : ersatz;
  };
  const textspalte = Number(satz.textspalte);
  return {
    id: String(satz.id || 'eigen-' + bereinigeDateiname(label) || 'eigen'),
    label,
    eigen: true,
    zweck: String(satz.zweck || 'Eigene Vorlage.'),
    format: FORMATE.some((f) => f.id === satz.format) ? satz.format : 'a4-hoch',
    spalten: grenzen(satz.spalten, 1, 4, 2),
    zeilen: grenzen(satz.zeilen, 1, 6, 2),
    textspalte: Number.isFinite(textspalte) ? Math.min(0.6, Math.max(0, textspalte)) : 0,
    deckblatt: false,
    textlaenge: grenzen(satz.textlaenge, 40, 900, 200)
  };
}

/** Alle Vorlagen: die eingebauten und die eigenen, in dieser Folge. */
export function alleVorlagen(eigene = []) {
  return [...VORLAGEN, ...eigene.map(eigeneVorlage).filter(Boolean)];
}

export function vorlageAus(id, eigene = []) {
  return alleVorlagen(eigene).find((v) => v.id === id) || VORLAGEN[0];
}

/**
 * Die Zeile fuer Kopf oder Fuss. Gebaut wird aus Teilen, die der Nutzer
 * gewaehlt hat - fehlt ein Wert, faellt sein Teil weg und nicht die Zeile.
 */
/* =========================================================================
   Die Sprache der Unterlagen.

   Die Oberfläche ist deutsch - sie bedient das Team. Was die Seite
   *erzeugt*, geht in den Markt: Deckblatt, Kopf- und Fußzeile,
   Bildunterschriften, Handbuch, Fortschrittsblatt. Diese Rahmentexte lassen
   sich umstellen.

   Was NICHT übersetzt wird: die Inhalte. Titel, Notizen und die Texte der
   Gliederung stehen so da, wie sie erfasst wurden - eine Maschine, die sie
   überträgt, würde behaupten, sie verstünde sie. Für eine andere Sprache
   gibt es die Varianten (F-46) und die eigenen Texte (F-65).
   ========================================================================= */

export const AUSGABE_SPRACHEN = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' }
];

export const WORTE = {
  de: {
    unterlage: 'Unterlage',
    inhalt: 'Inhalt',
    stelle: 'Stelle im Handbuch',
    bilder: 'Bilder',
    seiten: 'Seiten',
    vorlage: 'Vorlage',
    labels: 'Sparte, Rolle, Sprache',
    projekt: 'Projekt',
    stand: 'Stand',
    handbuch: 'Benutzerhandbuch',
    fertigWenn: 'Fertig, wenn:',
    abschluss: 'Abschlusskriterium',
    nachweis: 'Nachweis und Quelle',
    uebergang: 'Übergang',
    folge: 'Folge:',
    keinBild: 'Zu dieser Stelle liegt noch kein Bild vor.',
    bildFehlt: 'Bild nicht verfügbar',
    schritt: 'Schritt',
    fortschritt: 'Stand des Handbuchs',
    stellen: 'Stellen',
    belegt: 'belegt',
    ohneStelle: 'ohne Stelle',
    gezaehlt: 'gezählt werden Stellen, nicht Bilder',
    alleProjekte: 'alle Projekte'
  },
  en: {
    unterlage: 'Document',
    inhalt: 'Content',
    stelle: 'Section in the manual',
    bilder: 'Images',
    seiten: 'Pages',
    vorlage: 'Template',
    labels: 'Division, role, language',
    projekt: 'Project',
    stand: 'As of',
    handbuch: 'User manual',
    fertigWenn: 'Done when:',
    abschluss: 'Completion criterion',
    nachweis: 'Evidence and source',
    uebergang: 'Transition',
    folge: 'Sequence:',
    keinBild: 'No image for this section yet.',
    bildFehlt: 'Image not available',
    schritt: 'Step',
    fortschritt: 'State of the manual',
    stellen: 'sections',
    belegt: 'covered',
    ohneStelle: 'without a section',
    gezaehlt: 'sections are counted, not images',
    alleProjekte: 'all projects'
  }
};

/** Ein Rahmentext in der gewählten Sprache; unbekannt heißt deutsch. */
export function sagen(schluessel, sprache = 'de') {
  const satz = WORTE[sprache] || WORTE.de;
  return satz[schluessel] || WORTE.de[schluessel] || String(schluessel);
}

/** „Seite 3 von 4" - in der Sprache der Unterlage. */
export function seitenzahlText(nummer, von, sprache = 'de') {
  return sprache === 'en' ? `Page ${nummer} of ${von}` : `Seite ${nummer} von ${von}`;
}

export function zeilenTeile(teile = [], kontext = {}) {
  const werte = {
    titel: kontext.titel,
    kapitel: kontext.kapitel,
    projekt: kontext.projekt,
    vorlage: kontext.vorlage,
    seitenzahl: kontext.von ? seitenzahlText(kontext.nummer, kontext.von, kontext.sprache) : '',
    herkunft: kontext.herkunft,
    stand: kontext.stand ? formatiereZeitpunkt(kontext.stand) : '',
    labels: kontext.labels,
    hinweis: kontext.hinweis
  };
  return teile.map((id) => String(werte[id] || '').trim()).filter(Boolean);
}

/**
 * Das Deckblatt in Zeilen: Titel, Untertitel und darunter die Angaben als
 * Paare. Ohne DOM gerechnet, damit prüfbar ist, was auf dem Blatt steht.
 */
export function deckblattZeilen(info = {}) {
  const s = info.sprache || 'de';
  const paare = [
    [sagen('inhalt', s), info.quelle],
    [sagen('stelle', s), info.kapitel],
    [sagen('bilder', s), info.anzahl ? String(info.anzahl) : ''],
    [sagen('seiten', s), info.seiten ? String(info.seiten) : ''],
    [sagen('vorlage', s), info.vorlage],
    [sagen('labels', s), info.labels],
    [sagen('projekt', s), info.projekt],
    [sagen('stand', s), info.stand ? formatiereZeitpunkt(info.stand) : '']
  ].filter(([, wert]) => String(wert || '').trim());
  return {
    titel: String(info.titel || sagen('unterlage', s)).trim(),
    untertitel: String(info.untertitel || '').trim(),
    paare,
    hinweis: String(info.hinweis || '').trim()
  };
}

/**
 * Die Labelkette einer Auswahl: was allen Bildern gemeinsam ist, steht auf
 * dem Deckblatt. Was sich unterscheidet, wird gezaehlt statt behauptet.
 */
export function gemeinsameLabels(aufnahmen = []) {
  const teile = [];
  for (const feld of ['sparte', 'rolle_label', 'sprache']) {
    const werte = [...new Set(aufnahmen.map((a) => a && a[feld]).filter(Boolean))];
    if (werte.length === 1) teile.push(labelWert(feld, werte[0]));
    else if (werte.length > 1) teile.push(`${werte.length} ${LABEL_FELDER.find((f) => f.id === feld).label}n`);
  }
  return teile.join(' · ');
}

/* =========================================================================
   Verzeichnis – die Galerie auf die Platte.

   Der Eingang liegt im Browser; dauerhaft wird eine Aufnahme erst als Datei.
   Hier entsteht der Plan dafür: ein Pfad je Bild, gebaut aus Datum, Sprache,
   Kapitel, Rolle und Sparte – genau die Ordnung, in der später gesucht wird.
   Geschrieben wird in der Oberfläche; der Plan selbst ist DOM-frei und damit
   prüfbar, bevor eine einzige Datei entsteht.
   ========================================================================= */

export const VERZEICHNIS_SCHLUESSEL = 'screenarchiv:verzeichnis';

/** Die Vorgabe: Sparte, Sprache, Kapitel, Rolle - und dann der Dateiname. */
export const VERZEICHNIS_MUSTER = '{sparte}/{sprache}/{kapitel}/{rolle}/{datum}_{kennung}_{titel}';

export const VERZEICHNIS_FELDER = [
  { id: 'sparte', hinweis: 'Pkw, Van oder „ohne-sparte"' },
  { id: 'sprache', hinweis: 'de, en … oder „ohne-sprache"' },
  { id: 'rolle', hinweis: 'dealer, market, hq, mo' },
  { id: 'markt', hinweis: 'Markt des Bildes' },
  { id: 'kapitel', hinweis: 'Nummer der Stelle, z. B. 6-2' },
  { id: 'thema', hinweis: 'Thema der Stelle aus der Gliederung' },
  { id: 'datum', hinweis: 'Datum der Aufnahme, 2026-10-17' },
  { id: 'jahr', hinweis: 'Jahr der Aufnahme' },
  { id: 'monat', hinweis: 'Monat der Aufnahme' },
  { id: 'kennung', hinweis: 'AUF-2026-001' },
  { id: 'titel', hinweis: 'Titel, für Dateinamen bereinigt' },
  { id: 'projekt', hinweis: 'Projekt der Aufnahme' },
  { id: 'version', hinweis: 'Version des Projekts, z. B. 2-4' },
  { id: 'land', hinweis: 'Land des Projekts' },
  { id: 'kategorie', hinweis: 'Kategorie der Aufnahme' }
];

export function leereVerzeichnisWahl() {
  return {
    muster: VERZEICHNIS_MUSTER,
    zettel: true, // Beipackzettel je Bild
    fassung: true, // die jüngste Fassung statt des Originals
    index: true, // index.json und index.csv
    strecken: true // strecken.json und die Prozesse als BPMN
  };
}

export function leseVerzeichnisWahl(text) {
  const vorgabe = leereVerzeichnisWahl();
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return vorgabe;
  }
  if (!inhalt || typeof inhalt !== 'object') return vorgabe;
  return {
    muster: String(inhalt.muster || '').trim() || vorgabe.muster,
    zettel: inhalt.zettel !== false,
    fassung: inhalt.fassung !== false,
    index: inhalt.index !== false,
    strecken: inhalt.strecken !== false
  };
}

export function schreibeVerzeichnisWahl(wahl = {}) {
  return JSON.stringify(leseVerzeichnisWahl(JSON.stringify(wahl)));
}

/** Ein Teil eines Pfades: ohne Schrägstriche, ohne Leerzeichen, nie leer. */
function pfadTeil(wert, ersatz) {
  const sauber = bereinigeDateiname(wert);
  return sauber || ersatz;
}

/**
 * Der Pfad eines Bildes aus dem Muster. Unbekannte Platzhalter bleiben
 * stehen *als Text* - stillschweigend zu verschwinden wäre schlimmer, denn
 * dann fiele ein Tippfehler im Muster nie auf.
 */
export function verzeichnisPfad(aufnahme = {}, muster = VERZEICHNIS_MUSTER, gliederung = []) {
  const stelle = String(aufnahme.gliederung || '').trim();
  const eintrag = gliederung.find((e) => e.nummer === stelle);
  const datum = String(aufnahme.datum || aufnahme.erfasst_am || '').slice(0, 10);
  const werte = {
    sparte: pfadTeil(labelWert('sparte', aufnahme.sparte), 'ohne-sparte'),
    sprache: pfadTeil(aufnahme.sprache, 'ohne-sprache'),
    rolle: pfadTeil(aufnahme.rolle_label, 'ohne-rolle'),
    markt: pfadTeil(aufnahme.markt, 'ohne-markt'),
    kapitel: pfadTeil(stelle, 'ohne-kapitel'),
    thema: pfadTeil(eintrag ? eintrag.thema : '', 'ohne-thema'),
    datum: pfadTeil(datum, 'ohne-datum'),
    jahr: pfadTeil(datum.slice(0, 4), 'ohne-jahr'),
    monat: pfadTeil(datum.slice(5, 7), 'ohne-monat'),
    kennung: pfadTeil(aufnahme.id, 'ohne-kennung'),
    titel: pfadTeil(aufnahme.titel, 'ohne-titel'),
    projekt: pfadTeil(aufnahme.projekt, 'ohne-projekt'),
    version: pfadTeil(aufnahme.version, 'ohne-version'),
    land: pfadTeil(aufnahme.land, 'ohne-land'),
    kategorie: pfadTeil(aufnahme.kategorie, 'ohne-kategorie')
  };
  const ersetzt = String(muster || VERZEICHNIS_MUSTER).replace(/\{([a-z]+)\}/g, (ganz, name) =>
    Object.prototype.hasOwnProperty.call(werte, name) ? werte[name] : pfadTeil(ganz, 'unbekannt')
  );
  // Leere Abschnitte fallen weg; ein Pfad mit „//" wäre nicht schreibbar.
  const teile = ersetzt
    .split('/')
    .map((t) => pfadTeil(t, ''))
    .filter(Boolean);
  if (!teile.length) return { ordner: [], name: pfadTeil(aufnahme.id, 'bild') };
  return { ordner: teile.slice(0, -1), name: teile[teile.length - 1] };
}

/**
 * Der Plan für das ganze Verzeichnis: je Bild eine PNG-Datei, dazu auf Wunsch
 * der Beipackzettel, und am Ende die Übersichten. Gleiche Pfade bekommen eine
 * Nummer - zwei Bilder dürfen sich nicht gegenseitig überschreiben.
 */
export function verzeichnisPlan(eingang = [], wahl = {}, gliederung = [], strecken = []) {
  const w = leseVerzeichnisWahl(JSON.stringify({ ...leereVerzeichnisWahl(), ...wahl }));
  const belegt = new Set();
  const dateien = [];
  for (const aufnahme of sortiereNachKapitel(eingang)) {
    const { ordner, name } = verzeichnisPfad(aufnahme, w.muster, gliederung);
    let endgueltig = name;
    let zaehler = 2;
    while (belegt.has([...ordner, endgueltig].join('/'))) endgueltig = `${name}-${zaehler++}`;
    belegt.add([...ordner, endgueltig].join('/'));
    const fassung = w.fassung ? neuesteFassung(aufnahme) : null;
    dateien.push({
      art: 'bild',
      aufnahme: aufnahme.id,
      ordner,
      name: endgueltig + '.png',
      fassung: fassung ? fassung.nummer : 0
    });
    if (w.zettel) {
      dateien.push({ art: 'zettel', aufnahme: aufnahme.id, ordner, name: endgueltig + '.json' });
    }
  }
  if (w.index) {
    dateien.push({ art: 'index', ordner: [], name: 'index.json' });
    dateien.push({ art: 'tabelle', ordner: [], name: 'index.csv' });
  }
  if (w.strecken && strecken.length) {
    dateien.push({ art: 'strecken', ordner: [], name: 'strecken.json' });
    for (const strecke of strecken) {
      dateien.push({
        art: 'bpmn',
        strecke: strecke.id,
        ordner: ['prozesse'],
        name: (bereinigeDateiname(strecke.name) || strecke.id.toLowerCase()) + '.bpmn'
      });
    }
  }
  return dateien;
}

/** Die Übersicht als JSON: was abgelegt wurde, in welcher Ordnung. */
export function galerieIndex(eingang = [], plan = [], { stand = new Date().toISOString(), anwendung = '', muster = VERZEICHNIS_MUSTER, gliederung = [] } = {}) {
  const nachKennung = new Map(plan.filter((d) => d.art === 'bild').map((d) => [d.aufnahme, d]));
  return {
    galerie: 1,
    erzeugt_von: `Screenarchiv ${anwendung}`.trim(),
    erzeugt_am: stand,
    muster,
    anzahl: eingang.length,
    bilder: sortiereNachKapitel(eingang).map((a) => {
      const datei = nachKennung.get(a.id);
      const stelle = String(a.gliederung || '').trim();
      const eintrag = gliederung.find((e) => e.nummer === stelle) || null;
      return {
        id: a.id,
        datei: datei ? [...datei.ordner, datei.name].join('/') : '',
        fassung: datei ? datei.fassung : 0,
        titel: a.titel,
        projekt: a.projekt,
        version: a.version || '',
        land: a.land || '',
        kategorie: a.kategorie,
        datum: a.datum,
        erfasst_am: a.erfasst_am,
        stelle,
        thema: eintrag ? eintrag.thema : '',
        sprache: a.sprache || '',
        rolle: a.rolle_label || '',
        sparte: a.sparte || '',
        markt: a.markt || '',
        begriffe: a.begriffe || [],
        notiz: a.notiz || '',
        breite: a.breite || 0,
        hoehe: a.hoehe || 0,
        einfuhr: a.einfuhr || null
      };
    })
  };
}

/** Dieselbe Übersicht als CSV - zum Öffnen in einer Tabelle. */
export function galerieCsv(index = {}) {
  const spalten = [
    'id', 'datei', 'stelle', 'thema', 'titel', 'projekt', 'version', 'land',
    'sprache', 'rolle', 'sparte', 'markt', 'datum', 'breite', 'hoehe', 'begriffe'
  ];
  const zelle = (wert) => {
    const text = Array.isArray(wert) ? wert.join(' ') : String(wert ?? '');
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const zeilen = [spalten.join(';')];
  for (const bild of index.bilder || []) zeilen.push(spalten.map((s) => zelle(bild[s])).join(';'));
  return zeilen.join('\n') + '\n';
}

/** Der Bericht nach dem Schreiben: was liegt wo, und was fehlte. */
export function verzeichnisBericht(geschrieben = [], fehler = [], ordnername = '') {
  const zahl = (art) => geschrieben.filter((d) => d.art === art).length;
  const teile = [
    `${zahl('bild')} Bild${zahl('bild') === 1 ? '' : 'er'}`,
    zahl('zettel') ? `${zahl('zettel')} Beipackzettel` : '',
    zahl('bpmn') ? `${zahl('bpmn')} Prozess${zahl('bpmn') === 1 ? '' : 'e'}` : '',
    zahl('index') || zahl('tabelle') ? 'Übersicht' : '',
    zahl('strecken') ? 'Strecken' : ''
  ].filter(Boolean);
  const kopf = ordnername ? `In „${ordnername}" liegen nun: ${teile.join(', ')}.` : `Abgelegt: ${teile.join(', ')}.`;
  if (!fehler.length) return kopf;
  return `${kopf} Nicht geschrieben wurden ${fehler.length}: ${fehler.slice(0, 5).join('; ')}${fehler.length > 5 ? ' …' : ''}`;
}

/* =========================================================================
   Varianten – dieselbe Maske in anderer Sprache, Rolle, Sparte oder Markt.

   Ein Label sagt, *was* ein Bild ist. Es sagt nicht, dass zwei Bilder
   dieselbe Maske zeigen - einmal auf Deutsch, einmal auf Englisch. Genau das
   braucht ein Handbuch in 21 Sprachen und vier Rollen: eine Gruppe, die die
   Entsprechungen zusammenhält. Darüber lässt sich dann zählen, was fehlt, und
   eine fertige Strecke in eine andere Sprache ausgeben.

   Die Gruppe steht als `variante` an jeder Aufnahme - eine Kennung, kein
   Zeiger auf ein "Original": unter Entsprechungen gibt es keine Rangfolge.
   ========================================================================= */

/** Die Felder, in denen sich Varianten unterscheiden dürfen. */
export const VARIANTEN_FELDER = ['sprache', 'rolle_label', 'sparte', 'markt', 'version', 'land'];

/** Eine neue Gruppenkennung; die Zeit macht sie eindeutig genug. */
export function neueVariantengruppe(zeit = Date.now()) {
  return 'VAR-' + zeit.toString(36).toUpperCase();
}

export function variantengruppe(aufnahme = {}) {
  return String(aufnahme.variante || '').trim();
}

/**
 * Alle Aufnahmen einer Gruppe, in der Folge der Gliederung. Ohne Gruppe ist
 * eine Aufnahme ihre eigene einzige Variante - das macht die Aufrufe einfach.
 */
export function variantenVon(eingang = [], aufnahme = {}) {
  const gruppe = variantengruppe(aufnahme);
  if (!gruppe) return aufnahme && aufnahme.id ? [aufnahme] : [];
  return sortiereNachKapitel(eingang.filter((a) => variantengruppe(a) === gruppe));
}

/**
 * Verbindet Aufnahmen zu einer Gruppe. Gehört eine davon schon zu einer,
 * wird diese weitergeführt - sonst bekäme ein zweites Verbinden eine neue
 * Kennung und die bisherigen Entsprechungen fielen auseinander. Treffen zwei
 * Gruppen aufeinander, gewinnt die größere, und die kleinere wandert mit.
 */
export function verbindeVarianten(eingang = [], kennungen = [], zeit = Date.now()) {
  const gewaehlt = eingang.filter((a) => kennungen.includes(a.id));
  if (gewaehlt.length < 2) return { eingang, gruppe: '', verbunden: 0 };
  const gruppen = [...new Set(gewaehlt.map(variantengruppe).filter(Boolean))];
  const groesse = (gruppe) => eingang.filter((a) => variantengruppe(a) === gruppe).length;
  const gruppe = gruppen.length ? [...gruppen].sort((a, b) => groesse(b) - groesse(a) || a.localeCompare(b))[0] : neueVariantengruppe(zeit);
  const betroffen = new Set([...kennungen, ...eingang.filter((a) => gruppen.includes(variantengruppe(a))).map((a) => a.id)]);
  return {
    eingang: eingang.map((a) => (betroffen.has(a.id) ? { ...a, variante: gruppe } : a)),
    gruppe,
    verbunden: betroffen.size
  };
}

/** Nimmt eine Aufnahme aus ihrer Gruppe; bleibt eine allein, löst sie sich. */
export function loeseVariante(eingang = [], kennung) {
  const aufnahme = eingang.find((a) => a.id === kennung);
  const gruppe = variantengruppe(aufnahme || {});
  if (!gruppe) return eingang;
  const ohne = eingang.map((a) => (a.id === kennung ? { ...a, variante: '' } : a));
  const rest = ohne.filter((a) => variantengruppe(a) === gruppe);
  // Eine Gruppe mit einem Mitglied ist keine Gruppe.
  return rest.length > 1 ? ohne : ohne.map((a) => (variantengruppe(a) === gruppe ? { ...a, variante: '' } : a));
}

/** Die Entsprechung in einem bestimmten Wert - oder null, wenn sie fehlt. */
export function findeVariante(eingang = [], aufnahme = {}, feld, wert) {
  if (!VARIANTEN_FELDER.includes(feld)) return null;
  if (String(aufnahme[feld] || '') === String(wert || '')) return aufnahme;
  return variantenVon(eingang, aufnahme).find((a) => String(a[feld] || '') === String(wert || '')) || null;
}

/**
 * Was einer Gruppe in einem Feld fehlt: die Werte, die andere Gruppen haben,
 * diese aber nicht. Ohne diesen Vergleich wäre "vollständig" eine Behauptung.
 */
export function fehlendeVarianten(eingang = [], aufnahme = {}, feld, erwartet = []) {
  const vorhanden = new Set(variantenVon(eingang, aufnahme).map((a) => String(a[feld] || '')).filter(Boolean));
  return erwartet.map(String).filter((wert) => !vorhanden.has(wert));
}

/**
 * Die Deckungsmatrix: je Stelle der Gliederung, wie viele Bilder es in
 * welcher Sprache (oder Rolle, Sparte, Markt) gibt. Spalten sind die Werte,
 * die im Bestand vorkommen - eine Spalte für jede der 21 Sprachen wäre eine
 * Tabelle, die niemand liest.
 */
export function deckungsMatrix(gliederung = [], eingang = [], feld = 'sprache') {
  const werte = [...new Set(eingang.map((a) => String(a[feld] || '')).filter(Boolean))].sort((a, b) =>
    labelWert(feld, a).localeCompare(labelWert(feld, b))
  );
  const stellen = [...new Set(eingang.map((a) => String(a.gliederung || '').trim()).filter(Boolean))];
  const zeilen = [];
  for (const nummer of stellen.sort(vergleicheKapitel)) {
    const eintrag = gliederung.find((e) => e.nummer === nummer) || null;
    const bilder = eingang.filter((a) => String(a.gliederung || '').trim() === nummer);
    const zellen = werte.map((wert) => {
      const treffer = bilder.filter((a) => String(a[feld] || '') === wert);
      return { wert, zahl: treffer.length, kennungen: treffer.map((a) => a.id) };
    });
    const ohne = bilder.filter((a) => !String(a[feld] || '').trim());
    zeilen.push({
      nummer,
      thema: eintrag ? eintrag.thema : '',
      bekannt: Boolean(eintrag),
      zellen,
      ohne: ohne.length,
      gesamt: bilder.length
    });
  }
  const summen = werte.map((wert, i) => zeilen.reduce((summe, z) => summe + z.zellen[i].zahl, 0));
  const voll = zeilen.filter((z) => z.zellen.every((c) => c.zahl > 0)).length;
  return {
    feld,
    spalten: werte.map((wert) => ({ wert, label: labelWert(feld, wert) })),
    zeilen,
    summen,
    ohne: eingang.filter((a) => !String(a[feld] || '').trim()).length,
    vollstaendig: voll
  };
}

/**
 * Dieselbe Strecke in einem anderen Wert: jeder Schritt bekommt, wo es sie
 * gibt, die Entsprechung. Wo keine Entsprechung vorliegt, bleibt das Bild
 * stehen und wird genannt - lieber ein Blatt mit einer gemischten Seite als
 * ein Blatt mit Löchern, von denen niemand weiß.
 */
export function streckeInVariante(strecke = {}, eingang = [], feld = 'sprache', wert = '') {
  const fehlt = [];
  const schritte = (strecke.schritte || []).map((schritt, i) => {
    const kennungen = (schritt.aufnahmen || []).map((kennung) => {
      const aufnahme = eingang.find((a) => a.id === kennung);
      if (!aufnahme) return kennung;
      const treffer = findeVariante(eingang, aufnahme, feld, wert);
      if (treffer) return treffer.id;
      fehlt.push({ nummer: i + 1, aufnahme: kennung, titel: aufnahme.titel || kennung });
      return kennung;
    });
    return { ...schritt, aufnahmen: kennungen };
  });
  return {
    strecke: { ...strecke, schritte, name: `${strecke.name || 'Strecke'} · ${labelWert(feld, wert)}` },
    fehlt
  };
}

/* =========================================================================
   Handbuch – alle Kapitel in einem Dokument.

   Das Designstudio setzt Blätter: eine Strecke, ein Kapitel, eine Vorlage.
   Das Handbuch ist das andere Ende: die ganze Gliederung in einem Stück, in
   ihrer Ordnung, mit den Texten der Gliederung, den Bildern an ihrer Stelle
   und - wo eine Strecke die Bilder erzählt - deren Anweisungen als Folge.

   Gebaut wird HTML: der Browser macht daraus das PDF. Ein selbstgeschriebener
   PDF-Satz wäre ohne Fremdcode schlechter als der Druckweg, und Fremdcode
   lässt die Inhaltsrichtlinie des Artifacts nicht zu.
   ========================================================================= */

/** Die Strecke, die eine Stelle am besten erzählt - oder null. */
export function streckeFuerStelle(strecken = [], eingang = [], nummer) {
  let beste = null;
  let hoechste = 0;
  for (const strecke of strecken) {
    const schritte = streckeMitAufnahmen(strecke, eingang);
    const treffer = schritte.filter((s) => s.aufnahme && gehoertZu(String(s.aufnahme.gliederung || ''), nummer)).length;
    if (treffer > hoechste) {
      hoechste = treffer;
      beste = { strecke, schritte, treffer };
    }
  }
  return beste;
}

/**
 * Die Teile des Handbuchs in der Ordnung der Gliederung. Eine Stelle kommt
 * vor, wenn sie Bilder hat - oder, mit `nurMitBildern: false`, weil sie in
 * der Gliederung steht. Leere Kapitel sind keine Panne: sie zeigen, was noch
 * fehlt, und halten die Nummerierung des Handbuchs zusammen.
 */
export function handbuchTeile(gliederung = [], eingang = [], strecken = [], { stelle = '', nurMitBildern = true } = {}) {
  const teile = [];
  for (const eintrag of gliederung) {
    if (eintrag.art === 'uebergang') continue;
    if (stelle && !gehoertZu(eintrag.nummer, stelle)) continue;
    const bilder = sortiereNachKapitel(eingang.filter((a) => String(a.gliederung || '').trim() === eintrag.nummer));
    const kinderBilder = eingang.filter((a) => gehoertZu(String(a.gliederung || '').trim(), eintrag.nummer)).length;
    if (nurMitBildern && !kinderBilder) continue;
    const folge = bilder.length ? streckeFuerStelle(strecken, eingang, eintrag.nummer) : null;
    teile.push({
      nummer: eintrag.nummer,
      thema: eintrag.thema,
      ebene: eintrag.ebene,
      // Wie viele Bilder unterhalb liegen: ein Kapitel ohne eigene Bilder ist
      // keine Luecke, wenn seine Unterkapitel welche haben.
      nachkommen: kinderBilder,
      kriterium: eintrag.kriterium,
      notiz: eintrag.notiz,
      text: eintrag.text,
      bilder,
      // Die Anweisungen der Strecke gehören zu den Bildern, die sie zeigt.
      schritte: folge
        ? folge.schritte
            .filter((s) => s.aufnahme && gehoertZu(String(s.aufnahme.gliederung || ''), eintrag.nummer))
            .map((s) => ({ nummer: s.nummer, text: s.text, aufnahme: s.aufnahme.id }))
        : [],
      folge: folge ? folge.strecke.name || 'Klickstrecke' : ''
    });
  }
  return teile;
}

/** Zählt, was das Handbuch enthalten wird - vor dem Rechnen. */
export function handbuchUmfang(teile = []) {
  return {
    stellen: teile.length,
    bilder: teile.reduce((summe, t) => summe + t.bilder.length, 0),
    kapitel: teile.filter((t) => t.ebene === 1).length,
    ohneBild: teile.filter((t) => !t.bilder.length).length
  };
}

/**
 * Das Handbuch als HTML. Die Bilder kommen als Datenadressen herein - gerechnet
 * werden sie in der Oberfläche, weil nur sie eine Leinwand hat.
 */
export function handbuchHtml(
  teile = [],
  {
    titel = '',
    untertitel = '',
    hinweis = '',
    stand = new Date().toISOString(),
    anwendung = '',
    bilder = new Map(),
    mitTexten = true,
    sprache = 'de'
  } = {}
) {
  const m = maskiereHtml;
  const w = (schluessel) => sagen(schluessel, sprache);
  titel = titel || w('handbuch');
  const anker = (nummer) => 'stelle-' + String(nummer).replace(/[^0-9A-Za-z]/g, '-');
  const umfang = handbuchUmfang(teile);

  const inhalt = teile
    .filter((t) => t.ebene <= 2)
    .map(
      (t) =>
        `<li class="ebene-${t.ebene}"><a href="#${anker(t.nummer)}"><span class="nummer">${m(t.nummer)}</span> ${m(
          t.thema
        )}</a><span class="zahl">${t.bilder.length || ''}</span></li>`
    )
    .join('\n');

  const abschnitte = teile
    .map((t) => {
      const ueberschrift = `h${Math.min(4, Math.max(2, t.ebene + 1))}`;
      const texte = mitTexten
        ? [
            t.kriterium ? `<p class="schild">${m(w('abschluss'))}</p><p>${m(t.kriterium)}</p>` : '',
            t.notiz ? `<p class="schild">${m(w('nachweis'))}</p><p>${m(t.notiz)}</p>` : '',
            t.text ? `<p class="schild">${m(w('uebergang'))}</p><p>${m(t.text)}</p>` : ''
          ]
            .filter(Boolean)
            .join('\n')
        : '';
      const anweisung = new Map(t.schritte.map((s) => [s.aufnahme, s]));
      const abbildungen = t.bilder
        .map((a) => {
          const schritt = anweisung.get(a.id);
          const quelle = bilder.get(a.id) || a.bild || '';
          return [
            '<figure>',
            quelle ? `<img src="${quelle}" alt="${m(a.titel)}">` : `<p class="fehlt">${m(w('bildFehlt'))}</p>`,
            `<figcaption>${schritt ? `<b>${m(String(schritt.nummer))}. ${m(schritt.text || a.titel)}</b><br>` : ''}${m(
              bildunterschrift(a)
            )}${labelKette(a) ? ` · ${m(labelKette(a))}` : ''}</figcaption>`,
            '</figure>'
          ].join('');
        })
        .join('\n');
      return [
        `<section class="stelle ebene-${t.ebene}" id="${anker(t.nummer)}">`,
        `<${ueberschrift}><span class="nummer">${m(t.nummer)}</span> ${m(t.thema)}</${ueberschrift}>`,
        t.folge ? `<p class="folge">${m(w('folge'))} ${m(t.folge)}</p>` : '',
        texte,
        abbildungen || (t.nachkommen ? '' : `<p class="fehlt">${m(w('keinBild'))}</p>`),
        '</section>'
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<!doctype html>
<html lang="${sprache}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${m(titel)}</title>
<style>
  @page { size: A4 portrait; margin: 18mm 16mm; }
  :root { color-scheme: light; }
  body { margin: 0; background: #ECEEF2; color: #141A24;
         font-family: 'IBM Plex Sans', system-ui, sans-serif; line-height: 1.55; }
  .blatt { max-width: 900px; margin: 0 auto; background: #FFF; padding: 48px 56px 64px; }
  h1 { font-size: 30px; margin: 0 0 6px; }
  .untertitel { color: #4A5769; margin: 0 0 24px; }
  .stand { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #77839A; }
  .inhalt { border-top: 1px solid #D6DBE4; border-bottom: 1px solid #D6DBE4; margin: 24px 0 32px; padding: 16px 0; }
  .inhalt ul { list-style: none; margin: 0; padding: 0; }
  .inhalt li { display: flex; gap: 10px; align-items: baseline; font-size: 14px; padding: 2px 0; }
  .inhalt li.ebene-2 { padding-left: 22px; font-size: 13px; }
  .inhalt a { color: inherit; text-decoration: none; flex: 1 1 auto; }
  .inhalt a:hover { text-decoration: underline; }
  .inhalt .zahl { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #77839A; }
  .nummer { font-family: ui-monospace, Menlo, monospace; color: #B4432B; margin-right: 8px; }
  .stelle { margin: 0 0 34px; }
  .stelle.ebene-1 { border-top: 3px solid #141A24; padding-top: 18px; break-before: page; }
  .stelle h2 { font-size: 23px; margin: 0 0 10px; }
  .stelle h3 { font-size: 18px; margin: 0 0 8px; }
  .stelle h4 { font-size: 15px; margin: 0 0 6px; }
  .schild { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; letter-spacing: .05em;
            text-transform: uppercase; color: #77839A; margin: 12px 0 2px; }
  .stelle p { margin: 0 0 8px; font-size: 14px; }
  .folge { font-size: 12.5px; color: #4A5769; }
  figure { margin: 16px 0 20px; break-inside: avoid; }
  figure img { display: block; width: 100%; height: auto; border: 1px solid #D6DBE4; }
  figcaption { font-size: 12px; color: #4A5769; margin-top: 6px; }
  .fehlt { font-size: 13px; color: #9A6B1F; }
  .fuss { border-top: 1px solid #D6DBE4; margin-top: 40px; padding-top: 12px;
          font-size: 11.5px; color: #77839A; display: flex; justify-content: space-between; gap: 16px; }
  @media print { body { background: #FFF; } .blatt { max-width: none; margin: 0; padding: 0; } }
</style>
</head><body><div class="blatt">
<h1>${m(titel)}</h1>
${untertitel ? `<p class="untertitel">${m(untertitel)}</p>` : ''}
<p class="stand">${m(formatiereZeitpunkt(stand))} · ${umfang.kapitel} Kapitel · ${umfang.stellen} Stellen · ${
    umfang.bilder
  } Bilder${umfang.ohneBild ? ` · ${umfang.ohneBild} Stellen noch ohne Bild` : ''}</p>
<nav class="inhalt"><ul>
${inhalt}
</ul></nav>
${abschnitte}
<div class="fuss"><span>Screenarchiv ${m(anwendung)}</span><span>${m(hinweis)}</span></div>
</div></body></html>
`;
}

/* =========================================================================
   ZIP, Word und PowerPoint – die Blätter in fremden Formaten.

   Ein .docx und ein .pptx sind ZIP-Archive mit XML darin. Geschrieben wird
   ohne Kompression (`gespeichert`): die Bilder sind schon JPEG, ein zweites
   Verpacken brächte nichts und bräuchte einen Packer, den die Seite nicht
   hat. Word und PowerPoint lesen gespeicherte Archive ebenso.
   ========================================================================= */

// Die Pruefsumme eines ZIP-Eintrags ist dieselbe wie die eines PNG-Blocks -
// `crc32` steht schon weiter oben.

const TEXT_ZU_BYTES = (text) => new TextEncoder().encode(String(text));

function schreibeU16(wert) {
  return new Uint8Array([wert & 0xff, (wert >>> 8) & 0xff]);
}

function schreibeU32(wert) {
  return new Uint8Array([wert & 0xff, (wert >>> 8) & 0xff, (wert >>> 16) & 0xff, (wert >>> 24) & 0xff]);
}

/**
 * Ein ZIP aus benannten Dateien, ohne Kompression.
 * `dateien`: [{ name, daten: Uint8Array | string }]
 */
export function zipSchreiben(dateien = []) {
  const eintraege = dateien
    .filter((d) => d && d.name)
    .map((d) => ({
      name: TEXT_ZU_BYTES(d.name),
      daten: typeof d.daten === 'string' ? TEXT_ZU_BYTES(d.daten) : d.daten || new Uint8Array()
    }));
  if (!eintraege.length) return null;

  const teile = [];
  let laenge = 0;
  const schreibe = (stueck) => {
    teile.push(stueck);
    laenge += stueck.length;
  };

  const verzeichnis = [];
  for (const eintrag of eintraege) {
    const pruefsumme = crc32(eintrag.daten);
    const ab = laenge;
    // Lokaler Kopf: Version 2.0, keine Merkmale, Verfahren 0 (gespeichert).
    schreibe(schreibeU32(0x04034b50));
    schreibe(schreibeU16(20));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0)); // Uhrzeit
    schreibe(schreibeU16(0x21)); // Datum: 1.1.1980 – gleicher Inhalt, gleiche Datei
    schreibe(schreibeU32(pruefsumme));
    schreibe(schreibeU32(eintrag.daten.length));
    schreibe(schreibeU32(eintrag.daten.length));
    schreibe(schreibeU16(eintrag.name.length));
    schreibe(schreibeU16(0));
    schreibe(eintrag.name);
    schreibe(eintrag.daten);
    verzeichnis.push({ ...eintrag, pruefsumme, ab });
  }

  const verzeichnisAb = laenge;
  for (const eintrag of verzeichnis) {
    schreibe(schreibeU32(0x02014b50));
    schreibe(schreibeU16(20)); // erzeugt von
    schreibe(schreibeU16(20)); // benötigt
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0x21));
    schreibe(schreibeU32(eintrag.pruefsumme));
    schreibe(schreibeU32(eintrag.daten.length));
    schreibe(schreibeU32(eintrag.daten.length));
    schreibe(schreibeU16(eintrag.name.length));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0));
    schreibe(schreibeU16(0));
    schreibe(schreibeU32(0));
    schreibe(schreibeU32(eintrag.ab));
    schreibe(eintrag.name);
  }

  // Die Groesse des Verzeichnisses steht fest, bevor der Schluss geschrieben
  // wird - sonst zaehlte er sich selbst mit.
  const verzeichnisGroesse = laenge - verzeichnisAb;
  schreibe(schreibeU32(0x06054b50));
  schreibe(schreibeU16(0));
  schreibe(schreibeU16(0));
  schreibe(schreibeU16(verzeichnis.length));
  schreibe(schreibeU16(verzeichnis.length));
  schreibe(schreibeU32(verzeichnisGroesse));
  schreibe(schreibeU32(verzeichnisAb));
  schreibe(schreibeU16(0));

  const ganz = new Uint8Array(laenge);
  let stelle = 0;
  for (const stueck of teile) {
    ganz.set(stueck, stelle);
    stelle += stueck.length;
  }
  return ganz;
}

/** XML-sicher: fünf Zeichen, die in keinem Wert stehen dürfen. */
function maskiereXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const XML_KOPF = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** Bildpunkte bei 300 dpi in EMU – das Maß, in dem Office rechnet. */
const emu = (punkte, dpi = 300) => Math.round((punkte / dpi) * 914400);

const bildEndung = (typ) => (typ === 'jpeg' || typ === 'jpg' ? 'jpeg' : 'png');

/**
 * Die Blätter als Word-Datei: ein Bild je Seite, Ränder auf null, das
 * Seitenformat aus dem ersten Blatt. Word setzt nichts um - es zeigt, was
 * das Studio gerechnet hat.
 *
 * `seiten`: [{ daten: Uint8Array, breite, hoehe, typ: 'png' | 'jpeg' }]
 */
export function docxAusSeiten(seiten = [], { titel = '', anwendung = '', dpi = 300 } = {}) {
  const gueltig = seiten.filter((s) => s && s.daten && s.daten.length && s.breite > 0 && s.hoehe > 0);
  if (!gueltig.length) return null;
  const quer = gueltig[0].breite > gueltig[0].hoehe;
  // A4 in Twips (1/20 Punkt), gedreht, wenn das Blatt quer liegt.
  const blattBreite = quer ? 16838 : 11906;
  const blattHoehe = quer ? 11906 : 16838;
  const breiteEmu = Math.round((blattBreite / 20) * 12700);
  const hoeheEmu = Math.round((blattHoehe / 20) * 12700);

  // Das Blatt wird eingepasst, nicht gestreckt - und bleibt knapp unter der
  // Seite: ein Bild, das sie ganz ausfüllt, schiebt den Absatz dahinter auf
  // eine leere Folgeseite.
  const bilder = gueltig.map((seite, i) => {
    const massstab =
      Math.min(breiteEmu / emu(seite.breite, dpi), hoeheEmu / emu(seite.hoehe, dpi)) * 0.985;
    return {
      name: `blatt${i + 1}.${bildEndung(seite.typ)}`,
      bezug: `rId${i + 1}`,
      daten: seite.daten,
      breite: Math.round(emu(seite.breite, dpi) * massstab),
      hoehe: Math.round(emu(seite.hoehe, dpi) * massstab)
    };
  });

  // Die Schriftgröße 1 pt gilt nur dem Absatzzeichen - es soll keine Zeile
  // kosten, auf der das Blatt dann nicht mehr Platz hat.
  const absatz = (bild, i) =>
    `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>` +
    `<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${bild.breite}" cy="${bild.hoehe}"/><wp:docPr id="${i + 1}" name="${maskiereXml(bild.name)}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${i + 1}" name="${maskiereXml(bild.name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${bild.bezug}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${bild.breite}" cy="${bild.hoehe}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>` +
    `</wp:inline></w:drawing></w:r></w:p>`;

  // Kein eingefügter Seitenumbruch: jedes Blatt füllt die Seite fast ganz,
  // zwei passen nie zusammen auf eine. Ein Umbruch dazwischen ergäbe leere
  // Seiten.
  const koerper = bilder.map(absatz).join('');

  const dokument =
    XML_KOPF +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${koerper}` +
    `<w:sectPr><w:pgSz w:w="${blattBreite}" w:h="${blattHoehe}"${quer ? ' w:orient="landscape"' : ''}/>` +
    `<w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`;

  const bezuege =
    XML_KOPF +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    bilder
      .map(
        (bild) =>
          `<Relationship Id="${bild.bezug}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${bild.name}"/>`
      )
      .join('') +
    `</Relationships>`;

  const typen =
    XML_KOPF +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="png" ContentType="image/png"/>` +
    `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `</Types>`;

  const wurzelBezuege =
    XML_KOPF +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rIdDok" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rIdKern" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `</Relationships>`;

  const kern =
    XML_KOPF +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${maskiereXml(titel)}</dc:title>` +
    `<dc:creator>${maskiereXml(`Screenarchiv ${anwendung}`.trim())}</dc:creator>` +
    `<cp:lastModifiedBy>${maskiereXml(`Screenarchiv ${anwendung}`.trim())}</cp:lastModifiedBy>` +
    `</cp:coreProperties>`;

  return zipSchreiben([
    { name: '[Content_Types].xml', daten: typen },
    { name: '_rels/.rels', daten: wurzelBezuege },
    { name: 'docProps/core.xml', daten: kern },
    { name: 'word/document.xml', daten: dokument },
    { name: 'word/_rels/document.xml.rels', daten: bezuege },
    ...bilder.map((bild) => ({ name: `word/media/${bild.name}`, daten: bild.daten }))
  ]);
}

/* Das Gerüst, das PowerPoint verlangt: Master, Layout, Thema. Es trägt
   nichts bei - ohne diese Teile öffnet die Datei aber nicht. */
const PPT_THEMA =
  XML_KOPF +
  '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Screenarchiv">' +
  '<a:themeElements><a:clrScheme name="Screenarchiv">' +
  '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
  '<a:dk2><a:srgbClr val="1F2933"/></a:dk2><a:lt2><a:srgbClr val="F3F4F6"/></a:lt2>' +
  '<a:accent1><a:srgbClr val="00677F"/></a:accent1><a:accent2><a:srgbClr val="1E7A5A"/></a:accent2>' +
  '<a:accent3><a:srgbClr val="8A6110"/></a:accent3><a:accent4><a:srgbClr val="9B2C2C"/></a:accent4>' +
  '<a:accent5><a:srgbClr val="4C5B6B"/></a:accent5><a:accent6><a:srgbClr val="6B7280"/></a:accent6>' +
  '<a:hlink><a:srgbClr val="00677F"/></a:hlink><a:folHlink><a:srgbClr val="6B7280"/></a:folHlink></a:clrScheme>' +
  '<a:fontScheme name="Screenarchiv">' +
  '<a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
  '<a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
  '<a:fmtScheme name="Screenarchiv">' +
  '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
  '<a:lnStyleLst>' +
  '<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
  '<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
  '<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>' +
  '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle>' +
  '<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
  '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
  '</a:fmtScheme></a:themeElements></a:theme>';

const PPT_LAYOUT =
  XML_KOPF +
  '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">' +
  '<p:cSld name="Leer"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
  '</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" ' +
  'accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
  '</p:clrMapOvr></p:sldLayout>';

const PPT_MASTER =
  XML_KOPF +
  '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
  '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
  '</p:spTree></p:cSld>' +
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" ' +
  'accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
  '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>';

/**
 * Die Blätter als PowerPoint: eine Folie je Blatt, das Bild füllt sie ganz.
 * Das Folienmaß folgt dem ersten Blatt, damit nichts beschnitten wird.
 */
export function pptxAusSeiten(seiten = [], { titel = '', anwendung = '', dpi = 300 } = {}) {
  const gueltig = seiten.filter((s) => s && s.daten && s.daten.length && s.breite > 0 && s.hoehe > 0);
  if (!gueltig.length) return null;
  const folieBreite = emu(gueltig[0].breite, dpi);
  const folieHoehe = emu(gueltig[0].hoehe, dpi);

  const folien = gueltig.map((seite, i) => {
    const name = `blatt${i + 1}.${bildEndung(seite.typ)}`;
    // Das Bild wird eingepasst, nicht verzerrt: Seitenverhältnis bleibt.
    const massstab = Math.min(folieBreite / emu(seite.breite, dpi), folieHoehe / emu(seite.hoehe, dpi));
    const breite = Math.round(emu(seite.breite, dpi) * massstab);
    const hoehe = Math.round(emu(seite.hoehe, dpi) * massstab);
    const xml =
      XML_KOPF +
      '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      `<p:pic><p:nvPicPr><p:cNvPr id="${i + 2}" name="${maskiereXml(name)}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>` +
      '<p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
      `<p:spPr><a:xfrm><a:off x="${Math.round((folieBreite - breite) / 2)}" y="${Math.round(
        (folieHoehe - hoehe) / 2
      )}"/><a:ext cx="${breite}" cy="${hoehe}"/></a:xfrm>` +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>' +
      '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
    const bezuege =
      XML_KOPF +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${name}"/>` +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '</Relationships>';
    return { nummer: i + 1, name, daten: seite.daten, xml, bezuege };
  });

  const praesentation =
    XML_KOPF +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' +
    folien.map((f) => `<p:sldId id="${255 + f.nummer}" r:id="rId${f.nummer + 1}"/>`).join('') +
    '</p:sldIdLst>' +
    `<p:sldSz cx="${folieBreite}" cy="${folieHoehe}"/><p:notesSz cx="${folieHoehe}" cy="${folieBreite}"/>` +
    '</p:presentation>';

  const praesentationBezuege =
    XML_KOPF +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    folien
      .map(
        (f) =>
          `<Relationship Id="rId${f.nummer + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${f.nummer}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rIdThema" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>` +
    '</Relationships>';

  const typen =
    XML_KOPF +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Default Extension="jpeg" ContentType="image/jpeg"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    folien
      .map(
        (f) =>
          `<Override PartName="/ppt/slides/slide${f.nummer}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
      )
      .join('') +
    '</Types>';

  const kern =
    XML_KOPF +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${maskiereXml(titel)}</dc:title>` +
    `<dc:creator>${maskiereXml(`Screenarchiv ${anwendung}`.trim())}</dc:creator>` +
    `<cp:lastModifiedBy>${maskiereXml(`Screenarchiv ${anwendung}`.trim())}</cp:lastModifiedBy>` +
    '</cp:coreProperties>';

  return zipSchreiben([
    { name: '[Content_Types].xml', daten: typen },
    {
      name: '_rels/.rels',
      daten:
        XML_KOPF +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '</Relationships>'
    },
    { name: 'docProps/core.xml', daten: kern },
    { name: 'ppt/presentation.xml', daten: praesentation },
    { name: 'ppt/_rels/presentation.xml.rels', daten: praesentationBezuege },
    { name: 'ppt/theme/theme1.xml', daten: PPT_THEMA },
    { name: 'ppt/slideMasters/slideMaster1.xml', daten: PPT_MASTER },
    {
      name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      daten:
        XML_KOPF +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
        '</Relationships>'
    },
    { name: 'ppt/slideLayouts/slideLayout1.xml', daten: PPT_LAYOUT },
    {
      name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      daten:
        XML_KOPF +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
        '</Relationships>'
    },
    ...folien.map((f) => ({ name: `ppt/slides/slide${f.nummer}.xml`, daten: f.xml })),
    ...folien.map((f) => ({ name: `ppt/slides/_rels/slide${f.nummer}.xml.rels`, daten: f.bezuege })),
    ...folien.map((f) => ({ name: `ppt/media/${f.name}`, daten: f.daten }))
  ]);
}

/* =========================================================================
   OCR – den Text aus den Bildern holen.

   Die Seite kann selbst nicht lesen: ein Texterkenner wäre ein fremdes
   Programm, und die Inhaltsrichtlinie des Artifacts lässt keines zu. Lesen
   kann Claude - über die Fähigkeit `sample`, die Bilder mitnimmt. Die Seite
   schickt das Bild, sagt, was zu tun ist, und bewahrt die Antwort auf.

   Zwei Dinge sind dabei zu beachten und stehen darum hier: die Bilder werden
   vor dem Senden auf rund 1,2 Megapixel verkleinert (kleine Schrift leidet),
   und die Antwort ist eine Lesung, keine Messung. Darum liest die Seite
   große Bilder in Kacheln und zeigt jede Antwort in einem Feld, in dem sie
   sich ändern lässt.
   ========================================================================= */

export const OCR_SCHLUESSEL = 'screenarchiv:ocr';
export const OCR_VERSION = 1;

/** Die Marke, bei der ein Bild in Kacheln gelesen wird (Punkte je Bild). */
export const OCR_GRENZE = 1_200_000;

/**
 * In wie viele Kacheln ein Bild zerfällt. Gesendet wird auf 1,2 Megapixel
 * verkleinert; ein Screenshot in 1920 × 1080 liegt knapp darunter, ein
 * 300-dpi-Blatt weit darüber. Die Kacheln überlappen, damit keine Zeile
 * genau auf der Kante stirbt.
 */
export function ocrKacheln(breite = 0, hoehe = 0, grenze = OCR_GRENZE, ueberlappung = 0.04) {
  const b = Math.max(0, Math.round(breite));
  const h = Math.max(0, Math.round(hoehe));
  if (!b || !h) return [];
  const punkte = b * h;
  if (punkte <= grenze) return [{ x: 0, y: 0, breite: b, hoehe: h, nummer: 1, von: 1 }];
  // Geteilt wird in Zeilen, nicht in Spalten: Text läuft waagerecht.
  const zahl = Math.min(6, Math.ceil(punkte / grenze));
  const schritt = h / zahl;
  const rand = Math.round(schritt * ueberlappung);
  const kacheln = [];
  for (let i = 0; i < zahl; i++) {
    const oben = Math.max(0, Math.round(i * schritt) - (i ? rand : 0));
    const unten = Math.min(h, Math.round((i + 1) * schritt) + (i < zahl - 1 ? rand : 0));
    kacheln.push({ x: 0, y: oben, breite: b, hoehe: unten - oben, nummer: i + 1, von: zahl });
  }
  return kacheln;
}

/** Was Claude zu tun hat. Eine Lesung, keine Deutung - das steht da auch. */
export function ocrAufforderung(aufnahme = {}, kachel = { nummer: 1, von: 1 }) {
  const stelle = String(aufnahme.gliederung || '').trim();
  const teil =
    kachel.von > 1
      ? `Das Bild ist Teil ${kachel.nummer} von ${kachel.von} eines größeren Bildschirmfotos (von oben nach unten geschnitten). Lies nur, was in diesem Teil steht.`
      : '';
  return [
    'Du liest den Text aus einem Bildschirmfoto der Anwendung oneSCM (Mercedes-Benz, Servicevertragswesen).',
    teil,
    'Gib den sichtbaren Text wieder, Zeile für Zeile, in der Reihenfolge von oben nach unten und links nach rechts.',
    'Erhalte Überschriften, Beschriftungen von Feldern, Werte, Schaltflächen und Tabellenzeilen.',
    'Trenne Spalten einer Tabellenzeile mit " | ". Beschreibe keine Bilder, deute nichts, ergänze nichts.',
    'Was unleserlich ist, schreibe als […]. Antworte nur mit dem Text, ohne Einleitung und ohne Schlusssatz.',
    aufnahme.titel ? `Titel der Aufnahme: ${aufnahme.titel}` : '',
    stelle ? `Stelle im Handbuch: ${stelle}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

/** Die Lesungen aus dem Speicher; ein unlesbarer Stand gilt als keiner. */
export function leseOcr(text) {
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return {};
  }
  const roh = inhalt && typeof inhalt === 'object' ? inhalt.texte || inhalt : {};
  const sauber = {};
  for (const [kennung, eintrag] of Object.entries(roh || {})) {
    if (!eintrag) continue;
    const gelesen = typeof eintrag === 'string' ? { text: eintrag } : eintrag;
    const inhaltText = String(gelesen.text || '');
    if (!inhaltText.trim()) continue;
    sauber[kennung] = {
      text: inhaltText,
      erkannt_am: String(gelesen.erkannt_am || ''),
      teile: Number(gelesen.teile) || 1,
      quelle: String(gelesen.quelle || 'claude')
    };
  }
  return sauber;
}

export function schreibeOcr(eintraege = {}) {
  return JSON.stringify({ version: OCR_VERSION, stand: new Date().toISOString(), texte: eintraege });
}

/** Die Teile einer Lesung zu einem Text - ohne doppelte Leerzeilen. */
export function ocrZusammenfuegen(teile = []) {
  return teile
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Alle Lesungen als eine Textdatei: je Bild ein Abschnitt mit Kopf. */
export function ocrAlsText(abschnitte = [], { stand = new Date().toISOString(), anwendung = '' } = {}) {
  const zeilen = [`Texte aus Bildern · Screenarchiv${anwendung ? ' ' + anwendung : ''}`, `Stand: ${formatiereZeitpunkt(stand)}`, ''];
  for (const abschnitt of abschnitte) {
    zeilen.push(`## ${abschnitt.titel}`);
    if (abschnitt.kennung || abschnitt.stelle) {
      zeilen.push([abschnitt.stelle, abschnitt.kennung].filter(Boolean).join(' · '));
    }
    zeilen.push('', String(abschnitt.text || '').trim() || '(kein Text erkannt)', '');
  }
  return zeilen.join('\n');
}

/* --------------------------------- Das Handbuch als Word-Datei (1.43.0) */

/* Überschriften, damit Word eine Gliederung hat: ohne eigene Formatvorlagen
   bleibt die Navigation leer und ein Inhaltsverzeichnis lässt sich nicht
   erzeugen. Drei Ebenen genügen - tiefer geht die Gliederung des Handbuchs
   in der Darstellung nicht. */
const DOCX_VORLAGEN =
  XML_KOPF +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>' +
  '<w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
  [1, 2, 3]
    .map(
      (ebene) =>
        `<w:style w:type="paragraph" w:styleId="Heading${ebene}"><w:name w:val="heading ${ebene}"/>` +
        '<w:basedOn w:val="Normal"/><w:qFormat/>' +
        `<w:pPr><w:keepNext/><w:outlineLvl w:val="${ebene - 1}"/><w:spacing w:before="${
          [360, 280, 220][ebene - 1]
        }" w:after="120"/></w:pPr>` +
        `<w:rPr><w:b/><w:sz w:val="${[34, 28, 24][ebene - 1]}"/><w:color w:val="1F2933"/></w:rPr></w:style>`
    )
    .join('') +
  '<w:style w:type="paragraph" w:styleId="Bildunterschrift"><w:name w:val="caption"/><w:basedOn w:val="Normal"/>' +
  '<w:pPr><w:spacing w:before="40" w:after="200"/></w:pPr><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="6B7280"/></w:rPr></w:style>' +
  // Der Quellhinweis trägt seit 1.66.0 eine eigene Vorlage. Nicht wegen des
  // Aussehens - er sah schon vorher so aus -, sondern damit der Rückweg
  // (F-65) ihn wiedererkennt und nicht für geschriebenen Text hält.
  '<w:style w:type="paragraph" w:styleId="Quellhinweis"><w:name w:val="Quellhinweis"/><w:basedOn w:val="Normal"/>' +
  '<w:pPr><w:spacing w:before="40" w:after="160"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="6B7280"/></w:rPr></w:style>' +
  '</w:styles>';

/**
 * Das ganze Handbuch als Word-Datei: Überschriften je Stelle, die Texte der
 * Gliederung, die Anweisungen der Strecke und die Bilder dazwischen. Anders
 * als bei den Blättern (F-55) ist hier **Text wirklich Text** - er lässt
 * sich suchen, kopieren und weiterschreiben.
 *
 * `bilder`: Map oder Objekt Kennung -> { daten, breite, hoehe, typ }.
 */
export function docxAusHandbuch(
  teile = [],
  { titel = '', untertitel = '', hinweis = '', anwendung = '', bilder = new Map(), mitTexten = true, sprache = 'de' } = {}
) {
  const w = (schluessel) => sagen(schluessel, sprache);
  const hole = (kennung) => (bilder instanceof Map ? bilder.get(kennung) : bilder[kennung]);
  const gueltig = teile.filter((t) => t && t.nummer);
  if (!gueltig.length) return null;

  // A4 hoch, 2 cm Rand: die nutzbare Breite in EMU, auf die ein Bild passt.
  const randTwips = 1134;
  const nutzbar = Math.round(((11906 - 2 * randTwips) / 20) * 12700);

  const medien = [];
  const absatz = (text, { vorlage = '', fett = false, groesse = 0, kursiv = false } = {}) =>
    '<w:p>' +
    (vorlage ? `<w:pPr><w:pStyle w:val="${vorlage}"/></w:pPr>` : '') +
    `<w:r><w:rPr>${fett ? '<w:b/>' : ''}${kursiv ? '<w:i/>' : ''}${groesse ? `<w:sz w:val="${groesse}"/>` : ''}</w:rPr>` +
    `<w:t xml:space="preserve">${maskiereXml(text)}</w:t></w:r></w:p>`;

  const bildAbsatz = (aufnahme) => {
    const bild = hole(aufnahme.id);
    if (!bild || !bild.daten || !bild.breite) return '';
    const nummer = medien.length + 1;
    const name = `bild${nummer}.${bildEndung(bild.typ)}`;
    medien.push({ name, daten: bild.daten, bezug: `rIdBild${nummer}` });
    // Gerechnet wird mit 96 dpi: ein Bildschirmfoto soll im Dokument so
    // breit sein, wie es am Bildschirm war - höchstens aber seitenbreit.
    const breite = Math.min(nutzbar, emu(bild.breite, 96));
    const hoehe = Math.round(breite * (bild.hoehe / bild.breite));
    return (
      '<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      `<wp:extent cx="${breite}" cy="${hoehe}"/><wp:docPr id="${nummer}" name="${maskiereXml(name)}"/>` +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      `<pic:nvPicPr><pic:cNvPr id="${nummer}" name="${maskiereXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="rIdBild${nummer}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${breite}" cy="${hoehe}"/></a:xfrm>` +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>' +
      '</wp:inline></w:drawing></w:r></w:p>'
    );
  };

  const koerper = [
    absatz(titel || w('handbuch'), { vorlage: 'Heading1' }),
    untertitel ? absatz(untertitel, { kursiv: true }) : '',
    hinweis ? absatz(hinweis, { groesse: 18 }) : '',
    ...gueltig.flatMap((teil) => {
      const ebene = Math.min(3, Math.max(1, teil.ebene || 1));
      const schrittZu = new Map((teil.schritte || []).map((s) => [s.aufnahme, s]));
      return [
        absatz(`${teil.nummer} ${teil.thema || ''}`.trim(), { vorlage: `Heading${ebene}` }),
        mitTexten && teil.text ? absatz(teil.text) : '',
        mitTexten && teil.kriterium ? absatz(`${w('fertigWenn')} ${teil.kriterium}`, { kursiv: true }) : '',
        ...(teil.bilder || []).flatMap((aufnahme) => {
          const schritt = schrittZu.get(aufnahme.id);
          const unterschrift = [
            schritt ? `${w('schritt')} ${schritt.nummer}` : '',
            schritt && schritt.text ? schritt.text : aufnahme.titel,
            labelKette(aufnahme)
          ]
            .filter(Boolean)
            .join(' · ');
          return [bildAbsatz(aufnahme), absatz(unterschrift, { vorlage: 'Bildunterschrift' })];
        }),
        mitTexten && teil.notiz ? absatz(teil.notiz, { vorlage: 'Quellhinweis' }) : ''
      ].filter(Boolean);
    })
  ]
    .filter(Boolean)
    .join('');

  const dokument =
    XML_KOPF +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>' +
    koerper +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${randTwips}" w:right="${randTwips}" ` +
    `w:bottom="${randTwips}" w:left="${randTwips}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>` +
    '</w:body></w:document>';

  const bezuege =
    XML_KOPF +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rIdVorlagen" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    medien
      .map(
        (m) =>
          `<Relationship Id="${m.bezug}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`
      )
      .join('') +
    '</Relationships>';

  const typen =
    XML_KOPF +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Default Extension="jpeg" ContentType="image/jpeg"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';

  return zipSchreiben([
    { name: '[Content_Types].xml', daten: typen },
    {
      name: '_rels/.rels',
      daten:
        XML_KOPF +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdDok" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rIdKern" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '</Relationships>'
    },
    {
      name: 'docProps/core.xml',
      daten:
        XML_KOPF +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${maskiereXml(titel || w('handbuch'))}</dc:title>` +
        `<dc:creator>${maskiereXml(`Screenarchiv ${anwendung}`.trim())}</dc:creator>` +
        '</cp:coreProperties>'
    },
    { name: 'word/document.xml', daten: dokument },
    { name: 'word/styles.xml', daten: DOCX_VORLAGEN },
    { name: 'word/_rels/document.xml.rels', daten: bezuege },
    ...medien.map((m) => ({ name: `word/media/${m.name}`, daten: m.daten }))
  ]);
}

/**
 * Dieselben Abschnitte als Word-Datei - diesmal mit Text statt Bildern.
 * Überschrift fett und größer, der Text in Absätzen; eine Datei, die sich
 * weiterschreiben lässt.
 */
export function docxAusText(abschnitte = [], { titel = '', anwendung = '' } = {}) {
  const gueltig = abschnitte.filter((a) => a && (a.titel || a.text));
  if (!gueltig.length) return null;

  const absatz = (text, { fett = false, groesse = 22, nach = 120 } = {}) =>
    `<w:p><w:pPr><w:spacing w:after="${nach}"/></w:pPr><w:r><w:rPr>${fett ? '<w:b/>' : ''}` +
    `<w:sz w:val="${groesse}"/></w:rPr><w:t xml:space="preserve">${maskiereXml(text)}</w:t></w:r></w:p>`;

  const koerper = [
    titel ? absatz(titel, { fett: true, groesse: 32, nach: 240 }) : '',
    ...gueltig.flatMap((a) => [
      absatz(a.titel || '', { fett: true, groesse: 26, nach: 60 }),
      a.stelle || a.kennung
        ? absatz([a.stelle, a.kennung].filter(Boolean).join(' · '), { groesse: 18, nach: 120 })
        : '',
      ...String(a.text || '')
        .split(/\n/)
        .map((zeile) => absatz(zeile, { nach: zeile.trim() ? 40 : 120 }))
    ])
  ]
    .filter(Boolean)
    .join('');

  const dokument =
    XML_KOPF +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    koerper +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>';

  const kern =
    XML_KOPF +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${maskiereXml(titel || 'Texte aus Bildern')}</dc:title>` +
    `<dc:creator>${maskiereXml(`Screenarchiv ${anwendung}`.trim())}</dc:creator>` +
    '</cp:coreProperties>';

  return zipSchreiben([
    {
      name: '[Content_Types].xml',
      daten:
        XML_KOPF +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '</Types>'
    },
    {
      name: '_rels/.rels',
      daten:
        XML_KOPF +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdDok" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rIdKern" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '</Relationships>'
    },
    { name: 'docProps/core.xml', daten: kern },
    { name: 'word/document.xml', daten: dokument }
  ]);
}

/* =========================================================================
   Bildvergleich – was sich zwischen zwei Fassungen geändert hat.

   Der Projektvergleich (F-54) sagt, welche *Stelle* neu ist. Die Frage
   davor bleibt offen: hat sich die Maske selbst geändert? Hier wird sie
   beantwortet - nicht geraten. Verglichen werden die Bildpunkte zweier
   Aufnahmen in einem Raster: je Kachel der Anteil der Punkte, die sich
   deutlich unterscheiden; benachbarte veränderte Kacheln werden zu Bereichen
   zusammengefasst, damit nicht 384 Kästchen, sondern drei Stellen dastehen.

   Was dieser Vergleich nicht kann: er sieht Pixel, nicht Bedeutung. Ein
   verschobener Block ist für ihn eine große Änderung, eine geänderte Zahl
   eine kleine. Darum nennt er Anteile und Bereiche - und urteilt nicht
   darüber, ob die Änderung wichtig ist.
   ========================================================================= */

export const VERGLEICH_RASTER = { spalten: 24, zeilen: 16 };

/** Ab wann zwei Bildpunkte als verschieden gelten (Summe über R, G, B). */
export const VERGLEICH_SCHWELLE = 36;

/**
 * Zwei Bilder Punkt für Punkt. `a` und `b` sind `{ daten, breite, hoehe }`
 * mit vier Werten je Punkt (RGBA), wie sie eine Leinwand liefert.
 */
export function bildUnterschied(a = {}, b = {}, optionen = {}) {
  const {
    spalten = VERGLEICH_RASTER.spalten,
    zeilen = VERGLEICH_RASTER.zeilen,
    schwelle = VERGLEICH_SCHWELLE,
    kachelAnteil = 0.015
  } = optionen;
  const breite = Math.round(a.breite || 0);
  const hoehe = Math.round(a.hoehe || 0);
  if (!breite || !hoehe) return { ok: false, grund: 'Das Bild hat keine Maße.' };
  if (Math.round(b.breite || 0) !== breite || Math.round(b.hoehe || 0) !== hoehe) {
    return { ok: false, grund: 'Die beiden Bilder haben verschiedene Maße.' };
  }
  if (!a.daten || !b.daten || a.daten.length < breite * hoehe * 4 || b.daten.length < breite * hoehe * 4) {
    return { ok: false, grund: 'Die Bildpunkte fehlen.' };
  }

  const zaehler = new Int32Array(spalten * zeilen);
  const punkteJeKachel = new Int32Array(spalten * zeilen);
  let verschieden = 0;
  for (let y = 0; y < hoehe; y++) {
    const zeile = Math.min(zeilen - 1, Math.floor((y / hoehe) * zeilen));
    for (let x = 0; x < breite; x++) {
      const spalte = Math.min(spalten - 1, Math.floor((x / breite) * spalten));
      const kachel = zeile * spalten + spalte;
      punkteJeKachel[kachel] += 1;
      const i = (y * breite + x) * 4;
      const abstand =
        Math.abs(a.daten[i] - b.daten[i]) +
        Math.abs(a.daten[i + 1] - b.daten[i + 1]) +
        Math.abs(a.daten[i + 2] - b.daten[i + 2]);
      if (abstand >= schwelle) {
        zaehler[kachel] += 1;
        verschieden += 1;
      }
    }
  }

  const kachelBreite = breite / spalten;
  const kachelHoehe = hoehe / zeilen;
  const veraendert = new Uint8Array(spalten * zeilen);
  const kacheln = [];
  for (let zeile = 0; zeile < zeilen; zeile++) {
    for (let spalte = 0; spalte < spalten; spalte++) {
      const i = zeile * spalten + spalte;
      const anteil = punkteJeKachel[i] ? zaehler[i] / punkteJeKachel[i] : 0;
      if (anteil < kachelAnteil) continue;
      veraendert[i] = 1;
      kacheln.push({
        spalte,
        zeile,
        x: Math.round(spalte * kachelBreite),
        y: Math.round(zeile * kachelHoehe),
        breite: Math.round(kachelBreite),
        hoehe: Math.round(kachelHoehe),
        anteil
      });
    }
  }

  const anteil = verschieden / (breite * hoehe);
  return {
    ok: true,
    breite,
    hoehe,
    anteil,
    punkte: verschieden,
    kacheln,
    bereiche: fasseBereiche(veraendert, spalten, zeilen, kachelBreite, kachelHoehe),
    urteil: anteil < 0.002 ? 'gleich' : anteil < 0.08 ? 'kleine Änderungen' : 'deutlich verändert'
  };
}

/** Benachbarte veränderte Kacheln zu Rechtecken - vier Nachbarn, keine Ecken. */
function fasseBereiche(veraendert, spalten, zeilen, kachelBreite, kachelHoehe) {
  const gesehen = new Uint8Array(veraendert.length);
  const bereiche = [];
  for (let start = 0; start < veraendert.length; start++) {
    if (!veraendert[start] || gesehen[start]) continue;
    const stapel = [start];
    gesehen[start] = 1;
    let minS = spalten;
    let maxS = -1;
    let minZ = zeilen;
    let maxZ = -1;
    let zahl = 0;
    while (stapel.length) {
      const i = stapel.pop();
      const spalte = i % spalten;
      const zeile = Math.floor(i / spalten);
      zahl += 1;
      minS = Math.min(minS, spalte);
      maxS = Math.max(maxS, spalte);
      minZ = Math.min(minZ, zeile);
      maxZ = Math.max(maxZ, zeile);
      const nachbarn = [
        spalte > 0 ? i - 1 : -1,
        spalte < spalten - 1 ? i + 1 : -1,
        zeile > 0 ? i - spalten : -1,
        zeile < zeilen - 1 ? i + spalten : -1
      ];
      for (const n of nachbarn) {
        if (n >= 0 && veraendert[n] && !gesehen[n]) {
          gesehen[n] = 1;
          stapel.push(n);
        }
      }
    }
    bereiche.push({
      x: Math.round(minS * kachelBreite),
      y: Math.round(minZ * kachelHoehe),
      breite: Math.round((maxS - minS + 1) * kachelBreite),
      hoehe: Math.round((maxZ - minZ + 1) * kachelHoehe),
      kacheln: zahl
    });
  }
  // Der größte Bereich zuerst: er ist der, über den zu reden ist.
  return bereiche.sort((x, y) => y.kacheln - x.kacheln);
}

/** Das Ergebnis in einem Satz. */
export function unterschiedText(ergebnis = {}) {
  if (!ergebnis.ok) return ergebnis.grund || 'Der Vergleich ist nicht zustande gekommen.';
  if (!ergebnis.bereiche.length) return 'Kein Unterschied gefunden – die beiden Bilder sind gleich.';
  const anteil = (ergebnis.anteil * 100).toFixed(1).replace('.', ',');
  return `${anteil} % der Fläche verändert · ${ergebnis.bereiche.length} ${
    ergebnis.bereiche.length === 1 ? 'Bereich' : 'Bereiche'
  } · ${ergebnis.urteil}`;
}

/**
 * Die Paare, die sich vergleichen lassen: je Stelle das erste Bild aus der
 * einen und aus der anderen Arbeitsmenge. Mehr als eines je Stelle wird
 * genannt, nicht stillschweigend übergangen.
 */
export function vergleichsPaare(aufnahmen = [], wahlA = '', wahlB = '', gliederung = []) {
  const a = projektFilter(aufnahmen, wahlA);
  const b = projektFilter(aufnahmen, wahlB);
  const stelleVon = (bild) => String(bild.gliederung || '').trim();
  const stellen = [...new Set(a.map(stelleVon).filter(Boolean))].filter((nummer) =>
    b.some((bild) => stelleVon(bild) === nummer)
  );
  return stellen.sort(vergleicheKapitel).map((nummer) => {
    const eintrag = gliederung.find((e) => e.nummer === nummer) || null;
    const inA = a.filter((bild) => stelleVon(bild) === nummer);
    const inB = b.filter((bild) => stelleVon(bild) === nummer);
    return {
      nummer,
      thema: eintrag ? eintrag.thema : '',
      vorher: inA[0],
      nachher: inB[0],
      weitereA: inA.length - 1,
      weitereB: inB.length - 1
    };
  });
}

/* =========================================================================
   Der Rückweg aus Word – geänderte Texte zurück in die Gliederung.

   Das Handbuch geht als Word-Datei ins Haus (F-61). Dort wird daran
   geschrieben: ein Satz genauer, ein Kriterium klarer, eine Notiz dazu.
   Bisher endete der Weg dort - die Gliederung der Seite kannte diese
   Änderungen nicht.

   Jetzt liest die Seite eine Word-Datei zurück: die Überschriften nennen
   die Stelle, die Absätze darunter sind ihr Text. Die Gliederung selbst
   liegt im Projekt und wird nicht angerührt; die Änderungen liegen als
   **Überschreibungen** daneben, im Browser, und lassen sich einzeln
   zurücknehmen.
   ========================================================================= */

export const TEXTE_SCHLUESSEL = 'screenarchiv:texte';
export const TEXTE_VERSION = 1;

/** Die eigenen Texte je Stelle; was leer ist, gilt nicht als Änderung. */
export function leseStellentexte(text) {
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return {};
  }
  const roh = inhalt && typeof inhalt === 'object' ? inhalt.texte || inhalt : {};
  const sauber = {};
  for (const [nummer, eintrag] of Object.entries(roh || {})) {
    if (!eintrag || typeof eintrag !== 'object') continue;
    const satz = {};
    for (const feld of ['text', 'kriterium', 'notiz']) {
      const wert = String(eintrag[feld] || '').trim();
      if (wert) satz[feld] = wert;
    }
    if (Object.keys(satz).length) sauber[String(nummer)] = { ...satz, geaendert_am: String(eintrag.geaendert_am || '') };
  }
  return sauber;
}

export function schreibeStellentexte(texte = {}) {
  return JSON.stringify({ version: TEXTE_VERSION, stand: new Date().toISOString(), texte });
}

/** Die Gliederung mit den eigenen Texten darüber. */
export function gliederungMitTexten(gliederung = [], texte = {}) {
  if (!texte || !Object.keys(texte).length) return gliederung;
  return gliederung.map((eintrag) => {
    const eigen = texte[eintrag.nummer];
    return eigen ? { ...eintrag, ...eigen, eigenerText: true } : eintrag;
  });
}

/**
 * Die Absätze einer Word-Datei: Text und, wo eine Überschrift steht, ihre
 * Ebene. Gelesen wird `word/document.xml` - mehr braucht es nicht, und
 * mehr soll es auch nicht sein: die Seite ist kein Textprogramm.
 */
export function docxAbsaetze(xml = '') {
  const absaetze = [];
  for (const treffer of String(xml).matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const stueck = treffer[0];
    const text = [...stueck.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1])
      .join('')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
    if (!text) continue;
    const vorlage = (stueck.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
    const ebene = /^Heading(\d)$/.test(vorlage) ? Number(vorlage.slice(7)) : 0;
    absaetze.push({ text, ebene, vorlage });
  }
  return absaetze;
}

/**
 * Aus den Absätzen die Stellen: eine Überschrift, die mit einer Nummer
 * beginnt, eröffnet eine Stelle; was bis zur nächsten Überschrift folgt,
 * ist ihr Text. „Fertig, wenn: …" wird als Kriterium erkannt - so hat die
 * Seite es geschrieben.
 */
export function stellenAusDocx(absaetze = []) {
  const stellen = [];
  let aktuell = null;
  for (const absatz of absaetze) {
    if (absatz.ebene) {
      // Eine Überschrift mit Nummer eröffnet eine Stelle; eine ohne beendet
      // die laufende - Überschriften sind nie der Text einer anderen Stelle.
      const kopf = absatz.text.match(/^([0-9]+(?:\.[0-9]+)*)\s+(.*)$/);
      aktuell = kopf ? { nummer: kopf[1], thema: kopf[2].trim(), absaetze: [], kriterium: '', notiz: '' } : null;
      if (aktuell) stellen.push(aktuell);
      continue;
    }
    if (!aktuell) continue;
    // Bildunterschriften gehören zum Bild, der Quellhinweis zur Herkunft
    // der Gliederung - beides ist nicht der Text der Stelle. Bis 1.65.0
    // fehlte der Quellhinweis hier: der unveränderte Umlauf bot darum
    // **jede** Stelle als geändert an.
    if (absatz.vorlage === 'Bildunterschrift' || absatz.vorlage === 'Quellhinweis') continue;
    const kriterium = absatz.text.match(/^Fertig,\s*wenn:\s*(.+)$/i);
    if (kriterium) {
      aktuell.kriterium = kriterium[1].trim();
      continue;
    }
    aktuell.absaetze.push(absatz.text);
  }
  return stellen.map((s) => ({
    nummer: s.nummer,
    thema: s.thema,
    text: s.absaetze.join('\n\n').trim(),
    kriterium: s.kriterium
  }));
}

/**
 * Was die gelesene Datei gegenüber der Gliederung ändern würde. Nichts wird
 * dabei angefasst - erst die Liste, dann die Entscheidung.
 */
export function vergleicheStellentexte(gliederung = [], gelesen = [], eigene = {}) {
  const nachNummer = new Map(gliederung.map((e) => [e.nummer, e]));
  const jetzt = gliederungMitTexten(gliederung, eigene);
  const jetztNach = new Map(jetzt.map((e) => [e.nummer, e]));
  return gelesen.map((stelle) => {
    const eintrag = jetztNach.get(stelle.nummer);
    if (!eintrag) return { ...stelle, art: 'unbekannt', alt: {} };
    const alt = { text: eintrag.text || '', kriterium: eintrag.kriterium || '' };
    const felder = [];
    // Eine Datei aus einer Fassung vor 1.66.0 trägt den Quellhinweis ohne
    // eigene Vorlage; der Leser hält ihn dann für Text. Steht als „neuer
    // Text" genau der Hinweis, den die Stelle ohnehin führt, ist das keine
    // Änderung - sonst bietet ein Umlauf ohne eine einzige Änderung im
    // Haus die ganze Gliederung zum Übernehmen an.
    const altlast = Boolean(eintrag.notiz) && stelle.text.trim() === String(eintrag.notiz).trim();
    if (stelle.text && !altlast && stelle.text !== alt.text) felder.push('text');
    if (stelle.kriterium && stelle.kriterium !== alt.kriterium) felder.push('kriterium');
    return {
      ...stelle,
      alt,
      // „ursprung" sagt, was in der Projektdatei steht - damit sichtbar
      // bleibt, ob man gegen die Vorlage oder gegen eine eigene Änderung
      // vergleicht.
      ursprung: nachNummer.get(stelle.nummer) || null,
      felder,
      art: felder.length ? 'geaendert' : 'gleich'
    };
  });
}

/** Die Änderungen übernehmen - nur die genannten Stellen, nur gefüllte Felder. */
export function uebernimmStellentexte(eigene = {}, vergleich = [], nummern = null, stand = new Date().toISOString()) {
  const neu = { ...eigene };
  for (const stelle of vergleich) {
    if (stelle.art !== 'geaendert') continue;
    if (nummern && !nummern.includes(stelle.nummer)) continue;
    const satz = { ...(neu[stelle.nummer] || {}) };
    for (const feld of stelle.felder) satz[feld] = stelle[feld];
    satz.geaendert_am = stand;
    neu[stelle.nummer] = satz;
  }
  return neu;
}

/* =========================================================================
   Das Fortschrittsblatt – wie weit ist das Handbuch?

   Die Gliederung hat 1153 Stellen. „Wie weit sind wir?" lässt sich daran
   nicht ablesen, und eine Zahl allein („312 Bilder") sagt nichts darüber,
   ob das viel ist. Hier wird je Kapitel gezählt: wie viele seiner Stellen
   belegt sind, wie viele Bilder daran hängen und wie es um die gewählte
   Achse steht (etwa: in wie vielen Sprachen).

   Gezählt werden **Stellen**, nicht Bilder: zehn Bilder an einer Stelle
   machen ein Kapitel nicht fertiger als eines.
   ========================================================================= */

export function fortschrittDaten(gliederung = [], eingang = [], { achse = '', stelle = '' } = {}) {
  const gefiltert = stelle ? gliederung.filter((e) => gehoertZu(e.nummer, stelle)) : gliederung;
  const stellen = gefiltert.filter((e) => e.art !== 'uebergang');
  const { zahlen, ohneStelle } = zaehleBilder(stellen, eingang);
  const belegteStelle = (nummer) => (zahlen.get(nummer) || { eigene: 0 }).eigene > 0;

  // Die Werte der Achse, die im Bestand überhaupt vorkommen.
  const werte = achse
    ? [...new Set(eingang.map((a) => String(a[achse] || '')).filter(Boolean))].sort((a, b) =>
        labelWert(achse, a).localeCompare(labelWert(achse, b))
      )
    : [];

  const kapitel = stellen
    .filter((e) => e.ebene === 1 || (stelle && e.nummer === stelle))
    .map((kopf) => {
      const darunter = stellen.filter((e) => gehoertZu(e.nummer, kopf.nummer) && e.nummer !== kopf.nummer);
      const eigene = darunter.length ? darunter : [kopf];
      const belegt = eigene.filter((e) => belegteStelle(e.nummer)).length;
      const bilder = (zahlen.get(kopf.nummer) || { gesamt: 0 }).gesamt;
      const jeWert = werte.map((wert) => {
        const passende = eingang.filter((a) => String(a[achse] || '') === wert);
        const belegteHier = new Set(
          passende.map((a) => String(a.gliederung || '').trim()).filter((n) => n && gehoertZu(n, kopf.nummer))
        );
        return { wert, label: labelWert(achse, wert), stellen: belegteHier.size };
      });
      return {
        nummer: kopf.nummer,
        thema: kopf.thema,
        stellen: eigene.length,
        belegt,
        anteil: eigene.length ? belegt / eigene.length : 0,
        bilder,
        jeWert
      };
    });

  const alleStellen = stellen.filter((e) => e.ebene > 1 || !stellen.some((x) => x.ebene > 1 && gehoertZu(x.nummer, e.nummer)));
  const belegtGesamt = alleStellen.filter((e) => belegteStelle(e.nummer)).length;
  return {
    achse,
    werte: werte.map((wert) => ({ wert, label: labelWert(achse, wert) })),
    kapitel,
    gesamt: {
      kapitel: kapitel.length,
      stellen: alleStellen.length,
      belegt: belegtGesamt,
      anteil: alleStellen.length ? belegtGesamt / alleStellen.length : 0,
      bilder: eingang.length,
      ohneStelle
    }
  };
}

/** Der Fortschritt in einem Satz - für Kopfzeile, Bericht und Meldung. */
export function fortschrittText(daten = {}, sprache = 'de') {
  const g = daten.gesamt || { belegt: 0, stellen: 0, bilder: 0, ohneStelle: 0 };
  const anteil = Math.round((g.anteil || 0) * 100);
  if (sprache === 'en') {
    return (
      `${g.belegt} of ${g.stellen} sections covered (${anteil} %) · ${g.bilder} images` +
      (g.ohneStelle ? ` · ${g.ohneStelle} without a section` : '')
    );
  }
  return (
    `${g.belegt} von ${g.stellen} Stellen belegt (${anteil} %) · ${g.bilder} Bilder` +
    (g.ohneStelle ? ` · ${g.ohneStelle} ohne Stelle` : '')
  );
}

/* =========================================================================
   Die Projektdatei – den ganzen Bestand weitergeben.

   Der Eingang liegt im Browser eines Menschen. Zwischen zwei Menschen gab
   es bisher keinen Weg: „Als JSON sichern" nimmt die Metadaten mit, nicht
   die Bilder; der Ordner liegt auf einer Platte. Eine Projektdatei ist ein
   ZIP mit allem darin - Metadaten, Strecken, Projekte, Einstellungen,
   Wortliste, Lesungen und die Bilder in voller Auflösung.

   Gelesen wird nachsichtig: eine Datei aus einer älteren Fassung soll
   ankommen, auch wenn sie weniger enthält. Was fehlt, fehlt - was
   unverständlich ist, wird genannt.
   ========================================================================= */

export const PAKET_VERSION = 1;
export const PAKET_NAME = 'screenarchiv.json';

/** Die Angaben eines Pakets, ohne die Bilder - die liegen als Dateien daneben. */
export function paketAngaben({
  eingang = [],
  strecken = [],
  projekte = [],
  design = null,
  ocr = {},
  wortliste = [],
  vorgehen = null,
  stand = new Date().toISOString(),
  anwendung = ''
} = {}) {
  return {
    paket: PAKET_VERSION,
    erzeugt_von: `Screenarchiv ${anwendung}`.trim(),
    erzeugt_am: stand,
    anzahl: eingang.length,
    // Die Vorschauen bleiben draußen: sie entstehen beim Einlesen neu aus
    // dem vollen Bild und wären sonst der größte Teil der Datei.
    aufnahmen: eingang.map(({ bild, ...rest }) => rest),
    strecken,
    projekte,
    design,
    ocr,
    wortliste,
    // Das Vorgehen des Registers Video ist eine Arbeitsweise wie die
    // Wortliste - wer den Bestand bekommt, soll auch so weiterarbeiten
    // koennen, wie er entstanden ist.
    vorgehen
  };
}

/** Der Dateiname eines Bildes im Paket - die Kennung trägt ihn. */
export function paketBildname(kennung, fassung = 0, typ = 'jpeg') {
  const endung = typ === 'png' ? 'png' : 'jpeg';
  return `bilder/${bereinigeDateiname(kennung) || 'bild'}${fassung ? `--f${fassung}` : ''}.${endung}`;
}

/** Aus einem Bildnamen zurück auf Kennung und Fassung. */
export function paketBildschluessel(name = '') {
  const treffer = String(name).match(/^bilder\/(.+?)(?:--f(\d+))?\.(?:jpeg|jpg|png)$/i);
  if (!treffer) return null;
  const kennung = treffer[1].toUpperCase();
  return { kennung, fassung: Number(treffer[2]) || 0, schluessel: treffer[2] ? `${kennung}:${treffer[2]}` : kennung };
}

/**
 * Liest die Angaben eines Pakets. Nachsichtig: was fehlt, wird leer; was
 * nicht lesbar ist, führt zu einer Meldung statt zu einem Absturz.
 */
export function lesePaketAngaben(text) {
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return { ok: false, grund: 'Die Datei enthält keine lesbaren Angaben.' };
  }
  if (!inhalt || typeof inhalt !== 'object' || !Array.isArray(inhalt.aufnahmen)) {
    return { ok: false, grund: 'Das ist keine Projektdatei des Screenarchivs.' };
  }
  const version = Number(inhalt.paket) || 0;
  return {
    ok: true,
    version,
    kuenftig: version > PAKET_VERSION,
    erzeugt_von: String(inhalt.erzeugt_von || ''),
    erzeugt_am: String(inhalt.erzeugt_am || ''),
    aufnahmen: leseEingang(JSON.stringify({ version: EINGANG_VERSION, aufnahmen: inhalt.aufnahmen })),
    strecken: leseStrecken(JSON.stringify({ version: STRECKEN_VERSION, strecken: inhalt.strecken || [] })),
    projekte: leseProjekte(JSON.stringify({ version: PROJEKTE_VERSION, projekte: inhalt.projekte || [] })),
    design: inhalt.design ? leseDesignEinstellungen(JSON.stringify(inhalt.design)) : null,
    ocr: leseOcr(JSON.stringify({ texte: inhalt.ocr || {} })),
    wortliste: Array.isArray(inhalt.wortliste) ? leseWortliste(JSON.stringify({ regeln: inhalt.wortliste })) : [],
    vorgehen: inhalt.vorgehen ? leseVorgehen(JSON.stringify(inhalt.vorgehen)) : null
  };
}

/**
 * Zwei Bestände zusammenführen. `art` entscheidet:
 * - `ergaenzen`: was es schon gibt, bleibt; Neues kommt dazu. Eine Kennung,
 *   die doppelt vorkommt, bekommt eine neue - sonst verlöre einer der
 *   beiden sein Bild.
 * - `ersetzen`: der eigene Bestand weicht dem fremden.
 */
export function fuehrePaketZusammen(eigene = [], fremde = [], art = 'ergaenzen', heute = '') {
  if (art === 'ersetzen') {
    return { eingang: fremde, umbenannt: new Map(), neu: fremde.length, ersetzt: eigene.length };
  }
  const vergeben = new Set(eigene.map((a) => a.id));
  const umbenannt = new Map();
  const dazu = [];
  // Eine neue Kennung weicht nicht nur dem eigenen Bestand aus, sondern auch
  // den übrigen Aufnahmen des Pakets - sonst schöbe sich die Umbenennung
  // durch die ganze Liste.
  const belegt = () => [...eigene, ...dazu, ...fremde.filter((f) => !umbenannt.has(f.id))];
  for (const fremd of fremde) {
    let kennung = fremd.id;
    if (vergeben.has(kennung)) {
      kennung = naechsteAufnahmeKennung(belegt(), heute || fremd.datum || new Date().toISOString().slice(0, 10));
      umbenannt.set(fremd.id, kennung);
    }
    vergeben.add(kennung);
    dazu.push({ ...fremd, id: kennung });
  }
  return { eingang: [...dazu, ...eigene], umbenannt, neu: dazu.length, ersetzt: 0 };
}

/** Die Strecken des Pakets, auf die neuen Kennungen umgeschrieben. */
export function streckenMitNeuenKennungen(strecken = [], umbenannt = new Map()) {
  if (!umbenannt.size) return strecken;
  return strecken.map((strecke) => ({
    ...strecke,
    schritte: (strecke.schritte || []).map((schritt) => ({
      ...schritt,
      aufnahmen: (schritt.aufnahmen || []).map((k) => umbenannt.get(k) || k)
    }))
  }));
}

/** Was eine Projektdatei enthält, in einem Satz. */
export function paketBericht(gelesen = {}, bilder = 0) {
  if (!gelesen.ok) return gelesen.grund || 'Die Datei ließ sich nicht lesen.';
  const teile = [
    `${gelesen.aufnahmen.length} Aufnahme(n)`,
    `${bilder} Bild(er)`,
    gelesen.strecken.length ? `${gelesen.strecken.length} Strecke(n)` : '',
    gelesen.projekte.length ? `${gelesen.projekte.length} Projekt(e)` : '',
    Object.keys(gelesen.ocr || {}).length ? `${Object.keys(gelesen.ocr).length} Lesung(en)` : '',
    gelesen.wortliste.length ? `${gelesen.wortliste.length} Wortregel(n)` : '',
    gelesen.vorgehen ? 'Vorgehen für das Register Video' : '',
    gelesen.design ? 'Einstellungen des Studios' : ''
  ].filter(Boolean);
  const woher = gelesen.erzeugt_von ? ` · aus ${gelesen.erzeugt_von}` : '';
  const kuenftig = gelesen.kuenftig ? ' · aus einer neueren Fassung, Unbekanntes bleibt liegen' : '';
  return teile.join(' · ') + woher + kuenftig;
}

/* =========================================================================
   Die Lupe – ein Bild groß, mit allem, was dazugehört.

   Im Großformat ist die Frage nicht mehr „welches Bild ist das", sondern
   „stimmt es noch". Dafür braucht es neben dem Bild: den Text, das Rezept
   (woher es kommt und wie es entstanden ist), die Labels und die Stelle im
   Handbuch samt ihrem Weg von oben.
   ========================================================================= */

/** Der Weg einer Stelle von oben: 6 Market Settings › 6.2 Vorlagen. */
export function kapitelPfad(gliederung = [], nummer = '') {
  const stelle = String(nummer || '').trim();
  if (!stelle) return [];
  const teile = stelle.split('.');
  const pfad = [];
  for (let i = 1; i <= teile.length; i++) {
    const bis = teile.slice(0, i).join('.');
    const eintrag = gliederung.find((e) => e.nummer === bis);
    if (eintrag) pfad.push(`${eintrag.nummer} ${eintrag.thema}`);
    else if (i === teile.length) pfad.push(bis);
  }
  return pfad;
}

/**
 * Das Rezept eines Bildes: woher es kommt, was daran gemacht wurde und in
 * welchem Schritt welcher Strecke es steht. Keine Erfindung - alles steht
 * am Bild oder in den Strecken.
 */
export const QUELLEN_NAMEN = {
  bildschirm: 'Bildschirm',
  datei: 'Datei',
  beispiel: 'Beispiel',
  zwischenablage: 'Zwischenablage',
  einfuhr: 'Import'
};

export function bildRezept(aufnahme = {}, strecken = [], gliederung = []) {
  const zeilen = [];
  const quelle = aufnahme.quelle || {};
  if (quelle.art) {
    zeilen.push({
      schild: 'Quelle',
      wert: `${QUELLEN_NAMEN[quelle.art] || 'Quelle'}${quelle.name ? ': ' + quelle.name : ''}${
        quelle.breite ? ` · ${quelle.breite} × ${quelle.hoehe} px` : ''
      }`
    });
  }
  const schnitt = aufnahme.ausschnitt;
  if (schnitt && schnitt.breite) {
    zeilen.push({
      schild: 'Ausschnitt',
      wert: `${schnitt.breite} × ${schnitt.hoehe} px ab ${schnitt.x}, ${schnitt.y}`
    });
  }
  if (aufnahme.einfuhr && aufnahme.einfuhr.datei) {
    zeilen.push({
      schild: 'Eingeführt',
      wert: `${aufnahme.einfuhr.datei}${aufnahme.einfuhr.seite ? ` · Seite ${aufnahme.einfuhr.seite}` : ''}`
    });
  }
  const marken = markenZusammenfassung(leseMarken(aufnahme.marken));
  if (marken.gesamt) {
    const teile = [];
    if (marken.unkenntlich) teile.push(`${marken.unkenntlich}× unkenntlich`);
    if (marken.rahmen) teile.push(`${marken.rahmen} Rahmen`);
    if (marken.schritte) teile.push(`${marken.schritte} Schritte`);
    zeilen.push({ schild: 'Bearbeitet', wert: teile.join(' · ') || `${marken.gesamt} Marken` });
  }
  const fassungen = leseFassungen(aufnahme);
  if (fassungen.length) {
    zeilen.push({ schild: 'Fassungen', wert: `${fassungen.length} · gezeigt wird die jüngste` });
  }
  if (aufnahme.autor) zeilen.push({ schild: 'Erfasst von', wert: aufnahme.autor });
  if (aufnahme.browser) zeilen.push({ schild: 'Browser', wert: aufnahme.browser });

  // In welchem Schritt welcher Strecke steht das Bild - mit seinem Text.
  const schritte = [];
  for (const strecke of strecken) {
    (strecke.schritte || []).forEach((schritt, i) => {
      if ((schritt.aufnahmen || []).includes(aufnahme.id)) {
        schritte.push({
          strecke: strecke.name || 'Klickstrecke',
          nummer: i + 1,
          text: String(schritt.text || '').trim()
        });
      }
    });
  }
  return { zeilen, schritte, pfad: kapitelPfad(gliederung, aufnahme.gliederung) };
}

/* =========================================================================
   Output – fertige Dokumente in mehreren Sprachen, Rollen und Sparten.

   Ein Dokument ist ein Dreiklang: eine Vorlage (Quick Guide, One Pager,
   Releaseletter, Handbuchseite), ein Inhalt (eine Strecke oder ein Kapitel)
   und eine Variante (eine Sprache, eine Rolle, eine Sparte …). Aus drei
   Sprachen und zwei Inhalten werden sechs Dokumente - und mit drei Formaten
   achtzehn Dateien. Dieser Teil rechnet den Plan; gezeichnet wird im Studio.
   ========================================================================= */

export const AUSGABE_FORMATE = [
  { id: 'pdf', label: 'PDF', endung: 'pdf', typ: 'application/pdf' },
  { id: 'docx', label: 'Word', endung: 'docx', typ: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'pptx', label: 'PowerPoint', endung: 'pptx', typ: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { id: 'html', label: 'HTML', endung: 'html', typ: 'text/html' }
];

/** Die Bilder eines Inhalts in einer Variante - dieselbe Regel wie im Studio. */
export function ausgabeBilder(aufnahmen = [], strecken = [], inhalt = '', feld = '', wert = '') {
  if (String(inhalt).startsWith('strecke:')) {
    const gefunden = strecken.find((s) => 'strecke:' + s.id === inhalt);
    if (!gefunden) return [];
    const strecke = feld && wert ? streckeInVariante(gefunden, aufnahmen, feld, wert).strecke : gefunden;
    return streckeMitAufnahmen(strecke, aufnahmen)
      .filter((s) => s.aufnahme)
      .map((s) => s.aufnahme);
  }
  if (String(inhalt).startsWith('kapitel:')) {
    const stelle = inhalt.slice(8);
    return sortiereNachKapitel(
      aufnahmen.filter(
        (a) => gehoertZu(String(a.gliederung || ''), stelle) && (!feld || String(a[feld] || '') === wert)
      )
    );
  }
  return [];
}

/** Wie ein Inhalt heißt, wenn er in einer Liste steht. */
export function ausgabeInhaltName(inhalt = '', strecken = [], gliederung = []) {
  if (String(inhalt).startsWith('strecke:')) {
    const gefunden = strecken.find((s) => 'strecke:' + s.id === inhalt);
    return gefunden ? gefunden.name || 'Klickstrecke' : inhalt;
  }
  if (String(inhalt).startsWith('kapitel:')) {
    const stelle = inhalt.slice(8);
    const eintrag = gliederung.find((e) => e.nummer === stelle);
    return eintrag ? `${eintrag.nummer} ${eintrag.thema}` : stelle;
  }
  return inhalt;
}

/**
 * Warum kein Dokument geplant ist. Bis 1.65.0 stand dort immer derselbe
 * Satz - auch dann, wenn Vorlage und Inhalt längst gewählt waren und es
 * allein an einer Achse ohne Werte lag. Wer das nicht wusste, kam nicht
 * weiter; die Vorgabe war genau dieser Fall.
 *
 * `werteMoeglich` sagt, ob die gewählte Achse im Bestand überhaupt Werte
 * hat - das weiß nur die Ansicht.
 */
export function ausgabeGrund(wahl = {}, { werteMoeglich = true } = {}) {
  const vorlagen = (wahl.vorlagen || []).filter(Boolean);
  const inhalte = (wahl.inhalte || []).filter(Boolean);
  const achse = String(wahl.achse || '');
  const werte = (wahl.werte || []).filter((w) => String(w).length);
  const fehlt = [];
  if (!vorlagen.length) fehlt.push('eine Vorlage');
  if (!inhalte.length) fehlt.push('einen Inhalt');
  if (fehlt.length) return `Noch kein Dokument geplant: links ${fehlt.join(' und ')} wählen.`;
  if (achse && !werte.length) {
    const feld = LABEL_FELDER.find((f) => f.id === achse);
    const name = (feld && feld.label) || achse;
    return werteMoeglich
      ? `Vorlage und Inhalt stehen. Es fehlen die Werte der Achse „${name}" – links ankreuzen, welche Fassungen entstehen sollen, oder die Achse auf „keine" stellen.`
      : `Vorlage und Inhalt stehen. Die Achse „${name}" ist gewählt, aber kein Bild trägt diese Angabe – die Achse auf „keine" stellen, oder das Label im Editor nachtragen.`;
  }
  return '';
}

/**
 * Der Plan: ein Auftrag je Vorlage × Inhalt × Variante. Aufträge ohne Bild
 * bleiben in der Liste und werden als leer ausgewiesen - wer drei Sprachen
 * erwartet und zwei bekommt, soll die Lücke sehen.
 */
export function ausgabePlan(aufnahmen = [], strecken = [], gliederung = [], wahl = {}, vorlagen = []) {
  const gewaehlteVorlagen = (wahl.vorlagen || []).filter(Boolean);
  const inhalte = (wahl.inhalte || []).filter(Boolean);
  const achse = String(wahl.achse || '');
  const werte = achse ? (wahl.werte || []).filter((w) => String(w).length) : [''];
  if (!gewaehlteVorlagen.length || !inhalte.length || !werte.length) return [];

  const auftraege = [];
  for (const vorlageId of gewaehlteVorlagen) {
    const satz = vorlagen.find((v) => v.id === vorlageId) || vorlage(vorlageId);
    for (const inhalt of inhalte) {
      for (const wert of werte) {
        const bilder = ausgabeBilder(aufnahmen, strecken, inhalt, achse, wert);
        const inhaltName = ausgabeInhaltName(inhalt, strecken, gliederung);
        const variante = achse && wert ? labelWert(achse, wert) : '';
        auftraege.push({
          id: `${vorlageId}|${inhalt}|${achse}:${wert}`,
          vorlage: vorlageId,
          vorlageLabel: satz ? satz.label : vorlageId,
          inhalt,
          inhaltName,
          achse,
          wert,
          variante,
          titel: variante ? `${inhaltName} · ${variante}` : inhaltName,
          bilder: bilder.length,
          kennungen: bilder.map((a) => a.id)
        });
      }
    }
  }
  return auftraege;
}

/** Der Dateiname eines Auftrags: Vorlage, Inhalt, Variante, Endung. */
export function ausgabeDateiname(auftrag = {}, endung = 'pdf') {
  const teile = [auftrag.vorlage, auftrag.inhaltName, auftrag.wert]
    .map((t) => bereinigeDateiname(t))
    .filter(Boolean);
  return `${teile.join('-') || 'dokument'}.${endung}`;
}

/** Der Ordner eines Auftrags unterhalb des gewählten Verzeichnisses. */
export function ausgabeOrdner(auftrag = {}) {
  return ['output', bereinigeDateiname(auftrag.wert) || 'ohne-variante', bereinigeDateiname(auftrag.vorlage) || 'vorlage'];
}

/** Was der Plan insgesamt bedeutet: Dokumente, Dateien, Lücken. */
export function ausgabeUmfang(plan = [], formate = []) {
  const mitBild = plan.filter((a) => a.bilder > 0);
  return {
    dokumente: plan.length,
    leer: plan.length - mitBild.length,
    dateien: mitBild.length * Math.max(formate.length, 0),
    bilder: mitBild.reduce((summe, a) => summe + a.bilder, 0)
  };
}

/* =========================================================================
   PDF – die Blätter in einer Datei, 300 dpi.

   Ein PDF ist kein Geheimnis: ein Kopf, nummerierte Objekte, eine Tabelle
   ihrer Byte-Abstände, ein Schluss. Ein JPEG wandert unverändert als Strom
   hinein (`DCTDecode`) - der Browser hat es schon gerechnet, es wird hier
   nicht noch einmal angefasst. Darum braucht diese Datei weder eine fremde
   Bibliothek (die Inhaltsrichtlinie ließe keine zu) noch eine Schrift: auf
   den Blättern steht der Text bereits im Bild.
   ========================================================================= */

const PDF_DPI = 300;

/** Bytes aus einer Zeichenkette - ein Zeichen, ein Byte (Latin-1). */
function pdfBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * Ein Text im PDF: als UTF-16BE in Hexadezimal, damit Umlaute nicht zu
 * Fragezeichen werden. Ein Titel „Prüfbericht" ist sonst keiner.
 */
function pdfTextWert(text) {
  let hex = 'FEFF';
  for (const zeichen of String(text || '')) {
    const nummer = zeichen.codePointAt(0);
    if (nummer > 0xffff) {
      const rest = nummer - 0x10000;
      hex += (0xd800 + (rest >> 10)).toString(16).padStart(4, '0').toUpperCase();
      hex += (0xdc00 + (rest & 0x3ff)).toString(16).padStart(4, '0').toUpperCase();
    } else {
      hex += nummer.toString(16).padStart(4, '0').toUpperCase();
    }
  }
  return '<' + hex + '>';
}

/** Der Zeitstempel in der Schreibweise, die ein PDF erwartet. */
function pdfDatum(zeit) {
  const d = zeit instanceof Date ? zeit : new Date(zeit || Date.now());
  const z = (n) => String(n).padStart(2, '0');
  return (
    'D:' +
    d.getUTCFullYear() +
    z(d.getUTCMonth() + 1) +
    z(d.getUTCDate()) +
    z(d.getUTCHours()) +
    z(d.getUTCMinutes()) +
    z(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Die Blätter als PDF. Jede Seite ist ein JPEG in voller Größe; das Format
 * der Seite folgt den Bildpunkten bei 300 dpi, damit A4 auch A4 bleibt.
 *
 * `seiten`: [{ daten: Uint8Array (JPEG), breite, hoehe }]
 */
export function pdfAusSeiten(seiten = [], { titel = '', anwendung = '', dpi = PDF_DPI, stand = new Date() } = {}) {
  const gueltig = seiten.filter((s) => s && s.daten && s.daten.length && s.breite > 0 && s.hoehe > 0);
  if (!gueltig.length) return null;

  const teile = [];
  let laenge = 0;
  const schreibe = (stueck) => {
    const bytes = typeof stueck === 'string' ? pdfBytes(stueck) : stueck;
    teile.push(bytes);
    laenge += bytes.length;
  };

  // Objekt 1 Katalog, 2 Seitenbaum, 3 Angaben; danach je Seite drei Objekte.
  const ersteSeite = 4;
  const objekte = new Map(); // Nummer -> Byte-Abstand
  const seitenNummern = gueltig.map((_, i) => ersteSeite + i * 3);
  const beginne = (nummer) => {
    objekte.set(nummer, laenge);
    schreibe(`${nummer} 0 obj\n`);
  };

  schreibe('%PDF-1.4\n');
  // Vier Bytes über 127: so erkennt jedes Werkzeug die Datei als binär.
  schreibe(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  beginne(1);
  schreibe('<</Type/Catalog/Pages 2 0 R>>\nendobj\n');

  beginne(2);
  schreibe(`<</Type/Pages/Count ${gueltig.length}/Kids[${seitenNummern.map((n) => `${n} 0 R`).join(' ')}]>>\nendobj\n`);

  beginne(3);
  schreibe(
    `<</Title ${pdfTextWert(titel || 'Screenarchiv')}/Producer ${pdfTextWert(
      `Screenarchiv ${anwendung}`.trim()
    )}/Creator ${pdfTextWert(`Screenarchiv ${anwendung}`.trim())}/CreationDate (${pdfDatum(stand)})>>\nendobj\n`
  );

  gueltig.forEach((seite, i) => {
    const seitenNr = ersteSeite + i * 3;
    const inhaltNr = seitenNr + 1;
    const bildNr = seitenNr + 2;
    // 72 Punkte je Zoll: aus Bildpunkten wird das Papierformat.
    const breite = Math.round((seite.breite / dpi) * 72 * 100) / 100;
    const hoehe = Math.round((seite.hoehe / dpi) * 72 * 100) / 100;
    const inhalt = `q ${breite} 0 0 ${hoehe} 0 0 cm /Im0 Do Q\n`;

    beginne(seitenNr);
    schreibe(
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${breite} ${hoehe}]` +
        `/Resources<</XObject<</Im0 ${bildNr} 0 R>>/ProcSet[/PDF/ImageC]>>` +
        `/Contents ${inhaltNr} 0 R>>\nendobj\n`
    );

    beginne(inhaltNr);
    schreibe(`<</Length ${inhalt.length}>>\nstream\n${inhalt}endstream\nendobj\n`);

    beginne(bildNr);
    schreibe(
      `<</Type/XObject/Subtype/Image/Width ${seite.breite}/Height ${seite.hoehe}` +
        `/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${seite.daten.length}>>\nstream\n`
    );
    schreibe(seite.daten);
    schreibe('\nendstream\nendobj\n');
  });

  const anzahl = 3 + gueltig.length * 3;
  const xref = laenge;
  const zeilen = ['xref', `0 ${anzahl + 1}`, '0000000000 65535 f '];
  for (let nummer = 1; nummer <= anzahl; nummer++) {
    zeilen.push(String(objekte.get(nummer)).padStart(10, '0') + ' 00000 n ');
  }
  schreibe(zeilen.join('\n') + '\n');
  schreibe(`trailer\n<</Size ${anzahl + 1}/Root 1 0 R/Info 3 0 R>>\nstartxref\n${xref}\n%%EOF\n`);

  const ganz = new Uint8Array(laenge);
  let stelle = 0;
  for (const stueck of teile) {
    ganz.set(stueck, stelle);
    stelle += stueck.length;
  }
  return ganz;
}

/* =========================================================================
   Projekte – Name, Version, Land.

   „oneSCM Portal" allein sagt zu wenig: dieselbe Maske sieht in Fassung 2.3
   anders aus als in 2.4, und in Korea anders als in Deutschland. Ein Projekt
   ist darum ein Dreiklang aus Name, Version und Land. Es wird angelegt, nicht
   getippt - so heißt es in jedem Bild gleich.
   ========================================================================= */

export const PROJEKTE_SCHLUESSEL = 'screenarchiv:projekte';
export const PROJEKTE_VERSION = 1;

/** Ein Projekt in fester Form; ohne Namen gibt es keines. */
export function projektSatz(roh = {}) {
  const name = String(roh.name || '').trim();
  if (!name) return null;
  const version = String(roh.version || '').trim();
  const land = String(roh.land || '').trim();
  return {
    id: String(roh.id || '').trim() || projektKennzeichen(name, version, land),
    name,
    version,
    land,
    notiz: String(roh.notiz || '').trim(),
    angelegt_am: String(roh.angelegt_am || '') || new Date().toISOString()
  };
}

/** Die Kennung aus den drei Teilen - zweimal dasselbe gibt dieselbe Kennung. */
export function projektKennzeichen(name, version, land) {
  return ['PRJ', bereinigeDateiname(name) || 'ohne-namen', bereinigeDateiname(version), bereinigeDateiname(land)]
    .filter(Boolean)
    .join('-');
}

/** Wie das Projekt in einer Zeile steht: „oneSCM Portal 2.4 · Germany". */
export function projektKennung(satz) {
  if (!satz) return '';
  const kopf = [satz.name, satz.version].filter(Boolean).join(' ');
  return [kopf, satz.land].filter(Boolean).join(' · ');
}

/** Was einem Projekt fehlt, bevor es angelegt werden kann. */
export function pruefeProjekt(satz = {}, vorhandene = []) {
  const probleme = [];
  const name = String(satz.name || '').trim();
  if (!name) probleme.push({ feld: 'name', text: 'Das Projekt braucht einen Namen.' });
  if (String(satz.version || '').length > 20) {
    probleme.push({ feld: 'version', text: 'Die Version ist zu lang – eine Nummer wie 2.4 genügt.' });
  }
  const kennzeichen = projektKennzeichen(name, satz.version, satz.land);
  if (name && vorhandene.some((p) => p.id === kennzeichen && p.id !== satz.id)) {
    probleme.push({
      feld: 'name',
      text: `„${projektKennung({ name, version: satz.version, land: satz.land })}" gibt es schon.`
    });
  }
  return probleme;
}

export function leseProjekte(text) {
  let inhalt = null;
  try {
    inhalt = JSON.parse(text || 'null');
  } catch (fehler) {
    return [];
  }
  const liste = Array.isArray(inhalt) ? inhalt : inhalt && Array.isArray(inhalt.projekte) ? inhalt.projekte : [];
  const gesehen = new Set();
  return liste
    .map(projektSatz)
    .filter(Boolean)
    .filter((p) => (gesehen.has(p.id) ? false : gesehen.add(p.id)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version) || a.land.localeCompare(b.land));
}

export function schreibeProjekte(liste = [], wahl = '') {
  return JSON.stringify({
    version: PROJEKTE_VERSION,
    wahl: String(wahl || ''),
    projekte: liste.map(projektSatz).filter(Boolean)
  });
}

/** Die gewählte Arbeitsmenge: '' heißt alles, 'ohne' die Bilder ohne Projekt. */
export function leseProjektwahl(text) {
  try {
    const inhalt = JSON.parse(text || 'null');
    return inhalt && typeof inhalt.wahl === 'string' ? inhalt.wahl : '';
  } catch (fehler) {
    return '';
  }
}

/**
 * Die Bilder der gewählten Arbeitsmenge. Wer am Handbuch für 2.4 in
 * Deutschland arbeitet, will die koreanischen Bilder nicht gezählt, nicht
 * geprüft und nicht abgelegt bekommen - gelöscht werden sie deswegen nicht.
 */
export function projektFilter(aufnahmen = [], wahl = '') {
  const gewaehlt = String(wahl || '');
  if (!gewaehlt) return aufnahmen;
  if (gewaehlt === 'ohne') return aufnahmen.filter((a) => !String(a.projekt || '').trim());
  return aufnahmen.filter((a) => projektKennzeichen(a.projekt, a.version, a.land) === gewaehlt);
}

/**
 * Zwei Arbeitsmengen nebeneinander: was in der einen steht und in der anderen
 * fehlt. Das ist die Frage vor einem Releaseletter ("was ist neu in 2.4?")
 * und vor einer Übersetzung ("was fehlt in Korea?"). Verglichen werden
 * Stellen der Gliederung, nicht Bilder: ein neuer Screenshot derselben Maske
 * ist keine neue Funktion.
 */
export function vergleicheProjekte(aufnahmen = [], wahlA = '', wahlB = '', gliederung = []) {
  const a = projektFilter(aufnahmen, wahlA);
  const b = projektFilter(aufnahmen, wahlB);
  const stelleVon = (bild) => String(bild.gliederung || '').trim();
  const stellen = [...new Set([...a, ...b].map(stelleVon).filter(Boolean))].sort(vergleicheKapitel);

  const zeilen = stellen.map((nummer) => {
    const eintrag = gliederung.find((e) => e.nummer === nummer) || null;
    const inA = a.filter((bild) => stelleVon(bild) === nummer);
    const inB = b.filter((bild) => stelleVon(bild) === nummer);
    return {
      nummer,
      thema: eintrag ? eintrag.thema : '',
      bekannt: Boolean(eintrag),
      art: !inA.length ? 'neu' : !inB.length ? 'entfallen' : 'beide',
      a: inA.length,
      b: inB.length,
      kennungenA: inA.map((bild) => bild.id),
      kennungenB: inB.map((bild) => bild.id)
    };
  });

  return {
    wahlA,
    wahlB,
    zeilen,
    // Ohne Stelle lässt sich nichts vergleichen - gezählt wird es trotzdem,
    // damit niemand glaubt, die Bilder seien weg.
    ohneStelleA: a.filter((bild) => !stelleVon(bild)).length,
    ohneStelleB: b.filter((bild) => !stelleVon(bild)).length,
    bilderA: a.length,
    bilderB: b.length,
    neu: zeilen.filter((z) => z.art === 'neu').length,
    entfallen: zeilen.filter((z) => z.art === 'entfallen').length,
    beide: zeilen.filter((z) => z.art === 'beide').length
  };
}

/** Der Vergleich als Text - der erste Entwurf eines Releaseletters. */
export function vergleichAlsText(vergleich = {}, projekte = [], { stand = new Date().toISOString(), anwendung = '' } = {}) {
  const nameA = projektWahlText(vergleich.wahlA, projekte);
  const nameB = projektWahlText(vergleich.wahlB, projekte);
  const zeilen = [
    `Projektvergleich Screenarchiv${anwendung ? ' ' + anwendung : ''}`,
    `Stand: ${formatiereZeitpunkt(stand)}`,
    `Vorher: ${nameA} (${vergleich.bilderA || 0} Bilder)`,
    `Nachher: ${nameB} (${vergleich.bilderB || 0} Bilder)`,
    ''
  ];
  const blocke = [
    ['neu', `Neu in ${nameB}`],
    ['entfallen', `Nur in ${nameA}`],
    ['beide', 'In beiden']
  ];
  for (const [art, titel] of blocke) {
    const teil = (vergleich.zeilen || []).filter((z) => z.art === art);
    zeilen.push(`## ${titel} (${teil.length})`, '');
    if (!teil.length) zeilen.push('–', '');
    for (const z of teil) {
      zeilen.push(`${z.nummer}${z.thema ? ' ' + z.thema : ''} · ${z.a} → ${z.b} Bild(er)`);
    }
    if (teil.length) zeilen.push('');
  }
  if (vergleich.ohneStelleA || vergleich.ohneStelleB) {
    zeilen.push(
      `Ohne Stelle und darum nicht verglichen: ${vergleich.ohneStelleA || 0} in ${nameA}, ` +
        `${vergleich.ohneStelleB || 0} in ${nameB}.`,
      ''
    );
  }
  return zeilen.join('\n');
}

/** Wie die Wahl in einer Zeile heißt - auch wenn das Projekt gelöscht wurde. */
export function projektWahlText(wahl, projekte = []) {
  const gewaehlt = String(wahl || '');
  if (!gewaehlt) return 'alle Projekte';
  if (gewaehlt === 'ohne') return 'ohne Projekt';
  const satz = projekte.find((p) => p.id === gewaehlt);
  return satz ? projektKennung(satz) : gewaehlt;
}

/** Zählt, wie viele Bilder an jedem Projekt hängen. */
export function zaehleJeProjekt(liste = [], aufnahmen = []) {
  const zahlen = new Map(liste.map((p) => [p.id, 0]));
  for (const aufnahme of aufnahmen) {
    const kennzeichen = projektKennzeichen(aufnahme.projekt, aufnahme.version, aufnahme.land);
    if (zahlen.has(kennzeichen)) zahlen.set(kennzeichen, zahlen.get(kennzeichen) + 1);
  }
  return zahlen;
}

/**
 * Projekte, die an Bildern stehen, aber in der Liste fehlen. Wer aus einem
 * aelteren Stand kommt oder von Hand getippt hat, soll seine Projekte
 * wiederfinden - vorgeschlagen, nicht stillschweigend angelegt.
 */
export function projekteAusBestand(aufnahmen = [], vorhandene = []) {
  const bekannt = new Set(vorhandene.map((p) => p.id));
  const gefunden = new Map();
  for (const aufnahme of aufnahmen) {
    const name = String(aufnahme.projekt || '').trim();
    if (!name) continue;
    const satz = projektSatz({ name, version: aufnahme.version, land: aufnahme.land });
    if (!satz || bekannt.has(satz.id) || gefunden.has(satz.id)) continue;
    gefunden.set(satz.id, satz);
  }
  return [...gefunden.values()];
}
