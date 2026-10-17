/** Kernlogik von Aufnahme und Eingang - ohne Browser. */
import { suite, wahr, gleich, tieferGleich } from '../hilfen/pruefe.mjs';
import * as kern from '../../app/src/core.mjs';
import { erzeugePng } from '../hilfen/bild.mjs';
import { baueZip, bauePptx, baueDocx, bauePdf, baueTestPng } from '../hilfen/dateien.mjs';

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

/* ---------------------------------------------------------------- Ablage */

s.test('Dateinamen entstehen aus dem Muster', () => {
  gleich(kern.dateinameAus('screenarchiv-{datum}-{nummer}', { datum: '2026-08-28', nummer: '007' }), 'screenarchiv-2026-08-28-007.png');
  gleich(kern.dateinameAus('{projekt}-{titel}', { projekt: 'oneSCM Portal', titel: 'Kopfzeile & Menü!' }), 'onescm-portal-kopfzeile-menue.png');
  gleich(kern.dateinameAus('{kategorie}', { kategorie: 'Farbe & Kontrast' }), 'farbe-kontrast.png');
  gleich(kern.dateinameAus('', {}), 'screenarchiv-.png'.replace('-.', '.'), 'leeres Muster fällt nicht auf die Vorgabe zurück');
});

s.test('Dateinamen bleiben unbedenklich', () => {
  gleich(kern.bereinigeDateiname('../../etc/passwd'), 'etc-passwd', 'Pfadangaben werden nicht entschärft');
  gleich(kern.bereinigeDateiname('Bild: "Kopf" <1>'), 'bild-kopf-1');
  gleich(kern.bereinigeDateiname('   '), '');
  gleich(kern.bereinigeDateiname('ÄÖÜ Straße'), 'aeoeue-strasse');
  wahr(kern.bereinigeDateiname('x'.repeat(200)).length <= 60, 'der Name wird nicht begrenzt');
  gleich(kern.dateinameAus('{titel}', { titel: '///' }), 'aufnahme.png', 'ohne brauchbaren Rest fehlt der Ersatzname');
});

s.test('ein unbekannter Baustein fällt im Namen auf', () => {
  gleich(kern.dateinameAus('{schirm}-{datum}', { datum: '2026-08-28' }), 'schirm-2026-08-28.png');
});

s.test('ohne Ziel wird das Ausschneiden verweigert', () => {
  gleich(kern.pruefeAblage(kern.ABLAGE_STANDARD).length, 0);
  gleich(kern.pruefeAblage({ eingang: false, ordner: false, datei: false })[0].feld, 'ziel');
  gleich(kern.pruefeAblage({ eingang: true, muster: '  ' })[0].feld, 'muster');
  gleich(kern.pruefeAblage({ eingang: false, ordner: true, datei: false }).length, 0, 'ein Ordner allein reicht nicht');
});

s.test('die Ablage überlebt das Speichern – der Ordner bewusst nicht', () => {
  const gewaehlt = { eingang: false, ordner: true, datei: true, muster: '{projekt}-{nummer}' };
  const zurueck = kern.leseAblage(kern.schreibeAblage(gewaehlt));
  gleich(zurueck.eingang, false);
  gleich(zurueck.datei, true);
  gleich(zurueck.muster, '{projekt}-{nummer}');
  gleich(zurueck.ordner, false, 'der Zugriff auf einen Ordner lässt sich nicht mitspeichern');
  tieferGleich(kern.leseAblage('{kaputt'), { ...kern.ABLAGE_STANDARD }, 'kaputter Speicher wirft');
  gleich(kern.leseAblage(null).eingang, true);
});

s.test('die gewählten Ziele lassen sich in einem Satz nennen', () => {
  gleich(kern.beschreibeAblage({ eingang: true, ordner: false, datei: false }), 'Eingang');
  gleich(kern.beschreibeAblage({ eingang: true, ordner: true, datei: true }, 'Bilder'), 'Eingang + Ordner „Bilder“ + Datei');
  gleich(kern.beschreibeAblage({ eingang: false, ordner: false, datei: false }), 'kein Ziel');
});

s.test('der Beipackzettel führt alle Felder in fester Folge', () => {
  const zettel = JSON.parse(
    kern.baueBeipackzettel({
      entwurf: {
        titel: '  Kopfzeile  ',
        projekt: 'oneSCM Portal',
        seite: '/portal/uebersicht',
        kategorie: 'Layout',
        status: 'in Prüfung',
        rolle: 'vorher',
        begriffe: ['#Kontrast', 'kontrast', 'raster'],
        notiz: ' Notiz ',
        autor: 'M. A.',
        browser: 'Chrome 141',
        datum: '2026-08-31'
      },
      bildname: 'beleg-001.png',
      ausschnitt: { x: 10, y: 20, breite: 300, hoehe: 200 },
      quelle: { art: 'bildschirm', name: 'Geteilter Bildschirm', breite: 1600, hoehe: 900 },
      erfasstAm: '2026-08-31T12:00:00.000Z',
      anwendung: '1.9.0'
    })
  );
  gleich(zettel.beipackzettel, kern.BEIPACKZETTEL_VERSION);
  gleich(zettel.erzeugt_von, 'Screenarchiv 1.9.0');
  gleich(zettel.bild, 'beleg-001.png');
  gleich(zettel.titel, 'Kopfzeile', 'Leerzeichen bleiben stehen');
  gleich(zettel.notiz, 'Notiz');
  tieferGleich(zettel.begriffe, ['kontrast', 'raster'], 'Begriffe nicht vereinheitlicht');
  tieferGleich(zettel.ausschnitt, { x: 10, y: 20, breite: 300, hoehe: 200 });
  gleich(zettel.quelle.name, 'Geteilter Bildschirm');
  gleich(zettel.rolle, 'vorher');
  tieferGleich(
    Object.keys(zettel),
    ['beipackzettel', 'erzeugt_von', 'bild', 'erfasst_am', 'datum', 'titel', 'projekt', 'seite', 'kategorie',
     'status', 'rolle', 'begriffe', 'notiz', 'autor', 'browser', 'ausschnitt', 'quelle',
     'unkenntlich_gemacht', 'marken'],
    'die Feldfolge ist nicht stabil'
  );
});

s.test('der Beipackzettel bleibt auch ohne Angaben vollständig geformt', () => {
  const zettel = JSON.parse(kern.baueBeipackzettel({ bildname: 'a.png' }));
  gleich(Object.keys(zettel).length, 19, 'Felder fehlen, wenn nichts eingetragen ist');
  gleich(zettel.titel, '');
  tieferGleich(zettel.begriffe, []);
  gleich(zettel.ausschnitt, null);
  gleich(zettel.quelle, null);
  gleich(zettel.erzeugt_von, 'Screenarchiv');
});

s.test('der Beipackzettel heißt wie sein Bild', () => {
  gleich(kern.beipackzettelName('schirm-001.png'), 'schirm-001.json');
  gleich(kern.beipackzettelName('a.b.c.jpeg'), 'a.b.c.json');
  gleich(kern.beipackzettelName('ohne-endung'), 'ohne-endung.json');
});

s.test('ein gelesener Beipackzettel trägt alle Zeilen in fester Folge', () => {
  const text = kern.baueBeipackzettel({
    entwurf: {
      datum: '2025-06-30',
      titel: 'Kopfzeile ohne Kontrast',
      projekt: 'oneSCM Portal',
      kategorie: 'Kontrast',
      begriffe: ['kontrast', 'kopfzeile'],
      notiz: 'Vergleich mit 4.2'
    },
    bildname: 'schirm-001.png',
    ausschnitt: { x: 12.4, y: 34.6, breite: 300, hoehe: 200 },
    quelle: { art: 'bildschirm', name: 'Freigabe', breite: 1440, hoehe: 900 },
    erfasstAm: '2025-06-30T09:12:00.000Z',
    anwendung: '1.10.0'
  });
  const gelesen = kern.leseBeipackzettel(text);
  gleich(gelesen.ok, true);
  gleich(gelesen.version, kern.BEIPACKZETTEL_VERSION);
  gleich(gelesen.kuenftig, false);
  tieferGleich(gelesen.fremd, [], 'ein eigener Zettel darf keine fremden Felder melden');
  gleich(gelesen.zeilen.length, kern.BEIPACK_FELDER.length);
  const wert = (schluessel) => gelesen.zeilen.find((z) => z.schluessel === schluessel).wert;
  gleich(wert('bild'), 'schirm-001.png');
  gleich(wert('titel'), 'Kopfzeile ohne Kontrast');
  gleich(wert('begriffe'), 'kontrast, kopfzeile');
  gleich(wert('ausschnitt'), '300 × 200 px ab 12, 35', 'der Ausschnitt wird nicht lesbar gefasst');
  gleich(wert('quelle'), 'Freigabe (bildschirm) · 1440 × 900 px');
  gleich(wert('erzeugt_von'), 'Screenarchiv 1.10.0');
  const leere = gelesen.zeilen.filter((z) => z.leer).map((z) => z.schluessel);
  tieferGleich(
    leere,
    ['seite', 'status', 'rolle', 'autor', 'browser', 'unkenntlich_gemacht', 'marken'],
    'leere Felder werden falsch erkannt'
  );
});

s.test('ein Zettel ohne Angaben zeigt jede Zeile als leer, nicht als Lücke', () => {
  const gelesen = kern.leseBeipackzettel(kern.baueBeipackzettel({ bildname: 'a.png' }));
  gleich(gelesen.ok, true);
  gleich(gelesen.zeilen.length, kern.BEIPACK_FELDER.length);
  gleich(gelesen.zeilen.filter((z) => z.leer).length, kern.BEIPACK_FELDER.length - 2, 'Bild und Erzeuger sind gefüllt');
});

