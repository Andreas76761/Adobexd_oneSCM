/* =========================================================================
   Aufnahmestudio und Eingang.

   Ablauf: Quelle wählen (Bildschirm, Bilddatei oder Beispiel) → Ausschnitt
   ziehen → Metadaten und Datum eintragen → Leertaste. Die Aufnahme landet
   sofort im Eingang; Kategorie und Begriffe werden dort nachgetragen.

   Der Eingang liegt im Browser des Betrachters (localStorage). Die Seite ist
   ein veröffentlichtes Artifact ohne eigenen Server - "Als JSON sichern"
   reicht die Aufnahmen an data/eintraege.json weiter.
   ========================================================================= */

const heute = () => new Date().toISOString().slice(0, 10);

let eingang = leseEingangAusSpeicher();
let entwurf = leereAufnahme(heute(), { browser: erkenneBrowser() });
let quelle = null; // { art, name, breite, hoehe, element, strom }
let ausschnitt = null; // in Bildpunkten der Quelle
let eingangAuswahl = { suche: '', zustand: 'alle', sortierung: 'neu' };
let aufnahmeLaeuft = false;
let anzeigeTakt = null;
let bearbeitet = null; // Kennung der im Eingang geöffneten Aufnahme
let speicherGemeldet = false; // gesperrter Speicher wird nur einmal gemeldet
let kompakt = false; // schmale Leiste rechts, Live-Ansicht gross
let letzte = null; // zuletzt aufgenommenes Bild fuer die Rueckmeldung
let stapel = []; // mehrere geoeffnete Bilddateien
let stapelIndex = 0;

/* ------------------------------------------------------------- Speicher */

function leseEingangAusSpeicher() {
  try {
    return leseEingang(localStorage.getItem(EINGANG_SCHLUESSEL));
  } catch (fehler) {
    return [];
  }
}

/**
 * Schreibt den Eingang zurück.
 * Zwei Ausgänge, die man nicht verwechseln darf: der Speicher ist **voll**
 * (dann hilft nur Sichern und Löschen) oder er ist **gesperrt** – das kommt in
 * eingebetteten Ansichten vor, wenn der Browser fremden Rahmen keinen Speicher
 * gibt. Dann ist die Aufnahme nicht verloren, sie überlebt nur kein Neuladen.
 */
function sichereEingang() {
  try {
    localStorage.setItem(EINGANG_SCHLUESSEL, schreibeEingang(eingang));
    return { ok: true };
  } catch (fehler) {
    const voll =
      fehler &&
      (fehler.name === 'QuotaExceededError' || fehler.code === 22 || /quota|exceeded/i.test(String(fehler.name || fehler.message)));
    return {
      ok: false,
      voll: Boolean(voll),
      text: voll
        ? 'Der Browserspeicher ist voll. Bitte den Eingang als Kontaktbogen sichern und Aufnahmen löschen.'
        : 'Dieser Browser gibt der eingebetteten Ansicht keinen Speicher. Die Aufnahmen bleiben für diese Sitzung erhalten und gehen beim Neuladen verloren – bitte vorher als Kontaktbogen sichern.'
    };
  }
}

/**
 * Holt eine abgelegte Datei samt Beipackzettel zurueck in den Eingang. Ohne
 * diesen Weg waere die Ablage eine Einbahnstrasse: die Seite schreibt
 * Metadaten auf die Platte und koennte sie nie wieder lesen.
 *
 * Das Bild wird wie bei einer Aufnahme als JPEG abgelegt - ein PNG aus dem
 * Ordner spraengte den Browserspeicher schon nach wenigen Dateien.
 */
async function uebernimmAusOrdner() {
  const b = zettelOffen;
  if (!b || !b.zettel || !ordnerZugriff) return;
  const schon = findeUebernahme(eingang, ordnerZugriff.name, b.name);
  if (schon) {
    setze({ ansicht: 'eingang' });
    return;
  }
  const gelesen = leseBeipackzettel(b.zettel.text);
  if (!gelesen.ok) {
    meldeZettel('Dieser Zettel ist nicht lesbar – es gibt nichts zu übernehmen.', 'warnung');
    return;
  }
  // Die Kennung haengt am Jahr der Aufnahme, nicht am Tag der Uebernahme.
  const datum = istGueltigesDatum(gelesen.daten.datum)
    ? gelesen.daten.datum
    : String(gelesen.daten.erfasst_am || '').slice(0, 10) || heute();
  const knopf = $('#zettel-uebernehmen');
  knopf.disabled = true;
  try {
    const quelleObj = await ladeBild(b.bild, 'datei', b.name);
    const bild = schneideLeinwand(quelleObj, {
      x: 0,
      y: 0,
      breite: quelleObj.breite,
      hoehe: quelleObj.hoehe
    }).toDataURL('image/jpeg', 0.72);
    const aufnahme = aufnahmeAusZettel({
      daten: gelesen.daten,
      bild,
      kennung: naechsteAufnahmeKennung(eingang, datum),
      ordner: ordnerZugriff.name,
      datei: b.name,
      zettelDatei: b.zettel.name,
      erfasstAm: new Date().toISOString()
    });
    eingang = [aufnahme, ...eingang];
    const ergebnis = sichereEingang();
    if (!ergebnis.ok && ergebnis.voll) {
      eingang = eingang.filter((a) => a.id !== aufnahme.id);
      meldeZettel(ergebnis.text, 'warnung');
      return;
    }
    meldeZettel(
      ergebnis.ok
        ? `${aufnahme.id} im Eingang – ${istVollstaendig(aufnahme) ? 'vollständig' : 'Kategorie oder Begriffe fehlen noch'}.`
        : `${aufnahme.id} im Eingang – nur für diese Sitzung, der Browser gibt hier keinen Speicher.`,
      ergebnis.ok ? 'gut' : 'warnung'
    );
    zeigeAnsicht();
    zeichneEigeneAufnahmen();
    zeichneOrdnerStreifen();
    ruesteUebernahme(b, gelesen);
  } catch (fehler) {
    meldeZettel(
      'Das Bild konnte nicht gelesen werden: ' + (fehler && fehler.message ? fehler.message : 'unbekannter Grund'),
      'warnung'
    );
  } finally {
    knopf.disabled = false;
  }
}

