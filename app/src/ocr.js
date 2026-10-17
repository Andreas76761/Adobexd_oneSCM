/* =========================================================================
   OCR – den Text aus den Bildern holen.

   Die Seite liest nicht selbst: ein Texterkenner wäre ein fremdes Programm,
   und die Inhaltsrichtlinie des Artifacts lässt keines zu. Lesen kann Claude
   über die Fähigkeit `sample`, die Bilder mitnimmt (`images`). Die Seite
   schickt das Bild, sagt in der Aufforderung, was zu tun ist, und bewahrt
   die Antwort auf.

   Jedes gesendete Bild wird vom Vermittler auf rund 1,2 Megapixel
   verkleinert. Ein Bildschirmfoto in 1920 × 1080 liegt knapp darunter, ein
   Blatt aus dem Studio weit darüber - große Bilder werden darum in Kacheln
   zerlegt und Kachel für Kachel gelesen (`ocrKacheln` im Kern).

   Jede Lesung steht in einem Feld, in dem sie sich ändern lässt. Sie ist
   eine Lesung, keine Messung.
   ========================================================================= */

let ocrTexte = leseOcrAusSpeicher();
let ocrWahl = new Set(); // Kennungen der gewählten Bilder
let ocrLaeuft = false;
let ocrAbbruch = null; // AbortController des laufenden Laufs
let ocrClaude = null;
let ocrGeprueft = false;
let ocrBilderMoeglich = null; // null = noch nicht gefragt

function leseOcrAusSpeicher() {
  try {
    return leseOcr(localStorage.getItem(OCR_SCHLUESSEL));
  } catch (fehler) {
    return {};
  }
}

function sichereOcr() {
  try {
    localStorage.setItem(OCR_SCHLUESSEL, schreibeOcr(ocrTexte));
    return true;
  } catch (fehler) {
    meldeOcr('Der Speicher des Browsers ist voll – die Lesungen stehen nur in dieser Sitzung.', 'warnung');
    return false;
  }
}

function meldeOcr(text, art = 'neutral') {
  const zeile = $('#ocr-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/* ------------------------------------------------------------- Darstellung */

function zeichneOcrListe() {
  const kasten = $('#ocr-liste');
  const bilder = imProjekt();
  if (!bilder.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: 'Keine Aufnahme in der Arbeitsmenge. Erst aufnehmen oder im Kopf eine andere Arbeitsmenge wählen.'
      })
    );
    return;
  }
  kasten.replaceChildren(
    ...bilder.map((aufnahme) => {
      const gelesen = ocrTexte[aufnahme.id];
      const id = 'ocr-wahl-' + aufnahme.id;
      return el('div', { klasse: 'ocr-zeile' + (ocrWahl.has(aufnahme.id) ? ' ocr-zeile--gewaehlt' : '') }, [
        el('input', {
          type: 'checkbox',
          id,
          checked: ocrWahl.has(aufnahme.id),
          onchange: (e) => {
            if (e.target.checked) ocrWahl.add(aufnahme.id);
            else ocrWahl.delete(aufnahme.id);
            zeichneOcr();
          }
        }),
        el('label', { klasse: 'ocr-zeile-bild', for: id }, [
          el('img', { src: anzeigeBild(aufnahme), alt: aufnahme.titel, loading: 'lazy' })
        ]),
        el('div', { klasse: 'ocr-zeile-text' }, [
          el('span', { text: aufnahme.titel || aufnahme.id }),
          el('span', {
            klasse: 'kennung',
            text: `${kapitelKennung(aufnahme) || 'ohne Stelle'} · ${aufnahme.id}`
          }),
          el('span', {
            klasse: 'kennung' + (gelesen ? ' ocr-marke--gelesen' : ''),
            text: gelesen
              ? `gelesen · ${gelesen.text.length} Zeichen${gelesen.teile > 1 ? ` · ${gelesen.teile} Kacheln` : ''}`
              : 'noch nicht gelesen'
          })
        ]),
        lupenKnopf(aufnahme.id)
      ]);
    })
  );
}

