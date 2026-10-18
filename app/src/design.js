/* =========================================================================
   Designstudio – aus Bildern wird ein Blatt.

   Hauptzweck der Anwendung: aus der Galerie entstehen Benutzerhandbuch,
   Releaseletter, One Pager und Quick Guide – in der Auflösung, die der Druck
   braucht (300 dpi, A4). Die Texte kommen wahlweise aus der Gliederung des
   Handbuchs; ohne sie stehen nur die Anweisungen der Strecke da.

   Gerechnet wird auf Leinwänden in voller Größe, angezeigt wird verkleinert.
   ========================================================================= */

let designQuelle = ''; // Kennung einer Strecke oder 'kapitel:7.5'
let designSeiten = []; // zuletzt gerechnete Blätter als Leinwände
// Die Einstellungen des Studios überleben das Neuladen: eine Vorlage, die man
// einmal einrichtet, soll man wiederfinden.
let studio = leseDesignEinstellungen(leseStudioSpeicher());

function leseStudioSpeicher() {
  try {
    return localStorage.getItem(DESIGN_SCHLUESSEL);
  } catch (fehler) {
    return null;
  }
}

function sichereStudio() {
  try {
    localStorage.setItem(DESIGN_SCHLUESSEL, schreibeDesignEinstellungen(studio));
  } catch (fehler) {
    // Ohne Speicher gilt die Einstellung nur für diese Sitzung.
  }
}

/**
 * Ändert eine Einstellung, schreibt sie fort und zeichnet neu. Gibt das
 * Zeichnen zurück: wer danach etwas melden will, muss darauf warten - sonst
 * überschreibt die Meldung des Zeichnens die eigene.
 */
function aendereStudio(aenderung, neuZeichnen = true) {
  studio = { ...studio, ...aenderung };
  sichereStudio();
  return neuZeichnen ? zeichneDesign() : Promise.resolve();
}

const designVorlageSatz = () => vorlageAus(studio.vorlage, studio.eigene);
let designVariante = ''; // '' oder 'sprache:en' – die Ausgabe in einer Variante
let designFehlendeVarianten = []; // Schritte ohne Entsprechung, zuletzt gerechnet
let studioTakt = 0; // gedrosseltes Neuzeichnen beim Tippen

/** Die Inhalte, aus denen ein Blatt entstehen kann. */
function designQuellen() {
  const ausStrecken = strecken.map((s) => ({
    id: 'strecke:' + s.id,
    label: `Strecke · ${s.name || 'ohne Namen'} (${s.schritte.length})`
  }));
  // Jede Stelle mit Bildern ist auch eine mögliche Vorlage.
  const { zahlen } = zaehleBilder(GLIEDERUNG, imProjekt());
  const ausKapiteln = GLIEDERUNG.filter((e) => (zahlen.get(e.nummer) || {}).gesamt).map((e) => ({
    id: 'kapitel:' + e.nummer,
    label: `Kapitel · ${e.nummer} ${e.thema} (${zahlen.get(e.nummer).gesamt})`
  }));
  return [...ausStrecken, ...ausKapiteln];
}

/** Die Schritte des gewählten Inhalts: Bild, Anweisung, Aufnahme. */
function designSchritte() {
  const [varianteFeld, varianteWert] = designVariante ? designVariante.split(':') : ['', ''];
  designFehlendeVarianten = [];
  if (designQuelle.startsWith('strecke:')) {
    const gefunden = strecken.find((s) => 'strecke:' + s.id === designQuelle);
    if (!gefunden) return { titel: '', schritte: [] };
    // Die Ausgabe in einer anderen Sprache tauscht je Schritt das Bild gegen
    // seine Entsprechung; wo keine vorliegt, bleibt das bisherige stehen und
    // wird genannt.
    let strecke = gefunden;
    if (varianteFeld && varianteWert) {
      const umgestellt = streckeInVariante(gefunden, eingang, varianteFeld, varianteWert);
      strecke = umgestellt.strecke;
      designFehlendeVarianten = umgestellt.fehlt;
    }
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
    // Bei einem Kapitel ist die Variante ein Filter: nur die Bilder in dieser
    // Sprache, Rolle, Sparte oder diesem Markt.
    const bilder = sortiereNachKapitel(
      imProjekt().filter(
        (a) =>
          gehoertZu(String(a.gliederung || ''), stelle) &&
          (!varianteFeld || String(a[varianteFeld] || '') === varianteWert)
      )
    );
    return {
      titel:
        (eintrag ? `${eintrag.nummer} ${eintrag.thema}` : stelle) +
        (varianteFeld ? ` · ${labelWert(varianteFeld, varianteWert)}` : ''),
      schritte: bilder.map((a, i) => ({ aufnahme: a, anweisung: a.titel, nummer: i + 1 }))
    };
  }
  return { titel: '', schritte: [] };
}

/* ------------------------------------------------------------- Zeichnen */

