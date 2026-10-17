/* =========================================================================
   Oberflaeche des Screenarchivs: Navigation, Archivansicht, Detailansicht.

   Diese Datei wird vom Build zusammen mit core.mjs, den Daten und aufnahme.js
   in EIN <script>-Element geschrieben. Die Funktionen aus core.mjs stehen
   deshalb hier direkt zur Verfuegung (filtere, sortiere, ...), ebenso die
   Funktionen aus aufnahme.js.
 ========================================================================= */

const EINTRAEGE = bereiteVor(DATEN.eintraege);
const VOKABULAR = DATEN.vokabular;
const AUFNAHMEN = DATEN.aufnahmen;
const VIEWPORT_LABEL = Object.fromEntries(VOKABULAR.viewports.map((v) => [v.id, v.label]));

const STATUS_ZEICHEN = { gut: '✓', warn: '◐', neutral: '×' };
const MODUS_SCHLUESSEL = 'screenarchiv:vergleichsmodus';

let zustand = queryZuZustand(location.hash);
let sichtbar = [];
let ordnerInhalt = []; // zuletzt gelesener Ordnerinhalt samt Beipackzetteln
let zettelOffen = null; // Ordnerdatei, deren Beipackzettel gerade offen steht
let ordnerGrenze = 12; // wie viele Bilder das Band zeigt
let ordnerSuche = ''; // Filter auf den Dateinamen
let modus = leseModus();

/* ------------------------------------------------------------ Helfer */

const $ = (wahl) => document.querySelector(wahl);

function el(tag, eigenschaften = {}, kinder = []) {
  const knoten = document.createElement(tag);
  for (const [k, v] of Object.entries(eigenschaften)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') knoten.textContent = v;
    // <textarea> kennt kein value-Attribut - der Inhalt muss über die
    // Eigenschaft gesetzt werden, sonst bleibt das Feld leer.
    else if (k === 'value' && knoten.tagName === 'TEXTAREA') knoten.value = v;
    else if (k === 'html') knoten.innerHTML = v;
    else if (k === 'klasse') knoten.className = v;
    else if (k.startsWith('on')) knoten.addEventListener(k.slice(2), v);
    else knoten.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kind of [].concat(kinder)) if (kind) knoten.append(kind);
  return knoten;
}

function leseModus() {
  try {
    const gespeichert = localStorage.getItem(MODUS_SCHLUESSEL);
    return ['regler', 'neben', 'wechsel'].includes(gespeichert) ? gespeichert : 'regler';
  } catch (fehler) {
    return 'regler';
  }
}

function merkeModus(wert) {
  modus = wert;
  try {
    localStorage.setItem(MODUS_SCHLUESSEL, wert);
  } catch (fehler) {
    /* Speicher nicht verfuegbar - der Modus gilt dann nur fuer diese Sitzung. */
  }
}

function statusMarke(eintrag) {
  const art = statusArt(eintrag.status);
  return el('span', { klasse: 'status status--' + art }, [
    el('span', { klasse: 'status-zeichen', 'aria-hidden': 'true', text: STATUS_ZEICHEN[art] }),
    el('span', { text: eintrag.status })
  ]);
}

function svgKnoten(id, variante, klasse) {
  const huelle = el('div', { klasse });
  huelle.innerHTML = AUFNAHMEN[id][variante];
  return huelle;
}

/* -------------------------------------------------------- Adresszeile */

