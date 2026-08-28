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
export const ANSICHTEN = ['archiv', 'aufnahme', 'eingang'];

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
export const EINGANG_VERSION = 1;
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
  return {
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
    notiz: ''
  };
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
    probleme.push({ feld: 'quelle', text: 'Zuerst eine Quelle wählen: Bildschirm freigeben, Bild öffnen oder Beispielquelle.' });
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
    bild
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

export function eingangSuchIndex(aufnahme) {
  const roh = [
    aufnahme.id,
    aufnahme.titel,
    aufnahme.projekt,
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
  return normalisiere(roh) + '   ' + normalisiereLang(roh);
}

export function filtereEingang(liste, auswahl = {}) {
  const { suche = '', kategorien = [], projekte = [], zustand = 'alle' } = auswahl;
  return (liste || []).filter((a) => {
    if (zustand === 'offen' && istVollstaendig(a)) return false;
    if (zustand === 'fertig' && !istVollstaendig(a)) return false;
    if (kategorien.length && !kategorien.includes(a.kategorie)) return false;
    if (projekte.length && !projekte.includes(a.projekt)) return false;
    if (!passtZuSuche(a, suche, eingangSuchIndex(a))) return false;
    return true;
  });
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
  return liste
    .filter((a) => a && typeof a === 'object' && a.id && typeof a.bild === 'string' && a.bild.startsWith('data:image/'))
    .map((a) => ({
      ...a,
      titel: String(a.titel || a.id),
      begriffe: normalisiereBegriffe(a.begriffe || []),
      datum: istGueltigesDatum(a.datum) ? a.datum : String(a.erfasst_am || '').slice(0, 10),
      ausschnitt: a.ausschnitt || { x: 0, y: 0, breite: 0, hoehe: 0 }
    }));
}

export function schreibeEingang(liste) {
  return JSON.stringify({ version: EINGANG_VERSION, aufnahmen: liste || [] });
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
        <div><img src="${m(aufnahme.bild)}" alt="${m(aufnahme.titel)}"></div>
        <div>
          <div class="satz-kopf">
            <span class="kennung">${m(aufnahme.id)}</span>
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