s.test('ein beschädigter oder fremder Zettel wird benannt, nicht verschluckt', () => {
  const kaputt = kern.leseBeipackzettel('{ kein json');
  gleich(kaputt.ok, false);
  wahr(/JSON/.test(kaputt.grund), 'der Grund nennt das Problem nicht: ' + kaputt.grund);
  tieferGleich(kaputt.zeilen, []);
  gleich(kern.leseBeipackzettel('[1,2]').ok, false, 'eine Liste ist kein Zettel');
  gleich(kern.leseBeipackzettel('null').ok, false);

  const fremd = kern.leseBeipackzettel(
    JSON.stringify({ beipackzettel: 99, bild: 'a.png', eigenes_feld: 'x', zweites: 1 })
  );
  gleich(fremd.ok, true, 'ein fremder Zettel bleibt lesbar');
  gleich(fremd.kuenftig, true, 'die höhere Zettelversion fällt nicht auf');
  tieferGleich(fremd.fremd, ['eigenes_feld', 'zweites']);
});

s.test('unbrauchbare Werte im Zettel gelten als leer', () => {
  const gelesen = kern.leseBeipackzettel(
    JSON.stringify({ beipackzettel: 1, ausschnitt: { breite: 'x' }, quelle: {}, begriffe: 'a, b' })
  );
  const wert = (schluessel) => gelesen.zeilen.find((z) => z.schluessel === schluessel).wert;
  gleich(wert('ausschnitt'), '', 'ein unvollständiger Ausschnitt wird erfunden');
  gleich(wert('quelle'), '');
  gleich(wert('begriffe'), 'a, b', 'Begriffe als Text müssen lesbar bleiben');
});

s.test('aus einem Zettel entsteht wieder eine Aufnahme für den Eingang', () => {
  const text = kern.baueBeipackzettel({
    entwurf: {
      datum: '2025-06-30',
      titel: 'Kopfzeile ohne Kontrast',
      projekt: 'oneSCM Portal',
      kategorie: 'Barrierefreiheit',
      begriffe: ['kontrast'],
      notiz: 'Vergleich mit 4.2',
      autor: 'M. Ackermann',
      status: 'übernommen',
      rolle: 'vorher'
    },
    bildname: 'schirm-001.png',
    ausschnitt: { x: 12, y: 34, breite: 300, hoehe: 200 },
    quelle: { art: 'bildschirm', name: 'Freigabe', breite: 1440, hoehe: 900 },
    erfasstAm: '2025-06-30T09:12:00.000Z'
  });
  const aufnahme = kern.aufnahmeAusZettel({
    daten: kern.leseBeipackzettel(text).daten,
    bild: 'data:image/jpeg;base64,AAAA',
    kennung: 'AUF-2025-007',
    ordner: 'Bildschirmfotos',
    datei: 'schirm-001.png',
    zettelDatei: 'schirm-001.json',
    erfasstAm: '2026-10-17T10:00:00.000Z'
  });
  gleich(aufnahme.id, 'AUF-2025-007');
  gleich(aufnahme.titel, 'Kopfzeile ohne Kontrast');
  gleich(aufnahme.projekt, 'oneSCM Portal');
  gleich(aufnahme.kategorie, 'Barrierefreiheit');
  gleich(aufnahme.status, 'übernommen', 'der Status des Zettels geht verloren');
  gleich(aufnahme.rolle, 'vorher');
  gleich(aufnahme.datum, '2025-06-30', 'das Datum der Aufnahme, nicht der Übernahme');
  gleich(aufnahme.erfasst_am, '2025-06-30T09:12:00.000Z', 'der Zeitpunkt der Aufnahme bleibt stehen');
  tieferGleich(aufnahme.begriffe, ['kontrast']);
  tieferGleich(aufnahme.ausschnitt, { x: 12, y: 34, breite: 300, hoehe: 200 });
  gleich(aufnahme.quelle.name, 'Freigabe');
  gleich(aufnahme.herkunft.datei, 'schirm-001.png');
  gleich(aufnahme.herkunft.zettel, 'schirm-001.json');
  gleich(aufnahme.herkunft.uebernommen_am, '2026-10-17T10:00:00.000Z');
  wahr(kern.istVollstaendig(aufnahme), 'eine vollständige Datei kommt unvollständig an');
  // Der Weg hin und zurueck darf nichts verlieren.
  const zurueck = JSON.parse(
    kern.baueBeipackzettel({ entwurf: aufnahme, bildname: 'schirm-001.png', ausschnitt: aufnahme.ausschnitt, quelle: aufnahme.quelle })
  );
  gleich(zurueck.titel, 'Kopfzeile ohne Kontrast');
  gleich(zurueck.kategorie, 'Barrierefreiheit');
});

s.test('ein lückenhafter Zettel wird übernommen, ohne etwas zu erfinden', () => {
  const aufnahme = kern.aufnahmeAusZettel({
    daten: { bild: 'a.png', erfasst_am: '2026-02-03T07:00:00.000Z', ausschnitt: { breite: 'x' } },
    bild: 'data:image/jpeg;base64,AAAA',
    kennung: 'AUF-2026-001',
    ordner: 'Ordner',
    datei: 'a.png'
  });
  gleich(aufnahme.datum, '2026-02-03', 'ohne Datum zählt der Erfassungszeitpunkt');
  gleich(aufnahme.titel, 'Aufnahme 001 vom 03.02.2026', 'ohne Titel braucht es einen Vorschlag');
  gleich(aufnahme.kategorie, '');
  gleich(aufnahme.status, 'in Prüfung');
  tieferGleich(aufnahme.ausschnitt, { x: 0, y: 0, breite: 0, hoehe: 0 }, 'halbe Maße werden geraten');
  gleich(aufnahme.quelle.name, 'a.png', 'ohne Quelle steht wenigstens die Datei da');
  gleich(kern.istVollstaendig(aufnahme), false);
});

s.test('dieselbe Datei wird über Ordner und Namen wiedererkannt', () => {
  const liste = [
    kern.aufnahmeAusZettel({
      daten: {},
      bild: 'data:image/jpeg;base64,AAAA',
      kennung: 'AUF-2026-001',
      ordner: 'Bildschirmfotos',
      datei: 'schirm-001.png'
    })
  ];
  wahr(kern.findeUebernahme(liste, 'Bildschirmfotos', 'schirm-001.png'), 'die Datei wird nicht wiedererkannt');
  wahr(kern.findeUebernahme(liste, 'bildschirmfotos', 'SCHIRM-001.PNG'), 'Groß- und Kleinschreibung trennt');
  gleich(kern.findeUebernahme(liste, 'Anderer Ordner', 'schirm-001.png'), null, 'der Ordner wird nicht beachtet');
  gleich(kern.findeUebernahme(liste, 'Bildschirmfotos', 'schirm-002.png'), null);
  gleich(kern.findeUebernahme([{ id: 'AUF-2026-009' }], 'Bildschirmfotos', 'schirm-001.png'), null, 'eine eigene Aufnahme ohne Herkunft darf nicht passen');
});

s.test('eine übernommene Aufnahme überlebt das Speichern', () => {
  const aufnahme = kern.aufnahmeAusZettel({
    daten: { titel: 'Aus dem Ordner' },
    bild: 'data:image/jpeg;base64,AAAA',
    kennung: 'AUF-2026-001',
    ordner: 'Bildschirmfotos',
    datei: 'schirm-001.png'
  });
  const gelesen = kern.leseEingang(kern.schreibeEingang([aufnahme]));
  gleich(gelesen.length, 1);
  tieferGleich(gelesen[0].herkunft, aufnahme.herkunft, 'die Herkunft überlebt den Speicher nicht');
});

s.test('der Zettel wird nur im richtigen, geöffneten Ordner nachgeschrieben', () => {
  const ausOrdner = {
    id: 'AUF-2026-001',
    herkunft: { ordner: 'Bildschirmfotos', datei: 'schirm-001.png', zettel: 'schirm-001.json' }
  };
  const ziel = kern.zettelZiel(ausOrdner, 'Bildschirmfotos');
  gleich(ziel.moeglich, true);
  gleich(ziel.datei, 'schirm-001.json');
  gleich(ziel.bild, 'schirm-001.png');

  const ohneZettel = { herkunft: { ordner: 'Bildschirmfotos', datei: 'schirm-002.png', zettel: '' } };
  gleich(kern.zettelZiel(ohneZettel, 'Bildschirmfotos').datei, 'schirm-002.json', 'ohne Zettel muss der Name entstehen');

  const zu = kern.zettelZiel(ausOrdner, '');
  gleich(zu.moeglich, false);
  wahr(/Bildschirmfotos/.test(zu.grund) && /Ausschneiden/.test(zu.grund), 'der Grund nennt den Weg nicht: ' + zu.grund);

  const falsch = kern.zettelZiel(ausOrdner, 'Andere Bilder');
  gleich(falsch.moeglich, false);
  wahr(/Andere Bilder/.test(falsch.grund) && /Bildschirmfotos/.test(falsch.grund), 'der Grund nennt beide Ordner nicht');

  const eigene = kern.zettelZiel({ id: 'AUF-2026-009' }, 'Bildschirmfotos');
  gleich(eigene.moeglich, false);
  wahr(/Ordner/.test(eigene.grund));
});

s.test('der nachgeschriebene Zettel trägt den gepflegten Stand', () => {
  const gepflegt = {
    titel: 'Kopfzeile ohne Kontrast',
    projekt: 'oneSCM Portal',
    kategorie: 'Barrierefreiheit',
    begriffe: ['kontrast'],
    notiz: 'nachgetragen',
    datum: '2026-03-01',
    status: 'übernommen',
    rolle: 'vorher',
    ausschnitt: { x: 1, y: 2, breite: 300, hoehe: 200 },
    quelle: { art: 'bildschirm', name: 'Freigabe', breite: 1440, hoehe: 900 },
    erfasst_am: '2026-03-01T09:00:00.000Z',
    herkunft: { ordner: 'Bildschirmfotos', datei: 'schirm-001.png', zettel: 'schirm-001.json' }
  };
  const zettel = JSON.parse(
    kern.baueBeipackzettel({
      entwurf: gepflegt,
      bildname: kern.zettelZiel(gepflegt, 'Bildschirmfotos').bild,
      ausschnitt: gepflegt.ausschnitt,
      quelle: gepflegt.quelle,
      erfasstAm: gepflegt.erfasst_am
    })
  );
  gleich(zettel.bild, 'schirm-001.png');
  gleich(zettel.kategorie, 'Barrierefreiheit', 'die nachgetragene Kategorie fehlt');
  tieferGleich(zettel.begriffe, ['kontrast']);
  gleich(zettel.erfasst_am, '2026-03-01T09:00:00.000Z', 'der Zeitpunkt der Aufnahme wird überschrieben');
  gleich(zettel.herkunft, undefined, 'die Herkunft gehört nicht in den Zettel');
});

