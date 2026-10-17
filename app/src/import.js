/* =========================================================================
   Import – aus bestehenden Dateien wird Galerie.

   Eingelesen werden PNG, JPEG, GIF und WebP unmittelbar, PPTX, DOCX und XLSX
   als Archiv (ein ZIP, das diese Seite selbst auspackt) und PDF mit seinen
   eingebetteten JPEG-Bildern. Die Bilder behalten ihre volle Auflösung; in
   die Liste geht nur eine Vorschau, damit sie flink bleibt.

   Was diese Seite *nicht* kann, steht ausdrücklich da: ganze PDF-Seiten
   zeichnen. Dafür bräuchte es einen PDF-Zeichner, und ein fremdes Skript
   lässt die Inhaltsrichtlinie des Artifacts nicht zu.
   ========================================================================= */

let importDateien = []; // eingelesene Dateien samt ihren Bildern
let importStelle = ''; // Stelle im Handbuch, die für alle gilt
let importLaeuft = false; // während des Übernehmens
let importNummer = 0; // fortlaufende Kennung der Bilder dieser Sitzung

function meldeImport(text, art = 'neutral') {
  const zeile = $('#import-meldung');
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------- Einlesen */

/**
 * Ein Bild aus Rohdaten oder Datenadresse: geladen, gemessen, verkleinert.
 * Gemessen wird am geladenen Bild, nicht am Dateinamen - nur so steht die
 * Auflösung später auch im Beipackzettel richtig.
 */
async function baueImportBild({ name, adresse, seite = 0, seitenname = '', text = '' }) {
  const geladen = await ladeBild(adresse, 'datei', name);
  const leinwand = document.createElement('canvas');
  leinwand.width = geladen.breite;
  leinwand.height = geladen.hoehe;
  leinwand.getContext('2d').drawImage(geladen.element, 0, 0);
  importNummer += 1;
  return {
    id: 'IMP-' + String(importNummer).padStart(3, '0'),
    name,
    adresse,
    vorschau: baueVorschau(leinwand),
    breite: geladen.breite,
    hoehe: geladen.hoehe,
    seite,
    seitenname,
    titel: '',
    notiz: text,
    stelle: '',
    gewaehlt: true,
    gross: false,
    uebernommen: ''
  };
}

/** Rohdaten zu einer Datenadresse - der Weg, den `ladeBild` versteht. */
function alsAdresse(daten, typ) {
  return new Promise((fertig, scheitern) => {
    const leser = new FileReader();
    leser.onload = () => fertig(leser.result);
    leser.onerror = () => scheitern(leser.error || new Error('Datei nicht lesbar'));
    leser.readAsDataURL(new Blob([daten], { type: typ || 'application/octet-stream' }));
  });
}

/** Ein Archiv: Bilder je Folie oder Abschnitt, dazu der Text daneben. */
async function liesOfficeDatei(bytes) {
  const eintraege = leseZipVerzeichnis(bytes);
  if (!eintraege.length) {
    return { bilder: [], text: '', uebergangen: [], hinweis: 'Diese Datei ist kein lesbares Archiv.' };
  }
  const { bilder: medien, uebergangen } = officeBilder(eintraege);
  const nachName = new Map(medien.map((e) => [String(e.name).split('/').pop().toLowerCase(), e]));
  const traeger = officeFolien(eintraege);
  const bilder = [];
  const texte = [];
  const schonDa = new Set();

  for (const seite of traeger) {
    const xml = await entpackeZipEintrag(bytes, seite.xml);
    const text = officeText(xml);
    if (text) texte.push(`${seite.name}: ${text}`);
    const rels = seite.rels ? await entpackeZipEintrag(bytes, seite.rels) : null;
    for (const medienname of medienAusRels(rels)) {
      const eintrag = nachName.get(medienname.toLowerCase());
      if (!eintrag || schonDa.has(eintrag.name)) continue;
      const daten = await entpackeZipEintrag(bytes, eintrag);
      if (!daten) continue;
      schonDa.add(eintrag.name);
      bilder.push(
        await baueImportBild({
          name: String(eintrag.name).split('/').pop(),
          adresse: await alsAdresse(daten, bildTyp(eintrag.name)),
          seite: seite.nummer,
          seitenname: seite.name,
          text
        })
      );
    }
  }

  // Was keine Folie nennt, geht nicht verloren - es steht hinten.
  for (const eintrag of medien) {
    if (schonDa.has(eintrag.name)) continue;
    const daten = await entpackeZipEintrag(bytes, eintrag);
    if (!daten) continue;
    bilder.push(
      await baueImportBild({
        name: String(eintrag.name).split('/').pop(),
        adresse: await alsAdresse(daten, bildTyp(eintrag.name)),
        seitenname: 'ohne Folie'
      })
    );
  }

  return {
    bilder,
    text: texte.join('\n'),
    uebergangen,
    hinweis: bilder.length ? '' : 'In dieser Datei stecken keine anzeigbaren Bilder.'
  };
}

/** Eine einzelne Datei einlesen - was dabei herauskommt, ist ein Satz. */
async function liesEineDatei(datei) {
  const art = dateiArt(datei.name);
  const satz = {
    id: 'DAT-' + Math.random().toString(36).slice(2, 8),
    name: datei.name,
    art,
    groesse: datei.size || 0,
    text: '',
    hinweis: '',
    uebergangen: [],
    bilder: []
  };

  if (art === 'bild') {
    satz.bilder = [await baueImportBild({ name: datei.name, adresse: await leseDateiAlsAdresse(datei) })];
    return satz;
  }

  if (art === 'alt') {
    satz.hinweis =
      'Die alten Formate .ppt, .doc und .xls sind keine Archive. Bitte in PowerPoint oder Word als .pptx bzw. .docx speichern.';
    return satz;
  }

  if (art === 'unbekannt') {
    satz.hinweis = 'Diese Dateiart wird nicht gelesen: PNG, JPEG, GIF, WebP, PPTX, DOCX, XLSX oder PDF.';
    return satz;
  }

  const bytes = new Uint8Array(await datei.arrayBuffer());

  if (art === 'pdf') {
    const { bilder, hinweis } = pdfBilder(bytes);
    satz.hinweis = hinweis;
    for (const roh of bilder) {
      satz.bilder.push(
        await baueImportBild({ name: roh.name, adresse: await alsAdresse(roh.daten, roh.typ), seitenname: 'PDF' })
      );
    }
    return satz;
  }

  const ergebnis = await liesOfficeDatei(bytes);
  satz.bilder = ergebnis.bilder;
  satz.text = ergebnis.text;
  satz.uebergangen = ergebnis.uebergangen;
  satz.hinweis = ergebnis.hinweis;
  return satz;
}

/** Eine Datei als Datenadresse - für Bilder, die unmittelbar lesbar sind. */
function leseDateiAlsAdresse(datei) {
  return new Promise((fertig, scheitern) => {
    const leser = new FileReader();
    leser.onload = () => fertig(leser.result);
    leser.onerror = () => scheitern(leser.error || new Error('Datei nicht lesbar'));
    leser.readAsDataURL(datei);
  });
}

/** Die gewählten Dateien der Reihe nach - eine kaputte stoppt nicht den Rest. */
async function nimmImportDateien(dateien) {
  const liste = [...(dateien || [])];
  if (!liste.length) return;
  meldeImport(`${liste.length} Datei${liste.length === 1 ? '' : 'en'} wird gelesen …`, 'neutral');
  const fehler = [];
  for (const datei of liste) {
    try {
      importDateien = [...importDateien, await liesEineDatei(datei)];
      zeichneImport();
    } catch (f) {
      fehler.push(`${datei.name}: ${f && f.message ? f.message : 'nicht lesbar'}`);
    }
  }
  const bilder = importDateien.reduce((summe, d) => summe + d.bilder.length, 0);
  if (fehler.length) meldeImport(fehler.join(' · '), 'warnung');
  else meldeImport(`${bilder} Bild${bilder === 1 ? '' : 'er'} aus ${importDateien.length} Datei${importDateien.length === 1 ? '' : 'en'} gelesen.`, bilder ? 'gut' : 'warnung');
  zeichneImport();
}

/* -------------------------------------------------------------- Anzeigen */

function importGewaehlte() {
  const gewaehlte = [];
  for (const datei of importDateien) {
    for (const bild of datei.bilder) if (bild.gewaehlt && !bild.uebernommen) gewaehlte.push({ datei, bild });
  }
  return gewaehlte;
}

/** Hält die Knöpfe im Takt, ohne die Liste neu zu zeichnen. */
function aktualisiereImportknoepfe() {
  const offen = importGewaehlte().length;
  $('#import-uebernehmen').disabled = importLaeuft || !offen;
  $('#import-uebernehmen').textContent = offen ? `${offen} Bild${offen === 1 ? '' : 'er'} übernehmen` : 'Gewählte übernehmen';
  $('#import-leeren').disabled = importLaeuft || !importDateien.length;
}

/** Eine Karte je Bild: Vorschau, Titel, Rezept, Stelle. */
function importBildkarte(datei, bild) {
  const kasten = el('figure', {
    klasse: 'import-figur' + (bild.gewaehlt ? ' import-figur--gewaehlt' : '') + (bild.uebernommen ? ' import-figur--fertig' : ''),
    'data-bild': bild.id
  });
  const haken = el('input', { type: 'checkbox', id: 'wahl-' + bild.id, checked: bild.gewaehlt && !bild.uebernommen });
  haken.disabled = Boolean(bild.uebernommen);
  haken.addEventListener('change', (e) => {
    bild.gewaehlt = e.target.checked;
    kasten.classList.toggle('import-figur--gewaehlt', bild.gewaehlt);
    aktualisiereImportknoepfe();
  });

  const schau = el('button', {
    type: 'button',
    klasse: 'import-schau' + (bild.gross ? ' import-schau--gross' : ''),
    title: bild.gross ? 'Verkleinern' : 'In voller Auflösung ansehen',
    onclick: (e) => {
      bild.gross = !bild.gross;
      const knopf = e.currentTarget;
      knopf.classList.toggle('import-schau--gross', bild.gross);
      knopf.title = bild.gross ? 'Verkleinern' : 'In voller Auflösung ansehen';
      // Das volle Bild wird erst beim Ansehen geladen - sonst müsste der
      // Browser für jede Liste alle Dateien in voller Größe entpacken.
      const anzeige = knopf.querySelector('img');
      if (anzeige) anzeige.src = bild.gross ? bild.adresse : bild.vorschau;
    }
  }, el('img', { src: bild.gross ? bild.adresse : bild.vorschau, alt: bild.name, loading: 'lazy' }));

  const stand = bild.uebernommen
    ? el('p', { klasse: 'feld-hinweis import-fertig' }, [
        el('span', { text: `übernommen als ${bild.uebernommen}` }),
        el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          text: 'Im Editor öffnen',
          onclick: () => oeffneEditor(bild.uebernommen)
        })
      ])
    : null;

  kasten.append(
    el('div', { klasse: 'import-figur-kopf' }, [haken, el('label', { for: 'wahl-' + bild.id, text: bild.name })]),
    schau,
    el('figcaption', {
      text: `${bild.breite} × ${bild.hoehe} px${bild.seitenname ? ' · ' + bild.seitenname : ''}`
    }),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'titel-' + bild.id, text: 'Titel' }),
      el('input', {
        type: 'text',
        id: 'titel-' + bild.id,
        value: bild.titel,
        placeholder: importTitel(bild.name, bild.seite || 1, datei.bilder.length),
        oninput: (e) => (bild.titel = e.target.value)
      })
    ]),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'notiz-' + bild.id, text: 'Rezept' }),
      el('textarea', {
        id: 'notiz-' + bild.id,
        rows: '2',
        value: bild.notiz,
        placeholder: 'Was auf dem Bild zu tun ist',
        oninput: (e) => (bild.notiz = e.target.value)
      })
    ]),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'stelle-' + bild.id, text: 'Stelle' }),
      el('input', {
        type: 'text',
        id: 'stelle-' + bild.id,
        list: 'gliederung-vorschlaege',
        autocomplete: 'off',
        value: bild.stelle,
        placeholder: importStelle || 'wie oben',
        oninput: (e) => {
          const roh = String(e.target.value || '').trim();
          bild.stelle = (roh.match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0];
          fuelleStellenvorschlaege(roh);
        }
      })
    ]),
    stand
  );
  return kasten;
}

