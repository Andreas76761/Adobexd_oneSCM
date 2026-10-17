/* =========================================================================
   Markieren – unkenntlich machen und erklären.

   Zwei Dinge an einem Bild, die nichts miteinander zu tun haben und doch
   dasselbe Werkzeug brauchen: Stellen abdecken, die niemanden angehen
   (Benutzerkennung, FIN, Adresse, Name), und Stellen hervorheben, die jemand
   finden soll – mit Rahmen, Text und Nummer für eine Klickstrecke.

   Das Original wird nie überschrieben. Die Marken liegen als Angaben neben
   der Aufnahme; die bearbeitete Fassung entsteht daraus als Kopie und kann
   jederzeit neu gerechnet oder verworfen werden.
   ========================================================================= */

let markierKennung = ''; // Aufnahme, die gerade bearbeitet wird
let marken = [];
let markierWerkzeug = 'unkenntlich';
let markierStufe = 'mittel';
let gewaehlteMarke = '';
let markierBild = null; // HTMLImageElement der Originalaufnahme
let markierUnterschrift = true; // Nummer und Zeitstempel ins Bild brennen
let markierKapitel = { kapitel: '', unterkapitel: '' };
let markierVerlauf = []; // Stände vor jeder Änderung – für Rückgängig
let markierZurueck = []; // zurückgenommene Stände – für Wiederholen
let markierZug = null; // laufendes Aufziehen
let markierGesichert = true;

const markierAufnahme = () => eingang.find((a) => a.id === markierKennung) || null;

/** Farben kommen aus den Token der Seite, nicht aus festen Werten. */
function token(name, ersatz) {
  const wert = getComputedStyle(document.documentElement).getPropertyValue(name);
  return String(wert || '').trim() || ersatz;
}

/* ------------------------------------------------------------- Zeichnen */

/**
 * Macht eine Stelle unkenntlich: der Bereich wird auf ein grobes Raster
 * heruntergerechnet und wieder vergrößert. Was dabei verloren geht, ist
 * wirklich weg - anders als bei einem Weichzeichner, der nur verschmiert.
 */
function machUnkenntlich(stift, bild, marke) {
  const raster = rasterZuStufe(marke.stufe);
  const kleinB = Math.max(1, Math.round(marke.breite / raster));
  const kleinH = Math.max(1, Math.round(marke.hoehe / raster));
  const zwischen = document.createElement('canvas');
  zwischen.width = kleinB;
  zwischen.height = kleinH;
  const kleinerStift = zwischen.getContext('2d');
  kleinerStift.imageSmoothingEnabled = true;
  kleinerStift.drawImage(bild, marke.x, marke.y, marke.breite, marke.hoehe, 0, 0, kleinB, kleinH);
  stift.save();
  stift.imageSmoothingEnabled = false;
  stift.drawImage(zwischen, 0, 0, kleinB, kleinH, marke.x, marke.y, marke.breite, marke.hoehe);
  stift.restore();
}

/** Rahmen und Beschriftung; die Schrift bleibt auch auf hellem Grund lesbar. */
function zeichneRahmen(stift, marke, massstab, bildbreite) {
  const stark = Math.max(2, Math.round(3 / massstab));
  stift.save();
  stift.lineWidth = stark;
  stift.strokeStyle = token('--akzent', '#B4432B');
  stift.strokeRect(marke.x + stark / 2, marke.y + stark / 2, marke.breite - stark, marke.hoehe - stark);
  const text = String(marke.text || '').trim();
  const nummer = marke.art === 'schritt' ? String(marke.nummer || '') : '';
  if (nummer) zeichneNummer(stift, marke, massstab, nummer);
  if (text) zeichneBeschriftung(stift, marke, massstab, text, Boolean(nummer), bildbreite);
  stift.restore();
}

function zeichneNummer(stift, marke, massstab, nummer) {
  const halbmesser = Math.max(11, Math.round(15 / massstab));
  const x = marke.x + halbmesser;
  const y = marke.y + halbmesser;
  stift.beginPath();
  stift.arc(x, y, halbmesser, 0, Math.PI * 2);
  stift.fillStyle = token('--akzent', '#B4432B');
  stift.fill();
  stift.fillStyle = token('--auf-farbe', '#FFFFFF');
  stift.font = `600 ${Math.round(halbmesser * 1.25)}px ${token('--schrift-display', 'sans-serif')}`;
  stift.textAlign = 'center';
  stift.textBaseline = 'middle';
  stift.fillText(nummer, x, y + 1);
}

function zeichneBeschriftung(stift, marke, massstab, text, nebenNummer, bildbreite) {
  const hoehe = Math.max(16, Math.round(22 / massstab));
  const schrift = Math.round(hoehe * 0.62);
  stift.font = `500 ${schrift}px ${token('--schrift-text', 'sans-serif')}`;
  const x = marke.x + (nebenNummer ? Math.round(hoehe * 1.6) : 0);
  // So breit, wie der Text braucht - abgeschnitten wird erst am Bildrand.
  const breite = Math.min(stift.measureText(text).width + hoehe * 0.7, Math.max(40, (bildbreite || 0) - x));
  // Über dem Rahmen, wenn dort Platz ist - sonst darunter.
  const obenMoeglich = marke.y - hoehe - 4 >= 0;
  const y = obenMoeglich ? marke.y - hoehe - 4 : marke.y + marke.hoehe + 4;
  stift.fillStyle = token('--akzent', '#B4432B');
  stift.fillRect(x, y, breite, hoehe);
  stift.fillStyle = token('--auf-farbe', '#FFFFFF');
  stift.textAlign = 'left';
  stift.textBaseline = 'middle';
  stift.save();
  stift.beginPath();
  stift.rect(x, y, breite, hoehe);
  stift.clip();
  stift.fillText(text, x + hoehe * 0.35, y + hoehe / 2);
  stift.restore();
}