function erkenneBrowser() {
  const kennung = navigator.userAgent || '';
  const treffer =
    kennung.match(/(Firefox)\/(\d+)/) ||
    kennung.match(/(Edg)\/(\d+)/) ||
    kennung.match(/(Chrome)\/(\d+)/) ||
    kennung.match(/Version\/(\d+).*(Safari)/);
  if (!treffer) return '';
  const name = { Edg: 'Edge', Chrome: 'Chrome', Firefox: 'Firefox', Safari: 'Safari' }[treffer[1]] || treffer[2];
  return `${name === treffer[2] ? 'Safari' : name} ${treffer[1] === 'Safari' ? treffer[1] : treffer[2]}`.replace(/\s+/g, ' ');
}

/** Fähigkeiten des Artifacts sind nicht überall vorhanden - immer prüfen. */
async function holeFaehigkeit(name) {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    return await window.claude.use(name);
  } catch (fehler) {
    return null;
  }
}

/**
 * Prüft die Umgebung und schreibt sie in die Ansicht Ausschneiden. Jede
 * Angabe wird gemessen, nicht vermutet - und wo etwas fehlt, steht der Weg
 * daneben, der statt dessen geht.
 */
async function zeigeFaehigkeiten() {
  const liste = document.getElementById('faehig-liste');
  if (!liste) return;
  const beruehrung = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const lage = {
    ordner: typeof window.showDirectoryPicker === 'function',
    datei: Boolean(await holeFaehigkeit('downloads')),
    freigabe: Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && freigabeErlaubt() !== false,
    zwischenablage: typeof window.ClipboardEvent === 'function',
    speicher: pruefeSpeicher(),
    beruehrung
  };
  const zeilen = beschreibeFaehigkeiten(lage);
  const fehlend = zeilen.filter((z) => !z.geht && z.name !== 'Netzablage, SharePoint, Datenbank').length;
  const kurz = document.getElementById('faehig-kurz');
  if (kurz) kurz.textContent = fehlend ? `${fehlend} Weg${fehlend === 1 ? '' : 'e'} fehlt hier` : 'alle Wege offen';
  liste.replaceChildren(
    ...zeilen.flatMap((zeile) => [
      el('dt', { klasse: zeile.geht ? 'faehig-ja' : 'faehig-nein' }, [
        el('span', { klasse: 'faehig-zeichen', text: zeile.geht ? '✓' : '×' }),
        el('span', { text: zeile.name })
      ]),
      el('dd', { text: zeile.text })
    ])
  );
}

/** Schreibt und liest einen Probewert - nur so ist der Speicher sicher da. */
function pruefeSpeicher() {
  try {
    const schluessel = 'screenarchiv:probe';
    localStorage.setItem(schluessel, '1');
    const gelesen = localStorage.getItem(schluessel) === '1';
    localStorage.removeItem(schluessel);
    return gelesen;
  } catch (fehler) {
    return false;
  }
}

/* --------------------------------------------------------- Kompaktmodus */

/**
 * Kompaktmodus: die App zieht sich auf eine schmale Leiste rechts zusammen,
 * die Live-Ansicht des geteilten Bildschirms bekommt den Rest. Beim Teilen des
 * Bildschirms schaltet er sich selbst ein - dort ist er der eigentliche Zweck.
 */
function setzeKompakt(an) {
  kompakt = Boolean(an);
  document.body.classList.toggle('kompakt', kompakt);
  const schalter = $('#kompakt-schalter');
  schalter.setAttribute('aria-pressed', String(kompakt));
  schalter.textContent = kompakt ? 'Ansicht zurück' : 'Kompakt';
  if (kompakt) $('#quelle-buehne').focus();
  zeichneStudio();
}

/* --------------------------------------------------------------- Quelle */

function beendeStrom() {
  if (anzeigeTakt) cancelAnimationFrame(anzeigeTakt);
  anzeigeTakt = null;
  if (quelle && quelle.strom) {
    for (const spur of quelle.strom.getTracks()) spur.stop();
  }
}

function setzeQuelle(neueQuelle) {
  beendeStrom();
  $('#quelle-buehne').classList.remove('wartet');
  $('#einfuege-hinweis').hidden = true;
  quelle = neueQuelle;
  ausschnitt = presetAusschnitt('voll', quelle, VOKABULAR.viewports);
  zeichnePreview();
  zeichneStudio();
}

function zeichnePreview() {
  const leinwand = $('#quelle-leinwand');
  if (!quelle) {
    leinwand.width = 0;
    leinwand.height = 0;
    return;
  }
  const breite = Math.min(quelle.breite, 1400);
  const hoehe = Math.round((breite / quelle.breite) * quelle.hoehe);
  if (leinwand.width !== breite) {
    leinwand.width = breite;
    leinwand.height = hoehe;
  }
  const stift = leinwand.getContext('2d');
  stift.fillStyle = '#ffffff';
  stift.fillRect(0, 0, breite, hoehe);
  try {
    stift.drawImage(quelle.element, 0, 0, breite, hoehe);
  } catch (fehler) {
    /* Beim Videostart ist noch kein Bild da - der nächste Takt zeichnet. */
  }
  if (quelle.art === 'bildschirm') anzeigeTakt = requestAnimationFrame(zeichnePreview);
}