s.test('die Ordnersuche trifft Teile des Namens, unabhängig von Schreibweise', () => {
  wahr(kern.passtDateiname('Reklamation-001-2026.png', 'reklamation'));
  wahr(kern.passtDateiname('Reklamation-001-2026.png', 'REKL 2026'), 'mehrere Teile müssen alle passen');
  wahr(kern.passtDateiname('schirm-001.png', ''), 'ohne Suchtext passt jeder Name');
  wahr(kern.passtDateiname('gruen-pruefung.png', 'grün'), 'Umlaute trennen die Suche');
  wahr(kern.passtDateiname('Grün-Prüfung.png', 'gruen'), 'Umlaute trennen die Suche andersherum');
  gleich(kern.passtDateiname('schirm-001.png', 'beleg'), false);
  gleich(kern.passtDateiname('schirm-001.png', 'schirm beleg'), false);
});

s.test('die Wahl des Beipackzettels wird gespeichert', () => {
  gleich(kern.ABLAGE_STANDARD.beipack, true, 'der Zettel ist nicht voreingestellt');
  gleich(kern.leseAblage(kern.schreibeAblage({ beipack: false })).beipack, false);
  gleich(kern.leseAblage('{}').beipack, true, 'ohne Angabe fehlt die Vorgabe');
});

s.test('jede fehlende Fähigkeit nennt einen Weg, der statt dessen geht', () => {
  const alles = kern.beschreibeFaehigkeiten({
    ordner: true, datei: true, freigabe: true, zwischenablage: true, speicher: true
  });
  gleich(alles.filter((z) => z.geht).length, 5, 'bei voller Umgebung fehlt etwas');
  const netz = alles.find((z) => /SharePoint/.test(z.name));
  gleich(netz.geht, false, 'die Netzablage kann es nie geben');
  wahr(/synchronisiert/.test(netz.text), 'der Umweg über den Sync-Ordner fehlt');

  const nichts = kern.beschreibeFaehigkeiten({});
  for (const zeile of nichts) {
    gleich(zeile.geht, false);
    wahr(zeile.text.length > 30, `${zeile.name}: die Absage nennt keinen Weg`);
  }
  const freigabe = nichts.find((z) => /Bildschirm/.test(z.name));
  wahr(/eingebettete Ansicht/.test(freigabe.text), 'am Rechner wird die Hülle nicht genannt');
  const amTelefon = kern.beschreibeFaehigkeiten({ beruehrung: true }).find((z) => /Bildschirm/.test(z.name));
  wahr(/Telefon/.test(amTelefon.text) && /Bild öffnen/.test(amTelefon.text), 'am Telefon fehlt der Ausweg');
});

/* -------------------------------------------------------- Designvorlagen */

s.test('jede Vorlage hat Format, Raster und Zweck', () => {
  tieferGleich(kern.VORLAGEN.map((v) => v.id), ['quickguide', 'onepager', 'releaseletter', 'handbuch']);
  for (const v of kern.VORLAGEN) {
    wahr(v.label && v.zweck, `${v.id}: Label oder Zweck fehlt`);
    wahr(kern.FORMATE.some((f) => f.id === v.format), `${v.id}: unbekanntes Format ${v.format}`);
    wahr(v.spalten >= 1 && v.zeilen >= 1, `${v.id}: leeres Raster`);
  }
  // A4 bei 300 dpi - was gedruckt wird, braucht diese Auflösung.
  gleich(kern.format('a4-hoch').breite, 2480);
  gleich(kern.format('a4-hoch').hoehe, 3508);
  gleich(kern.format('erfunden').id, 'a4-hoch', 'ein unbekanntes Format fällt nicht zurück');
});

s.test('die Seitenaufteilung bricht um und füllt die letzte Seite', () => {
  const schritte = Array.from({ length: 7 }, (_, i) => ({ nummer: i + 1 }));
  const quick = kern.seitenAufteilung(schritte, { vorlage: 'quickguide' });
  gleich(quick.seiten.length, 2, 'sechs Kacheln je Seite ergeben zwei Seiten');
  gleich(quick.seiten[0].kacheln.length, 6);
  gleich(quick.seiten[1].kacheln.length, 1);
  gleich(quick.seiten[0].von, 2, 'die Seitenzahl kennt das Ganze nicht');
  // Die letzte Seite mit einer Kachel nutzt die Höhe, statt halb leer zu bleiben.
  wahr(
    quick.seiten[1].kacheln[0].hoehe > quick.seiten[0].kacheln[0].hoehe,
    'die einzelne Kachel bleibt klein'
  );
  // Die Kacheln liegen nebeneinander und übereinander, ohne sich zu überlappen.
  const [a, b, c] = quick.seiten[0].kacheln;
  wahr(b.x > a.x + a.breite - 1, 'zwei Kacheln überlappen waagerecht');
  const zweiteZeile = quick.seiten[0].kacheln[3];
  wahr(zweiteZeile.y > a.y + a.hoehe - 1, 'die zweite Zeile überlappt die erste');
  gleich(c.y, a.y, 'die erste Zeile steht nicht auf einer Höhe');
});

s.test('Text steht je nach Vorlage daneben oder darunter', () => {
  const schritte = [{ nummer: 1 }];
  const handbuch = kern.seitenAufteilung(schritte, { vorlage: 'handbuch' }).seiten[0].kacheln[0];
  gleich(handbuch.textNeben, true);
  wahr(handbuch.bildBreite < handbuch.breite, 'das Bild nimmt die ganze Breite, obwohl Text daneben soll');
  const quick = kern.seitenAufteilung(schritte, { vorlage: 'quickguide' }).seiten[0].kacheln[0];
  gleich(quick.textNeben, false);
  gleich(quick.bildBreite, quick.breite);
  wahr(quick.bildHoehe < quick.hoehe, 'unter dem Bild bleibt kein Platz für Text');
});

s.test('der Text eines Schrittes kommt wahlweise aus dem Handbuch', () => {
  const gliederung = [
    { nummer: '7.5.2', thema: 'Signaturergebnis', kriterium: 'Scope und Quelle bestätigen.' }
  ];
  const aufnahme = { gliederung: '7.5.2', titel: 'Ergebnis prüfen' };
  const mit = kern.schrittText({ anweisung: 'Auf Prüfen klicken', aufnahme, gliederung, mitTexten: true });
  tieferGleich(mit, ['Auf Prüfen klicken', 'Signaturergebnis', 'Scope und Quelle bestätigen.']);
  const ohne = kern.schrittText({ anweisung: 'Auf Prüfen klicken', aufnahme, gliederung, mitTexten: false });
  tieferGleich(ohne, ['Auf Prüfen klicken'], 'ohne Handbuchtexte darf nichts dazukommen');
  // Ohne Anweisung steht der Titel der Aufnahme da.
  tieferGleich(kern.schrittText({ aufnahme, gliederung, mitTexten: false }), ['Ergebnis prüfen']);
});

s.test('lange Texte werden an der Wortgrenze gekürzt', () => {
  const lang = 'Scope, Quelle, Rollen und anwendbare Pflichtprüfungen bestätigen; Freigabebeleg dokumentieren.';
  const kurz = kern.kuerzeText(lang, 40);
  wahr(kurz.length <= 44, 'zu lang: ' + kurz);
  wahr(kurz.endsWith('…'), 'die Kürzung ist nicht erkennbar');
  wahr(!/\s…$/.test(kurz.slice(0, -1)), 'vor dem Auslassungszeichen steht ein Rest');
  gleich(kern.kuerzeText('kurz', 40), 'kurz', 'ein kurzer Text wird angefasst');
});

s.test('der Dateiname eines Blattes nennt Vorlage und Seite', () => {
  gleich(kern.seitenName('quickguide', 'Vorlage anlegen', 1, 1), 'quickguide-vorlage-anlegen.png');
  gleich(kern.seitenName('handbuch', 'Kapitel 7', 2, 3), 'handbuch-kapitel-7-seite-02.png');
});

/* ------------------------------------------------------------ Strecken */

const streckenEingang = [
  { id: 'AUF-2026-001', titel: 'Liste', kapitel: 1, unterkapitel: 1 },
  { id: 'AUF-2026-002', titel: 'Filter', kapitel: 1, unterkapitel: 2 }
];

s.test('eine Strecke braucht Namen, zwei Schritte und je eine Anweisung', () => {
  const leer = kern.leereStrecke('');
  const felder = kern.pruefeStrecke(leer, streckenEingang).map((p) => p.feld);
  wahr(felder.includes('name') && felder.includes('schritte'), 'Name und Schritte werden nicht verlangt');

  const halb = {
    ...kern.leereStrecke('Vorlage anlegen'),
    schritte: [kern.streckeSchritt(streckenEingang[0], 'Menü öffnen'), kern.streckeSchritt(streckenEingang[1], '')]
  };
  const probleme = kern.pruefeStrecke(halb, streckenEingang);
  gleich(probleme.length, 1, 'die fehlende zweite Anweisung fällt nicht auf');
  gleich(probleme[0].feld, 'text-1');

  const fertig = { ...halb, schritte: halb.schritte.map((s) => ({ ...s, text: s.text || 'Filter setzen' })) };
  gleich(kern.pruefeStrecke(fertig, streckenEingang).length, 0);

  // Eine gelöschte Aufnahme sprengt die Strecke nicht, wird aber genannt.
  const verwaist = { ...fertig, schritte: [...fertig.schritte, kern.streckeSchritt('AUF-2026-099', 'weg')] };
  wahr(
    kern.pruefeStrecke(verwaist, streckenEingang).some((p) => /fehlt im Eingang/.test(p.text)),
    'die fehlende Aufnahme wird verschwiegen'
  );
  gleich(kern.streckeMitAufnahmen(verwaist, streckenEingang).length, 2, 'der verwaiste Schritt wird mitgezählt');
});