let hashEigen = false;
function schreibeHash() {
  const query = zustandZuQuery(zustand);
  const neu = query ? '#' + query : ' ';
  if (location.hash.replace(/^#/, '') === query) return;
  hashEigen = true;
  history.replaceState(null, '', neu === ' ' ? location.pathname + location.search : neu);
  setTimeout(() => (hashEigen = false), 0);
}

window.addEventListener('hashchange', () => {
  if (hashEigen) return;
  zustand = queryZuZustand(location.hash);
  zeichne();
  if (zustand.auswahl) oeffneDetail(zustand.auswahl, false);
});

function setze(aenderung, neuZeichnen = true) {
  const vorher = zustand.ansicht;
  zustand = { ...zustand, ...aenderung };
  schreibeHash();
  if (neuZeichnen) zeichne();
  // Das Ordnerband behauptet, den tatsaechlichen Inhalt zu zeigen - beim
  // Betreten des Archivs wird er darum frisch gelesen, nicht erinnert.
  if (zustand.ansicht === 'archiv' && vorher !== 'archiv' && ordnerZugriff) zeigeOrdnerImArchiv();
  // Editor und Strecke kennen den Eingang erst, wenn sie sichtbar sind.
  if (zustand.ansicht === 'markieren') zeichneMarkieren();
  if (zustand.ansicht === 'strecke') zeichneStrecke();
  if (zustand.ansicht === 'gliederung') zeichneGliederung();
  if (zustand.ansicht === 'design') zeichneDesign();
  if (zustand.ansicht === 'import') zeichneImport();
  if (zustand.ansicht === 'pruefung') zeichnePruefung();
  if (zustand.ansicht === 'verzeichnis') zeichneVerzeichnis();
  if (zustand.ansicht === 'output') zeichneOutput();
}

function schalte(dimension, wert) {
  const liste = zustand[dimension] || [];
  setze({ [dimension]: liste.includes(wert) ? liste.filter((w) => w !== wert) : [...liste, wert] });
}

/* ------------------------------------------------------- Kennzahlen */

function zeichneKennzahlen(liste) {
  const k = kennzahlen(liste);
  const gesamt = zustand.archiv === 'alle' ? EINTRAEGE.length : filtere(EINTRAEGE, { archiv: zustand.archiv }).length;
  const kacheln = [
    { schild: 'Belege', wert: String(k.anzahl), zusatz: `von ${gesamt} in dieser Ansicht` },
    { schild: 'Aufnahmen', wert: String(k.aufnahmen), zusatz: 'je Beleg vorher + nachher' },
    { schild: 'Übernommen', wert: String(k.uebernommen), zusatz: `${k.inPruefung} in Prüfung · ${k.verworfen} verworfen` },
    { schild: 'Projekte', wert: String(k.projekte), zusatz: k.von ? `${formatiereDatum(k.von)} – ${formatiereDatum(k.bis)}` : '–' },
    {
      schild: 'Mittlere Wirkung',
      wert: formatiereWirkung(k.mittlereWirkung),
      zusatz: 'über alle Kennzahlen',
      klasse: 'kachel kachel--wirkung'
    }
  ];
  const ziel = $('#kennzahlen');
  ziel.replaceChildren(
    ...kacheln.map((kach) =>
      el('div', { klasse: kach.klasse || 'kachel' }, [
        el('div', { klasse: 'kachel-schild', text: kach.schild }),
        el('div', { klasse: 'kachel-wert', text: kach.wert }),
        el('div', { klasse: 'kachel-zusatz', text: kach.zusatz })
      ])
    )
  );
}

/* --------------------------------------------------------- Facetten */

function zeichneFacetten() {
  const f = facetten(EINTRAEGE, zustand, VOKABULAR);
  const ziel = $('#facetten');
  const gruppen = [];

  gruppen.push(
    el('div', {}, [
      el('div', { klasse: 'gruppe-titel', text: 'Ansicht' }),
      el('div', { klasse: 'segment', role: 'group', 'aria-label': 'Archivansicht' }, [
        ...[
          ['aktiv', 'Aktiv'],
          ['archiv', 'Archiv'],
          ['alle', 'Alle']
        ].map(([wert, label]) =>
          el('button', {
            type: 'button',
            text: label,
            'aria-pressed': String(zustand.archiv === wert),
            'data-archiv': wert,
            onclick: () => setze({ archiv: wert })
          })
        )
      ])
    ])
  );

  const bloecke = [
    ['projekte', 'Projekt', f.projekte],
    ['kategorien', 'Kategorie', f.kategorien],
    ['status', 'Status', f.status],
    ['viewports', 'Aufnahmeformat', f.viewports]
  ];
  for (const [dimension, titel, werte] of bloecke) {
    gruppen.push(
      el('div', {}, [
        el('div', { klasse: 'gruppe-titel' }, [
          el('span', { text: titel }),
          el('span', { text: werte.filter((w) => w.aktiv).length ? String(werte.filter((w) => w.aktiv).length) : '' })
        ]),
        el(
          'div',
          { klasse: 'facette' },
          werte.map((w) =>
            el(
              'button',
              {
                type: 'button',
                'aria-pressed': String(w.aktiv),
                disabled: w.anzahl === 0 && !w.aktiv,
                'data-facette': dimension,
                'data-wert': w.wert,
                onclick: () => schalte(dimension, w.wert)
              },
              [el('span', { text: w.label || w.wert }), el('span', { klasse: 'zahl', text: String(w.anzahl) })]
            )
          )
        )
      ])
    );
  }

  const anzahl = anzahlAktiverFilter(zustand);
  const schubTitel = document.getElementById('filterschub-titel');
  if (schubTitel) schubTitel.textContent = anzahl ? `Filter und Ansicht (${anzahl} aktiv)` : 'Filter und Ansicht';
  gruppen.push(
    el('button', {
      klasse: 'zuruecksetzen',
      type: 'button',
      id: 'zuruecksetzen',
      hidden: anzahl === 0,
      text: `Filter zurücksetzen (${anzahl})`,
      onclick: () => {
        const behalten = zustand.sortierung;
        zustand = { ...STANDARD_ZUSTAND, sortierung: behalten, ansicht: zustand.ansicht };
        schreibeHash();
        zeichne();
        $('#suche').value = '';
      }
    })
  );

  ziel.replaceChildren(...gruppen);
}

/* --------------------------------------------- Eigene Aufnahmen im Archiv */

/**
 * Aufgenommene Bilder gehören nicht in den Belegbestand - ein Beleg braucht
 * zwei Aufnahmen und eine Begründung. Sichtbar müssen sie hier trotzdem sein:
 * im Archiv wird zuerst gesucht.
 */
function zeichneEigeneAufnahmen() {
  const band = $('#eigene-aufnahmen');
  const anzahl = eingang.length;
  band.hidden = anzahl === 0;
  if (!anzahl) return;
  const k = eingangKennzahlen(eingang);
  $('#eigene-stand').textContent =
    `${anzahl} ${anzahl === 1 ? 'Aufnahme' : 'Aufnahmen'} im Eingang` +
    (k.offen ? `, davon ${k.offen} ohne Kategorie oder Begriffe` : '');
  $('#eigene-streifen').replaceChildren(
    ...sortiereEingang(eingang, 'neu')
      .slice(0, 12)
      .map((a) =>
        el(
          'button',
          {
            klasse: 'streifen-bild',
            type: 'button',
            title: `${a.id} · ${a.titel}`,
            onclick: () => setze({ ansicht: 'eingang' })
          },
          [el('img', { src: a.bild || PLATZHALTER_BILD, alt: a.titel, loading: 'lazy' }), el('span', { klasse: 'kennung', text: a.id })]
        )
      )
  );
}

/** Zeigt, was tatsächlich im gewählten Ordner liegt - gelesen, nicht vermutet. */
async function zeigeOrdnerImArchiv() {
  const band = $('#ordner-band');
  if (!ordnerZugriff) {
    band.hidden = true;
    return;
  }
  band.hidden = false;
  $('#ordner-name').textContent = ordnerZugriff.name;
  $('#ordner-stand').textContent = 'wird gelesen …';
  // Welcher Zettel offen steht, wird gemerkt: das Lesen dauert, und in der
  // Zwischenzeit kann jemand eine Kachel geöffnet haben.
  const offen = zettelOffen ? zettelOffen.name : '';
  const inhalt = await liesOrdnerBilder({ grenze: ordnerGrenze, suche: ordnerSuche });
  $('#ordner-stand').textContent = beschreibeOrdnerstand(inhalt);
  $('#ordner-mehr').hidden = (inhalt.passend || 0) <= inhalt.length;
  ordnerInhalt = inhalt;
  zeichneOrdnerStreifen();
  if (!offen) return;
  // Dieselbe Datei wieder zeigen - mit dem Stand von eben gelesen, nicht mit
  // dem alten. Ist sie verschwunden, wird die Schau geschlossen.
  const wieder =
    inhalt.find((b) => b.name === offen && b.zettel) ||
    (inhalt.zettelOhneBild || []).filter((z) => z.name === offen).map((z) => ({ name: z.name, zettel: z }))[0];
  if (wieder) zeigeZettel(wieder);
  else verbergeZettel();
}

/** Der Stand neben dem Ordnernamen: was liegt da, was davon ist zu sehen. */
function beschreibeOrdnerstand(inhalt) {
  const gesamt = inhalt.gesamt || 0;
  const passend = inhalt.passend === undefined ? gesamt : inhalt.passend;
  if (!gesamt && !(inhalt.zettelGesamt || 0)) return 'noch nichts abgelegt';
  const teile = [];
  if (ordnerSuche) {
    teile.push(`${passend} von ${gesamt} ${gesamt === 1 ? 'Bild' : 'Bildern'} gefiltert`);
  } else {
    teile.push(`${gesamt} ${gesamt === 1 ? 'Bild' : 'Bilder'}`);
  }
  if (passend > inhalt.length) teile.push(`neueste ${inhalt.length} gezeigt`);
  if (inhalt.length) {
    const mitZettel = inhalt.filter((b) => b.zettel).length;
    teile.push(
      mitZettel === inhalt.length
        ? inhalt.length === 1
          ? 'mit Beipackzettel'
          : 'alle mit Beipackzettel'
        : `${mitZettel} mit Beipackzettel`
    );
  }
  const verwaist = inhalt.verwaistGesamt || 0;
  if (verwaist) teile.push(`${verwaist} Zettel ohne Bild`);
  return teile.join(' · ');
}

/**
 * Zeichnet den Streifen aus dem zuletzt gelesenen Inhalt - ohne den Ordner
 * erneut zu lesen, damit eine offene Zettelschau stehen bleibt.
 */
function zeichneOrdnerStreifen() {
  $('#ordner-streifen').replaceChildren(
    ...ordnerInhalt.map(zeichneOrdnerBild),
    ...(ordnerInhalt.zettelOhneBild || []).map(zeichneVerwaistenZettel)
  );
}

/**
 * Ein Zettel ohne Bild. Er wird gezeigt, nicht verschwiegen: meist ist das
 * Bild von Hand verschoben oder umbenannt worden, und der Zettel traegt
 * trotzdem die Arbeit.
 */
function zeichneVerwaistenZettel(zettel) {
  return el(
    'button',
    {
      type: 'button',
      klasse: 'streifen-bild streifen-bild--zettel',
      'data-datei': zettel.name,
      title: `${zettel.name} · ${formatiereBytes(zettel.groesse)} – Zettel ohne Bild`,
      onclick: () => zeigeZettel({ name: zettel.name, zettel })
    },
    [
      el('span', { klasse: 'zettel-platzhalter', text: '{ }' }),
      el('span', { klasse: 'kennung', text: zettel.name }),
      el('span', { klasse: 'zettel-marke zettel-marke--allein', text: 'ohne Bild' })
    ]
  );
}

/** Die schon uebernommene Aufnahme zu einer Ordnerdatei, sonst null. */
function uebernahmeZu(b) {
  return ordnerZugriff ? findeUebernahme(eingang, ordnerZugriff.name, b.name) : null;
}

/** Ein Bild im Ordnerband; mit Zettel wird die Kachel anklickbar. */
function zeichneOrdnerBild(b) {
  const uebernommen = uebernahmeZu(b);
  const marke = b.zettel
    ? el('span', { klasse: 'zettel-marke', text: 'Zettel' })
    : el('span', { klasse: 'zettel-marke zettel-marke--fehlt', text: 'kein Zettel' });
  const kinder = [
    el('img', { src: b.bild, alt: b.name, loading: 'lazy' }),
    el('span', { klasse: 'kennung', text: b.name }),
    marke
  ];
  if (uebernommen) {
    kinder.push(el('span', { klasse: 'eingang-marke', text: uebernommen.id }));
  }
  const titel = `${b.name} · ${formatiereBytes(b.groesse)}`;
  if (!b.zettel) {
    return el(
      'div',
      { klasse: 'streifen-bild', 'data-datei': b.name, title: `${titel} – kein Beipackzettel daneben` },
      kinder
    );
  }
  return el(
    'button',
    {
      type: 'button',
      klasse: 'streifen-bild',
      'data-datei': b.name,
      title: `${titel} – Beipackzettel ${b.zettel.name} zeigen`,
      onclick: () => zeigeZettel(b)
    },
    kinder
  );
}

/** Zeigt den Beipackzettel einer Ordnerdatei, gelesen aus der Datei daneben. */
function zeigeZettel(b) {
  const schau = $('#ordner-zettel');
  const gelesen = leseBeipackzettel(b.zettel.text);
  $('#zettel-datei').textContent = b.zettel.name;
  $('#zettel-stand').textContent = gelesen.ok
    ? `Zettelversion ${gelesen.version} · ${formatiereBytes(b.zettel.groesse)}`
    : formatiereBytes(b.zettel.groesse);
  const warnung = $('#zettel-warnung');
  const hinweise = [];
  if (!gelesen.ok) hinweise.push(gelesen.grund);
  if (gelesen.kuenftig) {
    hinweise.push(
      `Der Zettel trägt Version ${gelesen.version}, diese Seite kennt ${BEIPACKZETTEL_VERSION} – es können Felder fehlen.`
    );
  }
  if ((gelesen.fremd || []).length) {
    hinweise.push(`Zusätzliche Felder in der Datei: ${gelesen.fremd.join(', ')}.`);
  }
  warnung.textContent = hinweise.join(' ');
  warnung.hidden = hinweise.length === 0;
  $('#zettel-liste').replaceChildren(
    ...gelesen.zeilen.flatMap((zeile) => [
      el('dt', { text: zeile.bezeichnung }),
      el('dd', {
        klasse: zeile.leer ? 'zettel-leer' : null,
        text: zeile.leer ? '—' : zeile.wert
      })
    ])
  );
  $('#zettel-quelltext').textContent = b.zettel.text;
  const warOffen = Boolean(zettelOffen) && zettelOffen.name === b.name;
  zettelOffen = b;
  ruesteUebernahme(b, gelesen);
  schau.hidden = false;
  if (warOffen) return;
  schau.scrollIntoView({ block: 'nearest' });
  // Die Schau erscheint weit unter der Kachel - ohne Fokus fände die Tastatur
  // sie erst nach dem ganzen Streifen.
  schau.focus({ preventScroll: true });
}

/**
 * Der Knopf fuehrt in beide Richtungen: noch nicht uebernommen heisst
 * uebernehmen, schon uebernommen heisst hinsehen. Ohne lesbaren Zettel gibt
 * es nichts zu uebernehmen - dann steht er gar nicht da.
 */
function ruesteUebernahme(b, gelesen) {
  const knopf = $('#zettel-uebernehmen');
  const schon = uebernahmeZu(b);
  // Ohne Bild gibt es nichts zu uebernehmen - ein Zettel allein ist keine Aufnahme.
  knopf.hidden = !gelesen.ok || !b.bild;
  knopf.textContent = schon ? `Im Eingang zeigen (${schon.id})` : 'In den Eingang übernehmen';
  meldeZettel(
    schon
      ? `Diese Datei liegt als ${schon.id} im Eingang – übernommen am ${(schon.herkunft.uebernommen_am || '').slice(0, 10)}.`
      : '',
    'neutral'
  );
}

function meldeZettel(text, art = 'neutral') {
  const zeile = $('#zettel-meldung');
  zeile.textContent = text;
  zeile.className = 'zettel-meldung' + (text ? ' zettel-meldung--' + art : '');
  zeile.hidden = !text;
}

function verbergeZettel(fokusZurueck = false) {
  const schau = $('#ordner-zettel');
  if (schau) schau.hidden = true;
  const name = zettelOffen ? zettelOffen.name : '';
  zettelOffen = null;
  if (!fokusZurueck || !name) return;
  // Der Fokus gehört zurück an die Kachel, von der die Schau ausging.
  const kachel = document.querySelector(`#ordner-streifen [data-datei="${CSS.escape(name)}"]`);
  if (kachel && typeof kachel.focus === 'function') kachel.focus({ preventScroll: true });
}

/* ----------------------------------------------------------- Raster */

function zeichneKarte(eintrag) {
  const karte = el('article', {
    klasse: 'karte' + (eintrag.archiviert ? ' karte--archiviert' : ''),
    tabindex: '0',
    role: 'button',
    'data-id': eintrag.id,
    'aria-label': `${eintrag.titel} – Beleg ${eintrag.id} öffnen`,
    onclick: () => oeffneDetail(eintrag.id),
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        oeffneDetail(eintrag.id);
      }
    }
  });

  const masse = VOKABULAR.viewports.find((v) => v.id === eintrag.viewport);
  const seiten = `--seiten: ${masse.breite} / ${masse.hoehe}`;
  const bogen = el('div', { klasse: 'bogen' }, [
    el('div', { klasse: 'haelfte', style: seiten }, [
      svgKnoten(eintrag.id, 'vorher', 'aufnahme'),
      el('span', { klasse: 'haelfte-schild haelfte-schild--v', text: 'Vorher' })
    ]),
    el('div', { klasse: 'haelfte', style: seiten }, [
      svgKnoten(eintrag.id, 'nachher', 'aufnahme'),
      el('span', { klasse: 'haelfte-schild haelfte-schild--n', text: 'Nachher' })
    ])
  ]);

  const wirkung = mittlereWirkung(eintrag);
  karte.append(
    bogen,
    el('div', { klasse: 'karte-text' }, [
      el('div', { klasse: 'zeile-meta' }, [
        el('span', { klasse: 'kennung', text: eintrag.id }),
        statusMarke(eintrag)
      ]),
      el('h3', { text: eintrag.titel }),
      el('p', { klasse: 'karte-anlass', text: eintrag.begruendung.anlass }),
      el('div', { klasse: 'karte-fuss' }, [
        el('span', { klasse: 'pfad', text: `${eintrag.projekt} · ${eintrag.seite}` }),
        eintrag.archiviert
          ? el('span', { klasse: 'archivmarke', text: 'Archiv' })
          : el('span', { text: wirkung === null ? formatiereDatum(eintrag.datum) : formatiereWirkung(wirkung) })
      ])
    ])
  );
  return karte;
}

