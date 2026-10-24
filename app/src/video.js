/* =========================================================================
   Video – aus einem Bildschirmvideo werden Bilder fürs Handbuch.

   Ein Video mit dem Snipping Tool aufgenommen zeigt eine Folge von Masken.
   Für ein Handbuch gebraucht werden daraus Einzelbilder – und zwar die,
   an denen sich etwas geändert hat, nicht alle 1 800 Bilder einer Minute.

   Was diese Seite *nicht* kann, steht ausdrücklich da: ein Video abholen.
   Sie darf nichts aus dem Netz laden (Inhaltsrichtlinie des Artifacts), und
   Clipchamp gibt seine Projekte nur über den eigenen Export heraus. Der Weg
   ist: dort als MP4 exportieren, die Datei hier ablegen. Danach geschieht
   alles im Browser – die Datei verlässt ihn nicht.

   Gedeutet wird der Inhalt wie im Register OCR über die Fähigkeit `sample`:
   je Bild ein Satz, was der Benutzer dort tut. Das ist eine Deutung, keine
   Messung – sie steht in einem Feld, in dem sie sich ändern lässt.
   ========================================================================= */

let videoDatei = null; // { name, groesse, dauer, breite, hoehe }
let videoAdresse = ''; // Objekt-URL des Spielers
let videoBilder = []; // { id, zeit, vorschau, voll, breite, hoehe, text, titel, stelle, gewaehlt }
let videoNummer = 0;
let videoLaeuft = false;
let videoAbbruch = null;
let videoStelle = '';
let videoLabels = {};
let videoClaude = null;
let videoGeprueft = false;
let videoBilderMoeglich = null;
let videoUebernahmeGezeigt = false; // einmal aufklappen, dann nicht mehr dreinreden
let videoLaeufe = []; // die Durchgänge dieses Films - V1, V2, V3
let videoVorgehen = null; // Aufforderung, Stufe, Startregler; erst in zeichneVideo gelesen

const VIDEO_FELDER = ['sprache', 'rolle_label', 'sparte', 'markt', 'version', 'land'];

/* ------------------------------------------ Vorgehen und Durchgänge (1.59.0) */

/** Gelesen wird erst beim Zeichnen - `heute` und Freunde stehen davor nicht. */
function holeVorgehen() {
  if (!videoVorgehen) {
    try {
      videoVorgehen = leseVorgehen(localStorage.getItem(VORGEHEN_SCHLUESSEL));
    } catch (fehler) {
      videoVorgehen = leseVorgehen(null);
    }
  }
  return videoVorgehen;
}

function sichereVorgehen() {
  try {
    localStorage.setItem(VORGEHEN_SCHLUESSEL, schreibeVorgehen(videoVorgehen));
    return true;
  } catch (fehler) {
    return false;
  }
}

/** Einen Durchgang festhalten und sichtbar machen. */
function haltLaufFest(art, einstellungen, ergebnis) {
  videoLaeufe = [...videoLaeufe, videoLauf(videoLaeufe.length + 1, art, einstellungen, ergebnis)];
  zeichneLaeufe();
}

function zeichneLaeufe() {
  const band = $('#video-laeufe');
  if (!band) return;
  band.hidden = !videoLaeufe.length;
  if (videoLaeufe.length && !band.open) band.open = true;
  $('#video-laeufe-stand').textContent = videoLaeufe.length
    ? `${videoLaeufe.length} ${videoLaeufe.length === 1 ? 'Durchgang' : 'Durchgänge'}`
    : '';

  $('#video-lauf-liste').replaceChildren(
    ...videoLaeufe.map((lauf, i) => {
      const diagnose = laufDiagnose(lauf);
      const vergleich = laufVergleich(lauf, videoLaeufe[i - 1] || null);
      const teile = [
        el('div', { klasse: 'lauf-kopf' }, [
          el('span', { klasse: 'lauf-marke', text: 'V' + lauf.nummer }),
          el('span', { klasse: 'lauf-text', text: laufText(lauf) }),
          lauf.art === 'abtastung'
            ? el('button', {
                type: 'button',
                klasse: 'knopf knopf--klein',
                text: 'Einstellungen übernehmen',
                onclick: () => {
                  $('#video-dichte').value = String(lauf.einstellungen.anzahl);
                  $('#video-schwelle').value = String(lauf.einstellungen.anteil);
                  $('#video-hoechstens').value = String(lauf.einstellungen.hoechstens);
                  meldeVideo(`Die Regler von V${lauf.nummer} stehen wieder – „Bilder automatisch herausnehmen" läuft damit.`, 'neutral');
                }
              })
            : null
        ].filter(Boolean)),
        el('p', { klasse: 'lauf-ergebnis', text: `${lauf.ergebnis.zahl || 0} ${lauf.art === 'deutung' ? 'gedeutet' : 'Bilder'}` })
      ];
      if (vergleich) teile.push(el('p', { klasse: 'lauf-vergleich', text: 'Geändert: ' + vergleich }));
      teile.push(el('p', { klasse: 'lauf-diagnose' + (diagnose.ok ? '' : ' lauf-diagnose--offen'), text: diagnose.text }));
      return el('li', { klasse: 'lauf' }, teile);
    })
  );
}

