/** Kernlogik von Aufnahme und Eingang - ohne Browser. */
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import * as kern from '../../app/src/core.mjs';

const s = suite('Aufnahme – Kernlogik');

const quelle = { art: 'beispiel', name: 'Probe', breite: 1440, hoehe: 900 };
const viewports = [
  { id: 'desktop', label: 'Desktop', breite: 1440, hoehe: 900 },
  { id: 'tablet', label: 'Tablet', breite: 1024, hoehe: 768 },
  { id: 'mobil', label: 'Mobil', breite: 390, hoehe: 844 }
];
const gueltigerEntwurf = () => ({ ...kern.leereAufnahme('2025-06-30'), projekt: 'oneSCM Portal' });

s.test('leerer Entwurf übernimmt die Vorlage, aber nie den Titel', () => {
  const vorlage = { projekt: 'Admin-Konsole', autor: 'T. Weiß', begriffe: ['kontrast'], titel: 'alt' };
  const entwurf = kern.leereAufnahme('2025-06-30', vorlage);
  gleich(entwurf.titel, '', 'der Titel darf nicht mitwandern');
  gleich(entwurf.projekt, 'Admin-Konsole');
  gleich(entwurf.autor, 'T. Weiß');
  gleich(entwurf.datum, '2025-06-30');
  tieferGleich(entwurf.begriffe, ['kontrast']);
  entwurf.begriffe.push('neu');
  tieferGleich(vorlage.begriffe, ['kontrast'], 'die Vorlage wurde verändert');
});

s.test('Kennungen zählen je Jahr fortlaufend weiter', () => {
  gleich(kern.naechsteAufnahmeKennung([], '2025-03-04'), 'AUF-2025-001');
  gleich(kern.naechsteAufnahmeKennung([{ id: 'AUF-2025-001' }, { id: 'AUF-2025-002' }], '2025-03-04'), 'AUF-2025-003');
  gleich(kern.naechsteAufnahmeKennung([{ id: 'AUF-2024-099' }], '2025-01-02'), 'AUF-2025-001', 'Vorjahr zählt nicht mit');
  gleich(kern.naechsteAufnahmeKennung([{ id: 'AUF-2025-007' }, { id: 'kaputt' }, {}], '2025-12-31'), 'AUF-2025-008');
});

s.test('Begriffe werden vereinheitlicht', () => {
  tieferGleich(kern.normalisiereBegriffe('#Kontrast, navigation ; KONTRAST'), ['kontrast', 'navigation']);
  tieferGleich(kern.normalisiereBegriffe('  '), []);
  tieferGleich(kern.normalisiereBegriffe(['Offene   Freigaben']), ['offene freigaben'], 'innere Leerzeichen werden gestaucht');
  gleich(kern.normalisiereBegriffe(Array.from({ length: 30 }, (_, i) => 'b' + i)).length, kern.HOECHSTZAHL_BEGRIFFE);
  gleich(kern.begriffeAlsText(['a', 'b']), 'a, b');
});

s.test('Datumsprüfung erkennt unmögliche Angaben', () => {
  wahr(kern.istGueltigesDatum('2025-06-30'));
  wahr(!kern.istGueltigesDatum('2025-02-31'), '31. Februar wird durchgelassen');
  wahr(!kern.istGueltigesDatum('30.06.2025'));
  wahr(!kern.istGueltigesDatum(''));
  wahr(!kern.istGueltigesDatum(null));
});

s.test('Auslösen wird nur bei echten Hindernissen verweigert', () => {
  gleich(kern.pruefeEntwurf(gueltigerEntwurf(), quelle, { x: 0, y: 0, breite: 400, hoehe: 300 }, '2025-06-30').length, 0);
  const ohneQuelle = kern.pruefeEntwurf(gueltigerEntwurf(), null, null, '2025-06-30');
  gleich(ohneQuelle[0].feld, 'quelle');
  const zuKlein = kern.pruefeEntwurf(gueltigerEntwurf(), quelle, { x: 0, y: 0, breite: 10, hoehe: 300 }, '2025-06-30');
  gleich(zuKlein[0].feld, 'ausschnitt');
  const zukunft = kern.pruefeEntwurf({ ...gueltigerEntwurf(), datum: '2030-01-01' }, quelle, { breite: 99, hoehe: 99 }, '2025-06-30');
  gleich(zukunft[0].feld, 'datum');
});

