/* =========================================================================
   Ausschneiden – der Schnipsel-Modus.

   Wie ein Ausschneidewerkzeug, nur in der Seite: Bildschirm freigeben, einen
   Bereich aufziehen, beim Loslassen ist die Aufnahme gemacht. Wohin sie geht,
   wird vorher festgelegt – Eingang, ein Ordner auf dem Rechner, eine
   einzelne Datei, oder mehrere davon zugleich.

   Das Ausschneidewerkzeug des Betriebssystems kann eine Seite nicht starten;
   Browser und Anwendung startet die Person selbst und gibt sie frei.
   ========================================================================= */

let ablage = leseAblageAusSpeicher();
let ordnerZugriff = null; // FileSystemDirectoryHandle der laufenden Sitzung
let ordnerWartet = null; // gemerkter Ordner, dem die Erlaubnis fehlt
let schnipselQuelle = null;
let schnipselTakt = null;
let schnipselBereich = null;
let letzterSchnipsel = null;
let schnipselZaehler = 0;

function leseAblageAusSpeicher() {
  try {
    return leseAblage(localStorage.getItem(ABLAGE_SCHLUESSEL));
  } catch (fehler) {
    return { ...ABLAGE_STANDARD };
  }
}

function sichereAblage() {
  try {
    localStorage.setItem(ABLAGE_SCHLUESSEL, schreibeAblage(ablage));
  } catch (fehler) {
    /* Ohne Speicher gilt die Einstellung nur für diese Sitzung. */
  }
}