function zeichneVorgehen() {
  const vorgehen = holeVorgehen();
  const feld = $('#vorgehen-aufforderung');
  if (feld && feld !== document.activeElement) feld.value = vorgehen.aufforderung;
  if (feld && !feld.placeholder) feld.placeholder = 'leer = die eingebaute Aufforderung';
  const stufe = $('#vorgehen-stufe');
  if (stufe && !stufe.options.length) {
    stufe.replaceChildren(
      ...MODELLSTUFEN.map((m) => el('option', { value: m.id, text: `${m.label} – ${m.erklaerung}` }))
    );
  }
  if (stufe) stufe.value = vorgehen.stufe;
  const stand = $('#video-vorgehen-stand');
  if (stand) {
    const eigene = String(vorgehen.aufforderung || '').trim();
    stand.textContent = eigene ? 'eigene Aufforderung' : 'eingebaute Aufforderung';
  }
  const vorlage = $('#vorgehen-vorlage-text');
  if (vorlage && !vorlage.textContent) vorlage.textContent = videoAufforderung({}, { titel: 'Beispiel.mp4', stelle: '7.5.1', nummer: 2, von: 5 });
}

/** Was dieser Browser abspielt - gefragt wird er, nicht geraten. */
function videoKann() {
  const probe = document.createElement('video');
  return {
    mp4: Boolean(probe.canPlayType && probe.canPlayType('video/mp4; codecs="avc1.42E01E"')),
    webm: Boolean(probe.canPlayType && probe.canPlayType('video/webm; codecs="vp9"'))
  };
}

