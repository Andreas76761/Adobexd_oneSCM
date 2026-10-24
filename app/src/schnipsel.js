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
const BILD_LADEN = 'bilder';
const VORSCHAU_LADEN = 'vorschauen';

/**
 * Der Zugriff auf einen Ordner ist kein Text - er gehoert in die Datenbank.
 * Dort liegen seit 1.20.0 auch die Bilder in voller Aufloesung und seit
 * 1.34.0 die Vorschauen: der localStorage fasst rund fuenf Megabyte, eine
 * Vorschau allein wiegt 37 Kilobyte - damit waere bei 135 Aufnahmen Schluss.
 * In der Datenbank liegt ein Vielfaches; im localStorage bleiben die
 * Metadaten, und die wiegen ein halbes Kilobyte je Aufnahme.
 */
function oeffneDatenbank() {
  return new Promise((fertig, scheitern) => {
    if (!window.indexedDB) return scheitern(new Error('keine Datenbank'));
    const anfrage = indexedDB.open(ORDNER_DB, 3);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      if (!db.objectStoreNames.contains(ORDNER_LADEN)) db.createObjectStore(ORDNER_LADEN);
      if (!db.objectStoreNames.contains(BILD_LADEN)) db.createObjectStore(BILD_LADEN);
      if (!db.objectStoreNames.contains(VORSCHAU_LADEN)) db.createObjectStore(VORSCHAU_LADEN);
    };
    anfrage.onsuccess = () => fertig(anfrage.result);
    anfrage.onerror = () => scheitern(anfrage.error);
  });
}

/**
 * Die Vorschauen: je Aufnahme ein kleines JPEG. Geschrieben wird in einem
 * Vorgang, nicht in einem je Bild - bei hundert Aufnahmen ist das der
 * Unterschied zwischen einem Wimpernschlag und einer Pause.
 */
async function legeVorschauenAb(saetze = []) {
  if (!saetze.length) return true;
  try {
    const db = await oeffneDatenbank();
    await new Promise((fertig, scheitern) => {
      const vorgang = db.transaction(VORSCHAU_LADEN, 'readwrite');
      const speicher = vorgang.objectStore(VORSCHAU_LADEN);
      for (const [schluessel, bild] of saetze) speicher.put(bild, schluessel);
      vorgang.oncomplete = fertig;
      vorgang.onerror = () => scheitern(vorgang.error);
    });
    return true;
  } catch (fehler) {
    return false;
  }
}

/** Alle Vorschauen auf einmal - ein Vorgang, eine Karte. */
async function holeAlleVorschauen() {
  try {
    const db = await oeffneDatenbank();
    return await new Promise((fertig, scheitern) => {
      const karte = new Map();
      const vorgang = db.transaction(VORSCHAU_LADEN, 'readonly');
      const anfrage = vorgang.objectStore(VORSCHAU_LADEN).openCursor();
      anfrage.onsuccess = () => {
        const zeiger = anfrage.result;
        if (!zeiger) return fertig(karte);
        karte.set(String(zeiger.key), zeiger.value);
        zeiger.continue();
      };
      anfrage.onerror = () => scheitern(anfrage.error);
    });
  } catch (fehler) {
    return new Map();
  }
}

/** Räumt die Vorschauen gelöschter Aufnahmen weg. */
async function entferneVorschauen(schluessel = []) {
  if (!schluessel.length) return;
  try {
    const db = await oeffneDatenbank();
    await new Promise((fertig) => {
      const vorgang = db.transaction(VORSCHAU_LADEN, 'readwrite');
      for (const s of schluessel) vorgang.objectStore(VORSCHAU_LADEN).delete(s);
      vorgang.oncomplete = fertig;
      vorgang.onerror = fertig;
    });
  } catch (fehler) {
    /* Eine übrig gebliebene Vorschau schadet nicht. */
  }
}

/**
 * Legt ein Bild in voller Aufloesung ab. Der Schluessel traegt die Aufnahme
 * und die Fassung: `AUF-2026-001` fuer das Original, `AUF-2026-001:2` fuer
 * die zweite Fassung.
 */