/**
 * Kopfzeile eines Blattes. Welche Angaben darin stehen, bestimmt das Studio;
 * die Seitenzahl steht - wenn gewählt - rechts, alles andere links. So ist
 * die Zeile auf jeder Seite gleich gebaut, auch wenn sie anders gefüllt ist.
 */
function zeichneBlattkopf(stift, seite, aufbau, titel, info = {}) {
  const { format: fmt, vorlage: vor } = aufbau;
  const kontext = {
    titel: studio.titel || titel,
    kapitel: info.kapitel || '',
    projekt: info.projekt || '',
    vorlage: vor.label,
    nummer: seite.nummer,
    von: seite.von
  };
  const links = zeilenTeile(
    studio.kopf.filter((k) => k !== 'seitenzahl'),
    kontext
  ).join(' · ');
  const rechtsTeile = zeilenTeile(
    studio.kopf.filter((k) => k === 'seitenzahl'),
    kontext
  );
  if (!links && !rechtsTeile.length) return;
  // Erst rechts setzen, dann weiß der Titel, wie viel Platz ihm bleibt.
  const rechts = rechtsTeile.join(' · ');
  stift.fillStyle = token('--tinte-3', '#77839A');
  stift.font = `400 ${Math.round(seite.kopfHoehe * 0.2)}px ${token('--schrift-mono', 'monospace')}`;
  stift.textAlign = 'right';
  stift.textBaseline = 'alphabetic';
  stift.fillText(rechts, fmt.breite - seite.rand, Math.round(seite.kopfHoehe * 0.62));
  const belegt = rechts ? stift.measureText(rechts).width : 0;

  stift.fillStyle = token('--tinte', '#141A24');
  stift.font = `600 ${Math.round(seite.kopfHoehe * 0.34)}px ${token('--schrift-display', 'sans-serif')}`;
  stift.textAlign = 'left';
  const platz = fmt.breite - 2 * seite.rand - belegt - Math.round(seite.rand * 0.8);
  stift.fillText(beschneide(stift, links, platz), seite.rand, Math.round(seite.kopfHoehe * 0.62));
  stift.strokeStyle = token('--linie', '#D6DBE4');
  stift.lineWidth = 2;
  stift.beginPath();
  stift.moveTo(seite.rand, Math.round(seite.kopfHoehe * 0.78));
  stift.lineTo(fmt.breite - seite.rand, Math.round(seite.kopfHoehe * 0.78));
  stift.stroke();
}

/**
 * Fußzeile aus den gewählten Teilen. Stand und Herkunft sind die Vorgabe -
 * ein Blatt ohne Datum ist wertlos, und wer es in der Hand hält, soll sehen,
 * woher es kommt.
 */
function zeichneBlattfuss(stift, seite, aufbau, info = {}) {
  const { format: fmt } = aufbau;
  const kontext = {
    herkunft: `Screenarchiv ${DATEN.anwendung}`,
    stand: info.stand || new Date().toISOString(),
    labels: info.labels || '',
    hinweis: studio.hinweis,
    nummer: seite.nummer,
    von: seite.von
  };
  const links = zeilenTeile(
    studio.fuss.filter((f) => f !== 'seitenzahl'),
    kontext
  ).join(' · ');
  const rechts = zeilenTeile(
    studio.fuss.filter((f) => f === 'seitenzahl'),
    kontext
  ).join('');
  const y = fmt.hoehe - Math.round(seite.fussHoehe * 0.35);
  stift.fillStyle = token('--tinte-3', '#77839A');
  stift.font = `400 ${Math.round(seite.fussHoehe * 0.38)}px ${token('--schrift-mono', 'monospace')}`;
  stift.textBaseline = 'alphabetic';
  if (rechts) {
    stift.textAlign = 'right';
    stift.fillText(rechts, fmt.breite - seite.rand, y);
  }
  if (links) {
    stift.textAlign = 'left';
    stift.fillText(beschneide(stift, links, fmt.breite - 2 * seite.rand - (rechts ? stift.measureText(rechts).width + 40 : 0)), seite.rand, y);
  }
}

/**
 * Das Deckblatt: Titel, Untertitel, die Angaben als Paare, der Hinweis
 * unten. Es sagt, was man in der Hand hält - ohne es beginnt eine Unterlage
 * mitten im Satz.
 */