s.test('fehlende Kategorie und Begriffe verhindern das Auslösen nicht', () => {
  const entwurf = { ...kern.leereAufnahme('2025-06-30'), kategorie: '', begriffe: [], projekt: '', titel: '' };
  gleich(kern.pruefeEntwurf(entwurf, quelle, { x: 0, y: 0, breite: 200, hoehe: 200 }, '2025-06-30').length, 0);
});

s.test('Ausschnitt bleibt innerhalb der Quelle', () => {
  tieferGleich(kern.begrenzeAusschnitt({ x: -50, y: -20, breite: 300, hoehe: 200 }, quelle), { x: 0, y: 0, breite: 300, hoehe: 200 });
  tieferGleich(kern.begrenzeAusschnitt({ x: 1400, y: 880, breite: 300, hoehe: 200 }, quelle), { x: 1140, y: 700, breite: 300, hoehe: 200 });
  const zuGross = kern.begrenzeAusschnitt({ x: 0, y: 0, breite: 5000, hoehe: 5000 }, quelle);
  tieferGleich(zuGross, { x: 0, y: 0, breite: 1440, hoehe: 900 });
  const zuKlein = kern.begrenzeAusschnitt({ x: 10, y: 10, breite: 2, hoehe: 2 }, quelle);
  gleich(zuKlein.breite, kern.MINDEST_AUSSCHNITT);
  gleich(kern.begrenzeAusschnitt({ x: 10.6, y: 10.2, breite: 100.7, hoehe: 50.4 }, quelle).x, 11, 'wird nicht gerundet');
});

s.test('Vorgabeausschnitte sitzen mittig und passen ins Bild', () => {
  tieferGleich(kern.presetAusschnitt('voll', quelle, viewports), { x: 0, y: 0, breite: 1440, hoehe: 900 });
  const mobil = kern.presetAusschnitt('mobil', quelle, viewports);
  gleich(mobil.breite, 390);
  gleich(mobil.hoehe, 844);
  gleich(mobil.x, Math.round((1440 - 390) / 2), 'nicht mittig');
  const kleineQuelle = { breite: 400, hoehe: 300 };
  const gestaucht = kern.presetAusschnitt('desktop', kleineQuelle, viewports);
  wahr(gestaucht.breite <= 400 && gestaucht.hoehe <= 300, 'Vorgabe läuft aus der Quelle heraus');
  gleich(kern.presetAusschnitt('gibtsnicht', quelle, viewports), null);
  gleich(kern.presetAusschnitt('voll', null, viewports), null);
});

s.test('Titelvorschlag springt nur ein, wenn nichts eingetragen ist', () => {
  gleich(kern.titelVorschlag({ titel: 'Eigener Titel' }, 'AUF-2025-004'), 'Eigener Titel');
  gleich(kern.titelVorschlag({ titel: '   ' }, 'AUF-2025-004'), 'Aufnahme 004 vom –'.replace('–', kern.formatiereDatum(undefined)));
  gleich(
    kern.titelVorschlag({ projekt: 'oneSCM Portal', seite: '/portal/uebersicht' }, 'AUF-2025-012'),
    'oneSCM Portal /portal/uebersicht – Aufnahme 012'
  );
});

