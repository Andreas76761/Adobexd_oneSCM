/* =========================================================================
   Markieren – unkenntlich machen und erklären.

   Zwei Dinge an einem Bild, die nichts miteinander zu tun haben und doch
   dasselbe Werkzeug brauchen: Stellen abdecken, die niemanden angehen
   (Benutzerkennung, FIN, Adresse, Name), und Stellen hervorheben, die jemand
   finden soll – mit Rahmen, Text und Nummer für eine Klickstrecke.

   Das Original wird nie überschrieben. Die Marken liegen als Angaben neben
   der Aufnahme; die bearbeitete Fassung entsteht daraus als Kopie und kann
   jederzeit neu gerechnet oder verworfen werden.

   Seit 1.52.0 steht hier nur der Editor. Strecke und Gliederung, die bis
   dahin in derselben Datei lagen, stehen in `strecke.js` und
   `gliederung.js` - in dieser Reihenfolge hinter dieser Datei, weil sie
   sich mit ihr eine Klammer teilen.
   ========================================================================= */

let markierKennung = ''; // Aufnahme, die gerade bearbeitet wird
let marken = [];
let markierWerkzeug = 'unkenntlich';
let markierStufe = 'mittel';
let gewaehlteMarke = '';
let markierBild = null; // HTMLImageElement der Originalaufnahme
let markierUnterschrift = true; // Nummer und Zeitstempel ins Bild brennen
let markierKapitel = { kapitel: '', unterkapitel: '' };
let markierStelle = ''; // Nummer in der Gliederung des Handbuchs
let markierLabels = {}; // Sprache, Rolle, Sparte, Markt, Domäne, Reiter, Schritt
let markierVerlauf = []; // Stände vor jeder Änderung – für Rückgängig
let markierZurueck = []; // zurückgenommene Stände – für Wiederholen
let markierZug = null; // laufendes Aufziehen
let markierSchub = null; // laufendes Verschieben einer Marke
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
    else if (marke.art === 'label') zeichneLabelmarke(stift, marke);
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
    {
      ...aufnahme,
      gliederung: markierStelle,
      kapitel: markierKapitel.kapitel,
      unterkapitel: markierKapitel.unterkapitel
    },
    aufnahme.erfasst_am
  );
}

/**
 * Ein Label im Bild: ein gefülltes Feld mit Text, kein Rahmen. Es deckt
 * nichts ab, sondern beschriftet - darum liegt es auf dem Bild und nicht
 * darum herum.
 */
/**
 * Zeichnet ein Symbol des Vorrats auf die Leinwand. Gelesen wird dieselbe
 * Quelle wie in der Oberfläche - zwei Sätze Zeichen wären zwei Wahrheiten.
 * Rückgabe: ob gezeichnet wurde.
 */
function zeichneSymbol(stift, name, x, y, groesse, farbe) {
  const quelle = name && document.getElementById('sym-' + name);
  if (!quelle || typeof Path2D !== 'function') return false;
  const zahl = (knoten, attribut) => Number(knoten.getAttribute(attribut)) || 0;
  stift.save();
  stift.translate(x, y);
  stift.scale(groesse / 24, groesse / 24);
  stift.strokeStyle = farbe;
  stift.fillStyle = 'transparent';
  stift.lineWidth = 1.8;
  stift.lineCap = 'round';
  stift.lineJoin = 'round';
  for (const knoten of quelle.children) {
    let pfad = null;
    if (knoten.tagName === 'path') pfad = new Path2D(knoten.getAttribute('d') || '');
    else if (knoten.tagName === 'circle') {
      pfad = new Path2D();
      pfad.arc(zahl(knoten, 'cx'), zahl(knoten, 'cy'), zahl(knoten, 'r'), 0, Math.PI * 2);
    } else if (knoten.tagName === 'rect') {
      pfad = new Path2D();
      pfad.roundRect(zahl(knoten, 'x'), zahl(knoten, 'y'), zahl(knoten, 'width'), zahl(knoten, 'height'), zahl(knoten, 'rx'));
    }
    if (pfad) stift.stroke(pfad);
  }
  stift.restore();
  return true;
}

