/** Prueft den Datenbestand gegen das Schema und auf innere Stimmigkeit. */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { suite, wahr, gleich, enthaelt } from '../hilfen/pruefe.mjs';
import { pruefeSchema } from '../hilfen/schema.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const daten = JSON.parse(readFileSync(join(wurzel, 'data', 'eintraege.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(wurzel, 'data', 'schema', 'eintraege.schema.json'), 'utf8'));

const s = suite('Daten');

s.test('entspricht dem JSON-Schema', () => {
  const fehler = pruefeSchema(daten, schema);
  wahr(fehler.length === 0, 'Schemaverstöße:\n      ' + fehler.slice(0, 12).join('\n      '));
});

s.test('Kennungen sind eindeutig', () => {
  const ids = daten.eintraege.map((e) => e.id);
  gleich(new Set(ids).size, ids.length, 'doppelte Kennung im Bestand');
});

s.test('nutzt ausschließlich Werte aus dem Vokabular', () => {
  const v = daten.vokabular;
  const viewportIds = v.viewports.map((x) => x.id);
  for (const e of daten.eintraege) {
    wahr(v.projekte.includes(e.projekt), `${e.id}: Projekt "${e.projekt}" unbekannt`);
    wahr(v.kategorien.includes(e.kategorie), `${e.id}: Kategorie "${e.kategorie}" unbekannt`);
    wahr(v.status.includes(e.status), `${e.id}: Status "${e.status}" unbekannt`);
    wahr(viewportIds.includes(e.viewport), `${e.id}: Viewport "${e.viewport}" unbekannt`);
  }
});

s.test('Archivfelder sind vollständig gesetzt', () => {
  for (const e of daten.eintraege) {
    if (e.archiviert) {
      wahr(e.archiviert_am, `${e.id}: archiviert ohne Datum`);
      wahr(e.archiv_grund && e.archiv_grund.length > 20, `${e.id}: archiviert ohne belastbaren Grund`);
      wahr(e.archiviert_am >= e.datum, `${e.id}: Archivdatum liegt vor dem Belegdatum`);
    } else {
      gleich(e.archiviert_am, null, `${e.id}: nicht archiviert, aber Archivdatum gesetzt`);
    }
  }
});

s.test('Aufnahmedaten liegen plausibel zum Belegdatum', () => {
  for (const e of daten.eintraege) {
    const v = e.screen.vorher.aufgenommen;
    const n = e.screen.nachher.aufgenommen;
    wahr(v < n, `${e.id}: Aufnahme "vorher" (${v}) liegt nicht vor "nachher" (${n})`);
    gleich(n, e.datum, `${e.id}: Belegdatum weicht vom Datum der Nachher-Aufnahme ab`);
  }
});

s.test('jede Vorher-Nachher-Option unterscheidet sich', () => {
  for (const e of daten.eintraege) {
    const ohneDatum = (o) => JSON.stringify({ ...o, aufgenommen: null });
    wahr(
      ohneDatum(e.screen.vorher) !== ohneDatum(e.screen.nachher),
      `${e.id}: Vorher und Nachher sind identisch beschrieben – der Vergleich zeigte keinen Unterschied`
    );
  }
});

s.test('Begründungen nennen Anlass, Änderung, Wirkung und Quelle', () => {
  for (const e of daten.eintraege) {
    for (const feld of ['anlass', 'aenderung', 'wirkung', 'quelle']) {
      const text = e.begruendung[feld];
      wahr(text && text.trim().length > 10, `${e.id}: Begründung "${feld}" fehlt oder ist zu knapp`);
    }
  }
});

s.test('verworfene Belege begründen den Verzicht', () => {
  const verworfen = daten.eintraege.filter((e) => e.status === 'verworfen');
  wahr(verworfen.length > 0, 'kein verworfener Beleg im Beispielbestand');
  for (const e of verworfen) {
    enthaelt(e.begruendung.wirkung.toLowerCase(), 'verworfen', `${e.id}: Wirkungstext erklärt das Verwerfen nicht`);
  }
});

s.test('Kennzahlen haben eine Richtung und unterscheidbare Werte', () => {
  for (const e of daten.eintraege) {
    wahr(e.metriken.length > 0, `${e.id}: keine Kennzahl hinterlegt`);
    for (const m of e.metriken) {
      wahr(['groesser_besser', 'kleiner_besser'].includes(m.richtung), `${e.id}/${m.name}: Richtung fehlt`);
      wahr(m.vorher !== m.nachher, `${e.id}/${m.name}: Vorher und Nachher sind gleich`);
      wahr(m.vorher !== 0, `${e.id}/${m.name}: Ausgangswert 0 lässt keine Wirkung berechnen`);
    }
  }
});

s.test('Schema und Datei liegen am erwarteten Ort', () => {
  wahr(existsSync(join(wurzel, 'data', 'eintraege.json')), 'data/eintraege.json fehlt');
  wahr(existsSync(join(wurzel, 'data', 'schema', 'eintraege.schema.json')), 'Schema fehlt');
});

export default s;
