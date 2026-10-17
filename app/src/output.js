/* =========================================================================
   Output – fertige Dokumente in mehreren Sprachen, Rollen und Sparten.

   Ein Dokument ist Vorlage × Inhalt × Variante. Der Plan steht im Kern
   (`ausgabePlan`); gezeichnet wird mit demselben Studio wie im Register
   Design - `baueBlaetter()` wird dafür kurz auf den Auftrag gestellt und
   danach zurückgesetzt. So kann die Ausgabe hier nicht anders aussehen als
   die Vorschau dort.

   Gesichert wird als PDF, Word, PowerPoint oder HTML; „In den Ordner
   schreiben" legt alles unter output/<Variante>/<Vorlage>/ ab.
   ========================================================================= */

let outputWahl = {
  vorlagen: ['quickguide'],
  inhalte: [],
  achse: 'sprache',
  werte: [],
  formate: ['pdf']
};
let outputPlan = [];
let outputFertig = new Map(); // Auftragskennung -> { blaetter, seiten }
let outputSchau = ''; // welcher Auftrag in der Vorschau liegt
let outputLaeuft = false;

function meldeOutput(text, art = 'neutral') {
  const zeile = $('#output-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/** Die Werte, die eine Achse im Bestand überhaupt hat. */
function outputWerte(achse) {
  if (!achse) return [];
  return [...new Set(imProjekt().map((a) => String(a[achse] || '')).filter(Boolean))].sort((a, b) =>
    labelWert(achse, a).localeCompare(labelWert(achse, b))
  );
}

/** Ein Kästchen mit Beschriftung; die Wahl steht in `outputWahl`. */
function kaestchen(feld, wert, text, zahl = null) {
  const id = `output-${feld}-${bereinigeDateiname(wert) || 'leer'}`;
  return el('label', { klasse: 'output-kaestchen-feld', for: id }, [
    el('input', {
      type: 'checkbox',
      id,
      checked: (outputWahl[feld] || []).includes(wert),
      onchange: (e) => {
        const bisher = outputWahl[feld] || [];
        outputWahl = {
          ...outputWahl,
          [feld]: e.target.checked ? [...bisher, wert] : bisher.filter((w) => w !== wert)
        };
        zeichneOutput();
      }
    }),
    el('span', { text }),
    zahl === null ? null : el('span', { klasse: 'kennung', text: String(zahl) })
  ]);
}

function zeichneOutputWahl() {
  const vorlagen = alleVorlagen(studio.eigene);
  $('#output-vorlagen').replaceChildren(
    ...vorlagen.map((v) => kaestchen('vorlagen', v.id, v.eigen ? `${v.label} (eigene)` : v.label))
  );

  // Die Inhalte stehen nach Kapiteln geordnet: erst die Strecken, dann je
  // Kapitel seine Stellen mit Bildern. Eine flache Liste mit 1153 Stellen
  // wäre keine Auswahl.
  const quellen = designQuellen();
  const strecken1 = quellen.filter((q) => q.id.startsWith('strecke:'));
  const stellen = quellen.filter((q) => q.id.startsWith('kapitel:'));
  const nachKapitel = new Map();
  for (const q of stellen) {
    const nummer = q.id.slice(8);
    const kopf = String(nummer).split('.')[0];
    const eintrag = GLIEDERUNG.find((e) => e.nummer === kopf);
    const schild = eintrag ? `${eintrag.nummer} ${eintrag.thema}` : `Kapitel ${kopf}`;
    nachKapitel.set(schild, [...(nachKapitel.get(schild) || []), q]);
  }
  const auswahlZeile = (q) =>
    el('option', { value: q.id, text: q.label, selected: outputWahl.inhalte.includes(q.id) });
  $('#output-inhalte').replaceChildren(
    ...(quellen.length
      ? [
          ...(strecken1.length
            ? [el('optgroup', { label: 'Strecken' }, strecken1.map(auswahlZeile))]
            : []),
          ...[...nachKapitel].map(([schild, liste]) =>
            el('optgroup', { label: schild }, liste.map(auswahlZeile))
          )
        ]
      : [el('option', { value: '', text: 'noch keine Strecke und kein Kapitel mit Bildern' })])
  );

  $('#output-achse').replaceChildren(
    el('option', { value: '', text: 'keine – ein Dokument je Inhalt', selected: !outputWahl.achse }),
    ...VARIANTEN_FELDER.map((feld) =>
      el('option', {
        value: feld,
        text: (LABEL_FELDER.find((f) => f.id === feld) || { label: feld }).label,
        selected: feld === outputWahl.achse
      })
    )
  );

  const werte = outputWerte(outputWahl.achse);
  // Was es nicht mehr gibt, bleibt nicht angekreuzt.
  const gueltig = outputWahl.werte.filter((w) => werte.includes(w));
  if (gueltig.length !== outputWahl.werte.length) outputWahl = { ...outputWahl, werte: gueltig };
  $('#output-werte').replaceChildren(
    ...(werte.length
      ? werte.map((wert) =>
          kaestchen('werte', wert, labelWert(outputWahl.achse, wert), imProjekt().filter((a) => String(a[outputWahl.achse] || '') === wert).length)
        )
      : [
          el('p', {
            klasse: 'feld-hinweis',
            text: outputWahl.achse
              ? 'Kein Bild trägt diese Angabe – im Editor oder im Eingang nachtragen.'
              : 'Ohne Achse entsteht ein Dokument je Inhalt.'
          })
        ])
  );

  $('#output-formate').replaceChildren(
    ...AUSGABE_FORMATE.map((f) => kaestchen('formate', f.id, f.label))
  );
}

/** Die Tabelle der geplanten Dokumente. */
function zeichneOutputListe() {
  const kasten = $('#output-liste');
  if (!outputPlan.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: 'Noch kein Dokument geplant: links eine Vorlage, einen Inhalt und – wenn gewünscht – eine Achse mit Werten wählen.'
      })
    );
    return;
  }
  kasten.replaceChildren(
    el('table', { klasse: 'matrix-gitter output-gitter' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col', text: 'Dokument' }),
        el('th', { scope: 'col', text: 'Kapitel' }),
        el('th', { scope: 'col', text: 'Vorlage' }),
        el('th', { scope: 'col', text: 'Variante' }),
        el('th', { scope: 'col', text: 'Labels' }),
        el('th', { scope: 'col', text: 'Bilder' }),
        el('th', { scope: 'col', text: 'Blätter' }),
        el('th', { scope: 'col', text: 'Vorschau' })
      ])),
      el('tbody', {}, outputPlan.map(outputZeile))
    ])
  );
}