s.test('gebaute Aufnahme ist vollständig und aufgeräumt', () => {
  const aufnahme = kern.baueAufnahme({
    entwurf: { ...gueltigerEntwurf(), titel: '  Kopfzeile  ', begriffe: ['#Kontrast', 'kontrast'], notiz: ' Notiz ' },
    bild: 'data:image/jpeg;base64,AAA',
    ausschnitt: { x: 10, y: 20, breite: 300, hoehe: 200 },
    quelle,
    kennung: 'AUF-2025-001',
    erfasstAm: '2025-06-30T10:00:00.000Z'
  });
  gleich(aufnahme.id, 'AUF-2025-001');
  gleich(aufnahme.titel, 'Kopfzeile', 'Leerzeichen bleiben stehen');
  tieferGleich(aufnahme.begriffe, ['kontrast'], 'Begriffe nicht vereinheitlicht');
  gleich(aufnahme.notiz, 'Notiz');
  gleich(aufnahme.quelle.art, 'beispiel');
  tieferGleich(aufnahme.ausschnitt, { x: 10, y: 20, breite: 300, hoehe: 200 });
  wahr(aufnahme.bild.startsWith('data:image/'), 'Bild fehlt');
});

s.test('Vollständigkeit verlangt Titel, Projekt, Kategorie und Begriffe', () => {
  const voll = { titel: 'T', projekt: 'P', kategorie: 'Layout', begriffe: ['x'] };
  wahr(kern.istVollstaendig(voll));
  wahr(!kern.istVollstaendig({ ...voll, kategorie: '' }), 'ohne Kategorie gilt als vollständig');
  wahr(!kern.istVollstaendig({ ...voll, begriffe: [] }), 'ohne Begriffe gilt als vollständig');
  wahr(!kern.istVollstaendig({ ...voll, projekt: '  ' }));
  wahr(!kern.istVollstaendig(null));
});

const eingangProbe = () => [
  { id: 'AUF-2025-001', titel: 'Kopfzeile', projekt: 'oneSCM Portal', seite: '/a', kategorie: 'Layout', status: 'in Prüfung', begriffe: ['kontrast'], notiz: '', datum: '2025-06-01', erfasst_am: '2025-06-01T10:00:00.000Z', bild: 'data:image/jpeg;base64,A', ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 }, quelle: { art: 'datei' } },
  { id: 'AUF-2025-002', titel: 'Fußzeile', projekt: 'Admin-Konsole', seite: '/b', kategorie: '', status: 'in Prüfung', begriffe: [], notiz: 'Rand prüfen', datum: '2025-06-02', erfasst_am: '2025-06-02T10:00:00.000Z', bild: 'data:image/jpeg;base64,B', ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 }, quelle: { art: 'datei' } },
  { id: 'AUF-2025-003', titel: 'Anmeldung', projekt: 'oneSCM Portal', seite: '/c', kategorie: 'Formular', status: 'übernommen', begriffe: ['formular', 'fehler'], notiz: '', datum: '2025-06-03', erfasst_am: '2025-06-03T10:00:00.000Z', bild: 'data:image/jpeg;base64,C', ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 }, quelle: { art: 'beispiel' } }
];

s.test('Eingang lässt sich filtern', () => {
  const liste = eingangProbe();
  gleich(kern.filtereEingang(liste, {}).length, 3);
  gleich(kern.filtereEingang(liste, { zustand: 'offen' }).length, 1, 'unvollständige Aufnahmen falsch gezählt');
  gleich(kern.filtereEingang(liste, { zustand: 'offen' })[0].id, 'AUF-2025-002');
  gleich(kern.filtereEingang(liste, { zustand: 'fertig' }).length, 2);
  gleich(kern.filtereEingang(liste, { projekte: ['oneSCM Portal'] }).length, 2);
  gleich(kern.filtereEingang(liste, { kategorien: ['Formular'] }).length, 1);
  gleich(kern.filtereEingang(liste, { suche: 'fußzeile' }).length, 1, 'Suche über den Titel greift nicht');
  gleich(kern.filtereEingang(liste, { suche: 'fusszeile' }).length, 1, 'ß wird nicht aufgelöst');
  gleich(kern.filtereEingang(liste, { suche: 'rand' })[0].id, 'AUF-2025-002', 'Notiz wird nicht durchsucht');
  gleich(kern.filtereEingang(liste, { suche: 'formular fehler' }).length, 1, 'Begriffe werden nicht durchsucht');
});