function meldeSchnipsel(text, art = 'neutral') {
  const feld = $('#schnipsel-meldung');
  feld.textContent = text;
  feld.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------- Ordner über Sitzungen */

const ORDNER_DB = 'screenarchiv';
const ORDNER_LADEN = 'zugriffe';

/** Der Zugriff auf einen Ordner ist kein Text - er gehört in die Datenbank. */
function oeffneDatenbank() {
  return new Promise((fertig, scheitern) => {
    if (!window.indexedDB) return scheitern(new Error('keine Datenbank'));
    const anfrage = indexedDB.open(ORDNER_DB, 1);
    anfrage.onupgradeneeded = () => anfrage.result.createObjectStore(ORDNER_LADEN);
    anfrage.onsuccess = () => fertig(anfrage.result);
    anfrage.onerror = () => scheitern(anfrage.error);
  });
}

async function merkeOrdner(zugriff) {
  try {
    const db = await oeffneDatenbank();
    await new Promise((fertig, scheitern) => {
      const vorgang = db.transaction(ORDNER_LADEN, 'readwrite');
      vorgang.objectStore(ORDNER_LADEN).put(zugriff, 'ordner');
      vorgang.oncomplete = fertig;
      vorgang.onerror = () => scheitern(vorgang.error);
    });
  } catch (fehler) {
    /* Ohne Datenbank gilt der Ordner nur für diese Sitzung. */
  }
}

async function holeGemerktenOrdner() {
  try {
    const db = await oeffneDatenbank();
    return await new Promise((fertig, scheitern) => {
      const anfrage = db.transaction(ORDNER_LADEN, 'readonly').objectStore(ORDNER_LADEN).get('ordner');
      anfrage.onsuccess = () => fertig(anfrage.result || null);
      anfrage.onerror = () => scheitern(anfrage.error);
    });
  } catch (fehler) {
    return null;
  }
}

/**
 * Holt den gemerkten Ordner zurück. Ohne bereits erteilte Erlaubnis wird
 * nicht gefragt - dafür braucht es einen Klick der Person.
 */
async function stelleOrdnerWiederHer() {
  const zugriff = await holeGemerktenOrdner();
  if (!zugriff || !zugriff.queryPermission) return;
  try {
    if ((await zugriff.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      ordnerWartet = zugriff;
      zeichneSchnipsel();
      return;
    }
    ordnerZugriff = zugriff;
    ablage = { ...ablage, ordner: true };
    zeichneSchnipsel();
    zeigeOrdnerImArchiv();
  } catch (fehler) {
    /* Ordner nicht mehr erreichbar - er wird beim nächsten Mal neu gewählt. */
  }
}

/** Schreibt eine Datei in den gewählten Ordner. */
async function schreibeInOrdner(name, blob) {
  const dateiZugriff = await ordnerZugriff.getFileHandle(name, { create: true });
  const schreiber = await dateiZugriff.createWritable();
  await schreiber.write(blob);
  await schreiber.close();
}

/** Liest die Bilder aus dem gewählten Ordner, neueste zuerst. */
async function liesOrdnerBilder(grenze = 24) {
  if (!ordnerZugriff || typeof ordnerZugriff.values !== 'function') return [];
  const gefunden = [];
  try {
    for await (const eintrag of ordnerZugriff.values()) {
      if (eintrag.kind !== 'file' || !/\.(png|jpe?g|webp|gif)$/i.test(eintrag.name)) continue;
      const datei = await eintrag.getFile();
      gefunden.push({ name: datei.name, groesse: datei.size, geaendert: datei.lastModified, datei });
    }
  } catch (fehler) {
    return [];
  }
  gefunden.sort((a, b) => b.geaendert - a.geaendert);
  const ausschnitt = gefunden.slice(0, grenze);
  for (const eintrag of ausschnitt) {
    eintrag.bild = await liesAlsDatenadresse(eintrag.datei);
  }
  return Object.assign(ausschnitt, { gesamt: gefunden.length });
}

/* ----------------------------------------------------------- Ablageziele */

const ordnerMoeglich = () => typeof window.showDirectoryPicker === 'function';

async function waehleOrdner() {
  if (!ordnerMoeglich()) {
    meldeSchnipsel(
      'Dieser Browser kann keinen Ordner freigeben. Chrome oder Edge können es; sonst bleiben Eingang und Einzeldatei.',
      'warnung'
    );
    return false;
  }
  try {
    ordnerZugriff = await window.showDirectoryPicker({ mode: 'readwrite', id: 'screenarchiv' });
    if (ordnerZugriff.queryPermission) {
      let stand = await ordnerZugriff.queryPermission({ mode: 'readwrite' });
      if (stand !== 'granted' && ordnerZugriff.requestPermission) {
        stand = await ordnerZugriff.requestPermission({ mode: 'readwrite' });
      }
      if (stand !== 'granted') {
        ordnerZugriff = null;
        meldeSchnipsel('Ohne Schreiberlaubnis lässt sich in den Ordner nichts legen.', 'warnung');
        zeichneSchnipsel();
        return false;
      }
    }
    ablage = { ...ablage, ordner: true };
    ordnerWartet = null;
    sichereAblage();
    await merkeOrdner(ordnerZugriff);
    meldeSchnipsel(`Ordner „${ordnerZugriff.name}“ gewählt – die Aufnahmen landen dort.`, 'gut');
    zeichneSchnipsel();
    zeigeOrdnerImArchiv();
    return true;
  } catch (fehler) {
    ordnerZugriff = null;
    ablage = { ...ablage, ordner: false };
    meldeSchnipsel(
      fehler && fehler.name === 'AbortError'
        ? 'Die Ordnerwahl wurde abgebrochen.'
        : 'Diese Ansicht darf keinen Ordner öffnen – das entscheidet die umgebende Seite. Eingang und Einzeldatei bleiben.',
      'warnung'
    );
    zeichneSchnipsel();
    return false;
  }
}

function zeichneZiele() {
  const ziel = $('#ablage-ziele');
  ziel.replaceChildren(
    ...ABLAGE_ZIELE.map((z) => {
      const gewaehlt = Boolean(ablage[z.id]);
      const zeile = el('div', { klasse: 'ablage-ziel' + (gewaehlt ? ' ablage-ziel--an' : '') }, [
        el('label', {}, [
          el('input', {
            type: 'checkbox',
            id: 'ziel-' + z.id,
            checked: gewaehlt,
            onchange: async (e) => {
              if (z.id === 'ordner' && e.target.checked) {
                e.target.checked = false;
                await waehleOrdner();
                return;
              }
              ablage = { ...ablage, [z.id]: e.target.checked };
              if (z.id === 'ordner' && !e.target.checked) ordnerZugriff = null;
              sichereAblage();
              zeichneSchnipsel();
            }
          }),
          el('span', { text: z.label })
        ]),
        el('span', { klasse: 'feld-hinweis', text: z.hinweis })
      ]);
      if (z.id === 'ordner') {
        zeile.append(
          el('span', { klasse: 'ablage-ordner' }, [
            ordnerZugriff
              ? el('span', { klasse: 'kennung', text: ordnerZugriff.name })
              : el('span', { klasse: 'feld-hinweis', text: ordnerMoeglich() ? '' : 'in diesem Browser nicht möglich' }),
            el('button', {
              type: 'button',
              klasse: 'knopf knopf--klein',
              id: 'ordner-waehlen',
              text: ordnerZugriff ? 'Anderen Ordner' : 'Ordner wählen',
              onclick: waehleOrdner
            })
          ])
        );
      }
      return zeile;
    })
  );
}

/* --------------------------------------------------------------- Anzeige */

function zeichneSchnipsel() {
  zeichneZiele();
  const beipack = $('#ablage-beipack');
  if (beipack.checked !== Boolean(ablage.beipack)) beipack.checked = Boolean(ablage.beipack);
  $('#beipack-zeile').hidden = !ablage.ordner && !ablage.datei;
  $('#beipack-beispiel').textContent = ablage.beipack
    ? 'Beispiel: ' + beipackzettelName(dateinameAus(ablage.muster, { datum: heute(), nummer: '001' }))
    : '';

  const muster = $('#ablage-muster');
  if (muster.value !== ablage.muster) muster.value = ablage.muster;
  $('#muster-beispiel').textContent =
    'Beispiel: ' +
    dateinameAus(ablage.muster, {
      datum: heute(),
      zeit: '14-32-05',
      nummer: String(schnipselZaehler + 1).padStart(3, '0'),
      projekt: entwurf.projekt,
      titel: entwurf.titel,
      kategorie: entwurf.kategorie
    });

  const probleme = pruefeAblage(ablage);
  $('#schnipsel-start').disabled = probleme.length > 0 || Boolean(schnipselQuelle);
  $('#schnipsel-start').title = probleme.length ? probleme[0].text : 'Bildschirm freigeben und ausschneiden';
  $('#ablage-warnung').textContent = probleme.length ? probleme[0].text : '';
  $('#ablage-warnung').hidden = probleme.length === 0;
  $('#schnipsel-ende').hidden = !schnipselQuelle;
  $('#schnipsel-ziel').textContent = beschreibeAblage(ablage, ordnerZugriff && ordnerZugriff.name);

  $('#schnipsel-leer').hidden = Boolean(schnipselQuelle);
  $('#schnipsel-leinwand').hidden = !schnipselQuelle;
  $('#schnipsel-buehne').classList.toggle('scharf', Boolean(schnipselQuelle));

  const block = $('#schnipsel-letzte');
  block.hidden = !letzterSchnipsel;
  if (letzterSchnipsel) {
    $('#schnipsel-vorschau').src = letzterSchnipsel.bild;
    $('#schnipsel-kennung').textContent = letzterSchnipsel.name;
    $('#schnipsel-zahl').textContent =
      `${schnipselZaehler} ${schnipselZaehler === 1 ? 'Aufnahme' : 'Aufnahmen'} · ${letzterSchnipsel.wohin}`;
  }
}

function zeichneSchnipselBild() {
  const leinwand = $('#schnipsel-leinwand');
  if (!schnipselQuelle) return;
  const breite = Math.min(schnipselQuelle.breite, 1400);
  const hoehe = Math.round((breite / schnipselQuelle.breite) * schnipselQuelle.hoehe);
  if (leinwand.width !== breite) {
    leinwand.width = breite;
    leinwand.height = hoehe;
  }
  const stift = leinwand.getContext('2d');
  stift.fillStyle = '#ffffff';
  stift.fillRect(0, 0, breite, hoehe);
  try {
    stift.drawImage(schnipselQuelle.element, 0, 0, breite, hoehe);
  } catch (fehler) {
    /* Beim Start liegt noch kein Bild vor. */
  }
  schnipselTakt = requestAnimationFrame(zeichneSchnipselBild);
}

/* ------------------------------------------------------------- Freigeben */

async function starteAusschneiden() {
  if (pruefeAblage(ablage).length) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    meldeSchnipsel(`Dieser Browser kennt die Bildschirmfreigabe nicht. ${AUSWEG}`, 'warnung');
    return;
  }
  if (freigabeErlaubt() === false) {
    meldeSchnipsel(
      `Diese eingebettete Ansicht darf den Bildschirm nicht freigeben – das entscheidet die Vorschau, nicht die Seite. ` +
        `Die Seite in einem eigenen Browserfenster öffnen, oder in der Ansicht Aufnahme ein Bildschirmfoto einfügen.`,
      'warnung'
    );
    return;
  }
  try {
    const strom = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
    const video = document.createElement('video');
    video.srcObject = strom;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await new Promise((fertig) => {
      if (video.videoWidth) return fertig();
      video.addEventListener('loadedmetadata', fertig, { once: true });
    });
    strom.getVideoTracks()[0].addEventListener('ended', () => beendeAusschneiden());
    schnipselQuelle = { art: 'bildschirm', name: 'Geteilter Bildschirm', breite: video.videoWidth, hoehe: video.videoHeight, element: video, strom };
    schnipselBereich = null;
    zeichneSchnipselBild();
    zeichneSchnipsel();
    // Ohne preventScroll schoebe der Fokus die Ablage aus dem Bild.
    $('#schnipsel-buehne').focus({ preventScroll: true });
    meldeSchnipsel('Bereich aufziehen – beim Loslassen wird ausgeschnitten. Esc beendet.', 'gut');
  } catch (fehler) {
    meldeSchnipsel(
      fehler && fehler.name === 'NotAllowedError'
        ? 'Die Bildschirmfreigabe wurde abgebrochen oder ist hier nicht erlaubt.'
        : 'Die Bildschirmfreigabe ist fehlgeschlagen.',
      'warnung'
    );
  }
}

/** @param {boolean} still ohne Meldung, etwa beim Verlassen der Ansicht */
function beendeAusschneiden(still = false) {
  if (schnipselTakt) cancelAnimationFrame(schnipselTakt);
  schnipselTakt = null;
  if (schnipselQuelle && schnipselQuelle.strom) {
    for (const spur of schnipselQuelle.strom.getTracks()) spur.stop();
  }
  const lief = Boolean(schnipselQuelle);
  schnipselQuelle = null;
  schnipselBereich = null;
  const rahmen = document.getElementById('schnipsel-rahmen');
  if (rahmen) rahmen.hidden = true;
  if (!lief) return;
  if (document.getElementById('schnipsel-ansicht')) zeichneSchnipsel();
  if (!still) meldeSchnipsel('Ausschneiden beendet.', 'neutral');
}

/* ------------------------------------------------------------- Aufziehen */

function zuSchnipselPunkt(ereignis) {
  const leinwand = $('#schnipsel-leinwand');
  const masse = leinwand.getBoundingClientRect();
  const faktor = schnipselQuelle.breite / (masse.width || 1);
  return { x: (ereignis.clientX - masse.left) * faktor, y: (ereignis.clientY - masse.top) * faktor };
}

function zeigeSchnipselRahmen() {
  const rahmen = $('#schnipsel-rahmen');
  rahmen.hidden = !schnipselBereich;
  if (!schnipselBereich) return;
  rahmen.style.left = (schnipselBereich.x / schnipselQuelle.breite) * 100 + '%';
  rahmen.style.top = (schnipselBereich.y / schnipselQuelle.hoehe) * 100 + '%';
  rahmen.style.width = (schnipselBereich.breite / schnipselQuelle.breite) * 100 + '%';
  rahmen.style.height = (schnipselBereich.hoehe / schnipselQuelle.hoehe) * 100 + '%';
  $('#schnipsel-masse').textContent = `${schnipselBereich.breite} × ${schnipselBereich.hoehe}`;
}

function verdrahteSchnipselBuehne() {
  const buehne = $('#schnipsel-buehne');
  let start = null;

  buehne.addEventListener('pointerdown', (e) => {
    if (!schnipselQuelle) return;
    start = zuSchnipselPunkt(e);
    schnipselBereich = begrenzeAusschnitt({ x: start.x, y: start.y, breite: MINDEST_AUSSCHNITT, hoehe: MINDEST_AUSSCHNITT }, schnipselQuelle);
    zeigeSchnipselRahmen();
    buehne.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  buehne.addEventListener('pointermove', (e) => {
    if (!start || !schnipselQuelle) return;
    const punkt = zuSchnipselPunkt(e);
    schnipselBereich = begrenzeAusschnitt(
      {
        x: Math.min(start.x, punkt.x),
        y: Math.min(start.y, punkt.y),
        breite: Math.abs(punkt.x - start.x),
        hoehe: Math.abs(punkt.y - start.y)
      },
      schnipselQuelle
    );
    zeigeSchnipselRahmen();
  });

  const loslassen = async () => {
    if (!start) return;
    start = null;
    if (!schnipselBereich || !schnipselQuelle) return;
    await nimmSchnipsel();
  };
  buehne.addEventListener('pointerup', loslassen);
  buehne.addEventListener('pointercancel', () => {
    start = null;
  });
}

/* -------------------------------------------------------------- Ablegen */

/** Legt den Schnipsel in allen gewählten Zielen ab. */
async function nimmSchnipsel() {
  const leinwand = schneideLeinwand(schnipselQuelle, schnipselBereich, 1600);
  const jetzt = new Date();
  const nummer = String(schnipselZaehler + 1).padStart(3, '0');
  const name = dateinameAus(ablage.muster, {
    datum: jetzt.toISOString().slice(0, 10),
    zeit: jetzt.toTimeString().slice(0, 8).replace(/:/g, '-'),
    nummer,
    projekt: entwurf.projekt,
    titel: entwurf.titel,
    kategorie: entwurf.kategorie
  });
  const wohin = [];
  const fehler = [];

  if (ablage.eingang) {
    const kennung = naechsteAufnahmeKennung(eingang, entwurf.datum);
    const aufnahme = baueAufnahme({
      entwurf,
      bild: leinwand.toDataURL('image/jpeg', 0.72),
      ausschnitt: schnipselBereich,
      quelle: schnipselQuelle,
      kennung,
      erfasstAm: jetzt.toISOString()
    });
    eingang = [aufnahme, ...eingang];
    const ergebnis = sichereEingang();
    if (ergebnis.ok) wohin.push(`Eingang (${kennung})`);
    else if (ergebnis.voll) {
      eingang = eingang.filter((a) => a.id !== kennung);
      fehler.push(ergebnis.text);
    } else wohin.push(`Eingang (${kennung}, nur diese Sitzung)`);
    zeigeAnsicht();
  }

  if (ablage.ordner || ablage.datei) {
    const blob = await new Promise((fertig) => leinwand.toBlob(fertig, 'image/png'));
    // Der Beipackzettel traegt, was der Dateiname nicht fassen kann.
    const zettelName = beipackzettelName(name);
    const zettel = baueBeipackzettel({
      entwurf,
      bildname: name,
      ausschnitt: schnipselBereich,
      quelle: schnipselQuelle,
      erfasstAm: jetzt.toISOString(),
      anwendung: DATEN.anwendung
    });

    if (ablage.ordner && ordnerZugriff) {
      try {
        await schreibeInOrdner(name, blob);
        wohin.push(`${ordnerZugriff.name}/${name}`);
        if (ablage.beipack) {
          await schreibeInOrdner(zettelName, new Blob([zettel], { type: 'application/json' }));
          wohin.push(zettelName);
        }
        zeigeOrdnerImArchiv();
      } catch (f) {
        fehler.push('In den Ordner ließ sich nicht schreiben: ' + (f && f.message ? f.message : 'unbekannter Grund'));
      }
    } else if (ablage.ordner) {
      fehler.push('Es ist kein Ordner gewählt.');
    }

    if (ablage.datei) {
      const ergebnis = await uebergebeDatei(name, blob);
      if (ergebnis.art === 'gesichert') {
        wohin.push(name);
        if (ablage.beipack) {
          const zweites = await uebergebeDatei(zettelName, zettel);
          if (zweites.art === 'gesichert') wohin.push(zettelName);
          else fehler.push('Der Beipackzettel wurde nicht gesichert.');
        }
      } else if (ergebnis.art === 'fehler' && ergebnis.code === 'declined') fehler.push('Das Sichern wurde abgebrochen.');
      else if (ergebnis.art !== 'gesichert') fehler.push('Die Datei ließ sich nicht ablegen.');
    }
  }

  if (wohin.length) {
    schnipselZaehler += 1;
    letzterSchnipsel = { bild: leinwand.toDataURL('image/jpeg', 0.6), name, wohin: wohin.join(' · ') };
    blitzeSchnipsel();
  }
  meldeSchnipsel(
    wohin.length
      ? `Ausgeschnitten → ${wohin.join(' · ')}${fehler.length ? ' · ' + fehler.join(' ') : ''}`
      : fehler.join(' ') || 'Nichts abgelegt.',
    wohin.length ? (fehler.length ? 'warnung' : 'gut') : 'warnung'
  );
  schnipselBereich = null;
  zeigeSchnipselRahmen();
  zeichneSchnipsel();
}

function blitzeSchnipsel() {
  const buehne = $('#schnipsel-buehne');
  buehne.classList.remove('blitzt');
  void buehne.offsetWidth;
  buehne.classList.add('blitzt');
  setTimeout(() => buehne.classList.remove('blitzt'), 400);
}

/* --------------------------------------------------------- Verdrahtung */

function verdrahteSchnipsel() {
  verdrahteSchnipselBuehne();
  $('#schnipsel-start').addEventListener('click', starteAusschneiden);
  $('#schnipsel-ende').addEventListener('click', () => beendeAusschneiden());
  $('#ablage-beipack').addEventListener('change', (e) => {
    ablage = { ...ablage, beipack: e.target.checked };
    sichereAblage();
    zeichneSchnipsel();
  });
  $('#ablage-muster').addEventListener('input', (e) => {
    ablage = { ...ablage, muster: e.target.value };
    sichereAblage();
    zeichneSchnipsel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || zustand.ansicht !== 'ausschneiden' || !schnipselQuelle) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    beendeAusschneiden();
  });
  window.addEventListener('pagehide', () => beendeAusschneiden(true));
}

verdrahteSchnipsel();
starte();
stelleOrdnerWiederHer();
