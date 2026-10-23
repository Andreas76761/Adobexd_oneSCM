/* =========================================================================
   Aufnahmestudio und Eingang.

   Ablauf: Quelle wählen (Bildschirm, Bilddatei oder Beispiel) → Ausschnitt
   ziehen → Metadaten und Datum eintragen → Leertaste. Die Aufnahme landet
   sofort im Eingang; Kategorie und Begriffe werden dort nachgetragen.

   Der Eingang liegt im Browser des Betrachters (localStorage). Die Seite ist
   ein veröffentlichtes Artifact ohne eigenen Server - "Als JSON sichern"
   reicht die Aufnahmen an data/eintraege.json weiter.

   Seit 1.54.0 steht hier nur das Aufnahmestudio. Der Eingang, der bis dahin
   in derselben Datei lag, steht in `eingang.js` unmittelbar dahinter – beide
   teilen sich eine Klammer und den Zustand `eingang`.
   ========================================================================= */

const heute = () => new Date().toISOString().slice(0, 10);

let eingang = leseEingangAusSpeicher();
let entwurfslabelsOffen = false; // der Labelblock im Aufnahmeformular
let projekte = leseProjekteAusSpeicher(); // angelegte Projekte: Name, Version, Land
let projektwahl = leseProjektwahlAusSpeicher(); // '' alle, 'ohne', sonst die Kennung

/**
 * Die Bilder der gewählten Arbeitsmenge. Jede Ansicht, die zählt, prüft,
 * ablegt oder sucht, fragt hier - der Eingang selbst bleibt vollständig.
 */
const imProjekt = (liste = eingang) => projektFilter(liste, projektwahl);

function leseProjekteAusSpeicher() {
  try {
    return leseProjekte(localStorage.getItem(PROJEKTE_SCHLUESSEL));
  } catch (fehler) {
    return [];
  }
}

function leseProjektwahlAusSpeicher() {
  try {
    return leseProjektwahl(localStorage.getItem(PROJEKTE_SCHLUESSEL));
  } catch (fehler) {
    return '';
  }
}

function sichereProjekte() {
  try {
    localStorage.setItem(PROJEKTE_SCHLUESSEL, schreibeProjekte(projekte, projektwahl));
  } catch (fehler) {
    // Ohne Speicher gelten die Projekte nur für diese Sitzung.
  }
}
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
let abgelegteVorschauen = new Set(); // was schon in der Datenbank liegt

