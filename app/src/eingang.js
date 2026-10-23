/* =========================================================================
   Eingang – was aufgenommen wurde, bevor es ein Beleg ist.

   Die Liste der eigenen Aufnahmen: suchen, nachpflegen, zu einem Beleg
   verbinden, weitergeben. Dazu das Ordnerband des Archivs und der Dialog,
   in dem eine Aufnahme ihre Stelle und ihre Labels bekommt.

   Bis 1.53.0 stand dies in `aufnahme.js`, hinter dem Aufnahmestudio. Beide
   teilen sich eine Klammer und den Zustand `eingang`; die letzten Zeilen
   hier verdrahten darum beide Hälften – an derselben Stelle wie vorher.
   ========================================================================= */

/* ------------------------------------------------------ Eingang zeichnen */

function eingangKarte(aufnahme) {
  const vollstaendig = istVollstaendig(aufnahme);
  return el(
    'article',
    {
      klasse: 'eingang-karte' + (vollstaendig ? '' : ' eingang-karte--offen'),
      tabindex: '0',
      role: 'button',
      'data-id': aufnahme.id,
      'aria-label': `${aufnahme.titel} bearbeiten`,
      onclick: () => oeffneEingangDialog(aufnahme.id),
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          oeffneEingangDialog(aufnahme.id);
        }
      }
    },
    [
      el('div', { klasse: 'eingang-bild' }, [
        // Die Karte zeigt die bearbeitete Fassung, wenn es eine gibt - sonst
        // sähe man im Eingang noch, was längst abgedeckt sein soll.
        el('img', { src: anzeigeBild(aufnahme), alt: aufnahme.titel, loading: 'lazy' }),
        lupenKnopf(aufnahme.id),
        vollstaendig ? null : el('span', { klasse: 'offen-marke', text: 'unvollständig' }),
        // Ein Treffer, der nur in der Lesung steht, wird genannt - sonst
        // stünde eine Karte da, der man den Grund nicht ansieht.
        trefferAusLesung(aufnahme, eingangAuswahl.suche, ocrTexte)
          ? el('span', { klasse: 'lesung-marke', text: 'im Bildtext' })
          : null,
        leseFassungen(aufnahme).length
          ? el('span', { klasse: 'markiert-marke', text: `Fassung ${neuesteFassung(aufnahme).nummer}` })
          : null
      ]),
      el('div', { klasse: 'eingang-text' }, [
        el('div', { klasse: 'zeile-meta' }, [
          el('span', { klasse: 'kennung', text: kapitelKennung(aufnahme) ? `${kapitelKennung(aufnahme)} · ${aufnahme.id}` : aufnahme.id }),
          el('span', { klasse: 'kennung', text: formatiereDatum(aufnahme.datum) })
        ]),
        el('h3', { text: aufnahme.titel }),
        el('p', { klasse: 'eingang-pfad', text: [aufnahme.projekt, aufnahme.seite].filter(Boolean).join(' · ') || 'ohne Projekt' }),
        el('div', { klasse: 'marken' }, [
          aufnahme.kategorie
            ? el('span', { text: aufnahme.kategorie })
            : el('span', { klasse: 'marke-fehlt', text: 'Kategorie fehlt' }),
          ...(aufnahme.begriffe.length
            ? aufnahme.begriffe.slice(0, 4).map((b) => el('span', { text: '#' + b }))
            : [el('span', { klasse: 'marke-fehlt', text: 'keine Begriffe' })])
        ]),
        el('div', { klasse: 'eingang-karte-knoepfe' }, [
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            'data-editor': aufnahme.id,
            text: 'Im Editor bearbeiten',
            onclick: (e) => {
              e.stopPropagation();
              oeffneEditor(aufnahme.id);
            }
          })
        ])
      ])
    ]
  );
}

