/* =========================================================================
   Gliederung – wo ein Bild im Handbuch steht.

   Die Gliederung kommt aus der Arbeitsmappe des Projekts: 23 Kapitel, 204
   Unterkapitel, 919 Stellen auf der dritten Ebene, dazu Anhänge und sieben
   Übergänge zwischen Kapiteln. Jedes Bild bekommt eine Stelle; die Ansicht
   zeigt, wo schon Bilder liegen und wo noch keine.

   Bis 1.51.0 stand dies am Ende von `markieren.js`. `GLIEDERUNG` entsteht
   hier und wird von früheren Modulen (Editor, Import) benutzt - dort aber
   nur aus Funktionen heraus, die erst nach dem Laden laufen.
   ========================================================================= */

const GLIEDERUNG = leseGliederung(DATEN.gliederung || {});
let gliederungSuche = '';
let gliederungZeigen = 'alle';
let gliederungOffen = new Set();
let gliederungStelle = ''; // gewählte Stelle für Teilschritte und Beschreibung
let matrixFeld = 'sprache'; // Feld der Deckungsmatrix

/** Die Stellen, die nach Suche und Filter übrig bleiben. */
function sichtbareStellen() {
  const gesucht = sucheGliederung(GLIEDERUNG, gliederungSuche);
  if (gliederungZeigen === 'alle') return gesucht;
  const { zahlen } = zaehleBilder(GLIEDERUNG, imProjekt());
  return gesucht.filter((e) => {
    const zahl = (zahlen.get(e.nummer) || { gesamt: 0 }).gesamt;
    return gliederungZeigen === 'mitBildern' ? zahl > 0 : zahl === 0;
  });
}

function zeichneGliederung() {
  if (document.getElementById('gliederung-ansicht').hidden) return;
  const menge = imProjekt();
  const { zahlen, ohneStelle, unbekannt } = zaehleBilder(GLIEDERUNG, menge);
  const sichtbar = sichtbareStellen();
  const sichtbareNummern = new Set(sichtbar.map((e) => e.nummer));
  const kapitel = GLIEDERUNG.filter((e) => e.ebene === 1).length;
  const mitBildern = GLIEDERUNG.filter((e) => (zahlen.get(e.nummer) || {}).eigene).length;

  $('#gliederung-kennzahlen').replaceChildren(
    ...[
      ['Kapitel', String(kapitel), `${GLIEDERUNG.length} Stellen insgesamt`],
      [
        'Bilder zugeordnet',
        String(menge.length - ohneStelle),
        menge.length === eingang.length
          ? `von ${eingang.length} im Eingang`
          : `von ${menge.length} in der Arbeitsmenge`
      ],
      ['Stellen mit Bild', String(mitBildern), mitBildern ? 'belegt' : 'noch keine'],
      ['Ohne Stelle', String(ohneStelle), ohneStelle ? 'im Editor zuordnen' : 'alles zugeordnet'],
      ['Unbekannte Stellen', String(unbekannt.length), unbekannt.length ? unbekannt.slice(0, 3).join(', ') : 'keine']
    ].map(([schild, wert, zusatz]) =>
      el('div', { klasse: 'eingang-kachel' }, [
        el('span', { klasse: 'kachel-schild', text: schild }),
        el('span', { klasse: 'eingang-kachel-wert', text: wert }),
        el('span', { klasse: 'kachel-zusatz', text: zusatz })
      ])
    )
  );
  $('#gliederung-stand').textContent = `${sichtbar.length} von ${GLIEDERUNG.length} Stellen`;
  zeichneRuecklauf();
  zeichneFortschritt();

  const baum = gliederungBaum(GLIEDERUNG);
  $('#gliederung-baum').replaceChildren(
    ...baum
      .map((knoten) => zeichneStelle(knoten, zahlen, sichtbareNummern))
      .filter(Boolean)
  );
  zeichneTeilschritte();
  zeichneMatrix();
}

/**
 * Rechts neben dem Baum: welche Sprachen, Rollen, Domänen, Reiter und
 * Schritte an der gewählten Stelle liegen – mit Zahl. Darunter steht, was
 * die Gliederung zu dieser Stelle sagt.
 */
