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
  marken = [...marken, marke];
  gewaehlteMarke = marke.id;
  markierGesichert = false;
  zeichneMarkieren();
  if (marke.art !== 'unkenntlich') {
    const feld = document.getElementById('marke-text-' + marke.id);
    if (feld) feld.focus({ preventScroll: true });
  }
}

function waehleMarke(id) {
  gewaehlteMarke = id;
  zeichneMarkieren();
}

function entferneMarke(id) {
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
    const geladen = await ladeBild(aufnahme.bild, 'eingang', aufnahme.titel);
    markierBild = geladen.element;
    meldeMarkieren(
      marken.length
        ? `${aufnahme.id} geladen – ${marken.length} Marken aus der letzten Fassung.`
        : `${aufnahme.id} geladen. Das Original bleibt erhalten.`,
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
  const fassung = baueFassung({
    nummer,
    bild: baueMarkierteLeinwand(false).toDataURL('image/jpeg', 0.78),
    marken,
    notiz: markierUnterschrift ? 'mit Bildunterschrift' : ''
  });
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
  const name = markiertName(dateinameAus(ablage.muster, {
    kapitel: kapitelKennung({ kapitel: markierKapitel.kapitel, unterkapitel: markierKapitel.unterkapitel }),
    datum: aufnahme.datum,
    nummer: String(aufnahme.id).slice(-3),
    projekt: aufnahme.projekt,
    titel: aufnahme.titel,
    kategorie: aufnahme.kategorie
  }));
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
}

/** Öffnet den Editor mit einer bestimmten Aufnahme - aus jeder Ansicht. */
function oeffneEditor(kennung) {
  setze({ ansicht: 'markieren' });
  waehleMarkierAufnahme(kennung);
}

verdrahteMarkieren();
starte();
stelleOrdnerWiederHer();
