/* =========================================================================
   Designstudio – aus Bildern wird ein Blatt.

   Hauptzweck der Anwendung: aus der Galerie entstehen Benutzerhandbuch,
   Releaseletter, One Pager und Quick Guide – in der Auflösung, die der Druck
   braucht (300 dpi, A4). Die Texte kommen wahlweise aus der Gliederung des
   Handbuchs; ohne sie stehen nur die Anweisungen der Strecke da.

   Gerechnet wird auf Leinwänden in voller Größe, angezeigt wird verkleinert.
   ========================================================================= */

let designQuelle = ''; // Kennung einer Strecke oder 'kapitel:7.5'
let designVorlage = 'quickguide';
let designFormat = '';
let designTexte = true;
let designLabels = true;
let designSeiten = []; // zuletzt gerechnete Blätter als Leinwände

/** Die Inhalte, aus denen ein Blatt entstehen kann. */
function designQuellen() {
  const ausStrecken = strecken.map((s) => ({
    id: 'strecke:' + s.id,
    label: `Strecke · ${s.name || 'ohne Namen'} (${s.schritte.length})`
  }));
  // Jede Stelle mit Bildern ist auch eine mögliche Vorlage.
  const { zahlen } = zaehleBilder(GLIEDERUNG, eingang);
  const ausKapiteln = GLIEDERUNG.filter((e) => (zahlen.get(e.nummer) || {}).gesamt).map((e) => ({
    id: 'kapitel:' + e.nummer,
    label: `Kapitel · ${e.nummer} ${e.thema} (${zahlen.get(e.nummer).gesamt})`
  }));
  return [...ausStrecken, ...ausKapiteln];
}

/** Die Schritte des gewählten Inhalts: Bild, Anweisung, Aufnahme. */
function designSchritte() {
  if (designQuelle.startsWith('strecke:')) {
    const strecke = strecken.find((s) => 'strecke:' + s.id === designQuelle);
    if (!strecke) return { titel: '', schritte: [] };
    return {
      titel: strecke.name || 'Klickstrecke',
      // Platzhalter haben kein Bild - auf ein Blatt kommen sie nicht.
      schritte: streckeMitAufnahmen(strecke, eingang)
        .filter((s) => s.aufnahme)
        .map((s) => ({
          aufnahme: s.aufnahme,
          anweisung: s.text,
          nummer: s.nummer
        }))
    };
  }
  if (designQuelle.startsWith('kapitel:')) {
    const stelle = designQuelle.slice(8);
    const eintrag = GLIEDERUNG.find((e) => e.nummer === stelle);
    const bilder = sortiereNachKapitel(
      eingang.filter((a) => gehoertZu(String(a.gliederung || ''), stelle))
    );
    return {
      titel: eintrag ? `${eintrag.nummer} ${eintrag.thema}` : stelle,
      schritte: bilder.map((a, i) => ({ aufnahme: a, anweisung: a.titel, nummer: i + 1 }))
    };
  }
  return { titel: '', schritte: [] };
}

/* ------------------------------------------------------------- Zeichnen */

/** Kopfzeile eines Blattes: Titel links, Vorlage und Seitenzahl rechts. */
function zeichneBlattkopf(stift, seite, aufbau, titel) {
  const { format: fmt, vorlage: vor } = aufbau;
  // Erst rechts setzen, dann weiß der Titel, wie viel Platz ihm bleibt.
  const rechts = `${vor.label} · Seite ${seite.nummer} von ${seite.von}`;
  stift.fillStyle = token('--tinte-3', '#77839A');
  stift.font = `400 ${Math.round(seite.kopfHoehe * 0.2)}px ${token('--schrift-mono', 'monospace')}`;
  stift.textAlign = 'right';
  stift.textBaseline = 'alphabetic';
  stift.fillText(rechts, fmt.breite - seite.rand, Math.round(seite.kopfHoehe * 0.62));
  const belegt = stift.measureText(rechts).width;

  stift.fillStyle = token('--tinte', '#141A24');
  stift.font = `600 ${Math.round(seite.kopfHoehe * 0.34)}px ${token('--schrift-display', 'sans-serif')}`;
  stift.textAlign = 'left';
  const platz = fmt.breite - 2 * seite.rand - belegt - Math.round(seite.rand * 0.8);
  stift.fillText(beschneide(stift, titel, platz), seite.rand, Math.round(seite.kopfHoehe * 0.62));
  stift.strokeStyle = token('--linie', '#D6DBE4');
  stift.lineWidth = 2;
  stift.beginPath();
  stift.moveTo(seite.rand, Math.round(seite.kopfHoehe * 0.78));
  stift.lineTo(fmt.breite - seite.rand, Math.round(seite.kopfHoehe * 0.78));
  stift.stroke();
}