function zeichneTeilschritte() {
  const stelle = gliederungStelle;
  $('#teilschritt-stelle').textContent = stelle || 'alle Bilder';
  const gruppen = teilschritte(eingang, stelle);
  const liste = $('#teilschritt-liste');
  liste.replaceChildren(
    ...(gruppen.length
      ? gruppen.map((gruppe) =>
          el('div', { klasse: 'teilschritt-gruppe' }, [
            el('h3', { klasse: 'teilschritt-titel' }, [symbol(gruppe.symbol), el('span', { text: gruppe.bezeichnung })]),
            el(
              'div',
              { klasse: 'teilschritt-werte' },
              gruppe.werte.map((w) =>
                el('span', { klasse: 'teilschritt-wert' }, [
                  w.symbol && w.symbol !== gruppe.symbol ? symbol(w.symbol) : null,
                  el('span', { text: w.wert }),
                  el('span', { klasse: 'teilschritt-zahl', text: String(w.zahl) })
                ])
              )
            )
          ])
        )
      : [
          el('p', {
            klasse: 'feld-hinweis',
            text: stelle
              ? 'An dieser Stelle liegt noch kein Bild mit Labels.'
              : 'Noch keine Bilder mit Labels – im Editor unter „Labels“ zu setzen.'
          })
        ])
  );

  const beschreibung = $('#stelle-beschreibung');
  // Mit den eigenen Texten darüber (F-65): was aus Word zurückkam, steht hier.
  const eintrag = stelle && gliederungJetzt().find((e) => e.nummer === stelle);
  if (!eintrag) {
    beschreibung.hidden = true;
    return;
  }
  beschreibung.hidden = false;
  beschreibung.replaceChildren(
    el('h3', { klasse: 'beschreibung-titel', text: `${eintrag.nummer} ${eintrag.thema}` }),
    eintrag.eigenerText
      ? el('p', { klasse: 'kennung', text: 'eigener Text – aus Word zurückgelesen' })
      : null,
    ...(eintrag.kriterium
      ? [el('p', { klasse: 'beschreibung-schild', text: 'Abschlusskriterium' }), el('p', { text: eintrag.kriterium })]
      : []),
    ...(eintrag.notiz
      ? [el('p', { klasse: 'beschreibung-schild', text: 'Nachweis und Quelle' }), el('p', { text: eintrag.notiz })]
      : []),
    ...(eintrag.text
      ? [el('p', { klasse: 'beschreibung-schild', text: 'Übergang' }), el('p', { text: eintrag.text })]
      : [])
  );
}

/** Eine Stelle mit ihren Kindern; Zweige ohne Treffer fallen weg. */
function zeichneStelle(knoten, zahlen, sichtbar) {
  const kinder = (knoten.kinder || [])
    .map((kind) => zeichneStelle(kind, zahlen, sichtbar))
    .filter(Boolean);
  const selbstSichtbar = sichtbar.has(knoten.nummer);
  if (!selbstSichtbar && !kinder.length) return null;

  const zahl = zahlen.get(knoten.nummer) || { eigene: 0, gesamt: 0 };
  const offen = gliederungOffen.has(knoten.nummer) || Boolean(gliederungSuche);
  const zeile = el('div', { klasse: 'stelle-zeile' + (zahl.gesamt ? '' : ' stelle-zeile--leer') }, [
    kinder.length
      ? el('button', {
          klasse: 'stelle-schalter',
          type: 'button',
          'aria-expanded': String(offen),
          'data-stelle': knoten.nummer,
          text: offen ? '▾' : '▸',
          onclick: () => {
            if (gliederungOffen.has(knoten.nummer)) gliederungOffen.delete(knoten.nummer);
            else gliederungOffen.add(knoten.nummer);
            zeichneGliederung();
          }
        })
      : el('span', { klasse: 'stelle-schalter stelle-schalter--leer', text: '·' }),
    el('button', {
      klasse: 'stelle-waehlen' + (knoten.nummer === gliederungStelle ? ' stelle-waehlen--an' : ''),
      type: 'button',
      'data-waehlen': knoten.nummer,
      title: 'Teilschritte und Beschreibung zeigen',
      onclick: () => {
        gliederungStelle = gliederungStelle === knoten.nummer ? '' : knoten.nummer;
        zeichneGliederung();
      }
    }, [
      el('span', { klasse: 'stelle-nummer', text: knoten.nummer }),
      el('span', { klasse: 'stelle-thema', text: knoten.thema })
    ]),
    el('span', {
      klasse: 'stelle-zahl' + (zahl.gesamt ? ' stelle-zahl--voll' : ''),
      text: zahl.eigene === zahl.gesamt ? String(zahl.gesamt) : `${zahl.eigene} (${zahl.gesamt})`,
      title: `${zahl.eigene} Bilder an dieser Stelle, ${zahl.gesamt} mit Unterkapiteln`
    }),
    zahl.gesamt
      ? el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          'data-zeigen': knoten.nummer,
          text: 'Bilder zeigen',
          onclick: () => zeigeStelleImEingang(knoten.nummer)
        })
      : null
  ].filter(Boolean));

  return el('div', { klasse: `stelle stelle--ebene${Math.min(knoten.ebene, 3)}` }, [
    zeile,
    kinder.length && offen ? el('div', { klasse: 'stelle-kinder' }, kinder) : null
  ].filter(Boolean));
}