s.test('die Reihenfolge lässt sich verschieben, ohne etwas zu verlieren', () => {
  const schritte = [
    kern.streckeSchritt(streckenEingang[0], 'eins'),
    kern.streckeSchritt(streckenEingang[1], 'zwei')
  ];
  gleich(kern.verschiebeSchritt(schritte, 0, 1).map((s) => s.text).join(','), 'zwei,eins');
  gleich(kern.verschiebeSchritt(schritte, 0, -1).map((s) => s.text).join(','), 'eins,zwei', 'über den Rand hinaus wird verschoben');
  gleich(kern.verschiebeSchritt(schritte, 1, 1).map((s) => s.text).join(','), 'eins,zwei');
  gleich(kern.verschiebeSchritt(schritte, 9, 1).length, 2);
});

s.test('die Strecke als Text trägt Nummer, Anweisung und Gliederung', () => {
  const strecke = {
    ...kern.leereStrecke('Vorlage anlegen'),
    schritte: [
      kern.streckeSchritt(streckenEingang[0], 'Menü öffnen'),
      kern.streckeSchritt(streckenEingang[1], 'Filter setzen')
    ]
  };
  gleich(
    kern.streckeAlsText(strecke, streckenEingang),
    'Vorlage anlegen\n1. Menü öffnen  [1.1]\n2. Filter setzen  [1.2]'
  );
});

s.test('das Blatt teilt die Kacheln auf und wächst mit den Zeilen', () => {
  const bilder = [
    { breite: 1600, hoehe: 900 },
    { breite: 1600, hoehe: 900 },
    { breite: 1600, hoehe: 900 }
  ];
  const zwei = kern.blattRaster(bilder, { spalten: 2, breite: 1600, abstand: 24, textHoehe: 64, kopfHoehe: 96 });
  gleich(zwei.spalten, 2);
  gleich(zwei.kacheln.length, 3);
  gleich(zwei.kacheln[0].y, zwei.kacheln[1].y, 'die erste Zeile steht nicht auf einer Höhe');
  wahr(zwei.kacheln[2].y > zwei.kacheln[0].y, 'die zweite Zeile beginnt nicht tiefer');
  gleich(zwei.kacheln[0].x, 24);
  wahr(zwei.hoehe > zwei.kacheln[2].y + zwei.kacheln[2].hoehe - 1, 'das Blatt ist zu kurz für die letzte Zeile');

  const eins = kern.blattRaster(bilder, { spalten: 1, breite: 1600 });
  gleich(eins.spalten, 1);
  wahr(eins.hoehe > zwei.hoehe, 'untereinander braucht nicht mehr Platz als nebeneinander');
  gleich(kern.blattRaster([], { spalten: 2 }).kacheln.length, 0);
  gleich(kern.blattRaster([{ breite: 100, hoehe: 100 }], { spalten: 3 }).spalten, 1, 'ein Bild braucht keine drei Spalten');
});

s.test('Strecken überleben das Ablegen; Unbrauchbares fällt weg', () => {
  const strecke = {
    ...kern.leereStrecke('Vorlage anlegen'),
    schritte: [kern.streckeSchritt(streckenEingang[0], 'Menü öffnen')]
  };
  const zurueck = kern.leseStrecken(kern.schreibeStrecken([strecke]));
  gleich(zurueck.length, 1);
  gleich(zurueck[0].name, 'Vorlage anlegen');
  tieferGleich(zurueck[0].schritte[0].aufnahmen, ['AUF-2026-001']);
  gleich(zurueck[0].schritte[0].art, 'schritt');
  tieferGleich(kern.leseStrecken('kein json'), []);
  gleich(kern.leseStrecken(JSON.stringify({ strecken: [{ name: 'ohne Kennung' }] })).length, 0);
});

s.test('ein Schritt kann mehrere Bilder parallel tragen', () => {
  let schritte = [kern.streckeSchritt(streckenEingang[0], 'Vorlage anlegen')];
  schritte = kern.fuegeParallelHinzu(schritte, 0, 'AUF-2026-002');
  tieferGleich(schritte[0].aufnahmen, ['AUF-2026-001', 'AUF-2026-002']);
  // Zweimal dasselbe Bild ist kein zweiter Zweig.
  schritte = kern.fuegeParallelHinzu(schritte, 0, 'AUF-2026-002');
  gleich(schritte[0].aufnahmen.length, 2);
  gleich(kern.fuegeParallelHinzu(schritte, 9, 'AUF-2026-002')[0].aufnahmen.length, 2, 'außerhalb der Folge wird gesetzt');

  const mit = kern.streckeMitAufnahmen({ ...kern.leereStrecke('x'), schritte }, streckenEingang)[0];
  gleich(mit.aufnahmen.length, 2);
  gleich(mit.aufnahme.id, 'AUF-2026-001', 'das erste Bild trägt den Schritt nicht');

  // Das letzte Bild zu nehmen macht den Schritt zum Platzhalter - der Schritt
  // verschwindet nicht, denn seine Anweisung bleibt gültig.
  schritte = kern.entferneParallel(schritte, 0, 'AUF-2026-002');
  tieferGleich(schritte[0].aufnahmen, ['AUF-2026-001']);
  schritte = kern.entferneParallel(schritte, 0, 'AUF-2026-001');
  gleich(schritte[0].art, 'platzhalter');
  gleich(schritte[0].text, 'Vorlage anlegen');
});

s.test('ein Platzhalter steht in der Folge und verlangt eine Beschreibung', () => {
  const strecke = {
    ...kern.leereStrecke('Vorlage anlegen'),
    schritte: [kern.streckeSchritt(streckenEingang[0], 'Menü öffnen'), kern.platzhalterSchritt('')]
  };
  const probleme = kern.pruefeStrecke(strecke, streckenEingang);
  gleich(probleme.length, 1);
  wahr(/sagt nicht, welches Bild fehlt/.test(probleme[0].text), 'der Platzhalter wird nicht verlangt: ' + probleme[0].text);
  const gefuellt = { ...strecke, schritte: [strecke.schritte[0], kern.platzhalterSchritt('Freigabedialog fehlt')] };
  gleich(kern.pruefeStrecke(gefuellt, streckenEingang).length, 0, 'ein beschriebener Platzhalter ist kein Fehler');
  const mit = kern.streckeMitAufnahmen(gefuellt, streckenEingang);
  gleich(mit.length, 2, 'der Platzhalter fällt aus der Folge');
  gleich(mit[1].art, 'platzhalter');
  wahr(kern.streckeAlsText(gefuellt, streckenEingang).includes('2. [Bild fehlt] Freigabedialog fehlt'));
});

s.test('die Marken eines Blattes zählen parallele Bilder als 3a und 3b', () => {
  gleich(kern.schrittMarke(3, 1, 0), '3');
  gleich(kern.schrittMarke(3, 2, 0), '3a');
  gleich(kern.schrittMarke(3, 2, 1), '3b');
  const schritte = kern.streckeMitAufnahmen(
    {
      ...kern.leereStrecke('x'),
      schritte: [
        kern.fuegeParallelHinzu([kern.streckeSchritt(streckenEingang[0], 'eins')], 0, 'AUF-2026-002')[0],
        kern.platzhalterSchritt('fehlt')
      ]
    },
    streckenEingang
  );
  const flach = kern.blattBilder(schritte);
  tieferGleich(flach.map((b) => b.marke), ['1a', '1b', '2']);
  gleich(flach[2].platzhalter, true);
  // Ohne Maß bekommt der Platzhalter das Verhältnis eines Bildschirms.
  const raster = kern.blattRaster(flach.map((b) => ({ ...b, breite: b.platzhalter ? 0 : 1600, hoehe: b.platzhalter ? 0 : 900 })), { spalten: 3, breite: 1600 });
  gleich(raster.kacheln.length, 3);
  gleich(raster.kacheln[2].marke, '2');
  gleich(raster.kacheln[2].platzhalter, true);
  wahr(raster.kacheln[2].bildHoehe > 0, 'die leere Kachel hat keine Höhe');
});

