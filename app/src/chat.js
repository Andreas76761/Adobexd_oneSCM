/* =========================================================================
   Suchchat – ein frei bewegliches Fenster, das nach Bildern gefragt wird.

   Es liegt über jeder Ansicht, lässt sich ziehen und in der Größe ändern und
   behält seine Lage. Gefragt wird in Worten, geantwortet wird mit Bildern:
   jeder Treffer als Vorschau mit dem Weg weiter – in den Editor oder an die
   offene Strecke.

   Gedeutet wird die Frage im Kern (`deuteFrage`), gefiltert ebenfalls
   (`findeBilder`). Steht die Fähigkeit `sample` zur Verfügung, darf Claude
   dieselbe Frage deuten; angewendet wird auch dann nur der Filter. Damit kann
   im Fenster nie etwas stehen, was der Eingang nicht hergibt.
   ========================================================================= */

/**
 * Ohne gemerkte Lage steht das Fenster unten rechts - dort verdeckt es weder
 * Kopf noch Navigation. Gezogen wird es ohnehin dorthin, wo es gebraucht wird.
 */
const standardLage = () => ({
  breite: 380,
  hoehe: 480,
  x: Math.max(16, (window.innerWidth || 1280) - 396),
  y: Math.max(16, (window.innerHeight || 800) - 512),
  offen: false
});
let chatLage = leseChatlage(leseChatSpeicher()) || standardLage();
let chatVerlauf = []; // { art: 'frage' | 'antwort', text, treffer, erkannt, wer }
let chatClaude = null; // die Fähigkeit sample, wenn der Betrachter sie gibt
let chatClaudeGeprueft = false;
let chatLaeuft = false;

function leseChatSpeicher() {
  try {
    return localStorage.getItem(CHAT_SCHLUESSEL);
  } catch (fehler) {
    return null;
  }
}

function sichereChatlage() {
  try {
    localStorage.setItem(CHAT_SCHLUESSEL, schreibeChatlage(chatLage));
  } catch (fehler) {
    // Ohne Speicher steht das Fenster beim nächsten Laden wieder am Anfang.
  }
}

/* ------------------------------------------------------------ Darstellung */

function setzeChatLage() {
  const fenster = $('#chat-fenster');
  chatLage = haltImBild(chatLage, { breite: window.innerWidth, hoehe: window.innerHeight });
  fenster.style.left = chatLage.x + 'px';
  fenster.style.top = chatLage.y + 'px';
  fenster.style.width = chatLage.breite + 'px';
  fenster.style.height = chatLage.hoehe + 'px';
}

function zeigeChat(offen) {
  chatLage = { ...chatLage, offen: Boolean(offen) };
  $('#chat-fenster').hidden = !chatLage.offen;
  $('#chat-auf').setAttribute('aria-expanded', chatLage.offen ? 'true' : 'false');
  $('#chat-auf').classList.toggle('knopf--haupt', chatLage.offen);
  sichereChatlage();
  if (!chatLage.offen) return;
  setzeChatLage();
  zeichneChat();
  $('#chat-frage').focus({ preventScroll: true });
}

/** Ein Treffer: Vorschau, Kennung und die beiden Wege weiter. */
function chatTreffer(aufnahme) {
  return el('figure', { klasse: 'chat-treffer' }, [
    el('button', {
      type: 'button',
      klasse: 'chat-treffer-bild',
      title: 'Im Editor öffnen',
      onclick: () => {
        oeffneEditor(aufnahme.id);
        zeigeChat(false);
      }
    }, el('img', { src: anzeigeBild(aufnahme), alt: aufnahme.titel, loading: 'lazy' })),
    lupenKnopf(aufnahme.id),
    el('figcaption', {}, [
      el('span', { klasse: 'chat-treffer-titel', text: aufnahme.titel }),
      el('span', { klasse: 'kennung', text: `${kapitelKennung(aufnahme) || 'ohne Stelle'} · ${aufnahme.id}` }),
      labelKette(aufnahme) ? el('span', { klasse: 'kennung', text: labelKette(aufnahme) }) : null
    ]),
    el('div', { klasse: 'chat-treffer-knoepfe' }, [
      el('button', {
        klasse: 'knopf knopf--klein',
        type: 'button',
        text: 'Editor',
        onclick: () => {
          oeffneEditor(aufnahme.id);
          zeigeChat(false);
        }
      }),
      el('button', {
        klasse: 'knopf knopf--klein',
        type: 'button',
        text: '→ Strecke',
        title: 'An die offene Strecke anhängen',
        onclick: () => haengeAnStrecke(aufnahme)
      })
    ])
  ]);
}

/**
 * Hängt einen Treffer an die offene Strecke. Gibt es keine, entsteht eine -
 * sonst wäre der Knopf in der häufigsten Lage (noch keine Strecke) nutzlos.
 */