function zeichneDeckblatt(stift, aufbau, info) {
  const fmt = aufbau.format;
  const rand = Math.round(fmt.breite * 0.09);
  const blatt = deckblattZeilen(info);
  stift.fillStyle = token('--flaeche', '#FFFFFF');
  stift.fillRect(0, 0, fmt.breite, fmt.hoehe);

  // Ein Band oben gibt dem Blatt eine Kante, ohne Bild von außen.
  stift.fillStyle = token('--akzent', '#B4432B');
  stift.fillRect(0, 0, fmt.breite, Math.round(fmt.hoehe * 0.012));

  stift.textAlign = 'left';
  stift.textBaseline = 'top';
  let y = Math.round(fmt.hoehe * 0.2);

  const titelGross = Math.round(fmt.breite * 0.055);
  stift.fillStyle = token('--tinte', '#141A24');
  stift.font = `600 ${titelGross}px ${token('--schrift-display', 'sans-serif')}`;
  for (const zeile of umbrich(stift, blatt.titel, fmt.breite - 2 * rand).slice(0, 3)) {
    stift.fillText(zeile, rand, y);
    y += Math.round(titelGross * 1.22);
  }

  if (blatt.untertitel) {
    const schrift = Math.round(titelGross * 0.42);
    y += Math.round(schrift * 0.6);
    stift.fillStyle = token('--tinte-2', '#4A5769');
    stift.font = `400 ${schrift}px ${token('--schrift-text', 'sans-serif')}`;
    for (const zeile of umbrich(stift, blatt.untertitel, fmt.breite - 2 * rand).slice(0, 3)) {
      stift.fillText(zeile, rand, y);
      y += Math.round(schrift * 1.4);
    }
  }

  y += Math.round(fmt.hoehe * 0.05);
  stift.strokeStyle = token('--linie', '#D6DBE4');
  stift.lineWidth = 2;
  stift.beginPath();
  stift.moveTo(rand, y);
  stift.lineTo(fmt.breite - rand, y);
  stift.stroke();
  y += Math.round(fmt.hoehe * 0.03);

  const schrift = Math.round(fmt.breite * 0.016);
  for (const [schild, wert] of blatt.paare) {
    stift.font = `400 ${schrift}px ${token('--schrift-mono', 'monospace')}`;
    stift.fillStyle = token('--tinte-3', '#77839A');
    stift.fillText(schild, rand, y);
    stift.font = `500 ${Math.round(schrift * 1.1)}px ${token('--schrift-text', 'sans-serif')}`;
    stift.fillStyle = token('--tinte', '#141A24');
    stift.fillText(beschneide(stift, String(wert), fmt.breite - rand - (rand + Math.round(fmt.breite * 0.3))), rand + Math.round(fmt.breite * 0.3), y);
    y += Math.round(schrift * 2.1);
  }

  if (blatt.hinweis) {
    stift.font = `400 ${Math.round(schrift * 0.95)}px ${token('--schrift-mono', 'monospace')}`;
    stift.fillStyle = token('--tinte-3', '#77839A');
    stift.fillText(beschneide(stift, blatt.hinweis, fmt.breite - 2 * rand), rand, fmt.hoehe - Math.round(fmt.hoehe * 0.07));
  }
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
    mitTexten: studio.texte,
    grenze: vor.textlaenge
  });
  // Die Schrift richtet sich nach der Textspalte, nicht nach der Kachel -
  // sonst wird sie in einer schmalen Spalte riesig.
  const grund = Math.round(textBreite * (kachel.textNeben ? 0.062 : 0.038));
  const schlussHoehe = studio.labels ? Math.round(grund * 2.4) : 0;
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

  if (studio.labels) {
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
    vorlage: designVorlageSatz(),
    format: studio.format || designVorlageSatz().format,
    mitTexten: studio.texte
  });
  // Die Bilder einmal laden, nicht je Seite.
  const bilder = new Map();
  for (const schritt of schritte) {
    if (!schritt.aufnahme || bilder.has(schritt.aufnahme.id)) continue;
    const adresse = await bestesBild(schritt.aufnahme, (neuesteFassung(schritt.aufnahme) || {}).nummer);
    const geladen = await ladeBild(adresse, 'eingang', schritt.aufnahme.titel);
    bilder.set(schritt.aufnahme.id, { element: geladen.element, breite: geladen.breite, hoehe: geladen.hoehe });
  }
  // Was allen Bildern gemeinsam ist, gehört in Kopf, Fuß und Deckblatt.
  const aufnahmen = schritte.map((s) => s.aufnahme).filter(Boolean);
  const stand = new Date().toISOString();
  const info = {
    kapitel: [...new Set(aufnahmen.map((a) => kapitelKennung(a)).filter(Boolean))].slice(0, 3).join(', '),
    projekt: [...new Set(aufnahmen.map((a) => a.projekt).filter(Boolean))].join(', '),
    labels: gemeinsameLabels(aufnahmen),
    stand
  };

  const blaetter = [];
  if (studio.deckblatt) {
    const deckblatt = document.createElement('canvas');
    deckblatt.width = aufbau.format.breite;
    deckblatt.height = aufbau.format.hoehe;
    zeichneDeckblatt(deckblatt.getContext('2d'), aufbau, {
      titel: studio.titel || titel,
      untertitel: studio.untertitel,
      hinweis: studio.hinweis,
      quelle: titel,
      kapitel: info.kapitel,
      anzahl: schritte.length,
      seiten: aufbau.seiten.length,
      vorlage: aufbau.vorlage.label,
      labels: info.labels,
      projekt: info.projekt,
      stand
    });
    blaetter.push({ nummer: 0, von: aufbau.seiten.length, leinwand: deckblatt, titel, deckblatt: true });
  }

  for (const seite of aufbau.seiten) {
    const leinwand = document.createElement('canvas');
    leinwand.width = aufbau.format.breite;
    leinwand.height = aufbau.format.hoehe;
    const stift = leinwand.getContext('2d');
    stift.fillStyle = token('--flaeche', '#FFFFFF');
    stift.fillRect(0, 0, leinwand.width, leinwand.height);
    zeichneBlattkopf(stift, seite, aufbau, titel, info);
    for (const kachel of seite.kacheln) {
      const bild = kachel.schritt.aufnahme && bilder.get(kachel.schritt.aufnahme.id);
      if (bild) zeichneKachel(stift, kachel, bild, aufbau);
    }
    zeichneBlattfuss(stift, seite, aufbau, info);
    blaetter.push({ nummer: seite.nummer, von: seite.von, leinwand, titel });
  }
  return blaetter;
}