function zeichneRaster() {
  const raster = $('#raster');
  raster.replaceChildren(...sichtbar.map(zeichneKarte));
  $('#leermeldung').hidden = sichtbar.length > 0;
  $('#treffer').innerHTML = '';
  $('#treffer').append(
    el('b', { text: String(sichtbar.length) }),
    document.createTextNode(sichtbar.length === 1 ? ' Beleg' : ' Belege'),
    document.createTextNode(' · '),
    document.createTextNode(sichtbar.length * 2 + ' Aufnahmen')
  );
}

/* ---------------------------------------------------------- Navigation */

const ABSCHNITTE = {
  archiv: 'archiv-ansicht',
  aufnahme: 'aufnahme-ansicht',
  import: 'import-ansicht',
  ausschneiden: 'schnipsel-ansicht',
  markieren: 'markieren-ansicht',
  strecke: 'strecke-ansicht',
  design: 'design-ansicht',
  gliederung: 'gliederung-ansicht',
  pruefung: 'pruefung-ansicht',
  verzeichnis: 'verzeichnis-ansicht',
  output: 'output-ansicht',
  eingang: 'eingang-ansicht'
};

/** Schaltet zwischen Archiv, Aufnahme und Eingang um. */
function zeigeAnsicht() {
  for (const [ansicht, kennung] of Object.entries(ABSCHNITTE)) {
    document.getElementById(kennung).hidden = zustand.ansicht !== ansicht;
  }
  for (const knopf of document.querySelectorAll('.portal-nav button')) {
    knopf.setAttribute('aria-current', knopf.dataset.ansicht === zustand.ansicht ? 'page' : 'false');
  }
  // Die Kopfsuche gehoert zum Archiv; der Eingang hat seine eigene.
  $('#archiv-suchfeld').hidden = zustand.ansicht !== 'archiv';
  $('#kennzahlen').hidden = zustand.ansicht !== 'archiv';
  const zahl = document.getElementById('eingang-zahl');
  zahl.textContent = String(eingang.length);
  zahl.hidden = eingang.length === 0;
}