/** Ein Feld je gewähltem Bild - die Lesung lässt sich darin ändern. */
function zeichneOcrTexte() {
  const kasten = $('#ocr-texte');
  const gewaehlt = imProjekt().filter((a) => ocrWahl.has(a.id));
  if (!gewaehlt.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text: 'Links die Bilder wählen, deren Text geholt werden soll. Der erkannte Text steht danach hier und lässt sich ändern.'
      })
    );
    return;
  }
  kasten.replaceChildren(
    ...gewaehlt.map((aufnahme) => {
      const gelesen = ocrTexte[aufnahme.id];
      const feldId = 'ocr-feld-' + aufnahme.id;
      return el('section', { klasse: 'ocr-feld' }, [
        el('div', { klasse: 'ocr-feld-kopf' }, [
          el('label', { for: feldId, text: aufnahme.titel || aufnahme.id }),
          el('span', { klasse: 'kennung', text: gelesen && gelesen.erkannt_am ? formatiereZeitpunkt(gelesen.erkannt_am) : '' })
        ]),
        el('textarea', {
          id: feldId,
          rows: '10',
          placeholder: 'Noch nichts gelesen. „Text erkennen" holt den Text; er lässt sich hier ändern.',
          value: gelesen ? gelesen.text : '',
          oninput: (e) => setzeOcrText(aufnahme.id, e.target.value, 'hand')
        }),
        el('div', { klasse: 'ocr-feld-knoepfe' }, [
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'In die Notiz übernehmen',
            disabled: !gelesen,
            onclick: () => uebernimmInNotiz(aufnahme.id)
          }),
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'Lesung verwerfen',
            disabled: !gelesen,
            onclick: () => {
              delete ocrTexte[aufnahme.id];
              sichereOcr();
              zeichneOcr();
              meldeOcr(`Lesung zu ${aufnahme.id} verworfen.`, 'neutral');
            }
          })
        ])
      ]);
    })
  );
}

function zeichneOcrKnoepfe() {
  const gewaehlt = ocrWahl.size;
  const gelesen = imProjekt().filter((a) => ocrTexte[a.id]).length;
  $('#ocr-stand').textContent = `${gewaehlt} gewählt · ${gelesen} von ${imProjekt().length} gelesen`;
  $('#ocr-lesen').disabled = ocrLaeuft || !gewaehlt;
  $('#ocr-abbrechen').hidden = !ocrLaeuft;
  const hatText = imProjekt().some((a) => ocrWahl.has(a.id) && ocrTexte[a.id]);
  $('#ocr-txt').disabled = !hatText;
  $('#ocr-docx').disabled = !hatText;
}

function zeichneOcr() {
  if (document.getElementById('ocr-ansicht').hidden) return;
  // Gewählt bleibt nur, was es noch gibt.
  for (const kennung of [...ocrWahl]) if (!eingang.some((a) => a.id === kennung)) ocrWahl.delete(kennung);
  zeichneOcrListe();
  zeichneOcrTexte();
  zeichneOcrKnoepfe();
}

/* ------------------------------------------------------------- Das Lesen */

function setzeOcrText(kennung, text, quelle = 'claude', teile = 1) {
  const sauber = String(text || '');
  if (!sauber.trim()) delete ocrTexte[kennung];
  else ocrTexte[kennung] = { text: sauber, erkannt_am: new Date().toISOString(), teile, quelle };
  sichereOcr();
  zeichneOcrKnoepfe();
  zeichneOcrListe();
}

/** Eine Kachel des Bildes als JPEG - so geht sie an Claude. */
async function ocrKachelBild(element, kachel) {
  const leinwand = document.createElement('canvas');
  leinwand.width = kachel.breite;
  leinwand.height = kachel.hoehe;
  const stift = leinwand.getContext('2d');
  stift.fillStyle = '#FFFFFF';
  stift.fillRect(0, 0, leinwand.width, leinwand.height);
  stift.drawImage(element, kachel.x, kachel.y, kachel.breite, kachel.hoehe, 0, 0, kachel.breite, kachel.hoehe);
  return new Promise((fertig) => leinwand.toBlob(fertig, 'image/jpeg', 0.92));
}