function outputZeile(auftrag) {
  const fertig = outputFertig.get(auftrag.id);
  // Kapitel und Labels kommen aus den Bildern des Auftrags, nicht aus der
  // Wahl: was im Dokument landet, steht hier.
  const bilder = imProjekt().filter((a) => auftrag.kennungen.includes(a.id));
  const stellen = [...new Set(bilder.map((a) => String(a.gliederung || '').trim()).filter(Boolean))];
  const kapitel = stellen.length
    ? stellen.slice(0, 3).join(', ') + (stellen.length > 3 ? ` +${stellen.length - 3}` : '')
    : 'ohne Stelle';
  const labels = gemeinsameLabels(bilder) || '–';
  return el('tr', { klasse: 'output-zeile' + (auftrag.bilder ? '' : ' output-zeile--leer') + (outputSchau === auftrag.id ? ' output-zeile--schau' : '') }, [
    el('th', { scope: 'row', text: auftrag.inhaltName }),
    el('td', { klasse: 'output-kapitel', text: kapitel }),
    el('td', { text: auftrag.vorlageLabel }),
    el('td', { text: auftrag.variante || '–' }),
    el('td', { klasse: 'output-labels', text: labels }),
    el('td', { text: String(auftrag.bilder) }),
    el('td', { text: fertig ? String(fertig.blaetter.length) : auftrag.bilder ? 'noch nicht' : 'leer' }),
    el('td', {}, [
      auftrag.bilder
        ? el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: outputSchau === auftrag.id ? 'liegt vor' : 'Vorschau',
            onclick: () => zeigeOutputSchau(auftrag)
          })
        : el('span', { klasse: 'kennung', text: 'kein Bild' })
    ])
  ]);
}

/**
 * Rechnet die Blätter eines Auftrags - mit demselben Studio wie das Register
 * Design. Die Einstellungen werden dafür kurz umgestellt und danach wieder
 * hergestellt; sonst stünde das Studio hinterher woanders als zuvor.
 */
async function baueAuftrag(auftrag) {
  const vorherQuelle = designQuelle;
  const vorherVariante = designVariante;
  const vorherStudio = { ...studio };
  designQuelle = auftrag.inhalt;
  designVariante = auftrag.achse && auftrag.wert ? `${auftrag.achse}:${auftrag.wert}` : '';
  studio = { ...studio, vorlage: auftrag.vorlage, format: '' };
  try {
    return await baueBlaetter();
  } finally {
    designQuelle = vorherQuelle;
    designVariante = vorherVariante;
    studio = vorherStudio;
  }
}

