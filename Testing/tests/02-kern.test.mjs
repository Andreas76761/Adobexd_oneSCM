/** Unit-Tests der Kernlogik (app/src/core.mjs) - ohne Browser. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { suite, wahr, gleich, nahe, tieferGleich } from '../hilfen/pruefe.mjs';
import * as kern from '../../app/src/core.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const daten = JSON.parse(readFileSync(join(wurzel, 'data', 'eintraege.json'), 'utf8'));
const alle = kern.bereiteVor(daten.eintraege);

const s = suite('Kernlogik');

s.test('Normalisierung fasst Umlaute und Schreibweisen zusammen', () => {
  gleich(kern.normalisiere('Prüfung'), 'prufung');
  gleich(kern.normalisiereLang('Prüfung'), 'pruefung');
  gleich(kern.normalisiere('Fehlerzustände'), 'fehlerzustande');
  gleich(kern.normalisiere('Straße'), 'strasse');
});

s.test('Suche findet beide Umlaut-Schreibweisen', () => {
  const a = kern.filtere(alle, { suche: 'prufung', archiv: 'alle' }).length;
  const b = kern.filtere(alle, { suche: 'pruefung', archiv: 'alle' }).length;
  const c = kern.filtere(alle, { suche: 'Prüfung', archiv: 'alle' }).length;
  wahr(a > 0, 'Suche ohne Umlaut findet nichts');
  gleich(a, b, 'ue-Schreibweise liefert andere Treffer');
  gleich(a, c, 'Umlaut-Schreibweise liefert andere Treffer');
});

s.test('mehrere Suchbegriffe werden UND-verknüpft', () => {
  const einer = kern.filtere(alle, { suche: 'checkout', archiv: 'alle' }).length;
  const zwei = kern.filtere(alle, { suche: 'checkout abbruchquote', archiv: 'alle' }).length;
  wahr(zwei <= einer, 'zweiter Begriff engt nicht ein');
  wahr(zwei > 0, 'gültige Kombination liefert keinen Treffer');
  gleich(kern.filtere(alle, { suche: 'checkout schneckenzucht', archiv: 'alle' }).length, 0);
});

s.test('Suche greift auch in die Begründung', () => {
  const treffer = kern.filtere(alle, { suche: 'rotgruenschwaeche', archiv: 'alle' });
  gleich(treffer.length, 1, 'Volltext der Begründung wird nicht durchsucht');
  gleich(treffer[0].id, 'SCR-2025-006');
});

s.test('Archivansicht trennt aktiv und archiviert sauber', () => {
  const aktiv = kern.filtere(alle, { archiv: 'aktiv' });
  const archiv = kern.filtere(alle, { archiv: 'archiv' });
  const alleE = kern.filtere(alle, { archiv: 'alle' });
  gleich(aktiv.length + archiv.length, alleE.length, 'Ansichten überschneiden sich oder verlieren Belege');
  wahr(aktiv.every((e) => !e.archiviert), 'aktive Ansicht enthält archivierte Belege');
  wahr(archiv.every((e) => e.archiviert), 'Archivansicht enthält aktive Belege');
});

s.test('Filter lassen sich kombinieren', () => {
  const z = { archiv: 'alle', projekte: ['oneSCM Portal'], kategorien: ['Navigation'] };
  const treffer = kern.filtere(alle, z);
  wahr(treffer.length > 0, 'Kombination liefert keinen Treffer');
  wahr(
    treffer.every((e) => e.projekt === 'oneSCM Portal' && e.kategorie === 'Navigation'),
    'Filter greifen nicht gemeinsam'
  );
});

s.test('mehrere Werte einer Dimension wirken als ODER', () => {
  const einzeln = kern.filtere(alle, { archiv: 'alle', status: ['verworfen'] }).length;
  const zwei = kern.filtere(alle, { archiv: 'alle', status: ['verworfen', 'in Prüfung'] }).length;
  wahr(zwei > einzeln, 'zweiter Wert erweitert die Treffermenge nicht');
});

s.test('Facettenzähler blenden die eigene Dimension aus', () => {
  const zustand = { archiv: 'alle', projekte: ['oneSCM Portal'] };
  const f = kern.facetten(alle, zustand, daten.vokabular);
  const andere = f.projekte.find((p) => p.wert === 'Admin-Konsole');
  wahr(andere.anzahl > 0, 'alternative Projekte werden auf 0 gezählt und damit unerreichbar');
  const kategorie = f.kategorien.reduce((a, k) => a + k.anzahl, 0);
  gleich(kategorie, kern.filtere(alle, zustand).length, 'Kategoriezähler ignorieren den Projektfilter');
});

s.test('Wirkung berücksichtigt die Richtung der Kennzahl', () => {
  nahe(kern.verbesserung({ vorher: 100, nachher: 50, richtung: 'kleiner_besser' }), 50, 0.001);
  nahe(kern.verbesserung({ vorher: 100, nachher: 50, richtung: 'groesser_besser' }), -50, 0.001);
  nahe(kern.verbesserung({ vorher: 2.8, nachher: 5.1, richtung: 'groesser_besser' }), 82.14, 0.01);
  gleich(kern.verbesserung({ vorher: 0, nachher: 5, richtung: 'groesser_besser' }), null);
  gleich(kern.verbesserung(null), null);
});

s.test('verworfene Variante zeigt eine negative Wirkung', () => {
  const e = alle.find((x) => x.id === 'SCR-2025-013');
  wahr(kern.mittlereWirkung(e) < 0, 'verworfener Beleg wird als Verbesserung ausgewiesen');
});

s.test('Sortierungen ordnen wie erwartet', () => {
  const menge = kern.filtere(alle, { archiv: 'alle' });
  const neu = kern.sortiere(menge, 'datum-neu');
  const alt = kern.sortiere(menge, 'datum-alt');
  wahr(neu[0].datum >= neu[neu.length - 1].datum, 'datum-neu sortiert aufsteigend');
  gleich(alt[0].datum, neu[neu.length - 1].datum, 'Umkehrung der Sortierung stimmt nicht');
  const titel = kern.sortiere(menge, 'titel').map((e) => e.titel);
  tieferGleich(titel, [...titel].sort((a, b) => a.localeCompare(b, 'de')), 'Titelsortierung ist nicht alphabetisch');
  const wirkung = kern.sortiere(menge, 'wirkung');
  wahr(kern.mittlereWirkung(wirkung[0]) >= kern.mittlereWirkung(wirkung[1]), 'Wirkungssortierung stimmt nicht');
  gleich(menge.length, wirkung.length, 'Sortierung verändert die Menge');
});

s.test('Kennzahlen summieren sich zur Gesamtmenge', () => {
  const k = kern.kennzahlen(kern.filtere(alle, { archiv: 'alle' }));
  gleich(k.anzahl, daten.eintraege.length);
  gleich(k.uebernommen + k.inPruefung + k.verworfen, k.anzahl, 'Statuszählung geht nicht auf');
  gleich(k.aufnahmen, k.anzahl * 2);
  wahr(k.von <= k.bis, 'Zeitraum verdreht');
});

s.test('leere Menge liefert nutzbare Kennzahlen', () => {
  const k = kern.kennzahlen([]);
  gleich(k.anzahl, 0);
  gleich(k.mittlereWirkung, null);
  gleich(kern.formatiereWirkung(k.mittlereWirkung), '–');
});

s.test('Zustand überlebt den Weg durch die Adresszeile', () => {
  const zustand = {
    suche: 'kontrast wcag',
    projekte: ['oneSCM Portal', 'Admin-Konsole'],
    kategorien: ['Barrierefreiheit'],
    status: [],
    viewports: ['mobil'],
    archiv: 'alle',
    sortierung: 'wirkung',
    auswahl: 'SCR-2025-001',
    ansicht: 'eingang'
  };
  const zurueck = kern.queryZuZustand(kern.zustandZuQuery(zustand));
  tieferGleich(zurueck, zustand, 'Zustand geht beim Ein- und Auslesen verloren');
});

s.test('Standardzustand erzeugt eine leere Adresse', () => {
  gleich(kern.zustandZuQuery(kern.STANDARD_ZUSTAND), '');
  tieferGleich(kern.queryZuZustand(''), { ...kern.STANDARD_ZUSTAND });
});

s.test('unsinnige Adressparameter fallen auf die Vorgabe zurück', () => {
  const z = kern.queryZuZustand('#a=quatsch&sort=zufall');
  gleich(z.archiv, 'aktiv');
  gleich(z.sortierung, 'datum-neu');
});

s.test('aktive Filter werden korrekt gezählt', () => {
  gleich(kern.anzahlAktiverFilter(kern.STANDARD_ZUSTAND), 0);
  gleich(kern.anzahlAktiverFilter({ projekte: ['a', 'b'], suche: 'x', archiv: 'archiv' }), 4);
});

s.test('Formatierungen folgen deutscher Schreibweise', () => {
  gleich(kern.formatiereDatum('2025-03-04'), '04.03.2025');
  gleich(kern.formatiereDatum(null), '–');
  gleich(kern.formatiereZahl(16.25, 1), '16,3');
  gleich(kern.formatiereZahl(12), '12');
  gleich(kern.formatiereWirkung(82.14), '+82,1 %');
  gleich(kern.formatiereWirkung(-7.8), '−7,8 %');
});

s.test('Statusart bleibt an die Schreibweise unabhängig gekoppelt', () => {
  gleich(kern.statusArt('übernommen'), 'gut');
  gleich(kern.statusArt('in Prüfung'), 'warn');
  gleich(kern.statusArt('verworfen'), 'neutral');
  gleich(kern.statusArt('unbekannt'), 'neutral');
});

export default s;