async function legeVollbildAb(schluessel, datenadresse) {
  try {
    const db = await oeffneDatenbank();
    await new Promise((fertig, scheitern) => {
      const vorgang = db.transaction(BILD_LADEN, 'readwrite');
      vorgang.objectStore(BILD_LADEN).put(datenadresse, schluessel);
      vorgang.oncomplete = fertig;
      vorgang.onerror = () => scheitern(vorgang.error);
    });
    return true;
  } catch (fehler) {
    // Ohne Datenbank bleibt die Vorschau - kleiner, aber vorhanden.
    return false;
  }
}

async function holeVollbild(schluessel) {
  try {
    const db = await oeffneDatenbank();
    return await new Promise((fertig, scheitern) => {
      const anfrage = db.transaction(BILD_LADEN, 'readonly').objectStore(BILD_LADEN).get(schluessel);
      anfrage.onsuccess = () => fertig(anfrage.result || null);
      anfrage.onerror = () => scheitern(anfrage.error);
    });
  } catch (fehler) {
    return null;
  }
}

async function entferneVollbild(schluessel) {
  try {
    const db = await oeffneDatenbank();
    await new Promise((fertig) => {
      const vorgang = db.transaction(BILD_LADEN, 'readwrite');
      vorgang.objectStore(BILD_LADEN).delete(schluessel);
      vorgang.oncomplete = fertig;
      vorgang.onerror = fertig;
    });
  } catch (fehler) {
    /* nichts zu tun */
  }
}