/** Fußzeile: Stand und Herkunft – ein Blatt ohne Datum ist wertlos. */
function zeichneBlattfuss(stift, seite, aufbau) {
  const { format: fmt } = aufbau;
  stift.fillStyle = token('--tinte-3', '#77839A');
  stift.font = `400 ${Math.round(seite.fussHoehe * 0.38)}px ${token('--schrift-mono', 'monospace')}`;
  stift.textAlign = 'left';
  stift.fillText(
    `Screenarchiv ${DATEN.anwendung} · ${formatiereZeitpunkt(new Date().toISOString())}`,
    seite.rand,
    fmt.hoehe - Math.round(seite.fussHoehe * 0.35)
  );
}

/** Beschneidet eine Zeile auf die Breite, mit Auslassungszeichen. */
function beschneide(stift, text, breite) {
  const ganz = String(text || '');
  if (stift.measureText(ganz).width <= breite) return ganz;
  let kurz = ganz;
  while (kurz.length > 1 && stift.measureText(kurz + ' …').width > breite) kurz = kurz.slice(0, -1);
  return kurz.trimEnd() + ' …';
}

/** Zeilenumbruch von Hand – die Leinwand kann das nicht. */
function umbrich(stift, text, breite) {
  const worte = String(text || '').split(/\s+/).filter(Boolean);
  const zeilen = [];
  let zeile = '';
  for (const wort of worte) {
    const versuch = zeile ? `${zeile} ${wort}` : wort;
    if (stift.measureText(versuch).width > breite && zeile) {
      zeilen.push(zeile);
      zeile = wort;
    } else {
      zeile = versuch;
    }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/** Eine Kachel: Nummer, Bild, Text – je nach Vorlage daneben oder darunter. */
function zeichneKachel(stift, kachel, bild, aufbau) {
  const { vorlage: vor } = aufbau;
  const schritt = kachel.schritt;
  const bildX = kachel.x;
  const bildY = kachel.y;
  // Das Bild wird eingepasst, nicht beschnitten: ein halber Screen erklärt nichts.
  const massstab = Math.min(kachel.bildBreite / bild.breite, kachel.bildHoehe / bild.hoehe);
  const breite = Math.round(bild.breite * massstab);
  const hoehe = Math.round(bild.hoehe * massstab);
  // Der Kasten sitzt eng am Bild: eine graue Fläche darunter sähe aus wie
  // ein Fehler, und der Text darf gleich anschließen.
  const kastenX = bildX + Math.round((kachel.bildBreite - breite) / 2);
  stift.fillStyle = token('--flaeche-2', '#F6F7FA');
  stift.fillRect(kastenX, bildY, breite, hoehe);
  stift.drawImage(bild.element, kastenX, bildY, breite, hoehe);
  stift.strokeStyle = token('--linie', '#D6DBE4');
  stift.lineWidth = 2;
  stift.strokeRect(kastenX + 1, bildY + 1, breite - 2, hoehe - 2);

  // Nummernkreis
  const r = Math.round(breite * 0.035);
  stift.beginPath();
  stift.arc(kastenX + r + 10, bildY + r + 10, r, 0, Math.PI * 2);
  stift.fillStyle = token('--akzent', '#B4432B');
  stift.fill();
  stift.fillStyle = token('--auf-farbe', '#FFFFFF');
  stift.font = `600 ${Math.round(r * 1.2)}px ${token('--schrift-display', 'sans-serif')}`;
  stift.textAlign = 'center';
  stift.textBaseline = 'middle';
  stift.fillText(String(kachel.nummer), kastenX + r + 10, bildY + r + 11);

  // Text
  const textX = kachel.textNeben ? bildX + kachel.bildBreite + Math.round(kachel.breite * 0.03) : kastenX;
  const textY = kachel.textNeben ? bildY : bildY + hoehe + Math.round(kachel.hoehe * 0.03);
  const textBreite = kachel.textNeben ? kachel.textBreite : kachel.breite;
  const zeilen = schrittText({
    anweisung: schritt.anweisung,
    aufnahme: schritt.aufnahme,
    gliederung: GLIEDERUNG,
    mitTexten: designTexte,
    grenze: vor.textlaenge
  });
  // Die Schrift richtet sich nach der Textspalte, nicht nach der Kachel -
  // sonst wird sie in einer schmalen Spalte riesig.
  const grund = Math.round(textBreite * (kachel.textNeben ? 0.062 : 0.038));
  const schlussHoehe = designLabels ? Math.round(grund * 2.4) : 0;
  const platzUnten = kachel.y + kachel.hoehe - schlussHoehe;
  stift.textAlign = 'left';
  stift.textBaseline = 'top';
  let y = textY;
  let abgeschnitten = false;
  for (let i = 0; i < zeilen.length && !abgeschnitten; i++) {
    const gross = i === 0;
    const schrift = Math.round(grund * (gross ? 1.15 : 0.82));
    stift.font = `${gross ? 600 : 400} ${schrift}px ${token(gross ? '--schrift-display' : '--schrift-text', 'sans-serif')}`;
    stift.fillStyle = token(gross ? '--tinte' : '--tinte-2', '#141A24');
    const teile = umbrich(stift, gross ? `${kachel.nummer}. ${zeilen[i]}` : zeilen[i], textBreite);
    for (const teil of teile) {
      // Was nicht mehr auf die Kachel passt, wird nicht in die nächste
      // hineingeschrieben - die letzte Zeile endet mit Auslassungszeichen.
      if (y + schrift * 1.35 > platzUnten) {
        abgeschnitten = true;
        break;
      }
      stift.fillText(teil, textX, y);
      y += Math.round(schrift * 1.35);
    }
    y += Math.round(schrift * 0.3);
  }

  if (designLabels) {
    const kette = labelKette(schritt.aufnahme || {});
    const unterschrift = [kapitelKennung(schritt.aufnahme || {}), kette].filter(Boolean).join('  ·  ');
    if (unterschrift) {
      const schrift = Math.round(grund * 0.6);
      stift.font = `400 ${schrift}px ${token('--schrift-mono', 'monospace')}`;
      stift.fillStyle = token('--tinte-3', '#77839A');
      stift.fillText(
        beschneide(stift, unterschrift, textBreite),
        textX,
        Math.min(Math.max(y, platzUnten), kachel.y + kachel.hoehe - Math.round(schrift * 1.4))
      );
    }
  }
}

/** Rechnet alle Blätter; gibt Leinwände in voller Größe zurück. */
async function baueBlaetter() {
  const { titel, schritte } = designSchritte();
  if (!schritte.length) return [];
  const aufbau = seitenAufteilung(schritte, {
    vorlage: designVorlage,
    format: designFormat || vorlage(designVorlage).format,
    mitTexten: designTexte
  });
  // Die Bilder einmal laden, nicht je Seite.
  const bilder = new Map();
  for (const schritt of schritte) {
    if (!schritt.aufnahme || bilder.has(schritt.aufnahme.id)) continue;
    const adresse = await bestesBild(schritt.aufnahme, (neuesteFassung(schritt.aufnahme) || {}).nummer);
    const geladen = await ladeBild(adresse, 'eingang', schritt.aufnahme.titel);
    bilder.set(schritt.aufnahme.id, { element: geladen.element, breite: geladen.breite, hoehe: geladen.hoehe });
  }
  const blaetter = [];
  for (const seite of aufbau.seiten) {
    const leinwand = document.createElement('canvas');
    leinwand.width = aufbau.format.breite;
    leinwand.height = aufbau.format.hoehe;
    const stift = leinwand.getContext('2d');
    stift.fillStyle = token('--flaeche', '#FFFFFF');
    stift.fillRect(0, 0, leinwand.width, leinwand.height);
    zeichneBlattkopf(stift, seite, aufbau, titel);
    for (const kachel of seite.kacheln) {
      const bild = kachel.schritt.aufnahme && bilder.get(kachel.schritt.aufnahme.id);
      if (bild) zeichneKachel(stift, kachel, bild, aufbau);
    }
    zeichneBlattfuss(stift, seite, aufbau);
    blaetter.push({ nummer: seite.nummer, von: seite.von, leinwand, titel });
  }
  return blaetter;
}

/* -------------------------------------------------------------- Ansicht */

async function zeichneDesign() {
  if (document.getElementById('design-ansicht').hidden) return;
  const quellen = designQuellen();
  if (!quellen.some((q) => q.id === designQuelle)) designQuelle = quellen.length ? quellen[0].id : '';
  $('#design-quelle').replaceChildren(
    ...(quellen.length
      ? quellen.map((q) => el('option', { value: q.id, text: q.label, selected: q.id === designQuelle }))
      : [el('option', { value: '', text: 'noch keine Strecke und kein Kapitel mit Bildern' })])
  );
  $('#design-vorlage').replaceChildren(
    ...VORLAGEN.map((v) => el('option', { value: v.id, text: v.label, selected: v.id === designVorlage }))
  );
  const vor = vorlage(designVorlage);
  $('#design-format').replaceChildren(
    ...FORMATE.map((f) =>
      el('option', { value: f.id, text: f.label, selected: f.id === (designFormat || vor.format) })
    )
  );
  $('#design-zweck').textContent = `${vor.zweck} Bis zu ${vor.spalten * vor.zeilen} Bilder je Seite, ${
    format(designFormat || vor.format).label
  }, 300 dpi.`;

  const { schritte } = designSchritte();
  $('#design-sichern').disabled = !schritte.length;
  $('#design-html').disabled = !schritte.length;
  if (!schritte.length) {
    $('#design-blaetter').dataset.vorlage = '';
    $('#design-blaetter').replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: 'Kein Inhalt gewählt. Eine Strecke anlegen oder Bildern eine Stelle im Handbuch geben.'
      })
    );
    meldeDesign('');
    return;
  }
  meldeDesign('Blätter werden gerechnet …', 'neutral');
  // Während gerechnet wird, zeigt der Container nichts Fertiges an.
  $('#design-blaetter').dataset.vorlage = '';
  designSeiten = await baueBlaetter();
  $('#design-blaetter').replaceChildren(
    ...designSeiten.map((blatt) => {
      const schau = el('canvas', { klasse: 'design-blatt' });
      schau.width = blatt.leinwand.width;
      schau.height = blatt.leinwand.height;
      schau.getContext('2d').drawImage(blatt.leinwand, 0, 0);
      return el('figure', { klasse: 'design-rahmen' }, [
        schau,
        el('figcaption', { text: `Seite ${blatt.nummer} von ${blatt.von} · ${blatt.leinwand.width} × ${blatt.leinwand.height} px` })
      ]);
    })
  );
  // Der Stand steht am Container: welche Vorlage hier gerade liegt.
  $('#design-blaetter').dataset.vorlage = designVorlage;
  $('#design-blaetter').dataset.texte = designTexte ? 'ja' : 'nein';
  meldeDesign(
    `${designSeiten.length} ${designSeiten.length === 1 ? 'Blatt' : 'Blätter'} · ${schritte.length} Bilder · ${
      designTexte ? 'mit' : 'ohne'
    } Texte aus dem Handbuch.`,
    'gut'
  );
}