function zeichneEingang() {
  // Gezeigt wird die Arbeitsmenge; der Eingang selbst bleibt vollständig.
  const menge = imProjekt();
  // Gesucht wird auch in den Lesungen aus dem Register OCR: „Termintreue"
  // findet das Bild, auf dem das Wort steht (F-68).
  const gefiltert = sortiereEingang(filtereEingang(menge, eingangAuswahl, ocrTexte), eingangAuswahl.sortierung);
  const k = eingangKennzahlen(menge);

  $('#eingang-kennzahlen').replaceChildren(
    ...[
      ['Aufnahmen', String(k.anzahl)],
      ['Unvollständig', String(k.offen)],
      ['Projekte', String(k.projekte)],
      ['Begriffe', String(k.begriffe)],
      ['Speicher', formatiereBytes(k.bytes)]
    ].map(([schild, wert]) =>
      el('div', { klasse: 'eingang-kachel' }, [
        el('span', { klasse: 'kachel-schild', text: schild }),
        el('span', { klasse: 'eingang-kachel-wert', text: wert })
      ])
    )
  );

  for (const knopf of document.querySelectorAll('.eingang-zustand button')) {
    knopf.setAttribute('aria-pressed', String(knopf.dataset.zustand === eingangAuswahl.zustand));
  }
  $('#eingang-sortierung').value = eingangAuswahl.sortierung;
  $('#eingang-treffer').textContent =
    gefiltert.length === menge.length
      ? `${gefiltert.length} ${gefiltert.length === 1 ? 'Aufnahme' : 'Aufnahmen'}`
      : `${gefiltert.length} von ${menge.length} Aufnahmen`;

  $('#eingang-raster').replaceChildren(...gefiltert.map(eingangKarte));
  $('#eingang-leer').hidden = gefiltert.length > 0;
  $('#eingang-leer-text').textContent =
    eingang.length === 0
      ? 'Der Eingang ist leer. In der Ansicht „Aufnahme“ eine Quelle wählen, den Ausschnitt ziehen und die Leertaste drücken.'
      : menge.length === 0
        ? `Keine Aufnahme gehört zu „${projektWahlText(projektwahl, projekte)}“ – im Kopf eine andere Arbeitsmenge wählen.`
        : 'Keine Aufnahme passt zu dieser Auswahl.';
  $('#eingang-kontaktbogen').disabled = gefiltert.length === 0;
  $('#eingang-sichern').disabled = gefiltert.length === 0;
  $('#eingang-leeren').disabled = eingang.length === 0;
  // Die Projektliste zählt die Bilder je Projekt - sie gehört mit aktualisiert.
  zeichneProjekte();
}

/* ----------------------------------------------- Werkbank: Beleg bilden */

let belegEntwurf = null; // Arbeitsstand der Werkbank
let belegPaar = { vorher: '', nachher: '' }; // Kennungen der beiden Aufnahmen

/** Öffnet die Werkbank; zwei Aufnahmen werden vorgeschlagen, nicht gesetzt. */
function oeffneWerkbank() {
  if (eingang.length < 2) {
    meldeEingang('Für einen Beleg braucht es zwei Aufnahmen im Eingang – vorher und nachher.', 'warnung');
    return;
  }
  if (!belegPaar.vorher || !belegPaar.nachher) {
    // Aelteste als vorher, neueste als nachher - der haeufige Fall.
    const nachDatum = [...eingang].sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
    belegPaar = { vorher: nachDatum[0].id, nachher: nachDatum[nachDatum.length - 1].id };
  }
  belegEntwurf = null;
  $('#beleg-werkbank').hidden = false;
  zeichneWerkbank();
  $('#beleg-werkbank').scrollIntoView({ block: 'nearest' });
  const erstes = $('#beleg-vorher');
  if (erstes) erstes.focus({ preventScroll: true });
}

function schliesseWerkbank() {
  $('#beleg-werkbank').hidden = true;
  const knopf = document.getElementById('beleg-oeffnen');
  if (knopf) knopf.focus({ preventScroll: true });
}

const belegAufnahme = (kennung) => eingang.find((a) => a.id === kennung) || null;

/** Baut die Werkbank neu: Paarwahl, Vorschau, Formular, Prüfung. */
function zeichneWerkbank() {
  if ($('#beleg-werkbank').hidden) return;
  const vorher = belegAufnahme(belegPaar.vorher);
  const nachher = belegAufnahme(belegPaar.nachher);
  if (!belegEntwurf) belegEntwurf = leererBelegentwurf(vorher || {}, nachher || {});

  const wahl = (rolle) =>
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'beleg-' + rolle, text: rolle === 'vorher' ? 'Aufnahme vorher' : 'Aufnahme nachher' }),
      el(
        'select',
        {
          id: 'beleg-' + rolle,
          onchange: (e) => {
            belegPaar = { ...belegPaar, [rolle]: e.target.value };
            zeichneWerkbank();
          }
        },
        [
          el('option', { value: '', text: 'nicht gewählt' }),
          ...eingang.map((a) =>
            el('option', {
              value: a.id,
              text: `${a.id} · ${a.datum} · ${a.titel}`,
              selected: a.id === belegPaar[rolle]
            })
          )
        ]
      )
    ]);

  const seite = (rolle, aufnahme) =>
    el('div', { klasse: 'beleg-seite' }, [
      el('span', { klasse: `aufnahme-schild aufnahme-schild--${rolle === 'vorher' ? 'v' : 'n'}`, text: rolle }),
      aufnahme
        ? el('img', { src: aufnahme.bild || PLATZHALTER_BILD, alt: `${rolle}: ${aufnahme.titel}` })
        : el('p', { klasse: 'feld-hinweis', text: 'keine Aufnahme gewählt' }),
      wahl(rolle)
    ]);

  $('#beleg-paar').replaceChildren(seite('vorher', vorher), seite('nachher', nachher));
  $('#beleg-form').replaceChildren(...werkbankFelder());
  $('#beleg-stand').textContent = `${eingang.length} Aufnahmen im Eingang`;
  pruefeWerkbank(false);
}