/**
 * Die Bildunterschrift: Gliederungsnummer, Titel, Zeitstempel. Sie wird unten
 * angesetzt, nicht über das Bild gelegt - verdeckt wäre sie unbrauchbar, und
 * verdecken soll hier nur, was unkenntlich gemacht wurde.
 */
function zeichneUnterschrift(stift, breite, oben, hoehe, text) {
  stift.save();
  stift.fillStyle = token('--tinte', '#141A24');
  stift.fillRect(0, oben, breite, hoehe);
  stift.fillStyle = token('--grund', '#EDEFF3');
  stift.font = `500 ${Math.round(hoehe * 0.42)}px ${token('--schrift-mono', 'monospace')}`;
  stift.textAlign = 'left';
  stift.textBaseline = 'middle';
  stift.beginPath();
  stift.rect(0, oben, breite, hoehe);
  stift.clip();
  stift.fillText(text, Math.round(hoehe * 0.5), oben + hoehe / 2);
  stift.restore();
}

/** Die Höhe des Streifens unter dem Bild; ohne Unterschrift ist sie null. */
function unterschriftHoehe() {
  if (!markierUnterschrift || !markierBild) return 0;
  return Math.max(26, Math.round(markierBild.naturalHeight * 0.045));
}

/** Zeichnet Bild, Marken und Unterschrift in eine Leinwand in Originalgröße. */
function baueMarkierteLeinwand(mitAuswahl = false) {
  if (!markierBild) return null;
  const streifen = unterschriftHoehe();
  const leinwand = document.createElement('canvas');
  leinwand.width = markierBild.naturalWidth;
  leinwand.height = markierBild.naturalHeight + streifen;
  const stift = leinwand.getContext('2d');
  stift.drawImage(markierBild, 0, 0);
  const massstab = 1;
  for (const marke of marken) {
    if (marke.art === 'unkenntlich') machUnkenntlich(stift, markierBild, marke);
    else zeichneRahmen(stift, marke, massstab, leinwand.width);
  }
  if (streifen) {
    zeichneUnterschrift(stift, leinwand.width, markierBild.naturalHeight, streifen, markierUnterschriftText());
  }
  if (mitAuswahl) zeichneAuswahl(stift);
  return leinwand;
}

/** Der Text des Streifens - aus der Aufnahme und den Feldern im Kopf. */
function markierUnterschriftText() {
  const aufnahme = markierAufnahme();
  if (!aufnahme) return '';
  return bildunterschrift(
    { ...aufnahme, kapitel: markierKapitel.kapitel, unterkapitel: markierKapitel.unterkapitel },
    aufnahme.erfasst_am
  );
}

/** Die gewählte Marke bekommt eine gestrichelte Hülle - nur auf dem Schirm. */
function zeichneAuswahl(stift) {
  const marke = marken.find((m) => m.id === gewaehlteMarke);
  if (!marke) return;
  stift.save();
  stift.setLineDash([8, 6]);
  stift.lineWidth = 2;
  stift.strokeStyle = token('--tinte', '#141A24');
  stift.strokeRect(marke.x - 2, marke.y - 2, marke.breite + 4, marke.hoehe + 4);
  stift.restore();
}

/** Malt die Arbeitsfläche neu: Bild, Marken, Auswahl und das laufende Ziehen. */
function zeichneMarkierflaeche() {
  const leinwand = $('#markier-leinwand');
  const leer = $('#markier-leer');
  if (!markierBild) {
    leinwand.hidden = true;
    leer.hidden = false;
    return;
  }
  leinwand.hidden = false;
  leer.hidden = true;
  const gebaut = baueMarkierteLeinwand(true);
  leinwand.width = gebaut.width;
  leinwand.height = gebaut.height;
  const stift = leinwand.getContext('2d');
  stift.drawImage(gebaut, 0, 0);
  if (markierZug) {
    stift.save();
    stift.setLineDash([6, 5]);
    stift.lineWidth = 2;
    stift.strokeStyle = token('--akzent', '#B4432B');
    stift.strokeRect(markierZug.x, markierZug.y, markierZug.breite, markierZug.hoehe);
    stift.restore();
  }
}

/* ------------------------------------------------------------- Bedienung */

/** Bildpunkte aus einem Mausereignis - die Leinwand ist meist skaliert. */
function punktAusEreignis(e) {
  const leinwand = $('#markier-leinwand');
  const masse = leinwand.getBoundingClientRect();
  return {
    x: Math.round(((e.clientX - masse.left) / masse.width) * leinwand.width),
    y: Math.round(((e.clientY - masse.top) / masse.height) * leinwand.height)
  };
}

function beginneZug(e) {
  if (!markierBild || e.button !== 0) return;
  const punkt = punktAusEreignis(e);
  const getroffen = [...marken].reverse().find(
    (m) => punkt.x >= m.x && punkt.x <= m.x + m.breite && punkt.y >= m.y && punkt.y <= m.y + m.hoehe
  );
  if (getroffen) {
    waehleMarke(getroffen.id);
    return;
  }
  markierZug = { start: punkt, x: punkt.x, y: punkt.y, breite: 0, hoehe: 0 };
  $('#markier-buehne').setPointerCapture?.(e.pointerId);
}

function fuehreZug(e) {
  if (!markierZug) return;
  const punkt = punktAusEreignis(e);
  markierZug = {
    start: markierZug.start,
    x: Math.min(markierZug.start.x, punkt.x),
    y: Math.min(markierZug.start.y, punkt.y),
    breite: Math.abs(punkt.x - markierZug.start.x),
    hoehe: Math.abs(punkt.y - markierZug.start.y)
  };
  zeichneMarkierflaeche();
}

