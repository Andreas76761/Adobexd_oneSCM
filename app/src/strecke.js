/* =========================================================================
   Strecke – mehrere Screens als eine Folge.

   Eine Klickstrecke führt durch einen Ablauf: Schritt für Schritt eine
   Aufnahme und die Anweisung dazu. Gezeigt wird immer die jüngste Fassung,
   also mit abgedeckten Stellen und Marken – was herausgeht, ist das, was
   bearbeitet wurde, nicht das Original.

   „Blatt als Bild sichern“ fasst die ganze Folge in einem Bild zusammen.

   Bis 1.51.0 stand dies in `markieren.js`. Die Datei teilt sich mit den
   übrigen Oberflächenmodulen eine Klammer; `GLIEDERUNG` entsteht erst in
   `gliederung.js` dahinter und darf hier nur aus Funktionen heraus gelesen
   werden, nicht beim Laden.
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
    ...(imProjekt().length
      ? sortiereNachKapitel(imProjekt()).map((a) =>
          el('option', {
            value: a.id,
            text: `${kapitelKennung(a) ? kapitelKennung(a) + ' · ' : ''}${a.id} · ${a.titel}`
          })
        )
      : [el('option', { value: '', text: 'keine Aufnahme in der Arbeitsmenge' })])
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
  zeichneProzessvorschau();
  const hatSchritte = Boolean(offen && streckeMitAufnahmen(offen, eingang).length);
  $('#strecke-bpmn').disabled = !hatSchritte;
  $('#strecke-prozessbild').disabled = !hatSchritte;
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
  vorschauTakt = setTimeout(() => {
    zeichneBlattVorschau();
    zeichneProzessvorschau();
  }, 250);
}

/** Die Bildkacheln eines Schritts - eine je Bild, parallel nebeneinander. */
function schrittBilder(schritt, index) {
  const kennungen = schritt.aufnahmen || [];
  if (!kennungen.length) {
    return el('div', { klasse: 'schritt-bilder' }, [
      el('div', { klasse: 'schritt-platzhalter', text: 'Bild fehlt noch' })
    ]);
  }
  return el(
    'div',
    { klasse: 'schritt-bilder' },
    kennungen.map((kennung, k) => {
      const aufnahme = eingang.find((a) => a.id === kennung);
      const marke = schrittMarke(index + 1, kennungen.length, k);
      return el('figure', { klasse: 'schritt-bild' }, [
        aufnahme
          ? el('img', { src: anzeigeBild(aufnahme), alt: aufnahme.titel, loading: 'lazy' })
          : el('span', { klasse: 'marke-fehlt', text: 'Aufnahme fehlt' }),
        kennungen.length > 1 ? el('figcaption', { text: marke }) : null,
        kennungen.length > 1
          ? el('button', {
              klasse: 'knopf knopf--klein schritt-bild-weg',
              type: 'button',
              title: `${marke} aus dem Schritt nehmen`,
              text: '×',
              onclick: () => aendereStrecke({ schritte: entferneParallel(aktuelleStrecke().schritte, index, kennung) })
            })
          : null
      ]);
    })
  );
}