/** Holt die Fähigkeit einmal und merkt sich, ob sie Bilder mitnimmt. */
async function holeOcrClaude() {
  if (ocrGeprueft) return ocrClaude;
  ocrGeprueft = true;
  ocrClaude = await holeFaehigkeit('sample');
  if (ocrClaude && ocrClaude.limits) {
    const grenzen = await ocrClaude.limits().catch(() => null);
    ocrBilderMoeglich = Boolean(grenzen && grenzen.images);
  } else {
    ocrBilderMoeglich = Boolean(ocrClaude);
  }
  return ocrClaude;
}

async function leseAusgewaehlte() {
  if (ocrLaeuft) return;
  const bilder = imProjekt().filter((a) => ocrWahl.has(a.id));
  if (!bilder.length) return;

  const claude = await holeOcrClaude();
  if (!claude) {
    meldeOcr(
      'Diese Ansicht darf Claude nicht fragen – ohne diese Fähigkeit kann die Seite nicht lesen. Der Text lässt sich in den Feldern von Hand eintragen.',
      'warnung'
    );
    return;
  }
  if (ocrBilderMoeglich === false) {
    meldeOcr(
      'Claude darf hier keine Bilder sehen – die Texterkennung entfällt. Die Felder bleiben zum Eintragen von Hand.',
      'warnung'
    );
    return;
  }

  ocrLaeuft = true;
  ocrAbbruch = new AbortController();
  zeichneOcrKnoepfe();
  let fertig = 0;
  let gescheitert = 0;

  for (const aufnahme of bilder) {
    if (ocrAbbruch.signal.aborted) break;
    try {
      const adresse = await bestesBild(aufnahme, (neuesteFassung(aufnahme) || {}).nummer);
      const geladen = await ladeBild(adresse, 'eingang', aufnahme.titel);
      const kacheln = ocrKacheln(geladen.breite, geladen.hoehe);
      const teile = [];
      for (const kachel of kacheln) {
        if (ocrAbbruch.signal.aborted) break;
        meldeOcr(
          `${aufnahme.titel || aufnahme.id} wird gelesen …` +
            (kacheln.length > 1 ? ` (Kachel ${kachel.nummer} von ${kachel.von})` : '') +
            ` · Bild ${fertig + 1} von ${bilder.length}`,
          'neutral'
        );
        const blob = await ocrKachelBild(geladen.element, kachel);
        const antwort = await claude(ocrAufforderung(aufnahme, kachel), {
          images: blob,
          modelTier: 'default',
          signal: ocrAbbruch.signal
        });
        teile.push(String((antwort && antwort.text) || ''));
      }
      if (teile.length) {
        setzeOcrText(aufnahme.id, ocrZusammenfuegen(teile), 'claude', kacheln.length);
        fertig += 1;
        zeichneOcrTexte();
      }
    } catch (fehler) {
      const code = (fehler && fehler.code) || '';
      if (code === 'cancelled') break;
      gescheitert += 1;
      if (code === 'not_granted') {
        meldeOcr('Das Lesen wurde nicht erlaubt. Die Felder bleiben zum Eintragen von Hand.', 'warnung');
        break;
      }
      if (code === 'rate_limited') {
        meldeOcr('Zu viele Anfragen in kurzer Zeit – später noch einmal, oder weniger Bilder auf einmal.', 'warnung');
        break;
      }
      if (code === 'images_unavailable') {
        ocrBilderMoeglich = false;
        meldeOcr('Claude darf hier keine Bilder sehen – die Texterkennung entfällt.', 'warnung');
        break;
      }
    }
  }

  const angehalten = ocrAbbruch.signal.aborted;
  ocrLaeuft = false;
  ocrAbbruch = null;
  zeichneOcr();
  meldeOcr(
    angehalten
      ? `Angehalten – ${fertig} von ${bilder.length} Bildern gelesen.`
      : gescheitert
        ? `${fertig} von ${bilder.length} Bildern gelesen, ${gescheitert} nicht.`
        : `${fertig} von ${bilder.length} Bildern gelesen.`,
    gescheitert && !fertig ? 'warnung' : fertig ? 'gut' : 'neutral'
  );
}

