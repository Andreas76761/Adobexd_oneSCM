/* =========================================================================
   Prüfung – vier Agenten über dem Bestand.

   Roter Faden, Audit, Sprache und Empfehlung prüfen nach Regeln (im Kern,
   ohne DOM).
   Die Ansicht zeigt Kennzahlen, Befunde und zu jedem Befund den Weg dorthin:
   betroffene Bilder öffnen sich im Editor, eine Stelle führt in die
   Gliederung, eine Folge in die Strecke.

   Claude darf das Ergebnis kommentieren, wenn der Betrachter die Fähigkeit
   `sample` gibt. Der Kommentar steht als Kommentar da – die Befunde stehen
   fest, bevor er kommt.
   ========================================================================= */

let pruefErgebnisse = {}; // agent-id -> Ergebnis samt Kommentar
let wortliste = leseWortlisteAusSpeicher(); // Vorgaben des Agenten „Sprache"
let pruefLaeuft = '';
let pruefClaude = null;
let pruefClaudeGeprueft = false;

function meldePruefung(text, art = 'neutral') {
  const zeile = $('#pruef-meldung');
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/** Führt einen Agenten aus - die Regeln liegen im Kern. */
function laufeAgent(id) {
  pruefErgebnisse = {
    ...pruefErgebnisse,
    [id]: {
      // Der Agent „Sprache" bekommt die Wortliste und die Lesungen aus OCR
      // dazu; die anderen übergehen das zweite Argument.
      ...fuehreAgent(id, imProjekt(), GLIEDERUNG, strecken, { wortliste, ocr: ocrTexte }),
      gelaufen_am: new Date().toISOString()
    }
  };
}

/* ------------------------------------------------- Wortliste (1.42.0) */

function leseWortlisteAusSpeicher() {
  try {
    return leseWortliste(localStorage.getItem(WORTLISTE_SCHLUESSEL));
  } catch (fehler) {
    return [...STANDARD_WORTLISTE];
  }
}

function meldeWortliste(text, art = 'neutral') {
  const zeile = $('#wortliste-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'feld-hinweis' + (art === 'warnung' ? ' zettel-meldung--warnung' : '');
}

function zeichneWortliste() {
  const feld = $('#wortliste-text');
  if (!feld) return;
  // Beim Tippen nicht dazwischenfahren: geschrieben wird nur, was nicht
  // gerade bearbeitet wird.
  if (document.activeElement !== feld) feld.value = wortlisteAlsText(wortliste);
  $('#wortliste-stand').textContent = `${wortliste.length} ${wortliste.length === 1 ? 'Regel' : 'Regeln'}`;
}

function sichereWortliste() {
  const gelesen = wortlisteAusText($('#wortliste-text').value);
  wortliste = gelesen;
  try {
    localStorage.setItem(WORTLISTE_SCHLUESSEL, schreibeWortliste(wortliste));
    meldeWortliste(`${wortliste.length} Regel(n) gesichert. Der Agent „Sprache" prüft beim nächsten Lauf damit.`);
  } catch (fehler) {
    meldeWortliste('Der Speicher ist voll – die Liste gilt nur für diese Sitzung.', 'warnung');
  }
  zeichneWortliste();
}

/* ------------------------------------------------------------- Darstellung */

const ART_SCHILD = { fehler: 'Fehler', warnung: 'Warnung', hinweis: 'Hinweis' };

/** Der Weg zum Befund: dieselbe Ansicht, die ihn auflöst. */
function wegKnopf(befund) {
  const ziele = {
    editor: ['Im Editor öffnen', () => (befund.kennungen.length ? oeffneEditor(befund.kennungen[0]) : setze({ ansicht: 'markieren' }))],
    gliederung: ['In der Gliederung zeigen', () => setze({ ansicht: 'gliederung' })],
    strecke: ['Zur Strecke', () => setze({ ansicht: 'strecke' })],
    design: ['Ins Designstudio', () => setze({ ansicht: 'design' })],
    aufnahme: ['Aufnehmen', () => setze({ ansicht: 'aufnahme' })],
    eingang: ['Im Eingang zeigen', () => setze({ ansicht: 'eingang' })]
  };
  const ziel = ziele[befund.weg];
  if (!ziel) return null;
  return el('button', { klasse: 'knopf knopf--klein', type: 'button', text: ziel[0], onclick: ziel[1] });
}

function befundKarte(befund) {
  const kennungen = befund.kennungen.slice(0, 8);
  return el('article', { klasse: 'pruef-befund pruef-befund--' + befund.art }, [
    el('div', { klasse: 'pruef-befund-kopf' }, [
      el('span', { klasse: 'pruef-art', text: ART_SCHILD[befund.art] || befund.art }),
      el('h4', { text: befund.titel }),
      befund.stelle ? el('span', { klasse: 'kennung', text: gliederungKennung(GLIEDERUNG, befund.stelle) }) : null
    ]),
    el('p', { text: befund.text }),
    kennungen.length
      ? el('div', { klasse: 'pruef-kennungen' }, [
          ...kennungen.map((kennung) =>
            el('button', {
              klasse: 'pruef-kennung',
              type: 'button',
              text: kennung,
              title: 'Im Editor öffnen',
              onclick: () => oeffneEditor(kennung)
            })
          ),
          befund.kennungen.length > kennungen.length
            ? el('span', { klasse: 'kennung', text: `+ ${befund.kennungen.length - kennungen.length} weitere` })
            : null
        ])
      : null,
    el('div', { klasse: 'pruef-befund-knoepfe' }, [wegKnopf(befund)])
  ]);
}

function agentKarte(agent) {
  const ergebnis = pruefErgebnisse[agent.id];
  const laeuft = pruefLaeuft === agent.id;
  return el('section', { klasse: 'pruef-agent', 'data-agent': agent.id }, [
    el('header', { klasse: 'pruef-agent-kopf' }, [
      el('h3', { text: agent.label }),
      el('p', { klasse: 'feld-hinweis', text: agent.zweck }),
      el('div', { klasse: 'markier-knoepfe' }, [
        el('button', {
          klasse: 'knopf' + (ergebnis ? '' : ' knopf--haupt'),
          type: 'button',
          id: 'pruef-' + agent.id,
          text: ergebnis ? 'Neu prüfen' : 'Prüfen',
          disabled: laeuft,
          onclick: () => {
            laufeAgent(agent.id);
            zeichnePruefung();
            const zahl = pruefErgebnisse[agent.id].befunde.length;
            meldePruefung(
              zahl ? `${agent.label}: ${zahl} Befund(e).` : `${agent.label}: kein Befund.`,
              zahl ? 'warnung' : 'gut'
            );
          }
        }),
        ergebnis
          ? el('button', {
              klasse: 'knopf knopf--klein',
              type: 'button',
              id: 'pruef-claude-' + agent.id,
              text: ergebnis.kommentar ? 'Kommentar erneuern' : 'Claude kommentieren lassen',
              disabled: laeuft,
              onclick: () => kommentiereMitClaude(agent)
            })
          : null
      ])
    ]),
    ergebnis
      ? el(
          'div',
          { klasse: 'pruef-kennzahlen' },
          ergebnis.kennzahlen.map((k) =>
            el('div', { klasse: 'eingang-kachel' }, [
              el('span', { klasse: 'kachel-schild', text: k.schild }),
              el('span', { klasse: 'eingang-kachel-wert', text: k.wert }),
              el('span', { klasse: 'kachel-zusatz', text: k.zusatz || '' })
            ])
          )
        )
      : el('p', { klasse: 'feld-hinweis', text: 'Noch nicht gelaufen.' }),
    ergebnis && !ergebnis.befunde.length
      ? el('p', { klasse: 'studio-meldung studio-meldung--gut', text: 'Kein Befund – hier ist nichts zu tun.' })
      : null,
    ergebnis && ergebnis.befunde.length
      ? el('div', { klasse: 'pruef-befunde' }, ergebnis.befunde.map(befundKarte))
      : null,
    ergebnis && ergebnis.kommentar
      ? el('div', { klasse: 'pruef-kommentar' }, [
          el('h4', { text: 'Kommentar von Claude' }),
          el('p', { text: ergebnis.kommentar }),
          el('p', {
            klasse: 'feld-hinweis',
            text: 'Ein Kommentar, kein Befund: die Regeln oben stehen fest, bevor er geschrieben wird.'
          })
        ])
      : null,
    ergebnis
      ? el('p', { klasse: 'kennung', text: `gelaufen ${formatiereZeitpunkt(ergebnis.gelaufen_am)}` })
      : null
  ]);
}

function zeichnePruefung() {
  if (document.getElementById('pruefung-ansicht').hidden) return;
  $('#pruef-agenten').replaceChildren(...AGENTEN.map(agentKarte));
  zeichneWortliste();
  zeichneGebrauch();
  $('#pruef-bericht').disabled = !Object.keys(pruefErgebnisse).length;
  zeichneVergleich();
}

/* --------------------------------------------- Gebrauch: die Probe (1.56.0) */

/**
 * Die Zählung aus `ui.js`, sortiert hingelegt. Sie urteilt nicht - sie sagt,
 * was nie gedrückt wurde, und wie lange schon gezählt wird. Eine Woche
 * beweist nichts, und das steht auch da.
 */
function zeichneGebrauch() {
  const kasten = $('#gebrauch-listen');
  if (!kasten) return;
  const bericht = gebrauchBericht(gebrauch, heute());

  $('#gebrauch-urteil').textContent = bericht.urteil;
  $('#gebrauch-stand').textContent = bericht.gesamt
    ? `${bericht.gesamt} Befehl${bericht.gesamt === 1 ? '' : 'e'} in ${bericht.tage} ${bericht.tage === 1 ? 'Tag' : 'Tagen'}`
    : 'noch nichts gezählt';

  const liste = (titel, eintraege, art) =>
    eintraege.length
      ? el('div', { klasse: 'gebrauch-gruppe gebrauch-gruppe--' + art }, [
          el('h3', { klasse: 'abschnitt-titel', text: titel }),
          el(
            'ul',
            { klasse: 'gebrauch-liste' },
            eintraege.map((e) =>
              el('li', {}, [
                el('span', { klasse: 'kennung', text: e.feature }),
                el('span', { text: ` ${e.label} ` }),
                el('span', { klasse: 'feld-hinweis', text: `(${e.wo})` }),
                e.zahl === undefined ? null : el('b', { klasse: 'gebrauch-zahl', text: `${e.zahl}×` })
              ].filter(Boolean))
            )
          )
        ])
      : null;

  const teile = [
    liste('Nie gedrückt', bericht.nie, 'nie'),
    liste('Selten gedrückt', bericht.selten, 'selten'),
    liste('Benutzt', bericht.benutzt, 'benutzt'),
    liste('Durch Zählen nicht zu beantworten', bericht.nichtMessbar, 'offen')
  ].filter(Boolean);

  if (bericht.ansichten.length) {
    teile.push(
      el('div', { klasse: 'gebrauch-gruppe' }, [
        el('h3', { klasse: 'abschnitt-titel', text: 'Ansichten geöffnet' }),
        el(
          'ul',
          { klasse: 'gebrauch-liste' },
          bericht.ansichten.map((a) =>
            el('li', {}, [el('span', { text: a.name + ' ' }), el('b', { klasse: 'gebrauch-zahl', text: `${a.zahl}×` })])
          )
        )
      ])
    );
  }
  kasten.replaceChildren(...teile);
}

function meldeGebrauch(text, art = 'neutral') {
  const zeile = $('#gebrauch-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

async function sichereGebrauch() {
  const name = `screenarchiv-gebrauch-${heute()}.txt`;
  const ergebnis = await uebergebeDatei(name, gebrauchText(gebrauchBericht(gebrauch, heute())));
  meldeGebrauch(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert – die Zahlen stehen weiter allein in diesem Browser.`
      : 'Diese Ansicht darf keine Datei ablegen. Die Zahlen stehen oben.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/* ----------------------------------------------- Projektvergleich (1.37.0) */

let vergleichWahl = { a: '', b: '' };

/** Die Projekte, zwischen denen verglichen werden kann - auch die aus dem Bestand. */
const vergleichProjekte = () => [...projekte, ...projekteAusBestand(eingang, projekte)];

function fuelleVergleichswahl(liste) {
  for (const [seite, feld] of [['a', '#vergleich-a'], ['b', '#vergleich-b']]) {
    const wahl = $(feld);
    wahl.replaceChildren(
      el('option', { value: '', text: liste.length ? 'Projekt wählen' : 'noch kein Projekt' }),
      ...liste.map((satz) => el('option', { value: satz.id, text: projektKennung(satz) }))
    );
    wahl.value = liste.some((satz) => satz.id === vergleichWahl[seite]) ? vergleichWahl[seite] : '';
    vergleichWahl = { ...vergleichWahl, [seite]: wahl.value };
  }
}

/** Eine Zeile je Stelle: neu, entfallen oder in beiden. */
function vergleichZeile(zeile) {
  const schild = { neu: 'neu', entfallen: 'entfallen', beide: 'in beiden' }[zeile.art];
  return el('tr', { klasse: 'vergleich-zeile vergleich-zeile--' + zeile.art }, [
    el('th', { scope: 'row' }, [
      el('button', {
        klasse: 'matrix-knopf',
        type: 'button',
        text: zeile.nummer,
        title: 'Die Stelle in der Gliederung zeigen',
        onclick: () => setze({ ansicht: 'gliederung' })
      })
    ]),
    el('td', { text: zeile.thema || (zeile.bekannt ? '' : 'nicht in der Gliederung') }),
    el('td', { klasse: 'vergleich-art', text: schild }),
    el('td', { text: String(zeile.a) }),
    el('td', { text: String(zeile.b) }),
    el('td', {}, [
      // Nur was in beiden Fassungen steht, lässt sich vergleichen.
      zeile.art === 'beide'
        ? el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'Bilder vergleichen',
            onclick: () => zeigeBildvergleich(zeile.nummer)
          })
        : el('span', { klasse: 'kennung', text: '–' })
    ])
  ]);
}

/* ------------------------------------------- Bildvergleich (1.41.0) */

let unterschiedBild = null; // die Leinwand mit den Marken, zum Sichern

/**
 * Zwei Bilder derselben Stelle nebeneinander - und darunter, was sich
 * geändert hat. Gerechnet wird im Kern (`bildUnterschied`), gezeichnet
 * hier: das zweite Bild mit Rahmen um die veränderten Bereiche.
 */
async function zeigeBildvergleich(nummer) {
  const liste = vergleichProjekte();
  const paar = vergleichsPaare(eingang, vergleichWahl.a, vergleichWahl.b, GLIEDERUNG).find(
    (p) => p.nummer === nummer
  );
  const fenster = $('#unterschied-dialog');
  if (!paar) return;
  $('#unterschied-titel').textContent = `${paar.nummer}${paar.thema ? ' ' + paar.thema : ''}`;
  $('#unterschied-stand').textContent = 'Die Bilder werden geholt …';
  $('#unterschied-stand').className = 'studio-meldung';
  $('#unterschied-bilder').replaceChildren();
  $('#unterschied-sichern').disabled = true;
  unterschiedBild = null;
  if (!fenster.open) fenster.showModal();

  try {
    const [vorher, nachher] = await Promise.all([ladeVergleichsbild(paar.vorher), ladeVergleichsbild(paar.nachher)]);
    // Verglichen wird auf dem Maß des ersten Bildes; das zweite wird darauf
    // gezogen. Verschiedene Maße sind selbst schon eine Änderung - das steht
    // dann auch da.
    const breite = vorher.breite;
    const hoehe = vorher.hoehe;
    const a = punkteAus(vorher.element, breite, hoehe);
    const b = punkteAus(nachher.element, breite, hoehe);
    const ergebnis = bildUnterschied(a, b);

    const marken = document.createElement('canvas');
    marken.width = breite;
    marken.height = hoehe;
    const stift = marken.getContext('2d');
    stift.drawImage(nachher.element, 0, 0, breite, hoehe);
    stift.strokeStyle = '#C0392B';
    stift.lineWidth = Math.max(2, Math.round(breite / 400));
    stift.fillStyle = 'rgba(192, 57, 43, 0.14)';
    for (const bereich of ergebnis.bereiche || []) {
      stift.fillRect(bereich.x, bereich.y, bereich.breite, bereich.hoehe);
      stift.strokeRect(bereich.x, bereich.y, bereich.breite, bereich.hoehe);
    }
    unterschiedBild = marken;

    const schau = (titel, kennung, element) => {
      const leinwand = el('canvas', { klasse: 'unterschied-leinwand' });
      leinwand.width = breite;
      leinwand.height = hoehe;
      leinwand.getContext('2d').drawImage(element, 0, 0, breite, hoehe);
      return el('figure', {}, [leinwand, el('figcaption', { text: `${titel} · ${kennung}` })]);
    };

    $('#unterschied-bilder').replaceChildren(
      schau('vorher', paar.vorher.id, vorher.element),
      schau('nachher', paar.nachher.id, nachher.element),
      el('figure', { klasse: 'unterschied-marken' }, [
        marken,
        el('figcaption', {
          text: `Unterschied · ${(ergebnis.bereiche || []).length} Bereich(e) rot umrandet`
        })
      ])
    );
    const masse =
      nachher.breite !== breite || nachher.hoehe !== hoehe
        ? ` · Maße verschieden (${vorher.breite} × ${vorher.hoehe} gegen ${nachher.breite} × ${nachher.hoehe}), das zweite Bild wurde gezogen`
        : '';
    const weitere =
      paar.weitereA || paar.weitereB
        ? ` · ${paar.weitereA + paar.weitereB} weitere(s) Bild an dieser Stelle wurde nicht verglichen`
        : '';
    $('#unterschied-stand').textContent = unterschiedText(ergebnis) + masse + weitere;
    $('#unterschied-stand').className =
      'studio-meldung studio-meldung--' + (ergebnis.urteil === 'gleich' ? 'gut' : 'neutral');
    $('#unterschied-sichern').disabled = false;
  } catch (fehler) {
    $('#unterschied-stand').textContent =
      'Eines der beiden Bilder ließ sich nicht holen – ohne volles Bild kein Vergleich.';
    $('#unterschied-stand').className = 'studio-meldung studio-meldung--warnung';
  }
}

/** Das beste verfügbare Bild einer Aufnahme, geladen und vermessen. */
async function ladeVergleichsbild(aufnahme) {
  const adresse = await bestesBild(aufnahme, (neuesteFassung(aufnahme) || {}).nummer);
  return ladeBild(adresse, 'eingang', aufnahme.titel);
}

/** Die Bildpunkte eines Bildes auf einem festen Maß - zum Vergleichen. */
function punkteAus(element, breite, hoehe) {
  const leinwand = document.createElement('canvas');
  leinwand.width = breite;
  leinwand.height = hoehe;
  const stift = leinwand.getContext('2d', { willReadFrequently: true });
  stift.fillStyle = '#FFFFFF';
  stift.fillRect(0, 0, breite, hoehe);
  stift.drawImage(element, 0, 0, breite, hoehe);
  const punkte = stift.getImageData(0, 0, breite, hoehe);
  return { daten: punkte.data, breite, hoehe };
}

async function sichereUnterschied() {
  if (!unterschiedBild) return;
  const blob = await new Promise((f) => unterschiedBild.toBlob(f, 'image/png'));
  const name = `unterschied-${new Date().toISOString().slice(0, 10)}.png`;
  const ergebnis = await uebergebeDatei(name, blob);
  $('#unterschied-stand').textContent =
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}).`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.';
}

function zeichneVergleich() {
  const liste = vergleichProjekte();
  fuelleVergleichswahl(liste);
  const kasten = $('#vergleich-tabelle');
  const stand = $('#vergleich-stand');
  const knopf = $('#vergleich-sichern');

  if (!vergleichWahl.a || !vergleichWahl.b || vergleichWahl.a === vergleichWahl.b) {
    stand.textContent = liste.length < 2 ? 'dafür braucht es zwei Projekte' : '';
    knopf.disabled = true;
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text:
          liste.length < 2
            ? 'Noch kein zweites Projekt. In der Aufnahme unter „Projekte" eines anlegen – etwa dieselbe Anwendung in der nächsten Fassung.'
            : 'Zwei verschiedene Projekte wählen – vorher und nachher.'
      })
    );
    return;
  }

  const vergleich = vergleicheProjekte(eingang, vergleichWahl.a, vergleichWahl.b, GLIEDERUNG);
  stand.textContent = `${vergleich.neu} neu · ${vergleich.entfallen} nur vorher · ${vergleich.beide} in beiden`;
  knopf.disabled = false;

  if (!vergleich.zeilen.length) {
    kasten.replaceChildren(
      el('p', { klasse: 'feld-hinweis', text: 'Keines der beiden Projekte hat Bilder mit einer Stelle – es gibt nichts zu vergleichen.' })
    );
    return;
  }

  const kopf = el('tr', {}, [
    el('th', { scope: 'col', text: 'Stelle' }),
    el('th', { scope: 'col', text: 'Thema' }),
    el('th', { scope: 'col', text: 'Lage' }),
    el('th', { scope: 'col', text: projektWahlText(vergleichWahl.a, liste) }),
    el('th', { scope: 'col', text: projektWahlText(vergleichWahl.b, liste) }),
    el('th', { scope: 'col', text: 'Bilder' })
  ]);
  const kinder = [
    el('table', { klasse: 'matrix-gitter vergleich-gitter' }, [
      el('thead', {}, kopf),
      el('tbody', {}, vergleich.zeilen.map(vergleichZeile))
    ])
  ];
  if (vergleich.ohneStelleA || vergleich.ohneStelleB) {
    kinder.push(
      el('p', {
        klasse: 'feld-hinweis',
        text: `Ohne Stelle und darum nicht verglichen: ${vergleich.ohneStelleA} vorher, ${vergleich.ohneStelleB} nachher.`
      })
    );
  }
  kasten.replaceChildren(...kinder);
}

async function sichereVergleich() {
  const liste = vergleichProjekte();
  const vergleich = vergleicheProjekte(eingang, vergleichWahl.a, vergleichWahl.b, GLIEDERUNG);
  const text = vergleichAlsText(vergleich, liste, { anwendung: DATEN.anwendung });
  const name = `projektvergleich-${new Date().toISOString().slice(0, 10)}.txt`;
  const ergebnis = await uebergebeDatei(name, new Blob([text], { type: 'text/plain' }));
  meldePruefung(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${vergleich.neu} neu, ${vergleich.entfallen} nur vorher.`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Der Vergleich bleibt in der Ansicht.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/* ------------------------------------------------------- Kommentar und Bericht */

/**
 * Claude liest den fertigen Bericht eines Agenten und schreibt dazu einen
 * Absatz. Die Befunde gehen als Text hinein; es kommt nichts zurück, was die
 * Ansicht als Befund ausgäbe - darum kann der Kommentar nichts verfälschen.
 */
async function kommentiereMitClaude(agent) {
  const ergebnis = pruefErgebnisse[agent.id];
  if (!ergebnis) return;
  if (!pruefClaudeGeprueft) {
    pruefClaude = await holeFaehigkeit('sample');
    pruefClaudeGeprueft = true;
  }
  if (!pruefClaude) {
    meldePruefung(
      'Diese Ansicht darf Claude nicht fragen – der Kommentar entfällt. Die Befunde stehen trotzdem; sie entstehen in der Seite.',
      'warnung'
    );
    return;
  }
  pruefLaeuft = agent.id;
  zeichnePruefung();
  meldePruefung(`${agent.label}: Claude liest den Bericht …`, 'neutral');
  try {
    const antwort = await pruefClaude(
      'Du kommentierst den Prüfbericht einer Bilddatenbank für ein Benutzerhandbuch (System oneSCM, ' +
        'Mercedes-Benz Servicevertragswesen). Schreibe höchstens fünf Sätze auf Deutsch: was der Bericht ' +
        'über den Zustand sagt, was zuerst anzufassen wäre und warum. Keine neuen Zahlen, keine Aufzählung, ' +
        'keine Wiederholung der Liste. Sachlich, ohne Lob.\n\n' +
        berichtAlsText([ergebnis], { anwendung: DATEN.anwendung }),
      { modelTier: 'default', cache: false }
    );
    pruefErgebnisse = {
      ...pruefErgebnisse,
      [agent.id]: { ...ergebnis, kommentar: String((antwort && antwort.text) || '').trim() }
    };
    meldePruefung(`${agent.label}: Kommentar steht.`, 'gut');
  } catch (fehler) {
    const code = (fehler && fehler.code) || '';
    meldePruefung(
      code === 'not_granted'
        ? 'Der Kommentar wurde nicht erlaubt. Die Befunde bleiben – sie brauchen Claude nicht.'
        : code === 'rate_limited'
          ? 'Zu viele Anfragen in kurzer Zeit – gleich noch einmal.'
          : 'Der Kommentar ist nicht zustande gekommen. Die Befunde bleiben.',
      'warnung'
    );
  }
  pruefLaeuft = '';
  zeichnePruefung();
}

async function sichereBericht() {
  const ergebnisse = AGENTEN.map((a) => pruefErgebnisse[a.id]).filter(Boolean);
  if (!ergebnisse.length) return;
  const text = berichtAlsText(ergebnisse, { anwendung: DATEN.anwendung });
  const name = `pruefbericht-${new Date().toISOString().slice(0, 10)}.txt`;
  const ergebnis = await uebergebeDatei(name, new Blob([text], { type: 'text/plain' }));
  meldePruefung(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${ergebnisse.length} Agent(en).`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Der Bericht bleibt in der Ansicht.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

function verdrahtePruefung() {
  $('#pruef-alle').addEventListener('click', () => {
    for (const agent of AGENTEN) laufeAgent(agent.id);
    zeichnePruefung();
    const zahl = Object.values(pruefErgebnisse).reduce((summe, e) => summe + e.befunde.length, 0);
    const fehler = Object.values(pruefErgebnisse).reduce(
      (summe, e) => summe + e.befunde.filter((b) => b.art === 'fehler').length,
      0
    );
    meldePruefung(
      `${AGENTEN.length} Agenten gelaufen: ${zahl} Befund(e), davon ${fehler} Fehler.`,
      fehler ? 'warnung' : zahl ? 'neutral' : 'gut'
    );
  });
  $('#pruef-bericht').addEventListener('click', sichereBericht);
  for (const [seite, feld] of [['a', '#vergleich-a'], ['b', '#vergleich-b']]) {
    $(feld).addEventListener('change', (e) => {
      vergleichWahl = { ...vergleichWahl, [seite]: e.target.value };
      zeichneVergleich();
    });
  }
  $('#vergleich-sichern').addEventListener('click', sichereVergleich);
  $('#unterschied-schliessen').addEventListener('click', () => $('#unterschied-dialog').close());
  $('#unterschied-sichern').addEventListener('click', sichereUnterschied);
  $('#gebrauch-sichern').addEventListener('click', sichereGebrauch);
  $('#gebrauch-zuruecksetzen').addEventListener('click', () => {
    const knopf = $('#gebrauch-zuruecksetzen');
    // Zweimal drücken: eine Zählung ist in Wochen entstanden.
    if (!knopf.dataset.bestaetigt) {
      knopf.dataset.bestaetigt = 'ja';
      knopf.textContent = 'Wirklich zurücksetzen?';
      setTimeout(() => {
        delete knopf.dataset.bestaetigt;
        knopf.textContent = 'Zählung zurücksetzen';
      }, 4000);
      return;
    }
    setzeGebrauchZurueck();
    delete knopf.dataset.bestaetigt;
    knopf.textContent = 'Zählung zurücksetzen';
    zeichneGebrauch();
    meldeGebrauch('Die Zählung beginnt von vorn.', 'neutral');
  });
  $('#wortliste-sichern').addEventListener('click', sichereWortliste);
  $('#wortliste-zurueck').addEventListener('click', () => {
    wortliste = [...STANDARD_WORTLISTE];
    $('#wortliste-text').value = wortlisteAlsText(wortliste);
    sichereWortliste();
  });
}

verdrahtePruefung();