/** Führt in den Eingang und filtert auf die Stelle. */
function zeigeStelleImEingang(nummer) {
  eingangAuswahl = { ...eingangAuswahl, suche: nummer };
  setze({ ansicht: 'eingang' });
  const feld = document.getElementById('eingang-suche');
  if (feld) feld.value = nummer;
  zeichneEingang();
}

/* ----------------------------------------------------- Deckungsmatrix */

/**
 * Eine Zeile je Stelle mit Bildern, eine Spalte je Wert, der im Bestand
 * vorkommt. Alle 21 Sprachen als Spalten wären eine Tabelle, die niemand
 * liest - und eine leere Spalte sagt ohnehin nichts über die Deckung.
 */
function zeichneMatrix() {
  $('#matrix-feld').replaceChildren(
    ...VARIANTEN_FELDER.map((feld) =>
      el('option', {
        value: feld,
        text: LABEL_FELDER.find((f) => f.id === feld).label,
        selected: feld === matrixFeld
      })
    )
  );
  const matrix = deckungsMatrix(GLIEDERUNG, imProjekt(), matrixFeld);
  const label = LABEL_FELDER.find((f) => f.id === matrixFeld).label;
  $('#matrix-stand').textContent = matrix.spalten.length
    ? `${matrix.zeilen.length} Stellen · ${matrix.spalten.length} Werte · ${matrix.vollstaendig} vollständig${
        matrix.ohne ? ` · ${matrix.ohne} ohne ${label}` : ''
      }`
    : '';
  const kasten = $('#matrix-tabelle');
  if (!matrix.spalten.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: `Noch kein Bild trägt ein Label ${label} – im Editor setzen, dann steht hier die Deckung.`
      })
    );
    return;
  }

  const kopf = el('tr', {}, [
    el('th', { scope: 'col', text: 'Stelle' }),
    ...matrix.spalten.map((s) => el('th', { scope: 'col', text: s.label })),
    el('th', { scope: 'col', text: 'ohne' }),
    el('th', { scope: 'col', text: 'gesamt' })
  ]);
  const zeilen = matrix.zeilen.map((zeile) =>
    el('tr', { klasse: zeile.zellen.every((c) => c.zahl) ? 'matrix-voll' : '' }, [
      el('th', { scope: 'row' }, [
        el('span', { klasse: 'kennung', text: zeile.nummer }),
        el('span', { text: zeile.thema || (zeile.bekannt ? '' : 'nicht in der Gliederung') })
      ]),
      ...zeile.zellen.map((zelle) =>
        el(
          'td',
          { klasse: zelle.zahl ? 'matrix-zelle matrix-zelle--voll' : 'matrix-zelle matrix-zelle--leer' },
          zelle.zahl
            ? el('button', {
                type: 'button',
                klasse: 'matrix-knopf',
                title: `${zelle.kennungen.join(', ')} – erste im Editor öffnen`,
                text: String(zelle.zahl),
                onclick: () => oeffneEditor(zelle.kennungen[0])
              })
            : el('span', { text: '–' })
        )
      ),
      el('td', { klasse: 'matrix-zelle', text: zeile.ohne ? String(zeile.ohne) : '–' }),
      el('td', { klasse: 'matrix-zelle', text: String(zeile.gesamt) })
    ])
  );
  const summe = el('tr', { klasse: 'matrix-summe' }, [
    el('th', { scope: 'row', text: 'Summe' }),
    ...matrix.summen.map((wert) => el('td', { klasse: 'matrix-zelle', text: String(wert) })),
    el('td', { klasse: 'matrix-zelle', text: matrix.ohne ? String(matrix.ohne) : '–' }),
    el('td', { klasse: 'matrix-zelle', text: String(eingang.length) })
  ]);
  kasten.replaceChildren(
    el('table', { klasse: 'matrix-gitter' }, [el('thead', {}, kopf), el('tbody', {}, [...zeilen, summe])])
  );
}