/** Der erkannte Text wandert in die Notiz der Aufnahme - gekürzt, falls nötig. */
function uebernimmInNotiz(kennung) {
  const gelesen = ocrTexte[kennung];
  const aufnahme = eingang.find((a) => a.id === kennung);
  if (!gelesen || !aufnahme) return;
  const text = gelesen.text.trim().slice(0, 2000);
  eingang = eingang.map((a) => (a.id === kennung ? { ...a, notiz: text } : a));
  const stand = sichereEingang();
  zeichneEingang();
  meldeOcr(
    stand.ok
      ? `Der Text steht in der Notiz von ${kennung}${gelesen.text.length > 2000 ? ' (auf 2000 Zeichen gekürzt)' : ''}.`
      : 'Die Notiz ließ sich nicht sichern – der Speicher ist voll.',
    stand.ok ? 'gut' : 'warnung'
  );
}

/* ------------------------------------------------------------- Ausgabe */

/** Die Abschnitte, aus denen Textdatei und Word-Datei entstehen. */
function ocrAbschnitte() {
  return imProjekt()
    .filter((a) => ocrWahl.has(a.id) && ocrTexte[a.id])
    .map((a) => ({
      titel: a.titel || a.id,
      kennung: a.id,
      stelle: kapitelKennung(a),
      text: ocrTexte[a.id].text
    }));
}

async function sichereOcrText() {
  const abschnitte = ocrAbschnitte();
  if (!abschnitte.length) return;
  const name = `texte-${new Date().toISOString().slice(0, 10)}.txt`;
  const ergebnis = await uebergebeDatei(
    name,
    new Blob([ocrAlsText(abschnitte, { anwendung: DATEN.anwendung })], { type: 'text/plain' })
  );
  meldeOcr(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${abschnitte.length} Bild(er).`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Der Text bleibt in den Feldern.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

async function sichereOcrWord() {
  const abschnitte = ocrAbschnitte();
  if (!abschnitte.length) return;
  const daten = docxAusText(abschnitte, { titel: 'Texte aus Bildern', anwendung: DATEN.anwendung });
  if (!daten) return;
  const name = `texte-${new Date().toISOString().slice(0, 10)}.docx`;
  const ergebnis = await uebergebeDatei(
    name,
    new Blob([daten], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  );
  meldeOcr(
    ergebnis.art === 'gesichert'
      ? `${name} gesichert (${formatiereBytes(ergebnis.groesse)}) – ${abschnitte.length} Bild(er).`
      : ergebnis.art === 'ohne'
        ? 'Diese Ansicht darf keine Dateien ablegen. Der Text bleibt in den Feldern.'
        : 'Das Sichern wurde abgebrochen oder ist fehlgeschlagen.',
    ergebnis.art === 'gesichert' ? 'gut' : 'warnung'
  );
}

function verdrahteOcr() {
  $('#ocr-alle').addEventListener('click', () => {
    for (const a of imProjekt()) ocrWahl.add(a.id);
    zeichneOcr();
  });
  $('#ocr-keine').addEventListener('click', () => {
    ocrWahl.clear();
    zeichneOcr();
  });
  $('#ocr-offene').addEventListener('click', () => {
    ocrWahl = new Set(imProjekt().filter((a) => !ocrTexte[a.id]).map((a) => a.id));
    zeichneOcr();
  });
  $('#ocr-lesen').addEventListener('click', leseAusgewaehlte);
  $('#ocr-abbrechen').addEventListener('click', () => {
    if (ocrAbbruch) ocrAbbruch.abort();
  });
  $('#ocr-txt').addEventListener('click', sichereOcrText);
  $('#ocr-docx').addEventListener('click', sichereOcrWord);
}

verdrahteOcr();

// Der Start steht in der letzten Zeile der letzten Datei (siehe CLAUDE.md).
starte();
stelleOrdnerWiederHer();
stelleVorschauenWieder();