function zeichne() {
  sichtbar = sortiere(filtere(EINTRAEGE, zustand), zustand.sortierung);
  if (zustand.ansicht === 'archiv') {
    zeichneKennzahlen(sichtbar);
    zeichneFacetten();
    zeichneRaster();
    zeichneEigeneAufnahmen();
    const suchfeld = $('#suche');
    if (suchfeld.value !== zustand.suche) suchfeld.value = zustand.suche;
    $('#sortierung').value = zustand.sortierung;
  }
  if (zustand.ansicht === 'aufnahme') zeichneStudio();
  else if (document.body.classList.contains('kompakt')) setzeKompakt(false);
  if (zustand.ansicht === 'ausschneiden') zeichneSchnipsel();
  else beendeAusschneiden(true);
  if (zustand.ansicht === 'eingang') zeichneEingang();
  zeigeAnsicht();
}

/* ----------------------------------------------------------- Detail */

const dialog = $('#detail');

function balken(metrik) {
  const grenze = Math.max(Math.abs(metrik.vorher), Math.abs(metrik.nachher)) || 1;
  const wirkung = verbesserung(metrik);
  const art = wirkung === null || Math.abs(wirkung) < 0.5 ? 'neutral' : wirkung > 0 ? 'gut' : 'schlecht';
  const zeile = (wert, klasse) =>
    el('div', { klasse: 'balken-zeile' }, [
      el('div', {
        klasse: 'balken balken--' + klasse,
        style: `width: ${Math.max(3, (Math.abs(wert) / grenze) * 76)}%`
      }),
      el('span', { klasse: 'balken-wert', text: `${formatiereZahl(wert, 1)} ${metrik.einheit}` })
    ]);
  return el('div', { klasse: 'metrik' }, [
    el('div', { klasse: 'metrik-kopf' }, [
      el('span', { klasse: 'metrik-name', text: metrik.name }),
      el('span', { klasse: 'wirkung wirkung--' + art }, [
        el('span', { 'aria-hidden': 'true', text: art === 'gut' ? '▲' : art === 'schlecht' ? '▼' : '■' }),
        el('span', { text: formatiereWirkung(wirkung) })
      ])
    ]),
    el('div', { klasse: 'balkenpaar' }, [zeile(metrik.vorher, 'v'), zeile(metrik.nachher, 'n')])
  ]);
}