function zeichneStreckenschritte() {
  const kasten = $('#strecke-schritte');
  const offen = aktuelleStrecke();
  if (!offen || !offen.schritte.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: offen
          ? 'Noch kein Schritt. Oben eine Aufnahme wählen und anhängen – oder einen Platzhalter setzen.'
          : 'Zuerst eine Strecke anlegen.'
      })
    );
    return;
  }
  kasten.replaceChildren(
    ...offen.schritte.map((schritt, i) => {
      const platzhalter = schritt.art === 'platzhalter' || !(schritt.aufnahmen || []).length;
      const erste = (schritt.aufnahmen || [])[0];
      const aufnahme = erste ? eingang.find((a) => a.id === erste) : null;
      return el('div', { klasse: 'strecke-schritt' + (platzhalter ? ' strecke-schritt--platzhalter' : '') }, [
        el('span', { klasse: 'schritt-nummer', text: String(i + 1) }),
        schrittBilder(schritt, i),
        el('div', { klasse: 'schritt-text' }, [
          el('input', {
            type: 'text',
            id: 'schritt-text-' + i,
            value: schritt.text,
            placeholder: platzhalter ? 'Welches Bild fehlt hier?' : 'Auf „Create Template“ klicken',
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
            text: platzhalter
              ? 'Platzhalter'
              : `${kapitelKennung(aufnahme) || '—'} · ${(schritt.aufnahmen || []).join(' + ')}`
          })
        ]),
        el('div', { klasse: 'schritt-knoepfe' }, [
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            id: 'schritt-parallel-' + i,
            text: platzhalter ? '+ Bild' : '+ parallel',
            title: platzhalter
              ? 'Die oben gewählte Aufnahme in diesen Platzhalter setzen'
              : 'Die oben gewählte Aufnahme neben die bisherigen setzen',
            onclick: () => {
              const kennung = $('#strecke-aufnahme').value;
              if (!kennung) {
                meldeStrecke('Oben ist keine Aufnahme gewählt.', 'warnung');
                return;
              }
              aendereStrecke({ schritte: fuegeParallelHinzu(aktuelleStrecke().schritte, i, kennung) });
              meldeStrecke(`${kennung} steht nun in Schritt ${i + 1}.`, 'gut');
            }
          }),
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
  // Flach heißt: ein Schritt mit zwei parallelen Bildern gibt zwei Kacheln,
  // „3a" und „3b"; ein Platzhalter gibt eine leere.
  const bilder = [];
  for (const eintrag of blattBilder(schritte)) {
    if (eintrag.platzhalter) {
      bilder.push({ breite: 1600, hoehe: 1000, element: null, eintrag, marke: eintrag.marke, platzhalter: true });
      continue;
    }
    const geladen = await ladeBild(anzeigeBild(eintrag.aufnahme), 'eingang', eintrag.aufnahme.titel);
    bilder.push({
      breite: geladen.naturalWidth || geladen.breite,
      hoehe: geladen.naturalHeight || geladen.hoehe,
      element: geladen.element,
      eintrag,
      marke: eintrag.marke
    });
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
    const { element, eintrag, platzhalter } = bilder[i];
    const schritt = eintrag.schritt;
    stift.save();
    stift.fillStyle = token('--flaeche-2', '#F6F7FA');
    stift.fillRect(kachel.x, kachel.y, kachel.breite, kachel.hoehe);
    if (platzhalter) {
      // Eine Lücke, die man sieht, wird gefüllt - darum gestrichelt und
      // benannt, nicht einfach weggelassen.
      stift.setLineDash([12, 10]);
      stift.strokeStyle = token('--warn', '#9A6B1F');
      stift.lineWidth = 3;
      stift.strokeRect(kachel.x + 2, kachel.y + 2, kachel.breite - 4, kachel.bildHoehe - 4);
      stift.setLineDash([]);
      stift.fillStyle = token('--tinte-3', '#77839A');
      stift.font = `500 26px ${token('--schrift-text', 'sans-serif')}`;
      stift.textAlign = 'center';
      stift.textBaseline = 'middle';
      stift.fillText('Bild fehlt', kachel.x + kachel.breite / 2, kachel.y + kachel.bildHoehe / 2);
      stift.textAlign = 'left';
      stift.textBaseline = 'alphabetic';
    } else {
      stift.drawImage(element, kachel.x, kachel.y, kachel.breite, kachel.bildHoehe);
      stift.strokeStyle = token('--linie', '#D6DBE4');
      stift.lineWidth = 1;
      stift.strokeRect(kachel.x + 0.5, kachel.y + 0.5, kachel.breite - 1, kachel.bildHoehe - 1);
    }

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
    stift.fillText(String(kachel.marke || kachel.nummer), kachel.x + r + 8, kachel.y + r + 9);

    // Anweisung unter der Kachel
    stift.textAlign = 'left';
    stift.textBaseline = 'top';
    stift.fillStyle = token('--tinte', '#141A24');
    stift.font = `500 20px ${token('--schrift-text', 'sans-serif')}`;
    const text = `${kachel.marke || kachel.nummer}. ${String(schritt.text || '').trim()}`;
    stift.save();
    stift.beginPath();
    stift.rect(kachel.x, kachel.y + kachel.bildHoehe + 8, kachel.breite, 56);
    stift.clip();
    stift.fillText(text, kachel.x + 2, kachel.y + kachel.bildHoehe + 10);
    stift.restore();
    stift.fillStyle = token('--tinte-3', '#77839A');
    stift.font = `400 14px ${token('--schrift-mono', 'monospace')}`;
    stift.fillText(
      platzhalter ? 'Platzhalter – noch keine Aufnahme' : bildunterschrift(eintrag.aufnahme),
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

/* ------------------------------------------------------------- Prozess */

/**
 * Zeichnet den Prozess: Start, Aufgaben, parallele Teilungen, Ende. Gerechnet
 * wird in BPMN-Punkten (`bpmnAufbau`), gezeichnet in doppelter Auflösung -
 * sonst ist die Schrift im gesicherten Bild unscharf.
 */
function zeichneProzessbild(aufbau, massstab = 2) {
  const leinwand = document.createElement('canvas');
  leinwand.width = Math.round(aufbau.breite * massstab);
  leinwand.height = Math.round(aufbau.hoehe * massstab);
  const stift = leinwand.getContext('2d');
  stift.scale(massstab, massstab);
  stift.fillStyle = token('--flaeche', '#FFFFFF');
  stift.fillRect(0, 0, aufbau.breite, aufbau.hoehe);

  // Erst die Linien, damit die Kästen darüber liegen.
  const nachId = new Map(aufbau.knoten.map((k) => [k.id, k]));
  stift.strokeStyle = token('--tinte-3', '#77839A');
  stift.fillStyle = token('--tinte-3', '#77839A');
  stift.lineWidth = 1.6;
  for (const kante of aufbau.kanten) {
    const von = nachId.get(kante.von);
    const nach = nachId.get(kante.nach);
    if (!von || !nach) continue;
    const vonY = von.y + von.hoehe / 2;
    const nachY = nach.y + nach.hoehe / 2;
    const vonX = von.x + von.breite;
    const knick = nach.x - 20;
    stift.beginPath();
    stift.moveTo(vonX, vonY);
    if (Math.abs(vonY - nachY) > 1) {
      stift.lineTo(knick, vonY);
      stift.lineTo(knick, nachY);
    }
    stift.lineTo(nach.x, nachY);
    stift.stroke();
    // Pfeilspitze
    stift.beginPath();
    stift.moveTo(nach.x, nachY);
    stift.lineTo(nach.x - 9, nachY - 4.5);
    stift.lineTo(nach.x - 9, nachY + 4.5);
    stift.closePath();
    stift.fill();
  }

  for (const knoten of aufbau.knoten) {
    const mx = knoten.x + knoten.breite / 2;
    const my = knoten.y + knoten.hoehe / 2;
    stift.lineWidth = 2;
    if (knoten.art === 'start' || knoten.art === 'ende') {
      stift.beginPath();
      stift.arc(mx, my, knoten.breite / 2, 0, Math.PI * 2);
      stift.fillStyle = token('--flaeche', '#FFFFFF');
      stift.fill();
      stift.strokeStyle = knoten.art === 'ende' ? token('--tinte', '#141A24') : token('--tinte-2', '#4A5769');
      stift.lineWidth = knoten.art === 'ende' ? 4 : 2;
      stift.stroke();
      stift.fillStyle = token('--tinte-3', '#77839A');
      stift.font = `400 12px ${token('--schrift-mono', 'monospace')}`;
      stift.textAlign = 'center';
      stift.textBaseline = 'top';
      stift.fillText(knoten.name, mx, knoten.y + knoten.hoehe + 6);
      continue;
    }
    if (knoten.art === 'teilung' || knoten.art === 'vereinigung') {
      stift.beginPath();
      stift.moveTo(mx, knoten.y);
      stift.lineTo(knoten.x + knoten.breite, my);
      stift.lineTo(mx, knoten.y + knoten.hoehe);
      stift.lineTo(knoten.x, my);
      stift.closePath();
      stift.fillStyle = token('--flaeche', '#FFFFFF');
      stift.fill();
      stift.strokeStyle = token('--tinte-2', '#4A5769');
      stift.stroke();
      // Das Kreuz: parallel, nicht „entweder oder".
      stift.beginPath();
      stift.moveTo(mx - 9, my);
      stift.lineTo(mx + 9, my);
      stift.moveTo(mx, my - 9);
      stift.lineTo(mx, my + 9);
      stift.stroke();
      continue;
    }
    // Aufgabe oder Platzhalter
    const platzhalter = knoten.art === 'platzhalter';
    stift.beginPath();
    const r = 8;
    stift.moveTo(knoten.x + r, knoten.y);
    stift.arcTo(knoten.x + knoten.breite, knoten.y, knoten.x + knoten.breite, knoten.y + knoten.hoehe, r);
    stift.arcTo(knoten.x + knoten.breite, knoten.y + knoten.hoehe, knoten.x, knoten.y + knoten.hoehe, r);
    stift.arcTo(knoten.x, knoten.y + knoten.hoehe, knoten.x, knoten.y, r);
    stift.arcTo(knoten.x, knoten.y, knoten.x + knoten.breite, knoten.y, r);
    stift.closePath();
    stift.fillStyle = platzhalter ? token('--flaeche-2', '#F6F7FA') : token('--flaeche', '#FFFFFF');
    stift.fill();
    stift.strokeStyle = platzhalter ? token('--warn', '#9A6B1F') : token('--tinte-2', '#4A5769');
    if (platzhalter) stift.setLineDash([7, 5]);
    stift.stroke();
    stift.setLineDash([]);

    stift.fillStyle = token('--tinte', '#141A24');
    stift.font = `500 13px ${token('--schrift-text', 'sans-serif')}`;
    stift.textAlign = 'center';
    stift.textBaseline = 'middle';
    const zeilen = umbrich(stift, knoten.name, knoten.breite - 18).slice(0, 4);
    const start = my - ((zeilen.length - 1) * 17) / 2;
    zeilen.forEach((zeile, i) => stift.fillText(zeile, mx, start + i * 17));
  }
  stift.textAlign = 'left';
  stift.textBaseline = 'alphabetic';
  return leinwand;
}

/** Die Vorschau des Prozesses - sie hängt an derselben Rechnung wie die Datei. */
function zeichneProzessvorschau() {
  const schau = $('#strecke-prozess');
  const offen = aktuelleStrecke();
  const schritte = offen ? streckeMitAufnahmen(offen, eingang) : [];
  if (!offen || !schritte.length) {
    schau.hidden = true;
    return;
  }
  const bild = zeichneProzessbild(bpmnAufbau(offen, eingang), 2);
  schau.hidden = false;
  schau.width = bild.width;
  schau.height = bild.height;
  schau.getContext('2d').drawImage(bild, 0, 0);
}

async function sichereBpmn() {
  const offen = aktuelleStrecke();
  if (!offen) return;
  const schritte = streckeMitAufnahmen(offen, eingang);
  if (!schritte.length) {
    meldeStrecke('Die Strecke hat keinen Schritt – es gibt keinen Prozess.', 'warnung');
    return;
  }
  const xml = streckeAlsBpmn(offen, eingang, { anwendung: DATEN.anwendung });
  const name = `prozess-${bereinigeDateiname(offen.name) || 'ohne-namen'}.bpmn`;
  const ergebnis = await uebergebeDatei(name, new Blob([xml], { type: 'application/xml' }));
  const parallel = schritte.filter((s) => s.aufnahmen.length > 1).length;
  const luecken = schritte.filter((s) => s.art === 'platzhalter').length;
  meldeStrecke(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert – ${schritte.length} Schritte, ${parallel} parallel, ${luecken} Platzhalter.`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Der Prozess bleibt in der Vorschau.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

async function sichereProzessbild() {
  const offen = aktuelleStrecke();
  if (!offen || !streckeMitAufnahmen(offen, eingang).length) return;
  const bild = zeichneProzessbild(bpmnAufbau(offen, eingang), 2);
  const blob = await new Promise((fertig) => bild.toBlob(fertig, 'image/png'));
  const name = `prozess-${bereinigeDateiname(offen.name) || 'ohne-namen'}.png`;
  const ergebnis = await uebergebeDatei(name, blob);
  meldeStrecke(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}).`
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
  $('#strecke-platzhalter').addEventListener('click', () => {
    const offen = aktuelleStrecke();
    if (!offen) {
      meldeStrecke('Zuerst eine Strecke anlegen.', 'warnung');
      return;
    }
    aendereStrecke({ schritte: [...aktuelleStrecke().schritte, platzhalterSchritt('')] });
    const feld = document.getElementById('schritt-text-' + offen.schritte.length);
    if (feld) feld.focus({ preventScroll: true });
    // Die Meldung bleibt die der Prüfung: ein Platzhalter ohne Beschreibung
    // ist noch nichts wert, und das soll da stehen.
  });
  $('#strecke-blatt').addEventListener('click', sichereBlatt);
  $('#strecke-bpmn').addEventListener('click', sichereBpmn);
  $('#strecke-prozessbild').addEventListener('click', sichereProzessbild);
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