async function erzeugeOutput() {
  if (outputLaeuft) return;
  const offen = outputPlan.filter((a) => a.bilder > 0);
  if (!offen.length) return;
  outputLaeuft = true;
  $('#output-erzeugen').disabled = true;
  outputFertig = new Map();
  let fertig = 0;
  for (const auftrag of offen) {
    meldeOutput(`${auftrag.titel} wird gerechnet – ${fertig + 1} von ${offen.length} …`, 'neutral');
    const blaetter = await baueAuftrag(auftrag);
    outputFertig.set(auftrag.id, { blaetter });
    fertig += 1;
    zeichneOutputListe();
  }
  outputLaeuft = false;
  const seiten = [...outputFertig.values()].reduce((summe, e) => summe + e.blaetter.length, 0);
  meldeOutput(`${fertig} Dokument(e) gerechnet · ${seiten} Blätter. Jetzt sichern oder in den Ordner schreiben.`, 'gut');
  // Das erste Dokument liegt gleich in der Vorschau.
  if (offen.length) zeigeOutputSchau(offen[0]);
  zeichneOutputKnoepfe();
}

/** Ein fertiges Dokument in der Vorschau - dieselben Blätter wie im Studio. */
function zeigeOutputSchau(auftrag) {
  outputSchau = auftrag.id;
  const fertig = outputFertig.get(auftrag.id);
  const kasten = $('#output-schau');
  if (!fertig) {
    kasten.replaceChildren(
      el('p', { klasse: 'feld-hinweis', text: 'Dieses Dokument ist noch nicht gerechnet – „Dokumente erzeugen" drücken.' })
    );
    zeichneOutputListe();
    return;
  }
  const bilder = imProjekt().filter((a) => auftrag.kennungen.includes(a.id));
  const stellen = [...new Set(bilder.map((a) => String(a.gliederung || '').trim()).filter(Boolean))];
  kasten.replaceChildren(
    el('h3', { klasse: 'abschnitt-titel', text: auftrag.titel }),
    el('p', { klasse: 'kennung', text: `${auftrag.vorlageLabel} · ${fertig.blaetter.length} Blatt (Blätter) · 300 dpi` }),
    el('p', {
      klasse: 'kennung',
      text: `Kapitel: ${stellen.length ? stellen.join(', ') : 'ohne Stelle'} · Labels: ${
        gemeinsameLabels(bilder) || 'keine gemeinsamen'
      }`
    }),
    // Die Bilder des Dokuments einzeln - jedes mit der Lupe.
    el(
      'div',
      { klasse: 'output-bilder' },
      bilder.map((a) =>
        el('figure', { klasse: 'output-bild' }, [
          el('img', { src: anzeigeBild(a), alt: a.titel, loading: 'lazy' }),
          lupenKnopf(a.id),
          el('figcaption', { text: `${kapitelKennung(a) || 'ohne Stelle'} · ${a.titel}` })
        ])
      )
    ),
    ...fertig.blaetter.map((blatt) => {
      const schau = el('canvas', { klasse: 'design-blatt' });
      schau.width = blatt.leinwand.width;
      schau.height = blatt.leinwand.height;
      schau.getContext('2d').drawImage(blatt.leinwand, 0, 0);
      return el('figure', { klasse: 'design-rahmen' }, [
        schau,
        el('figcaption', {
          text: blatt.deckblatt ? 'Deckblatt' : `Seite ${blatt.nummer} von ${blatt.von}`
        })
      ]);
    })
  );
  zeichneOutputListe();
}

/** Ein Dokument in einem Format - als Bytes, zum Sichern oder Schreiben. */
async function outputDatei(auftrag, format) {
  const fertig = outputFertig.get(auftrag.id);
  if (!fertig || !fertig.blaetter.length) return null;
  const seiten = [];
  for (const blatt of fertig.blaetter) {
    const blob = await new Promise((f) => blatt.leinwand.toBlob(f, 'image/jpeg', 0.9));
    if (!blob) continue;
    seiten.push({
      daten: new Uint8Array(await blob.arrayBuffer()),
      breite: blatt.leinwand.width,
      hoehe: blatt.leinwand.height,
      typ: 'jpeg'
    });
  }
  if (!seiten.length) return null;
  const angaben = { titel: auftrag.titel, anwendung: DATEN.anwendung };
  if (format === 'pdf') return pdfAusSeiten(seiten, angaben);
  if (format === 'docx') return docxAusSeiten(seiten, angaben);
  if (format === 'pptx') return pptxAusSeiten(seiten, angaben);
  if (format === 'html') {
    const bilder = fertig.blaetter.map((b) => b.leinwand.toDataURL('image/jpeg', 0.9));
    return new TextEncoder().encode(
      `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${maskiereHtml(auftrag.titel)}</title>` +
        '<style>body{margin:0;background:#eceef2}figure{margin:0 auto 16px;max-width:1100px}' +
        'img{display:block;width:100%;height:auto}@media print{figure{margin:0;page-break-after:always}}</style>' +
        '</head><body>' +
        bilder.map((b) => `<figure><img src="${b}" alt="Blatt"></figure>`).join('') +
        '</body></html>'
    );
  }
  return null;
}