const EINFUEGE_TASTE = navigator.platform && /Mac/i.test(navigator.platform) ? 'Cmd+V' : 'Strg+V';
const BILDSCHIRMFOTO_TASTE =
  navigator.platform && /Mac/i.test(navigator.platform) ? 'Umschalt+Cmd+4' : 'Druck bzw. Windows+Umschalt+S';

const AUSWEG =
  `Bildschirmfoto mit ${BILDSCHIRMFOTO_TASTE} aufnehmen und hier mit ${EINFUEGE_TASTE} einfügen – ` +
  'oder ein Bild öffnen.';

/**
 * Gibt die Richtlinie dieser Ansicht die Bildschirmfreigabe frei?
 * true / false / null (nicht feststellbar).
 */
function freigabeErlaubt() {
  const richtlinie = document.permissionsPolicy || document.featurePolicy;
  if (!richtlinie || typeof richtlinie.allowsFeature !== 'function') return null;
  try {
    return richtlinie.allowsFeature('display-capture');
  } catch (fehler) {
    return null;
  }
}

async function quelleBildschirm() {
  stapel = [];
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    meldeStudio(`Dieser Browser kennt die Bildschirmfreigabe nicht. ${AUSWEG}`, 'warnung');
    return;
  }
  if (freigabeErlaubt() === false) {
    meldeStudio(
      `Diese eingebettete Ansicht darf den Bildschirm nicht freigeben – das entscheidet die Vorschau, nicht die Seite. ${AUSWEG}`,
      'warnung'
    );
    warteAufEinfuegen();
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
    strom.getVideoTracks()[0].addEventListener('ended', () => {
      if (quelle && quelle.art === 'bildschirm') {
        quelle = null;
        setzeKompakt(false);
        zeichnePreview();
        zeichneStudio();
        meldeStudio('Die Bildschirmfreigabe wurde beendet.', 'warnung');
      }
    });
    // Die Kennung des Datenstroms ist oft eine undurchsichtige Zeichenfolge -
    // dann sagt "Geteilter Bildschirm" mehr als sie.
    const kennung = String(strom.getVideoTracks()[0].label || '');
    const lesbar = kennung && !(kennung.length > 24 && !/\s/.test(kennung));
    setzeQuelle({
      art: 'bildschirm',
      name: lesbar ? kennung : 'Geteilter Bildschirm',
      breite: video.videoWidth,
      hoehe: video.videoHeight,
      element: video,
      strom
    });
    setzeKompakt(true);
    meldeStudio(
      'Bildschirm freigegeben. Ausschnitt ziehen und mit der Leertaste aufnehmen – die Ansicht ist auf die Leiste rechts zusammengezogen, damit der Bildschirm sichtbar bleibt.',
      'gut'
    );
  } catch (fehler) {
    const abgebrochen = fehler && fehler.name === 'NotAllowedError' && /denied by (the )?user|abort/i.test(fehler.message || '');
    meldeStudio(
      abgebrochen
        ? 'Die Bildschirmfreigabe wurde abgebrochen. Erneut versuchen – oder: ' + AUSWEG
        : `Die Bildschirmfreigabe ist in dieser Ansicht gesperrt. ${AUSWEG}`,
      'warnung'
    );
    if (!abgebrochen) warteAufEinfuegen();
  }
}

/**
 * Bild aus der Zwischenablage. Das Lesen der Zwischenablage ist an eine
 * Erlaubnis gebunden, die eingebettete Ansichten meist nicht haben - dann
 * bleibt der Weg über die Einfügetaste, den der Browser immer zulässt.
 */
/** Bricht ein Versprechen ab, das keine Antwort gibt. */
const mitZeitgrenze = (versprechen, millisekunden) =>
  Promise.race([
    versprechen,
    new Promise((_, scheitern) => setTimeout(() => scheitern(new Error('Zeitgrenze')), millisekunden))
  ]);

/**
 * Macht die Fläche sichtbar bereit für das Einfügen. Ohne diesen Zustand ist
 * nicht zu erkennen, wohin eingefügt werden muss - und ein Einfügen in den
 * umgebenden Rahmen erreicht die Seite nicht.
 */
function warteAufEinfuegen() {
  const buehne = $('#quelle-buehne');
  buehne.classList.add('wartet');
  buehne.focus();
  $('#einfuege-hinweis').hidden = false;
  $('#einfuege-taste').textContent = EINFUEGE_TASTE;
  zeichneStudio();
}

async function quelleZwischenablage() {
  // Der Hinweis kommt zuerst: das Lesen der Zwischenablage kann auf eine
  // Erlaubnis warten, die in einer eingebetteten Ansicht nie beantwortet wird.
  meldeStudio(`Jetzt ${EINFUEGE_TASTE} drücken – so gibt der Browser das Bild frei.`, 'neutral');
  warteAufEinfuegen();
  if (!navigator.clipboard || !navigator.clipboard.read) return;
  try {
    for (const eintrag of await mitZeitgrenze(navigator.clipboard.read(), 1500)) {
      const typ = (eintrag.types || []).find((t) => t.startsWith('image/'));
      if (!typ) continue;
      await uebernimmBild(await eintrag.getType(typ), 'zwischenablage', 'Zwischenablage');
      return;
    }
  } catch (fehler) {
    /* Keine Erlaubnis oder keine Antwort - der Hinweis oben gilt weiter. */
  }
}

/** Liest einen Blob als Daten-Adresse. */
function liesAlsDatenadresse(blob) {
  return new Promise((fertig, scheitern) => {
    const leser = new FileReader();
    leser.onload = () => fertig(leser.result);
    leser.onerror = () => scheitern(leser.error);
    leser.readAsDataURL(blob);
  });
}

