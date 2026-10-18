/* =========================================================================
   Verzeichnis – die Galerie auf die Platte.

   Der Eingang liegt im Browser: wer die Browserdaten löscht, löscht ihn.
   Dauerhaft wird eine Aufnahme erst als Datei. Diese Ansicht schreibt die
   ganze Galerie in ein Verzeichnis – Bilder in voller Auflösung, Beipackzettel
   daneben, Übersicht, Strecken und Prozesse.

   Der Plan dafür entsteht im Kern (`verzeichnisPlan`) und steht in der
   Vorschau, *bevor* eine Datei geschrieben wird. Geschrieben wird mit dem
   Ordnerzugriff des Browsers; den gibt es nur in Chrome und Edge, und das
   sagt die Ansicht, statt stumm zu bleiben.
   ========================================================================= */

let verzeichnisWahl = leseVerzeichnisWahl(leseVerzeichnisSpeicher());
let verzeichnisLaeuft = false;

function leseVerzeichnisSpeicher() {
  try {
    return localStorage.getItem(VERZEICHNIS_SCHLUESSEL);
  } catch (fehler) {
    return null;
  }
}

function sichereVerzeichnisWahl() {
  try {
    localStorage.setItem(VERZEICHNIS_SCHLUESSEL, schreibeVerzeichnisWahl(verzeichnisWahl));
  } catch (fehler) {
    // Ohne Speicher gilt das Muster nur für diese Sitzung.
  }
}

function meldeVerzeichnis(text, art = 'neutral') {
  const zeile = $('#verzeichnis-meldung');
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------- Darstellung */

/** Der Plan, wie er gleich geschrieben würde - höchstens 40 Zeilen. */
function zeichneVerzeichnisplan() {
  const plan = verzeichnisPlan(imProjekt(), verzeichnisWahl, GLIEDERUNG, strecken);
  const zeilen = plan.slice(0, 40).map((d) => [...d.ordner, d.name].join('/'));
  if (plan.length > 40) zeilen.push(`… und ${plan.length - 40} weitere`);
  $('#verzeichnis-plan').textContent = imProjekt().length
    ? zeilen.join('\n')
    : eingang.length
      ? 'Die gewählte Arbeitsmenge ist leer – im Kopf ein anderes Projekt wählen.'
      : 'Noch keine Aufnahme im Eingang – es gibt nichts zu schreiben.';
  return plan;
}

function zeichneVerzeichnis() {
  zeichnePaketstand();
  if (document.getElementById('verzeichnis-ansicht').hidden) return;
  if ($('#verzeichnis-muster') !== document.activeElement) $('#verzeichnis-muster').value = verzeichnisWahl.muster;
  $('#verzeichnis-zettel').checked = verzeichnisWahl.zettel;
  $('#verzeichnis-fassung').checked = verzeichnisWahl.fassung;
  $('#verzeichnis-index').checked = verzeichnisWahl.index;
  $('#verzeichnis-strecken').checked = verzeichnisWahl.strecken;
  $('#verzeichnis-felder').textContent =
    'Platzhalter: ' + VERZEICHNIS_FELDER.map((f) => `{${f.id}}`).join(', ') + '. Ein Schrägstrich macht einen Ordner.';

  // Der Ordner: gewählt, wartend oder nicht möglich - und immer benannt.
  const kasten = $('#verzeichnis-ordner');
  if (!ordnerMoeglich()) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis zettel-meldung--warnung',
        text:
          'Dieser Browser kann kein Verzeichnis freigeben. Chrome oder Edge können es; sonst bleibt der Weg über „Als JSON sichern" im Eingang.'
      })
    );
  } else if (ordnerZugriff) {
    kasten.replaceChildren(
      el('p', { klasse: 'feld-hinweis', text: `Ordner: ${ordnerZugriff.name}` }),
      el('button', {
        klasse: 'knopf knopf--klein',
        type: 'button',
        id: 'verzeichnis-andern',
        text: 'anderen Ordner wählen',
        onclick: async () => {
          if (await waehleOrdner()) zeichneVerzeichnis();
        }
      })
    );
  } else {
    kasten.replaceChildren(
      el('button', {
        klasse: 'knopf knopf--haupt',
        type: 'button',
        id: 'verzeichnis-waehlen',
        text: 'Ordner wählen',
        onclick: async () => {
          if (await waehleOrdner()) zeichneVerzeichnis();
        }
      }),
      el('p', {
        klasse: 'feld-hinweis',
        text: ordnerWartet
          ? `„${ordnerWartet.name}" ist gemerkt, braucht aber die Erlaubnis erneut.`
          : 'Noch kein Ordner gewählt.'
      })
    );
  }

  const plan = zeichneVerzeichnisplan();
  $('#verzeichnis-schreiben').disabled = verzeichnisLaeuft || !ordnerZugriff || !imProjekt().length;
  $('#verzeichnis-schreiben').textContent = verzeichnisLaeuft
    ? 'schreibt …'
    : `${plan.length} Datei${plan.length === 1 ? '' : 'en'} in den Ordner schreiben`;
}