s.test('Eingang lässt sich sortieren', () => {
  const liste = eingangProbe();
  gleich(kern.sortiereEingang(liste, 'neu')[0].id, 'AUF-2025-003');
  gleich(kern.sortiereEingang(liste, 'alt')[0].id, 'AUF-2025-001');
  gleich(kern.sortiereEingang(liste, 'titel')[0].titel, 'Anmeldung');
  gleich(kern.sortiereEingang(liste, 'projekt')[0].projekt, 'Admin-Konsole');
  gleich(kern.sortiereEingang(liste, 'neu').length, 3, 'Sortierung verändert die Menge');
});

s.test('Kennzahlen des Eingangs', () => {
  const k = kern.eingangKennzahlen(eingangProbe());
  gleich(k.anzahl, 3);
  gleich(k.fertig, 2);
  gleich(k.offen, 1);
  gleich(k.projekte, 2);
  gleich(k.begriffe, 3);
  wahr(k.bytes > 0);
  gleich(kern.eingangKennzahlen([]).anzahl, 0);
});

s.test('Speicher wird nachsichtig gelesen', () => {
  gleich(kern.leseEingang(null).length, 0);
  gleich(kern.leseEingang('{kaputt').length, 0, 'kaputtes JSON wirft');
  gleich(kern.leseEingang(JSON.stringify(eingangProbe())).length, 3, 'reine Liste wird nicht angenommen');
  const mitMuell = JSON.stringify({
    version: 1,
    aufnahmen: [...eingangProbe(), { id: 'ohne-bild' }, null, { bild: 'data:image/jpeg;base64,X' }]
  });
  gleich(kern.leseEingang(mitMuell).length, 3, 'unbrauchbare Sätze werden übernommen');
  const kaputtesDatum = kern.leseEingang(
    JSON.stringify({ aufnahmen: [{ ...eingangProbe()[0], datum: 'gestern' }] })
  );
  gleich(kaputtesDatum[0].datum, '2025-06-01', 'unlesbares Datum wird nicht aus der Erfassung ersetzt');
});

s.test('Schreiben und Lesen ergeben denselben Stand', () => {
  const liste = eingangProbe();
  const zurueck = kern.leseEingang(kern.schreibeEingang(liste));
  gleich(zurueck.length, liste.length);
  gleich(zurueck[0].id, liste[0].id);
  tieferGleich(zurueck[2].begriffe, liste[2].begriffe);
  gleich(JSON.parse(kern.schreibeEingang(liste)).version, kern.EINGANG_VERSION);
});

s.test('Ausgabe enthält die Bilder nur auf Wunsch', () => {
  const ohne = JSON.parse(kern.eingangAlsExport(eingangProbe(), '2025-06-30'));
  gleich(ohne.anzahl, 3);
  gleich(ohne.mit_bildern, false);
  gleich(ohne.aufnahmen[0].bild, undefined, 'Bilddaten stecken in der kleinen Ausgabe');
  wahr(ohne.aufnahmen[0].bild_bytes > 0);
  const mit = JSON.parse(kern.eingangAlsExport(eingangProbe(), '2025-06-30', true));
  gleich(mit.mit_bildern, true);
  wahr(String(mit.aufnahmen[0].bild).startsWith('data:image/'), 'Bilddaten fehlen in der vollen Ausgabe');
});

s.test('Speichergrößen werden lesbar dargestellt', () => {
  gleich(kern.formatiereBytes(0), '0 kB');
  gleich(kern.formatiereBytes(2048), '2 kB');
  gleich(kern.formatiereBytes(3 * 1024 * 1024), '3 MB');
});

s.test('die Ansicht steht in der Adresszeile', () => {
  gleich(kern.zustandZuQuery({ ...kern.STANDARD_ZUSTAND, ansicht: 'eingang' }), 'ans=eingang');
  gleich(kern.queryZuZustand('#ans=aufnahme').ansicht, 'aufnahme');
  gleich(kern.queryZuZustand('#ans=quatsch').ansicht, 'archiv', 'unbekannte Ansicht wird nicht abgefangen');
  gleich(kern.zustandZuQuery(kern.STANDARD_ZUSTAND), '', 'die Vorgabe steht unnötig in der Adresse');
});

export default s;