s.test('aus der Strecke wird ein Prozess mit paralleler Teilung', () => {
  const schritte = [
    kern.streckeSchritt(streckenEingang[0], 'Menü öffnen'),
    kern.fuegeParallelHinzu([kern.streckeSchritt(streckenEingang[1], 'Beides füllen')], 0, 'AUF-2026-001')[0],
    kern.platzhalterSchritt('Freigabedialog fehlt')
  ];
  const strecke = { ...kern.leereStrecke('Vorlage anlegen'), schritte };
  const aufbau = kern.bpmnAufbau(strecke, streckenEingang);
  tieferGleich(
    aufbau.knoten.map((k) => k.art),
    ['start', 'aufgabe', 'teilung', 'aufgabe', 'aufgabe', 'vereinigung', 'platzhalter', 'ende']
  );
  // Jeder Knoten hat eine Stelle, keiner liegt auf einem anderen.
  wahr(aufbau.knoten.every((k) => k.x >= 0 && k.hoehe > 0), 'ein Knoten hat kein Maß');
  const zweige = aufbau.knoten.filter((k) => k.id.startsWith('schritt_2_'));
  wahr(zweige[0].y !== zweige[1].y, 'die parallelen Zweige liegen übereinander');
  gleich(aufbau.kanten.length, 8);
  wahr(aufbau.breite > 800 && aufbau.hoehe > 200);

  const xml = kern.streckeAlsBpmn(strecke, streckenEingang, { erzeugt: '2026-10-17T10:00:00Z' });
  wahr(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  wahr(xml.includes('<bpmn:process id="Prozess_STR-'), 'der Prozess fehlt');
  gleich((xml.match(/<bpmn:parallelGateway/g) || []).length, 2, 'Teilung und Vereinigung fehlen');
  gleich((xml.match(/<bpmn:userTask/g) || []).length, 3);
  gleich((xml.match(/<bpmn:sequenceFlow/g) || []).length, 8);
  wahr(xml.includes('<bpmndi:BPMNDiagram'), 'ohne Diagramm steht die Datei im Werkzeug leer da');
  gleich((xml.match(/<bpmndi:BPMNShape/g) || []).length, 8);
  wahr(xml.includes('<dc:Bounds'), 'die Koordinaten fehlen');
  wahr(xml.includes('name="2a. Beides füllen"'), 'die Marke steht nicht am Zweig');
  // Freitext darf das Dokument nicht zerlegen.
  const boese = kern.streckeAlsBpmn(
    { ...strecke, name: 'A & B <weg/>' },
    streckenEingang
  );
  wahr(boese.includes('name="A &amp; B &lt;weg/&gt;"'), 'der Name wird nicht maskiert');
  wahr(!boese.includes('<weg/>'), 'Freitext steht ungemaskiert im Dokument');
});

/* ------------------------------------------------------------- Labels */

s.test('die Labels stehen in fester Folge und nennen ihren Klartext', () => {
  const aufnahme = {
    sprache: 'ko',
    rolle_label: 'hq',
    sparte: 'van',
    markt: 'Korea',
    domaene: 'Templates – Market Settings',
    reiter: 'Documents',
    schritt_label: 'Create Template'
  };
  gleich(
    kern.labelKette(aufnahme),
    'Koreanisch · HQ · Van · Korea · Templates – Market Settings · Documents · Create Template'
  );
  gleich(kern.labelListe(aufnahme).length, 7);
  gleich(kern.labelListe({ sprache: 'de' }).length, 1, 'leere Labels gehören nicht in die Kette');
  gleich(kern.labelWert('sprache', 'fr'), 'Französisch');
  gleich(kern.labelWert('markt', ' Germany '), 'Germany', 'freie Felder werden nur beschnitten');
  gleich(kern.labelWert('sprache', 'xx'), 'xx', 'ein unbekannter Code wird nicht verschwiegen');
  wahr(kern.SPRACHEN.length >= 19, 'es fehlen Sprachen: ' + kern.SPRACHEN.length);
  tieferGleich(kern.ROLLEN_LABEL.map((r) => r.label), ['Dealer', 'Market', 'HQ', 'MO']);
  tieferGleich(kern.SPARTEN.map((s) => s.label), ['Pkw', 'Van']);
});

s.test('die Vorschläge für freie Felder kommen aus der bisherigen Arbeit', () => {
  const aufnahmen = [
    { markt: 'Germany' },
    { markt: 'Korea' },
    { markt: 'Germany' },
    { markt: '' }
  ];
  tieferGleich(kern.labelVorschlaege(aufnahmen, 'markt'), ['Germany', 'Korea'], 'das Häufigste steht nicht vorn');
  tieferGleich(kern.labelVorschlaege([], 'markt'), []);
});

s.test('die Teilschritte zählen je Stelle, was dort liegt', () => {
  const aufnahmen = [
    { gliederung: '7.5.2', sprache: 'de', reiter: 'Documents', rolle_label: 'market' },
    { gliederung: '7.5.1', sprache: 'en', reiter: 'Documents', rolle_label: 'market' },
    { gliederung: '9.1.1', sprache: 'de', reiter: 'Emails', rolle_label: 'mo' }
  ];
  const unter75 = kern.teilschritte(aufnahmen, '7.5');
  const sprache = unter75.find((f) => f.feld === 'sprache');
  gleich(sprache.werte.length, 2);
  gleich(unter75.find((f) => f.feld === 'reiter').werte[0].zahl, 2, 'der Reiter wird nicht gezählt');
  gleich(unter75.find((f) => f.feld === 'rolle_label').werte[0].wert, 'Market');
  gleich(kern.teilschritte(aufnahmen, '9').find((f) => f.feld === 'reiter').werte[0].wert, 'Emails');
  // Ohne Stelle gelten alle Bilder - auch die ohne Zuordnung.
  gleich(kern.teilschritte([{ sprache: 'de' }], '').length, 1);
  gleich(kern.teilschritte([], '').length, 0);
});

s.test('eine Marke lässt sich verschieben und bleibt im Bild', () => {
  const quelle = { breite: 1000, hoehe: 800 };
  const marke = { x: 100, y: 100, breite: 200, hoehe: 50 };
  tieferGleich(kern.bewegeMarke(marke, 50, -30, quelle), { x: 150, y: 70, breite: 200, hoehe: 50 });
  const links = kern.bewegeMarke(marke, -500, 0, quelle);
  gleich(links.x, 0, 'die Marke rutscht links aus dem Bild');
  const unten = kern.bewegeMarke(marke, 0, 5000, quelle);
  gleich(unten.y + unten.hoehe, 800, 'die Marke rutscht unten aus dem Bild');
});

s.test('ein Label im Bild trägt sein Feld durch die Ablage', () => {
  const marken = [{ id: 'a', art: 'label', x: 10, y: 10, breite: 100, hoehe: 24, text: 'Deutsch', feld: 'sprache' }];
  const abgelegt = kern.markenAlsAblage(marken);
  gleich(abgelegt[0].feld, 'sprache');
  gleich(kern.leseMarken(abgelegt)[0].feld, 'sprache');
  gleich(kern.leseMarken(abgelegt)[0].art, 'label');
  // Labels gehören nicht in die Werkzeugleiste - sie werden gesetzt, nicht gezogen.
  gleich(kern.WERKZEUGE.some((w) => w.id === 'label'), false);
  gleich(kern.WERKZEUGE.length, 3);
});

s.test('die Gliederung trägt Abschlusskriterium und Nachweis', () => {
  const roh = {
    texte: ['Scope bestätigen.', 'Quelle: Handbuch, 7.5.2.'],
    eintraege: [{ nummer: '7.5.2', thema: 'Signaturergebnis', ebene: 3, kriterium: 0, notiz: 1 }]
  };
  const [stelle] = kern.leseGliederung(roh);
  gleich(stelle.kriterium, 'Scope bestätigen.');
  gleich(stelle.notiz, 'Quelle: Handbuch, 7.5.2.');
  gleich(kern.leseGliederung({ eintraege: [{ nummer: '1', thema: 'A', ebene: 1 }] })[0].kriterium, '');
});

/* ------------------------------------------ Fassungen und Gliederung */

s.test('jede Bearbeitung ist eine eigene Fassung, das Original bleibt', () => {
  const original = { id: 'AUF-2026-001', bild: 'data:image/jpeg;base64,ORIGINAL', erfasst_am: '2026-03-01T08:00:00.000Z' };
  gleich(kern.leseFassungen(original).length, 0);
  gleich(kern.anzeigeBild(original), 'data:image/jpeg;base64,ORIGINAL', 'ohne Fassung gilt das Original');
  gleich(kern.naechsteFassungsnummer([]), 1);

  const eins = kern.baueFassung({
    nummer: 1,
    bild: 'data:image/jpeg;base64,EINS',
    marken: [{ id: 'a', art: 'unkenntlich', x: 1, y: 1, breite: 9, hoehe: 9, stufe: 'grob' }],
    erstelltAm: '2026-03-02T08:00:00.000Z'
  });
  const zwei = kern.baueFassung({ nummer: 2, bild: 'data:image/jpeg;base64,ZWEI', marken: [] });
  const mit = { ...original, fassungen: [eins, zwei] };
  gleich(kern.naechsteFassungsnummer(kern.leseFassungen(mit)), 3);
  gleich(kern.neuesteFassung(mit).nummer, 2, 'die jüngste Fassung ist nicht die letzte');
  gleich(kern.anzeigeBild(mit), 'data:image/jpeg;base64,ZWEI');
  gleich(mit.bild, 'data:image/jpeg;base64,ORIGINAL', 'das Original wurde angefasst');
  gleich(kern.leseFassungen(mit)[0].marken.length, 1, 'die Marken der Fassung fehlen');
});

s.test('eine Aufnahme aus älterem Stand verliert ihre Bearbeitung nicht', () => {
  const alt = {
    id: 'AUF-2026-001',
    bild: 'data:image/jpeg;base64,ORIGINAL',
    bild_markiert: 'data:image/jpeg;base64,ALT',
    marken: [{ id: 'a', art: 'rahmen', x: 1, y: 1, breite: 9, hoehe: 9 }],
    markiert_am: '2026-02-01T08:00:00.000Z'
  };
  const gelesen = kern.leseFassungen(alt);
  gleich(gelesen.length, 1, 'die frühere Bearbeitung geht verloren');
  gleich(gelesen[0].nummer, 1);
  gleich(gelesen[0].bild, 'data:image/jpeg;base64,ALT');
  gleich(gelesen[0].marken.length, 1);
  gleich(kern.anzeigeBild(alt), 'data:image/jpeg;base64,ALT');
  // Eine unbrauchbare Fassung wird nicht mitgezählt.
  gleich(kern.leseFassungen({ fassungen: [{ nummer: 1, bild: 'kein Bild' }] }).length, 0);
});

s.test('die Gliederungsnummer ordnet, der Zeitstempel belegt', () => {
  gleich(kern.kapitelKennung({ kapitel: 2, unterkapitel: 3 }), '2.3');
  gleich(kern.kapitelKennung({ kapitel: 2 }), '2', 'ohne Unterkapitel bleibt die Kapitelnummer');
  gleich(kern.kapitelKennung({}), '', 'ohne Nummer wird keine erfunden');
  gleich(kern.naechsteUnterkapitelnummer([{ kapitel: 2, unterkapitel: 3 }, { kapitel: 2, unterkapitel: 7 }], 2), 8);
  gleich(kern.naechsteUnterkapitelnummer([{ kapitel: 2, unterkapitel: 3 }], 5), 1, 'ein neues Kapitel fängt bei 1 an');

  const reihe = kern.sortiereNachKapitel([
    { id: 'c', kapitel: 2, unterkapitel: 10 },
    { id: 'a', kapitel: 1, unterkapitel: 2 },
    { id: 'd' },
    { id: 'b', kapitel: 2, unterkapitel: 2 }
  ]);
  gleich(reihe.map((a) => a.id).join(''), 'abcd', 'die Gliederung sortiert falsch');

  gleich(kern.formatiereZeitpunkt('2026-10-17T08:14:09.000Z'), '17.10.2026, 08:14');
  gleich(
    kern.bildunterschrift({ titel: 'Vorlagenliste', kapitel: 2, unterkapitel: 3, erfasst_am: '2026-10-17T08:14:09.000Z' }),
    '2.3  ·  Vorlagenliste  ·  17.10.2026, 08:14'
  );
  wahr(
    !kern.bildunterschrift({ titel: 'Ohne Nummer', erfasst_am: '2026-10-17T08:14:09.000Z' }).startsWith('·'),
    'ohne Nummer bleibt ein führender Punkt stehen'
  );
});

s.test('die Gliederungsnummer passt auch in einen Dateinamen', () => {
  gleich(
    kern.dateinameAus('{kapitel}-{titel}', { kapitel: '2.3', titel: 'Vorlagen' }),
    '2-3-vorlagen.png',
    'der Punkt der Gliederung gehört nicht in den Dateinamen'
  );
  wahr(kern.MUSTER_FELDER.some((f) => f.feld === '{kapitel}'), 'der Baustein wird nicht angeboten');
});

/* ------------------------------------------------------------- Marken */

s.test('eine neue Marke sitzt im Bild und zählt die Schritte weiter', () => {
  const quelle = { breite: 1200, hoehe: 800 };
  let liste = [];
  liste = [...liste, kern.leereMarke('unkenntlich', kern.begrenzeMarke({ x: 10, y: 20, breite: 300, hoehe: 24 }, quelle), liste)];
  liste = [...liste, kern.leereMarke('schritt', kern.begrenzeMarke({ x: 40, y: 60, breite: 200, hoehe: 50 }, quelle), liste)];
  liste = [...liste, kern.leereMarke('schritt', kern.begrenzeMarke({ x: 40, y: 200, breite: 200, hoehe: 50 }, quelle), liste)];
  gleich(liste[0].nummer, null, 'eine abgedeckte Stelle bekommt keine Nummer');
  gleich(liste[1].nummer, 1);
  gleich(liste[2].nummer, 2);
  gleich(liste[0].stufe, 'mittel', 'ohne Angabe gilt das mittlere Raster');
  wahr(liste[0].id !== liste[1].id, 'zwei Marken teilen sich eine Kennung');

  // Eine Marke bleibt im Bild und unter Mindestmaß nicht liegen.
  const raus = kern.begrenzeMarke({ x: 1190, y: 790, breite: 2, hoehe: 2 }, quelle);
  gleich(raus.breite, kern.MINDEST_MARKE, 'zu kleine Marken werden nicht auf Mindestmaß gebracht');
  wahr(raus.x + raus.breite <= quelle.breite, 'die Marke ragt rechts aus dem Bild');
  wahr(raus.y + raus.hoehe <= quelle.hoehe, 'die Marke ragt unten aus dem Bild');
});

s.test('nach dem Löschen bleibt in der Klickstrecke keine Lücke', () => {
  const marken = kern.nummeriereSchritte([
    { art: 'schritt', nummer: 1, text: 'eins' },
    { art: 'unkenntlich', nummer: null },
    { art: 'schritt', nummer: 2, text: 'zwei' },
    { art: 'schritt', nummer: 3, text: 'drei' }
  ]);
  const ohneZwei = kern.nummeriereSchritte(marken.filter((m) => m.text !== 'zwei'));
  tieferGleich(
    ohneZwei.filter((m) => m.art === 'schritt').map((m) => m.nummer),
    [1, 2],
    'die Nummern springen'
  );
  gleich(kern.klickstreckeAlsText(ohneZwei), '1. eins\n2. drei');
  gleich(kern.naechsteSchrittnummer(ohneZwei), 3);
});

s.test('ein Schritt ohne Text wird benannt, ein Rahmen ohne Text nicht', () => {
  const marken = [
    { id: 'a', art: 'schritt', nummer: 1, text: '' },
    { id: 'b', art: 'rahmen', text: '' },
    { id: 'c', art: 'unkenntlich' }
  ];
  const probleme = kern.pruefeMarken(marken);
  gleich(probleme.length, 1, 'nur der Schritt braucht Text');
  gleich(probleme[0].id, 'a');
  tieferGleich(kern.markenZusammenfassung(marken), { gesamt: 3, unkenntlich: 1, rahmen: 1, schritte: 1 });
});

s.test('Marken überleben das Ablegen und Zurücklesen, Unbekanntes fällt weg', () => {
  const marken = [
    { id: 'a', art: 'unkenntlich', x: 10, y: 20, breite: 300, hoehe: 24, stufe: 'grob', text: '' },
    { id: 'b', art: 'schritt', x: 40, y: 60, breite: 200, hoehe: 50, nummer: 1, text: 'Auf „Anlegen“ klicken' }
  ];
  const abgelegt = kern.markenAlsAblage(marken);
  gleich(abgelegt[0].nummer, undefined, 'eine abgedeckte Stelle trägt keine Nummer mit');
  gleich(abgelegt[1].stufe, undefined, 'ein Schritt trägt kein Raster mit');
  const zurueck = kern.leseMarken(abgelegt);
  gleich(zurueck.length, 2);
  gleich(zurueck[0].stufe, 'grob');
  gleich(zurueck[1].text, 'Auf „Anlegen“ klicken');
  gleich(zurueck[1].nummer, 1);

  tieferGleich(kern.leseMarken('keine Liste'), []);
  gleich(
    kern.leseMarken([{ art: 'erfunden', x: 1, y: 1, breite: 1, hoehe: 1 }, { art: 'rahmen', x: 'a' }]).length,
    0,
    'unbekannte Arten und halbe Maße kommen durch'
  );
  gleich(kern.rasterZuStufe('fein') < kern.rasterZuStufe('grob'), true, 'fein muss feiner sein als grob');
  gleich(kern.rasterZuStufe('erfunden'), kern.rasterZuStufe('mittel'), 'ohne Stufe gilt die mittlere');
});

s.test('die bearbeitete Fassung ist am Namen erkennbar', () => {
  gleich(kern.markiertName('schirm-001.png'), 'schirm-001-markiert.png');
  gleich(kern.markiertName('a.b.c.jpeg'), 'a.b.c-markiert.jpeg');
  gleich(kern.markiertName('ohne-endung'), 'ohne-endung-markiert');
});

s.test('der Beipackzettel sagt, dass etwas abgedeckt wurde', () => {
  const marken = [
    { id: 'a', art: 'unkenntlich', x: 1, y: 1, breite: 10, hoehe: 10, stufe: 'grob' },
    { id: 'b', art: 'schritt', x: 1, y: 1, breite: 10, hoehe: 10, nummer: 1, text: 'klicken' }
  ];
  const zettel = JSON.parse(kern.baueBeipackzettel({ entwurf: { titel: 'T' }, bildname: 'a.png', marken }));
  gleich(zettel.beipackzettel, 2, 'die Zettelversion muss mitwachsen');
  gleich(zettel.unkenntlich_gemacht, 1);
  gleich(zettel.marken.length, 2);
  const gelesen = kern.leseBeipackzettel(JSON.stringify(zettel));
  gleich(gelesen.ok, true);
  gleich(gelesen.kuenftig, false, 'der eigene Zettel gilt als künftig');
  tieferGleich(gelesen.fremd, [], 'die neuen Felder gelten als fremd');
  const wert = (s) => gelesen.zeilen.find((z) => z.schluessel === s).wert;
  gleich(wert('unkenntlich_gemacht'), '1 Stelle abgedeckt');
  gleich(wert('marken'), '1 unkenntlich · 1 Schritte');
  // Ohne Marken bleiben die Zeilen leer statt "0".
  const ohne = kern.leseBeipackzettel(kern.baueBeipackzettel({ bildname: 'a.png' }));
  gleich(ohne.zeilen.find((z) => z.schluessel === 'unkenntlich_gemacht').leer, true);
});

/* -------------------------------------------- Metadaten in der PNG-Datei */

const probePng = () => new Uint8Array(erzeugePng(8, 8, (x, y) => [x * 30, y * 30, 120]));

s.test('der Beipackzettel überlebt den Weg in die PNG-Datei', () => {
  const zettel = kern.baueBeipackzettel({
    entwurf: { titel: 'Prüfung grün', projekt: 'oneSCM Portal', datum: '2026-03-01', begriffe: ['kontrast'] },
    bildname: 'a.png',
    erfasstAm: '2026-03-01T08:00:00.000Z',
    anwendung: '1.15.0'
  });
  const roh = probePng();
  const mit = kern.legeTextInPng(roh, kern.pngTexte(zettel, '1.15.0'));
  wahr(mit.length > roh.length, 'die Datei ist nicht gewachsen');
  const gelesen = kern.liesTextAusPng(mit);
  gleich(gelesen.Description, 'Prüfung grün · oneSCM Portal · 2026-03-01', 'die lesbare Zeile fehlt');
  gleich(gelesen.Software, 'Screenarchiv 1.15.0');
  gleich(JSON.parse(gelesen[kern.PNG_SCHLUESSEL]).titel, 'Prüfung grün', 'Umlaute überleben den Weg nicht');
  gleich(JSON.parse(gelesen[kern.PNG_SCHLUESSEL]).begriffe.join(','), 'kontrast');
});

s.test('die Bilddaten bleiben beim Einlegen unberührt', () => {
  const roh = probePng();
  const mit = kern.legeTextInPng(roh, [{ schluessel: 'a', text: 'b' }]);
  // Alles bis zum ersten Abschnitt nach den Bilddaten steht unveraendert vorn.
  const bisIdat = roh.length - 12; // IEND ist zwölf Byte lang
  tieferGleich(
    Array.from(mit.subarray(0, bisIdat)),
    Array.from(roh.subarray(0, bisIdat)),
    'die Bilddaten wurden angefasst'
  );
  // Und IEND steht weiterhin am Ende.
  gleich(String.fromCharCode(...mit.subarray(mit.length - 8, mit.length - 4)), 'IEND');
});

s.test('was keine PNG-Datei ist, kommt unverändert zurück', () => {
  const kein = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  tieferGleich(Array.from(kern.legeTextInPng(kein, [{ schluessel: 'a', text: 'b' }])), Array.from(kein));
  tieferGleich(kern.liesTextAusPng(kein), {});
  tieferGleich(kern.liesTextAusPng(probePng()), {}, 'ein frisches Bild trägt keinen Text');
  const roh = probePng();
  tieferGleich(Array.from(kern.legeTextInPng(roh, [])), Array.from(roh), 'ohne Texte wird nichts geschrieben');
});

/* ------------------------------------------------------------ Belegentwurf */

const vokabular = {
  projekte: ['oneSCM Portal'],
  kategorien: ['Navigation'],
  status: ['übernommen', 'in Prüfung', 'verworfen'],
  viewports: [{ id: 'desktop' }, { id: 'tablet' }]
};

const paar = () => [
  {
    id: 'AUF-2026-001',
    titel: 'vorher',
    projekt: 'oneSCM Portal',
    seite: '/portal/uebersicht',
    kategorie: 'Navigation',
    browser: 'Chrome 141',
    datum: '2026-02-01',
    begriffe: ['navigation'],
    bild: 'data:image/jpeg;base64,AAAA',
    ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 },
    quelle: { art: 'beispiel', name: 'Probe', breite: 100, hoehe: 100 },
    erfasst_am: '2026-02-01T08:00:00.000Z'
  },
  {
    id: 'AUF-2026-002',
    titel: 'nachher',
    projekt: 'oneSCM Portal',
    seite: '/portal/uebersicht',
    kategorie: 'Navigation',
    browser: 'Chrome 141',
    datum: '2026-03-01',
    begriffe: ['kontrast'],
    bild: 'data:image/jpeg;base64,BBBB',
    ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 },
    quelle: { art: 'beispiel', name: 'Probe', breite: 100, hoehe: 100 },
    erfasst_am: '2026-03-01T08:00:00.000Z'
  }
];