/* -------------------------------------------------------------- Schreiben */

/**
 * Holt einen Unterordner und legt ihn an, wenn er fehlt. Ohne diesen Weg
 * gäbe es nur eine flache Ablage - und die Ordnung ist der halbe Zweck.
 */
async function holeUnterordner(teile) {
  let ordner = ordnerZugriff;
  for (const teil of teile) ordner = await ordner.getDirectoryHandle(teil, { create: true });
  return ordner;
}

async function schreibeDatei(ordner, name, inhalt) {
  const zugriff = await ordner.getFileHandle(name, { create: true });
  const schreiber = await zugriff.createWritable();
  await schreiber.write(inhalt);
  await schreiber.close();
}

/** Ein Bild in voller Auflösung als PNG-Blob, mit Beipackzettel im Bild. */
async function bildAlsBlob(aufnahme, fassungsnummer) {
  const adresse = await bestesBild(aufnahme, fassungsnummer || 0);
  if (!adresse) return null;
  const geladen = await ladeBild(adresse, 'eingang', aufnahme.titel);
  const leinwand = document.createElement('canvas');
  leinwand.width = geladen.breite;
  leinwand.height = geladen.hoehe;
  leinwand.getContext('2d').drawImage(geladen.element, 0, 0);
  return new Promise((fertig) => leinwand.toBlob(fertig, 'image/png'));
}

/** Der Beipackzettel einer Aufnahme - dieselbe Form wie bei der Ablage. */
function zettelFuer(aufnahme) {
  return baueBeipackzettel({
    entwurf: aufnahme,
    bildname: aufnahme.id + '.png',
    ausschnitt: aufnahme.ausschnitt || { x: 0, y: 0, breite: aufnahme.breite || 0, hoehe: aufnahme.hoehe || 0 },
    quelle: aufnahme.quelle || { art: 'datei', name: '', breite: 0, hoehe: 0 },
    erfasstAm: aufnahme.erfasst_am || '',
    anwendung: DATEN.anwendung,
    marken: (neuesteFassung(aufnahme) || {}).marken || []
  });
}

/**
 * Schreibt den ganzen Plan. Eine Datei, die scheitert, hält die übrigen nicht
 * auf - am Ende steht, was liegt und was fehlte. Das ist wichtiger als ein
 * Abbruch beim ersten Fehler: eine halbe Galerie auf der Platte ist mehr
 * wert als keine.
 */