function sichereEingang() {
  try {
    localStorage.setItem(EINGANG_SCHLUESSEL, schreibeEingang(eingang));
    // Die Vorschauen wandern nebenher in die Datenbank - der Speicher traegt
    // nur noch die Metadaten. Was dabei schief geht, faellt nicht auf das
    // Sichern zurueck: die Aufnahme steht auch ohne Vorschau in der Liste.
    const offen = offeneVorschauen(eingang, abgelegteVorschauen);
    if (offen.length) {
      legeVorschauenAb(offen).then((gelungen) => {
        if (gelungen) for (const [kennung] of offen) abgelegteVorschauen.add(kennung);
      });
    }
    // Die Projektliste zählt die Bilder je Projekt - sie gehört mit.
    zeichneProjekte();
    const weg = [...abgelegteVorschauen].filter((kennung) => !eingang.some((a) => a.id === kennung));
    if (weg.length) {
      entferneVorschauen(weg);
      for (const kennung of weg) abgelegteVorschauen.delete(kennung);
    }
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
function schneideLeinwand(quelleObj, bereich, hoechsteBreite = HOECHSTE_BILDBREITE) {
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

/**
 * Der Zuschnitt in voller Auflösung, verlustfrei als PNG. Bis 1.19.0 wurde
 * auf 1100 Bildpunkte heruntergerechnet und als JPEG gespeichert - beim
 * Hineinzoomen war die Schrift dann Matsch. Jetzt bleibt die Auflösung der
 * Quelle erhalten; in den Eingang kommt nur eine kleine Vorschau.
 */
function schneideAus() {
  return schneideLeinwand(quelle, ausschnitt).toDataURL('image/png');
}

/** Eine kleine Fassung für die Liste; das volle Bild liegt in der Datenbank. */
function baueVorschau(leinwand, breite = VORSCHAU_BREITE) {
  const massstab = Math.min(1, breite / leinwand.width);
  if (massstab >= 1) return leinwand.toDataURL('image/jpeg', VORSCHAU_GUETE);
  const klein = document.createElement('canvas');
  klein.width = Math.max(1, Math.round(leinwand.width * massstab));
  klein.height = Math.max(1, Math.round(leinwand.height * massstab));
  const stift = klein.getContext('2d');
  stift.imageSmoothingQuality = 'high';
  stift.drawImage(leinwand, 0, 0, klein.width, klein.height);
  return klein.toDataURL('image/jpeg', VORSCHAU_GUETE);
}

/** Dasselbe aus einer Datenadresse heraus. */
async function vorschauAus(datenadresse, breite = VORSCHAU_BREITE) {
  const geladen = await ladeBild(datenadresse, 'bild', 'vorschau');
  const leinwand = document.createElement('canvas');
  leinwand.width = geladen.breite;
  leinwand.height = geladen.hoehe;
  leinwand.getContext('2d').drawImage(geladen.element, 0, 0);
  return baueVorschau(leinwand, breite);
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
    const leinwand = schneideLeinwand(quelle, ausschnitt);
    const voll = leinwand.toDataURL('image/png');
    const bild = baueVorschau(leinwand);
    const kennung = naechsteAufnahmeKennung(eingang, entwurf.datum);
    // Das volle Bild in die Datenbank; schlägt das fehl, bleibt die Vorschau.
    legeVollbildAb(kennung, voll).then((gelungen) => {
      const treffer = gelungen && eingang.find((a) => a.id === kennung);
      if (!treffer) return;
      treffer.voll = true;
      treffer.breite = leinwand.width;
      treffer.hoehe = leinwand.height;
      sichereEingang();
    });
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

  const projektListe = el(
    'datalist',
    { id: 'projektliste' },
    [...new Set([...projekte.map((p) => p.name), ...VOKABULAR.projekte])].map((p) => el('option', { value: p }))
  );

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
    el('div', { klasse: 'feld-paar' }, [
      feldGruppe('version', 'Version', eingabe('version', '2.4'), null),
      feldGruppe('land', 'Land', eingabe('land', 'Germany'), null)
    ]),
    projektVerwaltung(),
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
    ),
    zeichneEntwurfslabels()
  );
  fuelleFormular();
}

/**
 * Sprache, Rolle, Sparte und Markt schon bei der Aufnahme. Wer eine Reihe
 * aufnimmt, nimmt sie in *einer* Sprache und für *eine* Rolle auf - diese
 * Angaben hinterher einzeln nachzutragen wäre die Arbeit zweimal. Sie bleiben
 * stehen, bis sie geändert werden, und wandern in jede neue Aufnahme.
 */
function zeichneEntwurfslabels() {
  const felder = LABEL_FELDER.filter((f) => ['sprache', 'rolle_label', 'sparte', 'markt'].includes(f.id));
  return el('details', { klasse: 'labels', id: 'entwurf-labels', open: entwurfslabelsOffen }, [
    el('summary', {}, [
      el('span', { text: 'Labels' }),
      el('span', { klasse: 'kennung', id: 'entwurf-label-kette', text: labelKette(entwurf) || 'noch keine' })
    ]),
    el(
      'div',
      { klasse: 'label-felder' },
      felder.map((feld) => {
        const id = 'feld-label-' + feld.id;
        const wert = entwurf[feld.id] || '';
        const aendere = (neu) => {
          entwurf[feld.id] = neu;
          $('#entwurf-label-kette').textContent = labelKette(entwurf) || 'noch keine';
        };
        return el('div', { klasse: 'feld' }, [
          el('label', { for: id }, [symbol(wert && feld.werte ? wertSymbol(feld, wert) : feld.symbol), el('span', { text: feld.label })]),
          feld.frei
            ? el('span', { klasse: 'feld-mit-liste' }, [
                el('input', {
                  type: 'text',
                  id,
                  value: wert,
                  list: 'vorschlag-entwurf-' + feld.id,
                  placeholder: 'Germany',
                  oninput: (e) => aendere(e.target.value)
                }),
                el(
                  'datalist',
                  { id: 'vorschlag-entwurf-' + feld.id },
                  labelVorschlaege(eingang, feld.id)
                    .slice(0, 40)
                    .map((w) => el('option', { value: w }))
                )
              ])
            : el(
                'select',
                { id, onchange: (e) => aendere(e.target.value) },
                [
                  el('option', { value: '', text: 'ohne ' + feld.label }),
                  ...feld.werte.map((w) =>
                    el('option', {
                      value: w.id,
                      text: w.lang ? `${w.label} – ${w.lang}` : w.label,
                      selected: w.id === wert
                    })
                  )
                ]
              )
        ]);
      })
    ),
    el('span', {
      klasse: 'feld-hinweis',
      text: 'Gilt für jede weitere Aufnahme, bis es geändert wird. Im Editor lässt sich alles nachziehen.'
    })
  ]);
}

/**
 * Projekte anlegen und wählen. „oneSCM Portal" allein sagt zu wenig:
 * dieselbe Maske sieht in Fassung 2.3 anders aus als in 2.4 und in Korea
 * anders als in Deutschland. Ein Projekt ist darum ein Dreiklang aus Name,
 * Version und Land - angelegt, nicht getippt, damit es in jedem Bild gleich
 * heißt.
 */
function projektVerwaltung() {
  return el('details', { klasse: 'labels', id: 'projekt-verwaltung', ontoggle: zeichneProjekte }, [
    el('summary', {}, [
      el('span', { text: 'Projekte' }),
      el('span', { klasse: 'kennung', id: 'projekt-stand', text: projektStandText() })
    ]),
    el('div', { klasse: 'projekt-liste', id: 'projekt-liste' }),
    el('div', { klasse: 'projekt-anlegen' }, [
      el('div', { klasse: 'feld' }, [
        el('label', { for: 'projekt-neu-name', text: 'Name' }),
        el('input', { type: 'text', id: 'projekt-neu-name', placeholder: 'oneSCM Portal', autocomplete: 'off' })
      ]),
      el('div', { klasse: 'feld feld--schmal' }, [
        el('label', { for: 'projekt-neu-version', text: 'Version' }),
        el('input', { type: 'text', id: 'projekt-neu-version', placeholder: '2.4', autocomplete: 'off' })
      ]),
      el('div', { klasse: 'feld feld--schmal' }, [
        el('label', { for: 'projekt-neu-land', text: 'Land' }),
        el('input', { type: 'text', id: 'projekt-neu-land', placeholder: 'Germany', autocomplete: 'off' })
      ]),
      el('button', {
        klasse: 'knopf knopf--klein',
        type: 'button',
        id: 'projekt-anlegen',
        text: 'Projekt anlegen',
        onclick: legeProjektAn
      })
    ]),
    el('p', { klasse: 'feld-hinweis', id: 'projekt-meldung' })
  ]);
}

const projektStandText = () =>
  projekte.length ? `${projekte.length} angelegt` : 'noch keins angelegt';

/** Die Liste der Projekte: wählen, zählen, löschen. */
function zeichneProjekte() {
  // Die Wahl im Kopf gehört zum selben Stand wie die Liste.
  zeichneProjektwahl();
  const kasten = document.getElementById('projekt-liste');
  if (!kasten) return;
  const stand = document.getElementById('projekt-stand');
  if (stand) stand.textContent = projektStandText();
  // Gezählt wird nur für eine offene Liste; zugeklappt kostet jedes Sichern
  // sonst einen Durchlauf über den ganzen Bestand.
  const block = document.getElementById('projekt-verwaltung');
  if (block && !block.open) return;
  const zahlen = zaehleJeProjekt(projekte, eingang);
  const offen = projekteAusBestand(eingang, projekte);

  kasten.replaceChildren(
    ...(projekte.length
      ? projekte.map((satz) => {
          const gewaehlt =
            String(entwurf.projekt || '') === satz.name &&
            String(entwurf.version || '') === satz.version &&
            String(entwurf.land || '') === satz.land;
          return el('div', { klasse: 'projekt-zeile' + (gewaehlt ? ' projekt-zeile--gewaehlt' : '') }, [
            el('button', {
              klasse: 'projekt-waehlen',
              type: 'button',
              text: projektKennung(satz),
              title: 'Für die nächsten Aufnahmen verwenden',
              onclick: () => {
                entwurf.projekt = satz.name;
                entwurf.version = satz.version;
                entwurf.land = satz.land;
                fuelleFormular();
                zeichneProjekte();
                zeichneStudio();
                meldeStudio(`Projekt „${projektKennung(satz)}" gilt für die nächsten Aufnahmen.`, 'gut');
              }
            }),
            el('span', {
              klasse: 'kennung',
              text: `${zahlen.get(satz.id) || 0} ${zahlen.get(satz.id) === 1 ? 'Bild' : 'Bilder'}`
            }),
            el('button', {
              klasse: 'knopf knopf--klein',
              type: 'button',
              text: projektwahl === satz.id ? 'Alle zeigen' : 'Nur dieses',
              title: 'Arbeitsmenge: nur die Bilder dieses Projekts',
              onclick: () => setzeProjektwahl(projektwahl === satz.id ? '' : satz.id)
            }),
            el('button', {
              klasse: 'knopf knopf--klein',
              type: 'button',
              text: 'Löschen',
              title: 'Nur das Projekt – die Bilder bleiben',
              onclick: () => {
                projekte = projekte.filter((p) => p.id !== satz.id);
                sichereProjekte();
                zeichneProjekte();
                meldeProjekt(`„${projektKennung(satz)}" gelöscht. Die Bilder bleiben.`, 'neutral');
              }
            })
          ]);
        })
      : [
          el('p', {
            klasse: 'feld-hinweis',
            text: 'Noch kein Projekt angelegt. Name, Version und Land unten eintragen.'
          })
        ]),
    // Was an Bildern steht, aber nicht angelegt ist, wird vorgeschlagen.
    ...offen.map((satz) =>
      el('div', { klasse: 'projekt-zeile projekt-zeile--offen' }, [
        el('span', { klasse: 'projekt-waehlen', text: projektKennung(satz) }),
        el('span', { klasse: 'kennung', text: 'aus dem Bestand' }),
        el('button', {
          klasse: 'knopf knopf--klein',
          type: 'button',
          text: 'Übernehmen',
          onclick: () => {
            projekte = leseProjekte(schreibeProjekte([...projekte, satz]));
            sichereProjekte();
            zeichneProjekte();
            meldeProjekt(`„${projektKennung(satz)}" angelegt.`, 'gut');
          }
        })
      ])
    )
  );
}

/**
 * Die Arbeitsmenge im Kopf: welche Bilder gezählt, geprüft, gesucht und
 * abgelegt werden. Sie steht über allen Ansichten, weil sie für alle gilt.
 */
function zeichneProjektwahl() {
  const wahl = document.getElementById('projekt-wahl');
  if (!wahl) return;
  const bekannt = [...projekte, ...projekteAusBestand(eingang, projekte)];
  const zahlen = zaehleJeProjekt(bekannt, eingang);
  const ohne = eingang.filter((a) => !String(a.projekt || '').trim()).length;
  // Eine Wahl, deren Projekt nicht mehr da ist, bleibt wählbar - sonst stünde
  // im Kopf ein Projekt, das die Liste nicht kennt.
  const fehlt = projektwahl && projektwahl !== 'ohne' && !bekannt.some((p) => p.id === projektwahl);

  wahl.replaceChildren(
    el('option', { value: '', text: `alle Projekte (${eingang.length})` }),
    ...bekannt.map((satz) =>
      el('option', { value: satz.id, text: `${projektKennung(satz)} (${zahlen.get(satz.id) || 0})` })
    ),
    ...(ohne ? [el('option', { value: 'ohne', text: `ohne Projekt (${ohne})` })] : []),
    ...(fehlt ? [el('option', { value: projektwahl, text: projektwahl })] : [])
  );
  wahl.value = projektwahl;
  const stand = document.getElementById('projekt-wahl-stand');
  if (stand) {
    const gezeigt = imProjekt().length;
    stand.textContent = projektwahl ? `${gezeigt} von ${eingang.length} Bildern` : '';
  }
}

/** Setzt die Arbeitsmenge und zeichnet die sichtbare Ansicht damit neu. */
function setzeProjektwahl(wert) {
  projektwahl = String(wert || '');
  sichereProjekte();
  zeichneProjektwahl();
  zeichneProjekte();
  // setze() zeichnet die sichtbare Ansicht - jede rechnet mit imProjekt().
  setze({});
}

function meldeProjekt(text, art = 'neutral') {
  const zeile = document.getElementById('projekt-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'feld-hinweis' + (art === 'warnung' ? ' zettel-meldung--warnung' : '');
}

function legeProjektAn() {
  const satz = {
    name: $('#projekt-neu-name').value,
    version: $('#projekt-neu-version').value,
    land: $('#projekt-neu-land').value
  };
  const probleme = pruefeProjekt(satz, projekte);
  if (probleme.length) {
    meldeProjekt(probleme[0].text, 'warnung');
    const feld = document.getElementById('projekt-neu-' + probleme[0].feld);
    if (feld) feld.focus({ preventScroll: true });
    return;
  }
  const angelegt = projektSatz(satz);
  projekte = leseProjekte(schreibeProjekte([...projekte, angelegt]));
  sichereProjekte();
  // Das neue Projekt gilt sofort - wer es anlegt, will damit arbeiten.
  entwurf.projekt = angelegt.name;
  entwurf.version = angelegt.version;
  entwurf.land = angelegt.land;
  for (const feld of ['name', 'version', 'land']) $('#projekt-neu-' + feld).value = '';
  fuelleFormular();
  zeichneProjekte();
  zeichneStudio();
  meldeProjekt(`„${projektKennung(angelegt)}" angelegt und gewählt.`, 'gut');
}

/** Schreibt den Entwurf in das Formular zurück (nach dem Auslösen). */
function fuelleFormular() {
  const setzeWert = (kennung, wert) => {
    const feld = document.getElementById('feld-' + kennung);
    if (feld && feld.value !== wert) feld.value = wert;
  };
  setzeWert('titel', entwurf.titel);
  setzeWert('projekt', entwurf.projekt);
  setzeWert('version', entwurf.version || '');
  setzeWert('land', entwurf.land || '');
  setzeWert('seite', entwurf.seite);
  setzeWert('datum', entwurf.datum);
  setzeWert('kategorie', entwurf.kategorie);
  setzeWert('status', entwurf.status);
  setzeWert('rolle', entwurf.rolle);
  setzeWert('autor', entwurf.autor);
  setzeWert('browser', entwurf.browser);
  setzeWert('begriffe', begriffeAlsText(normalisiereBegriffe(entwurf.begriffe)));
  setzeWert('notiz', entwurf.notiz);
  // Die Labels bleiben über das Auslösen hinaus stehen - sie gelten für die
  // ganze Reihe, nicht für ein Bild.
  for (const feld of LABEL_FELDER) setzeWert('label-' + feld.id, entwurf[feld.id] || '');
  const kette = document.getElementById('entwurf-label-kette');
  if (kette) kette.textContent = labelKette(entwurf) || 'noch keine';
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

/* ----------------------------------------------- Verdrahtung des Studios */

/**
 * Quelle, Ausschnitt, Auslöser, Tastatur und eingefügte Bilder. Aufgerufen
 * wird sie nicht hier, sondern am Ende von `eingang.js` – zusammen mit
 * `verdrahteEingang()` und an genau der Stelle, an der bis 1.53.0 die eine
 * gemeinsame Verdrahtung stand. So bleibt die Reihenfolge beim Start
 * dieselbe, obwohl der Text in zwei Dateien liegt.
 */
function verdrahteAufnahme() {
  baueFormular();
  zeichneProjekte();
  $('#projekt-wahl').addEventListener('change', (e) => setzeProjektwahl(e.target.value));
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