function beendeZug() {
  if (!markierZug) return;
  const roh = markierZug;
  markierZug = null;
  if (roh.breite < MINDEST_MARKE || roh.hoehe < MINDEST_MARKE) {
    zeichneMarkierflaeche();
    return;
  }
  const quelle = { breite: markierBild.naturalWidth, hoehe: markierBild.naturalHeight };
  const marke = leereMarke(markierWerkzeug, begrenzeMarke(roh, quelle), marken);
  if (marke.art === 'unkenntlich') marke.stufe = markierStufe;
  merkeStand();
  marken = [...marken, marke];
  gewaehlteMarke = marke.id;
  markierGesichert = false;
  zeichneMarkieren();
  if (marke.art !== 'unkenntlich') {
    const feld = document.getElementById('marke-text-' + marke.id);
    if (feld) feld.focus({ preventScroll: true });
  }
}

/** Hält den Stand vor einer Änderung fest; mehr als 40 braucht niemand. */
function merkeStand() {
  markierVerlauf = [...markierVerlauf.slice(-39), marken.map((m) => ({ ...m }))];
  markierZurueck = [];
}

/** Nimmt die letzte Änderung zurück – auch das Abdecken einer Stelle. */
function machRueckgaengig() {
  if (!markierVerlauf.length) {
    meldeMarkieren('Nichts rückgängig zu machen.', 'neutral');
    return;
  }
  markierZurueck = [...markierZurueck, marken.map((m) => ({ ...m }))];
  marken = markierVerlauf[markierVerlauf.length - 1];
  markierVerlauf = markierVerlauf.slice(0, -1);
  gewaehlteMarke = '';
  markierGesichert = false;
  meldeMarkieren(`Rückgängig – ${marken.length} Marken. Strg+Umschalt+Z stellt wieder her.`, 'neutral');
  zeichneMarkieren();
}

function machWiederher() {
  if (!markierZurueck.length) {
    meldeMarkieren('Nichts wiederherzustellen.', 'neutral');
    return;
  }
  markierVerlauf = [...markierVerlauf, marken.map((m) => ({ ...m }))];
  marken = markierZurueck[markierZurueck.length - 1];
  markierZurueck = markierZurueck.slice(0, -1);
  markierGesichert = false;
  meldeMarkieren(`Wiederhergestellt – ${marken.length} Marken.`, 'neutral');
  zeichneMarkieren();
}

function waehleMarke(id) {
  gewaehlteMarke = id;
  zeichneMarkieren();
}

function entferneMarke(id) {
  merkeStand();
  marken = nummeriereSchritte(marken.filter((m) => m.id !== id));
  if (gewaehlteMarke === id) gewaehlteMarke = '';
  markierGesichert = false;
  zeichneMarkieren();
}

/* ------------------------------------------------------------- Ansicht */

function zeichneMarkieren() {
  if (document.getElementById('markieren-ansicht').hidden) return;
  fuelleMarkierWahl();
  zeichneMarkierflaeche();
  zeichneMarkenliste();
  zeichneFassungen();
  zeichneKlickstrecke();
  const zusammen = markenZusammenfassung(marken);
  $('#markier-stand').textContent = marken.length
    ? `${zusammen.unkenntlich} unkenntlich · ${zusammen.rahmen} Rahmen · ${zusammen.schritte} Schritte`
    : 'noch keine Marke';
  $('#markier-sichern').disabled = !markierBild || markierGesichert;
  $('#markier-rueckgaengig').disabled = !markierVerlauf.length;
  $('#markier-wiederher').disabled = !markierZurueck.length;
  $('#markier-datei').disabled = !markierBild || !marken.length;
  $('#markier-zuruecksetzen').disabled = !marken.length;
  $('#markier-stufe-feld').hidden = markierWerkzeug !== 'unkenntlich';
}

function fuelleMarkierWahl() {
  const wahl = $('#markier-wahl');
  const vorher = wahl.value;
  wahl.replaceChildren(
    el('option', { value: '', text: eingang.length ? 'Aufnahme wählen' : 'keine Aufnahme im Eingang' }),
    ...eingang.map((a) =>
      el('option', {
        value: a.id,
        text: `${a.id} · ${a.titel}${(a.marken || []).length ? ' · markiert' : ''}`,
        selected: a.id === markierKennung
      })
    )
  );
  if (vorher !== wahl.value && markierKennung) wahl.value = markierKennung;
}

function zeichneMarkenliste() {
  const liste = $('#markier-liste');
  if (!marken.length) {
    liste.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: markierBild
          ? 'Rechteck über der Stelle aufziehen, die abgedeckt oder hervorgehoben werden soll.'
          : 'Zuerst eine Aufnahme wählen.'
      })
    );
    return;
  }
  liste.replaceChildren(
    ...marken.map((marke) => {
      const art = MARKEN_ARTEN.find((a) => a.id === marke.art) || MARKEN_ARTEN[0];
      const kinder = [
        el('div', { klasse: 'marke-kopf' }, [
          el('span', { klasse: 'marke-art', text: marke.art === 'schritt' ? `${marke.nummer}. Schritt` : art.label }),
          el('span', { klasse: 'kennung', text: `${marke.breite} × ${marke.hoehe} px` }),
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            id: 'marke-weg-' + marke.id,
            text: 'Entfernen',
            onclick: (e) => {
              e.stopPropagation();
              entferneMarke(marke.id);
            }
          })
        ])
      ];
      if (marke.art === 'unkenntlich') {
        kinder.push(
          el('div', { klasse: 'feld' }, [
            el('label', { for: 'marke-stufe-' + marke.id, text: 'Raster' }),
            el(
              'select',
              {
                id: 'marke-stufe-' + marke.id,
                onchange: (e) => {
                  marke.stufe = e.target.value;
                  markierGesichert = false;
                  zeichneMarkieren();
                }
              },
              UNKENNTLICH_STUFEN.map((s) =>
                el('option', { value: s.id, text: s.label, selected: s.id === (marke.stufe || 'mittel') })
              )
            )
          ])
        );
      } else {
        kinder.push(
          el('div', { klasse: 'feld' }, [
            el('label', { for: 'marke-text-' + marke.id, text: marke.art === 'schritt' ? 'Was hier zu tun ist' : 'Beschriftung' }),
            el('input', {
              type: 'text',
              id: 'marke-text-' + marke.id,
              value: marke.text || '',
              placeholder: marke.art === 'schritt' ? 'Auf „Bestellung anlegen“ klicken' : 'optional',
              oninput: (e) => {
                marke.text = e.target.value;
                markierGesichert = false;
                zeichneMarkierflaeche();
                zeichneKlickstrecke();
                $('#markier-sichern').disabled = false;
              }
            })
          ])
        );
      }
      return el(
        'div',
        {
          klasse: 'marke-zeile' + (marke.id === gewaehlteMarke ? ' marke-zeile--gewaehlt' : ''),
          'data-marke': marke.id,
          onclick: () => waehleMarke(marke.id)
        },
        kinder
      );
    })
  );
}

