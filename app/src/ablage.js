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
  const plan = verzeichnisPlan(eingang, verzeichnisWahl, GLIEDERUNG, strecken);
  const zeilen = plan.slice(0, 40).map((d) => [...d.ordner, d.name].join('/'));
  if (plan.length > 40) zeilen.push(`… und ${plan.length - 40} weitere`);
  $('#verzeichnis-plan').textContent = eingang.length
    ? zeilen.join('\n')
    : 'Noch keine Aufnahme im Eingang – es gibt nichts zu schreiben.';
  return plan;
}

function zeichneVerzeichnis() {
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
  $('#verzeichnis-schreiben').disabled = verzeichnisLaeuft || !ordnerZugriff || !eingang.length;
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
  const plan = verzeichnisPlan(eingang, verzeichnisWahl, GLIEDERUNG, strecken);
  if (!plan.length) return;
  verzeichnisLaeuft = true;
  zeichneVerzeichnis();

  const index = galerieIndex(eingang, plan, {
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

// starte() steht in der letzten Zeile der letzten Datei (siehe CLAUDE.md).
starte();
stelleOrdnerWiederHer();
stelleVorschauenWieder();