function meldeVideo(text, art = 'neutral') {
  const zeile = $('#video-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

const videoGewaehlte = () => videoBilder.filter((b) => b.gewaehlt);

/* ----------------------------------------------------------- Datei lesen */

/**
 * Ein Video in den Spieler. Gelesen wird über eine Objekt-Adresse – eine
 * Datenadresse wäre bei 40 MB Film nicht zu machen. Scheitert das Abspielen,
 * liegt es am Format: der Browser spielt nur, was er kennt.
 */
async function nimmVideo(datei) {
  if (!datei) return;
  if (!istVideo(datei.name) && !String(datei.type || '').startsWith('video/')) {
    meldeVideo(`${datei.name} sieht nicht nach einem Video aus. Erwartet werden ${VIDEO_FORMATE.join(', ').toUpperCase()}.`, 'warnung');
    return;
  }
  verwirfVideo(false);
  const spieler = $('#video-spieler');
  videoAdresse = URL.createObjectURL(datei);
  spieler.src = videoAdresse;
  spieler.hidden = false;
  $('#video-leer').hidden = true;
  meldeVideo(`${datei.name} wird geöffnet …`, 'neutral');

  try {
    await new Promise((fertig, scheitern) => {
      const gut = () => {
        spieler.removeEventListener('error', schlecht);
        fertig();
      };
      const schlecht = () => {
        spieler.removeEventListener('loadedmetadata', gut);
        scheitern(new Error('Dieser Browser spielt dieses Format nicht ab.'));
      };
      spieler.addEventListener('loadedmetadata', gut, { once: true });
      spieler.addEventListener('error', schlecht, { once: true });
    });
  } catch (fehler) {
    verwirfVideo(true);
    // Woran es liegt, weiß der Browser selbst - also wird er gefragt, statt
    // zu raten. „MP4 exportieren" wäre hier der falsche Rat.
    meldeVideo(`${datei.name} lässt sich hier nicht abspielen. ${videoFormatBericht(videoKann()).text}`, 'warnung');
    return;
  }

  videoDatei = {
    name: datei.name,
    groesse: datei.size || 0,
    dauer: spieler.duration || 0,
    breite: spieler.videoWidth || 0,
    hoehe: spieler.videoHeight || 0
  };
  meldeVideo(
    `${datei.name} · ${zeitText(videoDatei.dauer)} · ${videoDatei.breite} × ${videoDatei.hoehe} px · ` +
      `${formatiereBytes(videoDatei.groesse)}. Die Datei bleibt im Browser.`,
    'gut'
  );
  zeichneVideo();
}

/** Spieler leeren und die Objekt-Adresse freigeben – sonst bleibt sie liegen. */
function verwirfVideo(auchBilder = true) {
  const spieler = $('#video-spieler');
  if (videoAdresse) {
    URL.revokeObjectURL(videoAdresse);
    videoAdresse = '';
  }
  spieler.removeAttribute('src');
  spieler.load();
  spieler.hidden = true;
  $('#video-leer').hidden = false;
  videoDatei = null;
  if (auchBilder) {
    videoBilder = [];
    videoNummer = 0;
    // Durchgänge gehören zu einem Film, nicht zum Register.
    videoLaeufe = [];
  }
  zeichneVideo();
}

/* ------------------------------------------------------- Bilder entnehmen */

/** Den Spieler an eine Stelle setzen und warten, bis das Bild dort steht. */
function springe(spieler, zeit) {
  return new Promise((fertig) => {
    const fertigMelden = () => fertig();
    spieler.addEventListener('seeked', fertigMelden, { once: true });
    spieler.currentTime = Math.max(0, Math.min(zeit, (spieler.duration || 0) - 0.01));
    // Steht der Spieler schon genau dort, kommt kein Ereignis mehr.
    setTimeout(() => {
      spieler.removeEventListener('seeked', fertigMelden);
      fertig();
    }, 2000);
  });
}

/** Das Bild an der jetzigen Stelle auf eine Leinwand – in voller Auflösung. */
function bildJetzt(spieler) {
  const leinwand = document.createElement('canvas');
  leinwand.width = spieler.videoWidth;
  leinwand.height = spieler.videoHeight;
  leinwand.getContext('2d').drawImage(spieler, 0, 0, leinwand.width, leinwand.height);
  return leinwand;
}

/** Eine kleine Fassung zum Vergleichen – 24 × 16 Kacheln brauchen nicht mehr. */
function vergleichsPunkte(leinwand, zeit) {
  const klein = document.createElement('canvas');
  klein.width = 192;
  klein.height = Math.max(1, Math.round((leinwand.height / leinwand.width) * 192));
  const stift = klein.getContext('2d');
  stift.drawImage(leinwand, 0, 0, klein.width, klein.height);
  const daten = stift.getImageData(0, 0, klein.width, klein.height);
  return { zeit, daten: daten.data, breite: klein.width, hoehe: klein.height };
}

function legeBildAb(leinwand, zeit, grund = '') {
  videoNummer += 1;
  const eintrag = {
    id: 'VID-' + String(videoNummer).padStart(3, '0'),
    zeit,
    grund,
    vorschau: baueVorschau(leinwand),
    voll: leinwand.toDataURL('image/png'),
    breite: leinwand.width,
    hoehe: leinwand.height,
    titel: '',
    text: '',
    stelle: '',
    gewaehlt: true,
    uebernommen: ''
  };
  videoBilder = [...videoBilder, eintrag].sort((a, b) => a.zeit - b.zeit);
  return eintrag;
}

/** Das Bild an der Stelle, an der der Spieler gerade steht. */
async function nimmBildHier() {
  const spieler = $('#video-spieler');
  if (!videoDatei || !spieler.videoWidth) return;
  const zeit = Number(spieler.currentTime.toFixed(3));
  if (videoBilder.some((b) => Math.abs(b.zeit - zeit) < 0.05)) {
    meldeVideo(`Bei ${zeitText(zeit)} liegt schon ein Bild.`, 'warnung');
    return;
  }
  legeBildAb(bildJetzt(spieler), zeit, 'von Hand');
  zeichneVideo();
  meldeVideo(`Bild bei ${zeitText(zeit)} herausgenommen.`, 'gut');
}

/**
 * Das Video abtasten und behalten, was sich geändert hat. Gerechnet wird an
 * einer kleinen Fassung (192 px breit) – das reicht für 24 × 16 Kacheln und
 * geht schnell genug, um nicht die Ansicht anzuhalten.
 */
async function nimmBilderAutomatisch() {
  const spieler = $('#video-spieler');
  if (!videoDatei || videoLaeuft) return;
  videoLaeuft = true;
  videoAbbruch = false;
  setzeVideoknoepfe();

  const anzahl = Number($('#video-dichte').value) || 24;
  const anteil = Number($('#video-schwelle').value) || 0.02;
  const hoechstens = Number($('#video-hoechstens').value) || 0;
  const schritte = videoSchritte(videoDatei.dauer, anzahl);
  const lief = !spieler.paused;
  spieler.pause();

  const abgetastet = [];
  const leinwaende = new Map();
  for (let i = 0; i < schritte.length; i++) {
    if (videoAbbruch) break;
    meldeVideo(`Wird abgetastet … Stelle ${i + 1} von ${schritte.length} (${zeitText(schritte[i])})`, 'neutral');
    await springe(spieler, schritte[i]);
    const leinwand = bildJetzt(spieler);
    leinwaende.set(schritte[i], leinwand);
    abgetastet.push(vergleichsPunkte(leinwand, schritte[i]));
  }

  const gewaehlt = videoAbbruch ? [] : videoWahl(abgetastet, { anteil, hoechstens });
  let neu = 0;
  for (const treffer of gewaehlt) {
    if (videoBilder.some((b) => Math.abs(b.zeit - treffer.zeit) < 0.05)) continue;
    legeBildAb(leinwaende.get(treffer.zeit), treffer.zeit, treffer.grund);
    neu += 1;
  }

  videoLaeuft = false;
  videoAbbruch = false;
  if (lief) spieler.play().catch(() => {});
  // Der Durchgang wird festgehalten, bevor gemeldet wird: auch ein Lauf, der
  // nichts brachte, ist eine Auskunft - er sagt, was diese Regler hergeben.
  if (!videoAbbruch) {
    haltLaufFest('abtastung', { anzahl, anteil, hoechstens }, { zahl: neu, gefunden: gewaehlt.length, stellen: schritte.length });
  }
  zeichneVideo();
  if (!neu) {
    meldeVideo(
      `${schritte.length} Stellen abgetastet, nichts Neues gefunden – entweder ändert sich wenig, ` +
        'oder die Schwelle ist zu hoch. Feiner abtasten oder die Schwelle senken.',
      'warnung'
    );
  } else {
    meldeVideo(
      `${neu} Bild${neu === 1 ? '' : 'er'} aus ${schritte.length} abgetasteten Stellen – ` +
        'behalten wurde, was sich vom vorigen unterscheidet.',
      'gut'
    );
  }
}

/* ------------------------------------------------------------- Deuten */

async function holeVideoClaude() {
  if (videoGeprueft) return videoClaude;
  videoGeprueft = true;
  videoClaude = await holeFaehigkeit('sample');
  if (videoClaude && videoClaude.limits) {
    const grenzen = await videoClaude.limits().catch(() => null);
    videoBilderMoeglich = Boolean(grenzen && grenzen.images);
  } else {
    videoBilderMoeglich = Boolean(videoClaude);
  }
  return videoClaude;
}

/** Ein Bild als Blob – so nimmt `sample` es mit. */
async function alsBlob(datenadresse) {
  const antwort = await fetch(datenadresse);
  return antwort.blob();
}

async function deuteBilder() {
  if (videoLaeuft) return;
  const offen = videoGewaehlte();
  if (!offen.length) {
    meldeVideo('Es ist kein Bild gewählt.', 'warnung');
    return;
  }
  const claude = await holeVideoClaude();
  if (!claude) {
    meldeVideo(
      'Diese Ansicht darf Claude nicht fragen – ohne diese Fähigkeit bleibt das Feld „Text" zum Eintragen von Hand.',
      'warnung'
    );
    return;
  }
  if (videoBilderMoeglich === false) {
    meldeVideo('Claude darf hier keine Bilder sehen – das Deuten entfällt. Die Felder bleiben zum Eintragen von Hand.', 'warnung');
    return;
  }

  videoLaeuft = true;
  videoAbbruch = new AbortController();
  setzeVideoknoepfe();
  let fertig = 0;
  let gescheitert = 0;

  for (const bild of offen) {
    if (videoAbbruch.signal.aborted) break;
    try {
      meldeVideo(`Bild bei ${zeitText(bild.zeit)} wird gedeutet … (${fertig + 1} von ${offen.length})`, 'neutral');
      // Eine eigene Aufforderung ersetzt die eingebaute vollstaendig - wer
      // sie schreibt, bestimmt, *wonach* gefragt wird.
      const eigene = String(holeVorgehen().aufforderung || '').trim();
      const antwort = await claude(
        eigene ||
          videoAufforderung(bild, {
            titel: videoDatei ? videoDatei.name : '',
            stelle: bild.stelle || videoStelle,
            nummer: fertig + 1,
            von: offen.length
          }),
        { images: await alsBlob(bild.voll), modelTier: holeVorgehen().stufe || 'default', signal: videoAbbruch.signal }
      );
      const text = videoText(antwort && antwort.text);
      if (text) {
        bild.text = text;
        fertig += 1;
        zeichneVideo();
      }
    } catch (fehler) {
      const code = (fehler && fehler.code) || '';
      if (code === 'cancelled') break;
      gescheitert += 1;
      if (code === 'not_granted') {
        meldeVideo('Das Deuten wurde nicht erlaubt. Die Felder bleiben zum Eintragen von Hand.', 'warnung');
        break;
      }
      if (code === 'rate_limited') {
        meldeVideo('Zu viele Anfragen in kurzer Zeit – später noch einmal, oder weniger Bilder auf einmal.', 'warnung');
        break;
      }
    }
  }

  videoLaeuft = false;
  videoAbbruch = null;
  haltLaufFest(
    'deutung',
    { stufe: holeVorgehen().stufe, eigene: Boolean(String(holeVorgehen().aufforderung || '').trim()) },
    { zahl: fertig, gescheitert, gesendet: offen.length }
  );
  zeichneVideo();
  if (fertig) {
    meldeVideo(
      `${fertig} Bild${fertig === 1 ? '' : 'er'} gedeutet` +
        (gescheitert ? `, ${gescheitert} nicht` : '') +
        '. Der Text ist eine Deutung – er lässt sich in jedem Feld ändern.',
      gescheitert ? 'warnung' : 'gut'
    );
  }
}

/* --------------------------------------------------------- Übernehmen */

async function uebernimmVideobilder({ alsStrecke = false } = {}) {
  const gewaehlte = videoGewaehlte().filter((b) => !b.uebernommen);
  if (!gewaehlte.length) {
    meldeVideo('Es ist kein Bild gewählt, das noch nicht im Eingang liegt.', 'warnung');
    return;
  }
  videoLaeuft = true;
  setzeVideoknoepfe();
  const fehler = [];
  let gelungen = 0;

  for (const bild of gewaehlte) {
    try {
      const geladen = await ladeBild(bild.voll, 'datei', bild.id);
      const leinwand = document.createElement('canvas');
      leinwand.width = geladen.breite;
      leinwand.height = geladen.hoehe;
      leinwand.getContext('2d').drawImage(geladen.element, 0, 0);
      const kennung = naechsteAufnahmeKennung(eingang, heute());
      const stelle = bild.stelle || videoStelle;
      const aufnahme = baueAufnahme({
        entwurf: {
          titel: bild.titel || videoBildname(videoDatei ? videoDatei.name : 'video', bild.zeit, videoBilder.indexOf(bild) + 1),
          projekt: entwurf.projekt,
          seite: zeitText(bild.zeit),
          kategorie: entwurf.kategorie,
          status: 'in Prüfung',
          rolle: 'einzeln',
          browser: '',
          autor: entwurf.autor,
          datum: heute(),
          begriffe: ['video'],
          notiz: bild.text,
          ...Object.fromEntries(VIDEO_FELDER.map((f) => [f, videoLabels[f] || '']))
        },
        bild: baueVorschau(leinwand),
        ausschnitt: { x: 0, y: 0, breite: geladen.breite, hoehe: geladen.hoehe },
        quelle: { art: 'datei', name: videoDatei ? videoDatei.name : 'Video', breite: geladen.breite, hoehe: geladen.hoehe },
        kennung,
        erfasstAm: new Date().toISOString()
      });
      if (stelle) aufnahme.gliederung = stelle;
      // Woher das Bild stammt, bleibt an der Aufnahme: Datei und Zeitpunkt.
      aufnahme.einfuhr = {
        datei: videoDatei ? videoDatei.name : 'Video',
        art: 'video',
        bild: bild.id,
        sekunde: bild.zeit,
        uebernommen_am: new Date().toISOString()
      };
      eingang = [aufnahme, ...eingang];
      const ergebnis = sichereEingang();
      if (!ergebnis.ok && ergebnis.voll) {
        eingang = eingang.filter((a) => a.id !== kennung);
        fehler.push(ergebnis.text);
        break;
      }
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
      fehler.push(`${zeitText(bild.zeit)}: ${f && f.message ? f.message : 'nicht übernommen'}`);
    }
  }

  // Die Strecke entsteht erst, wenn die Bilder im Eingang liegen - sie
  // verweist auf deren Kennungen, nicht auf die Bilder selbst.
  let strecke = null;
  if (alsStrecke && gelungen) {
    strecke = streckeAusVideo(gewaehlte, streckenNameAusVideo(videoDatei ? videoDatei.name : ''));
    strecken = [strecke, ...strecken];
    streckeOffen = strecke.id;
    sichereStrecken();
    zeichneStrecke();
  }

  videoLaeuft = false;
  zeichneVideo();
  zeichneEingang();
  zeigeAnsicht();
  if (fehler.length) {
    meldeVideo(`${gelungen} übernommen, ${fehler.length} nicht: ${fehler.join(' · ')}`, 'warnung');
    return;
  }
  if (strecke) {
    const ohneText = strecke.schritte.filter((s) => !s.text).length;
    meldeVideo(
      `${gelungen} Bild${gelungen === 1 ? '' : 'er'} im Eingang, dazu die Strecke „${strecke.name}" ` +
        `mit ${strecke.schritte.length} Schritt${strecke.schritte.length === 1 ? '' : 'en'}` +
        (ohneText ? ` – ${ohneText} davon ohne Anweisung, die stehen in der Strecke zum Eintragen.` : '.'),
      'gut'
    );
    return;
  }
  meldeVideo(`${gelungen} Bild${gelungen === 1 ? '' : 'er'} liegen im Eingang.`, 'gut');
}

/* ------------------------------------------------------------- Zeichnen */

function setzeVideoknoepfe() {
  const hat = Boolean(videoDatei);
  const offen = videoGewaehlte().filter((b) => !b.uebernommen).length;
  $('#video-automatisch').disabled = !hat || videoLaeuft;
  $('#video-hier').disabled = !hat || videoLaeuft;
  $('#video-deuten').disabled = !videoGewaehlte().length || videoLaeuft;
  $('#video-anhalten').hidden = !videoLaeuft;
  $('#video-uebernehmen').disabled = !offen || videoLaeuft;
  $('#video-strecke').disabled = !offen || videoLaeuft;
  $('#video-verwerfen').disabled = !videoBilder.length || videoLaeuft;
  $('#video-stand').textContent = videoStand(videoBilder, videoDatei ? videoDatei.dauer : 0);
  const stand = $('#video-uebernahme-stand');
  if (stand) {
    stand.textContent = offen
      ? `${offen} gewählt · ${videoGewaehlte().filter((b) => b.stelle || videoStelle).length} mit Stelle`
      : 'nichts gewählt';
  }
}

/** Eine Karte je Bild: Vorschau, Zeit, Titel, gedeuteter Text, Stelle. */
function videoKarte(bild) {
  const kasten = el('figure', {
    klasse: 'video-figur' + (bild.gewaehlt ? ' video-figur--gewaehlt' : '') + (bild.uebernommen ? ' video-figur--fertig' : ''),
    'data-bild': bild.id
  });
  const haken = el('input', { type: 'checkbox', id: 'video-wahl-' + bild.id, checked: bild.gewaehlt });
  haken.addEventListener('change', (e) => {
    bild.gewaehlt = e.target.checked;
    kasten.classList.toggle('video-figur--gewaehlt', bild.gewaehlt);
    setzeVideoknoepfe();
  });

  const teile = [
    el('div', { klasse: 'video-figur-kopf' }, [
      haken,
      el('label', { for: 'video-wahl-' + bild.id, text: zeitText(bild.zeit) }),
      el('button', {
        type: 'button',
        klasse: 'knopf knopf--klein',
        text: 'Anspringen',
        onclick: () => {
          const spieler = $('#video-spieler');
          if (spieler && videoDatei) spieler.currentTime = bild.zeit;
        }
      })
    ]),
    el('img', { src: bild.vorschau, alt: `Bild bei ${zeitText(bild.zeit)}`, loading: 'lazy' }),
    el('figcaption', { text: `${bild.breite} × ${bild.hoehe} px${bild.grund ? ' · ' + bild.grund : ''}` }),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'video-titel-' + bild.id, text: 'Titel' }),
      el('input', {
        type: 'text',
        id: 'video-titel-' + bild.id,
        value: bild.titel,
        placeholder: videoBildname(videoDatei ? videoDatei.name : 'video', bild.zeit, videoBilder.indexOf(bild) + 1),
        oninput: (e) => (bild.titel = e.target.value)
      })
    ]),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'video-text-' + bild.id, text: 'Text (wird zum Rezept)' }),
      el('textarea', {
        id: 'video-text-' + bild.id,
        rows: '3',
        value: bild.text,
        placeholder: 'Was der Benutzer hier tut – oder „Text deuten lassen"',
        oninput: (e) => (bild.text = e.target.value)
      })
    ]),
    el('div', { klasse: 'feld' }, [
      el('label', { for: 'video-stelle-' + bild.id, text: 'Stelle' }),
      el('input', {
        type: 'text',
        id: 'video-stelle-' + bild.id,
        list: 'gliederung-vorschlaege',
        autocomplete: 'off',
        value: bild.stelle,
        placeholder: videoStelle || 'wie oben',
        oninput: (e) => {
          const roh = String(e.target.value || '').trim();
          bild.stelle = (roh.match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0];
          fuelleStellenvorschlaege(roh);
          setzeVideoknoepfe();
        }
      })
    ]),
    bild.uebernommen
      ? el('p', { klasse: 'feld-hinweis import-fertig' }, [
          el('span', { text: `übernommen als ${bild.uebernommen}` }),
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'Im Editor öffnen',
            onclick: () => oeffneEditor(bild.uebernommen)
          })
        ])
      : null
  ];
  kasten.append(...teile.filter(Boolean));
  return kasten;
}

