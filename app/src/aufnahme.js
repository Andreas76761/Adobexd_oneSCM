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

/* ------------------------------------------------------------- Speicher */

function leseEingangAusSpeicher() {
  try {
    return leseEingang(localStorage.getItem(EINGANG_SCHLUESSEL));
  } catch (fehler) {
    return [];
  }
}

/** Schreibt den Eingang zurück. Bei vollem Speicher bleibt der alte Stand. */
function sichereEingang() {
  try {
    localStorage.setItem(EINGANG_SCHLUESSEL, schreibeEingang(eingang));
    return { ok: true };
  } catch (fehler) {
    return { ok: false, text: 'Der Browserspeicher ist voll. Bitte den Eingang sichern und Aufnahmen löschen.' };
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
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    meldeStudio(`Dieser Browser kennt die Bildschirmfreigabe nicht. ${AUSWEG}`, 'warnung');
    return;
  }
  if (freigabeErlaubt() === false) {
    meldeStudio(
      `Diese eingebettete Ansicht darf den Bildschirm nicht freigeben – das entscheidet die Vorschau, nicht die Seite. ${AUSWEG}`,
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
    strom.getVideoTracks()[0].addEventListener('ended', () => {
      if (quelle && quelle.art === 'bildschirm') {
        quelle = null;
        zeichnePreview();
        zeichneStudio();
        meldeStudio('Die Bildschirmfreigabe wurde beendet.', 'warnung');
      }
    });
    setzeQuelle({
      art: 'bildschirm',
      name: strom.getVideoTracks()[0].label || 'Bildschirm',
      breite: video.videoWidth,
      hoehe: video.videoHeight,
      element: video,
      strom
    });
    meldeStudio('Bildschirm freigegeben. Ausschnitt ziehen und mit der Leertaste aufnehmen.', 'gut');
  } catch (fehler) {
    const abgebrochen = fehler && fehler.name === 'NotAllowedError' && /denied by (the )?user|abort/i.test(fehler.message || '');
    meldeStudio(
      abgebrochen
        ? 'Die Bildschirmfreigabe wurde abgebrochen. Erneut versuchen – oder: ' + AUSWEG
        : `Die Bildschirmfreigabe ist in dieser Ansicht gesperrt. ${AUSWEG}`,
      'warnung'
    );
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

async function quelleZwischenablage() {
  // Der Hinweis kommt zuerst: das Lesen der Zwischenablage kann auf eine
  // Erlaubnis warten, die in einer eingebetteten Ansicht nie beantwortet wird.
  meldeStudio(`Jetzt ${EINFUEGE_TASTE} drücken – so gibt der Browser das Bild frei.`, 'neutral');
  $('#quelle-buehne').focus();
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
async function uebernimmBild(blob, art, name) {
  if (!blob || !String(blob.type || '').startsWith('image/')) {
    meldeStudio('Das ist kein Bild.', 'warnung');
    return false;
  }
  try {
    setzeQuelle(await ladeBild(await liesAlsDatenadresse(blob), art, name));
    meldeStudio(
      art === 'zwischenablage'
        ? 'Bild aus der Zwischenablage übernommen. Ausschnitt ziehen und mit der Leertaste aufnehmen.'
        : `„${name}“ geöffnet. Ausschnitt ziehen und mit der Leertaste aufnehmen.`,
      'gut'
    );
    return true;
  } catch (fehler) {
    meldeStudio('Das Bild konnte nicht gelesen werden.', 'warnung');
    return false;
  }
}

const quelleDatei = (datei) => (datei ? uebernimmBild(datei, 'datei', datei.name) : Promise.resolve(false));

async function quelleBeispiel(kennung) {
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

function schneideAus() {
  const hoechsteBreite = 1100;
  const massstab = Math.min(1, hoechsteBreite / ausschnitt.breite);
  const breite = Math.max(1, Math.round(ausschnitt.breite * massstab));
  const hoehe = Math.max(1, Math.round(ausschnitt.hoehe * massstab));
  const leinwand = document.createElement('canvas');
  leinwand.width = breite;
  leinwand.height = hoehe;
  const stift = leinwand.getContext('2d');
  stift.fillStyle = '#ffffff';
  stift.fillRect(0, 0, breite, hoehe);
  stift.drawImage(quelle.element, ausschnitt.x, ausschnitt.y, ausschnitt.breite, ausschnitt.hoehe, 0, 0, breite, hoehe);
  return leinwand.toDataURL('image/jpeg', 0.72);
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
    if (!ergebnis.ok) {
      eingang = eingang.filter((a) => a.id !== kennung);
      meldeStudio(ergebnis.text, 'warnung');
      return null;
    }
    entwurf.titel = '';
    fuelleFormular();
    blitze();
    meldeStudio(`${kennung} im Eingang gespeichert – Kategorie und Begriffe können dort nachgetragen werden.`, 'gut');
    zeigeAnsicht();
    zeichneStudio();
    return kennung;
  } catch (fehler) {
    meldeStudio('Die Aufnahme ist fehlgeschlagen: ' + (fehler && fehler.message ? fehler.message : 'unbekannter Grund'), 'warnung');
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
  $('#quelle-leer').hidden = hatQuelle;
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

/* ------------------------------------------------------- Eingangsdialog */

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
            return;
          }
          $('#eingang-dialog').close();
          zeichneEingang();
          meldeEingang(`${kennung} aktualisiert.`, 'gut');
        }
      }),
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
function zeigeErsatzausgabe(hinweis) {
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
      value: eingangAlsExport(sichtbareAufnahmen(), heute(), false)
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
  $('#datei-eingabe').addEventListener('change', (e) => quelleDatei(e.target.files[0]));
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
    quelleDatei(e.dataTransfer.files[0]);
  });

  for (const knopf of document.querySelectorAll('.preset button')) {
    knopf.addEventListener('click', () => {
      if (!quelle) return;
      const neu = presetAusschnitt(knopf.dataset.preset, quelle, VOKABULAR.viewports);
      if (neu) setzeAusschnitt(neu);
    });
  }

  $('#ausloesen').addEventListener('click', loeseAus);

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
starte();