function ladeBild(adresse, art, name) {
  return new Promise((fertig, scheitern) => {
    const bild = new Image();
    bild.onload = () =>
      fertig({ art, name, breite: bild.naturalWidth, hoehe: bild.naturalHeight, element: bild, strom: null });
    bild.onerror = () => scheitern(new Error('Bild konnte nicht gelesen werden'));
    bild.src = adresse;
  });
}

/** Uebernimmt ein Bild aus Datei, Ablegen oder Zwischenablage als Quelle. */
/**
 * Traegt die PNG-Datei einen Beipackzettel, werden daraus die *leeren* Felder
 * gefuellt - nie die ausgefuellten. Wer gerade tippt, soll nicht ueberschrieben
 * werden; was zurueckkommt, wird genannt.
 */
async function uebernimmBildzettel(blob) {
  if (!blob || blob.type !== 'image/png') return [];
  let daten;
  try {
    const texte = liesTextAusPng(new Uint8Array(await blob.arrayBuffer()));
    if (!texte[PNG_SCHLUESSEL]) return [];
    daten = JSON.parse(texte[PNG_SCHLUESSEL]);
  } catch (fehler) {
    return [];
  }
  if (!daten || typeof daten !== 'object') return [];
  const uebernommen = [];
  const setzeLeeres = (feld, wert, name) => {
    const text = String(wert || '').trim();
    if (!text || String(entwurf[feld] || '').trim()) return;
    entwurf[feld] = text;
    uebernommen.push(name);
  };
  setzeLeeres('titel', daten.titel, 'Titel');
  setzeLeeres('projekt', daten.projekt, 'Projekt');
  setzeLeeres('seite', daten.seite, 'Seite');
  setzeLeeres('kategorie', daten.kategorie, 'Kategorie');
  setzeLeeres('notiz', daten.notiz, 'Notiz');
  setzeLeeres('autor', daten.autor, 'Autor');
  if (istGueltigesDatum(daten.datum) && daten.datum !== heute()) {
    entwurf.datum = daten.datum;
    uebernommen.push('Datum');
  }
  if (!entwurf.begriffe.length && (daten.begriffe || []).length) {
    entwurf.begriffe = normalisiereBegriffe(daten.begriffe);
    uebernommen.push('Begriffe');
  }
  if (uebernommen.length) fuelleFormular();
  return uebernommen;
}

async function uebernimmBild(blob, art, name) {
  if (!blob || !String(blob.type || '').startsWith('image/')) {
    meldeStudio('Das ist kein Bild.', 'warnung');
    return false;
  }
  try {
    setzeQuelle(await ladeBild(await liesAlsDatenadresse(blob), art, name));
    const uebernommen = await uebernimmBildzettel(blob);
    meldeStudio(
      (art === 'zwischenablage'
        ? 'Bild aus der Zwischenablage übernommen. Ausschnitt ziehen und mit der Leertaste aufnehmen.'
        : `„${name}“ geöffnet. Ausschnitt ziehen und mit der Leertaste aufnehmen.`) +
        (uebernommen.length ? ` Aus dem Bild übernommen: ${uebernommen.join(', ')}.` : ''),
      'gut'
    );
    return true;
  } catch (fehler) {
    meldeStudio('Das Bild konnte nicht gelesen werden.', 'warnung');
    return false;
  }
}

/**
 * Öffnet eine oder mehrere Bilddateien. Mehrere werden zum Stapel, den man
 * nacheinander durchgeht - der Weg für einen Ordner voller Bildschirmfotos,
 * ganz ohne Zwischenablage.
 */
async function quelleDateien(dateien) {
  const bilder = Array.from(dateien || []).filter((d) => String(d.type || '').startsWith('image/'));
  if (!bilder.length) {
    meldeStudio('Darunter ist keine Bilddatei.', 'warnung');
    return false;
  }
  stapel = bilder;
  stapelIndex = 0;
  const geladen = await zeigeStapelbild(0);
  if (geladen && bilder.length > 1) {
    meldeStudio(`${bilder.length} Bilder geöffnet – mit „Weiter“ durch den Stapel gehen.`, 'gut');
  }
  return geladen;
}

async function zeigeStapelbild(index) {
  const datei = stapel[index];
  if (!datei) return false;
  stapelIndex = index;
  return uebernimmBild(datei, 'datei', datei.name);
}

const quelleDatei = (datei) => quelleDateien(datei ? [datei] : []);

async function quelleBeispiel(kennung) {
  stapel = [];
  const eintrag = EINTRAEGE.find((e) => e.id === kennung) || EINTRAEGE[0];
  // Als Bild geladenes SVG braucht die Namensraum-Angabe, die der Build entfernt.
  const roh = AUFNAHMEN[eintrag.id].nachher.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const adresse = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(roh);
  try {
    setzeQuelle(await ladeBild(adresse, 'beispiel', `${eintrag.id} · ${eintrag.titel}`));
    entwurf.projekt = entwurf.projekt || eintrag.projekt;
    entwurf.seite = entwurf.seite || eintrag.seite;
    fuelleFormular();
    meldeStudio('Beispielquelle geladen. Ausschnitt ziehen und mit der Leertaste aufnehmen.', 'gut');
  } catch (fehler) {
    meldeStudio('Die Beispielquelle konnte nicht geladen werden.', 'warnung');
  }
}

/* ----------------------------------------------------------- Ausschnitt */

/** Rechnet Bildschirmkoordinaten in Bildpunkte der Quelle um. */
function zuQuellPunkt(ereignis) {
  const leinwand = $('#quelle-leinwand');
  const masse = leinwand.getBoundingClientRect();
  const faktor = quelle.breite / (masse.width || 1);
  return {
    x: (ereignis.clientX - masse.left) * faktor,
    y: (ereignis.clientY - masse.top) * faktor
  };
}