/** Die Labelfelder des Durchgangs – dieselbe Art wie im Stapel des Imports. */
function zeichneVideoLabels() {
  const kasten = $('#video-labels');
  if (!kasten) return;
  kasten.replaceChildren(
    ...VIDEO_FELDER.map((kennung) => {
      const feld = LABEL_FELDER.find((f) => f.id === kennung);
      const id = 'video-label-' + feld.id;
      const aendere = (wert) => {
        videoLabels = { ...videoLabels, [feld.id]: wert };
      };
      const eingabe = feld.frei
        ? el('input', {
            type: 'text',
            id,
            value: videoLabels[feld.id] || '',
            list: 'video-vorschlag-' + feld.id,
            placeholder: 'für alle gleich',
            oninput: (e) => aendere(e.target.value)
          })
        : el('select', { id, onchange: (e) => aendere(e.target.value) }, [
            el('option', { value: '', text: 'ohne' }),
            ...feld.werte.map((w) =>
              el('option', {
                value: w.id,
                text: w.lang ? `${w.label} – ${w.lang}` : w.label,
                selected: w.id === videoLabels[feld.id]
              })
            )
          ]);
      const kinder = [el('label', { for: id, text: feld.label }), eingabe];
      if (feld.frei) {
        kinder.push(
          el(
            'datalist',
            { id: 'video-vorschlag-' + feld.id },
            labelVorschlaege(eingang, feld.id).slice(0, 40).map((w) => el('option', { value: w }))
          )
        );
      }
      return el('div', { klasse: 'feld label-feld' }, kinder);
    })
  );
}