/** Eine Karte je Datei: Kopf, Text, Bilder. */
function importDateikarte(datei) {
  const kopf = el('div', { klasse: 'import-kopfzeile' }, [
    el('h3', { text: datei.name }),
    el('span', {
      klasse: 'import-art',
      text: `${datei.art.toUpperCase()} · ${formatiereBytes(datei.groesse)} · ${datei.bilder.length} Bild${datei.bilder.length === 1 ? '' : 'er'}`
    }),
    el('div', { klasse: 'markier-knoepfe' }, [
      datei.bilder.length
        ? el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'Alle wählen',
            onclick: () => {
              const alle = datei.bilder.every((b) => b.gewaehlt || b.uebernommen);
              for (const b of datei.bilder) if (!b.uebernommen) b.gewaehlt = !alle;
              zeichneImport();
            }
          })
        : null,
      datei.text
        ? el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'Text als Rezept',
            onclick: () => {
              for (const b of datei.bilder) if (!b.uebernommen && !b.notiz) b.notiz = datei.text;
              zeichneImport();
              meldeImport(`Der Text aus ${datei.name} steht nun in den leeren Rezepten.`, 'gut');
            }
          })
        : null,
      el('button', {
        klasse: 'knopf knopf--klein',
        type: 'button',
        text: 'Verwerfen',
        onclick: () => {
          importDateien = importDateien.filter((d) => d.id !== datei.id);
          zeichneImport();
          meldeImport(`${datei.name} aus der Liste genommen.`, 'neutral');
        }
      })
    ])
  ]);

  const teile = [kopf];
  if (datei.hinweis) teile.push(el('p', { klasse: 'feld-hinweis studio-meldung--warnung', text: datei.hinweis }));
  if (datei.uebergangen.length) {
    teile.push(
      el('p', {
        klasse: 'feld-hinweis',
        text: `Übergangen, weil der Browser sie nicht zeigt: ${datei.uebergangen.map((n) => n.split('/').pop()).join(', ')}`
      })
    );
  }
  if (datei.text) {
    teile.push(
      el('details', { klasse: 'import-text' }, [
        el('summary', { text: `Text im Dokument (${datei.text.length} Zeichen)` }),
        el('p', { text: datei.text })
      ])
    );
  }
  if (datei.bilder.length) {
    teile.push(el('div', { klasse: 'import-bilder' }, datei.bilder.map((b) => importBildkarte(datei, b))));
  }
  return el('article', { klasse: 'import-datei' }, teile);
}