/* ------------------------------------------------- Studio: die Einstellungen */

/** Die Schalter für Kopf- und Fußzeile - als Liste, nicht als Geheimnis. */
function zeichneTeileschalter(kasten, teile, gewaehlt, schluessel) {
  kasten.replaceChildren(
    ...teile.map((teil) => {
      const haken = el('input', { type: 'checkbox', id: `${schluessel}-${teil.id}`, checked: gewaehlt.includes(teil.id) });
      haken.addEventListener('change', (e) => {
        const liste = e.target.checked
          ? [...studio[schluessel], teil.id].filter((x, i, alle) => alle.indexOf(x) === i)
          : studio[schluessel].filter((x) => x !== teil.id);
        // Die Folge der Teile ist die der Liste, nicht die des Anklickens.
        const ordnung = teile.map((x) => x.id);
        aendereStudio({ [schluessel]: ordnung.filter((x) => liste.includes(x)) });
      });
      return el('label', { klasse: 'markier-schalter' }, [haken, el('span', { text: teil.label })]);
    })
  );
}

// Der Name sagt es genau: die Einstellungen, nicht das Blatt. (In
// aufnahme.js heißt die Studioansicht der Aufnahme schon zeichneStudio -
// zwei gleiche Namen in einer Klammer wären einer zu viel.)
/** Die Werte, in die sich die Ausgabe umstellen lässt - aus dem Bestand. */
function designVariantenwahl() {
  const wahl = [];
  for (const feld of VARIANTEN_FELDER) {
    const werte = [...new Set(imProjekt().map((a) => String(a[feld] || '')).filter(Boolean))].sort((a, b) =>
      labelWert(feld, a).localeCompare(labelWert(feld, b))
    );
    for (const wert of werte) {
      wahl.push({
        id: `${feld}:${wert}`,
        label: `${LABEL_FELDER.find((f) => f.id === feld).label}: ${labelWert(feld, wert)}`
      });
    }
  }
  return wahl;
}

function zeichneStudioeinstellungen() {
  $('#design-deckblatt').checked = studio.deckblatt;
  $('#design-texte').checked = studio.texte;
  $('#design-labels').checked = studio.labels;
  if ($('#design-titel') !== document.activeElement) $('#design-titel').value = studio.titel;
  if ($('#design-untertitel') !== document.activeElement) $('#design-untertitel').value = studio.untertitel;
  if ($('#design-hinweis') !== document.activeElement) $('#design-hinweis').value = studio.hinweis;
  zeichneTeileschalter($('#design-kopf-teile'), KOPF_TEILE, studio.kopf, 'kopf');
  zeichneTeileschalter($('#design-fuss-teile'), FUSS_TEILE, studio.fuss, 'fuss');
  $('#eigen-format').replaceChildren(
    ...FORMATE.map((f) => el('option', { value: f.id, text: f.label, selected: f.id === (studio.format || 'a4-hoch') }))
  );
  zeigeHandbuchUmfang();
  const eigen = studio.eigene.find((v) => v.id === studio.vorlage);
  $('#eigen-loeschen').disabled = !eigen;
  if (eigen && $('#eigen-label') !== document.activeElement) {
    // Die gewählte eigene Vorlage steht in den Feldern - so lässt sie sich
    // ändern und erneut speichern, statt neben sich eine zweite zu bekommen.
    $('#eigen-label').value = eigen.label;
    $('#eigen-spalten').value = String(eigen.spalten);
    $('#eigen-zeilen').value = String(eigen.zeilen);
    $('#eigen-textspalte').value = String(Math.round(eigen.textspalte * 100));
    $('#eigen-textlaenge').value = String(eigen.textlaenge);
  }
}