/**
 * Die Fassungen einer Aufnahme: das Original zuerst, dann jede Stufe. Jede
 * laesst sich oeffnen - die Marken kommen mit - oder verwerfen.
 */
function zeichneFassungen() {
  const kasten = $('#markier-fassungen');
  const aufnahme = markierAufnahme();
  if (!aufnahme) {
    kasten.replaceChildren(el('p', { klasse: 'feld-hinweis', text: 'Keine Aufnahme gewählt.' }));
    return;
  }
  const fassungen = leseFassungen(aufnahme);
  const zeilen = [
    el('div', { klasse: 'fassung-zeile' }, [
      el('span', { klasse: 'marke-art', text: 'Original' }),
      el('span', { klasse: 'kennung', text: formatiereZeitpunkt(aufnahme.erfasst_am) }),
      el('button', {
        klasse: 'knopf knopf--klein',
        type: 'button',
        id: 'fassung-original',
        text: 'Marken leeren',
        onclick: () => entferneAlleMarken()
      })
    ]),
    ...fassungen.map((fassung) =>
      el('div', { klasse: 'fassung-zeile' }, [
        el('span', { klasse: 'marke-art', text: `Fassung ${fassung.nummer}` }),
        el('span', {
          klasse: 'kennung',
          text: `${formatiereZeitpunkt(fassung.erstellt_am)} · ${markenZusammenfassung(fassung.marken).gesamt} Marken`
        }),
        el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          id: 'fassung-laden-' + fassung.nummer,
          text: 'Öffnen',
          onclick: () => ladeFassung(fassung.nummer)
        }),
        el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          id: 'fassung-weg-' + fassung.nummer,
          text: 'Verwerfen',
          onclick: () => verwirfFassung(fassung.nummer)
        })
      ])
    ),
    // replaceChildren macht aus einem null die Zeichenfolge "null" - anders
    // als el(), das leere Kinder weglaesst. Darum wird hier gefiltert.
    fassungen.length
      ? null
      : el('p', { klasse: 'feld-hinweis', text: 'Noch keine Fassung – das Original steht für sich.' })
  ].filter(Boolean);
  kasten.replaceChildren(...zeilen);
}

/** Holt die Marken einer Fassung zurück auf die Arbeitsfläche. */
function ladeFassung(nummer) {
  const aufnahme = markierAufnahme();
  const fassung = leseFassungen(aufnahme).find((f) => f.nummer === nummer);
  if (!fassung) return;
  marken = fassung.marken.map((m) => ({ ...m }));
  gewaehlteMarke = '';
  markierGesichert = true;
  meldeMarkieren(`Fassung ${nummer} geöffnet – ${marken.length} Marken. Das Original liegt darunter.`, 'neutral');
  zeichneMarkieren();
}

function verwirfFassung(nummer) {
  const aufnahme = markierAufnahme();
  if (!aufnahme) return;
  const bleibt = leseFassungen(aufnahme).filter((f) => f.nummer !== nummer);
  speichereAufnahme({ ...aufnahme, fassungen: bleibt, bild_markiert: undefined, markiert_am: undefined });
  meldeMarkieren(`Fassung ${nummer} verworfen. Das Original bleibt.`, 'neutral');
  zeichneMarkieren();
  zeichneEingang();
}

/** Schreibt eine geänderte Aufnahme in den Eingang zurück. */
function speichereAufnahme(gepflegt) {
  const vorher = eingang;
  eingang = eingang.map((a) => (a.id === gepflegt.id ? gepflegt : a));
  const ergebnis = sichereEingang();
  if (!ergebnis.ok && ergebnis.voll) {
    eingang = vorher;
    meldeMarkieren(ergebnis.text, 'warnung');
    return false;
  }
  return true;
}

function zeichneKlickstrecke() {
  const kasten = $('#klickstrecke');
  const text = klickstreckeAlsText(marken);
  kasten.hidden = !text;
  $('#klickstrecke-text').textContent = text;
}