/** Ein Textfeld der Werkbank; der Wert geht unmittelbar in den Entwurf. */
function werkbankFeld(schluessel, beschriftung, { mehrzeilig = false, platzhalter = '', typ = 'text' } = {}) {
  const gemeinsam = {
    id: 'beleg-feld-' + schluessel,
    placeholder: platzhalter,
    oninput: (e) => {
      belegEntwurf[schluessel] = e.target.value;
      pruefeWerkbank(false);
    }
  };
  const eingabe = mehrzeilig
    ? el('textarea', { ...gemeinsam, rows: '3', value: belegEntwurf[schluessel] || '' })
    : el('input', { ...gemeinsam, type: typ, value: belegEntwurf[schluessel] || '' });
  return el('div', { klasse: 'feld' }, [el('label', { for: gemeinsam.id, text: beschriftung }), eingabe]);
}

function werkbankWahl(schluessel, beschriftung, werte, leerText) {
  const id = 'beleg-feld-' + schluessel;
  return el('div', { klasse: 'feld' }, [
    el('label', { for: id, text: beschriftung }),
    el(
      'select',
      {
        id,
        onchange: (e) => {
          belegEntwurf[schluessel] = e.target.value;
          pruefeWerkbank(false);
        }
      },
      [
        leerText ? el('option', { value: '', text: leerText }) : null,
        ...werte.map((w) =>
          el('option', {
            value: w.id || w,
            text: w.label || w,
            selected: (w.id || w) === belegEntwurf[schluessel]
          })
        )
      ]
    )
  ]);
}

function werkbankFelder() {
  return [
    werkbankFeld('titel', 'Titel des Belegs', { platzhalter: 'Was wurde besser – in einem Satz' }),
    el('div', { klasse: 'feld-paar' }, [
      werkbankWahl('projekt', 'Projekt', VOKABULAR.projekte, 'ohne Projekt'),
      werkbankFeld('seite', 'Seite', { platzhalter: '/portal/uebersicht' })
    ]),
    el('div', { klasse: 'feld-paar' }, [
      werkbankWahl('kategorie', 'Kategorie', VOKABULAR.kategorien, 'ohne Kategorie'),
      werkbankWahl('status', 'Status', VOKABULAR.status, null)
    ]),
    el('div', { klasse: 'feld-paar' }, [
      werkbankWahl('viewport', 'Viewport', VOKABULAR.viewports, 'ohne Viewport'),
      werkbankFeld('datum', 'Datum der Nachher-Aufnahme', { typ: 'date' })
    ]),
    el('div', { klasse: 'feld-paar' }, [
      werkbankFeld('browser', 'Browser', { platzhalter: 'Chrome 141' }),
      werkbankFeld('autor', 'Autor', { platzhalter: 'M. Ackermann' })
    ]),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'beleg-feld-tags', text: 'Schlagworte' }),
      el('input', {
        type: 'text',
        id: 'beleg-feld-tags',
        value: begriffeAlsText(belegEntwurf.tags),
        placeholder: 'kontrast, navigation',
        oninput: (e) => {
          belegEntwurf.tags = e.target.value.split(',');
          pruefeWerkbank(false);
        }
      })
    ]),
    el('h3', { klasse: 'abschnitt-titel', text: 'Begründung' }),
    werkbankFeld('anlass', 'Anlass – welches Problem war zu sehen, woher weiß man das', { mehrzeilig: true }),
    werkbankFeld('aenderung', 'Änderung – was wurde konkret anders gemacht', { mehrzeilig: true }),
    werkbankFeld('wirkung', 'Wirkung – was kam heraus', { mehrzeilig: true }),
    werkbankFeld('quelle', 'Quelle – Test, Audit, Telemetrie, Ticket, mit Datum oder Kennung'),
    el('h3', { klasse: 'abschnitt-titel', text: 'Kennzahlen' }),
    ...belegEntwurf.metriken.map(werkbankMetrik),
    el('button', {
      klasse: 'knopf knopf--klein',
      type: 'button',
      id: 'beleg-metrik-mehr',
      text: 'Kennzahl hinzufügen',
      onclick: () => {
        belegEntwurf.metriken = [
          ...belegEntwurf.metriken,
          { name: '', einheit: '', vorher: '', nachher: '', richtung: 'groesser_besser' }
        ];
        zeichneWerkbank();
      }
    })
  ];
}

