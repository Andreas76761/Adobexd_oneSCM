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
  auswahl: null
};

export const ARCHIV_ANSICHTEN = ['aktiv', 'archiv', 'alle'];

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
  ['auswahl', 'id']
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
