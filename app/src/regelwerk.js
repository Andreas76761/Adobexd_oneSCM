/* =========================================================================
   Register Regelwerk (F-80)

   Hier stehen die Regeln, an denen dieses Haus seine Unterlagen misst -
   allgemein oder je Kapitel. Die Seite entscheidet nicht, was wichtig ist;
   sie prüft nur, was hier verabredet wurde.

   Geprüft wird an drei Stellen, damit ein Verstoß dort auffällt, wo er
   entsteht:

     · beim **Aufnehmen** und im **Eingang** – an der einzelnen Aufnahme
     · im Register **Prüfung** – als eigener Agent neben den vier anderen
     · vor dem **Erzeugen** der Dokumente – eine Pflichtregel hält es an

   Die Regeln liegen in `screenarchiv:regeln` und reisen mit der
   Projektdatei: wer den Bestand bekommt, misst an denselben Regeln.
   ========================================================================= */

let regeln = leseRegelnAusSpeicher();
let regelEntwurf = leereRegel();

function leseRegelnAusSpeicher() {
  try {
    return leseRegeln(localStorage.getItem(REGELN_SCHLUESSEL));
  } catch (fehler) {
    return [];
  }
}

function sichereRegeln() {
  try {
    localStorage.setItem(REGELN_SCHLUESSEL, schreibeRegeln(regeln));
    return true;
  } catch (fehler) {
    return false;
  }
}

function meldeRegelwerk(text, art = 'neutral') {
  const zeile = $('#regelwerk-meldung');
  if (!zeile) return;
  zeile.textContent = text;
  zeile.className = 'studio-meldung studio-meldung--' + art;
}

/** Das Eingabefeld für den Wert richtet sich nach der Art der Regel. */
function zeichneRegelWert() {
  const kasten = $('#regel-wert-feld');
  if (!kasten) return;
  const art = REGEL_ARTEN.find((a) => a.id === regelEntwurf.art);
  if (!art || !art.wert) {
    kasten.replaceChildren(
      el('p', { klasse: 'feld-hinweis', text: 'Diese Regel braucht keinen Wert.' })
    );
    return;
  }
  const aendere = (wert) => {
    regelEntwurf = { ...regelEntwurf, wert };
    zeichneRegelVorschau();
  };
  if (art.wert === 'feld') {
    kasten.replaceChildren(
      el('label', { for: 'regel-wert', text: 'Welches Label' }),
      el(
        'select',
        { id: 'regel-wert', onchange: (e) => aendere(e.target.value) },
        LABEL_FELDER.map((f) =>
          el('option', { value: f.id, text: f.label, selected: f.id === regelEntwurf.wert })
        )
      )
    );
    if (!regelEntwurf.wert) regelEntwurf = { ...regelEntwurf, wert: LABEL_FELDER[0].id };
    return;
  }
  if (art.wert === 'text') {
    kasten.replaceChildren(
      el('label', { for: 'regel-wert', text: 'Die Regel in Worten' }),
      el('textarea', {
        id: 'regel-wert',
        rows: '2',
        value: regelEntwurf.wert,
        placeholder: 'Jede Maske zeigt die Vertragsnummer oben links.',
        oninput: (e) => aendere(e.target.value)
      })
    );
    return;
  }
  kasten.replaceChildren(
    el('label', { for: 'regel-wert', text: art.wert === 'zahl' ? 'Zahl' : 'Wort' }),
    el('input', {
      type: art.wert === 'zahl' ? 'number' : 'text',
      id: 'regel-wert',
      min: '1',
      value: regelEntwurf.wert,
      placeholder: art.wert === 'zahl' ? '2' : 'Servicevertrag',
      oninput: (e) => aendere(e.target.value)
    })
  );
}

/** Was die Regel sagen wird, bevor sie angelegt ist. */
function zeichneRegelVorschau() {
  const zeile = $('#regel-vorschau');
  if (!zeile) return;
  const art = REGEL_ARTEN.find((a) => a.id === regelEntwurf.art);
  const schaerfe = REGEL_SCHAERFEN.find((s) => s.id === regelEntwurf.schaerfe);
  zeile.textContent = `${schaerfe ? schaerfe.label : ''}: ${regelText(regelEntwurf)}${
    art && art.claude ? ' – wird nur im Register Prüfung über Claude geprüft.' : ''
  }`;
}