function buehne(eintrag) {
  if (modus === 'neben') {
    return el('div', { klasse: 'buehne buehne--neben' }, [
      el('div', {}, [svgKnoten(eintrag.id, 'vorher'), el('span', { klasse: 'aufnahme-schild aufnahme-schild--v', text: 'Vorher' })]),
      el('div', {}, [svgKnoten(eintrag.id, 'nachher'), el('span', { klasse: 'aufnahme-schild aufnahme-schild--n', text: 'Nachher' })])
    ]);
  }
  if (modus === 'wechsel') {
    const zeigeNachher = { wert: true };
    const halter = el('div', { klasse: 'buehne' });
    const schild = el('span', { klasse: 'aufnahme-schild aufnahme-schild--n', text: 'Nachher' });
    const male = () => {
      halter.replaceChildren(svgKnoten(eintrag.id, zeigeNachher.wert ? 'nachher' : 'vorher'), schild);
      schild.className = 'aufnahme-schild aufnahme-schild--' + (zeigeNachher.wert ? 'n' : 'v');
      schild.textContent = zeigeNachher.wert ? 'Nachher' : 'Vorher';
    };
    male();
    halter.addEventListener('click', () => {
      zeigeNachher.wert = !zeigeNachher.wert;
      male();
    });
    halter.style.cursor = 'pointer';
    halter.title = 'Klicken zum Umschalten';
    return halter;
  }
  const halter = el('div', { klasse: 'buehne' });
  const boden = svgKnoten(eintrag.id, 'vorher');
  const oben = svgKnoten(eintrag.id, 'nachher', 'lage lage--nachher');
  const griff = el('div', { klasse: 'griff', 'aria-hidden': 'true' });
  const regler = el('input', {
    type: 'range',
    klasse: 'regler',
    min: '0',
    max: '100',
    value: '50',
    'aria-label': 'Vergleichsregler zwischen Vorher und Nachher',
    oninput: (e) => halter.style.setProperty('--teiler', e.target.value + '%')
  });
  halter.style.setProperty('--teiler', '50%');
  halter.append(
    boden,
    el('span', { klasse: 'aufnahme-schild aufnahme-schild--v', text: 'Vorher' }),
    oben,
    el('span', { klasse: 'aufnahme-schild aufnahme-schild--n', text: 'Nachher' }),
    regler,
    griff
  );
  return halter;
}