async function sichereEigeneVorlage() {
  const satz = eigeneVorlage({
    label: $('#eigen-label').value,
    spalten: $('#eigen-spalten').value,
    zeilen: $('#eigen-zeilen').value,
    textspalte: Number($('#eigen-textspalte').value) / 100,
    textlaenge: $('#eigen-textlaenge').value,
    format: $('#eigen-format').value,
    zweck: 'Eigene Vorlage.'
  });
  if (!satz) {
    meldeDesign('Die eigene Vorlage braucht einen Namen.', 'warnung');
    $('#eigen-label').focus({ preventScroll: true });
    return;
  }
  const schonDa = studio.eigene.some((v) => v.id === satz.id);
  await aendereStudio({
    eigene: schonDa ? studio.eigene.map((v) => (v.id === satz.id ? satz : v)) : [...studio.eigene, satz],
    vorlage: satz.id,
    format: satz.format
  });
  meldeDesign(
    `Vorlage „${satz.label}" ${schonDa ? 'geändert' : 'gespeichert'} – ${satz.spalten} × ${satz.zeilen} Bilder je Seite.`,
    'gut'
  );
}

async function loescheEigeneVorlage() {
  const eigen = studio.eigene.find((v) => v.id === studio.vorlage);
  if (!eigen) return;
  await aendereStudio({ eigene: studio.eigene.filter((v) => v.id !== eigen.id), vorlage: VORLAGEN[0].id, format: '' });
  meldeDesign(`Vorlage „${eigen.label}" gelöscht. Die Bilder bleiben.`, 'neutral');
}

/* -------------------------------------------------------------- Ansicht */

async function zeichneDesign() {
  if (document.getElementById('design-ansicht').hidden) return;
  zeichneStudioeinstellungen();
  const quellen = designQuellen();
  if (!quellen.some((q) => q.id === designQuelle)) designQuelle = quellen.length ? quellen[0].id : '';
  $('#design-quelle').replaceChildren(
    ...(quellen.length
      ? quellen.map((q) => el('option', { value: q.id, text: q.label, selected: q.id === designQuelle }))
      : [el('option', { value: '', text: 'noch keine Strecke und kein Kapitel mit Bildern' })])
  );
  $('#design-vorlage').replaceChildren(
    ...alleVorlagen(studio.eigene).map((v) =>
      el('option', { value: v.id, text: v.eigen ? `${v.label} (eigene)` : v.label, selected: v.id === studio.vorlage })
    )
  );
  const vor = designVorlageSatz();
  $('#design-format').replaceChildren(
    ...FORMATE.map((f) =>
      el('option', { value: f.id, text: f.label, selected: f.id === (studio.format || vor.format) })
    )
  );
  $('#design-zweck').textContent = `${vor.zweck} Bis zu ${vor.spalten * vor.zeilen} Bilder je Seite, ${
    format(studio.format || vor.format).label
  }, 300 dpi.`;
  const varianten = designVariantenwahl();
  if (designVariante && !varianten.some((v) => v.id === designVariante)) designVariante = '';
  $('#design-variante').replaceChildren(
    el('option', { value: '', text: 'wie abgelegt', selected: !designVariante }),
    ...varianten.map((v) => el('option', { value: v.id, text: v.label, selected: v.id === designVariante }))
  );

  const { schritte } = designSchritte();
  $('#design-sichern').disabled = !schritte.length;
  $('#design-html').disabled = !schritte.length;
  $('#design-pdf').disabled = !schritte.length;
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
        el('figcaption', {
          text: blatt.deckblatt
            ? `Deckblatt · ${blatt.leinwand.width} × ${blatt.leinwand.height} px`
            : `Seite ${blatt.nummer} von ${blatt.von} · ${blatt.leinwand.width} × ${blatt.leinwand.height} px`
        })
      ]);
    })
  );
  // Der Stand steht am Container: welche Vorlage hier gerade liegt.
  $('#design-blaetter').dataset.vorlage = studio.vorlage;
  $('#design-blaetter').dataset.texte = studio.texte ? 'ja' : 'nein';
  const luecke = designFehlendeVarianten.length
    ? ` · ${designFehlendeVarianten.length} Schritt(e) ohne Entsprechung: ${designFehlendeVarianten
        .map((f) => f.nummer)
        .join(', ')}`
    : '';
  meldeDesign(
    `${designSeiten.length} ${designSeiten.length === 1 ? 'Blatt' : 'Blätter'}${
      studio.deckblatt ? ' (mit Deckblatt)' : ''
    } · ${schritte.length} Bilder · ${studio.texte ? 'mit' : 'ohne'} Texte aus dem Handbuch${luecke}.`,
    designFehlendeVarianten.length ? 'warnung' : 'gut'
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
    const name = blatt.deckblatt
      ? `${bereinigeDateiname(`${studio.vorlage}-${titel}`) || 'blatt'}-deckblatt.png`
      : seitenName(studio.vorlage, titel, blatt.nummer, blatt.von);
    const ergebnis = await uebergebeDatei(name, blob);
    if (ergebnis.art === 'gesichert') gesichert += 1;
    else break;
  }
  meldeDesign(
    gesichert === designSeiten.length
      ? `${gesichert} ${gesichert === 1 ? 'Blatt' : 'Blätter'} gesichert – ${designVorlageSatz().label}, 300 dpi.`
      : `${gesichert} von ${designSeiten.length} Blättern gesichert; der Rest wurde abgebrochen.`,
    gesichert === designSeiten.length ? 'gut' : 'warnung'
  );
}