const vollerEntwurf = () => ({
  ...kern.leererBelegentwurf(...paar()),
  titel: 'Kontrast der Sekundärnavigation angehoben',
  viewport: 'desktop',
  anlass: 'Im Audit fiel die Navigation mit 2,8:1 durch, AA verlangt 4,5:1.',
  aenderung: 'Textfarbe auf dunkles Blaugrau gesetzt, aktiver Eintrag markiert.',
  wirkung: 'Kontrast auf 5,1:1 angehoben, die Suche dauert kürzer.',
  quelle: 'Audit Q1/2026, Befund A-14',
  metriken: [{ name: 'Kontrast', einheit: ':1', vorher: '2,8', nachher: '5,1', richtung: 'groesser_besser' }]
});

s.test('der leere Belegentwurf übernimmt, was die Aufnahmen schon wissen', () => {
  const [vorher, nachher] = paar();
  const entwurf = kern.leererBelegentwurf(vorher, nachher);
  gleich(entwurf.projekt, 'oneSCM Portal');
  gleich(entwurf.seite, '/portal/uebersicht');
  gleich(entwurf.kategorie, 'Navigation');
  gleich(entwurf.datum, '2026-03-01', 'das Datum des Belegs ist das der Nachher-Aufnahme');
  tieferGleich(entwurf.tags, ['navigation', 'kontrast'], 'die Begriffe beider Aufnahmen fehlen');
  gleich(entwurf.titel, '', 'der Titel des Belegs wird nicht geraten');
  gleich(entwurf.anlass, '');
});