/** Eine Kennzahlzeile. Die Wirkung steht daneben, sobald beide Werte da sind. */
function werkbankMetrik(metrik, nummer) {
  const n = nummer + 1;
  const feld = (schluessel, beschriftung, platzhalter) => {
    const id = `beleg-metrik-${schluessel}-${n}`;
    return el('div', { klasse: 'feld' }, [
      el('label', { for: id, text: beschriftung }),
      el('input', {
        type: 'text',
        id,
        value: metrik[schluessel] ?? '',
        placeholder: platzhalter || '',
        oninput: (e) => {
          metrik[schluessel] = e.target.value;
          zeigeMetrikWirkung(n, metrik);
          pruefeWerkbank(false);
        }
      })
    ]);
  };
  return el('div', { klasse: 'beleg-metrik' }, [
    feld('name', `Kennzahl ${n}`, 'Kontrastverhältnis'),
    feld('einheit', 'Einheit', ':1'),
    feld('vorher', 'vorher', '2,8'),
    feld('nachher', 'nachher', '5,1'),
    el('div', { klasse: 'feld' }, [
      el('label', { for: `beleg-metrik-richtung-${n}`, text: 'Richtung' }),
      el(
        'select',
        {
          id: `beleg-metrik-richtung-${n}`,
          onchange: (e) => {
            metrik.richtung = e.target.value;
            zeigeMetrikWirkung(n, metrik);
            pruefeWerkbank(false);
          }
        },
        RICHTUNGEN.map((r) => el('option', { value: r.id, text: r.label, selected: r.id === metrik.richtung }))
      )
    ]),
    el('span', { klasse: 'beleg-wirkung', id: `beleg-metrik-wirkung-${n}`, text: metrikWirkungText(metrik) })
  ]);
}

function metrikWirkungText(metrik) {
  const zahlen = metrikenAusEntwurf({ metriken: [metrik] });
  if (!zahlen.length) return '';
  const wert = verbesserung(zahlen[0]);
  return Number.isFinite(wert) ? formatiereWirkung(wert) : '';
}

function zeigeMetrikWirkung(nummer, metrik) {
  const zeile = document.getElementById(`beleg-metrik-wirkung-${nummer}`);
  if (zeile) zeile.textContent = metrikWirkungText(metrik);
}

/** Zeigt, was noch fehlt. Erst beim Sichern wird daraus eine Absage. */
function pruefeWerkbank(laut) {
  const vorher = belegAufnahme(belegPaar.vorher);
  const nachher = belegAufnahme(belegPaar.nachher);
  const probleme = pruefeBelegentwurf(belegEntwurf, vorher, nachher, VOKABULAR);
  const zeile = $('#beleg-probleme');
  zeile.hidden = probleme.length === 0;
  zeile.textContent = probleme.length
    ? `Es fehlt noch: ${probleme.map((p) => p.text).join(' ')}`
    : '';
  $('#beleg-sichern').disabled = probleme.length > 0;
  if (laut && probleme.length) {
    const feld = document.getElementById('beleg-feld-' + probleme[0].feld) || document.getElementById('beleg-' + probleme[0].feld);
    if (feld) feld.focus({ preventScroll: false });
  }
  return probleme;
}

/** Sichert den Entwurf als JSON - der Weg in den Bestand führt über das Projekt. */
async function sichereBelegentwurf() {
  const probleme = pruefeWerkbank(true);
  if (probleme.length) return;
  const vorher = belegAufnahme(belegPaar.vorher);
  const nachher = belegAufnahme(belegPaar.nachher);
  const kennung = naechsteBelegKennung(DATEN.eintraege, belegEntwurf.datum);
  const entwurf = baueBelegentwurf({
    entwurf: belegEntwurf,
    vorher,
    nachher,
    kennung,
    anwendung: DATEN.anwendung
  });
  const name = `belegentwurf-${kennung.toLowerCase()}.json`;
  const ergebnis = await uebergebeDatei(name, JSON.stringify(entwurf, null, 2));
  const meldung = $('#beleg-meldung');
  if (ergebnis.art === 'gesichert') {
    meldung.textContent = `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – im Projekt fehlt nur noch screen.`;
    meldung.className = 'feld-hinweis zettel-meldung--gut';
    return;
  }
  if (ergebnis.art === 'zu_gross') {
    meldung.textContent = `Der Entwurf ist mit ${formatiereBytes(ergebnis.groesse)} zu groß zum Sichern.`;
  } else if (ergebnis.art === 'ohne') {
    zeigeErsatzausgabe(
      'Diese Ansicht darf keine Dateien ablegen. Der Belegentwurf steht hier zum Herausnehmen:',
      JSON.stringify(entwurf, null, 2)
    );
    return;
  } else {
    meldung.textContent = 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.';
  }
  meldung.className = 'feld-hinweis zettel-meldung--warnung';
}