function setzeAusschnitt(neu) {
  ausschnitt = begrenzeAusschnitt(neu, quelle);
  zeichneStudio();
}

function verdrahteBuehne() {
  const buehne = $('#quelle-buehne');
  let zug = null;

  buehne.addEventListener('pointerdown', (e) => {
    if (!quelle) return;
    const griff = e.target.closest('.griff-punkt');
    // Deckt die Auswahl die ganze Quelle, waere Verschieben wirkungslos - dann
    // zieht ein Zug im Rahmen einen neuen Ausschnitt auf.
    const formatfuellend =
      ausschnitt && ausschnitt.breite * ausschnitt.hoehe >= quelle.breite * quelle.hoehe * 0.98;
    const rahmen = formatfuellend ? null : e.target.closest('#ausschnitt-rahmen');
    const punkt = zuQuellPunkt(e);
    if (griff) {
      zug = { art: 'groesse', ecke: griff.dataset.ecke, start: punkt, anfang: { ...ausschnitt } };
    } else if (rahmen) {
      zug = { art: 'schieben', start: punkt, anfang: { ...ausschnitt } };
    } else {
      zug = { art: 'neu', start: punkt };
      setzeAusschnitt({ x: punkt.x, y: punkt.y, breite: MINDEST_AUSSCHNITT, hoehe: MINDEST_AUSSCHNITT });
    }
    buehne.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  buehne.addEventListener('pointermove', (e) => {
    if (!zug || !quelle) return;
    const punkt = zuQuellPunkt(e);
    if (zug.art === 'neu') {
      setzeAusschnitt({
        x: Math.min(zug.start.x, punkt.x),
        y: Math.min(zug.start.y, punkt.y),
        breite: Math.abs(punkt.x - zug.start.x),
        hoehe: Math.abs(punkt.y - zug.start.y)
      });
    } else if (zug.art === 'schieben') {
      setzeAusschnitt({
        x: zug.anfang.x + (punkt.x - zug.start.x),
        y: zug.anfang.y + (punkt.y - zug.start.y),
        breite: zug.anfang.breite,
        hoehe: zug.anfang.hoehe
      });
    } else {
      const links = zug.ecke.includes('l');
      const oben = zug.ecke.includes('o');
      const x1 = links ? punkt.x : zug.anfang.x;
      const y1 = oben ? punkt.y : zug.anfang.y;
      const x2 = links ? zug.anfang.x + zug.anfang.breite : punkt.x;
      const y2 = oben ? zug.anfang.y + zug.anfang.hoehe : punkt.y;
      setzeAusschnitt({ x: Math.min(x1, x2), y: Math.min(y1, y2), breite: Math.abs(x2 - x1), hoehe: Math.abs(y2 - y1) });
    }
  });

  const endeZug = () => {
    zug = null;
  };
  buehne.addEventListener('pointerup', endeZug);
  buehne.addEventListener('pointercancel', endeZug);

  // Feinarbeit mit der Tastatur: Pfeile schieben, mit Umschalt in Zehnerschritten.
  buehne.addEventListener('keydown', (e) => {
    if (!quelle || !ausschnitt) return;
    const schritt = e.shiftKey ? 10 : 1;
    const bewege = { ArrowLeft: [-schritt, 0], ArrowRight: [schritt, 0], ArrowUp: [0, -schritt], ArrowDown: [0, schritt] }[e.key];
    if (!bewege) return;
    e.preventDefault();
    setzeAusschnitt({ ...ausschnitt, x: ausschnitt.x + bewege[0], y: ausschnitt.y + bewege[1] });
  });
}

/* -------------------------------------------------------------- Auslöser */

/**
 * Schneidet einen Bereich aus einer Quelle und gibt die Leinwand zurueck.
 * Auch das Ausschneiden (schnipsel.js) nutzt diesen Weg - so entsteht der
 * Zuschnitt an einer einzigen Stelle.
 */
function schneideLeinwand(quelleObj, bereich, hoechsteBreite = 1100) {
  const massstab = Math.min(1, hoechsteBreite / bereich.breite);
  const breite = Math.max(1, Math.round(bereich.breite * massstab));
  const hoehe = Math.max(1, Math.round(bereich.hoehe * massstab));
  const leinwand = document.createElement('canvas');
  leinwand.width = breite;
  leinwand.height = hoehe;
  const stift = leinwand.getContext('2d');
  stift.fillStyle = '#ffffff';
  stift.fillRect(0, 0, breite, hoehe);
  stift.drawImage(quelleObj.element, bereich.x, bereich.y, bereich.breite, bereich.hoehe, 0, 0, breite, hoehe);
  return leinwand;
}

function schneideAus() {
  return schneideLeinwand(quelle, ausschnitt).toDataURL('image/jpeg', 0.72);
}

/** Nimmt auf. Rückgabe: die Kennung oder null, wenn etwas fehlt. */
function loeseAus() {
  if (aufnahmeLaeuft) return null;
  const probleme = pruefeEntwurf(entwurf, quelle, ausschnitt, heute());
  if (probleme.length) {
    meldeStudio(probleme[0].text, 'warnung');
    const feld = document.getElementById('feld-' + probleme[0].feld);
    if (feld) feld.focus();
    return null;
  }
  aufnahmeLaeuft = true;
  try {
    const bild = schneideAus();
    const kennung = naechsteAufnahmeKennung(eingang, entwurf.datum);
    const aufnahme = baueAufnahme({
      entwurf,
      bild,
      ausschnitt,
      quelle,
      kennung,
      erfasstAm: new Date().toISOString()
    });
    eingang = [aufnahme, ...eingang];
    const ergebnis = sichereEingang();
    if (!ergebnis.ok && ergebnis.voll) {
      // Voll heißt: es passt nichts mehr hinein. Die Aufnahme zurücknehmen,
      // damit Anzeige und Speicher nicht auseinanderlaufen.
      eingang = eingang.filter((a) => a.id !== kennung);
      meldeStudio(ergebnis.text, 'warnung');
      zeigeAnsicht();
      return null;
    }
    if (!ergebnis.ok && !speicherGemeldet) {
      // Gesperrt heißt: die Aufnahme ist da, sie überlebt nur kein Neuladen.
      speicherGemeldet = true;
      meldeEingang(ergebnis.text, 'warnung');
    }
    letzte = { id: kennung, bild };
    entwurf.titel = '';
    fuelleFormular();
    blitze();
    meldeStudio(
      ergebnis.ok
        ? `${kennung} im Eingang gespeichert – Kategorie und Begriffe können dort nachgetragen werden.`
        : `${kennung} im Eingang – nur für diese Sitzung, der Browser gibt hier keinen Speicher.`,
      ergebnis.ok ? 'gut' : 'warnung'
    );
    zeigeAnsicht();
    zeichneStudio();
    return kennung;
  } catch (fehler) {
    const verweigert =
      fehler && (fehler.name === 'SecurityError' || /tainted|cross-origin|insecure/i.test(String(fehler.message || '')));
    meldeStudio(
      verweigert
        ? 'Dieser Browser lässt das Ausschneiden dieser Quelle nicht zu. Bitte ein Bildschirmfoto einfügen oder eine Bilddatei öffnen – damit geht es.'
        : 'Die Aufnahme ist fehlgeschlagen: ' + (fehler && fehler.message ? fehler.message : 'unbekannter Grund'),
      'warnung'
    );
    return null;
  } finally {
    aufnahmeLaeuft = false;
  }
}

function blitze() {
  const buehne = $('#quelle-buehne');
  buehne.classList.remove('blitzt');
  void buehne.offsetWidth;
  buehne.classList.add('blitzt');
  // Zweite Sicherung: die Marke wieder abnehmen, damit über der Live-Ansicht
  // nichts liegen bleibt, falls die Animation nicht sauber ausläuft.
  setTimeout(() => buehne.classList.remove('blitzt'), 400);
}

function meldeStudio(text, art = 'neutral') {
  const feld = $('#aufnahme-meldung');
  feld.textContent = text;
  feld.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------ Formular */

const FELDER_TEXT = [
  ['titel', 'Titel', 'Was ist zu sehen? Leer lassen erzeugt einen Vorschlag.'],
  ['seite', 'Seite', '/portal/bestellungen'],
  ['autor', 'Erfasst von', 'Name oder Kürzel'],
  ['browser', 'Browser', 'Chrome 141']
];

function baueFormular() {
  const form = $('#metadaten');
  const feldGruppe = (kennung, beschriftung, kind, hinweis) =>
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'feld-' + kennung, text: beschriftung }),
      kind,
      hinweis ? el('span', { klasse: 'feld-hinweis', text: hinweis }) : null
    ]);

  const eingabe = (kennung, platzhalter, typ = 'text') =>
    el('input', {
      id: 'feld-' + kennung,
      type: typ,
      value: entwurf[kennung] || '',
      placeholder: platzhalter || '',
      autocomplete: 'off',
      oninput: (e) => {
        entwurf[kennung] = e.target.value;
        zeichneStudio();
      }
    });

  const auswahl = (kennung, werte, leerText) =>
    el(
      'select',
      {
        id: 'feld-' + kennung,
        onchange: (e) => {
          entwurf[kennung] = e.target.value;
          zeichneStudio();
        }
      },
      [
        leerText ? el('option', { value: '', text: leerText }) : null,
        ...werte.map((w) =>
          el('option', { value: w.id || w, text: w.label || w, selected: (w.id || w) === entwurf[kennung] })
        )
      ]
    );

  const projektListe = el('datalist', { id: 'projektliste' }, VOKABULAR.projekte.map((p) => el('option', { value: p })));

  form.replaceChildren(
    el('h2', { klasse: 'abschnitt-titel', text: 'Metadaten für die nächste Aufnahme' }),
    feldGruppe('titel', 'Titel', eingabe('titel', FELDER_TEXT[0][2]), null),
    feldGruppe(
      'projekt',
      'Projekt',
      el('input', {
        id: 'feld-projekt',
        type: 'text',
        list: 'projektliste',
        value: entwurf.projekt,
        placeholder: 'oneSCM Portal',
        autocomplete: 'off',
        oninput: (e) => {
          entwurf.projekt = e.target.value;
          zeichneStudio();
        }
      }),
      null
    ),
    projektListe,
    feldGruppe('seite', 'Seite', eingabe('seite', '/portal/bestellungen'), null),
    el('div', { klasse: 'feld-paar' }, [
      feldGruppe('datum', 'Datum', eingabe('datum', '', 'date'), null),
      feldGruppe('rolle', 'Rolle', auswahl('rolle', ROLLEN, null), null)
    ]),
    el('div', { klasse: 'feld-paar' }, [
      feldGruppe('kategorie', 'Kategorie', auswahl('kategorie', VOKABULAR.kategorien, 'später ergänzen'), null),
      feldGruppe('status', 'Status', auswahl('status', VOKABULAR.status, null), null)
    ]),
    el('div', { klasse: 'feld-paar' }, [
      feldGruppe('autor', 'Erfasst von', eingabe('autor', 'Name oder Kürzel'), null),
      feldGruppe('browser', 'Browser', eingabe('browser', 'Chrome 141'), null)
    ]),
    feldGruppe(
      'begriffe',
      'Begriffe',
      el('input', {
        id: 'feld-begriffe',
        type: 'text',
        value: begriffeAlsText(entwurf.begriffe),
        placeholder: 'kontrast, navigation – später ergänzbar',
        autocomplete: 'off',
        oninput: (e) => {
          entwurf.begriffe = e.target.value.split(',');
          zeichneStudio();
        },
        onblur: (e) => {
          entwurf.begriffe = normalisiereBegriffe(e.target.value);
          e.target.value = begriffeAlsText(entwurf.begriffe);
        }
      }),
      'Mit Komma trennen. Kategorie und Begriffe dürfen auch später im Eingang entstehen.'
    ),
    feldGruppe(
      'notiz',
      'Notiz',
      el('textarea', {
        id: 'feld-notiz',
        rows: '2',
        placeholder: 'Beobachtung, Zusammenhang, Verweis',
        oninput: (e) => {
          entwurf.notiz = e.target.value;
        }
      }),
      null
    )
  );
  fuelleFormular();
}

