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
export const ANSICHTEN = ['archiv', 'aufnahme', 'ausschneiden', 'eingang'];

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

export const BEIPACKZETTEL_VERSION = 1;

/**
 * Der Beipackzettel: alle Metadaten neben der Bilddatei, gleicher Name, Endung
 * .json. Ohne ihn traegt eine abgelegte Datei nur, was ins Namensmuster passt.
 * Feste Feldfolge, auch wenn Werte leer sind - so bleibt die Form vorhersagbar.
 */
export function baueBeipackzettel({ entwurf = {}, bildname, ausschnitt, quelle, erfasstAm, anwendung }) {
  return JSON.stringify(
    {
      beipackzettel: BEIPACKZETTEL_VERSION,
      erzeugt_von: `Screenarchiv ${anwendung || ''}`.trim(),
      bild: bildname || '',
      erfasst_am: erfasstAm || '',
      datum: entwurf.datum || '',
      titel: String(entwurf.titel || '').trim(),
      projekt: String(entwurf.projekt || '').trim(),
      seite: String(entwurf.seite || '').trim(),
      kategorie: String(entwurf.kategorie || '').trim(),
      status: entwurf.status || '',
      rolle: entwurf.rolle || '',
      begriffe: normalisiereBegriffe(entwurf.begriffe || []),
      notiz: String(entwurf.notiz || '').trim(),
      autor: String(entwurf.autor || '').trim(),
      browser: String(entwurf.browser || '').trim(),
      ausschnitt: ausschnitt ? { ...ausschnitt } : null,
      quelle: quelle ? { art: quelle.art, name: quelle.name || '', breite: quelle.breite, hoehe: quelle.hoehe } : null
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