function haengeAnStrecke(aufnahme) {
  let offen = aktuelleStrecke();
  if (!offen) {
    offen = leereStrecke('Aus der Suche');
    strecken = [...strecken, offen];
    streckeOffen = offen.id;
  }
  strecken = strecken.map((s) =>
    s.id === offen.id
      ? { ...s, schritte: [...s.schritte, streckeSchritt(aufnahme.id, '')], geaendert_am: new Date().toISOString() }
      : s
  );
  sichereStrecken();
  zeichneStrecke();
  meldeChat(`${aufnahme.id} an die Strecke „${offen.name || 'ohne Namen'}" angehängt – die Anweisung fehlt dort noch.`);
}

function meldeChat(text) {
  $('#chat-stand').textContent = text;
}

function zeichneChat() {
  const kasten = $('#chat-verlauf');
  if (!chatVerlauf.length) {
    kasten.replaceChildren(
      el('p', { klasse: 'chat-leer' }, [
        el('b', { text: 'Frag nach Bildern.' }),
        el('span', {
          text:
            ' Erkannt werden Rolle (Dealer, Market, HQ, MO), Sparte (Pkw, Van), Sprache, Markt, Kapitel und Eigenschaften wie „unkenntlich" oder „aus dem Import". Alles andere wird als Text gesucht.'
        })
      ])
    );
  } else {
    kasten.replaceChildren(
      ...chatVerlauf.map((zug) =>
        zug.art === 'frage'
          ? el('p', { klasse: 'chat-frage', text: zug.text })
          : el('div', { klasse: 'chat-antwort' }, [
              el('p', { klasse: 'chat-satz', text: zug.text }),
              zug.wer ? el('p', { klasse: 'kennung', text: zug.wer }) : null,
              zug.treffer && zug.treffer.length
                ? el('div', { klasse: 'chat-treffer-liste' }, zug.treffer.map(chatTreffer))
                : null
            ])
      )
    );
    kasten.scrollTop = kasten.scrollHeight;
  }
  $('#chat-beispiele').replaceChildren(
    ...CHAT_BEISPIELE.map((beispiel) =>
      el('button', {
        klasse: 'chat-beispiel',
        type: 'button',
        text: beispiel,
        onclick: () => {
          $('#chat-frage').value = beispiel;
          frageChat();
        }
      })
    )
  );
}

/* ------------------------------------------------------------- Beantworten */

/**
 * Claude deutet die Frage, falls der Betrachter die Fähigkeit gibt. Zurück
 * kommt *nur* ein Filter - gefiltert wird hier. Scheitert es oder fehlt die
 * Fähigkeit, bleibt die Deutung im Kern; die Antwort kommt in jedem Fall.
 */
async function deuteMitClaude(frage) {
  if (!chatClaudeGeprueft) {
    chatClaude = await holeFaehigkeit('sample');
    chatClaudeGeprueft = true;
  }
  if (!chatClaude || typeof chatClaude.json !== 'function') return null;
  const vokabular = {
    sprache: SPRACHEN.map((s) => s.id),
    rolle_label: ROLLEN_LABEL.map((r) => r.id),
    sparte: SPARTEN.map((s) => s.id),
    nur: ['unkenntlich', 'markiert', 'import', 'ohneStelle', 'unvollstaendig']
  };
  try {
    const antwort = await chatClaude.json(
      [
        {
          role: 'user',
          content:
            'Du übersetzt eine deutsche Frage nach Bildschirmaufnahmen in einen Filter. ' +
            'Antworte nur mit JSON dieser Form: ' +
            '{"sprache":"","rolle_label":"","sparte":"","markt":"","stelle":"","text":"","grenze":0,"nur":[]}. ' +
            'Erlaubte Werte: ' +
            JSON.stringify(vokabular) +
            '. "stelle" ist eine Gliederungsnummer wie "6.2". "text" ist der Rest als Suchwort. ' +
            'Nichts erfinden: was nicht in der Frage steht, bleibt leer.\n\nFrage: ' +
            frage
        }
      ],
      { modelTier: 'quick', cache: false }
    );
    if (!antwort || typeof antwort !== 'object') return null;
    // Nur bekannte Felder übernehmen - der Rest wird verworfen.
    const sauber = { sprache: '', rolle_label: '', sparte: '', markt: '', stelle: '', text: '', grenze: 0, nur: [] };
    for (const feld of CHAT_FELDER) {
      if (feld === 'nur') sauber.nur = Array.isArray(antwort.nur) ? antwort.nur.filter((n) => vokabular.nur.includes(n)) : [];
      else if (feld === 'grenze') sauber.grenze = Number(antwort.grenze) > 0 ? Math.min(99, Number(antwort.grenze)) : 0;
      else sauber[feld] = String(antwort[feld] || '').trim();
    }
    if (sauber.sprache && !vokabular.sprache.includes(sauber.sprache)) sauber.sprache = '';
    if (sauber.rolle_label && !vokabular.rolle_label.includes(sauber.rolle_label)) sauber.rolle_label = '';
    if (sauber.sparte && !vokabular.sparte.includes(sauber.sparte)) sauber.sparte = '';
    return sauber;
  } catch (fehler) {
    return null;
  }
}