function zeichneVideo() {
  if (!document.getElementById('video-ansicht')) return;
  const formate = $('#video-formate');
  if (formate && !formate.textContent) {
    const bericht = videoFormatBericht(videoKann());
    formate.textContent = bericht.text;
    formate.className = 'feld-hinweis' + (bericht.ok ? '' : ' studio-meldung--warnung');
  }
  $('#video-leiste').hidden = !videoDatei;
  const uebernahme = $('#video-uebernahme');
  uebernahme.hidden = !videoBilder.length;
  // Beim ersten Bild einmal aufklappen: dort stehen Stelle, Labels und der
  // Knopf zum Übernehmen - zugeklappt sähe es aus, als ginge es nicht weiter.
  if (videoBilder.length && !videoUebernahmeGezeigt) {
    uebernahme.open = true;
    videoUebernahmeGezeigt = true;
  }
  if (!videoBilder.length) videoUebernahmeGezeigt = false;
  $('#video-stelle').value = videoStelle;
  const thema = $('#video-stelle-thema');
  if (thema) {
    thema.textContent = videoStelle
      ? gliederungKennung(GLIEDERUNG, videoStelle)
      : 'ohne Stelle – die Bilder stehen dann nur im Eingang';
  }
  const liste = $('#video-bilder');
  if (!videoBilder.length) {
    liste.replaceChildren(
      el('p', {
        klasse: 'band-hinweis',
        text: videoDatei
          ? 'Noch kein Bild. „Bilder automatisch herausnehmen“ tastet das Video ab und behält, was sich geändert hat – oder im Spieler an eine Stelle gehen und „Bild an dieser Stelle“ drücken.'
          : 'Noch kein Video gewählt.'
      })
    );
  } else {
    liste.replaceChildren(...videoBilder.map(videoKarte));
  }
  zeichneVideoLabels();
  zeichneLaeufe();
  zeichneVorgehen();
  setzeVideoknoepfe();
}