s.test('ein Beleg ohne Begründung wird nicht durchgelassen', () => {
  const [vorher, nachher] = paar();
  const felder = kern.pruefeBelegentwurf(kern.leererBelegentwurf(vorher, nachher), vorher, nachher, vokabular).map((p) => p.feld);
  for (const feld of ['titel', 'viewport', 'anlass', 'aenderung', 'wirkung', 'quelle', 'metrik-name-1']) {
    wahr(felder.includes(feld), `${feld} wird nicht verlangt: ` + felder.join(','));
  }
  gleich(kern.pruefeBelegentwurf(vollerEntwurf(), vorher, nachher, vokabular).length, 0, 'ein vollständiger Beleg wird abgewiesen');
});

s.test('zu knappe Begründungen, falsches Vokabular und vertauschte Daten fallen auf', () => {
  const [vorher, nachher] = paar();
  const kurz = { ...vollerEntwurf(), anlass: 'zu kurz' };
  wahr(
    kern.pruefeBelegentwurf(kurz, vorher, nachher, vokabular).some((p) => p.feld === 'anlass' && /knapp/.test(p.text)),
    'ein Einwortanlass geht durch'
  );
  const fremd = { ...vollerEntwurf(), kategorie: 'Erfunden' };
  wahr(
    kern.pruefeBelegentwurf(fremd, vorher, nachher, vokabular).some((p) => /Vokabular/.test(p.text)),
    'eine unbekannte Kategorie geht durch'
  );
  wahr(
    kern.pruefeBelegentwurf(vollerEntwurf(), nachher, vorher, vokabular).some((p) => /jünger/.test(p.text)),
    'vertauschte Aufnahmen gehen durch'
  );
  wahr(
    kern.pruefeBelegentwurf(vollerEntwurf(), vorher, vorher, vokabular).some((p) => p.feld === 'paar'),
    'dieselbe Aufnahme zweimal geht durch'
  );
  const verworfen = { ...vollerEntwurf(), status: 'verworfen' };
  wahr(
    kern.pruefeBelegentwurf(verworfen, vorher, nachher, vokabular).some((p) => p.feld === 'wirkung'),
    'verworfen ohne Begründung im Wirkungstext geht durch'
  );
});

s.test('eine halb ausgefüllte Kennzahl ist ein Fehler, eine leere nicht', () => {
  const [vorher, nachher] = paar();
  const halb = {
    ...vollerEntwurf(),
    metriken: [
      { name: 'Kontrast', einheit: ':1', vorher: '2,8', nachher: '5,1', richtung: 'groesser_besser' },
      { name: 'Dauer', einheit: 's', vorher: '', nachher: '33', richtung: 'kleiner_besser' }
    ]
  };
  wahr(
    kern.pruefeBelegentwurf(halb, vorher, nachher, vokabular).some((p) => p.feld === 'metrik-vorher-2'),
    'die halbe zweite Kennzahl fällt nicht auf'
  );
  const leerZweite = {
    ...vollerEntwurf(),
    metriken: [
      { name: 'Kontrast', einheit: ':1', vorher: '2,8', nachher: '5,1', richtung: 'groesser_besser' },
      { name: '', einheit: '', vorher: '', nachher: '', richtung: 'groesser_besser' }
    ]
  };
  gleich(kern.pruefeBelegentwurf(leerZweite, vorher, nachher, vokabular).length, 0, 'eine leere Zeile darf nicht stören');
  gleich(kern.metrikenAusEntwurf(leerZweite).length, 1, 'die leere Zeile landet im Entwurf');
});

s.test('der Belegentwurf hat die Form des Bestands und behauptet kein screen', () => {
  const [vorher, nachher] = paar();
  const gebaut = kern.baueBelegentwurf({
    entwurf: vollerEntwurf(),
    vorher,
    nachher,
    kennung: 'SCR-2026-001',
    anwendung: '1.14.0'
  });
  gleich(gebaut.belegentwurf, kern.BELEGENTWURF_VERSION);
  gleich(gebaut.erzeugt_von, 'Screenarchiv 1.14.0');
  const e = gebaut.eintrag;
  tieferGleich(
    Object.keys(e),
    ['id','titel','projekt','seite','kategorie','status','viewport','browser','autor','datum','tags','begruendung','metriken','archiviert','archiviert_am','archiv_grund','screen'],
    'die Feldfolge weicht vom Bestand ab'
  );
  gleich(e.screen, null, 'screen darf die Seite nicht erfinden');
  gleich(e.metriken[0].vorher, 2.8, 'das Komma wird nicht gelesen');
  tieferGleich(Object.keys(e.begruendung), ['anlass', 'aenderung', 'wirkung', 'quelle']);
  gleich(gebaut.aufnahmen.vorher.id, 'AUF-2026-001');
  gleich(gebaut.aufnahmen.nachher.bild, 'data:image/jpeg;base64,BBBB');
  const ohneBilder = kern.baueBelegentwurf({
    entwurf: vollerEntwurf(), vorher, nachher, kennung: 'SCR-2026-001', mitBildern: false
  });
  gleich(ohneBilder.aufnahmen.vorher.bild, undefined, 'ohne Bilder darf kein Bild drinstehen');
});

s.test('die Belegkennung zählt im Jahr des Belegs weiter', () => {
  gleich(kern.naechsteBelegKennung([{ id: 'SCR-2026-004' }, { id: 'SCR-2025-009' }], '2026-03-01'), 'SCR-2026-005');
  gleich(kern.naechsteBelegKennung([{ id: 'SCR-2026-004' }], '2025-03-01'), 'SCR-2025-001');
  gleich(kern.naechsteBelegKennung([], '2026-03-01'), 'SCR-2026-001');
});

/* ---------------------------------------------------------- Kontaktbogen */

const bogenProbe = () => [
  {
    ...eingangProbe()[0],
    titel: 'Kopfzeile <script>alert(1)</script> & "Anführung"',
    notiz: 'Vergleich mit Release 4.2',
    autor: 'M. Ackermann',
    browser: 'Chrome 141',
    rolle: 'vorher',
    ausschnitt: { x: 12, y: 34, breite: 300, hoehe: 200 },
    quelle: { art: 'datei', name: 'schirm.png', breite: 1440, hoehe: 900 }
  },
  eingangProbe()[1]
];

s.test('der Kontaktbogen ist ein vollständiges HTML-Dokument', () => {
  const html = kern.baueKontaktbogen(bogenProbe(), { stand: '2025-06-30' });
  wahr(html.startsWith('<!doctype html>'), 'kein Doctype');
  wahr(html.includes('<html lang="de">') && html.includes('</html>'), 'Gerüst unvollständig');
  wahr(html.includes('<title>'), 'kein Titel');
  wahr(html.includes('@media print'), 'keine Druckregeln');
  wahr(html.includes('page-break-inside: avoid'), 'Sätze dürfen über Seiten brechen');
  wahr(html.includes('@page'), 'keine Seitenränder für den Druck');
});