/* ------------------------------------- Rückweg aus Word (1.47.0) */

let stellentexte = leseStellentexteAusSpeicher(); // eigene Texte je Stelle
let ruecklauf = []; // der Vergleich der zuletzt gelesenen Datei
let ruecklaufWahl = new Set();

function leseStellentexteAusSpeicher() {
  try {
    return leseStellentexte(localStorage.getItem(TEXTE_SCHLUESSEL));
  } catch (fehler) {
    return {};
  }
}

function sichereStellentexte() {
  try {
    localStorage.setItem(TEXTE_SCHLUESSEL, schreibeStellentexte(stellentexte));
    return true;
  } catch (fehler) {
    meldeRuecklauf('Der Speicher ist voll – die Texte gelten nur für diese Sitzung.', 'warnung');
    return false;
  }
}

/** Die Gliederung, wie die Seite sie zeigt: mit den eigenen Texten darüber. */
function gliederungJetzt() {
  return gliederungMitTexten(GLIEDERUNG, stellentexte);
}

function meldeRuecklauf(text, art = 'neutral') {
  const zeile = $('#ruecklauf-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

function zeichneRuecklauf() {
  const kasten = $('#ruecklauf-liste');
  if (!kasten) return;
  const eigene = Object.keys(stellentexte).length;
  $('#ruecklauf-stand').textContent = eigene
    ? `${eigene} Stelle(n) mit eigenem Text`
    : 'keine eigenen Texte';
  $('#ruecklauf-verwerfen').disabled = !eigene;
  const geaendert = ruecklauf.filter((s) => s.art === 'geaendert');
  $('#ruecklauf-uebernehmen').disabled = !ruecklaufWahl.size;

  if (!ruecklauf.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: eigene
          ? 'Noch keine Datei gelesen. Die eigenen Texte von früher gelten weiter – sie stehen im Handbuch und auf den Blättern.'
          : 'Noch keine Datei gelesen.'
      })
    );
    return;
  }

  kasten.replaceChildren(
    ...ruecklauf.slice(0, 200).map((stelle) => {
      const id = 'ruecklauf-' + bereinigeDateiname(stelle.nummer);
      const kopf = el('div', { klasse: 'ruecklauf-kopf' }, [
        stelle.art === 'geaendert'
          ? el('label', { for: id }, [
              el('input', {
                type: 'checkbox',
                id,
                checked: ruecklaufWahl.has(stelle.nummer),
                onchange: (e) => {
                  if (e.target.checked) ruecklaufWahl.add(stelle.nummer);
                  else ruecklaufWahl.delete(stelle.nummer);
                  zeichneRuecklauf();
                }
              }),
              el('span', { text: `${stelle.nummer} ${stelle.thema}` })
            ])
          : el('span', { klasse: 'ruecklauf-kopf-name', text: `${stelle.nummer} ${stelle.thema}` }),
        el('span', {
          klasse: 'kennung',
          text:
            stelle.art === 'geaendert'
              ? stelle.felder.map((f) => (f === 'text' ? 'Text' : 'Kriterium')).join(' und ') + ' geändert'
              : stelle.art === 'unbekannt'
                ? 'nicht in der Gliederung'
                : 'unverändert'
        })
      ]);
      const kinder = [kopf];
      if (stelle.art === 'geaendert') {
        for (const feld of stelle.felder) {
          if (stelle.alt[feld]) kinder.push(el('p', { klasse: 'ruecklauf-alt', text: kuerzeText(stelle.alt[feld], 240) }));
          kinder.push(el('p', { klasse: 'ruecklauf-neu', text: kuerzeText(stelle[feld], 240) }));
        }
      }
      return el('div', { klasse: 'ruecklauf-zeile ruecklauf-zeile--' + stelle.art }, kinder);
    })
  );
}