/**
 * Dieselben Blätter als eine PDF-Datei, 300 dpi. Jedes Blatt wandert als
 * JPEG hinein, das Seitenformat folgt den Bildpunkten - A4 bleibt A4. Das
 * Gerüst baut der Kern (`pdfAusSeiten`), ohne fremde Bibliothek: die
 * Inhaltsrichtlinie des Artifacts ließe keine zu.
 */
async function sichereAlsPdf() {
  if (!designSeiten.length) return;
  const { titel } = designSchritte();
  $('#design-pdf').disabled = true;
  meldeDesign(`PDF wird gebaut – ${designSeiten.length} Blatt (Blätter) …`, 'neutral');
  const seiten = [];
  for (const blatt of designSeiten) {
    const blob = await new Promise((fertig) => blatt.leinwand.toBlob(fertig, 'image/jpeg', 0.9));
    if (!blob) continue;
    seiten.push({
      daten: new Uint8Array(await blob.arrayBuffer()),
      breite: blatt.leinwand.width,
      hoehe: blatt.leinwand.height
    });
  }
  const pdf = pdfAusSeiten(seiten, {
    titel: `${titel} – ${designVorlageSatz().label}`,
    anwendung: DATEN.anwendung
  });
  $('#design-pdf').disabled = false;
  if (!pdf) {
    meldeDesign('Kein Blatt ließ sich in das PDF legen.', 'warnung');
    return;
  }
  const name = `${bereinigeDateiname(`${studio.vorlage}-${titel}`) || 'blatt'}.pdf`;
  const ergebnis = await uebergebeDatei(name, new Blob([pdf], { type: 'application/pdf' }));
  meldeDesign(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${seiten.length} Seite(n) A4, 300 dpi.`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Die Blätter bleiben in der Ansicht.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/**
 * Dieselben Blätter als eine HTML-Datei: zum Ansehen im Browser und zum
 * Weitergeben an jemanden, der lieber scrollt als blättert.
 */
async function sichereAlsHtml() {
  if (!designSeiten.length) return;
  const { titel } = designSchritte();
  const bilder = designSeiten.map((b) => b.leinwand.toDataURL('image/png'));
  const hoch = designSeiten[0].leinwand.height > designSeiten[0].leinwand.width;
  const html = [
    '<!doctype html><html lang="de"><head><meta charset="utf-8">',
    `<title>${maskiereHtml(titel)} – ${maskiereHtml(designVorlageSatz().label)}</title>`,
    `<style>@page{size:A4 ${hoch ? 'portrait' : 'landscape'};margin:0}`,
    'body{margin:0;background:#eceef2;font-family:system-ui,sans-serif}',
    'figure{margin:0 auto 18px;max-width:1100px}img{display:block;width:100%;height:auto;box-shadow:0 2px 10px rgba(0,0,0,.18)}',
    '@media print{body{background:#fff}figure{margin:0;max-width:none;page-break-after:always}img{box-shadow:none}}',
    '</style></head><body>',
    ...bilder.map((b) => `<figure><img src="${b}" alt="Blatt"></figure>`),
    '</body></html>'
  ].join('');
  const name = `${bereinigeDateiname(`${studio.vorlage}-${titel}`) || 'blatt'}.html`;
  const ergebnis = await uebergebeDatei(name, html);
  meldeDesign(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – im Browser öffnen, ansehen, drucken. Ein fertiges PDF gibt „Als PDF sichern".`
      : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/* ------------------------------------------------------------ Handbuch */

/** Welche Stellen das Handbuch umfassen soll - nach der Wahl im Studio. */
function handbuchAuswahl() {
  const umfang = $('#handbuch-umfang').value;
  const stelle = umfang === 'kapitel' && designQuelle.startsWith('kapitel:') ? designQuelle.slice(8) : '';
  return {
    stelle,
    teile: handbuchTeile(GLIEDERUNG, imProjekt(), strecken, { stelle, nurMitBildern: umfang !== 'alle' })
  };
}

/** Sagt vor dem Rechnen, was herauskäme. */
function zeigeHandbuchUmfang() {
  const { teile, stelle } = handbuchAuswahl();
  const zahl = handbuchUmfang(teile);
  $('#handbuch-umfang-stand').textContent = zahl.stellen
    ? `${zahl.kapitel} Kapitel · ${zahl.stellen} Stellen · ${zahl.bilder} Bilder${
        zahl.ohneBild ? ` · ${zahl.ohneBild} noch ohne Bild` : ''
      }${stelle ? ` · nur ${stelle}` : ''}`
    : 'Keine Stelle im Umfang – Bildern im Editor eine Stelle geben oder „die ganze Gliederung" wählen.';
  $('#handbuch-sichern').disabled = !zahl.stellen;
}

/**
 * Ein Bild für das Handbuch. Voll heißt PNG in Originalgröße; begrenzt heißt
 * JPEG auf die gewählte Breite - 300 Seiten in voller Auflösung sprengen jede
 * Datei, und für den Druck reichen 1600 px auf A4 allemal.
 */
async function handbuchBild(aufnahme, grenze) {
  const adresse = await bestesBild(aufnahme, (neuesteFassung(aufnahme) || {}).nummer);
  if (!adresse) return '';
  if (!grenze) return adresse;
  const geladen = await ladeBild(adresse, 'eingang', aufnahme.titel);
  const massstab = Math.min(1, grenze / Math.max(1, geladen.breite));
  const leinwand = document.createElement('canvas');
  leinwand.width = Math.max(1, Math.round(geladen.breite * massstab));
  leinwand.height = Math.max(1, Math.round(geladen.hoehe * massstab));
  const stift = leinwand.getContext('2d');
  stift.imageSmoothingQuality = 'high';
  stift.fillStyle = '#FFFFFF';
  stift.fillRect(0, 0, leinwand.width, leinwand.height);
  stift.drawImage(geladen.element, 0, 0, leinwand.width, leinwand.height);
  return leinwand.toDataURL('image/jpeg', 0.86);
}

/**
 * Dasselbe Handbuch als Word-Datei: Überschriften je Stelle, die Texte der
 * Gliederung, die Anweisungen der Strecke und die Bilder dazwischen - und
 * zwar als Text, nicht als Bild einer Seite. So lässt es sich im Haus
 * weiterschreiben, kommentieren und mit einem Inhaltsverzeichnis versehen.
 */
async function sichereHandbuchWord() {
  const { teile, stelle } = handbuchAuswahl();
  if (!teile.length) return;
  const grenze = Number($('#handbuch-groesse').value) || 1600;
  $('#handbuch-word').disabled = true;
  const zahl = handbuchUmfang(teile);
  meldeDesign(`Word-Handbuch wird gerechnet – ${zahl.bilder} Bilder …`, 'neutral');

  const bilder = new Map();
  let gerechnet = 0;
  for (const teil of teile) {
    for (const aufnahme of teil.bilder) {
      if (bilder.has(aufnahme.id)) continue;
      try {
        bilder.set(aufnahme.id, await handbuchBildBytes(aufnahme, grenze));
      } catch (fehler) {
        // Ein Bild, das sich nicht holen lässt, fehlt im Dokument - der Text
        // bleibt. Besser als gar keine Datei.
      }
      gerechnet += 1;
      if (gerechnet % 5 === 0) meldeDesign(`Word-Handbuch wird gerechnet – ${gerechnet} von ${zahl.bilder} Bildern …`, 'neutral');
    }
  }

  const eintrag = stelle ? GLIEDERUNG.find((e) => e.nummer === stelle) : null;
  const titel = studio.titel || (eintrag ? `${eintrag.nummer} ${eintrag.thema}` : 'Benutzerhandbuch');
  const daten = docxAusHandbuch(teile, {
    titel,
    untertitel: studio.untertitel,
    hinweis: studio.hinweis,
    anwendung: DATEN.anwendung,
    bilder,
    mitTexten: studio.texte
  });
  $('#handbuch-word').disabled = false;
  if (!daten) {
    meldeDesign('Das Handbuch ist leer – es gibt nichts zu schreiben.', 'warnung');
    return;
  }
  const name = `handbuch-${bereinigeDateiname(titel) || 'oneSCM'}.docx`;
  const ergebnis = await uebergebeDatei(
    name,
    new Blob([daten], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  );
  meldeDesign(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${zahl.stellen} Stellen, ${bilder.size} Bilder, Text als Text.`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/** Dasselbe Bild wie fürs HTML-Handbuch, aber als Bytes statt als Adresse. */
async function handbuchBildBytes(aufnahme, grenze) {
  const adresse = await bestesBild(aufnahme, (neuesteFassung(aufnahme) || {}).nummer);
  const geladen = await ladeBild(adresse, 'eingang', aufnahme.titel);
  const massstab = Math.min(1, (grenze || 1600) / Math.max(1, geladen.breite));
  const leinwand = document.createElement('canvas');
  leinwand.width = Math.max(1, Math.round(geladen.breite * massstab));
  leinwand.height = Math.max(1, Math.round(geladen.hoehe * massstab));
  const stift = leinwand.getContext('2d');
  stift.imageSmoothingQuality = 'high';
  stift.fillStyle = '#FFFFFF';
  stift.fillRect(0, 0, leinwand.width, leinwand.height);
  stift.drawImage(geladen.element, 0, 0, leinwand.width, leinwand.height);
  const blob = await new Promise((f) => leinwand.toBlob(f, 'image/jpeg', 0.88));
  return {
    daten: new Uint8Array(await blob.arrayBuffer()),
    breite: leinwand.width,
    hoehe: leinwand.height,
    typ: 'jpeg'
  };
}

async function sichereHandbuch() {
  const { teile, stelle } = handbuchAuswahl();
  if (!teile.length) return;
  const grenze = Number($('#handbuch-groesse').value) || 0;
  $('#handbuch-sichern').disabled = true;
  const zahl = handbuchUmfang(teile);
  meldeDesign(`Handbuch wird gerechnet – ${zahl.bilder} Bilder …`, 'neutral');

  const bilder = new Map();
  let gerechnet = 0;
  for (const teil of teile) {
    for (const aufnahme of teil.bilder) {
      if (bilder.has(aufnahme.id)) continue;
      try {
        bilder.set(aufnahme.id, await handbuchBild(aufnahme, grenze));
      } catch (fehler) {
        bilder.set(aufnahme.id, aufnahme.bild || '');
      }
      gerechnet += 1;
      if (gerechnet % 5 === 0) meldeDesign(`Handbuch wird gerechnet – ${gerechnet} von ${zahl.bilder} Bildern …`, 'neutral');
    }
  }

  const eintrag = stelle ? GLIEDERUNG.find((e) => e.nummer === stelle) : null;
  const titel = studio.titel || (eintrag ? `${eintrag.nummer} ${eintrag.thema}` : 'Benutzerhandbuch');
  const html = handbuchHtml(teile, {
    titel,
    untertitel: studio.untertitel,
    hinweis: studio.hinweis,
    anwendung: DATEN.anwendung,
    bilder,
    mitTexten: studio.texte
  });
  const name = `handbuch-${bereinigeDateiname(titel) || 'oneSCM'}.html`;
  const ergebnis = await uebergebeDatei(name, new Blob([html], { type: 'text/html' }));
  $('#handbuch-sichern').disabled = false;
  if (ergebnis.art === 'gesichert') {
    meldeDesign(
      `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${zahl.stellen} Stellen, ${zahl.bilder} Bilder. Im Browser öffnen und drucken ergibt das PDF.`,
      'gut'
    );
    return;
  }
  meldeDesign(
    ergebnis.art === 'zu_gross'
      ? `Das Handbuch ist mit ${formatiereBytes(ergebnis.groesse)} zu groß für eine Datei (Grenze 16 MB). Bilder kleiner wählen oder den Umfang auf ein Kapitel einschränken.`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Das Handbuch bleibt ungesichert.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    'warnung'
  );
}

function verdrahteDesign() {
  $('#design-quelle').addEventListener('change', (e) => {
    designQuelle = e.target.value;
    zeichneDesign();
  });
  $('#design-vorlage').addEventListener('change', (e) => {
    // Eine neue Vorlage bringt ihr eigenes Format mit.
    aendereStudio({ vorlage: e.target.value, format: '' });
  });
  $('#design-format').addEventListener('change', (e) => aendereStudio({ format: e.target.value }));
  $('#design-texte').addEventListener('change', (e) => aendereStudio({ texte: e.target.checked }));
  $('#design-labels').addEventListener('change', (e) => aendereStudio({ labels: e.target.checked }));
  $('#design-deckblatt').addEventListener('change', (e) => aendereStudio({ deckblatt: e.target.checked }));
  $('#design-variante').addEventListener('change', (e) => {
    designVariante = e.target.value;
    zeichneDesign();
  });
  for (const [feld, schluessel] of [
    ['#design-titel', 'titel'],
    ['#design-untertitel', 'untertitel'],
    ['#design-hinweis', 'hinweis']
  ]) {
    $(feld).addEventListener('input', (e) => {
      // Beim Tippen nicht neu rechnen - das kostet bei 300 dpi zu viel.
      studio = { ...studio, [schluessel]: e.target.value };
      sichereStudio();
      clearTimeout(studioTakt);
      studioTakt = setTimeout(zeichneDesign, 500);
    });
  }
  $('#handbuch-umfang').addEventListener('change', zeigeHandbuchUmfang);
  $('#design-pdf').addEventListener('click', sichereAlsPdf);
  $('#handbuch-sichern').addEventListener('click', sichereHandbuch);
  $('#handbuch-word').addEventListener('click', sichereHandbuchWord);
  $('#eigen-sichern').addEventListener('click', sichereEigeneVorlage);
  $('#eigen-loeschen').addEventListener('click', loescheEigeneVorlage);
  $('#design-sichern').addEventListener('click', sichereBlaetter);
  $('#design-html').addEventListener('click', sichereAlsHtml);
}

verdrahteDesign();