/** Schreibt den Entwurf in das Formular zurück (nach dem Auslösen). */
function fuelleFormular() {
  const setzeWert = (kennung, wert) => {
    const feld = document.getElementById('feld-' + kennung);
    if (feld && feld.value !== wert) feld.value = wert;
  };
  setzeWert('titel', entwurf.titel);
  setzeWert('projekt', entwurf.projekt);
  setzeWert('seite', entwurf.seite);
  setzeWert('datum', entwurf.datum);
  setzeWert('kategorie', entwurf.kategorie);
  setzeWert('status', entwurf.status);
  setzeWert('rolle', entwurf.rolle);
  setzeWert('autor', entwurf.autor);
  setzeWert('browser', entwurf.browser);
  setzeWert('begriffe', begriffeAlsText(normalisiereBegriffe(entwurf.begriffe)));
  setzeWert('notiz', entwurf.notiz);
}

/* ------------------------------------------------------ Studio zeichnen */

function zeichneStudio() {
  const hatQuelle = Boolean(quelle);
  $('#quelle-name').textContent = hatQuelle ? `${quelleArtName(quelle.art)}: ${quelle.name}` : 'Keine Quelle gewählt';
  $('#quelle-masse').textContent = hatQuelle ? `${quelle.breite} × ${quelle.hoehe}` : '';
  $('#quelle-leer').hidden = hatQuelle || !$('#einfuege-hinweis').hidden;
  $('#quelle-leinwand').hidden = !hatQuelle;

  const rahmen = $('#ausschnitt-rahmen');
  rahmen.hidden = !hatQuelle || !ausschnitt;
  if (hatQuelle && ausschnitt) {
    rahmen.style.left = (ausschnitt.x / quelle.breite) * 100 + '%';
    rahmen.style.top = (ausschnitt.y / quelle.hoehe) * 100 + '%';
    rahmen.style.width = (ausschnitt.breite / quelle.breite) * 100 + '%';
    rahmen.style.height = (ausschnitt.hoehe / quelle.hoehe) * 100 + '%';
    $('#ausschnitt-masse').textContent =
      `x ${ausschnitt.x} · y ${ausschnitt.y} · ${ausschnitt.breite} × ${ausschnitt.hoehe}`;
  } else {
    $('#ausschnitt-masse').textContent = 'kein Ausschnitt';
  }

  for (const knopf of document.querySelectorAll('.preset button')) {
    knopf.disabled = !hatQuelle;
  }
  const probleme = pruefeEntwurf(entwurf, quelle, ausschnitt, heute());
  const ausloeser = $('#ausloesen');
  ausloeser.disabled = probleme.length > 0;
  ausloeser.title = probleme.length ? probleme[0].text : 'Aufnahme in den Eingang legen';
  $('#eingang-hinweis').textContent =
    eingang.length === 0
      ? 'Noch keine Aufnahme im Eingang.'
      : `${eingang.length} ${eingang.length === 1 ? 'Aufnahme' : 'Aufnahmen'} im Eingang, davon ${eingangKennzahlen(eingang).offen} unvollständig.`;

  const leiste = $('#stapel-leiste');
  leiste.hidden = stapel.length < 2;
  if (stapel.length > 1) {
    $('#stapel-stand').textContent = `Bild ${stapelIndex + 1} von ${stapel.length}`;
    $('#stapel-name').textContent = stapel[stapelIndex] ? stapel[stapelIndex].name : '';
    $('#stapel-zurueck').disabled = stapelIndex === 0;
    $('#stapel-weiter').disabled = stapelIndex >= stapel.length - 1;
  }

  const block = $('#letzte-aufnahme');
  block.hidden = !letzte;
  if (letzte) {
    $('#letzte-vorschau').src = letzte.bild;
    $('#letzte-kennung').textContent = letzte.id;
    $('#letzte-zahl').textContent = `${eingang.length} im Eingang`;
  }
}