async function leseWordDatei(datei) {
  if (!datei) return;
  meldeRuecklauf(`${datei.name} wird gelesen …`, 'neutral');
  ruecklauf = [];
  ruecklaufWahl = new Set();
  try {
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const verzeichnis = leseZipVerzeichnis(bytes);
    const eintrag = verzeichnis.find((e) => e.name === 'word/document.xml');
    if (!eintrag) throw new Error('Das ist keine Word-Datei (word/document.xml fehlt).');
    const xml = new TextDecoder().decode(await entpackeZipEintrag(bytes, eintrag));
    const gelesen = stellenAusDocx(docxAbsaetze(xml));
    if (!gelesen.length) {
      throw new Error('In der Datei steht keine Überschrift, die mit einer Nummer beginnt – daraus lässt sich keine Stelle lesen.');
    }
    ruecklauf = vergleicheStellentexte(GLIEDERUNG, gelesen, stellentexte);
    ruecklaufWahl = new Set(ruecklauf.filter((s) => s.art === 'geaendert').map((s) => s.nummer));
    const zahl = (art) => ruecklauf.filter((s) => s.art === art).length;
    meldeRuecklauf(
      `${gelesen.length} Stelle(n) gelesen · ${zahl('geaendert')} geändert · ${zahl('gleich')} unverändert` +
        (zahl('unbekannt') ? ` · ${zahl('unbekannt')} nicht in der Gliederung` : ''),
      zahl('geaendert') ? 'gut' : 'neutral'
    );
  } catch (fehler) {
    meldeRuecklauf(`Die Datei ließ sich nicht lesen: ${fehler && fehler.message ? fehler.message : fehler}`, 'warnung');
  }
  zeichneRuecklauf();
  $('#ruecklauf-datei').value = '';
}

function uebernimmRuecklauf() {
  if (!ruecklaufWahl.size) return;
  const zahl = ruecklaufWahl.size;
  stellentexte = uebernimmStellentexte(stellentexte, ruecklauf, [...ruecklaufWahl]);
  const gesichert = sichereStellentexte();
  ruecklauf = vergleicheStellentexte(GLIEDERUNG, ruecklauf, stellentexte);
  ruecklaufWahl = new Set();
  zeichneGliederung();
  if (gesichert) {
    meldeRuecklauf(
      `${zahl} Stelle(n) übernommen. Sie stehen jetzt im Handbuch, auf den Blättern und in der Gliederung.`,
      'gut'
    );
  }
}

function verwirfStellentexte() {
  const zahl = Object.keys(stellentexte).length;
  if (!zahl) return;
  stellentexte = {};
  sichereStellentexte();
  ruecklauf = ruecklauf.length ? vergleicheStellentexte(GLIEDERUNG, ruecklauf, stellentexte) : [];
  zeichneGliederung();
  meldeRuecklauf(`${zahl} eigene(r) Text(e) verworfen – es gilt wieder die Gliederung des Projekts.`, 'neutral');
}

/* ------------------------------------- Fortschrittsblatt (1.46.0) */

let fortschrittAchse = 'sprache';
let fortschrittBlatt = null; // die gerechnete Leinwand, zum Sichern