function meldeMarkieren(text, art = 'neutral') {
  const zeile = $('#markier-meldung');
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------- Laden */

/** Lädt eine Aufnahme zum Bearbeiten - immer das Original, nie die Kopie. */
async function waehleMarkierAufnahme(kennung) {
  markierKennung = kennung;
  gewaehlteMarke = '';
  markierZug = null;
  const aufnahme = markierAufnahme();
  if (!aufnahme) {
    markierBild = null;
    marken = [];
    markierGesichert = true;
    zeichneMarkieren();
    return;
  }
  marken = leseMarken(aufnahme.marken);
  markierGesichert = true;
  // Ohne eigene Nummer bekommt die Aufnahme die naechste freie im Kapitel 1 -
  // vorgeschlagen, nicht gesetzt: geaendert wird sie im Kopf.
  const kapitel = Number(aufnahme.kapitel) || 1;
  markierKapitel = {
    kapitel: String(kapitel),
    unterkapitel: String(
      Number(aufnahme.unterkapitel) ||
        naechsteUnterkapitelnummer(eingang.filter((a) => a.id !== aufnahme.id), kapitel)
    )
  };
  $('#markier-kapitel').value = markierKapitel.kapitel;
  $('#markier-unterkapitel').value = markierKapitel.unterkapitel;
  try {
    // Immer das Original in voller Auflösung - gearbeitet wird am Besten,
    // was da ist, nicht an der Vorschau.
    const quellbild = await bestesBild(aufnahme);
    const geladen = await ladeBild(quellbild, 'eingang', aufnahme.titel);
    markierBild = geladen.element;
    markierVerlauf = [];
    markierZurueck = [];
    meldeMarkieren(
      `${aufnahme.id} geladen – ${geladen.breite} × ${geladen.hoehe} px` +
        (marken.length ? `, ${marken.length} Marken aus der letzten Fassung.` : '. Das Original bleibt erhalten.'),
      'neutral'
    );
  } catch (fehler) {
    markierBild = null;
    meldeMarkieren('Das Bild dieser Aufnahme ließ sich nicht laden.', 'warnung');
  }
  zeichneMarkieren();
}

/* ------------------------------------------------------------- Sichern */

/**
 * Legt eine weitere Fassung neben das Original. Nichts wird ersetzt: jede
 * Bearbeitung ist eine eigene Stufe mit Nummer und Zeitpunkt, und das
 * Original bleibt unberuehrt darunter liegen.
 */
function sichereMarkierung() {
  const aufnahme = markierAufnahme();
  if (!aufnahme || !markierBild) return;
  const vorhandene = leseFassungen(aufnahme);
  const nummer = naechsteFassungsnummer(vorhandene);
  const leinwand = baueMarkierteLeinwand(false);
  const fassung = baueFassung({
    nummer,
    bild: baueVorschau(leinwand),
    marken,
    notiz: markierUnterschrift ? 'mit Bildunterschrift' : ''
  });
  // Die Fassung in voller Auflösung daneben in die Datenbank.
  legeVollbildAb(`${aufnahme.id}:${nummer}`, leinwand.toDataURL('image/png'));
  const gepflegt = {
    ...aufnahme,
    kapitel: Number(markierKapitel.kapitel) || undefined,
    unterkapitel: Number(markierKapitel.unterkapitel) || undefined,
    marken: markenAlsAblage(marken),
    fassungen: [...vorhandene.map((f) => ({ ...f, marken: markenAlsAblage(f.marken) })), fassung],
    bild_markiert: undefined,
    markiert_am: undefined
  };
  if (!speichereAufnahme(gepflegt)) return;
  markierGesichert = true;
  const offen = pruefeMarken(marken);
  meldeMarkieren(
    `Fassung ${nummer} zu ${aufnahme.id} gesichert – das Original bleibt daneben.` +
      (offen.length ? ` Offen: ${offen.map((p) => p.text).join(' ')}` : ''),
    offen.length ? 'warnung' : 'gut'
  );
  zeichneMarkieren();
  zeichneEingang();
}

/** Gibt die bearbeitete Fassung als PNG heraus, mit Zettel in der Datei. */
async function sichereMarkierteDatei() {
  const aufnahme = markierAufnahme();
  if (!aufnahme || !markierBild) return;
  const leinwand = baueMarkierteLeinwand(false);
  const blob = await new Promise((fertig) => leinwand.toBlob(fertig, 'image/png'));
  const nummer = naechsteFassungsnummer(leseFassungen(aufnahme)) - 1 || 1;
  const name = fassungName(dateinameAus(ablage.muster, {
    kapitel: kapitelKennung({ kapitel: markierKapitel.kapitel, unterkapitel: markierKapitel.unterkapitel }),
    datum: aufnahme.datum,
    nummer: String(aufnahme.id).slice(-3),
    projekt: aufnahme.projekt,
    titel: aufnahme.titel,
    kategorie: aufnahme.kategorie
  }), nummer, markenZusammenfassung(marken).unkenntlich > 0);
  const zettel = baueBeipackzettel({
    entwurf: aufnahme,
    bildname: name,
    ausschnitt: aufnahme.ausschnitt,
    quelle: aufnahme.quelle,
    erfasstAm: aufnahme.erfasst_am,
    anwendung: DATEN.anwendung,
    marken: markenAlsAblage(marken)
  });
  let daten = blob;
  try {
    daten = new Blob([legeTextInPng(new Uint8Array(await blob.arrayBuffer()), pngTexte(zettel, DATEN.anwendung))], {
      type: 'image/png'
    });
  } catch (fehler) {
    /* ohne eingelegten Text ist das Bild immer noch brauchbar */
  }
  const ergebnis = await uebergebeDatei(name, daten);
  if (ergebnis.art === 'gesichert') {
    meldeMarkieren(`${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – das Original ist unberührt.`, 'gut');
    return;
  }
  meldeMarkieren(
    ergebnis.art === 'ohne'
      ? 'Diese Ansicht darf keine Dateien ablegen. Die Fassung steht im Eingang.'
      : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    'warnung'
  );
}

function entferneAlleMarken() {
  merkeStand();
  marken = [];
  gewaehlteMarke = '';
  markierGesichert = false;
  zeichneMarkieren();
  meldeMarkieren('Alle Marken entfernt – mit „Fassung sichern“ gilt wieder das Original.', 'neutral');
}

/* ------------------------------------------------------------- Verdrahtung */

function verdrahteMarkieren() {
  $('#markier-werkzeuge').replaceChildren(
    ...MARKEN_ARTEN.map((art) =>
      el('button', {
        type: 'button',
        'data-werkzeug': art.id,
        title: art.hinweis,
        'aria-pressed': String(art.id === markierWerkzeug),
        text: art.label,
        onclick: () => {
          markierWerkzeug = art.id;
          for (const knopf of document.querySelectorAll('#markier-werkzeuge button')) {
            knopf.setAttribute('aria-pressed', String(knopf.dataset.werkzeug === markierWerkzeug));
          }
          zeichneMarkieren();
        }
      })
    )
  );
  $('#markier-stufe').replaceChildren(
    ...UNKENNTLICH_STUFEN.map((s) => el('option', { value: s.id, text: s.label, selected: s.id === markierStufe }))
  );
  $('#markier-stufe').addEventListener('change', (e) => {
    markierStufe = e.target.value;
  });
  $('#markier-wahl').addEventListener('change', (e) => waehleMarkierAufnahme(e.target.value));
  for (const [feld, schluessel] of [['#markier-kapitel', 'kapitel'], ['#markier-unterkapitel', 'unterkapitel']]) {
    $(feld).addEventListener('input', (e) => {
      markierKapitel = { ...markierKapitel, [schluessel]: e.target.value };
      markierGesichert = false;
      zeichneMarkierflaeche();
      $('#markier-sichern').disabled = !markierBild;
    });
  }
  $('#markier-unterschrift').addEventListener('change', (e) => {
    markierUnterschrift = e.target.checked;
    markierGesichert = false;
    zeichneMarkieren();
  });
  $('#markier-sichern').addEventListener('click', sichereMarkierung);
  $('#markier-datei').addEventListener('click', sichereMarkierteDatei);
  $('#markier-zuruecksetzen').addEventListener('click', entferneAlleMarken);

  const buehne = $('#markier-buehne');
  buehne.addEventListener('pointerdown', beginneZug);
  buehne.addEventListener('pointermove', fuehreZug);
  buehne.addEventListener('pointerup', beendeZug);
  buehne.addEventListener('pointercancel', () => {
    markierZug = null;
    zeichneMarkierflaeche();
  });
  buehne.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && gewaehlteMarke) {
      e.preventDefault();
      entferneMarke(gewaehlteMarke);
    }
  });
  // Rückgängig gilt in der ganzen Ansicht, nicht nur auf der Bühne.
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('markieren-ansicht').hidden) return;
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    const imFeld = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName || '');
    if (imFeld) return;
    e.preventDefault();
    if (e.shiftKey) machWiederher();
    else machRueckgaengig();
  });
  $('#markier-rueckgaengig').addEventListener('click', machRueckgaengig);
  $('#markier-wiederher').addEventListener('click', machWiederher);
}