/* ------------------------------------------------------- Eingangsdialog */

/**
 * Der Knopf, der den Beipackzettel im Ordner nachzieht. Er steht nur bei
 * Aufnahmen, die aus einer Datei stammen - und sagt, wenn der Ordner dafuer
 * nicht offen ist, statt stumm zu bleiben.
 */
function zettelNachKnopf(aufnahme, sichern) {
  const ziel = zettelZiel(aufnahme, ordnerZugriff ? ordnerZugriff.name : '');
  if (!aufnahme.herkunft || !aufnahme.herkunft.datei) return null;
  if (!ziel.moeglich) {
    return el('p', { klasse: 'feld-hinweis', id: 'bearbeite-zettel-hinweis', text: ziel.grund });
  }
  return el('button', {
    klasse: 'knopf',
    type: 'button',
    id: 'bearbeite-zettel',
    text: `Zettel ${ziel.datei} neu schreiben`,
    onclick: async (e) => {
      const gepflegt = sichern();
      if (!gepflegt) return;
      e.target.disabled = true;
      const ergebnis = await schreibeZettelNach(gepflegt);
      e.target.disabled = false;
      // Der Dialog bleibt offen - die Rueckmeldung muss darin stehen.
      const zeile = document.getElementById('bearbeite-meldung');
      if (zeile) {
        zeile.textContent = ergebnis.text;
        zeile.className = 'feld-hinweis ' + (ergebnis.ok ? 'zettel-meldung--gut' : 'zettel-meldung--warnung');
      }
      meldeEingang(ergebnis.text, ergebnis.ok ? 'gut' : 'warnung');
      if (ergebnis.ok) {
        zeichneEingang();
        zeigeOrdnerImArchiv();
      }
    }
  });
}

/** Kurzform der Marken für die Karte im Eingang. */
function markenKurz(liste) {
  const z = markenZusammenfassung(leseMarken(liste));
  const teile = [];
  if (z.unkenntlich) teile.push(`${z.unkenntlich}× abgedeckt`);
  if (z.schritte) teile.push(`${z.schritte} Schritte`);
  if (!teile.length && z.rahmen) teile.push(`${z.rahmen} Rahmen`);
  return teile.join(' · ');
}