function meldeFortschritt(text, art = 'neutral') {
  const zeile = $('#fortschritt-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/**
 * Das Blatt: je Kapitel ein Balken aus belegten Stellen, rechts die Zahlen,
 * darunter die zweite Achse. Gezeichnet wird in 300 dpi auf A4 quer - so
 * liegt es gleich druckfertig in der Statusrunde.
 */
function zeichneFortschrittsblatt(daten) {
  const fmt = format('a4-quer');
  const leinwand = document.createElement('canvas');
  leinwand.width = fmt.breite;
  leinwand.height = fmt.hoehe;
  const stift = leinwand.getContext('2d');
  const rand = Math.round(fmt.breite * 0.05);
  const breite = fmt.breite - 2 * rand;

  stift.fillStyle = designFarbe('--flaeche', '#FFFFFF');
  stift.fillRect(0, 0, fmt.breite, fmt.hoehe);
  stift.fillStyle = designFarbe('--akzent', '#B4432B');
  stift.fillRect(0, 0, fmt.breite, Math.round(fmt.hoehe * 0.012));

  // Kopf
  stift.textAlign = 'left';
  stift.textBaseline = 'top';
  const titelGross = Math.round(fmt.breite * 0.028);
  stift.fillStyle = designFarbe('--tinte', '#141A24');
  stift.font = `600 ${titelGross}px ${designSchriftart('--schrift-display', 'sans-serif')}`;
  const sprache = ausgabeSprache();
  stift.fillText(studio.titel || sagen('fortschritt', sprache), rand, Math.round(fmt.hoehe * 0.055));

  const klein = Math.round(titelGross * 0.42);
  stift.font = `400 ${klein}px ${designSchriftart('--schrift-mono', 'monospace')}`;
  stift.fillStyle = designFarbe('--tinte-3', '#77839A');
  const kopfzeile = [
    fortschrittText(daten, sprache),
    projektwahl ? projektWahlText(projektwahl, projekte) : sagen('alleProjekte', sprache),
    formatiereZeitpunkt(new Date().toISOString())
  ].join('  ·  ');
  stift.fillText(kopfzeile, rand, Math.round(fmt.hoehe * 0.055) + Math.round(titelGross * 1.35));

  // Der große Balken: der Stand insgesamt.
  const bandOben = Math.round(fmt.hoehe * 0.17);
  const bandHoehe = Math.round(fmt.hoehe * 0.035);
  stift.fillStyle = designFarbe('--flaeche-2', '#F6F7FA');
  stift.fillRect(rand, bandOben, breite, bandHoehe);
  stift.fillStyle = designFarbe('--akzent', '#B4432B');
  stift.fillRect(rand, bandOben, Math.round(breite * (daten.gesamt.anteil || 0)), bandHoehe);
  stift.fillStyle = designFarbe('--tinte', '#141A24');
  stift.font = `600 ${Math.round(klein * 1.2)}px ${designSchriftart('--schrift-display', 'sans-serif')}`;
  stift.fillText(`${Math.round((daten.gesamt.anteil || 0) * 100)} %`, rand, bandOben + bandHoehe + Math.round(klein * 0.5));

  // Je Kapitel eine Zeile. Alle Kapitel kommen aufs Blatt: statt zu kürzen
  // wird die Schrift kleiner - ein Stand, dem Kapitel fehlen, ist keiner.
  const kapitel = daten.kapitel;
  const oben = Math.round(fmt.hoehe * 0.26);
  const platz = fmt.hoehe - oben - Math.round(fmt.hoehe * 0.09);
  const zeilenHoehe = Math.floor(platz / Math.max(1, kapitel.length));
  // Die zweite Achse braucht eine zweite Zeile - die Schrift richtet sich
  // danach, nicht umgekehrt.
  const zeilenSchrift = Math.min(
    klein,
    Math.floor(zeilenHoehe / (daten.werte.length ? 2.6 : 1.5))
  );
  const balkenBreite = Math.round(breite * 0.42);
  const balkenX = rand + Math.round(breite * 0.3);

  kapitel.forEach((k, i) => {
    const y = oben + i * zeilenHoehe;
    stift.textAlign = 'left';
    stift.fillStyle = designFarbe('--tinte', '#141A24');
    stift.font = `500 ${zeilenSchrift}px ${designSchriftart('--schrift-text', 'sans-serif')}`;
    const name = beschneide(stift, `${k.nummer} ${k.thema || ''}`.trim(), Math.round(breite * 0.28));
    stift.fillText(name, rand, y);

    const hoehe = Math.round(zeilenSchrift * 0.8);
    stift.fillStyle = designFarbe('--flaeche-2', '#F6F7FA');
    stift.fillRect(balkenX, y, balkenBreite, hoehe);
    stift.fillStyle = designFarbe('--akzent', '#B4432B');
    stift.fillRect(balkenX, y, Math.round(balkenBreite * k.anteil), hoehe);

    stift.fillStyle = designFarbe('--tinte-2', '#4A5769');
    stift.font = `400 ${Math.round(zeilenSchrift * 0.9)}px ${designSchriftart('--schrift-mono', 'monospace')}`;
    stift.fillText(
      `${k.belegt}/${k.stellen} ${sagen('stellen', sprache)} · ${k.bilder} ${sagen('bilder', sprache)}`,
      balkenX + balkenBreite + Math.round(rand * 0.4),
      y
    );

    // Die zweite Achse steht klein darunter.
    if (k.jeWert.length) {
      stift.fillStyle = designFarbe('--tinte-3', '#77839A');
      stift.font = `400 ${Math.round(zeilenSchrift * 0.8)}px ${designSchriftart('--schrift-mono', 'monospace')}`;
      const text = k.jeWert
        .filter((w) => w.stellen)
        .map((w) => `${w.label} ${w.stellen}`)
        .join('  ');
      if (text) {
        stift.fillText(beschneide(stift, text, Math.round(breite * 0.28)), rand, y + Math.round(zeilenSchrift * 1.15));
      }
    }
  });

  // Fuß
  stift.fillStyle = designFarbe('--tinte-3', '#77839A');
  stift.font = `400 ${Math.round(klein * 0.85)}px ${designSchriftart('--schrift-mono', 'monospace')}`;
  stift.fillText(
    `Screenarchiv ${DATEN.anwendung} · ${sagen('gezaehlt', sprache)}`,
    rand,
    fmt.hoehe - Math.round(fmt.hoehe * 0.055)
  );
  return leinwand;
}

function zeichneFortschritt() {
  const wahl = $('#fortschritt-achse');
  if (!wahl) return;
  wahl.replaceChildren(
    el('option', { value: '', text: 'keine', selected: !fortschrittAchse }),
    ...VARIANTEN_FELDER.map((feld) =>
      el('option', {
        value: feld,
        text: (LABEL_FELDER.find((f) => f.id === feld) || { label: feld }).label,
        selected: feld === fortschrittAchse
      })
    )
  );
  const daten = fortschrittDaten(GLIEDERUNG, imProjekt(), { achse: fortschrittAchse });
  $('#fortschritt-stand').textContent = fortschrittText(daten);
  fortschrittBlatt = zeichneFortschrittsblatt(daten);
  const schau = el('canvas');
  schau.width = fortschrittBlatt.width;
  schau.height = fortschrittBlatt.height;
  schau.getContext('2d').drawImage(fortschrittBlatt, 0, 0);
  $('#fortschritt-schau').replaceChildren(schau);
}

async function sichereFortschritt(alsPdf) {
  if (!fortschrittBlatt) return;
  const tag = new Date().toISOString().slice(0, 10);
  if (alsPdf) {
    const blob = await new Promise((f) => fortschrittBlatt.toBlob(f, 'image/jpeg', 0.92));
    const pdf = pdfAusSeiten(
      [{ daten: new Uint8Array(await blob.arrayBuffer()), breite: fortschrittBlatt.width, hoehe: fortschrittBlatt.height }],
      { titel: 'Stand des Handbuchs', anwendung: DATEN.anwendung }
    );
    const ergebnis = await uebergebeDatei(`fortschritt-${tag}.pdf`, new Blob([pdf], { type: 'application/pdf' }));
    meldeFortschritt(
      ergebnis.art === 'gesichert'
        ? `fortschritt-${tag}.pdf gesichert (${formatiereBytes(ergebnis.groesse)}) – A4 quer, 300 dpi.`
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
      ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
    );
    return;
  }
  const blob = await new Promise((f) => fortschrittBlatt.toBlob(f, 'image/png'));
  const ergebnis = await uebergebeDatei(`fortschritt-${tag}.png`, blob);
  meldeFortschritt(
    ergebnis.art === 'gesichert'
      ? `fortschritt-${tag}.png gesichert (${formatiereBytes(ergebnis.groesse)}).`
      : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

function verdrahteGliederung() {
  let takt = null;
  $('#matrix-feld').addEventListener('change', (e) => {
    matrixFeld = e.target.value;
    zeichneMatrix();
  });
  $('#ruecklauf-datei').addEventListener('change', (e) => leseWordDatei(e.target.files && e.target.files[0]));
  $('#ruecklauf-uebernehmen').addEventListener('click', uebernimmRuecklauf);
  $('#ruecklauf-verwerfen').addEventListener('click', verwirfStellentexte);
  $('#fortschritt-achse').addEventListener('change', (e) => {
    fortschrittAchse = e.target.value;
    zeichneFortschritt();
  });
  $('#fortschritt-bild').addEventListener('click', () => sichereFortschritt(false));
  $('#fortschritt-pdf').addEventListener('click', () => sichereFortschritt(true));
  $('#gliederung-suche').addEventListener('input', (e) => {
    gliederungSuche = e.target.value;
    clearTimeout(takt);
    takt = setTimeout(zeichneGliederung, 180);
  });
  for (const knopf of document.querySelectorAll('#gliederung-filter button')) {
    knopf.addEventListener('click', () => {
      gliederungZeigen = knopf.dataset.zeigen;
      for (const anderer of document.querySelectorAll('#gliederung-filter button')) {
        anderer.setAttribute('aria-pressed', String(anderer === knopf));
      }
      zeichneGliederung();
    });
  }
}

verdrahteGliederung();