function zeichneImport() {
  $('#import-stelle').value = importStelle;
  const liste = $('#import-liste');
  if (!importDateien.length) {
    liste.replaceChildren(
      el('p', {
        klasse: 'band-hinweis',
        text:
          'Noch keine Datei gelesen. Die Bilder bleiben in dieser Sitzung; übernommen werden sie in den Eingang und stehen dort dem Editor, der Strecke und dem Designstudio zur Verfügung.'
      })
    );
  } else {
    liste.replaceChildren(...importDateien.map(importDateikarte));
  }
  aktualisiereImportknoepfe();
}

/* ------------------------------------------------------------ Übernehmen */

/**
 * Die gewählten Bilder wandern in den Eingang: die Vorschau in den
 * Browserspeicher, das volle Bild in die Datenbank. Scheitert eins, laufen
 * die übrigen weiter - und am Ende steht, was gelungen ist.
 */
async function uebernehmeImport() {
  const gewaehlte = importGewaehlte();
  if (!gewaehlte.length) {
    meldeImport('Es ist kein Bild gewählt.', 'warnung');
    return;
  }
  importLaeuft = true;
  aktualisiereImportknoepfe();
  meldeImport(`${gewaehlte.length} Bild${gewaehlte.length === 1 ? '' : 'er'} wird übernommen …`, 'neutral');
  const fehler = [];
  let gelungen = 0;

  for (const { datei, bild } of gewaehlte) {
    try {
      const geladen = await ladeBild(bild.adresse, 'datei', bild.name);
      const leinwand = document.createElement('canvas');
      leinwand.width = geladen.breite;
      leinwand.height = geladen.hoehe;
      leinwand.getContext('2d').drawImage(geladen.element, 0, 0);
      const kennung = naechsteAufnahmeKennung(eingang, heute());
      const stelle = bild.stelle || importStelle;
      const aufnahme = baueAufnahme({
        entwurf: {
          titel: bild.titel || importTitel(bild.name, bild.seite || 1, datei.bilder.length),
          projekt: entwurf.projekt,
          seite: bild.seitenname,
          kategorie: entwurf.kategorie,
          status: 'in Prüfung',
          rolle: 'einzeln',
          browser: '',
          autor: entwurf.autor,
          datum: heute(),
          begriffe: ['import', datei.art],
          notiz: bild.notiz
        },
        bild: baueVorschau(leinwand),
        ausschnitt: { x: 0, y: 0, breite: geladen.breite, hoehe: geladen.hoehe },
        quelle: { art: 'datei', name: datei.name, breite: geladen.breite, hoehe: geladen.hoehe },
        kennung,
        erfasstAm: new Date().toISOString()
      });
      if (stelle) aufnahme.gliederung = stelle;
      // Woher das Bild kommt, bleibt an der Aufnahme - sonst wäre später
      // nicht zu erkennen, welche Folie welcher Datei sie war.
      aufnahme.einfuhr = {
        datei: datei.name,
        art: datei.art,
        bild: bild.name,
        seite: bild.seite || 0,
        uebernommen_am: new Date().toISOString()
      };
      eingang = [aufnahme, ...eingang];
      const ergebnis = sichereEingang();
      if (!ergebnis.ok && ergebnis.voll) {
        eingang = eingang.filter((a) => a.id !== kennung);
        fehler.push(ergebnis.text);
        break;
      }
      // Das volle Bild in die Datenbank - erst danach gilt es als vollständig.
      const abgelegt = await legeVollbildAb(kennung, leinwand.toDataURL('image/png'));
      const treffer = abgelegt && eingang.find((a) => a.id === kennung);
      if (treffer) {
        treffer.voll = true;
        treffer.breite = leinwand.width;
        treffer.hoehe = leinwand.height;
        sichereEingang();
      }
      bild.uebernommen = kennung;
      bild.gewaehlt = false;
      gelungen += 1;
    } catch (f) {
      fehler.push(`${bild.name}: ${f && f.message ? f.message : 'nicht übernommen'}`);
    }
  }

  importLaeuft = false;
  zeichneImport();
  zeichneEingang();
  zeigeAnsicht();
  if (fehler.length) meldeImport(`${gelungen} übernommen, ${fehler.length} nicht: ${fehler.join(' · ')}`, 'warnung');
  else meldeImport(`${gelungen} Bild${gelungen === 1 ? '' : 'er'} liegen im Eingang.`, 'gut');
}