function oeffneEingangDialog(kennung) {
  const aufnahme = eingang.find((a) => a.id === kennung);
  if (!aufnahme) return;
  bearbeitet = kennung;
  const arbeitskopie = { ...aufnahme, begriffe: [...aufnahme.begriffe] };

  const feld = (beschriftung, kind) => el('div', { klasse: 'feld' }, [el('label', { text: beschriftung }), kind]);
  const text = (schluessel, platzhalter, typ = 'text') =>
    el('input', {
      type: typ,
      value: arbeitskopie[schluessel] || '',
      placeholder: platzhalter || '',
      id: 'bearbeite-' + schluessel,
      oninput: (e) => (arbeitskopie[schluessel] = e.target.value)
    });
  const auswahl = (schluessel, werte, leerText) =>
    el(
      'select',
      { id: 'bearbeite-' + schluessel, onchange: (e) => (arbeitskopie[schluessel] = e.target.value) },
      [
        leerText ? el('option', { value: '', text: leerText }) : null,
        ...werte.map((w) =>
          el('option', { value: w.id || w, text: w.label || w, selected: (w.id || w) === arbeitskopie[schluessel] })
        )
      ]
    );

  $('#eingang-dialog-inhalt').replaceChildren(
    el('div', { klasse: 'bearbeiten-bild' }, [
      el('img', { src: aufnahme.bild || PLATZHALTER_BILD, alt: aufnahme.titel }),
      el('p', { klasse: 'quelle', text: `${quelleArtName(aufnahme.quelle.art)}: ${aufnahme.quelle.name || '–'} · Ausschnitt ${aufnahme.ausschnitt.breite} × ${aufnahme.ausschnitt.hoehe} bei x ${aufnahme.ausschnitt.x}, y ${aufnahme.ausschnitt.y}` })
    ]),
    el('form', { klasse: 'bearbeiten-form', id: 'bearbeiten-form' }, [
      feld('Titel', text('titel')),
      el('div', { klasse: 'feld-paar' }, [feld('Projekt', text('projekt', 'oneSCM Portal')), feld('Seite', text('seite', '/portal/…'))]),
      // Version und Land gehören zum Projekt: dieselbe Maske sieht in 2.3
      // anders aus als in 2.4 und in Korea anders als in Deutschland.
      el('div', { klasse: 'feld-paar' }, [
        feld('Version', text('version', '2.4')),
        feld('Land', text('land', 'Germany'))
      ]),
      el('div', { klasse: 'feld-paar' }, [
        feld('Kategorie', auswahl('kategorie', VOKABULAR.kategorien, 'ohne Kategorie')),
        feld('Status', auswahl('status', VOKABULAR.status, null))
      ]),
      el('div', { klasse: 'feld-paar' }, [feld('Datum', text('datum', '', 'date')), feld('Rolle', auswahl('rolle', ROLLEN, null))]),
      feld(
        'Begriffe',
        el('input', {
          type: 'text',
          id: 'bearbeite-begriffe',
          value: begriffeAlsText(arbeitskopie.begriffe),
          placeholder: 'kontrast, navigation',
          oninput: (e) => (arbeitskopie.begriffe = e.target.value.split(','))
        })
      ),
      feld(
        'Notiz',
        el('textarea', { id: 'bearbeite-notiz', rows: '3', oninput: (e) => (arbeitskopie.notiz = e.target.value) })
      ),
      // Dieselben Labels wie im Editor - wer hier schon ordnet, muss nicht
      // dorthin wechseln. Die Stelle im Handbuch steht daneben.
      feld(
        'Stelle im Handbuch',
        el('span', { klasse: 'feld-mit-liste' }, [
          el('input', {
            type: 'text',
            id: 'bearbeite-gliederung',
            value: arbeitskopie.gliederung || '',
            list: 'vorschlag-bearbeite-stelle',
            placeholder: '7.5.2',
            oninput: (e) => {
              const roh = String(e.target.value || '').trim();
              arbeitskopie.gliederung = (roh.match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0];
            }
          }),
          el(
            'datalist',
            { id: 'vorschlag-bearbeite-stelle' },
            sucheGliederung(GLIEDERUNG, '')
              .slice(0, 300)
              .map((e) => el('option', { value: e.nummer, text: e.thema }))
          )
        ])
      ),
      el(
        'div',
        { klasse: 'label-felder' },
        LABEL_FELDER.filter((f) => ['sprache', 'rolle_label', 'sparte', 'markt'].includes(f.id)).map((f) =>
          feld(
            f.label,
            f.frei
              ? text(f.id, 'Germany')
              : auswahl(
                  f.id,
                  f.werte.map((w) => ({ id: w.id, label: w.lang ? `${w.label} – ${w.lang}` : w.label })),
                  'ohne ' + f.label
                )
          )
        )
      )
    ]),
    el('div', { klasse: 'bearbeiten-aktionen' }, [
      el('button', {
        klasse: 'knopf knopf--haupt',
        type: 'button',
        id: 'bearbeite-speichern',
        text: 'Änderungen sichern',
        onclick: () => {
          if (!sichereBearbeitung()) return;
          $('#eingang-dialog').close();
          zeichneEingang();
          meldeEingang(`${kennung} aktualisiert.`, 'gut');
        }
      }),
      zettelNachKnopf(aufnahme, () => sichereBearbeitung()),
      aufnahme.herkunft && aufnahme.herkunft.datei
        ? el('p', { klasse: 'feld-hinweis', id: 'bearbeite-meldung' })
        : null,
      el('button', {
        klasse: 'knopf',
        type: 'button',
        id: 'bearbeite-loeschen',
        text: 'Aufnahme löschen',
        onclick: () => {
          eingang = eingang.filter((a) => a.id !== kennung);
          sichereEingang();
          $('#eingang-dialog').close();
          zeichneEingang();
          zeigeAnsicht();
          meldeEingang(`${kennung} gelöscht.`, 'neutral');
        }
      })
    ])
  );
  /** Übernimmt die Arbeitskopie in den Eingang. Rückgabe: der gesicherte Stand. */
  function sichereBearbeitung() {
    const gepflegt = {
      ...arbeitskopie,
      titel: String(arbeitskopie.titel || '').trim() || aufnahme.titel,
      begriffe: normalisiereBegriffe(arbeitskopie.begriffe),
      datum: istGueltigesDatum(arbeitskopie.datum) ? arbeitskopie.datum : aufnahme.datum
    };
    eingang = eingang.map((a) => (a.id === kennung ? gepflegt : a));
    const ergebnis = sichereEingang();
    if (!ergebnis.ok) {
      meldeEingang(ergebnis.text, 'warnung');
      return null;
    }
    return gepflegt;
  }

  const dialogTitel = $('#eingang-dialog-titel');
  dialogTitel.textContent = `${aufnahme.id} bearbeiten`;
  const dialog = $('#eingang-dialog');
  if (!dialog.open) dialog.showModal();
  const erstes = $('#bearbeite-titel');
  if (erstes) erstes.focus();
}