async function schreibeGalerie() {
  if (!ordnerZugriff || verzeichnisLaeuft) return;
  const plan = verzeichnisPlan(imProjekt(), verzeichnisWahl, GLIEDERUNG, strecken);
  if (!plan.length) return;
  verzeichnisLaeuft = true;
  zeichneVerzeichnis();

  const index = galerieIndex(imProjekt(), plan, {
    anwendung: DATEN.anwendung,
    muster: verzeichnisWahl.muster,
    gliederung: GLIEDERUNG
  });
  const geschrieben = [];
  const fehler = [];
  let zahl = 0;

  for (const datei of plan) {
    zahl += 1;
    meldeVerzeichnis(`${zahl} von ${plan.length}: ${[...datei.ordner, datei.name].join('/')}`, 'neutral');
    try {
      const ordner = await holeUnterordner(datei.ordner);
      if (datei.art === 'bild') {
        const aufnahme = eingang.find((a) => a.id === datei.aufnahme);
        const blob = await bildAlsBlob(aufnahme, datei.fassung);
        if (!blob) throw new Error('kein Bild vorhanden');
        // Der Zettel steckt auch in der Datei selbst - wer nur das Bild
        // weitergibt, gibt ihn mit.
        let inhalt = blob;
        try {
          inhalt = new Blob(
            [legeTextInPng(new Uint8Array(await blob.arrayBuffer()), pngTexte(zettelFuer(aufnahme), DATEN.anwendung))],
            { type: 'image/png' }
          );
        } catch (f) {
          // Ein Bild ohne eingelegten Text ist besser als kein Bild.
        }
        await schreibeDatei(ordner, datei.name, inhalt);
      } else if (datei.art === 'zettel') {
        const aufnahme = eingang.find((a) => a.id === datei.aufnahme);
        await schreibeDatei(ordner, datei.name, new Blob([zettelFuer(aufnahme)], { type: 'application/json' }));
      } else if (datei.art === 'index') {
        await schreibeDatei(ordner, datei.name, new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' }));
      } else if (datei.art === 'tabelle') {
        await schreibeDatei(ordner, datei.name, new Blob([galerieCsv(index)], { type: 'text/csv' }));
      } else if (datei.art === 'strecken') {
        await schreibeDatei(ordner, datei.name, new Blob([schreibeStrecken(strecken)], { type: 'application/json' }));
      } else if (datei.art === 'bpmn') {
        const strecke = strecken.find((s) => s.id === datei.strecke);
        await schreibeDatei(
          ordner,
          datei.name,
          new Blob([streckeAlsBpmn(strecke, eingang, { anwendung: DATEN.anwendung })], { type: 'application/xml' })
        );
      }
      geschrieben.push(datei);
    } catch (f) {
      fehler.push(`${[...datei.ordner, datei.name].join('/')} (${f && f.message ? f.message : 'unbekannter Grund'})`);
    }
  }

  verzeichnisLaeuft = false;
  zeichneVerzeichnis();
  meldeVerzeichnis(verzeichnisBericht(geschrieben, fehler, ordnerZugriff.name), fehler.length ? 'warnung' : 'gut');
  zeigeOrdnerImArchiv();
}

function verdrahteVerzeichnis() {
  $('#verzeichnis-muster').addEventListener('input', (e) => {
    verzeichnisWahl = { ...verzeichnisWahl, muster: e.target.value };
    sichereVerzeichnisWahl();
    zeichneVerzeichnisplan();
  });
  for (const [feld, schluessel] of [
    ['#verzeichnis-zettel', 'zettel'],
    ['#verzeichnis-fassung', 'fassung'],
    ['#verzeichnis-index', 'index'],
    ['#verzeichnis-strecken', 'strecken']
  ]) {
    $(feld).addEventListener('change', (e) => {
      verzeichnisWahl = { ...verzeichnisWahl, [schluessel]: e.target.checked };
      sichereVerzeichnisWahl();
      zeichneVerzeichnis();
    });
  }
  $('#verzeichnis-schreiben').addEventListener('click', schreibeGalerie);
}

verdrahteVerzeichnis();


/* ==================================================== Projektdatei (1.45.0) */

let paketLaeuft = false;

function meldePaket(text, art = 'neutral') {
  const zeile = $('#paket-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

function zeigePaketbericht(zeilen) {
  const kasten = $('#paket-bericht');
  if (!kasten) return;
  kasten.hidden = !zeilen.length;
  kasten.textContent = zeilen.join('\n');
}

function zeichnePaketstand() {
  const stand = document.getElementById('paket-stand');
  if (!stand) return;
  stand.textContent = eingang.length
    ? `${eingang.length} Aufnahme(n) · ${strecken.length} Strecke(n)`
    : 'noch nichts im Eingang';
  const knopf = document.getElementById('paket-sichern');
  if (knopf) knopf.disabled = paketLaeuft || !eingang.length;
}

/**
 * Das ganze Paket: die Angaben als JSON, jedes Bild in voller Auflösung als
 * Datei daneben. Gepackt wird ohne Kompression - die Bilder sind schon
 * JPEG, und ein Packer, den die Seite nicht hat, wäre dafür nötig.
 */
async function sicherePaket() {
  if (paketLaeuft || !eingang.length) return;
  paketLaeuft = true;
  zeichnePaketstand();
  meldePaket('Die Bilder werden geholt …', 'neutral');

  const dateien = [];
  let geholt = 0;
  let fehlend = 0;
  for (const aufnahme of eingang) {
    const fassungen = [0, ...leseFassungen(aufnahme).map((f) => f.nummer)];
    for (const fassung of fassungen) {
      const schluessel = fassung ? `${aufnahme.id}:${fassung}` : aufnahme.id;
      const adresse = (await holeVollbild(schluessel)) || (fassung ? '' : aufnahme.bild || '');
      if (!adresse) {
        if (!fassung) fehlend += 1;
        continue;
      }
      const bytes = datenAdresseAlsBytes(adresse);
      if (!bytes) continue;
      dateien.push({ name: paketBildname(aufnahme.id, fassung, bytes.typ), daten: bytes.daten });
      geholt += 1;
    }
    if (geholt % 10 === 0) meldePaket(`Die Bilder werden geholt – ${geholt} …`, 'neutral');
  }

  const angaben = paketAngaben({
    eingang,
    strecken,
    projekte,
    design: studio,
    ocr: ocrTexte,
    wortliste,
    anwendung: DATEN.anwendung
  });
  dateien.unshift({ name: PAKET_NAME, daten: JSON.stringify(angaben, null, 2) });
  dateien.push({
    name: 'LIESMICH.txt',
    daten: [
      'Projektdatei des Screenarchivs.',
      '',
      'Einlesen: die Seite öffnen, Register Verzeichnis, unten „Projektdatei',
      'einlesen". Ergänzen behält den eigenen Bestand, Ersetzen gibt ihn auf.',
      '',
      `Erzeugt am ${formatiereZeitpunkt(angaben.erzeugt_am)} von ${angaben.erzeugt_von}.`,
      `Enthalten: ${angaben.anzahl} Aufnahme(n), ${geholt} Bilddatei(en).`
    ].join('\n')
  });

  const paket = zipSchreiben(dateien);
  paketLaeuft = false;
  zeichnePaketstand();
  if (!paket) {
    meldePaket('Es gab nichts zu packen.', 'warnung');
    return;
  }
  const name = `screenarchiv-${new Date().toISOString().slice(0, 10)}.zip`;
  const ergebnis = await uebergebeDatei(name, new Blob([paket], { type: 'application/zip' }));
  meldePaket(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${eingang.length} Aufnahmen, ${geholt} Bilder` +
          (fehlend ? `, ${fehlend} ohne volles Bild` : '') +
          '.'
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen – die Projektdatei entfällt.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

/** Eine Daten-Adresse in Bytes - so wandert ein Bild in das Paket. */
function datenAdresseAlsBytes(adresse) {
  const treffer = String(adresse || '').match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!treffer) return null;
  const roh = atob(treffer[2]);
  const daten = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) daten[i] = roh.charCodeAt(i);
  return { daten, typ: treffer[1] === 'png' ? 'png' : 'jpeg' };
}

const bytesAlsDatenAdresse = (bytes, typ) => {
  let roh = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    roh += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return `data:image/${typ === 'png' ? 'png' : 'jpeg'};base64,${btoa(roh)}`;
};

/** Aus dem vollen Bild wieder eine Vorschau rechnen - sie liegt nicht im Paket. */
async function vorschauAusBild(adresse, titel) {
  const geladen = await ladeBild(adresse, 'paket', titel);
  const massstab = Math.min(1, 520 / Math.max(1, geladen.breite));
  const leinwand = document.createElement('canvas');
  leinwand.width = Math.max(1, Math.round(geladen.breite * massstab));
  leinwand.height = Math.max(1, Math.round(geladen.hoehe * massstab));
  const stift = leinwand.getContext('2d');
  stift.imageSmoothingQuality = 'high';
  stift.drawImage(geladen.element, 0, 0, leinwand.width, leinwand.height);
  return leinwand.toDataURL('image/jpeg', 0.72);
}

/** Liest eine Projektdatei und führt sie mit dem eigenen Bestand zusammen. */
async function lesePaketDatei(datei) {
  if (!datei || paketLaeuft) return;
  paketLaeuft = true;
  zeichnePaketstand();
  zeigePaketbericht([]);
  meldePaket(`${datei.name} wird gelesen …`, 'neutral');
  const bericht = [];

  try {
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const verzeichnis = leseZipVerzeichnis(bytes);
    if (!verzeichnis.length) throw new Error('Das ist kein lesbares ZIP-Archiv.');
    const angabenEintrag = verzeichnis.find((e) => e.name === PAKET_NAME);
    if (!angabenEintrag) throw new Error(`Im Archiv fehlt ${PAKET_NAME} – das ist keine Projektdatei.`);

    const text = new TextDecoder().decode(await entpackeZipEintrag(bytes, angabenEintrag));
    const gelesen = lesePaketAngaben(text);
    if (!gelesen.ok) throw new Error(gelesen.grund);

    const bildEintraege = verzeichnis
      .map((eintrag) => ({ eintrag, schluessel: paketBildschluessel(eintrag.name) }))
      .filter((x) => x.schluessel);
    bericht.push(paketBericht(gelesen, bildEintraege.length));

    const art = $('#paket-art').value === 'ersetzen' ? 'ersetzen' : 'ergaenzen';
    const zusammen = fuehrePaketZusammen(art === 'ersetzen' ? [] : eingang, gelesen.aufnahmen, art, heute());
    if (zusammen.umbenannt.size) {
      bericht.push(
        `${zusammen.umbenannt.size} Kennung(en) waren vergeben und wurden umbenannt: ` +
          [...zusammen.umbenannt].slice(0, 6).map(([alt, neu]) => `${alt} → ${neu}`).join(', ')
      );
    }

    // Die Bilder: volles Bild in die Datenbank, Vorschau daraus rechnen.
    let bilder = 0;
    const vorschauen = [];
    for (const { eintrag, schluessel } of bildEintraege) {
      const neueKennung = zusammen.umbenannt.get(schluessel.kennung) || schluessel.kennung;
      const ziel = schluessel.fassung ? `${neueKennung}:${schluessel.fassung}` : neueKennung;
      try {
        const daten = await entpackeZipEintrag(bytes, eintrag);
        const adresse = bytesAlsDatenAdresse(daten, eintrag.name.endsWith('.png') ? 'png' : 'jpeg');
        await legeVollbildAb(ziel, adresse);
        if (!schluessel.fassung) vorschauen.push([neueKennung, await vorschauAusBild(adresse, neueKennung)]);
        bilder += 1;
        if (bilder % 5 === 0) meldePaket(`${bilder} von ${bildEintraege.length} Bildern eingelesen …`, 'neutral');
      } catch (fehler) {
        bericht.push(`${eintrag.name}: ließ sich nicht lesen und fehlt.`);
      }
    }
    if (vorschauen.length) await legeVorschauenAb(vorschauen);
    const vorschauKarte = new Map(vorschauen);

    // Erst jetzt wird der eigene Bestand angefasst.
    eingang = zusammen.eingang.map((a) => (a.bild ? a : { ...a, bild: vorschauKarte.get(a.id) || '' }));
    const stand = sichereEingang();
    if (!stand.ok) bericht.push('Der Speicher ist knapp – die Metadaten stehen nur in dieser Sitzung.');

    if (gelesen.strecken.length) {
      const umgeschrieben = streckenMitNeuenKennungen(gelesen.strecken, zusammen.umbenannt);
      strecken = art === 'ersetzen' ? umgeschrieben : [...strecken, ...umgeschrieben];
      sichereStrecken();
    }
    if (gelesen.projekte.length) {
      projekte = leseProjekte(schreibeProjekte([...(art === 'ersetzen' ? [] : projekte), ...gelesen.projekte]));
      sichereProjekte();
    }
    if (Object.keys(gelesen.ocr).length) {
      ocrTexte = { ...(art === 'ersetzen' ? {} : ocrTexte), ...gelesen.ocr };
      sichereOcr();
    }
    if (gelesen.wortliste.length) {
      wortliste = gelesen.wortliste;
      try {
        localStorage.setItem(WORTLISTE_SCHLUESSEL, schreibeWortliste(wortliste));
      } catch (fehler) {
        bericht.push('Die Wortliste gilt nur für diese Sitzung – der Speicher ist voll.');
      }
    }
    if (gelesen.design) {
      studio = gelesen.design;
      sichereStudio();
    }

    zeichneEingang();
    zeichneVerzeichnis();
    zeigeAnsicht();
    zeigePaketbericht(bericht);
    meldePaket(
      art === 'ersetzen'
        ? `Bestand ersetzt: ${zusammen.eingang.length} Aufnahmen, ${bilder} Bilder.`
        : `${zusammen.neu} Aufnahme(n) und ${bilder} Bild(er) ergänzt – der Eingang hat jetzt ${eingang.length}.`,
      'gut'
    );
  } catch (fehler) {
    zeigePaketbericht(bericht);
    meldePaket(`Die Datei ließ sich nicht einlesen: ${fehler && fehler.message ? fehler.message : fehler}`, 'warnung');
  }
  paketLaeuft = false;
  zeichnePaketstand();
  $('#paket-datei').value = '';
}

function verdrahtePaket() {
  $('#paket-sichern').addEventListener('click', sicherePaket);
  $('#paket-datei').addEventListener('change', (e) => lesePaketDatei(e.target.files && e.target.files[0]));
}

verdrahtePaket();

/**
 * Holt die Vorschauen aus der Browserdatenbank zurück. Im localStorage stehen
 * nur noch die Metadaten (seit 1.34.0); die Bilder kommen gleich nach dem
 * ersten Zeichnen, in *einem* Vorgang. Bis dahin steht in der Liste ein
 * Platzhalter statt eines kaputten Bildes.
 */
async function stelleVorschauenWieder() {
  if (!eingang.some((a) => !a.bild)) return;
  const vorschauen = await holeAlleVorschauen();
  let geholt = 0;
  for (const aufnahme of eingang) {
    if (aufnahme.bild || !vorschauen.has(aufnahme.id)) continue;
    aufnahme.bild = vorschauen.get(aufnahme.id);
    geholt += 1;
  }
  for (const kennung of vorschauen.keys()) abgelegteVorschauen.add(kennung);
  if (!geholt) return;
  zeichneEingang();
  zeigeAnsicht();
}

// Der Start steht in der letzten Zeile der letzten Datei - seit 1.39.0 ist
// das output.js (siehe CLAUDE.md).