/** Nennt den Filter in Worten - damit nachvollziehbar ist, was gesucht wurde. */
function filterInWorten(filter) {
  const teile = [];
  if (filter.rolle_label) teile.push(`Rolle ${labelWert('rolle_label', filter.rolle_label)}`);
  if (filter.sparte) teile.push(`Sparte ${labelWert('sparte', filter.sparte)}`);
  if (filter.sprache) teile.push(`Sprache ${labelWert('sprache', filter.sprache)}`);
  if (filter.markt) teile.push(`Markt ${filter.markt}`);
  if (filter.stelle) teile.push(`Stelle ${gliederungKennung(GLIEDERUNG, filter.stelle)}`);
  for (const nur of filter.nur || []) teile.push(nur === 'ohneStelle' ? 'ohne Stelle' : nur);
  if (filter.grenze) teile.push(`höchstens ${filter.grenze}`);
  if (filter.text) teile.push(`Text „${filter.text}"`);
  return teile;
}

async function frageChat() {
  if (chatLaeuft) return;
  const frage = String($('#chat-frage').value || '').trim();
  if (!frage) return;
  chatLaeuft = true;
  $('#chat-fragen').disabled = true;
  $('#chat-frage').value = '';
  chatVerlauf = [...chatVerlauf, { art: 'frage', text: frage }];
  zeichneChat();
  meldeChat('sucht …');

  // Zuerst die eigene Deutung: sie ist sofort da und braucht niemanden.
  const eigen = deuteFrage(frage, GLIEDERUNG);
  let filter = eigen.filter;
  let wer = 'gedeutet in der Seite';
  const vonClaude = await deuteMitClaude(frage);
  if (vonClaude) {
    // Claude darf ergänzen, nicht widersprechen: was die Seite sicher erkannt
    // hat (festes Vokabular), bleibt stehen.
    filter = {
      ...vonClaude,
      sprache: eigen.filter.sprache || vonClaude.sprache,
      rolle_label: eigen.filter.rolle_label || vonClaude.rolle_label,
      sparte: eigen.filter.sparte || vonClaude.sparte,
      stelle: eigen.filter.stelle || vonClaude.stelle,
      nur: [...new Set([...(eigen.filter.nur || []), ...(vonClaude.nur || [])])]
    };
    wer = 'gedeutet mit Claude, gefiltert in der Seite';
  }

  const treffer = findeBilder(imProjekt(), filter, GLIEDERUNG);
  const erkannt = filterInWorten(filter);
  const text = chatAntwortText({ erkannt, filter }, treffer, imProjekt().length);
  chatVerlauf = [...chatVerlauf, { art: 'antwort', text, treffer: treffer.slice(0, 24), erkannt, wer }];
  chatLaeuft = false;
  $('#chat-fragen').disabled = false;
  zeichneChat();
  meldeChat(
    treffer.length > 24 ? `${treffer.length} Treffer – gezeigt werden die ersten 24.` : `${treffer.length} Treffer.`
  );
  $('#chat-frage').focus({ preventScroll: true });
}

/* -------------------------------------------------------- Ziehen und Größe */

/**
 * Frei beweglich heißt: am Kopf ziehen, an der Ecke größer machen, und die
 * Lage überlebt den Wechsel der Ansicht wie das Neuladen.
 */
function machBeweglich() {
  const fenster = $('#chat-fenster');
  let zug = null;

  $('#chat-griff').addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    zug = { art: 'ziehen', x: e.clientX, y: e.clientY, lage: { ...chatLage } };
    $('#chat-griff').setPointerCapture(e.pointerId);
  });
  $('#chat-groesse').addEventListener('pointerdown', (e) => {
    zug = { art: 'groesse', x: e.clientX, y: e.clientY, lage: { ...chatLage } };
    $('#chat-groesse').setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  const bewege = (e) => {
    if (!zug) return;
    const dx = e.clientX - zug.x;
    const dy = e.clientY - zug.y;
    chatLage =
      zug.art === 'ziehen'
        ? { ...chatLage, x: zug.lage.x + dx, y: zug.lage.y + dy }
        : { ...chatLage, breite: zug.lage.breite + dx, hoehe: zug.lage.hoehe + dy };
    setzeChatLage();
  };
  const loslassen = () => {
    if (!zug) return;
    zug = null;
    sichereChatlage();
  };
  for (const knoten of [$('#chat-griff'), $('#chat-groesse')]) {
    knoten.addEventListener('pointermove', bewege);
    knoten.addEventListener('pointerup', loslassen);
    knoten.addEventListener('pointercancel', loslassen);
  }
  // Wird das Fenster kleiner als die Lage, holt der Rahmen das Fenster zurück.
  window.addEventListener('resize', () => {
    if (!fenster.hidden) setzeChatLage();
  });
}

function verdrahteChat() {
  $('#chat-auf').addEventListener('click', () => zeigeChat($('#chat-fenster').hidden));
  $('#chat-zu').addEventListener('click', () => zeigeChat(false));
  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    frageChat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#chat-fenster').hidden) {
      zeigeChat(false);
      $('#chat-auf').focus({ preventScroll: true });
    }
  });
  machBeweglich();
  setzeChatLage();
  if (chatLage.offen) zeigeChat(true);
}

verdrahteChat();

