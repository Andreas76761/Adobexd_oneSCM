/* =========================================================================
   Prüfung – drei Agenten über dem Bestand.

   Roter Faden, Audit und Empfehlung prüfen nach Regeln (im Kern, ohne DOM).
   Die Ansicht zeigt Kennzahlen, Befunde und zu jedem Befund den Weg dorthin:
   betroffene Bilder öffnen sich im Editor, eine Stelle führt in die
   Gliederung, eine Folge in die Strecke.

   Claude darf das Ergebnis kommentieren, wenn der Betrachter die Fähigkeit
   `sample` gibt. Der Kommentar steht als Kommentar da – die Befunde stehen
   fest, bevor er kommt.
   ========================================================================= */

let pruefErgebnisse = {}; // agent-id -> Ergebnis samt Kommentar
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
    [id]: { ...fuehreAgent(id, imProjekt(), GLIEDERUNG, strecken), gelaufen_am: new Date().toISOString() }
  };
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
  $('#pruef-bericht').disabled = !Object.keys(pruefErgebnisse).length;
  zeichneVergleich();
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
    el('td', { text: String(zeile.b) })
  ]);
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
    el('th', { scope: 'col', text: projektWahlText(vergleichWahl.b, liste) })
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
      `Drei Agenten gelaufen: ${zahl} Befund(e), davon ${fehler} Fehler.`,
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
}

verdrahtePruefung();