/** Die Liste der Regeln, mit ihrem Stand am heutigen Bestand. */
function zeichneRegelliste() {
  const kasten = $('#regelwerk-liste');
  if (!kasten) return;
  const bestand = imProjekt();
  const befunde = pruefeRegeln(regeln, bestand, gliederungJetzt());
  $('#regelwerk-stand').textContent = regeln.length
    ? `${regeln.length} Regel(n) · ${regeln.filter((r) => r.schaerfe === 'pflicht').length} Pflicht · ` +
      `${befunde.filter((b) => b.art === 'fehler').length} Verstoß/Verstöße gegen eine Pflichtregel`
    : 'noch keine Regel';

  if (!regeln.length) {
    kasten.replaceChildren(
      el('p', {
        klasse: 'feld-hinweis',
        text:
          'Noch keine Regel. Links eine anlegen – sie gilt überall oder für ein Kapitel, ' +
          'und sie ist Pflicht (hält das Erzeugen an) oder Hinweis.'
      })
    );
    return;
  }

  kasten.replaceChildren(
    ...regeln.map((regel) => {
      const art = REGEL_ARTEN.find((a) => a.id === regel.art);
      const eigene = pruefeRegeln([regel], bestand, gliederungJetzt());
      const verstoss = eigene.find((b) => b.art === 'fehler' || b.art === 'warnung');
      // Eine Regel kann eingehalten sein, *weil* ein Schalter aus ist. Dann
      // ist „eingehalten" allein die halbe Wahrheit (1.80.0).
      const bedingt = eigene.find((b) => b.art === 'hinweis');
      return el('div', { klasse: 'regel-zeile' + (regel.aktiv === false ? ' regel-zeile--aus' : '') }, [
        el('div', { klasse: 'regel-kopf' }, [
          el('span', {
            klasse: 'pruef-art pruef-art--' + (regel.schaerfe === 'pflicht' ? 'fehler' : 'warnung'),
            text: (REGEL_SCHAERFEN.find((s) => s.id === regel.schaerfe) || {}).label || regel.schaerfe
          }),
          el('span', { klasse: 'regel-satz', text: regelText(regel) })
        ]),
        el('p', {
          klasse: 'feld-hinweis',
          text: art && art.claude
            ? 'Freie Regel – geprüft wird sie im Register Prüfung, und das Ergebnis ist eine Deutung.'
            : verstoss
              ? `Heute: ${verstoss.titel}.`
              : bedingt
                ? `Heute: eingehalten – ${bedingt.titel}. ${bedingt.text}`
                : 'Heute: eingehalten.'
        }),
        el('div', { klasse: 'markier-knoepfe' }, [
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: regel.aktiv === false ? 'Einschalten' : 'Ausschalten',
            onclick: () => {
              regeln = regeln.map((r) => (r.id === regel.id ? { ...r, aktiv: r.aktiv === false } : r));
              sichereRegeln();
              zeichneRegelwerk();
            }
          }),
          el('button', {
            klasse: 'knopf knopf--klein',
            type: 'button',
            text: 'Löschen',
            onclick: () => {
              regeln = regeln.filter((r) => r.id !== regel.id);
              sichereRegeln();
              zeichneRegelwerk();
              meldeRegelwerk('Regel gelöscht.', 'neutral');
            }
          })
        ])
      ]);
    })
  );
}

function zeichneRegelwerk() {
  if (!$('#regelwerk-ansicht')) return;
  zeichneRegelWert();
  zeichneRegelVorschau();
  zeichneRegelliste();
}

/** Legt die Regel an, die links steht. */
function legeRegelAn() {
  const art = REGEL_ARTEN.find((a) => a.id === regelEntwurf.art);
  if (art && art.wert && !String(regelEntwurf.wert || '').trim()) {
    meldeRegelwerk('Diese Regel braucht noch einen Wert.', 'warnung');
    return;
  }
  // Über `vereineRegeln`: dieselbe Regel zweimal misst nicht strenger, und
  // zwei Regeln in derselben Millisekunde bekämen dieselbe Kennung – dann
  // hätte „Löschen" beide getroffen (1.82.0).
  const vorher = regeln.length;
  regeln = vereineRegeln(regeln, [leereRegel({ ...regelEntwurf, id: `REG-${Date.now().toString(36)}` })]);
  if (regeln.length === vorher) {
    meldeRegelwerk('Diese Regel gibt es schon – dieselbe Art, dieselbe Geltung, dieselbe Schärfe.', 'warnung');
    return;
  }
  const gesichert = sichereRegeln();
  regelEntwurf = leereRegel({ art: regelEntwurf.art, geltung: regelEntwurf.geltung, schaerfe: regelEntwurf.schaerfe });
  zeichneRegelwerk();
  meldeRegelwerk(
    gesichert ? 'Regel angelegt – sie gilt ab sofort.' : 'Regel angelegt, aber der Speicher ist voll: sie gilt nur in dieser Sitzung.',
    gesichert ? 'gut' : 'warnung'
  );
}

function verdrahteRegelwerk() {
  if (!$('#regelwerk-ansicht')) return;
  $('#regel-art').replaceChildren(
    ...REGEL_ARTEN.map((a) => el('option', { value: a.id, text: a.label, selected: a.id === regelEntwurf.art }))
  );
  $('#regel-schaerfe').replaceChildren(
    ...REGEL_SCHAERFEN.map((s) =>
      el('option', { value: s.id, text: `${s.label} – ${s.hinweis}`, selected: s.id === regelEntwurf.schaerfe })
    )
  );
  $('#regel-art').addEventListener('change', (e) => {
    regelEntwurf = leereRegel({ ...regelEntwurf, art: e.target.value, wert: '' });
    zeichneRegelwerk();
  });
  $('#regel-schaerfe').addEventListener('change', (e) => {
    regelEntwurf = { ...regelEntwurf, schaerfe: e.target.value };
    zeichneRegelVorschau();
  });
  $('#regel-geltung').addEventListener('input', (e) => {
    regelEntwurf = { ...regelEntwurf, geltung: (String(e.target.value).match(/^[0-9A-Z]+(\.[0-9]+)*/) || [''])[0] };
    zeichneRegelVorschau();
  });
  $('#regel-anlegen').addEventListener('click', legeRegelAn);
  zeichneRegelwerk();
}