/** Öffnet den Editor mit einer bestimmten Aufnahme - aus jeder Ansicht. */
function oeffneEditor(kennung) {
  setze({ ansicht: 'markieren' });
  waehleMarkierAufnahme(kennung);
}

verdrahteMarkieren();

/* =========================================================================
   Strecke – mehrere Screens als eine Folge.

   Eine Klickstrecke führt durch einen Ablauf: Schritt für Schritt eine
   Aufnahme und die Anweisung dazu. Gezeigt wird immer die jüngste Fassung,
   also mit abgedeckten Stellen und Marken – was herausgeht, ist das, was
   bearbeitet wurde, nicht das Original.

   „Blatt als Bild sichern“ fasst die ganze Folge in einem Bild zusammen.
   ========================================================================= */

let strecken = leseStreckenAusSpeicher();
let streckeOffen = strecken.length ? strecken[0].id : '';
let vorschauTakt = null;

function leseStreckenAusSpeicher() {
  try {
    return leseStrecken(localStorage.getItem(STRECKEN_SCHLUESSEL));
  } catch (fehler) {
    return [];
  }
}

function sichereStrecken() {
  try {
    localStorage.setItem(STRECKEN_SCHLUESSEL, schreibeStrecken(strecken));
    return true;
  } catch (fehler) {
    meldeStrecke('Dieser Browser gibt keinen Speicher – die Strecke gilt nur für diese Sitzung.', 'warnung');
    return false;
  }
}

const aktuelleStrecke = () => strecken.find((s) => s.id === streckeOffen) || null;