/* ------------------------------------------------------------ Verdrahten */

function verdrahteVideo() {
  if (!document.getElementById('video-ansicht')) return;
  const eingabe = $('#video-eingabe');
  $('#video-waehlen').addEventListener('click', () => eingabe.click());
  eingabe.addEventListener('change', async (e) => {
    const datei = (e.target.files || [])[0];
    e.target.value = '';
    await nimmVideo(datei);
  });

  const flaeche = $('#video-flaeche');
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
    const dateien = e.dataTransfer && e.dataTransfer.files ? [...e.dataTransfer.files] : [];
    await nimmVideo(dateien[0]);
  });

  $('#video-automatisch').addEventListener('click', nimmBilderAutomatisch);
  $('#video-hier').addEventListener('click', nimmBildHier);
  $('#video-deuten').addEventListener('click', deuteBilder);
  $('#video-anhalten').addEventListener('click', () => {
    if (videoAbbruch && videoAbbruch.abort) videoAbbruch.abort();
    else videoAbbruch = true;
    meldeVideo('Wird angehalten …', 'neutral');
  });

  $('#video-stelle').addEventListener('input', (e) => {
    const roh = String(e.target.value || '').trim();
    videoStelle = (roh.match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0];
    fuelleStellenvorschlaege(roh);
    const thema = $('#video-stelle-thema');
    if (thema) {
      thema.textContent = videoStelle
        ? gliederungKennung(GLIEDERUNG, videoStelle)
        : 'ohne Stelle – die Bilder stehen dann nur im Eingang';
    }
    setzeVideoknoepfe();
  });

  $('#video-alle').addEventListener('click', () => {
    for (const bild of videoBilder) if (!bild.uebernommen) bild.gewaehlt = true;
    zeichneVideo();
  });
  $('#video-keine').addEventListener('click', () => {
    for (const bild of videoBilder) bild.gewaehlt = false;
    zeichneVideo();
  });
  $('#video-fortlaufend').addEventListener('click', () => {
    const gewaehlte = videoGewaehlte();
    if (!gewaehlte.length) return meldeVideo('Es ist kein Bild gewählt.', 'warnung');
    if (!videoStelle) return meldeVideo('Oben fehlt die Stelle, ab der gezählt wird.', 'warnung');
    const stellen = folgendeStellen(GLIEDERUNG, videoStelle, gewaehlte.length);
    if (!stellen.length) return meldeVideo(`${videoStelle} steht nicht in der Gliederung.`, 'warnung');
    gewaehlte.forEach((bild, i) => (bild.stelle = stellen[i] || ''));
    zeichneVideo();
    meldeVideo(`${stellen.length} Stelle(n) vergeben: ${stellen[0]} bis ${stellen[stellen.length - 1]}.`, 'gut');
  });
  $('#video-aus-text').addEventListener('click', () => {
    const gewaehlte = videoGewaehlte();
    if (!gewaehlte.length) return meldeVideo('Es ist kein Bild gewählt.', 'warnung');
    let getroffen = 0;
    for (const bild of gewaehlte) {
      const stelle = stelleAusText(GLIEDERUNG, [bild.titel, bild.text].filter(Boolean).join(' '));
      if (stelle) {
        bild.stelle = stelle;
        getroffen += 1;
      }
    }
    zeichneVideo();
    meldeVideo(
      `${getroffen} von ${gewaehlte.length} Bild(ern) eine Stelle zugeordnet.` +
        (getroffen < gewaehlte.length ? ' Der Rest blieb leer – der Text gab sie nicht her.' : ''),
      getroffen ? 'gut' : 'warnung'
    );
  });

  $('#vorgehen-aufforderung').addEventListener('input', (e) => {
    videoVorgehen = { ...holeVorgehen(), aufforderung: e.target.value };
    zeichneVorgehen();
  });
  $('#vorgehen-stufe').addEventListener('change', (e) => {
    videoVorgehen = { ...holeVorgehen(), stufe: e.target.value };
  });
  $('#vorgehen-sichern').addEventListener('click', () => {
    const zeile = $('#vorgehen-meldung');
    const gut = sichereVorgehen();
    zeile.textContent = gut
      ? 'Das Vorgehen steht – beim nächsten Film gilt dasselbe.'
      : 'Der Speicher des Browsers nimmt nichts an; das Vorgehen gilt nur für diese Sitzung.';
    zeile.className = 'studio-meldung studio-meldung--' + (gut ? 'gut' : 'warnung');
  });
  $('#vorgehen-zurueck').addEventListener('click', () => {
    videoVorgehen = leseVorgehen(null);
    sichereVorgehen();
    zeichneVorgehen();
    $('#vorgehen-meldung').textContent = 'Die eingebaute Aufforderung gilt wieder.';
    $('#vorgehen-meldung').className = 'studio-meldung studio-meldung--neutral';
  });

  $('#video-laeufe-sichern').addEventListener('click', async () => {
    const name = `video-durchgaenge-${heute()}.txt`;
    const ergebnis = await uebergebeDatei(name, laeufeText(videoLaeufe, videoDatei ? videoDatei.name : ''));
    meldeVideo(
      ergebnis.art === 'gesichert' ? `${name} gesichert.` : 'Diese Ansicht darf keine Datei ablegen – die Durchgänge stehen oben.',
      ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
    );
  });
  $('#video-laeufe-leeren').addEventListener('click', () => {
    videoLaeufe = [];
    zeichneLaeufe();
    meldeVideo('Die Durchgänge sind verworfen. Die Bilder bleiben.', 'neutral');
  });

  $('#video-uebernehmen').addEventListener('click', () => uebernimmVideobilder());
  $('#video-strecke').addEventListener('click', () => uebernimmVideobilder({ alsStrecke: true }));
  $('#video-verwerfen').addEventListener('click', () => {
    videoBilder = [];
    videoNummer = 0;
    zeichneVideo();
    meldeVideo('Die Bilder sind verworfen. Die übernommenen bleiben im Eingang.', 'neutral');
  });

  // Die Objekt-Adresse freigeben, wenn die Seite geht.
  window.addEventListener('pagehide', () => {
    if (videoAdresse) URL.revokeObjectURL(videoAdresse);
  });
}

verdrahteVideo();