s.test('der Kontaktbogen enthält alle Aufnahmen mit Bild und Metadaten', () => {
  const liste = bogenProbe();
  const html = kern.baueKontaktbogen(liste, { stand: '2025-06-30' });
  for (const a of liste) {
    wahr(html.includes(a.id), `${a.id} fehlt`);
    wahr(html.includes(a.bild), `${a.id}: das Bild ist nicht eingebettet`);
  }
  wahr(html.includes('oneSCM Portal'), 'das Projekt fehlt');
  wahr(html.includes('Vergleich mit Release 4.2'), 'die Notiz fehlt');
  wahr(html.includes('#kontrast'), 'die Begriffe fehlen');
  wahr(html.includes('M. Ackermann'), 'die erfassende Person fehlt');
  wahr(html.includes('Vorher'), 'die Rolle fehlt');
  wahr(html.includes('01.06.2025'), 'das Datum steht nicht in deutscher Schreibweise');
  wahr(html.includes('300 × 200'), 'die Ausschnittmaße fehlen');
  wahr(html.includes('x 12, y 34'), 'die Lage des Ausschnitts fehlt');
  wahr(html.includes('schirm.png'), 'die Quelle wird nicht genannt');
  wahr(html.includes('unvollständig'), 'die unvollständige Aufnahme ist nicht markiert');
});

s.test('Freitext aus den Metadaten kann das Dokument nicht zerlegen', () => {
  const html = kern.baueKontaktbogen(bogenProbe(), { stand: '2025-06-30' });
  wahr(!html.includes('<script>alert(1)</script>'), 'ungefiltertes Markup im Dokument');
  wahr(html.includes('&lt;script&gt;'), 'der Text wurde nicht maskiert');
  wahr(html.includes('&quot;Anführung&quot;') || html.includes('&quot;'), 'Anführungszeichen nicht maskiert');
  gleich(kern.maskiereHtml('a<b>&"\''), 'a&lt;b&gt;&amp;&quot;&#39;');
});

s.test('der Kontaktbogen kommt ohne jeden externen Verweis aus', () => {
  const html = kern.baueKontaktbogen(bogenProbe(), { stand: '2025-06-30' });
  gleich((html.match(/https?:\/\//g) || []).length, 0, 'das Blatt lädt von außen');
  wahr(!/<script/i.test(html), 'das Blatt führt Skript aus');
  wahr(html.includes('ui-sans-serif'), 'keine Systemschrift – das Blatt bräuchte einen Schriftserver');
});

s.test('die Zusammenfassung zählt die Auswahl', () => {
  const html = kern.baueKontaktbogen(bogenProbe(), { stand: '2025-06-30' });
  wahr(html.includes('<b>2</b> Aufnahmen'), 'Anzahl falsch');
  wahr(html.includes('<b>1</b> unvollständig'), 'offene Aufnahmen falsch gezählt');
  wahr(html.includes('<b>2</b> Projekte'), 'Projekte falsch gezählt');
  const einer = kern.baueKontaktbogen([bogenProbe()[0]], { stand: '2025-06-30' });
  wahr(einer.includes('<b>1</b> Aufnahme<'), 'Einzahl wird nicht gebildet');
});

s.test('eine eingeschränkte Auswahl wird im Blatt benannt', () => {
  const teil = [bogenProbe()[1]];
  const html = kern.baueKontaktbogen(teil, { stand: '2025-06-30', auswahl: 'Unvollständig', gesamt: 7 });
  wahr(html.includes('1 von 7 Aufnahmen'), 'der Ausschnitt wird nicht benannt');
  wahr(html.includes('Unvollständig'));
  const ganz = kern.baueKontaktbogen(bogenProbe(), { stand: '2025-06-30', auswahl: '', gesamt: 2 });
  wahr(!ganz.includes('Ausschnitt aus dem Eingang'), 'ohne Einschränkung erscheint ein Hinweis');
});

s.test('ein leerer Kontaktbogen bleibt lesbar', () => {
  const html = kern.baueKontaktbogen([], { stand: '2025-06-30' });
  wahr(html.startsWith('<!doctype html>'));
  wahr(html.includes('Keine Aufnahmen in dieser Auswahl'), 'kein Hinweis auf die leere Auswahl');
  wahr(html.includes('<b>0</b> Aufnahmen'));
});

s.test('die Größengrenze der Ablage ist bekannt', () => {
  gleich(kern.HOECHSTGROESSE_DATEI, 16 * 1024 * 1024);
});

/* ------------------------------------------------------- Import: Archive */

s.test('das Verzeichnis eines ZIP wird gelesen', () => {
  const zip = baueZip([
    { name: 'ordner/eins.txt', inhalt: 'eins' },
    { name: 'zwei.bin', inhalt: Buffer.alloc(40, 7), gepackt: false }
  ]);
  const eintraege = kern.leseZipVerzeichnis(zip);
  gleich(eintraege.length, 2);
  gleich(eintraege[0].name, 'ordner/eins.txt');
  gleich(eintraege[0].verfahren, 8, 'Deflate wird nicht erkannt');
  gleich(eintraege[1].verfahren, 0, 'Gespeichert wird nicht erkannt');
  gleich(eintraege[1].roh, 40);
  tieferGleich(kern.leseZipVerzeichnis(Buffer.from('kein Archiv')), [], 'Nicht-Archive müssen leer bleiben');
});

s.test('gespeicherte und gepackte Einträge kommen heil heraus', async () => {
  const zip = baueZip([
    { name: 'gepackt.txt', inhalt: 'Template wählen und Aktion ausführen' },
    { name: 'blank.txt', inhalt: 'unverändert', gepackt: false }
  ]);
  const eintraege = kern.leseZipVerzeichnis(zip);
  const lies = async (name) =>
    new TextDecoder().decode(await kern.entpackeZipEintrag(zip, eintraege.find((e) => e.name === name)));
  gleich(await lies('gepackt.txt'), 'Template wählen und Aktion ausführen');
  gleich(await lies('blank.txt'), 'unverändert');
});

s.test('eine Präsentation gibt Bilder je Folie samt Text', async () => {
  const pptx = bauePptx();
  const eintraege = kern.leseZipVerzeichnis(pptx);
  const { bilder, uebergangen } = kern.officeBilder(eintraege);
  tieferGleich(bilder.map((b) => b.name), ['ppt/media/image1.png', 'ppt/media/image2.png']);
  tieferGleich(uebergangen, ['ppt/media/image3.emf'], 'EMF muss genannt und übergangen werden');

  const folien = kern.officeFolien(eintraege);
  gleich(folien.length, 2);
  gleich(folien[0].name, 'Folie 1');
  wahr(folien[0].rels, 'die Beziehungsdatei der Folie fehlt');
  const text = kern.officeText(await kern.entpackeZipEintrag(pptx, folien[1].xml));
  gleich(text, 'Create Template');
  tieferGleich(kern.medienAusRels(await kern.entpackeZipEintrag(pptx, folien[1].rels)), ['image2.png']);
});

s.test('ein Word-Dokument hat einen Träger und ein Bild', async () => {
  const docx = baueDocx();
  const eintraege = kern.leseZipVerzeichnis(docx);
  const folien = kern.officeFolien(eintraege);
  gleich(folien.length, 1);
  gleich(folien[0].name, 'Dokument');
  gleich(kern.officeText(await kern.entpackeZipEintrag(docx, folien[0].xml)), 'Vertrag anlegen');
  tieferGleich(kern.medienAusRels(await kern.entpackeZipEintrag(docx, folien[0].rels)), ['image1.png']);
  tieferGleich(kern.officeBilder(eintraege).bilder.map((b) => b.name), ['word/media/image1.png']);
});

s.test('image10 steht hinter image9', () => {
  const namen = ['image10.png', 'image2.png', 'image1.png'].sort(kern.natuerlich);
  tieferGleich(namen, ['image1.png', 'image2.png', 'image10.png']);
});

s.test('aus einer PDF kommen die eingebetteten JPEG-Bilder', () => {
  const mit = kern.pdfBilder(bauePdf({ mitJpeg: true }));
  gleich(mit.bilder.length, 1);
  gleich(mit.bilder[0].typ, 'image/jpeg');
  gleich(mit.hinweis, '');
  const ohne = kern.pdfBilder(bauePdf());
  gleich(ohne.bilder.length, 0);
  wahr(ohne.hinweis.includes('keine JPEG-Bilder'), 'der Grund wird nicht genannt');
  wahr(kern.pdfBilder(Buffer.from('nix')).hinweis.includes('keine PDF-Datei'));
});

s.test('die Dateiart hängt an der Endung, nicht am Zufall', () => {
  gleich(kern.dateiArt('Screen Market.PNG'), 'bild');
  gleich(kern.dateiArt('a.jpeg'), 'bild');
  gleich(kern.dateiArt('deck.pptx'), 'pptx');
  gleich(kern.dateiArt('text.docx'), 'docx');
  gleich(kern.dateiArt('liste.xlsx'), 'xlsx');
  gleich(kern.dateiArt('brief.pdf'), 'pdf');
  gleich(kern.dateiArt('alt.ppt'), 'alt');
  gleich(kern.dateiArt('irgendwas.zip'), 'unbekannt');
  gleich(kern.bildTyp('x.jpg'), 'image/jpeg');
  gleich(kern.bildTyp('x.emf'), '', 'EMF hat keinen Browsertyp');
});

s.test('der Titel eines Imports nennt die Folge nur, wenn es mehrere sind', () => {
  gleich(kern.importTitel('Template_Market-Settings.png', 1, 1), 'Template Market Settings');
  gleich(kern.importTitel('image2.png', 2, 7), 'image2 (2/7)');
});

s.test('ein echtes PNG lässt sich bauen - sonst prüft die Oberfläche nichts', () => {
  const png = baueTestPng(32, 16);
  gleich([...png.subarray(1, 4)].map((b) => String.fromCharCode(b)).join(''), 'PNG');
  gleich(png.readUInt32BE(16), 32);
  gleich(png.readUInt32BE(20), 16);
});

export default s;