/** Alles, was gerechnet ist, in den gewählten Formaten sichern. */
async function sichereOutput() {
  const formate = AUSGABE_FORMATE.filter((f) => outputWahl.formate.includes(f.id));
  if (!formate.length || !outputFertig.size) return;
  let gesichert = 0;
  let abgebrochen = false;
  for (const auftrag of outputPlan) {
    if (!outputFertig.has(auftrag.id)) continue;
    for (const format of formate) {
      const daten = await outputDatei(auftrag, format.id);
      if (!daten) continue;
      const ergebnis = await uebergebeDatei(
        ausgabeDateiname(auftrag, format.endung),
        new Blob([daten], { type: format.typ })
      );
      if (ergebnis.art === 'gesichert') gesichert += 1;
      else {
        abgebrochen = true;
        break;
      }
    }
    if (abgebrochen) break;
  }
  meldeOutput(
    abgebrochen
      ? `${gesichert} Datei(en) gesichert; danach wurde abgebrochen oder die Ablage fehlt.`
      : `${gesichert} Datei(en) gesichert.`,
    abgebrochen ? 'warnung' : 'gut'
  );
}

/** Dasselbe in einen Ordner: output/<Variante>/<Vorlage>/<Datei>. */
async function schreibeOutputOrdner() {
  if (!ordnerZugriff) {
    if (!(await waehleOrdner())) return;
  }
  const formate = AUSGABE_FORMATE.filter((f) => outputWahl.formate.includes(f.id));
  if (!formate.length || !outputFertig.size) return;
  let geschrieben = 0;
  try {
    for (const auftrag of outputPlan) {
      if (!outputFertig.has(auftrag.id)) continue;
      const ordner = await holeUnterordner(ausgabeOrdner(auftrag));
      for (const format of formate) {
        const daten = await outputDatei(auftrag, format.id);
        if (!daten) continue;
        await schreibeDatei(ordner, ausgabeDateiname(auftrag, format.endung), new Blob([daten], { type: format.typ }));
        geschrieben += 1;
        meldeOutput(`${geschrieben} Datei(en) geschrieben …`, 'neutral');
      }
    }
  } catch (fehler) {
    meldeOutput(`Nach ${geschrieben} Datei(en) abgebrochen: ${fehler && fehler.message ? fehler.message : fehler}`, 'warnung');
    return;
  }
  meldeOutput(`${geschrieben} Datei(en) in „${ordnerZugriff.name}/output" geschrieben.`, 'gut');
  zeigeOrdnerImArchiv();
}

function zeichneOutputKnoepfe() {
  const umfang = ausgabeUmfang(outputPlan, outputWahl.formate);
  $('#output-umfang').textContent = outputPlan.length
    ? `${umfang.dokumente} Dokument(e) · ${umfang.dateien} Datei(en)` + (umfang.leer ? ` · ${umfang.leer} ohne Bild` : '')
    : '';
  $('#output-erzeugen').disabled = outputLaeuft || !outputPlan.some((a) => a.bilder > 0);
  const bereit = outputFertig.size > 0 && outputWahl.formate.length > 0;
  $('#output-sichern').disabled = !bereit;
  $('#output-ordner').disabled = !bereit || !ordnerMoeglich();
}

function zeichneOutput() {
  if (document.getElementById('output-ansicht').hidden) return;
  zeichneOutputWahl();
  outputPlan = ausgabePlan(imProjekt(), strecken, GLIEDERUNG, outputWahl, alleVorlagen(studio.eigene));
  // Was nicht mehr im Plan steht, ist auch nicht mehr gerechnet.
  for (const kennung of [...outputFertig.keys()]) {
    if (!outputPlan.some((a) => a.id === kennung)) outputFertig.delete(kennung);
  }
  zeichneOutputListe();
  zeichneOutputKnoepfe();
  if (!outputFertig.size) {
    $('#output-schau').replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: 'Noch nichts gerechnet. „Dokumente erzeugen" baut die Blätter; danach stehen sie hier und lassen sich sichern.'
      })
    );
  }
}

function verdrahteOutput() {
  $('#output-inhalte').addEventListener('change', (e) => {
    outputWahl = {
      ...outputWahl,
      inhalte: [...e.target.selectedOptions].map((o) => o.value).filter(Boolean)
    };
    zeichneOutput();
  });
  $('#output-achse').addEventListener('change', (e) => {
    outputWahl = { ...outputWahl, achse: e.target.value, werte: [] };
    zeichneOutput();
  });
  $('#output-erzeugen').addEventListener('click', erzeugeOutput);
  $('#output-sichern').addEventListener('click', sichereOutput);
  $('#output-ordner').addEventListener('click', schreibeOutputOrdner);
}

verdrahteOutput();

// Der Start steht in der letzten Zeile der letzten Datei - seit 1.40.0
// ist das ocr.js (siehe CLAUDE.md).