const quelleArtName = (art) =>
  ({ bildschirm: 'Bildschirm', datei: 'Datei', beispiel: 'Beispiel', zwischenablage: 'Zwischenablage' })[art] || 'Quelle';

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
        el('img', { src: aufnahme.bild, alt: aufnahme.titel, loading: 'lazy' }),
        vollstaendig ? null : el('span', { klasse: 'offen-marke', text: 'unvollständig' })
      ]),
      el('div', { klasse: 'eingang-text' }, [
        el('div', { klasse: 'zeile-meta' }, [
          el('span', { klasse: 'kennung', text: aufnahme.id }),
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
        ])
      ])
    ]
  );
}

function zeichneEingang() {
  const gefiltert = sortiereEingang(filtereEingang(eingang, eingangAuswahl), eingangAuswahl.sortierung);
  const k = eingangKennzahlen(eingang);

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
    gefiltert.length === eingang.length
      ? `${gefiltert.length} ${gefiltert.length === 1 ? 'Aufnahme' : 'Aufnahmen'}`
      : `${gefiltert.length} von ${eingang.length} Aufnahmen`;

  $('#eingang-raster').replaceChildren(...gefiltert.map(eingangKarte));
  $('#eingang-leer').hidden = gefiltert.length > 0;
  $('#eingang-leer-text').textContent =
    eingang.length === 0
      ? 'Der Eingang ist leer. In der Ansicht „Aufnahme“ eine Quelle wählen, den Ausschnitt ziehen und die Leertaste drücken.'
      : 'Keine Aufnahme passt zu dieser Auswahl.';
  $('#eingang-kontaktbogen').disabled = gefiltert.length === 0;
  $('#eingang-sichern').disabled = gefiltert.length === 0;
  $('#eingang-leeren').disabled = eingang.length === 0;
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
        ? el('img', { src: aufnahme.bild, alt: `${rolle}: ${aufnahme.titel}` })
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
      el('img', { src: aufnahme.bild, alt: aufnahme.titel }),
      el('p', { klasse: 'quelle', text: `${quelleArtName(aufnahme.quelle.art)}: ${aufnahme.quelle.name || '–'} · Ausschnitt ${aufnahme.ausschnitt.breite} × ${aufnahme.ausschnitt.hoehe} bei x ${aufnahme.ausschnitt.x}, y ${aufnahme.ausschnitt.y}` })
    ]),
    el('form', { klasse: 'bearbeiten-form', id: 'bearbeiten-form' }, [
      feld('Titel', text('titel')),
      el('div', { klasse: 'feld-paar' }, [feld('Projekt', text('projekt', 'oneSCM Portal')), feld('Seite', text('seite', '/portal/…'))]),
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
  sortiereEingang(filtereEingang(eingang, eingangAuswahl), eingangAuswahl.sortierung);

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
  if (meldeAblage(ergebnis, `${liste.length} Aufnahmen als ${name}`)) zeigeErsatzausgabe();
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

/* --------------------------------------------------------- Verdrahtung */

function verdrahteAufnahme() {
  baueFormular();
  verdrahteBuehne();

  $('#quelle-bildschirm').addEventListener('click', quelleBildschirm);
  $('#quelle-zwischenablage').addEventListener('click', quelleZwischenablage);
  $('#quelle-datei').addEventListener('click', () => $('#datei-eingabe').click());
  $('#datei-eingabe').addEventListener('change', (e) => quelleDateien(e.target.files));
  $('#quelle-beispiel').addEventListener('click', () => quelleBeispiel($('#beispiel-wahl').value));
  $('#beispiel-wahl').replaceChildren(
    ...EINTRAEGE.slice(0, 12).map((e) => el('option', { value: e.id, text: `${e.id} · ${e.titel}` }))
  );

  const buehne = $('#quelle-buehne');
  buehne.addEventListener('dragover', (e) => {
    e.preventDefault();
    buehne.classList.add('zieht');
  });
  buehne.addEventListener('dragleave', () => buehne.classList.remove('zieht'));
  buehne.addEventListener('drop', (e) => {
    e.preventDefault();
    buehne.classList.remove('zieht');
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      quelleDateien(e.dataTransfer.files);
      return;
    }
    // Aus einer anderen Seite gezogene Bilder kommen nur als Verweis an - und
    // die Seite darf nichts nachladen. Also sagen, was stattdessen hilft.
    const verweis = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    meldeStudio(
      verweis
        ? 'Hierher gezogene Bilder aus anderen Seiten kommen nur als Verweis an, und diese Seite darf nichts nachladen. Bitte das Bild erst speichern und die Datei ablegen – oder den Bildschirm freigeben.'
        : 'Damit lässt sich nichts anfangen. Bitte eine Bilddatei ablegen.',
      'warnung'
    );
  });

  for (const knopf of document.querySelectorAll('.preset button')) {
    knopf.addEventListener('click', () => {
      if (!quelle) return;
      const neu = presetAusschnitt(knopf.dataset.preset, quelle, VOKABULAR.viewports);
      if (neu) setzeAusschnitt(neu);
    });
  }

  $('#ausloesen').addEventListener('click', loeseAus);
  $('#kompakt-schalter').addEventListener('click', () => setzeKompakt(!kompakt));
  $('#stapel-zurueck').addEventListener('click', () => zeigeStapelbild(stapelIndex - 1));
  $('#stapel-weiter').addEventListener('click', () => zeigeStapelbild(stapelIndex + 1));

  // Escape verlässt den Kompaktmodus - solange kein Dialog offen ist.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !kompakt) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    setzeKompakt(false);
  });

  // Leertaste löst aus - nie, während in einem Feld getippt wird.
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.code !== 'Space') return;
    if (zustand.ansicht !== 'aufnahme') return;
    const ziel = e.target;
    if (ziel && (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(ziel.tagName) || ziel.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    loeseAus();
  });

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

  /* Eingefügte Bildschirmfotos: der Weg, der auch in einer eingebetteten
     Ansicht funktioniert. Text in Eingabefeldern bleibt unberührt, weil nur
     Bildbestandteile beachtet werden. */
  document.addEventListener('paste', (e) => {
    if (zustand.ansicht !== 'aufnahme') return;
    const ablage = e.clipboardData;
    if (!ablage) return;
    const stueck = Array.from(ablage.items || []).find(
      (i) => i.kind === 'file' && String(i.type || '').startsWith('image/')
    );
    const bild = stueck ? stueck.getAsFile() : Array.from(ablage.files || []).find((f) => f.type.startsWith('image/'));
    if (!bild) return;
    e.preventDefault();
    uebernimmBild(bild, 'zwischenablage', 'Zwischenablage');
  });

  // Die Bildschirmfreigabe endet, sobald die Ansicht verlassen wird.
  window.addEventListener('pagehide', beendeStrom);
}

verdrahteAufnahme();