function meldeDesign(text, art = 'neutral') {
  const zeile = $('#design-meldung');
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------- Ausgabe */

async function sichereBlaetter() {
  if (!designSeiten.length) return;
  const { titel } = designSchritte();
  let gesichert = 0;
  for (const blatt of designSeiten) {
    const blob = await new Promise((fertig) => blatt.leinwand.toBlob(fertig, 'image/png'));
    const name = seitenName(designVorlage, titel, blatt.nummer, blatt.von);
    const ergebnis = await uebergebeDatei(name, blob);
    if (ergebnis.art === 'gesichert') gesichert += 1;
    else break;
  }
  meldeDesign(
    gesichert === designSeiten.length
      ? `${gesichert} ${gesichert === 1 ? 'Blatt' : 'Blätter'} gesichert – ${vorlage(designVorlage).label}, 300 dpi.`
      : `${gesichert} von ${designSeiten.length} Blättern gesichert; der Rest wurde abgebrochen.`,
    gesichert === designSeiten.length ? 'gut' : 'warnung'
  );
}

/**
 * Dieselben Blätter als eine HTML-Datei: zum Ansehen, Weitergeben und
 * Drucken. Der Browser macht daraus ein PDF - die Seite selbst kann das
 * nicht, und ein halbgares eigenes PDF wäre schlechter als der Druckweg.
 */
async function sichereAlsHtml() {
  if (!designSeiten.length) return;
  const { titel } = designSchritte();
  const bilder = designSeiten.map((b) => b.leinwand.toDataURL('image/png'));
  const hoch = designSeiten[0].leinwand.height > designSeiten[0].leinwand.width;
  const html = [
    '<!doctype html><html lang="de"><head><meta charset="utf-8">',
    `<title>${maskiereHtml(titel)} – ${maskiereHtml(vorlage(designVorlage).label)}</title>`,
    `<style>@page{size:A4 ${hoch ? 'portrait' : 'landscape'};margin:0}`,
    'body{margin:0;background:#eceef2;font-family:system-ui,sans-serif}',
    'figure{margin:0 auto 18px;max-width:1100px}img{display:block;width:100%;height:auto;box-shadow:0 2px 10px rgba(0,0,0,.18)}',
    '@media print{body{background:#fff}figure{margin:0;max-width:none;page-break-after:always}img{box-shadow:none}}',
    '</style></head><body>',
    ...bilder.map((b) => `<figure><img src="${b}" alt="Blatt"></figure>`),
    '</body></html>'
  ].join('');
  const name = `${bereinigeDateiname(`${designVorlage}-${titel}`) || 'blatt'}.html`;
  const ergebnis = await uebergebeDatei(name, html);
  meldeDesign(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – im Browser öffnen und drucken ergibt das PDF.`
      : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

function verdrahteDesign() {
  $('#design-quelle').addEventListener('change', (e) => {
    designQuelle = e.target.value;
    zeichneDesign();
  });
  $('#design-vorlage').addEventListener('change', (e) => {
    designVorlage = e.target.value;
    designFormat = '';
    zeichneDesign();
  });
  $('#design-format').addEventListener('change', (e) => {
    designFormat = e.target.value;
    zeichneDesign();
  });
  $('#design-texte').addEventListener('change', (e) => {
    designTexte = e.target.checked;
    zeichneDesign();
  });
  $('#design-labels').addEventListener('change', (e) => {
    designLabels = e.target.checked;
    zeichneDesign();
  });
  $('#design-sichern').addEventListener('click', sichereBlaetter);
  $('#design-html').addEventListener('click', sichereAlsHtml);
}

verdrahteDesign();