function zeichneLabelmarke(stift, marke) {
  const text = String(marke.text || '').trim();
  if (!text) return;
  const hoehe = Math.max(18, marke.hoehe);
  const schrift = Math.round(hoehe * 0.58);
  stift.save();
  stift.font = `500 ${schrift}px ${token('--schrift-text', 'sans-serif')}`;
  // Platz für das Zeichen, wenn es eines gibt - sonst bleibt die Marke schmal.
  const zeichen = symbolZuLabel(marke.feld, text);
  const symbolGroesse = Math.round(hoehe * 0.62);
  const hatZeichen = Boolean(zeichen && document.getElementById('sym-' + zeichen));
  const vorne = hoehe * 0.45 + (hatZeichen ? symbolGroesse + hoehe * 0.2 : 0);
  const breite = Math.round(stift.measureText(text).width + vorne + hoehe * 0.45);
  marke.breite = breite;
  marke.hoehe = hoehe;
  stift.fillStyle = token('--tinte', '#141A24');
  const r = Math.round(hoehe * 0.28);
  stift.beginPath();
  stift.roundRect(marke.x, marke.y, breite, hoehe, r);
  stift.fill();
  const tinte = token('--grund', '#EDEFF3');
  if (hatZeichen) {
    zeichneSymbol(
      stift,
      zeichen,
      marke.x + hoehe * 0.45,
      marke.y + (hoehe - symbolGroesse) / 2,
      symbolGroesse,
      tinte
    );
  }
  stift.fillStyle = tinte;
  stift.textAlign = 'left';
  stift.textBaseline = 'middle';
  stift.fillText(text, marke.x + vorne, marke.y + hoehe / 2 + 1);
  stift.restore();
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
    // Eine getroffene Marke wird verschoben, nicht neu aufgezogen.
    markierSchub = { id: getroffen.id, von: punkt, start: { x: getroffen.x, y: getroffen.y }, bewegt: false };
    $('#markier-buehne').setPointerCapture?.(e.pointerId);
    return;
  }
  markierZug = { start: punkt, x: punkt.x, y: punkt.y, breite: 0, hoehe: 0 };
  $('#markier-buehne').setPointerCapture?.(e.pointerId);
}