/* ------------------------------------------------------------ Verdrahten */

function verdrahteImport() {
  const eingabe = $('#import-eingabe');
  $('#import-waehlen').addEventListener('click', () => eingabe.click());
  eingabe.addEventListener('change', async (e) => {
    const dateien = [...(e.target.files || [])];
    e.target.value = '';
    await nimmImportDateien(dateien);
  });

  // Hierher ziehen: dieselbe Strecke wie das Wählen.
  const flaeche = $('#import-flaeche');
  for (const art of ['dragenter', 'dragover']) {
    flaeche.addEventListener(art, (e) => {
      e.preventDefault();
      flaeche.classList.add('import-wahl--bereit');
    });
  }
  for (const art of ['dragleave', 'drop']) {
    flaeche.addEventListener(art, () => flaeche.classList.remove('import-wahl--bereit'));
  }
  flaeche.addEventListener('drop', async (e) => {
    e.preventDefault();
    await nimmImportDateien([...(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [])]);
  });

  $('#import-stelle').addEventListener('input', (e) => {
    const roh = String(e.target.value || '').trim();
    // Aus "6.2.3 Thema" wird die Nummer; getippte Nummern bleiben, wie sie sind.
    importStelle = (roh.match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0];
    fuelleStellenvorschlaege(roh);
  });

  $('#import-uebernehmen').addEventListener('click', uebernehmeImport);
  $('#import-leeren').addEventListener('click', () => {
    importDateien = [];
    zeichneImport();
    meldeImport('Die Liste ist leer. Die übernommenen Bilder bleiben im Eingang.', 'neutral');
  });
}

verdrahteImport();