function zeichneDetail(eintrag) {
  const index = sichtbar.findIndex((e) => e.id === eintrag.id);
  const kopf = $('#detail-kopf');
  kopf.replaceChildren(
    el('div', {}, [
      el('div', { klasse: 'detail-marken' }, [
        el('span', { klasse: 'kennung', text: eintrag.id }),
        statusMarke(eintrag),
        eintrag.archiviert ? el('span', { klasse: 'archivmarke', text: 'Archiviert' }) : null,
        el('span', { klasse: 'kennung', text: eintrag.kategorie })
      ]),
      el('h2', { id: 'detail-titel', text: eintrag.titel })
    ]),
    el('div', { klasse: 'detail-marken' }, [
      el('div', { klasse: 'blaettern' }, [
        el('button', {
          type: 'button',
          text: '← Vorheriger',
          disabled: index <= 0,
          onclick: () => oeffneDetail(sichtbar[index - 1].id)
        }),
        el('button', {
          type: 'button',
          text: 'Nächster →',
          disabled: index < 0 || index >= sichtbar.length - 1,
          onclick: () => oeffneDetail(sichtbar[index + 1].id)
        })
      ]),
      el('button', { klasse: 'schliessen', type: 'button', 'aria-label': 'Schließen', text: '×', onclick: schliesse })
    ])
  );

  const modi = [
    ['regler', 'Schieberegler'],
    ['neben', 'Nebeneinander'],
    ['wechsel', 'Umschalten']
  ];
  const buehneSpalte = $('#buehne-spalte');
  buehneSpalte.replaceChildren(
    el('div', { klasse: 'buehne-leiste' }, [
      el('div', { klasse: 'modus', role: 'group', 'aria-label': 'Vergleichsart' },
        modi.map(([wert, label]) =>
          el('button', {
            type: 'button',
            text: label,
            'data-modus': wert,
            'aria-pressed': String(modus === wert),
            onclick: () => {
              merkeModus(wert);
              zeichneDetail(eintrag);
            }
          })
        )
      ),
      el('span', { klasse: 'quelle', text: `${VIEWPORT_LABEL[eintrag.viewport]} · ${eintrag.browser}` })
    ]),
    buehne(eintrag),
    el('div', { klasse: 'buehne-fuss' }, [
      el('span', { text: `Vorher aufgenommen ${formatiereDatum(eintrag.screen.vorher.aufgenommen)}` }),
      el('span', { text: `Nachher aufgenommen ${formatiereDatum(eintrag.screen.nachher.aufgenommen)}` })
    ])
  );

  const blatt = $('#blatt-spalte');
  const bloecke = [];

  if (eintrag.archiviert) {
    bloecke.push(
      el('div', { klasse: 'hinweis-archiv' }, [
        el('strong', { text: `Archiviert am ${formatiereDatum(eintrag.archiviert_am)}. ` }),
        document.createTextNode(eintrag.archiv_grund || '')
      ])
    );
  }

  const b = eintrag.begruendung;
  bloecke.push(
    el('section', {}, [
      el('h3', { klasse: 'abschnitt-titel', text: 'Begründung' }),
      el('dl', { klasse: 'begruendung' }, [
        el('div', {}, [el('dt', { text: 'Anlass' }), el('dd', { text: b.anlass })]),
        el('div', {}, [el('dt', { text: 'Änderung' }), el('dd', { text: b.aenderung })]),
        el('div', {}, [el('dt', { text: 'Wirkung' }), el('dd', { text: b.wirkung })]),
        el('div', {}, [el('dt', { text: 'Quelle' }), el('dd', { klasse: 'quelle', text: b.quelle })])
      ])
    ])
  );

  if (eintrag.metriken.length) {
    bloecke.push(
      el('section', {}, [
        el('h3', { klasse: 'abschnitt-titel', text: 'Gemessene Kennzahlen' }),
        el('div', { klasse: 'legende' }, [
          el('span', {}, [el('i', { klasse: 'punkt punkt--v' }), document.createTextNode('Vorher')]),
          el('span', {}, [el('i', { klasse: 'punkt punkt--n' }), document.createTextNode('Nachher')])
        ]),
        ...eintrag.metriken.map(balken)
      ])
    );
  }

  bloecke.push(
    el('section', {}, [
      el('h3', { klasse: 'abschnitt-titel', text: 'Eckdaten' }),
      el('dl', { klasse: 'eckdaten' }, [
        el('dt', { text: 'Projekt' }), el('dd', { text: eintrag.projekt }),
        el('dt', { text: 'Seite' }), el('dd', { text: eintrag.seite }),
        el('dt', { text: 'Kategorie' }), el('dd', { text: eintrag.kategorie }),
        el('dt', { text: 'Format' }), el('dd', { text: VIEWPORT_LABEL[eintrag.viewport] }),
        el('dt', { text: 'Browser' }), el('dd', { text: eintrag.browser }),
        el('dt', { text: 'Erfasst von' }), el('dd', { text: eintrag.autor }),
        el('dt', { text: 'Belegdatum' }), el('dd', { text: formatiereDatum(eintrag.datum) })
      ]),
      el('div', { klasse: 'marken', style: 'margin-top:12px' }, eintrag.tags.map((t) => el('span', { text: '#' + t })))
    ])
  );

  blatt.replaceChildren(...bloecke);
  $('#detail-koerper').scrollTop = 0;
}