/** Das beste verfügbare Bild: volle Auflösung, sonst die Vorschau. */
async function bestesBild(aufnahme, fassungsnummer) {
  if (!aufnahme) return '';
  const schluessel = fassungsnummer ? `${aufnahme.id}:${fassungsnummer}` : aufnahme.id;
  const voll = await holeVollbild(schluessel);
  if (voll) return voll;
  if (fassungsnummer) {
    const fassung = leseFassungen(aufnahme).find((f) => f.nummer === fassungsnummer);
    if (fassung) return fassung.bild;
  }
  return aufnahme.bild || '';
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

/** Liest eine Datei als Text; der Beipackzettel ist reines JSON. */
function liesAlsText(blob) {
  return new Promise((fertig, scheitern) => {
    const leser = new FileReader();
    leser.onload = () => fertig(String(leser.result || ''));
    leser.onerror = () => scheitern(leser.error);
    leser.readAsText(blob);
  });
}

/**
 * Liest den Ordnerinhalt, neueste Bilder zuerst, und legt jedem Bild seinen
 * Beipackzettel bei - gelesen aus der Datei daneben, nicht aus dem Gedächtnis
 * dieser Seite. Zettel ohne Bild kommen eigens zurück, damit eine verwaiste
 * `.json` nicht unbemerkt bleibt.
 *
 * Gelesen wird nur, was gezeigt wird: die Verzeichnisliste läuft über alle
 * Dateien, Bilddaten und Zetteltexte aber nur für den sichtbaren Ausschnitt.
 */
async function liesOrdnerBilder({ grenze = 12, suche = '' } = {}) {
  if (!ordnerZugriff || typeof ordnerZugriff.values !== 'function') return [];
  const gefunden = [];
  const zettel = new Map();
  try {
    for await (const eintrag of ordnerZugriff.values()) {
      if (eintrag.kind !== 'file') continue;
      if (/\.(png|jpe?g|webp|gif)$/i.test(eintrag.name)) {
        const datei = await eintrag.getFile();
        gefunden.push({ name: datei.name, groesse: datei.size, geaendert: datei.lastModified, datei });
      } else if (/\.json$/i.test(eintrag.name)) {
        const datei = await eintrag.getFile();
        zettel.set(datei.name.toLowerCase(), {
          name: datei.name,
          groesse: datei.size,
          geaendert: datei.lastModified,
          datei
        });
      }
    }
  } catch (fehler) {
    return [];
  }
  gefunden.sort((a, b) => b.geaendert - a.geaendert);
  const passend = gefunden.filter((eintrag) => passtDateiname(eintrag.name, suche));
  const ausschnitt = passend.slice(0, grenze);
  for (const eintrag of ausschnitt) {
    eintrag.bild = await liesAlsDatenadresse(eintrag.datei);
    const treffer = zettel.get(beipackzettelName(eintrag.name).toLowerCase());
    if (treffer) eintrag.zettel = await lieszettel(treffer);
  }

  const belegt = new Set(gefunden.map((eintrag) => beipackzettelName(eintrag.name).toLowerCase()));
  const verwaist = [...zettel.values()]
    .filter((z) => !belegt.has(z.name.toLowerCase()))
    .filter((z) => passtDateiname(z.name, suche))
    .sort((a, b) => b.geaendert - a.geaendert);
  const gezeigteVerwaiste = [];
  for (const z of verwaist.slice(0, 6)) gezeigteVerwaiste.push(await lieszettel(z));

  return Object.assign(ausschnitt, {
    gesamt: gefunden.length,
    passend: passend.length,
    zettelGesamt: zettel.size,
    verwaistGesamt: verwaist.length,
    zettelOhneBild: gezeigteVerwaiste
  });
}

/** Ein Zettel samt Text; ein Lesefehler macht ihn leer, nicht unsichtbar. */
async function lieszettel(eintrag) {
  try {
    return { name: eintrag.name, groesse: eintrag.groesse, text: await liesAlsText(eintrag.datei) };
  } catch (fehler) {
    return { name: eintrag.name, groesse: eintrag.groesse, text: '' };
  }
}

/**
 * Schreibt den Beipackzettel einer Aufnahme neu - mit dem Stand, der jetzt im
 * Eingang steht. Ohne diesen Weg blieben Kategorie und Begriffe, die erst
 * nachtraeglich entstehen, nur in der Seite und nie in der Datei.
 */
async function schreibeZettelNach(aufnahme) {
  const ziel = zettelZiel(aufnahme, ordnerZugriff ? ordnerZugriff.name : '');
  if (!ziel.moeglich) return { ok: false, text: ziel.grund };
  const zettel = baueBeipackzettel({
    entwurf: aufnahme,
    bildname: ziel.bild,
    ausschnitt: aufnahme.ausschnitt,
    quelle: aufnahme.quelle,
    erfasstAm: aufnahme.erfasst_am,
    anwendung: DATEN.anwendung
  });
  try {
    await schreibeInOrdner(ziel.datei, new Blob([zettel], { type: 'application/json' }));
  } catch (fehler) {
    return {
      ok: false,
      text: 'Der Zettel ließ sich nicht schreiben: ' + (fehler && fehler.message ? fehler.message : 'unbekannter Grund')
    };
  }
  return { ok: true, datei: ziel.datei, text: `${ziel.datei} im Ordner ${ordnerZugriff.name} neu geschrieben.` };
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
    ? 'Beispiel: ' + beipackzettelName(dateinameAus(ablage.muster, { kapitel: kapitelKennung(entwurf), datum: heute(), nummer: '001' }))
    : '';

  const muster = $('#ablage-muster');
  if (muster.value !== ablage.muster) muster.value = ablage.muster;
  $('#muster-beispiel').textContent =
    'Beispiel: ' +
    dateinameAus(ablage.muster, {
      kapitel: kapitelKennung(entwurf),
      datum: heute(),
      zeit: '14-32-05',
      nummer: String(schnipselZaehler + 1).padStart(3, '0'),
      projekt: entwurf.projekt,
      titel: entwurf.titel,
      kategorie: entwurf.kategorie
    });

  // Die Bausteine kommen aus dem Kern (`MUSTER_FELDER`), nicht aus der Seite:
  // eine handgeschriebene Liste ließ bis 1.58.0 `{kapitel}` aus, obwohl es
  // längst funktionierte.
  const bausteine = $('#muster-bausteine');
  if (bausteine && !bausteine.childNodes.length) {
    bausteine.append(
      el('span', { text: 'Bausteine: ' }),
      ...MUSTER_FELDER.flatMap((f) => [el('code', { text: f.feld, title: f.erklaerung }), document.createTextNode(' ')]),
      el('span', { text: '– die Metadaten stammen aus der Ansicht Aufnahme.' })
    );
  }

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
  // Volle Auflösung der Quelle - heruntergerechnet wird nur die Vorschau.
  const leinwand = schneideLeinwand(schnipselQuelle, schnipselBereich);
  const jetzt = new Date();
  const nummer = String(schnipselZaehler + 1).padStart(3, '0');
  const name = dateinameAus(ablage.muster, {
    // Bis 1.58.0 fehlte hier das Kapitel: derselbe Muster-Text liegt für
    // Editor und Ausschneiden, und der Editor füllte es. Ein Muster mit
    // {kapitel} verlor hier darum still eine Ordnerebene.
    kapitel: kapitelKennung(entwurf),
    datum: jetzt.toISOString().slice(0, 10),
    zeit: jetzt.toTimeString().slice(0, 8).replace(/:/g, '-'),
    nummer,
    projekt: entwurf.projekt,
    titel: entwurf.titel,
    kategorie: entwurf.kategorie
  });
  const wohin = [];
  const fehler = [];

  let eingangsAufnahme = null;

  if (ablage.eingang) {
    const kennung = naechsteAufnahmeKennung(eingang, entwurf.datum);
    const aufnahme = baueAufnahme({
      entwurf,
      bild: baueVorschau(leinwand),
      ausschnitt: schnipselBereich,
      quelle: schnipselQuelle,
      kennung,
      erfasstAm: jetzt.toISOString()
    });
    eingang = [aufnahme, ...eingang];
    eingangsAufnahme = aufnahme;
    // Das volle Bild wandert nebenher in die Datenbank. Die Aufnahme wird
    // dabei nicht ersetzt, sondern ergänzt: zwischen Start und Ende dieses
    // Weges kann die Ablage ihr die Herkunft angehängt haben.
    legeVollbildAb(kennung, leinwand.toDataURL('image/png')).then((gelungen) => {
      const treffer = gelungen && eingang.find((a) => a.id === kennung);
      if (!treffer) return;
      treffer.voll = true;
      treffer.breite = leinwand.width;
      treffer.hoehe = leinwand.height;
      sichereEingang();
    });
    const ergebnis = sichereEingang();
    if (ergebnis.ok) wohin.push(`Eingang (${kennung})`);
    else if (ergebnis.voll) {
      eingang = eingang.filter((a) => a.id !== kennung);
      fehler.push(ergebnis.text);
    } else wohin.push(`Eingang (${kennung}, nur diese Sitzung)`);
    zeigeAnsicht();
  }

  if (ablage.ordner || ablage.datei) {
    let blob = await new Promise((fertig) => leinwand.toBlob(fertig, 'image/png'));
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
    // Dieselben Angaben wandern in die PNG-Datei selbst: wer nur das Bild
    // weiterreicht, gibt sie damit mit. Der Zettel daneben bleibt, weil ihn
    // jedes Werkzeug lesen kann - ein PNG-Abschnitt nicht.
    if (ablage.beipack) {
      try {
        blob = new Blob([legeTextInPng(new Uint8Array(await blob.arrayBuffer()), pngTexte(zettel, DATEN.anwendung))], {
          type: 'image/png'
        });
      } catch (f) {
        // Ein Bild ohne eingelegten Text ist besser als kein Bild.
      }
    }

    if (ablage.ordner && ordnerZugriff) {
      try {
        await schreibeInOrdner(name, blob);
        wohin.push(`${ordnerZugriff.name}/${name}`);
        if (ablage.beipack) {
          await schreibeInOrdner(zettelName, new Blob([zettel], { type: 'application/json' }));
          wohin.push(zettelName);
        }
        // Die Aufnahme im Eingang merkt sich ihre Datei - sonst waere spaeter
        // nicht zu erkennen, welcher Zettel zu ihr gehoert.
        // Die Aufnahme kann zwischenzeitlich ersetzt worden sein - darum
        // wird sie hier erneut gesucht, statt auf die alte zu schreiben.
        const imEingang = eingangsAufnahme && eingang.find((a) => a.id === eingangsAufnahme.id);
        if (imEingang) {
          imEingang.herkunft = {
            ordner: ordnerZugriff.name,
            datei: name,
            zettel: ablage.beipack ? zettelName : '',
            uebernommen_am: jetzt.toISOString()
          };
          sichereEingang();
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

// starte() steht in der letzten Zeile der letzten Datei - jetzt markieren.js.
verdrahteSchnipsel();