function meldeStrecke(text, art = 'neutral') {
  const zeile = $('#strecke-meldung');
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/** Ändert die offene Strecke und schreibt sie fort. */
function aendereStrecke(aenderung) {
  const offen = aktuelleStrecke();
  if (!offen) return;
  strecken = strecken.map((s) =>
    s.id === offen.id ? { ...s, ...aenderung, geaendert_am: new Date().toISOString() } : s
  );
  sichereStrecken();
  zeichneStrecke();
}

/* ------------------------------------------------------------- Ansicht */

function zeichneStrecke() {
  if (document.getElementById('strecke-ansicht').hidden) return;
  const offen = aktuelleStrecke();
  $('#strecke-wahl').replaceChildren(
    ...(strecken.length
      ? strecken.map((s) =>
          el('option', {
            value: s.id,
            text: `${s.name || 'ohne Namen'} · ${(s.schritte || []).length} Schritte`,
            selected: s.id === streckeOffen
          })
        )
      : [el('option', { value: '', text: 'noch keine Strecke' })])
  );
  $('#strecke-aufnahme').replaceChildren(
    ...(eingang.length
      ? sortiereNachKapitel(eingang).map((a) =>
          el('option', {
            value: a.id,
            text: `${kapitelKennung(a) ? kapitelKennung(a) + ' · ' : ''}${a.id} · ${a.titel}`
          })
        )
      : [el('option', { value: '', text: 'keine Aufnahme im Eingang' })])
  );
  $('#strecke-spalten').replaceChildren(
    ...BLATT_SPALTEN.map((s) =>
      el('option', { value: s.id, text: s.label, selected: Number(s.id) === Number(offen ? offen.spalten : 2) })
    )
  );
  $('#strecke-name').value = offen ? offen.name : '';
  $('#strecke-name').disabled = !offen;
  $('#strecke-anhaengen').disabled = !offen || !eingang.length;
  $('#strecke-loeschen').disabled = !offen;

  zeichneStreckenschritte();
  const probleme = offen ? pruefeStrecke(offen, eingang) : [{ text: 'Noch keine Strecke angelegt.' }];
  $('#strecke-blatt').disabled = probleme.length > 0;
  $('#strecke-text').textContent = offen ? streckeAlsText(offen, eingang) : '';
  if (probleme.length && offen) {
    meldeStrecke(`Es fehlt noch: ${probleme.map((p) => p.text).join(' ')}`, 'warnung');
  } else if (offen) {
    meldeStrecke(`${offen.schritte.length} Schritte – das Blatt lässt sich sichern.`, 'gut');
  }
  zeichneBlattVorschau();
}

/**
 * Text, Knopf und Meldung nachziehen, ohne die Liste neu zu zeichnen - beim
 * Tippen darf das Feld nicht unter den Fingern verschwinden.
 */
function aktualisiereStreckenstand() {
  const offen = aktuelleStrecke();
  if (!offen) return;
  const probleme = pruefeStrecke(offen, eingang);
  $('#strecke-text').textContent = streckeAlsText(offen, eingang);
  $('#strecke-blatt').disabled = probleme.length > 0;
  meldeStrecke(
    probleme.length
      ? `Es fehlt noch: ${probleme.map((p) => p.text).join(' ')}`
      : `${offen.schritte.length} Schritte – das Blatt lässt sich sichern.`,
    probleme.length ? 'warnung' : 'gut'
  );
  // Die Vorschau behauptet, das Blatt zu zeigen - also muss sie mitlaufen.
  // Gedrosselt, weil jedes Zeichen sonst alle Bilder neu rechnen würde.
  clearTimeout(vorschauTakt);
  vorschauTakt = setTimeout(zeichneBlattVorschau, 250);
}

function zeichneStreckenschritte() {
  const kasten = $('#strecke-schritte');
  const offen = aktuelleStrecke();
  if (!offen || !offen.schritte.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: offen
          ? 'Noch kein Schritt. Oben eine Aufnahme wählen und anhängen.'
          : 'Zuerst eine Strecke anlegen.'
      })
    );
    return;
  }
  kasten.replaceChildren(
    ...offen.schritte.map((schritt, i) => {
      const aufnahme = eingang.find((a) => a.id === schritt.aufnahme);
      return el('div', { klasse: 'strecke-schritt' }, [
        el('span', { klasse: 'schritt-nummer', text: String(i + 1) }),
        aufnahme
          ? el('img', { src: anzeigeBild(aufnahme), alt: aufnahme.titel, loading: 'lazy' })
          : el('span', { klasse: 'marke-fehlt', text: 'Aufnahme fehlt' }),
        el('div', { klasse: 'schritt-text' }, [
          el('input', {
            type: 'text',
            id: 'schritt-text-' + i,
            value: schritt.text,
            placeholder: 'Auf „Create Template“ klicken',
            // Der Stand kommt aus der Ablage, nicht aus dem Zeitpunkt des
            // Zeichnens: sonst überschreibt der zweite Text den ersten.
            oninput: (e) => {
              const jetzt = aktuelleStrecke();
              if (!jetzt) return;
              const schritte = jetzt.schritte.map((s, j) => (j === i ? { ...s, text: e.target.value } : s));
              strecken = strecken.map((s) => (s.id === jetzt.id ? { ...s, schritte } : s));
              sichereStrecken();
              aktualisiereStreckenstand();
            }
          }),
          el('span', {
            klasse: 'kennung',
            text: aufnahme ? `${kapitelKennung(aufnahme) || '—'} · ${aufnahme.id}` : schritt.aufnahme
          })
        ]),
        el('div', { klasse: 'schritt-knoepfe' }, [
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            id: 'schritt-hoch-' + i,
            text: '↑',
            title: 'nach oben',
            disabled: i === 0,
            onclick: () => aendereStrecke({ schritte: verschiebeSchritt(aktuelleStrecke().schritte, i, -1) })
          }),
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            id: 'schritt-runter-' + i,
            text: '↓',
            title: 'nach unten',
            disabled: i === offen.schritte.length - 1,
            onclick: () => aendereStrecke({ schritte: verschiebeSchritt(aktuelleStrecke().schritte, i, 1) })
          }),
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            id: 'schritt-weg-' + i,
            text: 'Entfernen',
            onclick: () => aendereStrecke({ schritte: aktuelleStrecke().schritte.filter((_, j) => j !== i) })
          })
        ])
      ]);
    })
  );
}

/* --------------------------------------------------------------- Blatt */

/**
 * Zeichnet alle Schritte in ein Bild: Kopfzeile mit Name und Datum, dann die
 * Kacheln in der gewählten Aufteilung, jede mit Nummer und Anweisung.
 */