function meldeEingang(text, art = 'neutral') {
  const feld = $('#eingang-meldung');
  feld.textContent = text;
  feld.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------- Sichern */

/** Beschreibt die gerade sichtbare Auswahl in einem Satz. */
function auswahlText() {
  const teile = [];
  if (eingangAuswahl.suche) teile.push(`Suche „${eingangAuswahl.suche}“`);
  if (eingangAuswahl.zustand !== 'alle') {
    teile.push((EINGANG_ZUSTAENDE.find((z) => z.id === eingangAuswahl.zustand) || {}).label || eingangAuswahl.zustand);
  }
  return teile.join(', ');
}

/** Die sichtbare Auswahl - gesichert wird, was man sieht. */
const sichtbareAufnahmen = () =>
  sortiereEingang(filtereEingang(imProjekt(), eingangAuswahl, ocrTexte), eingangAuswahl.sortierung);

/**
 * Übergibt eine Datei an die Ablagefähigkeit des Artifacts.
 * Jeder Ausgang ist benannt; der Vertrag verlangt, dass nichts still scheitert
 * und abgelehnte Formate keinen Ersatzweg anstoßen.
 */
async function uebergebeDatei(name, daten) {
  const groesse = new Blob([daten]).size;
  if (groesse > HOECHSTGROESSE_DATEI) return { art: 'zu_gross', groesse };
  const downloads = await holeFaehigkeit('downloads');
  if (!downloads || typeof downloads.save !== 'function') return { art: 'ohne', groesse };
  try {
    await downloads.save({ filename: name, data: daten });
    return { art: 'gesichert', groesse };
  } catch (fehler) {
    return { art: 'fehler', code: (fehler && fehler.code) || 'unavailable', groesse };
  }
}

/** Meldet das Ergebnis; gibt true zurück, wenn der Ersatzweg gezeigt werden soll. */
function meldeAblage(ergebnis, name) {
  if (ergebnis.art === 'gesichert') {
    meldeEingang(`${name} gesichert (${formatiereBytes(ergebnis.groesse)}).`, 'gut');
    return false;
  }
  if (ergebnis.art === 'zu_gross') {
    meldeEingang(
      `Die Datei ist mit ${formatiereBytes(ergebnis.groesse)} zu groß – die Grenze liegt bei 16 MB. Bitte die Auswahl einschränken.`,
      'warnung'
    );
    return false;
  }
  const nachSchluessel = {
    declined: 'Das Sichern wurde abgebrochen.',
    rate_limited: 'Es ist noch eine Abfrage offen – bitte gleich noch einmal.',
    too_large: 'Die Datei ist zu groß – bitte die Auswahl einschränken.',
    rejected_extension: 'Dieses Dateiformat lässt sich hier nicht ablegen.',
    extension_not_enabled: 'Dieses Dateiformat ist in dieser Ansicht nicht verfügbar.'
  };
  if (ergebnis.code && nachSchluessel[ergebnis.code]) {
    meldeEingang(nachSchluessel[ergebnis.code], 'warnung');
    return false;
  }
  return true; // keine Ablage möglich - Ersatzweg anbieten
}

/** Alle sichtbaren Aufnahmen als ein Kontaktbogen: eine Datei, alle Bilder. */
async function sichereKontaktbogen() {
  const liste = sichtbareAufnahmen();
  if (!liste.length) return;
  const name = `screenarchiv-kontaktbogen-${heute()}.html`;
  const blatt = baueKontaktbogen(liste, { stand: heute(), auswahl: auswahlText(), gesamt: eingang.length });
  meldeEingang('Kontaktbogen wird vorbereitet …', 'neutral');
  const ergebnis = await uebergebeDatei(name, blatt);
  if (meldeAblage(ergebnis, `${liste.length} Aufnahmen als Kontaktbogen`)) {
    zeigeErsatzausgabe(
      'Diese Ansicht darf keine Datei ablegen. Der Kontaktbogen lässt sich hier nicht übergeben – unten stehen die Metadaten zum Herauskopieren, die Bilder bleiben im Browser gespeichert.'
    );
  }
}

async function sichereAlsDatei() {
  const liste = sichtbareAufnahmen();
  if (!liste.length) return;
  const name = `screenarchiv-eingang-${heute()}.json`;
  const ergebnis = await uebergebeDatei(name, eingangAlsExport(liste, heute(), true));
  // Ohne Bilder ist das eine Sicherung, kein Weg zum Weitergeben - wer die
  // Datei verschickt, erzeugt beim Empfänger leere Karten.
  if (meldeAblage(ergebnis, `${liste.length} Aufnahmen als ${name} – nur die Metadaten, ohne Bilder. Zum Weitergeben die Projektdatei im Verzeichnis.`)) {
    zeigeErsatzausgabe();
  }
}

/** Ohne Ablagefähigkeit: Metadaten zum Herauskopieren anzeigen. */
function zeigeErsatzausgabe(hinweis, inhalt) {
  const dialog = $('#eingang-dialog');
  $('#eingang-dialog-titel').textContent = 'Eingang sichern';
  $('#eingang-dialog-inhalt').replaceChildren(
    el('p', {
      klasse: 'hinweis-archiv',
      text:
        hinweis ||
        'Diese Ansicht darf keine Datei ablegen. Die Metadaten stehen unten zum Herauskopieren – die Bilder bleiben im Browser gespeichert.'
    }),
    el('textarea', {
      klasse: 'ausgabe',
      id: 'eingang-ausgabe',
      rows: '16',
      readonly: true,
      value: inhalt || eingangAlsExport(sichtbareAufnahmen(), heute(), false)
    })
  );
  if (!dialog.open) dialog.showModal();
  const feld = $('#eingang-ausgabe');
  feld.focus();
  feld.select();
}

/* ----------------------------------------------- Verdrahtung des Eingangs */

function verdrahteEingang() {
  $('#eingang-suche').addEventListener('input', (e) => {
    eingangAuswahl = { ...eingangAuswahl, suche: e.target.value };
    zeichneEingang();
  });
  for (const knopf of document.querySelectorAll('.eingang-zustand button')) {
    knopf.addEventListener('click', () => {
      eingangAuswahl = { ...eingangAuswahl, zustand: knopf.dataset.zustand };
      zeichneEingang();
    });
  }
  $('#eingang-sortierung').replaceChildren(
    ...EINGANG_SORTIERUNGEN.map((s) => el('option', { value: s.id, text: s.label }))
  );
  $('#eingang-sortierung').addEventListener('change', (e) => {
    eingangAuswahl = { ...eingangAuswahl, sortierung: e.target.value };
    zeichneEingang();
  });
  $('#eingang-kontaktbogen').addEventListener('click', sichereKontaktbogen);
  $('#eingang-sichern').addEventListener('click', sichereAlsDatei);
  // Zwei der vier Wege liegen in anderen Ansichten - die Übersicht führt hin,
  // statt sie hierher zu kopieren.
  $('#weg-paket').addEventListener('click', () => setze({ ansicht: 'verzeichnis' }));
  $('#weg-marke').addEventListener('click', () => {
    setze({ ansicht: 'design' });
    const studio = document.getElementById('design-studio');
    if (studio) studio.open = true;
  });
  $('#eingang-leeren').addEventListener('click', () => {
    if (!eingang.length) return;
    if (!$('#eingang-leeren').dataset.bestaetigt) {
      $('#eingang-leeren').dataset.bestaetigt = 'ja';
      $('#eingang-leeren').textContent = 'Wirklich alle löschen?';
      setTimeout(() => {
        const knopf = $('#eingang-leeren');
        delete knopf.dataset.bestaetigt;
        knopf.textContent = 'Eingang leeren';
      }, 4000);
      return;
    }
    eingang = [];
    sichereEingang();
    delete $('#eingang-leeren').dataset.bestaetigt;
    $('#eingang-leeren').textContent = 'Eingang leeren';
    zeichneEingang();
    zeigeAnsicht();
    meldeEingang('Der Eingang wurde geleert.', 'neutral');
  });
  $('#eingang-dialog-schliessen').addEventListener('click', () => $('#eingang-dialog').close());
  $('#zum-eingang').addEventListener('click', () => setze({ ansicht: 'eingang' }));
  $('#ordner-auffrischen').addEventListener('click', zeigeOrdnerImArchiv);
  zeigeFaehigkeiten();
  $('#beleg-oeffnen').addEventListener('click', oeffneWerkbank);
  $('#beleg-zu').addEventListener('click', schliesseWerkbank);
  $('#beleg-sichern').addEventListener('click', sichereBelegentwurf);
  $('#letzte-editor').addEventListener('click', () => {
    if (letzte && letzte.id) oeffneEditor(letzte.id);
  });
  $('#zettel-zu').addEventListener('click', () => verbergeZettel(true));
  $('#zettel-uebernehmen').addEventListener('click', uebernimmAusOrdner);
  // Esc schliesst die Schau, solange der Fokus darin steht.
  $('#ordner-zettel').addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    verbergeZettel(true);
  });
  $('#ordner-mehr').addEventListener('click', () => {
    ordnerGrenze += 12;
    zeigeOrdnerImArchiv();
  });
  let suchTakt = null;
  $('#ordner-suche').addEventListener('input', (e) => {
    ordnerSuche = e.target.value;
    ordnerGrenze = 12;
    clearTimeout(suchTakt);
    suchTakt = setTimeout(zeigeOrdnerImArchiv, 180);
  });
}

// Beide Hälften an einer Stelle – da, wo bis 1.53.0 die eine Verdrahtung
// stand. `verdrahteAufnahme()` steht in `aufnahme.js`; Funktionserklärungen
// werden vorgezogen, darum ist sie hier erreichbar.
verdrahteAufnahme();
verdrahteEingang();