function oeffneDetail(id, mitHash = true) {
  const eintrag = EINTRAEGE.find((e) => e.id === id);
  if (!eintrag) return;
  zeichneDetail(eintrag);
  if (!dialog.open) dialog.showModal();
  if (mitHash) setze({ auswahl: id }, false);
}

function schliesse() {
  if (dialog.open) dialog.close();
}

dialog.addEventListener('close', () => {
  const zuletzt = zustand.auswahl;
  if (zuletzt) setze({ auswahl: null }, false);
  const karte = zuletzt && document.querySelector(`.karte[data-id="${CSS.escape(zuletzt)}"]`);
  if (karte) karte.focus();
});

dialog.addEventListener('keydown', (e) => {
  if (e.target && e.target.classList.contains('regler')) return;
  const index = sichtbar.findIndex((x) => x.id === zustand.auswahl);
  if (e.key === 'ArrowLeft' && index > 0) {
    e.preventDefault();
    oeffneDetail(sichtbar[index - 1].id);
  }
  if (e.key === 'ArrowRight' && index >= 0 && index < sichtbar.length - 1) {
    e.preventDefault();
    oeffneDetail(sichtbar[index + 1].id);
  }
});

/* ------------------------------------------------------- Verdrahtung */

let tippTakt;
$('#suche').addEventListener('input', (e) => {
  const wert = e.target.value;
  clearTimeout(tippTakt);
  tippTakt = setTimeout(() => setze({ suche: wert }), 120);
});

$('#sortierung').addEventListener('change', (e) => setze({ sortierung: e.target.value }));

for (const knopf of document.querySelectorAll('.portal-nav button')) {
  knopf.addEventListener('click', () => setze({ ansicht: knopf.dataset.ansicht }));
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    $('#suche').focus();
    $('#suche').select();
  }
});

$('#sortierung').replaceChildren(
  ...SORTIERUNGEN.map((s) => el('option', { value: s.id, text: s.label }))
);

/* Auf schmalen Schirmen bleibt die Filterleiste zugeklappt, damit die Belege
   ohne langes Wischen erreichbar sind; ab 901 px steht sie dauerhaft offen. */
const schub = $('#filterschub');
const breit = window.matchMedia('(min-width: 901px)');
const richteSchub = () => {
  schub.open = breit.matches;
};
breit.addEventListener('change', richteSchub);

/* ------------------------------------------------------------- Die Lupe */

/**
 * Ein Bild groß, mit allem, was dazugehört: Text, Rezept, Labels und die
 * Stelle im Handbuch samt ihrem Weg von oben. Gezeigt wird die jüngste
 * Fassung in voller Auflösung - die Vorschau genügt zum Prüfen nicht.
 */
async function zeigeLupe(kennung) {
  const aufnahme = (typeof eingang !== 'undefined' ? eingang : []).find((a) => a.id === kennung);
  if (!aufnahme) return;
  const fenster = $('#lupe-dialog');
  $('#lupe-titel').textContent = aufnahme.titel || aufnahme.id;

  const bild = el('img', { src: anzeigeBild(aufnahme), alt: aufnahme.titel || aufnahme.id });
  $('#lupe-bild').replaceChildren(bild, el('p', { klasse: 'kennung', id: 'lupe-stand', text: 'Vorschau – das volle Bild wird geholt …' }));
  zeichneLupeAngaben(aufnahme);
  if (!fenster.open) fenster.showModal();

  // Das volle Bild kommt aus der Browserdatenbank; bis dahin steht die
  // Vorschau da, damit das Fenster nicht leer aufgeht.
  try {
    const fassung = (neuesteFassung(aufnahme) || {}).nummer;
    const voll = await bestesBild(aufnahme, fassung);
    if (voll && fenster.open) {
      bild.src = voll;
      const stand = document.getElementById('lupe-stand');
      if (stand) {
        stand.textContent = `${aufnahme.id}${fassung ? ` · Fassung ${fassung}` : ''}${
          aufnahme.breite ? ` · ${aufnahme.breite} × ${aufnahme.hoehe} px` : ''
        }`;
      }
    }
  } catch (fehler) {
    const stand = document.getElementById('lupe-stand');
    if (stand) stand.textContent = 'Das volle Bild liegt nicht vor – gezeigt wird die Vorschau.';
  }
}