async function baueBlatt(breite = 1600) {
  const offen = aktuelleStrecke();
  if (!offen) return null;
  const schritte = streckeMitAufnahmen(offen, eingang);
  if (!schritte.length) return null;
  const bilder = [];
  for (const schritt of schritte) {
    const geladen = await ladeBild(anzeigeBild(schritt.aufnahme), 'eingang', schritt.aufnahme.titel);
    bilder.push({ breite: geladen.naturalWidth || geladen.breite, hoehe: geladen.naturalHeight || geladen.hoehe, element: geladen.element, schritt });
  }
  const raster = blattRaster(bilder, { spalten: Number(offen.spalten) || 2, breite });
  const leinwand = document.createElement('canvas');
  leinwand.width = raster.breite;
  leinwand.height = raster.hoehe;
  const stift = leinwand.getContext('2d');
  stift.fillStyle = token('--flaeche', '#FFFFFF');
  stift.fillRect(0, 0, leinwand.width, leinwand.height);

  // Kopfzeile
  stift.fillStyle = token('--tinte', '#141A24');
  stift.font = `600 34px ${token('--schrift-display', 'sans-serif')}`;
  stift.textAlign = 'left';
  stift.textBaseline = 'alphabetic';
  stift.fillText(offen.name || 'Klickstrecke', 24, 48);
  stift.fillStyle = token('--tinte-3', '#77839A');
  stift.font = `400 18px ${token('--schrift-mono', 'monospace')}`;
  stift.fillText(`${schritte.length} Schritte · ${formatiereZeitpunkt(new Date().toISOString())}`, 24, 76);

  raster.kacheln.forEach((kachel, i) => {
    const { element, schritt } = bilder[i];
    stift.save();
    stift.fillStyle = token('--flaeche-2', '#F6F7FA');
    stift.fillRect(kachel.x, kachel.y, kachel.breite, kachel.hoehe);
    stift.drawImage(element, kachel.x, kachel.y, kachel.breite, kachel.bildHoehe);
    stift.strokeStyle = token('--linie', '#D6DBE4');
    stift.lineWidth = 1;
    stift.strokeRect(kachel.x + 0.5, kachel.y + 0.5, kachel.breite - 1, kachel.bildHoehe - 1);

    // Nummernkreis in der Ecke
    const r = 20;
    stift.beginPath();
    stift.arc(kachel.x + r + 8, kachel.y + r + 8, r, 0, Math.PI * 2);
    stift.fillStyle = token('--akzent', '#B4432B');
    stift.fill();
    stift.fillStyle = token('--auf-farbe', '#FFFFFF');
    stift.font = `600 22px ${token('--schrift-display', 'sans-serif')}`;
    stift.textAlign = 'center';
    stift.textBaseline = 'middle';
    stift.fillText(String(kachel.nummer), kachel.x + r + 8, kachel.y + r + 9);

    // Anweisung unter der Kachel
    stift.textAlign = 'left';
    stift.textBaseline = 'top';
    stift.fillStyle = token('--tinte', '#141A24');
    stift.font = `500 20px ${token('--schrift-text', 'sans-serif')}`;
    const text = `${kachel.nummer}. ${String(schritt.text || '').trim()}`;
    stift.save();
    stift.beginPath();
    stift.rect(kachel.x, kachel.y + kachel.bildHoehe + 8, kachel.breite, 56);
    stift.clip();
    stift.fillText(text, kachel.x + 2, kachel.y + kachel.bildHoehe + 10);
    stift.restore();
    stift.fillStyle = token('--tinte-3', '#77839A');
    stift.font = `400 14px ${token('--schrift-mono', 'monospace')}`;
    stift.fillText(
      bildunterschrift(schritt.aufnahme),
      kachel.x + 2,
      kachel.y + kachel.bildHoehe + 36
    );
    stift.restore();
  });
  return leinwand;
}

/** Kleine Vorschau desselben Blattes, damit man sieht, was herauskommt. */
async function zeichneBlattVorschau() {
  const schau = $('#strecke-vorschau');
  const offen = aktuelleStrecke();
  if (!offen || !streckeMitAufnahmen(offen, eingang).length) {
    schau.hidden = true;
    return;
  }
  const blatt = await baueBlatt(900);
  if (!blatt) {
    schau.hidden = true;
    return;
  }
  schau.hidden = false;
  schau.width = blatt.width;
  schau.height = blatt.height;
  schau.getContext('2d').drawImage(blatt, 0, 0);
}

async function sichereBlatt() {
  const offen = aktuelleStrecke();
  if (!offen) return;
  const probleme = pruefeStrecke(offen, eingang);
  if (probleme.length) {
    meldeStrecke(`Es fehlt noch: ${probleme.map((p) => p.text).join(' ')}`, 'warnung');
    return;
  }
  const blatt = await baueBlatt(1600);
  if (!blatt) return;
  const blob = await new Promise((fertig) => blatt.toBlob(fertig, 'image/png'));
  const name = `klickstrecke-${bereinigeDateiname(offen.name) || 'ohne-namen'}.png`;
  const ergebnis = await uebergebeDatei(name, blob);
  meldeStrecke(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${offen.schritte.length} Schritte in einem Bild.`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Die Strecke bleibt gespeichert.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/* --------------------------------------------------------- Verdrahtung */

function verdrahteStrecke() {
  $('#strecke-neu').addEventListener('click', () => {
    const neue = leereStrecke('');
    strecken = [...strecken, neue];
    streckeOffen = neue.id;
    sichereStrecken();
    zeichneStrecke();
    $('#strecke-name').focus({ preventScroll: true });
  });
  $('#strecke-wahl').addEventListener('change', (e) => {
    streckeOffen = e.target.value;
    zeichneStrecke();
  });
  $('#strecke-name').addEventListener('input', (e) => {
    const offen = aktuelleStrecke();
    if (!offen) return;
    strecken = strecken.map((s) => (s.id === offen.id ? { ...s, name: e.target.value } : s));
    sichereStrecken();
    aktualisiereStreckenstand();
  });
  $('#strecke-spalten').addEventListener('change', (e) => aendereStrecke({ spalten: Number(e.target.value) || 2 }));
  $('#strecke-anhaengen').addEventListener('click', () => {
    const offen = aktuelleStrecke();
    const kennung = $('#strecke-aufnahme').value;
    if (!offen || !kennung) return;
    aendereStrecke({ schritte: [...aktuelleStrecke().schritte, streckeSchritt(kennung, '')] });
    const feld = document.getElementById('schritt-text-' + offen.schritte.length);
    if (feld) feld.focus({ preventScroll: true });
  });
  $('#strecke-blatt').addEventListener('click', sichereBlatt);
  $('#strecke-loeschen').addEventListener('click', () => {
    const offen = aktuelleStrecke();
    if (!offen) return;
    strecken = strecken.filter((s) => s.id !== offen.id);
    streckeOffen = strecken.length ? strecken[0].id : '';
    sichereStrecken();
    zeichneStrecke();
    meldeStrecke('Strecke gelöscht. Die Aufnahmen bleiben im Eingang.', 'neutral');
  });
}

verdrahteStrecke();

// starte() steht in der letzten Zeile der letzten Datei (siehe CLAUDE.md).
starte();
stelleOrdnerWiederHer();