function fuehreZug(e) {
  if (markierSchub) {
    const punkt = punktAusEreignis(e);
    const marke = marken.find((m) => m.id === markierSchub.id);
    if (!marke) return;
    if (!markierSchub.bewegt) {
      merkeStand();
      markierSchub.bewegt = true;
    }
    const quelle = { breite: markierBild.naturalWidth, hoehe: markierBild.naturalHeight };
    const gerueckt = bewegeMarke(
      { ...marke, x: markierSchub.start.x, y: markierSchub.start.y },
      punkt.x - markierSchub.von.x,
      punkt.y - markierSchub.von.y,
      quelle
    );
    marke.x = gerueckt.x;
    marke.y = gerueckt.y;
    markierGesichert = false;
    zeichneMarkierflaeche();
    return;
  }
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
  if (markierSchub) {
    const bewegt = markierSchub.bewegt;
    markierSchub = null;
    if (bewegt) {
      $('#markier-sichern').disabled = !markierBild;
      zeichneMarkenliste();
    }
    return;
  }
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
  zeichneVarianten();
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

/* ---------------------------------------------------------- Varianten */

/**
 * Dieselbe Maske in anderer Sprache, Rolle, Sparte oder Markt. Die Gruppe
 * steht an den Aufnahmen; hier wird sie gezeigt, erweitert und gelöst.
 * Angezeigt wird, was einer Gruppe *im Bestand* fehlt - nicht alle 21
 * Sprachen, sondern die, die es hier schon gibt.
 */
function zeichneVarianten() {
  const aufnahme = markierAufnahme();
  const liste = $('#varianten-liste');
  const stand = $('#varianten-stand');
  if (!aufnahme) {
    stand.textContent = '';
    liste.replaceChildren(el('p', { klasse: 'feld-hinweis', text: 'Zuerst eine Aufnahme wählen.' }));
    $('#varianten-andere').replaceChildren(el('option', { value: '', text: 'keine Aufnahme' }));
    $('#varianten-verbinden').disabled = true;
    $('#varianten-loesen').disabled = true;
    return;
  }
  const gruppe = variantengruppe(aufnahme);
  const geschwister = variantenVon(eingang, aufnahme);
  stand.textContent = gruppe ? `${geschwister.length} verbunden` : 'nicht verbunden';

  // Was fehlt: die Werte, die es im Bestand gibt, in dieser Gruppe aber nicht.
  const luecken = [];
  for (const feld of VARIANTEN_FELDER) {
    const vorhanden = [...new Set(eingang.map((a) => String(a[feld] || '')).filter(Boolean))];
    const fehlt = fehlendeVarianten(eingang, aufnahme, feld, vorhanden);
    if (fehlt.length) {
      luecken.push(
        `${LABEL_FELDER.find((f) => f.id === feld).label}: ${fehlt.map((w) => labelWert(feld, w)).join(', ')}`
      );
    }
  }

  liste.replaceChildren(
    ...geschwister.map((a) =>
      el('div', { klasse: 'varianten-zeile' + (a.id === aufnahme.id ? ' varianten-zeile--selbst' : '') }, [
        el('button', {
          klasse: 'varianten-bild',
          type: 'button',
          title: 'Groß ansehen',
          onclick: () => zeigeLupe(a.id)
        }, el('img', { src: anzeigeBild(a), alt: a.titel, loading: 'lazy' })),
        el('div', { klasse: 'varianten-text' }, [
          el('span', { text: a.titel }),
          el('span', { klasse: 'kennung', text: `${a.id} · ${labelKette(a) || 'ohne Labels'}` })
        ]),
        a.id === aufnahme.id
          ? el('span', { klasse: 'kennung', text: 'diese' })
          : el('button', {
              klasse: 'knopf knopf--klein',
              type: 'button',
              text: 'öffnen',
              onclick: () => oeffneEditor(a.id)
            })
      ])
    ),
    luecken.length
      ? el('p', { klasse: 'feld-hinweis', text: 'Es fehlt noch – ' + luecken.join(' · ') })
      : el('p', { klasse: 'feld-hinweis', text: 'In jedem Wert des Bestands vorhanden.' })
  );

  // Zur Wahl stehen alle anderen Aufnahmen, die nicht schon in der Gruppe sind.
  const andere = sortiereNachKapitel(
    eingang.filter((a) => a.id !== aufnahme.id && !(gruppe && variantengruppe(a) === gruppe))
  );
  $('#varianten-andere').replaceChildren(
    ...(andere.length
      ? andere.map((a) =>
          el('option', {
            value: a.id,
            text: `${kapitelKennung(a) ? kapitelKennung(a) + ' · ' : ''}${a.id} · ${a.titel}${
              labelKette(a) ? ' · ' + labelKette(a) : ''
            }`
          })
        )
      : [el('option', { value: '', text: 'keine weitere Aufnahme' })])
  );
  $('#varianten-verbinden').disabled = !andere.length;
  $('#varianten-loesen').disabled = !gruppe;
}

function verbindeMitVariante() {
  const aufnahme = markierAufnahme();
  const andere = $('#varianten-andere').value;
  if (!aufnahme || !andere) return;
  const ergebnis = verbindeVarianten(eingang, [aufnahme.id, andere]);
  if (!ergebnis.gruppe) return;
  eingang = ergebnis.eingang;
  sichereEingang();
  zeichneVarianten();
  zeichneEingang();
  meldeMarkieren(
    `${ergebnis.verbunden} Aufnahmen sind nun eine Variantengruppe (${ergebnis.gruppe}).`,
    'gut'
  );
}

function loeseAusVariante() {
  const aufnahme = markierAufnahme();
  if (!aufnahme || !variantengruppe(aufnahme)) return;
  eingang = loeseVariante(eingang, aufnahme.id);
  sichereEingang();
  zeichneVarianten();
  zeichneEingang();
  meldeMarkieren(`${aufnahme.id} steht wieder allein. Die anderen bleiben verbunden.`, 'neutral');
}

function fuelleMarkierWahl() {
  const wahl = $('#markier-wahl');
  const vorher = wahl.value;
  // Zur Wahl steht die Arbeitsmenge; was gerade offen ist, bleibt darin -
  // sonst verlöre ein Wechsel der Arbeitsmenge das Bild unter der Hand.
  const menge = imProjekt();
  const liste = menge.some((a) => a.id === markierKennung)
    ? menge
    : [...eingang.filter((a) => a.id === markierKennung), ...menge];
  wahl.replaceChildren(
    el('option', { value: '', text: liste.length ? 'Aufnahme wählen' : 'keine Aufnahme in der Arbeitsmenge' }),
    ...liste.map((a) =>
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
          el('span', {
          klasse: 'marke-art',
          text:
            marke.art === 'schritt'
              ? `${marke.nummer}. Schritt`
              : marke.art === 'label'
                ? `Label ${labelBezeichnung(marke.feld)}`
                : art.label
        }),
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
      if (marke.art === 'label') {
        kinder.push(
          el('p', {
            klasse: 'feld-hinweis',
            text: `${marke.text} – ziehen verschiebt, Entfernen nimmt es aus dem Bild.`
          })
        );
      } else if (marke.art === 'unkenntlich') {
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
  markierStelle = String(aufnahme.gliederung || '');
  $('#markier-stelle').value = markierStelle;
  fuelleStellenwahl(['#stelle-kapitel', '#stelle-unterkapitel', '#stelle-schritt'], markierStelle);
  zeigeStellenthema();
  markierLabels = Object.fromEntries(LABEL_FELDER.map((f) => [f.id, aufnahme[f.id] || '']));
  zeichneLabelfelder();
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
    ...markierLabels,
    gliederung: markierStelle || undefined,
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
    ...WERKZEUGE.map((art) =>
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
  // Die Stelle im Handbuch: wählen oder tippen - beides führt zum selben Wert.
  const setzeStelle = (wert) => {
    markierStelle = wert;
    $('#markier-stelle').value = wert;
    fuelleStellenwahl(['#stelle-kapitel', '#stelle-unterkapitel', '#stelle-schritt'], wert);
    zeigeStellenthema();
    markierGesichert = false;
    zeichneMarkierflaeche();
    $('#markier-sichern').disabled = !markierBild;
  };
  for (const feld of ['#stelle-kapitel', '#stelle-unterkapitel', '#stelle-schritt']) {
    $(feld).addEventListener('change', (e) => {
      // Eine leere Wahl fällt auf die Ebene darüber zurück, statt die Stelle
      // zu löschen: wer das Unterkapitel zurücknimmt, meint das Kapitel.
      const teile = stelleTeile(markierStelle);
      const ebene = ['#stelle-kapitel', '#stelle-unterkapitel', '#stelle-schritt'].indexOf(feld);
      setzeStelle(e.target.value || teile[ebene - 1] || '');
    });
  }
  $('#markier-stelle').addEventListener('input', (e) => {
    const roh = String(e.target.value || '').trim();
    // Aus "6.2.3 Thema" wird die Nummer; getippte Nummern bleiben, wie sie sind.
    markierStelle = (roh.match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0];
    fuelleStellenvorschlaege(roh);
    fuelleStellenwahl(['#stelle-kapitel', '#stelle-unterkapitel', '#stelle-schritt'], markierStelle);
    zeigeStellenthema();
    markierGesichert = false;
    zeichneMarkierflaeche();
    $('#markier-sichern').disabled = !markierBild;
  });
  $('#varianten-verbinden').addEventListener('click', verbindeMitVariante);
  $('#varianten-loesen').addEventListener('click', loeseAusVariante);
  $('#label-ins-bild').addEventListener('click', setzeLabelsInsBild);
  $('#label-aus-bild').addEventListener('click', nimmLabelsAusBild);
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

/**
 * Die Labelfelder: Sprache, Rolle und Sparte aus fester Auswahl, Markt,
 * Domaene, Reiter und Schritt als Text mit Vorschlaegen aus dem, was schon
 * verwendet wurde. Ein festes Verzeichnis der Maerkte und Masken waere
 * morgen falsch; das Vokabular entsteht aus der Arbeit.
 */
function zeichneLabelfelder() {
  const kasten = $('#label-felder');
  if (!kasten) return;
  kasten.replaceChildren(
    ...LABEL_FELDER.map((feld) => {
      const id = 'label-' + feld.id;
      // Das Zeichen folgt dem Wert: eine gesetzte Rolle zeigt ihr eigenes.
      const beschriftung = el('label', { for: id }, [
        symbol(wertSymbol(feld, markierLabels[feld.id])),
        el('span', { text: feld.label })
      ]);
      const aendere = (wert) => {
        markierLabels = { ...markierLabels, [feld.id]: wert };
        markierGesichert = false;
        aktualisiereLabelkette();
        // Das Zeichen folgt dem Wert, ohne die Felder neu zu bauen - sonst
        // verlöre das Feld beim Tippen den Fokus.
        const nutzung = beschriftung.querySelector('use');
        if (nutzung) nutzung.setAttribute('href', '#sym-' + wertSymbol(feld, wert));
        // Ein Label im Bild traegt den Text mit - also neu zeichnen.
        for (const marke of marken) {
          if (marke.art === 'label' && marke.feld === feld.id) marke.text = labelWert(feld.id, wert);
        }
        zeichneMarkierflaeche();
        $('#markier-sichern').disabled = !markierBild;
      };
      const eingabe = feld.frei
        ? el('input', {
            type: 'text',
            id,
            value: markierLabels[feld.id] || '',
            list: 'vorschlag-' + feld.id,
            placeholder: feld.id === 'markt' ? 'Germany' : '',
            oninput: (e) => aendere(e.target.value)
          })
        : el(
            'select',
            { id, onchange: (e) => aendere(e.target.value) },
            [
              el('option', { value: '', text: 'ohne' }),
              ...feld.werte.map((w) =>
                el('option', {
                  value: w.id,
                  text: w.lang ? `${w.label} – ${w.lang}` : w.label,
                  selected: w.id === markierLabels[feld.id]
                })
              )
            ]
          );
      const kinder = [beschriftung, eingabe];
      if (feld.frei) {
        kinder.push(
          el(
            'datalist',
            { id: 'vorschlag-' + feld.id },
            labelVorschlaege(eingang, feld.id).slice(0, 40).map((w) => el('option', { value: w }))
          )
        );
      }
      return el('div', { klasse: 'feld label-feld' }, kinder);
    })
  );
  aktualisiereLabelkette();
}

const labelBezeichnung = (feld) => (LABEL_FELDER.find((f) => f.id === feld) || { label: '' }).label;

/** Ein Symbol aus dem Vorrat der Seite - keine externen Bilder. */
/**
 * Das Zeichen eines Labelwerts: jede Rolle und jede Sparte hat ihr eigenes
 * (Dealer, Market, HQ, MO, PC, Van). Fehlt eines, steht das Zeichen des
 * Feldes da - ein leerer Platz wäre schlimmer als ein allgemeines Symbol.
 */
function wertSymbol(feld, wert) {
  const treffer = (feld.werte || []).find((w) => w.id === wert);
  return (treffer && treffer.symbol) || feld.symbol;
}

function symbol(name) {
  const knoten = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  knoten.setAttribute('class', 'symbol');
  knoten.setAttribute('aria-hidden', 'true');
  const nutzung = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  nutzung.setAttribute('href', '#sym-' + name);
  knoten.append(nutzung);
  return knoten;
}

function aktualisiereLabelkette() {
  const kette = labelKette(markierLabels);
  $('#label-kette').textContent = kette || 'noch keine';
}

/** Setzt für jedes gesetzte Label eine Marke ins Bild, untereinander. */
function setzeLabelsInsBild() {
  if (!markierBild) return;
  const vorhandene = new Set(marken.filter((m) => m.art === 'label').map((m) => m.feld));
  const liste = labelListe(markierLabels).filter((l) => !vorhandene.has(l.feld));
  if (!liste.length) {
    meldeMarkieren('Alle gesetzten Labels stehen schon im Bild.', 'neutral');
    return;
  }
  merkeStand();
  const hoehe = Math.max(26, Math.round(markierBild.naturalHeight * 0.035));
  let y = Math.round(hoehe * 0.6);
  const neue = liste.map((l) => {
    const marke = leereMarke('label', { x: Math.round(hoehe * 0.6), y, breite: Math.round(hoehe * 7), hoehe }, marken);
    marke.text = l.wert;
    marke.feld = l.feld;
    y += Math.round(hoehe * 1.25);
    return marke;
  });
  marken = [...marken, ...neue];
  markierGesichert = false;
  meldeMarkieren(`${neue.length} Labels ins Bild gesetzt – ziehen verschiebt sie, Entf nimmt sie wieder heraus.`, 'gut');
  zeichneMarkieren();
}

function nimmLabelsAusBild() {
  if (!marken.some((m) => m.art === 'label')) {
    meldeMarkieren('Im Bild steht kein Label.', 'neutral');
    return;
  }
  merkeStand();
  marken = marken.filter((m) => m.art !== 'label');
  markierGesichert = false;
  meldeMarkieren('Labels aus dem Bild genommen – die Angaben bleiben an der Aufnahme.', 'neutral');
  zeichneMarkieren();
}

/**
 * Die Auswahl Kapitel → Unterkapitel → Stelle. Jede Ebene zeigt Nummer und
 * Namen; die tieferen Ebenen richten sich nach der höheren. Wer 1153 Stellen
 * zuordnen soll, soll sie nicht tippen müssen.
 */
function fuelleStellenwahl(kennungen, stelle) {
  const teile = stelleTeile(stelle);
  const ebenen = [
    { feld: kennungen[0], ebene: 1, eltern: '', leer: 'Kapitel wählen' },
    { feld: kennungen[1], ebene: 2, eltern: teile[0] || '', leer: 'Unterkapitel' },
    { feld: kennungen[2], ebene: 3, eltern: teile[1] || '', leer: 'Stelle' }
  ];
  for (const { feld, ebene, eltern, leer } of ebenen) {
    const knoten = feld && document.querySelector(feld);
    if (!knoten) continue;
    const auswahl = ebene === 1 || eltern ? gliederungEbene(GLIEDERUNG, ebene, eltern) : [];
    knoten.disabled = !auswahl.length;
    knoten.replaceChildren(
      el('option', {
        value: '',
        text: auswahl.length ? leer : ebene === 1 ? 'keine Gliederung' : 'erst darüber wählen'
      }),
      ...auswahl.map((e) =>
        el('option', { value: e.nummer, text: stelleLabel(e), selected: e.nummer === teile[ebene - 1] })
      )
    );
    knoten.value = teile[ebene - 1] && auswahl.some((e) => e.nummer === teile[ebene - 1]) ? teile[ebene - 1] : '';
  }
}

/** Höchstens 60 Vorschläge - eine Liste mit 1153 Einträgen hilft niemandem. */
function fuelleStellenvorschlaege(text) {
  const treffer = sucheGliederung(GLIEDERUNG, text).slice(0, 60);
  $('#gliederung-vorschlaege').replaceChildren(
    ...treffer.map((e) => el('option', { value: `${e.nummer} ${e.thema}` }))
  );
}

/** Zeigt, welche Stelle gemeint ist - und sagt, wenn es sie nicht gibt. */
function zeigeStellenthema() {
  const zeile = $('#markier-stelle-thema');
  if (!markierStelle) {
    zeile.textContent = 'ohne Stelle – das Bild steht dann nur im Eingang';
    zeile.className = 'feld-hinweis';
    return;
  }
  const treffer = GLIEDERUNG.find((e) => e.nummer === markierStelle);
  zeile.textContent = treffer ? treffer.thema : `${markierStelle} steht nicht in der Gliederung`;
  zeile.className = 'feld-hinweis' + (treffer ? '' : ' zettel-meldung--warnung');
}

/** Öffnet den Editor mit einer bestimmten Aufnahme - aus jeder Ansicht. */
function oeffneEditor(kennung) {
  setze({ ansicht: 'markieren' });
  waehleMarkierAufnahme(kennung);
}

verdrahteMarkieren();