/** Die Spalte neben dem Bild: Text, Rezept, Labels, Kapitel. */
function zeichneLupeAngaben(aufnahme) {
  const rezept = bildRezept(aufnahme, strecken, GLIEDERUNG);
  const labels = labelListe(aufnahme);
  const abschnitt = (titel, kinder) =>
    kinder && kinder.length
      ? el('section', { klasse: 'lupe-abschnitt' }, [el('h3', { text: titel }), ...kinder])
      : null;

  $('#lupe-angaben').replaceChildren(
    ...[
      abschnitt('Text', [
        el('p', { klasse: 'lupe-titel', text: aufnahme.titel || 'ohne Titel' }),
        aufnahme.notiz ? el('p', { text: aufnahme.notiz }) : null,
        aufnahme.seite ? el('p', { klasse: 'kennung', text: aufnahme.seite }) : null,
        (aufnahme.begriffe || []).length
          ? el('p', { klasse: 'kennung', text: (aufnahme.begriffe || []).join(', ') })
          : null,
        el('p', {
          klasse: 'kennung',
          text: [aufnahme.projekt, aufnahme.version, aufnahme.land].filter(Boolean).join(' · ') || 'ohne Projekt'
        })
      ].filter(Boolean)),
      abschnitt(
        'Kapitel',
        rezept.pfad.length
          ? [
              el('ol', { klasse: 'lupe-pfad' }, rezept.pfad.map((teil) => el('li', { text: teil }))),
              el('button', {
                klasse: 'knopf knopf--klein',
                type: 'button',
                text: 'In der Gliederung zeigen',
                onclick: () => {
                  $('#lupe-dialog').close();
                  setze({ ansicht: 'gliederung' });
                }
              })
            ]
          : [el('p', { klasse: 'feld-hinweis', text: 'Noch keiner Stelle zugeordnet.' })]
      ),
      abschnitt(
        'Labels',
        labels.length
          ? [
              el(
                'ul',
                { klasse: 'lupe-labels' },
                labels.map((l) =>
                  el('li', {}, [symbol(symbolZuLabel(l.feld, l.wert) || l.symbol), el('span', { text: `${l.bezeichnung}: ${l.wert}` })])
                )
              )
            ]
          : [el('p', { klasse: 'feld-hinweis', text: 'Noch kein Label gesetzt.' })]
      ),
      abschnitt('Rezept', [
        ...(rezept.zeilen.length
          ? [
              el(
                'dl',
                { klasse: 'lupe-rezept' },
                rezept.zeilen.flatMap((z) => [el('dt', { text: z.schild }), el('dd', { text: z.wert })])
              )
            ]
          : [el('p', { klasse: 'feld-hinweis', text: 'Keine Angaben zur Entstehung.' })]),
        ...(rezept.schritte.length
          ? [
              el('h4', { text: 'In Strecken' }),
              el(
                'ul',
                { klasse: 'lupe-schritte' },
                rezept.schritte.map((s) =>
                  el('li', { text: `${s.strecke} · Schritt ${s.nummer}${s.text ? ': ' + s.text : ''}` })
                )
              )
            ]
          : [])
      ]),
      el('div', { klasse: 'lupe-aktionen' }, [
        el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          text: 'Im Editor öffnen',
          onclick: () => {
            $('#lupe-dialog').close();
            oeffneEditor(aufnahme.id);
          }
        }),
        el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          text: 'Im Eingang bearbeiten',
          onclick: () => {
            $('#lupe-dialog').close();
            setze({ ansicht: 'eingang' });
            oeffneEingangDialog(aufnahme.id);
          }
        })
      ])
    ].filter(Boolean)
  );
}

/** Der Knopf, der die Lupe öffnet - überall gleich. */
function lupenKnopf(kennung) {
  return el('button', {
    klasse: 'lupe-knopf',
    type: 'button',
    title: 'Groß ansehen – mit Text, Rezept, Labels und Kapitel',
    'aria-label': 'Groß ansehen',
    onclick: (e) => {
      e.stopPropagation();
      zeigeLupe(kennung);
    }
  }, symbol('lupe'));
}

$('#lupe-schliessen').addEventListener('click', () => $('#lupe-dialog').close());

/** Startet die Seite. Wird am Ende der letzten Datei aufgerufen, damit dort
  angelegte Zustaende bereits stehen. */
function starte() {
richteSchub();
zeichne();
// Auch beim Aufruf mit #ans=markieren oder #ans=strecke muss die Ansicht
// gefüllt sein.
if (zustand.ansicht === 'markieren') zeichneMarkieren();
if (zustand.ansicht === 'strecke') zeichneStrecke();
if (zustand.ansicht === 'gliederung') zeichneGliederung();
if (zustand.ansicht === 'design') zeichneDesign();
if (zustand.ansicht === 'import') zeichneImport();
if (zustand.ansicht === 'pruefung') zeichnePruefung();
if (zustand.ansicht === 'verzeichnis') zeichneVerzeichnis();
if (zustand.ansicht === 'output') zeichneOutput();
if (zustand.auswahl) oeffneDetail(zustand.auswahl, false);
document.documentElement.dataset.bereit = 'ja';
}
