/** Kernlogik von Aufnahme und Eingang - ohne Browser. */
import { suite, wahr, gleich, tieferGleich, nahe } from '../hilfen/pruefe.mjs';
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
  // Seit 1.34.0 liegt die Vorschau in der Datenbank: ein Satz ohne Bild ist
  // gültig, einer ohne Kennung nicht - und ein kaputter Bildwert fällt weg.
  const mitMuell = JSON.stringify({
    version: 2,
    aufnahmen: [...eingangProbe(), { id: 'ohne-bild' }, null, { bild: 'data:image/jpeg;base64,X' }, { id: 'x', bild: 'nein' }]
  });
  const gelesen = kern.leseEingang(mitMuell);
  gleich(gelesen.length, 4, 'unbrauchbare Sätze werden übernommen');
  gleich(gelesen[3].id, 'ohne-bild');
  gleich(gelesen[3].bild, '', 'ein Satz ohne Vorschau bekommt kein erfundenes Bild');
  const kaputtesDatum = kern.leseEingang(
    JSON.stringify({ aufnahmen: [{ ...eingangProbe()[0], datum: 'gestern' }] })
  );
  gleich(kaputtesDatum[0].datum, '2025-06-01', 'unlesbares Datum wird nicht aus der Erfassung ersetzt');
});

s.test('Schreiben und Lesen ergeben denselben Stand – ohne die Vorschauen', () => {
  const liste = eingangProbe();
  const geschrieben = kern.schreibeEingang(liste);
  const zurueck = kern.leseEingang(geschrieben);
  gleich(zurueck.length, liste.length);
  gleich(zurueck[0].id, liste[0].id);
  tieferGleich(zurueck[2].begriffe, liste[2].begriffe);
  gleich(JSON.parse(geschrieben).version, kern.EINGANG_VERSION);

  // Die Vorschauen stehen nicht mehr im Speicher - darum ist er klein.
  gleich(JSON.parse(geschrieben).vorschauen, 'datenbank');
  gleich(zurueck[0].bild, '', 'die Vorschau steht wieder im Speicher');
  wahr(
    geschrieben.length < kern.schreibeEingang([]).length + liste.length * 2000,
    'der Speicherstand ist zu groß: ' + geschrieben.length
  );
  wahr(!geschrieben.includes('data:image/'), 'im Speicher steht noch ein Bild');

  // Was noch nicht in der Datenbank liegt, wird benannt.
  tieferGleich(
    kern.offeneVorschauen(liste, new Set()).map(([kennung]) => kennung),
    liste.map((a) => a.id)
  );
  tieferGleich(kern.offeneVorschauen(liste, new Set(liste.map((a) => a.id))), []);
  tieferGleich(kern.offeneVorschauen([{ id: 'A', bild: '' }], new Set()), [], 'ein Satz ohne Bild hat nichts abzulegen');
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
    ['beipackzettel', 'erzeugt_von', 'bild', 'erfasst_am', 'datum', 'titel', 'projekt', 'version', 'land',
     'seite', 'kategorie', 'status', 'rolle', 'begriffe', 'notiz', 'autor', 'browser', 'ausschnitt', 'quelle',
     'unkenntlich_gemacht', 'marken'],
    'die Feldfolge ist nicht stabil'
  );
});

s.test('der Beipackzettel bleibt auch ohne Angaben vollständig geformt', () => {
  const zettel = JSON.parse(kern.baueBeipackzettel({ bildname: 'a.png' }));
  gleich(Object.keys(zettel).length, 21, 'Felder fehlen, wenn nichts eingetragen ist');
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
    ['version', 'land', 'seite', 'status', 'rolle', 'autor', 'browser', 'unkenntlich_gemacht', 'marken'],
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
  tieferGleich(kern.SPARTEN.map((s) => s.label), ['PC', 'Van']);
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
  // Bis 1.20.0 hieß sie „…-markiert"; seither trägt sie Art und Nummer der
  // Fassung, damit mehrere nebeneinander liegen können. Das Versprechen
  // bleibt dasselbe: das Original behält seinen Namen.
  gleich(kern.fassungName('schirm-001.png', 1, false), 'schirm-001_markiert_1.png');
  gleich(kern.fassungName('schirm-001.png', 2, true), 'schirm-001_blurrt_2.png');
  gleich(kern.fassungName('a.b.c.jpeg', 1, false), 'a.b.c_markiert_1.jpeg');
  gleich(kern.fassungName('ohne-endung', 1, false), 'ohne-endung_markiert_1');
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

/* ------------------------------------------------------------- Suchchat */

const chatGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6', thema: 'Templates', ebene: 1 },
    { nummer: '6.2', thema: 'Market Settings', ebene: 2 }
  ]
});

const chatEingang = [
  {
    id: 'AUF-2026-001',
    titel: 'Vorlagenliste',
    begriffe: ['vorlage'],
    gliederung: '6.2',
    rolle_label: 'dealer',
    sprache: 'de',
    sparte: 'pkw',
    markt: 'Germany',
    datum: '2026-10-01'
  },
  {
    id: 'AUF-2026-002',
    titel: 'Template anlegen',
    begriffe: ['vorlage'],
    gliederung: '6',
    rolle_label: 'market',
    sprache: 'en',
    datum: '2026-10-02',
    fassungen: [
      {
        nummer: 1,
        bild: 'data:image/png;base64,AAAA',
        marken: [{ id: 'm1', art: 'unkenntlich', x: 0, y: 0, breite: 10, hoehe: 10, stufe: 'mittel' }]
      }
    ]
  },
  { id: 'AUF-2026-003', titel: 'Ohne Stelle', begriffe: [], datum: '2026-10-03', einfuhr: { datei: 'deck.pptx', art: 'pptx' } }
];

s.test('die Frage wird gedeutet, nicht geraten', () => {
  const eins = kern.deuteFrage('Zeige mir Bilder von Dealer in Kapitel 6.2 auf Englisch', chatGliederung);
  gleich(eins.filter.rolle_label, 'dealer');
  gleich(eins.filter.sprache, 'en');
  gleich(eins.filter.stelle, '6.2');
  gleich(eins.filter.text, '', 'Füllwörter bleiben als Text hängen: ' + eins.filter.text);

  const zwei = kern.deuteFrage('die letzten 5 aus dem Import');
  gleich(zwei.filter.grenze, 5, 'die Anzahl wird als Stelle gelesen');
  tieferGleich(zwei.filter.nur, ['import']);
  gleich(zwei.filter.stelle, '');

  const drei = kern.deuteFrage('unkenntlich gemachte Bilder Pkw');
  gleich(drei.filter.sparte, 'pkw');
  tieferGleich(drei.filter.nur, ['unkenntlich']);

  const vier = kern.deuteFrage('alles ohne Stelle');
  tieferGleich(vier.filter.nur, ['ohneStelle']);

  // Ein Thema der Gliederung statt einer Nummer.
  const fuenf = kern.deuteFrage('Market Settings', chatGliederung);
  gleich(fuenf.filter.stelle, '6.2');
  wahr(fuenf.erkannt.some((e) => e.includes('6.2')), 'die erkannte Stelle wird nicht genannt');

  // Eine leere Frage deutet nichts hinein.
  const leer = kern.deuteFrage('');
  gleich(leer.filter.text, '');
  gleich(leer.erkannt.length, 0);
});

s.test('der Filter findet genau die Bilder, die er nennt', () => {
  const nurDealer = kern.findeBilder(chatEingang, kern.deuteFrage('Dealer').filter, chatGliederung);
  tieferGleich(nurDealer.map((a) => a.id), ['AUF-2026-001']);

  // Eine Stelle nimmt ihre Unterstellen mit.
  const kapitel = kern.findeBilder(chatEingang, kern.deuteFrage('Kapitel 6', chatGliederung).filter, chatGliederung);
  tieferGleich(kapitel.map((a) => a.id).sort(), ['AUF-2026-001', 'AUF-2026-002']);

  tieferGleich(
    kern.findeBilder(chatEingang, kern.deuteFrage('alles ohne Stelle').filter, chatGliederung).map((a) => a.id),
    ['AUF-2026-003']
  );
  tieferGleich(
    kern.findeBilder(chatEingang, kern.deuteFrage('unkenntlich').filter, chatGliederung).map((a) => a.id),
    ['AUF-2026-002']
  );
  tieferGleich(
    kern.findeBilder(chatEingang, kern.deuteFrage('aus dem Import').filter, chatGliederung).map((a) => a.id),
    ['AUF-2026-003']
  );
  gleich(kern.findeBilder(chatEingang, kern.deuteFrage('Markt Germany').filter, chatGliederung).length, 1);
  gleich(kern.findeBilder(chatEingang, { grenze: 2 }, chatGliederung).length, 2, 'die Grenze greift nicht');
  gleich(kern.findeBilder(chatEingang, kern.deuteFrage('Koreanisch').filter, chatGliederung).length, 0);
});

s.test('die Antwort sagt, was gesucht wurde – auch wenn nichts da ist', () => {
  const deutung = kern.deuteFrage('Dealer in Kapitel 6.2', chatGliederung);
  const treffer = kern.findeBilder(chatEingang, deutung.filter, chatGliederung);
  const satz = kern.chatAntwortText(deutung, treffer, chatEingang.length);
  wahr(satz.startsWith('1 von 3 Bildern'), satz);
  wahr(satz.includes('Rolle Dealer'), 'die Deutung fehlt in der Antwort');

  const ohne = kern.chatAntwortText(kern.deuteFrage('Koreanisch'), [], 3);
  wahr(ohne.startsWith('Kein Treffer für'), ohne);
  wahr(ohne.includes('Von 3 Bildern passt keines'));
  wahr(kern.chatAntwortText(kern.deuteFrage('x'), [], 0).includes('noch kein Bild'));
});

s.test('das Fenster bleibt im Bild und behält seine Lage', () => {
  const lage = kern.leseChatlage(kern.schreibeChatlage({ x: 40, y: 120, breite: 420, hoehe: 500, offen: true }));
  gleich(lage.x, 40);
  gleich(lage.breite, 420);
  gleich(lage.offen, true);
  gleich(kern.leseChatlage('kein json'), null);
  gleich(kern.leseChatlage(null), null);
  // Zu klein wird aufgezogen, zu weit draußen zurückgeholt.
  gleich(kern.leseChatlage(JSON.stringify({ breite: 10 })).breite, 280);
  const eng = kern.haltImBild({ x: 5000, y: -40, breite: 400, hoehe: 400 }, { breite: 1000, hoehe: 700 });
  gleich(eng.x, 592);
  gleich(eng.y, 8);
  const winzig = kern.haltImBild({ x: 0, y: 0, breite: 900, hoehe: 900 }, { breite: 500, hoehe: 400 });
  gleich(winzig.breite, 484);
  gleich(winzig.hoehe, 384);
});

/* ----------------------------------------------------------- Drei Agenten */

const agentenGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6', thema: 'Templates', ebene: 1 },
    { nummer: '6.1', thema: 'Documents', ebene: 2 },
    { nummer: '6.2', thema: 'Emails', ebene: 2 },
    { nummer: '6.3', thema: 'System Notifications', ebene: 2 },
    { nummer: '7', thema: 'Verträge', ebene: 1 },
    { nummer: '7.1', thema: 'Anlegen', ebene: 2 }
  ]
});

const fertigesBild = (zusatz) => ({
  titel: 'Vorlagenliste öffnen',
  projekt: 'oneSCM Portal',
  kategorie: 'Navigation',
  begriffe: ['vorlage'],
  voll: true,
  breite: 1920,
  sprache: 'de',
  rolle_label: 'dealer',
  sparte: 'pkw',
  ...zusatz
});

s.test('der rote Faden findet Lücken, Sprünge und Folgen ohne Anweisung', () => {
  const eingang = [
    fertigesBild({ id: 'A1', gliederung: '6.1' }),
    fertigesBild({ id: 'A2', gliederung: '6.3', titel: 'Template anlegen' }),
    fertigesBild({ id: 'A3', gliederung: '', titel: 'Noch ohne Stelle' })
  ];
  const strecken = [
    {
      id: 'S1',
      name: 'Weg',
      spalten: 2,
      schritte: [
        { art: 'schritt', aufnahmen: ['A2'], text: 'zuerst anlegen' },
        { art: 'schritt', aufnahmen: ['A1'], text: '' },
        { art: 'platzhalter', aufnahmen: [], text: 'Freigabe fehlt' }
      ]
    }
  ];
  const ergebnis = kern.pruefeFaden(eingang, agentenGliederung, strecken);
  gleich(ergebnis.agent, 'faden');
  const titel = ergebnis.befunde.map((b) => b.titel);
  wahr(titel.some((x) => /ohne Anweisung/.test(x)), 'der Schritt ohne Anweisung fehlt: ' + titel.join(' | '));
  wahr(titel.some((x) => /Platzhalter/.test(x)));
  wahr(titel.some((x) => /L(ü|ue)cke/.test(x)), 'die Lücke bei 6.2 fehlt');
  wahr(titel.some((x) => /gegen die Gliederung/.test(x)), 'der Rücksprung fehlt');
  wahr(titel.some((x) => /ohne Stelle/.test(x)));
  // Das Wichtigste steht oben.
  gleich(ergebnis.befunde[0].art, 'fehler');
  const inFolge = ergebnis.kennzahlen.find((k) => k.schild === 'in einer Folge');
  gleich(inFolge.wert, '2');
  gleich(inFolge.zusatz, '67 %');
});

s.test('eine saubere Folge gibt dem roten Faden nichts zu sagen', () => {
  const eingang = [
    fertigesBild({ id: 'A1', gliederung: '6.1' }),
    fertigesBild({ id: 'A2', gliederung: '6.2', titel: 'Emails pflegen' })
  ];
  const strecken = [
    {
      id: 'S1',
      name: 'Weg',
      spalten: 2,
      schritte: [
        { art: 'schritt', aufnahmen: ['A1'], text: 'eins' },
        { art: 'schritt', aufnahmen: ['A2'], text: 'zwei' }
      ]
    }
  ];
  const ergebnis = kern.pruefeFaden(eingang, agentenGliederung, strecken);
  gleich(ergebnis.befunde.length, 0, 'es wird etwas beanstandet: ' + ergebnis.befunde.map((b) => b.titel).join(' | '));
});

s.test('das Audit prüft jedes Bild für sich', () => {
  const eingang = [
    fertigesBild({ id: 'A1', gliederung: '6.1' }),
    fertigesBild({ id: 'A2', gliederung: '6.1', voll: false, breite: 800, sprache: '', titel: 'kurz' }),
    fertigesBild({ id: 'A3', gliederung: '9.9', titel: 'FIN eingeben und prüfen' }),
    { id: 'A4', titel: 'Vorlagenliste öffnen', begriffe: [], voll: true, breite: 1920 }
  ];
  const ergebnis = kern.pruefeAudit(eingang, agentenGliederung, [
    { id: 'S1', name: 'x', schritte: [{ art: 'schritt', aufnahmen: ['A9'], text: 'weg' }] }
  ]);
  const titel = ergebnis.befunde.map((b) => b.titel);
  wahr(titel.some((x) => /nur als Vorschau/.test(x)), titel.join(' | '));
  wahr(titel.some((x) => /unter 1280 px/.test(x)));
  wahr(titel.some((x) => /unvollständig/.test(x)));
  wahr(titel.some((x) => /ohne Sprache/.test(x)));
  wahr(titel.some((x) => /Titel doppelt/.test(x)), 'zwei gleiche Titel fallen nicht auf');
  wahr(titel.some((x) => /Titel zu knapp/.test(x)));
  wahr(titel.some((x) => /personenbezogene Daten/.test(x)), 'der Hinweis auf die FIN fehlt');
  wahr(titel.some((x) => /Stelle, die es nicht gibt/.test(x)), '9.9 fällt nicht auf');
  wahr(titel.some((x) => /gelöschte Bilder/.test(x)), 'der verwaiste Schritt fehlt');
  gleich(ergebnis.kennzahlen[0].wert, '4');

  // Ein abgedecktes Bild steht nicht mehr im Verdacht.
  const abgedeckt = kern.pruefeAudit(
    [
      fertigesBild({
        id: 'A1',
        gliederung: '6.1',
        titel: 'FIN eingeben und prüfen',
        fassungen: [
          { nummer: 1, bild: 'data:image/png;base64,AA', marken: [{ id: 'm', art: 'unkenntlich', x: 0, y: 0, breite: 5, hoehe: 5 }] }
        ]
      })
    ],
    agentenGliederung,
    []
  );
  wahr(
    !abgedeckt.befunde.some((b) => /personenbezogene Daten/.test(b.titel)),
    'das abgedeckte Bild steht weiter im Verdacht'
  );
});

s.test('die Empfehlung sagt, was als nächstes zu tun ist', () => {
  const eingang = [
    fertigesBild({ id: 'A1', gliederung: '6.1' }),
    fertigesBild({ id: 'A2', gliederung: '6.1', titel: 'Zweiter Schritt' }),
    fertigesBild({ id: 'A3', gliederung: '6.1', titel: 'Dritter Schritt' }),
    fertigesBild({ id: 'A4', gliederung: '', titel: 'Noch ohne Stelle' })
  ];
  const ergebnis = kern.empfehlungen(eingang, agentenGliederung, []);
  const titel = ergebnis.befunde.map((b) => b.titel);
  wahr(titel.some((x) => /zuordnen/.test(x)), titel.join(' | '));
  wahr(titel.some((x) => /Folge für 6.1 anlegen/.test(x)), 'aus drei Bildern wird keine Folge empfohlen');
  wahr(titel.some((x) => /Kapitel 7 aufnehmen/.test(x)), 'das leere Kapitel fehlt');
  wahr(titel.some((x) => /Zweite Sprache/.test(x)));
  wahr(titel.some((x) => /Nur eine Rolle/.test(x)));
  // Das Dringendste steht oben.
  gleich(ergebnis.befunde[0].gewicht, 5);
  gleich(ergebnis.kennzahlen.find((k) => k.schild === 'Deckung').wert, '50 %');

  // Eine fertige Folge führt ins Designstudio.
  const mitFolge = kern.empfehlungen(eingang, agentenGliederung, [
    {
      id: 'S1',
      name: 'Weg',
      schritte: [
        { art: 'schritt', aufnahmen: ['A1'], text: 'eins' },
        { art: 'schritt', aufnahmen: ['A2'], text: 'zwei' }
      ]
    }
  ]);
  const blatt = mitFolge.befunde.find((b) => /Blatt aus/.test(b.titel));
  wahr(blatt, 'die fertige Folge führt nicht ins Designstudio');
  gleich(blatt.weg, 'design');
});

s.test('ein leerer Bestand bringt alle vier Agenten nicht aus der Ruhe', () => {
  for (const id of ['faden', 'audit', 'sprache', 'empfehlung']) {
    const ergebnis = kern.fuehreAgent(id, [], agentenGliederung, []);
    gleich(ergebnis.agent, id);
    wahr(Array.isArray(ergebnis.befunde), id + ' gibt keine Liste zurück');
    wahr(ergebnis.kennzahlen.length > 0, id + ' hat keine Kennzahlen');
  }
  tieferGleich(kern.fuehreAgent('unbekannt', [], [], []).befunde, []);
  // Ohne Bestand ist das Kapitel-Aufnehmen die einzige sinnvolle Empfehlung.
  const leer = kern.empfehlungen([], agentenGliederung, []);
  wahr(leer.befunde.some((b) => /aufnehmen/.test(b.titel)), leer.befunde.map((b) => b.titel).join(' | '));
});

s.test('der Bericht ist lesbarer Text mit allen Befunden', () => {
  const ergebnisse = ['faden', 'audit', 'empfehlung'].map((id) =>
    kern.fuehreAgent(id, [fertigesBild({ id: 'A1', gliederung: '6.1' })], agentenGliederung, [])
  );
  const text = kern.berichtAlsText(ergebnisse, { stand: '2026-10-17T10:00:00Z', anwendung: '1.27.0' });
  wahr(text.startsWith('Prüfbericht Screenarchiv 1.27.0'), text.slice(0, 60));
  wahr(text.includes('Stand: 17.10.2026, 10:00'));
  for (const label of ['Roter Faden', 'Audit', 'Empfehlung']) wahr(text.includes('## ' + label), label + ' fehlt');
  wahr(text.includes('Betrifft:') || text.includes('Kein Befund.'));
  const mitKommentar = kern.berichtAlsText([{ ...ergebnisse[1], kommentar: 'Der Bestand ist dünn.' }]);
  wahr(mitKommentar.includes('Kommentar von Claude:'));
  wahr(mitKommentar.includes('Der Bestand ist dünn.'));
});

s.test('Gliederungsnummern vergleichen sich Teil für Teil', () => {
  wahr(kern.vergleicheKapitel('6.2', '6.10') < 0, '6.2 steht nicht vor 6.10');
  wahr(kern.vergleicheKapitel('6.10', '6.2') > 0);
  gleich(kern.vergleicheKapitel('6', '6'), 0);
  wahr(kern.vergleicheKapitel('6', '6.1') < 0, 'das Kapitel steht nicht vor seinem Unterkapitel');
  wahr(kern.vergleicheKapitel('A.1', '6.1') > 0, 'Anhänge stehen nicht hinter Zahlen');
});

/* ----------------------------------------------- Designstudio: Einstellungen */

s.test('die Einstellungen des Studios überleben das Ablegen; Unsinn fällt weg', () => {
  const vorgabe = kern.leereDesignEinstellungen();
  gleich(vorgabe.vorlage, 'quickguide');
  gleich(vorgabe.deckblatt, false);
  tieferGleich(vorgabe.kopf, ['titel', 'vorlage', 'seitenzahl']);

  const zurueck = kern.leseDesignEinstellungen(
    kern.schreibeDesignEinstellungen({
      ...vorgabe,
      vorlage: 'onepager',
      format: 'a4-quer',
      deckblatt: true,
      titel: 'oneSCM',
      kopf: ['titel', 'quatsch', 'kapitel'],
      fuss: ['hinweis']
    })
  );
  gleich(zurueck.vorlage, 'onepager');
  gleich(zurueck.format, 'a4-quer');
  gleich(zurueck.deckblatt, true);
  gleich(zurueck.titel, 'oneSCM');
  tieferGleich(zurueck.kopf, ['titel', 'kapitel'], 'unbekannte Teile werden übernommen');
  tieferGleich(zurueck.fuss, ['hinweis']);

  // Ein unbekanntes Format gilt nicht, kaputter Text gibt die Vorgabe.
  gleich(kern.leseDesignEinstellungen(JSON.stringify({ format: 'a3' })).format, '');
  gleich(kern.leseDesignEinstellungen('kein json').vorlage, 'quickguide');
  gleich(kern.leseDesignEinstellungen(null).texte, true);
});

s.test('eine eigene Vorlage hat die Form der eingebauten', () => {
  gleich(kern.eigeneVorlage({ label: '  ' }), null, 'eine Vorlage ohne Namen wird angelegt');
  const eigen = kern.eigeneVorlage({ label: 'Schulungsblatt', spalten: 9, zeilen: 0, textspalte: 0.9, textlaenge: 5 });
  gleich(eigen.id, 'eigen-schulungsblatt');
  gleich(eigen.eigen, true);
  gleich(eigen.spalten, 4, 'die Spalten werden nicht begrenzt');
  gleich(eigen.zeilen, 1);
  gleich(eigen.textspalte, 0.6);
  gleich(eigen.textlaenge, 40);
  gleich(eigen.format, 'a4-hoch');

  const alle = kern.alleVorlagen([eigen]);
  gleich(alle.length, kern.VORLAGEN.length + 1);
  gleich(kern.vorlageAus('eigen-schulungsblatt', [eigen]).label, 'Schulungsblatt');
  gleich(kern.vorlageAus('gibtsnicht', [eigen]).id, kern.VORLAGEN[0].id, 'eine unbekannte Vorlage sprengt die Auswahl');

  // Die eigene Vorlage rechnet wie jede andere.
  const aufbau = kern.seitenAufteilung([{}, {}, {}, {}, {}], { vorlage: eigen, format: 'a4-hoch' });
  gleich(aufbau.seiten.length, 2, 'vier Bilder je Seite ergeben zwei Seiten');
  gleich(aufbau.vorlage.label, 'Schulungsblatt');
});

s.test('Kopf- und Fußzeile entstehen aus den gewählten Teilen', () => {
  const kontext = {
    titel: 'Vorlagen anlegen',
    kapitel: '6.2',
    projekt: 'oneSCM Portal',
    vorlage: 'Quick Guide',
    nummer: 2,
    von: 3,
    herkunft: 'Screenarchiv 1.28.0',
    stand: '2026-10-17T10:00:00Z',
    labels: 'Pkw · Dealer',
    hinweis: 'Interne Unterlage'
  };
  tieferGleich(kern.zeilenTeile(['titel', 'vorlage', 'seitenzahl'], kontext), [
    'Vorlagen anlegen',
    'Quick Guide',
    'Seite 2 von 3'
  ]);
  tieferGleich(kern.zeilenTeile(['herkunft', 'stand', 'labels', 'hinweis'], kontext), [
    'Screenarchiv 1.28.0',
    '17.10.2026, 10:00',
    'Pkw · Dealer',
    'Interne Unterlage'
  ]);
  // Ein Teil ohne Wert fällt weg, nicht die Zeile.
  tieferGleich(kern.zeilenTeile(['titel', 'kapitel'], { titel: 'nur Titel' }), ['nur Titel']);
  tieferGleich(kern.zeilenTeile([], kontext), []);
  tieferGleich(kern.zeilenTeile(['seitenzahl'], { nummer: 1 }), [], 'eine Seitenzahl ohne Gesamtzahl ist keine');
});

s.test('das Deckblatt nennt nur, was es weiß', () => {
  const blatt = kern.deckblattZeilen({
    titel: 'oneSCM – Vorlagen anlegen',
    untertitel: 'Quick Guide für Dealer',
    quelle: 'Strecke Vorlage anlegen',
    kapitel: '6.2 Market Settings',
    anzahl: 6,
    seiten: 2,
    vorlage: 'Quick Guide',
    labels: 'PC · Dealer · Deutsch',
    stand: '2026-10-17T10:00:00Z',
    hinweis: 'Interne Unterlage'
  });
  gleich(blatt.titel, 'oneSCM – Vorlagen anlegen');
  gleich(blatt.paare.length, 7, JSON.stringify(blatt.paare));
  tieferGleich(blatt.paare[0], ['Inhalt', 'Strecke Vorlage anlegen']);
  wahr(blatt.paare.some(([s, w]) => s === 'Stand' && w === '17.10.2026, 10:00'));
  gleich(blatt.hinweis, 'Interne Unterlage');

  const karg = kern.deckblattZeilen({});
  gleich(karg.titel, 'Unterlage', 'ohne Titel bleibt das Blatt namenlos');
  gleich(karg.paare.length, 0, 'leere Angaben stehen als Lücke da');
});

s.test('gemeinsame Labels werden genannt, Unterschiede gezählt', () => {
  gleich(
    kern.gemeinsameLabels([
      { sparte: 'pkw', rolle_label: 'dealer', sprache: 'de' },
      { sparte: 'pkw', rolle_label: 'dealer', sprache: 'de' }
    ]),
    'PC · Dealer · Deutsch'
  );
  gleich(
    kern.gemeinsameLabels([
      { sparte: 'pkw', rolle_label: 'dealer', sprache: 'de' },
      { sparte: 'van', rolle_label: 'dealer', sprache: 'en' }
    ]),
    '2 Sparten · Dealer · 2 Sprachen'
  );
  gleich(kern.gemeinsameLabels([]), '');
  gleich(kern.gemeinsameLabels([{}]), '');
});

/* ------------------------------------------------------------ Verzeichnis */

const verzeichnisGliederung = kern.leseGliederung({
  eintraege: [{ nummer: '6.2', thema: 'Market Settings', ebene: 2 }]
});

const verzeichnisEingang = [
  {
    id: 'AUF-2026-001',
    titel: 'Vorlagenliste öffnen',
    gliederung: '6.2',
    sprache: 'de',
    rolle_label: 'dealer',
    sparte: 'pkw',
    datum: '2026-10-17',
    kapitel: 6,
    unterkapitel: 2,
    breite: 1920,
    hoehe: 1080,
    begriffe: ['vorlage']
  },
  {
    id: 'AUF-2026-002',
    titel: 'Vorlagenliste öffnen',
    gliederung: '6.2',
    sprache: 'de',
    rolle_label: 'dealer',
    sparte: 'pkw',
    datum: '2026-10-17',
    kapitel: 6,
    unterkapitel: 2,
    begriffe: []
  },
  { id: 'AUF-2026-003', titel: 'Ohne alles', begriffe: [] }
];

s.test('der Pfad eines Bildes entsteht aus dem Muster', () => {
  const eins = kern.verzeichnisPfad(verzeichnisEingang[0], kern.VERZEICHNIS_MUSTER, verzeichnisGliederung);
  tieferGleich(eins.ordner, ['pc', 'de', '6-2', 'dealer']);
  gleich(eins.name, '2026-10-17-auf-2026-001-vorlagenliste-oeffnen');

  // Was fehlt, wird benannt statt weggelassen - ein Bild ohne Sprache landet
  // in „ohne-sprache", nicht neben den deutschen.
  const karg = kern.verzeichnisPfad(verzeichnisEingang[2], kern.VERZEICHNIS_MUSTER, verzeichnisGliederung);
  tieferGleich(karg.ordner, ['ohne-sparte', 'ohne-sprache', 'ohne-kapitel', 'ohne-rolle']);

  // Ein eigenes Muster, ein Thema aus der Gliederung, ein Tippfehler.
  const eigen = kern.verzeichnisPfad(
    verzeichnisEingang[0],
    '{jahr}/{monat}/{thema}/{quatsch}-{kennung}',
    verzeichnisGliederung
  );
  tieferGleich(eigen.ordner, ['2026', '10', 'market-settings']);
  wahr(eigen.name.startsWith('quatsch'), 'ein unbekannter Platzhalter verschwindet stumm: ' + eigen.name);

  // Ein leeres Muster gibt dennoch einen Dateinamen.
  gleich(kern.verzeichnisPfad(verzeichnisEingang[0], '///', verzeichnisGliederung).name, 'auf-2026-001');
});

s.test('der Plan nennt jede Datei und lässt keine überschreiben', () => {
  const strecken = [
    {
      id: 'STR-1',
      name: 'Weg A',
      schritte: [
        { art: 'schritt', aufnahmen: ['AUF-2026-001'], text: 'eins' },
        { art: 'schritt', aufnahmen: ['AUF-2026-002'], text: 'zwei' }
      ]
    }
  ];
  const plan = kern.verzeichnisPlan(verzeichnisEingang, {}, verzeichnisGliederung, strecken);
  const pfade = plan.map((d) => [...d.ordner, d.name].join('/'));
  gleich(plan.filter((d) => d.art === 'bild').length, 3);
  gleich(plan.filter((d) => d.art === 'zettel').length, 3);
  wahr(pfade.includes('index.json') && pfade.includes('index.csv'), pfade.join(' | '));
  wahr(pfade.includes('strecken.json'));
  wahr(pfade.includes('prozesse/weg-a.bpmn'), 'der Prozess fehlt');
  // Zwei Bilder mit gleichem Titel am gleichen Tag: der zweite bekommt eine
  // Nummer, sonst überschrieben sie sich gegenseitig.
  gleich(new Set(pfade).size, pfade.length, 'zwei Dateien teilen sich einen Pfad');

  // Die Schalter wirken.
  const karg = kern.verzeichnisPlan(
    verzeichnisEingang,
    { zettel: false, index: false, strecken: false },
    verzeichnisGliederung,
    strecken
  );
  gleich(karg.length, 3, karg.map((d) => d.name).join(', '));
  gleich(kern.verzeichnisPlan([], {}, verzeichnisGliederung, []).filter((d) => d.art === 'bild').length, 0);
});

s.test('die Übersicht trägt Datei, Stelle und Labels – als JSON und als CSV', () => {
  const plan = kern.verzeichnisPlan(verzeichnisEingang, {}, verzeichnisGliederung, []);
  const index = kern.galerieIndex(verzeichnisEingang, plan, {
    stand: '2026-10-17T10:00:00Z',
    anwendung: '1.29.0',
    gliederung: verzeichnisGliederung
  });
  gleich(index.anzahl, 3);
  gleich(index.erzeugt_von, 'Screenarchiv 1.29.0');
  gleich(index.bilder[0].id, 'AUF-2026-001');
  gleich(index.bilder[0].thema, 'Market Settings');
  wahr(index.bilder[0].datei.endsWith('.png'), index.bilder[0].datei);

  const csv = kern.galerieCsv(index);
  const zeilen = csv.trim().split('\n');
  gleich(zeilen.length, 4, 'Kopfzeile und drei Bilder');
  wahr(zeilen[0].startsWith('id;datei;stelle;thema;titel'), zeilen[0]);
  wahr(zeilen[1].includes('6.2;Market Settings'));
  // Ein Semikolon im Titel darf die Spalten nicht verschieben.
  const heikel = kern.galerieCsv({ bilder: [{ id: 'X', titel: 'a;b', begriffe: ['c'] }] });
  wahr(heikel.includes('"a;b"'), heikel);
});

s.test('die Wahl des Verzeichnisses überlebt das Ablegen', () => {
  const vorgabe = kern.leereVerzeichnisWahl();
  gleich(vorgabe.muster, kern.VERZEICHNIS_MUSTER);
  gleich(vorgabe.zettel, true);
  const zurueck = kern.leseVerzeichnisWahl(
    kern.schreibeVerzeichnisWahl({ muster: '{kennung}', zettel: false, index: false })
  );
  gleich(zurueck.muster, '{kennung}');
  gleich(zurueck.zettel, false);
  gleich(zurueck.index, false);
  gleich(zurueck.fassung, true);
  gleich(kern.leseVerzeichnisWahl('kein json').muster, kern.VERZEICHNIS_MUSTER);
  gleich(kern.leseVerzeichnisWahl(JSON.stringify({ muster: '   ' })).muster, kern.VERZEICHNIS_MUSTER);
});

s.test('der Bericht sagt, was liegt – und was fehlte', () => {
  const plan = kern.verzeichnisPlan(verzeichnisEingang, {}, verzeichnisGliederung, []);
  const ganz = kern.verzeichnisBericht(plan, [], 'Screens');
  wahr(ganz.startsWith('In „Screens" liegen nun: 3 Bilder, 3 Beipackzettel'), ganz);
  wahr(ganz.includes('Übersicht'));
  const halb = kern.verzeichnisBericht(plan.slice(0, 2), ['pkw/de/x.png (kein Bild vorhanden)'], 'Screens');
  wahr(halb.includes('Nicht geschrieben wurden 1'), halb);
  wahr(halb.includes('kein Bild vorhanden'));
});

/* -------------------------------------------------------------- Varianten */

const variantenGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6.1', thema: 'Documents', ebene: 2 },
    { nummer: '6.2', thema: 'Emails', ebene: 2 }
  ]
});

const variantenEingang = () => [
  { id: 'A1', titel: 'Liste deutsch', gliederung: '6.1', sprache: 'de', rolle_label: 'dealer', kapitel: 6, unterkapitel: 1 },
  { id: 'A2', titel: 'Liste englisch', gliederung: '6.1', sprache: 'en', rolle_label: 'dealer', kapitel: 6, unterkapitel: 1 },
  { id: 'A3', titel: 'Formular deutsch', gliederung: '6.2', sprache: 'de', rolle_label: 'market', kapitel: 6, unterkapitel: 2 },
  { id: 'A4', titel: 'Ohne Sprache', gliederung: '6.2', kapitel: 6, unterkapitel: 2 }
];

s.test('zwei Aufnahmen werden zur Variantengruppe und wieder getrennt', () => {
  const ergebnis = kern.verbindeVarianten(variantenEingang(), ['A1', 'A2'], 1760000000000);
  wahr(ergebnis.gruppe.startsWith('VAR-'), ergebnis.gruppe);
  gleich(ergebnis.verbunden, 2);
  tieferGleich(kern.variantenVon(ergebnis.eingang, ergebnis.eingang[0]).map((a) => a.id), ['A1', 'A2']);

  // Eine dritte kommt dazu - die Gruppe bleibt dieselbe.
  const dritte = kern.verbindeVarianten(ergebnis.eingang, ['A2', 'A3']);
  gleich(dritte.gruppe, ergebnis.gruppe, 'das zweite Verbinden legt eine neue Gruppe an');
  gleich(dritte.verbunden, 3);

  // Eine einzelne Aufnahme ist keine Gruppe.
  gleich(kern.verbindeVarianten(variantenEingang(), ['A1']).gruppe, '');

  // Lösen nimmt nur eine heraus; bleibt eine allein, löst sich die Gruppe.
  const geloest = kern.loeseVariante(dritte.eingang, 'A3');
  gleich(kern.variantengruppe(geloest.find((a) => a.id === 'A3')), '');
  gleich(kern.variantenVon(geloest, geloest.find((a) => a.id === 'A1')).length, 2);
  const leer = kern.loeseVariante(geloest, 'A2');
  gleich(kern.variantengruppe(leer.find((a) => a.id === 'A1')), '', 'die Gruppe mit einem Mitglied bleibt bestehen');
});

s.test('die Entsprechung in einer Sprache wird gefunden – oder benannt', () => {
  const { eingang } = kern.verbindeVarianten(variantenEingang(), ['A1', 'A2']);
  const eins = eingang.find((a) => a.id === 'A1');
  gleich(kern.findeVariante(eingang, eins, 'sprache', 'en').id, 'A2');
  gleich(kern.findeVariante(eingang, eins, 'sprache', 'de').id, 'A1', 'die eigene Sprache findet sich selbst');
  gleich(kern.findeVariante(eingang, eins, 'sprache', 'fr'), null);
  gleich(kern.findeVariante(eingang, eins, 'titel', 'x'), null, 'der Titel ist kein Variantenfeld');
  tieferGleich(kern.fehlendeVarianten(eingang, eins, 'sprache', ['de', 'en', 'fr']), ['fr']);
  // Ohne Gruppe ist eine Aufnahme ihre eigene einzige Variante.
  const allein = variantenEingang()[2];
  tieferGleich(kern.variantenVon(variantenEingang(), allein).map((a) => a.id), ['A3']);
});

s.test('die Deckungsmatrix zählt je Stelle und Wert', () => {
  const matrix = kern.deckungsMatrix(variantenGliederung, variantenEingang(), 'sprache');
  tieferGleich(matrix.spalten.map((s) => s.label), ['Deutsch', 'Englisch']);
  gleich(matrix.zeilen.length, 2);
  gleich(matrix.zeilen[0].nummer, '6.1');
  gleich(matrix.zeilen[0].thema, 'Documents');
  tieferGleich(matrix.zeilen[0].zellen.map((c) => c.zahl), [1, 1]);
  tieferGleich(matrix.zeilen[1].zellen.map((c) => c.zahl), [1, 0]);
  gleich(matrix.zeilen[1].ohne, 1, 'das Bild ohne Sprache fehlt in der Zeile');
  gleich(matrix.zeilen[1].gesamt, 2);
  tieferGleich(matrix.summen, [2, 1]);
  gleich(matrix.ohne, 1);
  gleich(matrix.vollstaendig, 1, 'nur 6.1 ist in jeder Sprache belegt');

  // Eine Stelle, die es in der Gliederung nicht gibt, wird dennoch gezeigt.
  const fremd = kern.deckungsMatrix(variantenGliederung, [{ id: 'X', gliederung: '9.9', sprache: 'de' }], 'sprache');
  gleich(fremd.zeilen[0].bekannt, false);
  // Ohne Labels gibt es keine Spalten - und damit nichts zu behaupten.
  gleich(kern.deckungsMatrix(variantenGliederung, [{ id: 'X', gliederung: '6.1' }], 'sprache').spalten.length, 0);
  gleich(kern.deckungsMatrix(variantenGliederung, [], 'rolle_label').zeilen.length, 0);
});

s.test('eine Strecke lässt sich in eine andere Sprache umstellen', () => {
  const { eingang } = kern.verbindeVarianten(variantenEingang(), ['A1', 'A2']);
  const strecke = {
    ...kern.leereStrecke('Vorlage anlegen'),
    schritte: [kern.streckeSchritt('A1', 'Liste öffnen'), kern.streckeSchritt('A3', 'Formular füllen')]
  };
  const englisch = kern.streckeInVariante(strecke, eingang, 'sprache', 'en');
  tieferGleich(englisch.strecke.schritte[0].aufnahmen, ['A2'], 'der erste Schritt wurde nicht umgestellt');
  tieferGleich(englisch.strecke.schritte[1].aufnahmen, ['A3'], 'ohne Entsprechung bleibt das Bild stehen');
  gleich(englisch.fehlt.length, 1);
  gleich(englisch.fehlt[0].nummer, 2);
  gleich(englisch.fehlt[0].titel, 'Formular deutsch');
  wahr(englisch.strecke.name.endsWith('· Englisch'), englisch.strecke.name);
  // Die Anweisungen bleiben; nur die Bilder wechseln.
  gleich(englisch.strecke.schritte[0].text, 'Liste öffnen');
  // In der eigenen Sprache ändert sich nichts.
  gleich(kern.streckeInVariante(strecke, eingang, 'sprache', 'de').fehlt.length, 0);
});

/* --------------------------------------------------------------- Handbuch */

const handbuchGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6', thema: 'Templates', ebene: 1 },
    { nummer: '6.1', thema: 'Documents', ebene: 2, kriterium: 0 },
    { nummer: '6.2', thema: 'Emails', ebene: 2 },
    { nummer: '7', thema: 'Verträge', ebene: 1 },
    { nummer: 'Ü1', thema: 'Übergang', ebene: 2, art: 'uebergang' }
  ],
  texte: ['Die Vorlage ist angelegt.']
});

const handbuchEingang = [
  {
    id: 'A1',
    titel: 'Liste öffnen',
    gliederung: '6.1',
    kapitel: 6,
    unterkapitel: 1,
    sprache: 'de',
    bild: 'data:image/png;base64,AA',
    erfasst_am: '2026-10-17T08:00:00Z'
  },
  {
    id: 'A2',
    titel: 'Formular füllen',
    gliederung: '6.1',
    kapitel: 6,
    unterkapitel: 1,
    bild: 'data:image/png;base64,BB',
    erfasst_am: '2026-10-17T08:05:00Z'
  }
];

const handbuchStrecken = [
  {
    id: 'S1',
    name: 'Vorlage anlegen',
    schritte: [
      { art: 'schritt', aufnahmen: ['A1'], text: 'Im Menü öffnen' },
      { art: 'schritt', aufnahmen: ['A2'], text: 'Formular füllen' }
    ]
  }
];

s.test('das Handbuch nimmt die Stellen in der Ordnung der Gliederung', () => {
  const teile = kern.handbuchTeile(handbuchGliederung, handbuchEingang, handbuchStrecken);
  tieferGleich(teile.map((t) => t.nummer), ['6', '6.1'], 'leere Zweige kommen mit oder die Ordnung stimmt nicht');
  gleich(teile[0].bilder.length, 0, 'das Kapitel selbst trägt keine eigenen Bilder');
  gleich(teile[0].nachkommen, 2, 'das Kapitel weiß nicht, was unter ihm liegt');
  gleich(teile[1].bilder.length, 2);
  // Die Anweisungen der Strecke hängen an den Bildern, die sie zeigt.
  gleich(teile[1].folge, 'Vorlage anlegen');
  tieferGleich(teile[1].schritte.map((s) => s.text), ['Im Menü öffnen', 'Formular füllen']);
  gleich(teile[1].kriterium, 'Die Vorlage ist angelegt.');

  // Die ganze Gliederung nimmt auch die leeren Stellen - ohne Übergänge.
  const alle = kern.handbuchTeile(handbuchGliederung, handbuchEingang, handbuchStrecken, { nurMitBildern: false });
  tieferGleich(alle.map((t) => t.nummer), ['6', '6.1', '6.2', '7']);
  // Ein Kapitel allein.
  const eins = kern.handbuchTeile(handbuchGliederung, handbuchEingang, handbuchStrecken, { stelle: '6' });
  tieferGleich(eins.map((t) => t.nummer), ['6', '6.1']);
  tieferGleich(kern.handbuchTeile(handbuchGliederung, [], [], {}).map((t) => t.nummer), []);
});

s.test('der Umfang wird gezählt, bevor gerechnet wird', () => {
  const teile = kern.handbuchTeile(handbuchGliederung, handbuchEingang, handbuchStrecken, { nurMitBildern: false });
  tieferGleich(kern.handbuchUmfang(teile), { stellen: 4, bilder: 2, kapitel: 2, ohneBild: 3 });
  tieferGleich(kern.handbuchUmfang([]), { stellen: 0, bilder: 0, kapitel: 0, ohneBild: 0 });
});

s.test('die Strecke zu einer Stelle ist die, die sie am besten erzählt', () => {
  const zweite = { id: 'S2', name: 'Nur ein Schritt', schritte: [{ art: 'schritt', aufnahmen: ['A1'], text: 'eins' }] };
  const beste = kern.streckeFuerStelle([zweite, ...handbuchStrecken], handbuchEingang, '6.1');
  gleich(beste.strecke.name, 'Vorlage anlegen');
  gleich(beste.treffer, 2);
  gleich(kern.streckeFuerStelle([], handbuchEingang, '6.1'), null);
  gleich(kern.streckeFuerStelle(handbuchStrecken, handbuchEingang, '9.9'), null);
});

s.test('das Handbuch ist ein vollständiges HTML mit Inhaltsverzeichnis', () => {
  const teile = kern.handbuchTeile(handbuchGliederung, handbuchEingang, handbuchStrecken);
  const html = kern.handbuchHtml(teile, {
    titel: 'oneSCM Benutzerhandbuch',
    untertitel: 'Stand 10/2026',
    hinweis: 'Interne Unterlage',
    stand: '2026-10-17T10:00:00Z',
    anwendung: '1.32.0',
    bilder: new Map([['A1', 'data:image/jpeg;base64,ZZ']])
  });
  wahr(html.startsWith('<!doctype html>'), html.slice(0, 40));
  wahr(html.includes('<title>oneSCM Benutzerhandbuch</title>'));
  wahr(html.includes('href="#stelle-6-1"'), 'das Inhaltsverzeichnis verweist nicht');
  wahr(html.includes('id="stelle-6-1"'), 'der Anker fehlt');
  wahr(html.includes('src="data:image/jpeg;base64,ZZ"'), 'das gerechnete Bild fehlt');
  wahr(html.includes('src="data:image/png;base64,BB"'), 'ohne gerechnetes Bild fehlt die Vorschau');
  wahr(html.includes('<b>1. Im Menü öffnen</b>'), 'die Anweisung steht nicht an ihrem Bild');
  wahr(html.includes('Die Vorlage ist angelegt.'), 'der Text der Gliederung fehlt');
  // Ein Kapitel, dessen Unterkapitel Bilder haben, ist keine Lücke …
  wahr(!html.includes('Zu dieser Stelle liegt noch kein Bild vor.'), 'das Kapitel wird als Lücke ausgegeben');
  // … eine Stelle ohne Bilder unter sich dagegen schon.
  const mitLuecke = kern.handbuchHtml(
    kern.handbuchTeile(handbuchGliederung, handbuchEingang, handbuchStrecken, { nurMitBildern: false }),
    { anwendung: '1.32.0' }
  );
  wahr(mitLuecke.includes('Zu dieser Stelle liegt noch kein Bild vor.'), 'die leere Stelle bleibt unerwähnt');
  wahr(html.includes('17.10.2026, 10:00') && html.includes('2 Bilder'), 'der Stand fehlt');
  wahr(html.includes('@page { size: A4 portrait'), 'ohne Druckformat ist es kein Handbuch');
  wahr(!/https?:\/\//.test(html), 'das Handbuch verweist nach außen');

  // Ohne Texte aus dem Handbuch bleiben Bilder und Anweisungen.
  const ohne = kern.handbuchHtml(teile, { mitTexten: false, anwendung: '1.32.0' });
  wahr(!ohne.includes('Die Vorlage ist angelegt.'), 'die Texte lassen sich nicht abschalten');
  wahr(ohne.includes('<b>1. Im Menü öffnen</b>'));

  // Freitext darf das Dokument nicht zerlegen.
  const boese = kern.handbuchHtml(
    [{ nummer: '1', thema: '<script>alert(1)</script>', ebene: 1, bilder: [], schritte: [], folge: '' }],
    { titel: 'A & B' }
  );
  wahr(boese.includes('&lt;script&gt;'), 'Freitext steht ungemaskiert im Dokument');
  wahr(boese.includes('<title>A &amp; B</title>'));
});

/* ------------------------------ Labels am Entwurf, Stellenwahl, Zeichen */

s.test('Sprache, Rolle, Sparte und Markt hängen schon am Entwurf', () => {
  const entwurf = kern.leereAufnahme('2026-10-17', {
    sprache: 'en',
    rolle_label: 'hq',
    sparte: 'van',
    markt: 'Korea',
    gliederung: '7.5.2'
  });
  gleich(entwurf.sprache, 'en');
  gleich(entwurf.rolle_label, 'hq');
  gleich(entwurf.sparte, 'van');
  gleich(entwurf.markt, 'Korea');
  gleich(entwurf.gliederung, '7.5.2');
  gleich(kern.leereAufnahme('2026-10-17').sprache, '', 'ohne Vorlage bleiben die Labels leer');

  const aufnahme = kern.baueAufnahme({
    entwurf: { ...entwurf, titel: 'Liste', projekt: 'oneSCM' },
    bild: 'data:image/png;base64,AA',
    ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 },
    quelle: { art: 'datei', name: 'x', breite: 10, hoehe: 10 },
    kennung: 'AUF-2026-001',
    erfasstAm: '2026-10-17T10:00:00Z'
  });
  gleich(aufnahme.sprache, 'en');
  gleich(aufnahme.rolle_label, 'hq');
  gleich(aufnahme.gliederung, '7.5.2');
  gleich(kern.labelKette(aufnahme), 'Englisch · HQ · Van · Korea');

  // Leere Labels stehen nicht als leere Felder an der Aufnahme.
  const ohne = kern.baueAufnahme({
    entwurf: kern.leereAufnahme('2026-10-17'),
    bild: 'data:image/png;base64,AA',
    ausschnitt: { x: 0, y: 0, breite: 10, hoehe: 10 },
    quelle: { art: 'datei', name: 'x', breite: 10, hoehe: 10 },
    kennung: 'AUF-2026-002',
    erfasstAm: '2026-10-17T10:00:00Z'
  });
  gleich('sprache' in ohne, false, 'leere Labels landen als leere Felder an der Aufnahme');
  gleich('gliederung' in ohne, false);
});

s.test('die Auswahl Kapitel, Unterkapitel, Stelle kennt ihre Ebenen', () => {
  const g = kern.leseGliederung({
    eintraege: [
      { nummer: '7', thema: 'Zahlungsdaten', ebene: 1 },
      { nummer: '7.5', thema: 'Digitale Unterschrift', ebene: 2 },
      { nummer: '7.5.1', thema: 'Signaturwege', ebene: 3 },
      { nummer: '7.5.2', thema: 'Signaturergebnis', ebene: 3 },
      { nummer: '8', thema: 'Rollen', ebene: 1 },
      { nummer: '8.1', thema: 'Übergang', ebene: 2, art: 'uebergang' }
    ]
  });
  tieferGleich(kern.stelleTeile('7.5.2'), ['7', '7.5', '7.5.2']);
  tieferGleich(kern.stelleTeile(''), []);
  tieferGleich(kern.stelleTeile('A'), ['A']);

  tieferGleich(kern.gliederungEbene(g, 1).map((e) => e.nummer), ['7', '8']);
  tieferGleich(kern.gliederungEbene(g, 2, '7').map((e) => e.nummer), ['7.5']);
  tieferGleich(kern.gliederungEbene(g, 3, '7.5').map((e) => e.nummer), ['7.5.1', '7.5.2']);
  tieferGleich(kern.gliederungEbene(g, 2, '8').map((e) => e.nummer), [], 'ein Übergang ist keine Stelle');
  tieferGleich(kern.gliederungEbene(g, 3, '8').map((e) => e.nummer), []);
  gleich(kern.stelleLabel(g.find((e) => e.nummer === '7.5')), '7.5  Digitale Unterschrift');
  gleich(kern.stelleLabel(null), '');
});

s.test('jede Rolle und jede Sparte hat ihr eigenes Zeichen', () => {
  for (const rolle of kern.ROLLEN_LABEL) gleich(kern.symbolZuLabel('rolle_label', rolle.label), rolle.symbol);
  for (const sparte of kern.SPARTEN) gleich(kern.symbolZuLabel('sparte', sparte.label), sparte.symbol);
  // Ein freier Wert bekommt das Zeichen seines Feldes, kein leeres.
  gleich(kern.symbolZuLabel('markt', 'Germany'), 'markt');
  gleich(kern.symbolZuLabel('sprache', 'Deutsch'), 'sprache');
  gleich(kern.symbolZuLabel('gibtsnicht', 'x'), '');

  // Die Teilschritte tragen das Zeichen je Wert mit.
  const gruppen = kern.teilschritte([{ rolle_label: 'hq', sparte: 'van' }], '');
  const rolle = gruppen.find((g) => g.feld === 'rolle_label');
  gleich(rolle.werte[0].wert, 'HQ');
  gleich(rolle.werte[0].symbol, 'rolle-hq');
});

s.test('die Sparten heißen PC und Van, die Suche kennt beide Namen', () => {
  tieferGleich(kern.SPARTEN.map((s) => s.id), ['pkw', 'van'], 'die Kennung darf sich nicht ändern');
  gleich(kern.labelWert('sparte', 'pkw'), 'PC');
  gleich(kern.deuteFrage('Bilder PC').filter.sparte, 'pkw');
  gleich(kern.deuteFrage('Pkw Bilder').filter.sparte, 'pkw', 'der alte Name wird nicht mehr verstanden');
  gleich(kern.deuteFrage('Transporter').filter.sparte, 'van');
  gleich(kern.deuteFrage('Händler').filter.rolle_label, 'dealer');
  gleich(kern.deuteFrage('Zentrale').filter.rolle_label, 'hq');
  // Das Feld Markt gewinnt gegen die Rolle Market.
  gleich(kern.deuteFrage('Markt Germany').filter.markt, 'germany');
  gleich(kern.deuteFrage('Markt Germany').filter.rolle_label, '');
});

s.test('die Zählung je Stelle bleibt bei vielen Bildern bezahlbar', () => {
  const gliederung = [];
  for (let k = 1; k <= 23; k++) {
    gliederung.push({ nummer: String(k), thema: 'Kapitel ' + k, ebene: 1, art: 'kapitel' });
    for (let u = 1; u <= 9; u++) {
      gliederung.push({ nummer: `${k}.${u}`, thema: 'Unterkapitel', ebene: 2, art: 'kapitel' });
      for (let s3 = 1; s3 <= 5; s3++) {
        gliederung.push({ nummer: `${k}.${u}.${s3}`, thema: 'Stelle', ebene: 3, art: 'kapitel' });
      }
    }
  }
  const bilder = [];
  for (let i = 0; i < 1000; i++) {
    bilder.push({ id: 'A' + i, gliederung: `${1 + (i % 23)}.${1 + (i % 9)}.${1 + (i % 5)}` });
  }
  const begonnen = Date.now();
  const { zahlen, ohneStelle } = kern.zaehleBilder(gliederung, bilder);
  const gebraucht = Date.now() - begonnen;

  // Die Summe eines Kapitels ist die seiner Stellen - das ist der Zweck.
  const eigene = bilder.filter((b) => b.gliederung.startsWith('1.')).length;
  gleich(zahlen.get('1').gesamt, eigene);
  gleich(zahlen.get('1').eigene, 0, 'das Kapitel selbst trägt keine Bilder');
  gleich(ohneStelle, 0);
  // Gerechnet wird von unten nach oben; der alte Weg (jede Stelle gegen jede)
  // brauchte dafür das Vielfache. Die Grenze ist großzügig, damit sie nicht
  // an einem langsamen Rechner scheitert - sie schlägt erst an, wenn jemand
  // zur Prüfung je Stelle zurückkehrt.
  wahr(gebraucht < 120, `zaehleBilder brauchte ${gebraucht} ms für 1265 Stellen und 1000 Bilder`);
});

s.test('der Suchtext einer Aufnahme wird nur einmal gerechnet', () => {
  const aufnahme = { id: 'A1', titel: 'Vorlagenliste', projekt: 'oneSCM', begriffe: ['vorlage'] };
  const erst = kern.eingangSuchIndex(aufnahme);
  gleich(kern.eingangSuchIndex(aufnahme), erst);
  // Ein geänderter Satz ist ein neues Objekt - und bekommt seinen eigenen Text.
  const geaendert = { ...aufnahme, titel: 'Formular' };
  wahr(kern.eingangSuchIndex(geaendert).includes('formular'), 'der gemerkte Text bleibt am alten Satz hängen');
  wahr(!kern.eingangSuchIndex(geaendert).includes('vorlagenliste'));
});

/* ------------------------------- Projekte nach Version und Land (1.35.0) */

s.test('ein Projekt ist ein Dreiklang aus Name, Version und Land', () => {
  const satz = kern.projektSatz({ name: ' oneSCM Portal ', version: ' 2.4 ', land: 'Germany' });
  gleich(satz.name, 'oneSCM Portal', 'die Leerzeichen bleiben hängen');
  gleich(satz.version, '2.4');
  gleich(satz.land, 'Germany');
  gleich(satz.id, 'PRJ-onescm-portal-2-4-germany');
  wahr(satz.angelegt_am.startsWith('20'), satz.angelegt_am);
  gleich(kern.projektKennung(satz), 'oneSCM Portal 2.4 · Germany');

  // Ohne Namen gibt es kein Projekt - Version und Land allein tragen nichts.
  gleich(kern.projektSatz({ version: '2.4', land: 'Korea' }), null);
  gleich(kern.projektSatz({}), null);

  // Dieselbe Fassung in einem anderen Land ist ein anderes Projekt.
  const korea = kern.projektSatz({ name: 'oneSCM Portal', version: '2.4', land: 'Korea' });
  wahr(korea.id !== satz.id, 'Deutschland und Korea teilen sich eine Kennung');
  // Dieselben drei Teile geben zweimal dieselbe Kennung.
  gleich(kern.projektKennzeichen('oneSCM Portal', '2.4', 'Germany'), satz.id);
  // Was fehlt, fehlt im Namen - ohne Land steht kein leerer Teil im Pfad.
  gleich(kern.projektKennzeichen('oneSCM Portal', '', ''), 'PRJ-onescm-portal');
  gleich(kern.projektKennung({ name: 'oneSCM Portal', version: '', land: '' }), 'oneSCM Portal');
});

s.test('vor dem Anlegen wird geprüft: Name, Länge, Dublette', () => {
  const vorhandene = [kern.projektSatz({ name: 'oneSCM Portal', version: '2.4', land: 'Germany' })];
  gleich(kern.pruefeProjekt({ name: 'oneSCM Portal', version: '2.4', land: 'Korea' }, vorhandene).length, 0);

  const ohneNamen = kern.pruefeProjekt({ version: '2.4' }, vorhandene);
  gleich(ohneNamen.length, 1);
  gleich(ohneNamen[0].feld, 'name');

  const zuLang = kern.pruefeProjekt({ name: 'X', version: '2.4.1-release-candidate-7' }, vorhandene);
  gleich(zuLang.length, 1);
  gleich(zuLang[0].feld, 'version');

  const doppelt = kern.pruefeProjekt({ name: 'oneSCM Portal', version: '2.4', land: 'Germany' }, vorhandene);
  gleich(doppelt.length, 1);
  wahr(doppelt[0].text.includes('gibt es schon'), doppelt[0].text);
});

s.test('die Projektliste überlebt das Speichern und bleibt sortiert', () => {
  const liste = [
    { name: 'oneSCM Portal', version: '2.4', land: 'Korea' },
    { name: 'oneSCM Portal', version: '2.3', land: 'Germany' },
    { name: 'Admin-Konsole', version: '1.0', land: 'Germany' },
    { name: '   ' }, // ohne Namen - fällt weg
    { name: 'oneSCM Portal', version: '2.4', land: 'Korea' } // Dublette - fällt weg
  ];
  const gelesen = kern.leseProjekte(kern.schreibeProjekte(liste));
  tieferGleich(
    gelesen.map(kern.projektKennung),
    ['Admin-Konsole 1.0 · Germany', 'oneSCM Portal 2.3 · Germany', 'oneSCM Portal 2.4 · Korea']
  );
  gleich(JSON.parse(kern.schreibeProjekte(gelesen)).version, kern.PROJEKTE_VERSION);

  // Kaputter oder leerer Speicher wirft die Seite nicht um.
  tieferGleich(kern.leseProjekte('{kaputt'), []);
  tieferGleich(kern.leseProjekte(''), []);
  tieferGleich(kern.leseProjekte(null), []);
  // Eine nackte Liste aus einem älteren Stand wird auch gelesen.
  gleich(kern.leseProjekte(JSON.stringify([{ name: 'A', version: '1', land: 'DE' }])).length, 1);
});

s.test('Projekte zählen ihre Bilder und werden aus dem Bestand vorgeschlagen', () => {
  const projekte = kern.leseProjekte(
    kern.schreibeProjekte([
      { name: 'oneSCM Portal', version: '2.4', land: 'Germany' },
      { name: 'oneSCM Portal', version: '2.3', land: 'Germany' }
    ])
  );
  const aufnahmen = [
    { id: 'A1', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany' },
    { id: 'A2', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany' },
    { id: 'A3', projekt: 'oneSCM Portal', version: '2.3', land: 'Germany' },
    { id: 'A4', projekt: 'oneSCM Portal', version: '2.4', land: 'Korea' }, // nicht angelegt
    { id: 'A5', projekt: '' } // ohne Projekt
  ];
  const zahlen = kern.zaehleJeProjekt(projekte, aufnahmen);
  gleich(zahlen.get('PRJ-onescm-portal-2-4-germany'), 2);
  gleich(zahlen.get('PRJ-onescm-portal-2-3-germany'), 1);

  // Was an Bildern steht und fehlt, wird vorgeschlagen - einmal, nicht viermal.
  const offen = kern.projekteAusBestand(aufnahmen, projekte);
  gleich(offen.length, 1);
  gleich(kern.projektKennung(offen[0]), 'oneSCM Portal 2.4 · Korea');
  tieferGleich(kern.projekteAusBestand(aufnahmen, [...projekte, ...offen]), []);
});

s.test('Version und Land wandern vom Entwurf ins Bild, in den Pfad und in die Übersicht', () => {
  const entwurf = {
    ...gueltigerEntwurf(),
    titel: 'Vorlagenliste',
    version: ' 2.4 ',
    land: ' Korea '
  };
  const gebaut = kern.baueAufnahme({
    entwurf,
    bild: 'data:,x',
    ausschnitt: { x: 0, y: 0, breite: 400, hoehe: 300 },
    quelle,
    kennung: 'AUF-2026-009',
    erfasstAm: '2026-10-17T08:00:00.000Z'
  });
  gleich(gebaut.version, '2.4', 'die Version bleibt am Bild');
  gleich(gebaut.land, 'Korea');
  wahr(kern.eingangSuchIndex(gebaut).includes('korea'), 'nach dem Land lässt sich nicht suchen');

  // Der Pfad kennt beide als eigene Abschnitte.
  const pfad = kern.verzeichnisPfad(gebaut, '{projekt}/{version}/{land}/{kennung}', kern.leseGliederung({ eintraege: [] }));
  tieferGleich(pfad.ordner, ['onescm-portal', '2-4', 'korea']);
  // Was fehlt, wird benannt statt weggelassen.
  const ohne = kern.verzeichnisPfad({ id: 'AUF-2026-010' }, '{version}/{land}/{kennung}', kern.leseGliederung({ eintraege: [] }));
  tieferGleich(ohne.ordner, ['ohne-version', 'ohne-land']);

  // Beipackzettel und CSV führen beide Felder.
  const zettel = JSON.parse(kern.baueBeipackzettel({ entwurf: gebaut, bildname: 'x.png', anwendung: '1.35.0' }));
  gleich(zettel.version, '2.4');
  gleich(zettel.land, 'Korea');
  wahr(kern.BEIPACK_FELDER.some(([id]) => id === 'version'), 'die Version fehlt im Zettel');
  wahr(kern.BEIPACK_FELDER.some(([id]) => id === 'land'), 'das Land fehlt im Zettel');

  const plan = kern.verzeichnisPlan([gebaut], {}, kern.leseGliederung({ eintraege: [] }), []);
  const csv = kern.galerieCsv(kern.galerieIndex([gebaut], plan, { anwendung: '1.35.0' }));
  const zeilen = csv.trim().split('\n');
  const spalten = zeilen[0].split(';');
  wahr(spalten.includes('version') && spalten.includes('land'), zeilen[0]);
  gleich(zeilen[1].split(';')[spalten.indexOf('version')], '2.4');
  gleich(zeilen[1].split(';')[spalten.indexOf('land')], 'Korea');
});

/* ------------------------------- Arbeitsmenge und Variantenachse (1.36.0) */

const mengeBestand = [
  { id: 'A1', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany', gliederung: '6.2', sprache: 'de' },
  { id: 'A2', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany', gliederung: '6.3', sprache: 'de' },
  { id: 'A3', projekt: 'oneSCM Portal', version: '2.3', land: 'Germany', gliederung: '6.2', sprache: 'de' },
  { id: 'A4', projekt: '', version: '', land: '', gliederung: '6.2', sprache: 'de' }
];

s.test('die Arbeitsmenge schneidet den Bestand, ohne ihn zu ändern', () => {
  // Ohne Wahl ist alles die Arbeitsmenge - und zwar dieselbe Liste.
  gleich(kern.projektFilter(mengeBestand, ''), mengeBestand);
  gleich(kern.projektFilter(mengeBestand).length, 4);

  const zweiVier = kern.projektFilter(mengeBestand, 'PRJ-onescm-portal-2-4-germany');
  tieferGleich(zweiVier.map((a) => a.id), ['A1', 'A2']);
  tieferGleich(kern.projektFilter(mengeBestand, 'PRJ-onescm-portal-2-3-germany').map((a) => a.id), ['A3']);
  tieferGleich(kern.projektFilter(mengeBestand, 'ohne').map((a) => a.id), ['A4']);
  // Eine Wahl, die niemand hat, zeigt nichts - sie zeigt nicht alles.
  tieferGleich(kern.projektFilter(mengeBestand, 'PRJ-gibt-es-nicht'), []);
  gleich(mengeBestand.length, 4, 'der Bestand wurde verändert');
});

s.test('die Arbeitsmenge überlebt neben den Projekten im Speicher', () => {
  const projekte = [{ name: 'oneSCM Portal', version: '2.4', land: 'Germany' }];
  const text = kern.schreibeProjekte(projekte, 'PRJ-onescm-portal-2-4-germany');
  gleich(kern.leseProjektwahl(text), 'PRJ-onescm-portal-2-4-germany');
  gleich(kern.leseProjekte(text).length, 1, 'die Liste darf darüber nicht verloren gehen');
  // Ohne Wahl, ohne Speicher, mit kaputtem Speicher: immer „alles".
  gleich(kern.leseProjektwahl(kern.schreibeProjekte(projekte)), '');
  gleich(kern.leseProjektwahl('{kaputt'), '');
  gleich(kern.leseProjektwahl(null), '');
});

s.test('die Arbeitsmenge hat einen Namen – auch wenn das Projekt gelöscht ist', () => {
  const projekte = kern.leseProjekte(kern.schreibeProjekte([{ name: 'oneSCM Portal', version: '2.4', land: 'Germany' }]));
  gleich(kern.projektWahlText('', projekte), 'alle Projekte');
  gleich(kern.projektWahlText('ohne', projekte), 'ohne Projekt');
  gleich(kern.projektWahlText('PRJ-onescm-portal-2-4-germany', projekte), 'oneSCM Portal 2.4 · Germany');
  gleich(kern.projektWahlText('PRJ-weg', projekte), 'PRJ-weg', 'eine verwaiste Wahl muss sichtbar bleiben');
});

s.test('Version und Land sind Labelfelder und eine Achse der Deckung', () => {
  for (const feld of ['version', 'land']) {
    wahr(kern.LABEL_FELDER.some((f) => f.id === feld), `${feld} fehlt unter den Labelfeldern`);
    wahr(kern.VARIANTEN_FELDER.includes(feld), `${feld} fehlt als Variantenachse`);
  }
  const gliederung = kern.leseGliederung({
    eintraege: [{ nummer: '6.2', thema: 'Market Settings', ebene: 2 }, { nummer: '6.3', thema: 'Vorlagen', ebene: 2 }]
  });
  // Welche Stelle gibt es in 2.4 und welche nur in 2.3 - das ist die Frage
  // vor einem Releaseletter.
  const matrix = kern.deckungsMatrix(gliederung, mengeBestand, 'version');
  tieferGleich(matrix.spalten.map((s2) => s2.wert), ['2.3', '2.4']);
  const zeile = matrix.zeilen.find((z) => z.nummer === '6.3');
  gleich(zeile.zellen.find((c) => c.wert === '2.3').zahl, 0, '6.3 gibt es in 2.3 nicht');
  gleich(zeile.zellen.find((c) => c.wert === '2.4').zahl, 1);
  gleich(matrix.zeilen.find((z) => z.nummer === '6.2').ohne, 1, 'das Bild ohne Version fehlt in der Spalte „ohne"');
});

/* ------------------------------- Projektvergleich (1.37.0) */

const vergleichGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6.2', thema: 'Market Settings', ebene: 2 },
    { nummer: '6.3', thema: 'Vorlagen', ebene: 2 },
    { nummer: '6.4', thema: 'Freigaben', ebene: 2 }
  ]
});

const zweiFassungen = [
  { id: 'A1', projekt: 'oneSCM Portal', version: '2.3', land: 'Germany', gliederung: '6.2' },
  { id: 'A2', projekt: 'oneSCM Portal', version: '2.3', land: 'Germany', gliederung: '6.4' },
  { id: 'A3', projekt: 'oneSCM Portal', version: '2.3', land: 'Germany', gliederung: '' },
  { id: 'A4', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany', gliederung: '6.2' },
  { id: 'A5', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany', gliederung: '6.2' },
  { id: 'A6', projekt: 'oneSCM Portal', version: '2.4', land: 'Germany', gliederung: '6.3' },
  { id: 'A7', projekt: 'oneSCM Portal', version: '2.4', land: 'Korea', gliederung: '7.1' }
];
const ALT = 'PRJ-onescm-portal-2-3-germany';
const NEU = 'PRJ-onescm-portal-2-4-germany';

s.test('der Projektvergleich nennt neue, entfallene und gemeinsame Stellen', () => {
  const v = kern.vergleicheProjekte(zweiFassungen, ALT, NEU, vergleichGliederung);
  gleich(v.bilderA, 3);
  gleich(v.bilderB, 3, 'das koreanische Bild gehört nicht dazu');
  tieferGleich(v.zeilen.map((z) => z.nummer), ['6.2', '6.3', '6.4'], 'die Folge der Gliederung stimmt nicht');
  const art = Object.fromEntries(v.zeilen.map((z) => [z.nummer, z.art]));
  tieferGleich(art, { '6.2': 'beide', '6.3': 'neu', '6.4': 'entfallen' });
  gleich(v.neu, 1);
  gleich(v.entfallen, 1);
  gleich(v.beide, 1);

  // Gezählt werden Bilder je Stelle - zwei Screenshots derselben Maske sind
  // keine zweite Stelle.
  const gemeinsam = v.zeilen.find((z) => z.nummer === '6.2');
  gleich(gemeinsam.a, 1);
  gleich(gemeinsam.b, 2);
  gleich(gemeinsam.thema, 'Market Settings');
  tieferGleich(gemeinsam.kennungenB, ['A4', 'A5']);

  // Was keine Stelle hat, wird nicht verglichen - aber gezählt.
  gleich(v.ohneStelleA, 1);
  gleich(v.ohneStelleB, 0);

  // Derselbe Vergleich andersherum dreht neu und entfallen um.
  const zurueck = kern.vergleicheProjekte(zweiFassungen, NEU, ALT, vergleichGliederung);
  gleich(zurueck.neu, 1);
  gleich(zurueck.entfallen, 1);
  gleich(zurueck.zeilen.find((z) => z.nummer === '6.3').art, 'entfallen');

  // Zwei leere Mengen geben keinen Vergleich, aber auch keinen Fehler.
  gleich(kern.vergleicheProjekte([], ALT, NEU, vergleichGliederung).zeilen.length, 0);
});

s.test('der Vergleich als Text ist der erste Entwurf eines Releaseletters', () => {
  const projekte = kern.leseProjekte(
    kern.schreibeProjekte([
      { name: 'oneSCM Portal', version: '2.3', land: 'Germany' },
      { name: 'oneSCM Portal', version: '2.4', land: 'Germany' }
    ])
  );
  const text = kern.vergleichAlsText(
    kern.vergleicheProjekte(zweiFassungen, ALT, NEU, vergleichGliederung),
    projekte,
    { stand: '2026-10-17T08:00:00.000Z', anwendung: '1.37.0' }
  );
  wahr(text.includes('Vorher: oneSCM Portal 2.3 · Germany (3 Bilder)'), text);
  wahr(text.includes('Nachher: oneSCM Portal 2.4 · Germany (3 Bilder)'), text);
  wahr(text.includes('## Neu in oneSCM Portal 2.4 · Germany (1)'), text);
  wahr(text.includes('6.3 Vorlagen · 0 → 1 Bild(er)'), text);
  wahr(text.includes('## Nur in oneSCM Portal 2.3 · Germany (1)'), text);
  wahr(text.includes('6.4 Freigaben'), text);
  wahr(text.includes('Ohne Stelle und darum nicht verglichen: 1'), text);
  // Ein leerer Block steht als Strich da, nicht als Lücke.
  const leer = kern.vergleichAlsText(kern.vergleicheProjekte([], ALT, NEU, vergleichGliederung), projekte, {});
  gleich((leer.match(/^–$/gm) || []).length, 3, leer);
});

/* ------------------------------- PDF aus den Blättern (1.38.0) */

/** Ein JPEG-ähnlicher Block: Anfang, Rumpf, Ende – mehr braucht das PDF nicht. */
const jpegBlock = (fuellung = 0x41, laenge = 256) =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(laenge).fill(fuellung), 0xff, 0xd9]);

const alsText = (bytes) => Buffer.from(bytes).toString('latin1');

s.test('aus zwei Blättern wird ein PDF mit zwei Seiten in A4', () => {
  const bild = jpegBlock();
  const pdf = kern.pdfAusSeiten(
    [
      { daten: bild, breite: 2480, hoehe: 3508 },
      { daten: jpegBlock(0x42), breite: 2480, hoehe: 3508 }
    ],
    { titel: 'Quick Guide – Prüfung', anwendung: '1.38.0', stand: new Date('2026-10-17T08:00:00Z') }
  );
  const text = alsText(pdf);
  wahr(text.startsWith('%PDF-1.4\n'), text.slice(0, 20));
  wahr(text.endsWith('%%EOF\n'), text.slice(-20));
  gleich((text.match(/\/Type\/Page[^s]/g) || []).length, 2);
  gleich((text.match(/\/Filter\/DCTDecode/g) || []).length, 2);
  // 2480 Bildpunkte bei 300 dpi sind 595,2 Punkte - A4 bleibt A4.
  gleich((text.match(/MediaBox\[0 0 595\.2 841\.92\]/g) || []).length, 2);
  gleich(text.includes('/CreationDate (D:20261017080000Z)'), true);
  // Der Titel steht als UTF-16 da, damit „ü" ein „ü" bleibt.
  wahr(text.includes('/Title <FEFF'), 'der Titel ist nicht als UTF-16 gesetzt');
  wahr(text.includes('00FC'), 'das ü fehlt im Titel');

  // Das JPEG liegt unverändert im Strom - es wird nicht neu gerechnet.
  wahr(text.includes(Buffer.from(bild).toString('latin1')), 'der Bildstrom wurde angefasst');
});

s.test('die Objekttabelle des PDF zeigt auf die richtigen Stellen', () => {
  const pdf = kern.pdfAusSeiten([{ daten: jpegBlock(), breite: 1240, hoehe: 1754 }], { anwendung: '1.38.0' });
  const text = alsText(pdf);
  const start = Number((text.match(/startxref\n(\d+)/) || [])[1]);
  wahr(Number.isFinite(start), 'es gibt kein startxref');
  gleich(text.slice(start, start + 4), 'xref', 'startxref zeigt nicht auf die Tabelle');

  // Eine Seite: Katalog, Seitenbaum, Angaben, Seite, Inhalt, Bild.
  const zeilen = text.slice(start).split('\n');
  gleich(zeilen[1], '0 7', 'die Tabelle zählt die Objekte falsch');
  for (let nummer = 1; nummer <= 6; nummer++) {
    const stelle = Number(zeilen[nummer + 2].slice(0, 10));
    wahr(
      text.slice(stelle).startsWith(`${nummer} 0 obj`),
      `Objekt ${nummer} liegt nicht bei ${stelle}: ` + text.slice(stelle, stelle + 20)
    );
  }
  // Das halbe Format: 1240 Punkte bei 300 dpi sind 297,6.
  wahr(text.includes('MediaBox[0 0 297.6 420.96]'), text.match(/MediaBox[^\]]+\]/)[0]);
});

s.test('ohne Blatt gibt es kein PDF, und kaputte Blätter fallen weg', () => {
  gleich(kern.pdfAusSeiten([]), null);
  gleich(kern.pdfAusSeiten(), null);
  gleich(kern.pdfAusSeiten([{ daten: new Uint8Array(), breite: 100, hoehe: 100 }]), null);
  gleich(kern.pdfAusSeiten([{ daten: jpegBlock(), breite: 0, hoehe: 100 }]), null);
  // Ein gutes Blatt neben einem kaputten ergibt ein PDF mit einer Seite.
  const gemischt = kern.pdfAusSeiten([
    { daten: jpegBlock(), breite: 2480, hoehe: 3508 },
    { daten: null, breite: 2480, hoehe: 3508 }
  ]);
  gleich((alsText(gemischt).match(/\/Type\/Page[^s]/g) || []).length, 1);
});

/* ------------------------------- ZIP, Word, PowerPoint (1.39.0) */

s.test('ein geschriebenes ZIP lässt sich wieder lesen', () => {
  const bild = jpegBlock(0x43, 64);
  const archiv = kern.zipSchreiben([
    { name: 'eins.txt', daten: 'Prüfung mit Umlaut' },
    { name: 'ordner/zwei.bin', daten: bild }
  ]);
  // Gelesen wird mit demselben Werkzeug, das die Einfuhr benutzt.
  const verzeichnis = kern.leseZipVerzeichnis(archiv);
  tieferGleich(verzeichnis.map((e) => e.name), ['eins.txt', 'ordner/zwei.bin']);
  gleich(verzeichnis[0].verfahren, 0, 'gespeichert, nicht gepackt');
  gleich(verzeichnis[1].roh, bild.length);
  gleich(kern.zipSchreiben([]), null);
  gleich(kern.zipSchreiben(), null);
});

s.test('die Word-Datei trägt jedes Blatt als Bild', () => {
  const seiten = [
    { daten: jpegBlock(0x41), breite: 2480, hoehe: 3508, typ: 'jpeg' },
    { daten: jpegBlock(0x42), breite: 2480, hoehe: 3508, typ: 'jpeg' }
  ];
  const docx = kern.docxAusSeiten(seiten, { titel: 'Quick Guide – Prüfung', anwendung: '1.39.0' });
  const namen = kern.leseZipVerzeichnis(docx).map((e) => e.name);
  for (const teil of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels', 'word/media/blatt1.jpeg', 'word/media/blatt2.jpeg']) {
    wahr(namen.includes(teil), `${teil} fehlt: ` + namen.join(', '));
  }
  const text = alsText(docx);
  gleich((text.match(/<w:drawing>/g) || []).length, 2);
  wahr(text.includes('w:pgSz w:w="11906" w:h="16838"'), 'A4 hoch fehlt');
  wahr(!text.includes('w:br w:type="page"'), 'ein eingefügter Umbruch erzeugt leere Seiten');
  // Gelesen wird hier Byte für Byte; der Titel steht als UTF-8 im Archiv.
  const titelAusDocx = Buffer.from(docx).toString('utf8').match(/<dc:title>([^<]*)<\/dc:title>/)[1];
  gleich(titelAusDocx, 'Quick Guide – Prüfung');

  // Ein quer liegendes Blatt dreht die Seite.
  const quer = kern.docxAusSeiten([{ daten: jpegBlock(), breite: 3508, hoehe: 2480, typ: 'jpeg' }], {});
  wahr(alsText(quer).includes('w:orient="landscape"'), 'quer wird nicht quer');
  gleich(kern.docxAusSeiten([]), null);
});

s.test('die PowerPoint-Datei hat eine Folie je Blatt', () => {
  const seiten = [
    { daten: jpegBlock(0x41), breite: 2480, hoehe: 3508, typ: 'jpeg' },
    { daten: jpegBlock(0x42), breite: 2480, hoehe: 3508, typ: 'jpeg' },
    { daten: jpegBlock(0x44), breite: 2480, hoehe: 3508, typ: 'jpeg' }
  ];
  const pptx = kern.pptxAusSeiten(seiten, { titel: 'Quick Guide', anwendung: '1.39.0' });
  const namen = kern.leseZipVerzeichnis(pptx).map((e) => e.name);
  // Das Gerüst, ohne das PowerPoint die Datei nicht öffnet.
  for (const teil of [
    '[Content_Types].xml',
    'ppt/presentation.xml',
    'ppt/_rels/presentation.xml.rels',
    'ppt/theme/theme1.xml',
    'ppt/slideMasters/slideMaster1.xml',
    'ppt/slideLayouts/slideLayout1.xml',
    'ppt/slides/slide3.xml',
    'ppt/slides/_rels/slide3.xml.rels',
    'ppt/media/blatt3.jpeg'
  ]) {
    wahr(namen.includes(teil), `${teil} fehlt`);
  }
  const text = alsText(pptx);
  gleich((text.match(/<p:sldId /g) || []).length, 3);
  // 2480 Bildpunkte bei 300 dpi sind 7 559 040 EMU.
  // 2480 × 3508 Bildpunkte bei 300 dpi: das Folienmaß folgt dem Blatt.
  const masse = text.match(/<p:sldSz cx="(\d+)" cy="(\d+)"\/>/);
  gleich(Number(masse[1]), Math.round((2480 / 300) * 914400));
  gleich(Number(masse[2]), Math.round((3508 / 300) * 914400));
  gleich(kern.pptxAusSeiten([]), null);
});

/* ------------------------------- Der Plan des Registers Output (1.39.0) */

const outputBestand = [
  { id: 'B1', titel: 'Liste de', gliederung: '6.2', sprache: 'de', rolle_label: 'dealer' },
  { id: 'B2', titel: 'Liste en', gliederung: '6.2', sprache: 'en', rolle_label: 'dealer' },
  { id: 'B3', titel: 'Formular de', gliederung: '6.3', sprache: 'de', rolle_label: 'dealer' }
];
const outputGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6', thema: 'Markt', ebene: 1 },
    { nummer: '6.2', thema: 'Market Settings', ebene: 2 },
    { nummer: '6.3', thema: 'Vorlagen', ebene: 2 }
  ]
});

s.test('aus Vorlage × Inhalt × Variante entsteht je ein Dokument', () => {
  const plan = kern.ausgabePlan(
    outputBestand,
    [],
    outputGliederung,
    { vorlagen: ['quickguide', 'onepager'], inhalte: ['kapitel:6.2', 'kapitel:6.3'], achse: 'sprache', werte: ['de', 'en'], formate: ['pdf'] },
    kern.VORLAGEN
  );
  gleich(plan.length, 8, '2 Vorlagen × 2 Inhalte × 2 Sprachen');
  const quickDe62 = plan.find((a) => a.vorlage === 'quickguide' && a.inhalt === 'kapitel:6.2' && a.wert === 'de');
  gleich(quickDe62.bilder, 1);
  gleich(quickDe62.titel, '6.2 Market Settings · Deutsch');
  gleich(kern.ausgabeDateiname(quickDe62, 'pdf'), 'quickguide-6-2-market-settings-de.pdf');
  tieferGleich(kern.ausgabeOrdner(quickDe62), ['output', 'de', 'quickguide']);

  // 6.3 gibt es nicht auf Englisch - der Auftrag bleibt als Lücke stehen.
  const leer = plan.find((a) => a.vorlage === 'quickguide' && a.inhalt === 'kapitel:6.3' && a.wert === 'en');
  gleich(leer.bilder, 0);

  const umfang = kern.ausgabeUmfang(plan, ['pdf', 'docx']);
  gleich(umfang.dokumente, 8);
  gleich(umfang.leer, 2, '6.3 auf Englisch – je Vorlage einmal');
  gleich(umfang.dateien, 12, '6 Dokumente mit Bild × 2 Formate');

  // Ohne Achse ein Dokument je Vorlage und Inhalt.
  const ohne = kern.ausgabePlan(outputBestand, [], outputGliederung, {
    vorlagen: ['quickguide'],
    inhalte: ['kapitel:6.2'],
    achse: '',
    werte: []
  }, kern.VORLAGEN);
  gleich(ohne.length, 1);
  gleich(ohne[0].bilder, 2, 'ohne Achse zählen beide Sprachen');
  gleich(ohne[0].variante, '');

  // Ohne Vorlage oder ohne Inhalt gibt es keinen Plan.
  gleich(kern.ausgabePlan(outputBestand, [], outputGliederung, { vorlagen: [], inhalte: ['kapitel:6.2'] }, kern.VORLAGEN).length, 0);
  gleich(kern.ausgabePlan(outputBestand, [], outputGliederung, { vorlagen: ['quickguide'], inhalte: [] }, kern.VORLAGEN).length, 0);
});

s.test('eine Strecke als Inhalt folgt der Variante, nicht dem Filter', () => {
  const strecken = [
    { id: 'STR-1', name: 'Vorlage anlegen', schritte: [{ art: 'schritt', aufnahmen: ['B1'], text: 'Liste öffnen' }] }
  ];
  // Ohne Variantengruppe bleibt das Bild stehen - umgestellt wird nur, was
  // verbunden ist.
  const bilder = kern.ausgabeBilder(outputBestand, strecken, 'strecke:STR-1', 'sprache', 'en');
  tieferGleich(bilder.map((a) => a.id), ['B1']);
  gleich(kern.ausgabeInhaltName('strecke:STR-1', strecken, outputGliederung), 'Vorlage anlegen');
  gleich(kern.ausgabeInhaltName('kapitel:6.2', strecken, outputGliederung), '6.2 Market Settings');
  tieferGleich(kern.ausgabeBilder(outputBestand, strecken, 'kapitel:6', '', ''), [outputBestand[0], outputBestand[1], outputBestand[2]]);
});

/* ------------------------------- Die Lupe: Rezept und Kapitelweg (1.39.0) */

s.test('die Lupe nennt Weg, Rezept und Schritte eines Bildes', () => {
  const aufnahme = {
    id: 'AUF-2026-007',
    titel: 'Vorlagenliste',
    gliederung: '6.2',
    autor: 'M. Arndt',
    browser: 'Chrome 141',
    quelle: { art: 'bildschirm', name: 'Freigabe', breite: 1440, hoehe: 900 },
    ausschnitt: { x: 12, y: 35, breite: 300, hoehe: 200 },
    einfuhr: { datei: 'handbuch.pptx', seite: 4 }
  };
  const strecken = [
    { id: 'STR-1', name: 'Vorlage anlegen', schritte: [
      { art: 'schritt', aufnahmen: ['X'], text: 'erster' },
      { art: 'schritt', aufnahmen: ['AUF-2026-007'], text: 'Liste öffnen' }
    ] }
  ];
  const rezept = kern.bildRezept(aufnahme, strecken, outputGliederung);
  tieferGleich(rezept.pfad, ['6 Markt', '6.2 Market Settings']);
  const schild = (name) => (rezept.zeilen.find((z) => z.schild === name) || {}).wert;
  gleich(schild('Quelle'), 'Bildschirm: Freigabe · 1440 × 900 px');
  gleich(schild('Ausschnitt'), '300 × 200 px ab 12, 35');
  gleich(schild('Eingeführt'), 'handbuch.pptx · Seite 4');
  gleich(schild('Erfasst von'), 'M. Arndt');
  tieferGleich(rezept.schritte, [{ strecke: 'Vorlage anlegen', nummer: 2, text: 'Liste öffnen' }]);

  // Ein Bild ohne alles nennt nichts – und stürzt nicht ab.
  const karg = kern.bildRezept({ id: 'A' }, [], outputGliederung);
  tieferGleich(karg.pfad, []);
  tieferGleich(karg.schritte, []);
  // Eine unbekannte Stelle steht trotzdem im Weg.
  tieferGleich(kern.kapitelPfad(outputGliederung, '9.9'), ['9.9']);
});

/* ------------------------------- OCR: Text aus Bildern (1.40.0) */

s.test('ein großes Bild wird in überlappende Kacheln zerlegt', () => {
  // Was unter der Marke liegt, bleibt ein Stück.
  const eins = kern.ocrKacheln(1280, 800);
  gleich(eins.length, 1);
  tieferGleich(eins[0], { x: 0, y: 0, breite: 1280, hoehe: 800, nummer: 1, von: 1 });

  // 1440 × 900 sind 1,296 Megapixel - knapp darüber, also zwei Kacheln.
  const zwei = kern.ocrKacheln(1440, 900);
  gleich(zwei.length, 2);
  gleich(zwei[0].breite, 1440, 'geteilt wird in Zeilen, nicht in Spalten');
  wahr(zwei[0].y + zwei[0].hoehe > zwei[1].y, 'die Kacheln überlappen nicht');
  gleich(zwei[1].y + zwei[1].hoehe, 900, 'die letzte Kachel endet am Bildrand');

  // Ein Blatt aus dem Studio: viele Kacheln, aber nie mehr als sechs.
  const blatt = kern.ocrKacheln(2480, 3508);
  wahr(blatt.length >= 6, blatt.length);
  gleich(blatt.length, 6);
  gleich(blatt[0].y, 0);
  tieferGleich(kern.ocrKacheln(0, 100), []);
});

s.test('die Aufforderung sagt, was zu tun ist – und was nicht', () => {
  const text = kern.ocrAufforderung({ titel: 'Übersicht Einkauf', gliederung: '7.5.1' }, { nummer: 2, von: 3 });
  wahr(text.includes('Teil 2 von 3'), text);
  wahr(text.includes('Titel der Aufnahme: Übersicht Einkauf'), text);
  wahr(text.includes('Stelle im Handbuch: 7.5.1'), text);
  wahr(/deute nichts, ergänze nichts/.test(text), 'die Grenze der Lesung fehlt');
  // Ein einzelnes Bild bekommt keinen Kachelsatz.
  wahr(!kern.ocrAufforderung({}, { nummer: 1, von: 1 }).includes('Teil 1'), 'ohne Kacheln kein Kachelsatz');
});

s.test('Lesungen überleben den Speicher und werden zusammengefügt', () => {
  const eintraege = {
    'AUF-1': { text: 'Zeile eins', erkannt_am: '2026-10-17T08:00:00.000Z', teile: 2, quelle: 'claude' },
    'AUF-2': { text: '   ', erkannt_am: '', teile: 1, quelle: 'hand' }
  };
  const gelesen = kern.leseOcr(kern.schreibeOcr(eintraege));
  tieferGleich(Object.keys(gelesen), ['AUF-1'], 'eine leere Lesung ist keine');
  gleich(gelesen['AUF-1'].teile, 2);
  // Ein älterer Stand mit nacktem Text wird gelesen.
  gleich(kern.leseOcr(JSON.stringify({ texte: { 'AUF-9': 'nur Text' } }))['AUF-9'].text, 'nur Text');
  tieferGleich(kern.leseOcr('{kaputt'), {});
  tieferGleich(kern.leseOcr(null), {});

  gleich(kern.ocrZusammenfuegen(['  oben  ', '', '   ', 'unten']), 'oben\nunten');
  gleich(kern.ocrZusammenfuegen([]), '');
});

s.test('die Texte werden zu einer Textdatei und zu einer Word-Datei', () => {
  const abschnitte = [
    { titel: 'Übersicht Einkauf', kennung: 'AUF-1', stelle: '7.5.1', text: 'Offene Freigaben | 47' },
    { titel: 'Formular', kennung: 'AUF-2', stelle: '', text: '' }
  ];
  const text = kern.ocrAlsText(abschnitte, { stand: '2026-10-17T08:00:00.000Z', anwendung: '1.40.0' });
  wahr(text.includes('## Übersicht Einkauf'), text);
  wahr(text.includes('7.5.1 · AUF-1'), text);
  wahr(text.includes('Offene Freigaben | 47'), text);
  wahr(text.includes('(kein Text erkannt)'), 'ein leerer Abschnitt wird verschwiegen');

  const docx = kern.docxAusText(abschnitte, { titel: 'Texte aus Bildern', anwendung: '1.40.0' });
  const namen = kern.leseZipVerzeichnis(docx).map((e) => e.name);
  tieferGleich(namen, ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'word/document.xml']);
  const xml = Buffer.from(docx).toString('utf8');
  wahr(xml.includes('<w:t xml:space="preserve">Offene Freigaben | 47</w:t>'), 'der Text fehlt im Dokument');
  wahr(xml.includes('<dc:title>Texte aus Bildern</dc:title>'), 'der Titel fehlt');
  // Kein Bild, keine Medien - und spitze Klammern im Text werden maskiert.
  const heikel = Buffer.from(kern.docxAusText([{ titel: 'A', text: 'a < b & c' }], {})).toString('utf8');
  wahr(heikel.includes('a &lt; b &amp; c'), 'der Text wird nicht maskiert');
  gleich(kern.docxAusText([]), null);
});

/* ------------------------------- Bildvergleich (1.41.0) */

/** Ein Bild aus einer Funktion: (x, y) -> [r, g, b]. */
function baueBildpunkte(breite, hoehe, farbe) {
  const daten = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = (y * breite + x) * 4;
      const [r, g, b] = farbe(x, y);
      daten[i] = r;
      daten[i + 1] = g;
      daten[i + 2] = b;
      daten[i + 3] = 255;
    }
  }
  return { daten, breite, hoehe };
}

s.test('zwei gleiche Bilder haben keinen Unterschied', () => {
  const bild = baueBildpunkte(48, 32, (x) => [x * 5, 120, 200]);
  const ergebnis = kern.bildUnterschied(bild, bild);
  gleich(ergebnis.ok, true);
  gleich(ergebnis.anteil, 0);
  tieferGleich(ergebnis.bereiche, []);
  gleich(ergebnis.urteil, 'gleich');
  wahr(/keinen? Unterschied|gleich/.test(kern.unterschiedText(ergebnis)), kern.unterschiedText(ergebnis));
});

s.test('veränderte Flächen werden zu Bereichen zusammengefasst', () => {
  const weiss = baueBildpunkte(48, 32, () => [255, 255, 255]);
  // Zwei getrennte schwarze Kästen: oben links und unten rechts.
  const zwei = baueBildpunkte(48, 32, (x, y) =>
    (x < 10 && y < 8) || (x > 38 && y > 24) ? [0, 0, 0] : [255, 255, 255]
  );
  const ergebnis = kern.bildUnterschied(weiss, zwei, { spalten: 12, zeilen: 8 });
  gleich(ergebnis.ok, true);
  gleich(ergebnis.bereiche.length, 2, 'zwei getrennte Kästen sind zwei Bereiche');
  // Der erste Bereich liegt oben links, der zweite unten rechts.
  const [eins, zwei2] = ergebnis.bereiche.sort((a, b) => a.y - b.y);
  gleich(eins.x, 0);
  gleich(eins.y, 0);
  wahr(zwei2.x > 30 && zwei2.y > 20, JSON.stringify(zwei2));
  // 80 + 63 von 1536 Punkten sind schwarz geworden: gut 9 %.
  wahr(ergebnis.anteil > 0.08 && ergebnis.anteil < 0.11, String(ergebnis.anteil));
  gleich(ergebnis.urteil, 'deutlich verändert');
  wahr(kern.unterschiedText(ergebnis).includes('2 Bereiche'), kern.unterschiedText(ergebnis));

  // Ein einziger zusammenhängender Kasten ist ein Bereich, nicht vier.
  const einer = baueBildpunkte(48, 32, (x, y) => (x > 16 && x < 34 && y > 10 && y < 22 ? [0, 0, 0] : [255, 255, 255]));
  gleich(kern.bildUnterschied(weiss, einer, { spalten: 12, zeilen: 8 }).bereiche.length, 1);
});

s.test('ein kaum sichtbarer Unterschied bleibt unter der Schwelle', () => {
  const grund = baueBildpunkte(32, 24, () => [200, 200, 200]);
  // Ein Hauch heller: unter der Schwelle, also kein Befund.
  const hauch = baueBildpunkte(32, 24, () => [205, 203, 202]);
  const ergebnis = kern.bildUnterschied(grund, hauch);
  gleich(ergebnis.anteil, 0, 'Rauschen wird als Änderung gezählt');
  // Mit kleinerer Schwelle sieht derselbe Vergleich alles.
  gleich(kern.bildUnterschied(grund, hauch, { schwelle: 4 }).anteil, 1);
});

s.test('ohne Maße oder mit verschiedenen Maßen sagt der Vergleich, warum nicht', () => {
  const a = baueBildpunkte(20, 10, () => [0, 0, 0]);
  const b = baueBildpunkte(10, 10, () => [0, 0, 0]);
  gleich(kern.bildUnterschied(a, b).ok, false);
  wahr(kern.bildUnterschied(a, b).grund.includes('Maße'), kern.bildUnterschied(a, b).grund);
  gleich(kern.bildUnterschied({}, {}).ok, false);
  gleich(kern.bildUnterschied(a, { breite: 20, hoehe: 10 }).ok, false);
  // Der Satz zum Ergebnis nennt den Grund statt zu schweigen.
  wahr(kern.unterschiedText(kern.bildUnterschied(a, b)).includes('Maße'), 'der Grund fehlt');
});

s.test('vergleichbar ist nur, was in beiden Fassungen eine Stelle hat', () => {
  const bestand = [
    { id: 'A1', projekt: 'P', version: '2.3', land: 'DE', gliederung: '6.2' },
    { id: 'A2', projekt: 'P', version: '2.3', land: 'DE', gliederung: '6.4' },
    { id: 'B1', projekt: 'P', version: '2.4', land: 'DE', gliederung: '6.2' },
    { id: 'B2', projekt: 'P', version: '2.4', land: 'DE', gliederung: '6.2' },
    { id: 'B3', projekt: 'P', version: '2.4', land: 'DE', gliederung: '6.3' }
  ];
  const paare = kern.vergleichsPaare(bestand, 'PRJ-p-2-3-de', 'PRJ-p-2-4-de', vergleichGliederung);
  gleich(paare.length, 1, 'nur 6.2 steht in beiden');
  gleich(paare[0].vorher.id, 'A1');
  gleich(paare[0].nachher.id, 'B1');
  gleich(paare[0].thema, 'Market Settings');
  gleich(paare[0].weitereB, 1, 'das zweite Bild in 2.4 wird genannt');
  gleich(paare[0].weitereA, 0);
  tieferGleich(kern.vergleichsPaare([], 'a', 'b', vergleichGliederung), []);
});

/* ------------------------------- Der Agent Sprache (1.42.0) */

const spracheBestand = [
  { id: 'S1', titel: 'Dealer anlegen', sprache: 'de', begriffe: [], notiz: '' },
  { id: 'S2', titel: 'OneSCM Übersicht öffnen und prüfen', sprache: 'de', begriffe: [], notiz: '' },
  { id: 'S3', titel: 'oneSCM overview with the new list', sprache: 'de', begriffe: [], notiz: '' },
  { id: 'S4', titel: 'Vorlagenliste öffnen und bearbeiten', sprache: 'de', begriffe: ['vorlage'], notiz: '' }
];

s.test('die Wortliste liest sich aus Zeilen und schreibt sich zurück', () => {
  const text = [
    '# eine Bemerkung wird übersprungen',
    'Dealer -> Händler (de)',
    '  Market   ->   Markt  ',
    'One SCM → oneSCM',
    'kaputt ohne Pfeil',
    '-> ohne links'
  ].join('\n');
  const liste = kern.wortlisteAusText(text);
  tieferGleich(liste, [
    { falsch: 'Dealer', richtig: 'Händler', sprache: 'de' },
    { falsch: 'Market', richtig: 'Markt', sprache: '' },
    { falsch: 'One SCM', richtig: 'oneSCM', sprache: '' }
  ]);
  // Hin und zurück bleibt dieselbe Liste.
  tieferGleich(kern.wortlisteAusText(kern.wortlisteAlsText(liste)), liste);
  tieferGleich(kern.leseWortliste(kern.schreibeWortliste(liste)), liste);
  // Ohne Speicher gilt die Vorgabe, eine leere Liste bleibt leer.
  gleich(kern.leseWortliste(null).length, kern.STANDARD_WORTLISTE.length);
  gleich(kern.leseWortliste('{kaputt').length, kern.STANDARD_WORTLISTE.length);
  tieferGleich(kern.leseWortliste(kern.schreibeWortliste([])), []);
});

s.test('der Agent Sprache findet verbotene Wörter – und schont die richtige Schreibweise', () => {
  const ergebnis = kern.fuehreAgent('sprache', spracheBestand, agentenGliederung, []);
  gleich(ergebnis.agent, 'sprache');
  const titel = ergebnis.befunde.map((b) => b.titel);

  const dealer = ergebnis.befunde.find((b) => b.titel.includes('Dealer'));
  wahr(dealer, titel.join(' | '));
  tieferGleich(dealer.kennungen, ['S1']);
  gleich(dealer.art, 'warnung');
  gleich(dealer.weg, 'eingang');

  // „OneSCM" ist falsch geschrieben, „oneSCM" nicht - eine Regel, die nur
  // die Schreibweise meint, darf das Richtige nicht mittreffen.
  const schreibweise = ergebnis.befunde.find((b) => /„OneSCM" statt/.test(b.titel));
  wahr(schreibweise, titel.join(' | '));
  tieferGleich(schreibweise.kennungen, ['S2']);

  // Ein englischer Titel an einem Bild mit Label „de".
  const fremd = ergebnis.befunde.find((b) => /anderen Sprache/.test(b.titel));
  wahr(fremd && fremd.kennungen.includes('S3'), JSON.stringify(fremd));

  // Dieselbe Sache verschieden geschrieben.
  const uneinheitlich = ergebnis.befunde.find((b) => /Uneinheitliche Schreibweise/.test(b.titel));
  wahr(uneinheitlich && /oneSCM/.test(uneinheitlich.titel), JSON.stringify(uneinheitlich));

  // Ein sauberer Bestand gibt keinen Befund aus der Wortliste.
  const sauber = kern.fuehreAgent('sprache', [spracheBestand[3]], agentenGliederung, []);
  gleich(sauber.befunde.length, 0, sauber.befunde.map((b) => b.titel).join(' | '));
  gleich(sauber.kennzahlen.find((k) => k.schild === 'Regeln').wert, String(kern.STANDARD_WORTLISTE.length));
});

s.test('eine eigene Wortliste und die Lesungen aus OCR gehen mit', () => {
  const bestand = [{ id: 'S9', titel: 'Freigabe prüfen', sprache: 'de', begriffe: [], notiz: '' }];
  const eigene = [{ falsch: 'Freigabe', richtig: 'Genehmigung', sprache: '' }];
  const mitEigener = kern.fuehreAgent('sprache', bestand, [], [], { wortliste: eigene });
  gleich(mitEigener.befunde.length, 1);
  wahr(mitEigener.befunde[0].titel.includes('Genehmigung'), mitEigener.befunde[0].titel);
  gleich(mitEigener.kennzahlen.find((k) => k.schild === 'Regeln').wert, '1');

  // Was nur in der Lesung steht, wird mitgeprüft.
  const mitOcr = kern.fuehreAgent('sprache', [{ id: 'S9', titel: 'Liste', sprache: 'de', begriffe: [] }], [], [], {
    wortliste: [{ falsch: 'Dealer', richtig: 'Händler', sprache: 'de' }],
    ocr: { S9: { text: 'Spalte Dealer | Vertrag' } }
  });
  gleich(mitOcr.befunde.length, 1);
  tieferGleich(mitOcr.befunde[0].kennungen, ['S9']);
  gleich(mitOcr.kennzahlen.find((k) => k.schild === 'Lesungen dabei').wert, '1');

  // Eine leere Wortliste prüft keine Wörter mehr.
  gleich(kern.fuehreAgent('sprache', bestand, [], [], { wortliste: [] }).befunde.length, 0);
});

s.test('die Sprache eines Textes wird geraten, nicht behauptet', () => {
  gleich(kern.spracheDesTextes('Die Liste wird mit einem Klick geöffnet'), 'de');
  gleich(kern.spracheDesTextes('The list is opened with the new button'), 'en');
  // Zu kurz oder ohne Merkmal: keine Antwort statt einer falschen.
  gleich(kern.spracheDesTextes('Status'), '');
  gleich(kern.spracheDesTextes('Vorlagenliste Signatur Freigabe'), '');
  gleich(kern.spracheDesTextes(''), '');

  // Schreibweisen: gruppiert wird nach Buchstaben, nicht nach Groß und Klein.
  const gruppen = kern.schreibweisen(['oneSCM Portal', 'OneSCM Portal', 'Portal']);
  wahr(gruppen.some((g) => g.map((f) => f.wort).sort().join('/') === 'OneSCM/oneSCM'), JSON.stringify(gruppen));
  // Ein Wort in nur einer Schreibweise ist keine Gruppe.
  tieferGleich(kern.schreibweisen(['Vorlage', 'Vorlage']), []);
});

/* ------------------------------- Das Handbuch als Word-Datei (1.43.0) */

s.test('das Word-Handbuch trägt Überschriften, Texte und Bilder', () => {
  const bild = jpegBlock(0x41, 400);
  const teile = [
    { nummer: '7', thema: 'Zahlungsdaten', ebene: 1, bilder: [], schritte: [] },
    {
      nummer: '7.5',
      thema: 'Digitale Unterschrift',
      ebene: 2,
      text: 'Hier wird unterschrieben.',
      kriterium: 'Beleg liegt vor',
      bilder: [{ id: 'A1', titel: 'Vorlagenliste', sprache: 'de', rolle_label: 'dealer' }],
      schritte: [{ nummer: 2, text: 'Liste öffnen', aufnahme: 'A1' }]
    }
  ];
  const docx = kern.docxAusHandbuch(teile, {
    titel: 'Benutzerhandbuch oneSCM',
    untertitel: 'Fassung 2.4',
    anwendung: '1.43.0',
    bilder: new Map([['A1', { daten: bild, breite: 1440, hoehe: 900, typ: 'jpeg' }]])
  });
  const namen = kern.leseZipVerzeichnis(docx).map((e) => e.name);
  for (const teil of ['word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels', 'word/media/bild1.jpeg']) {
    wahr(namen.includes(teil), `${teil} fehlt: ` + namen.join(', '));
  }
  const xml = Buffer.from(docx).toString('utf8');
  // Die Gliederung wird zur Gliederung: Ebene 1 und 2 als Überschriften.
  wahr(xml.includes('<w:pStyle w:val="Heading1"/>'), 'keine Überschrift erster Ebene');
  wahr(xml.includes('<w:pStyle w:val="Heading2"/>'), 'keine Überschrift zweiter Ebene');
  wahr(xml.includes('<w:outlineLvl w:val="1"/>'), 'ohne outlineLvl bleibt die Navigation leer');
  // Text ist Text, nicht Bild.
  wahr(xml.includes('Hier wird unterschrieben.'), 'der Text der Stelle fehlt');
  wahr(xml.includes('Fertig, wenn: Beleg liegt vor'), 'das Kriterium fehlt');
  // Die Bildunterschrift nennt Schritt, Text und Labels.
  wahr(/Schritt 2 · Liste öffnen · Deutsch · Dealer/.test(xml), 'die Bildunterschrift stimmt nicht');
  gleich((xml.match(/<w:drawing>/g) || []).length, 1);
  wahr(xml.includes('<dc:title>Benutzerhandbuch oneSCM</dc:title>'), 'der Titel fehlt');

  // Ohne Texte bleiben Überschriften und Bilder, die Erläuterungen gehen.
  const knapp = Buffer.from(kern.docxAusHandbuch(teile, { bilder: {}, mitTexten: false })).toString('utf8');
  wahr(!knapp.includes('Hier wird unterschrieben.'), 'die Texte wurden nicht abgeschaltet');
  wahr(knapp.includes('7.5 Digitale Unterschrift'), 'die Überschrift fehlt');
  // Ein Bild, das nicht mitgegeben wurde, lässt das Dokument stehen.
  gleich((knapp.match(/<w:drawing>/g) || []).length, 0);
  gleich(kern.docxAusHandbuch([]), null);
});

/* ------------------------------- Die Hausmarke (1.44.0) */

s.test('die Hausmarke nimmt nur an, was sich zeichnen lässt', () => {
  const gelesen = kern.leseHausmarke({
    akzent: '#00ADEF',
    tinte: 'dunkelblau',
    schrift: 'arial',
    logo: 'data:image/png;base64,AAAA'
  });
  gleich(gelesen.akzent, '#00adef', 'die Farbe wird nicht vereinheitlicht');
  gleich(gelesen.tinte, '', 'ein Farbname ist kein Farbwert');
  gleich(gelesen.schrift, 'arial');
  wahr(gelesen.logo.startsWith('data:image/png'), gelesen.logo);

  // Eine fremde Adresse ist kein Logo - die Seite lädt nichts von außen.
  gleich(kern.leseHausmarke({ logo: 'https://example.com/logo.png' }).logo, '');
  // Ein zu großes Logo wird abgelehnt, nicht gekürzt.
  gleich(kern.leseHausmarke({ logo: 'data:image/png;base64,' + 'A'.repeat(kern.LOGO_GRENZE) }).logo, '');
  // Eine unbekannte Schrift fällt auf die der Seite zurück.
  gleich(kern.leseHausmarke({ schrift: 'hausschrift' }).schrift, '');
  tieferGleich(kern.leseHausmarke({}), kern.leereHausmarke());

  gleich(kern.markenSchrift('arial'), 'Arial, Helvetica, sans-serif');
  gleich(kern.markenSchrift(''), '', 'ohne Wahl gilt die Schrift der Seite');
  gleich(kern.markenSchrift('gibtsnicht'), '');
});

s.test('die Hausmarke überlebt in den Einstellungen des Studios', () => {
  const einstellungen = kern.leseDesignEinstellungen(
    kern.schreibeDesignEinstellungen({
      ...kern.leereDesignEinstellungen(),
      marke: { akzent: '#00adef', tinte: '#1a1a1a', schrift: 'georgia', logo: 'data:image/svg+xml;base64,AAA' }
    })
  );
  gleich(einstellungen.marke.akzent, '#00adef');
  gleich(einstellungen.marke.schrift, 'georgia');
  wahr(einstellungen.marke.logo.startsWith('data:image/svg+xml'), einstellungen.marke.logo);
  // Ein älterer Stand ohne Hausmarke bekommt die leere.
  tieferGleich(kern.leseDesignEinstellungen(JSON.stringify({ vorlage: 'onepager' })).marke, kern.leereHausmarke());
});

/* ------------------------------- Die Projektdatei (1.45.0) */

const paketBestand = [
  { ...kern.leereAufnahme('2026-10-17'), id: 'AUF-2026-001', titel: 'Liste', gliederung: '6.2', begriffe: ['vorlage'] },
  { ...kern.leereAufnahme('2026-10-17'), id: 'AUF-2026-002', titel: 'Formular', gliederung: '6.3', begriffe: [] }
];

s.test('ein Paket trägt alles außer den Vorschauen', () => {
  const angaben = kern.paketAngaben({
    eingang: paketBestand.map((a) => ({ ...a, bild: 'data:image/jpeg;base64,AAAA' })),
    strecken: [{ id: 'STR-1', name: 'Weg', spalten: 2, schritte: [{ art: 'schritt', aufnahmen: ['AUF-2026-001'], text: 'eins' }] }],
    projekte: [kern.projektSatz({ name: 'oneSCM Portal', version: '2.4', land: 'Germany' })],
    ocr: { 'AUF-2026-001': { text: 'Übersicht', erkannt_am: '', teile: 1, quelle: 'claude' } },
    wortliste: [{ falsch: 'Dealer', richtig: 'Händler', sprache: 'de' }],
    stand: '2026-10-18T08:00:00.000Z',
    anwendung: '1.45.0'
  });
  gleich(angaben.paket, kern.PAKET_VERSION);
  gleich(angaben.anzahl, 2);
  gleich(angaben.erzeugt_von, 'Screenarchiv 1.45.0');
  // Die Vorschau bleibt draußen: sie entsteht beim Einlesen neu.
  wahr(!('bild' in angaben.aufnahmen[0]), 'die Vorschau liegt im Paket');

  const gelesen = kern.lesePaketAngaben(JSON.stringify(angaben));
  gleich(gelesen.ok, true);
  gleich(gelesen.aufnahmen.length, 2);
  gleich(gelesen.strecken.length, 1);
  gleich(gelesen.projekte.length, 1);
  gleich(gelesen.wortliste.length, 1);
  gleich(Object.keys(gelesen.ocr).length, 1);
  wahr(kern.paketBericht(gelesen, 3).includes('3 Bild(er)'), kern.paketBericht(gelesen, 3));

  // Eine fremde oder kaputte Datei wird benannt, nicht verschluckt.
  gleich(kern.lesePaketAngaben('{kaputt').ok, false);
  gleich(kern.lesePaketAngaben(JSON.stringify({ irgendwas: 1 })).ok, false);
  wahr(kern.paketBericht(kern.lesePaketAngaben('[]')).includes('keine Projektdatei'), 'der Grund fehlt');
  // Eine neuere Fassung wird gelesen und als solche genannt.
  const kuenftig = kern.lesePaketAngaben(JSON.stringify({ ...angaben, paket: 99 }));
  gleich(kuenftig.kuenftig, true);
  wahr(kern.paketBericht(kuenftig, 0).includes('neueren Fassung'), kern.paketBericht(kuenftig, 0));
});

s.test('Bildnamen im Paket führen zurück auf Kennung und Fassung', () => {
  gleich(kern.paketBildname('AUF-2026-001'), 'bilder/auf-2026-001.jpeg');
  gleich(kern.paketBildname('AUF-2026-001', 2, 'png'), 'bilder/auf-2026-001--f2.png');
  tieferGleich(kern.paketBildschluessel('bilder/auf-2026-001.jpeg'), {
    kennung: 'AUF-2026-001',
    fassung: 0,
    schluessel: 'AUF-2026-001'
  });
  tieferGleich(kern.paketBildschluessel('bilder/auf-2026-001--f3.png'), {
    kennung: 'AUF-2026-001',
    fassung: 3,
    schluessel: 'AUF-2026-001:3'
  });
  // Was nicht im Bilderordner liegt, ist kein Bild des Pakets.
  gleich(kern.paketBildschluessel('screenarchiv.json'), null);
  gleich(kern.paketBildschluessel('bilder/liesmich.txt'), null);
});

s.test('beim Ergänzen behält keiner sein Bild auf Kosten des anderen', () => {
  const eigene = [{ ...paketBestand[0], titel: 'Meine Liste' }];
  const fremde = [
    { ...paketBestand[0], titel: 'Fremde Liste' },
    { ...paketBestand[1], titel: 'Fremdes Formular' }
  ];
  const zusammen = kern.fuehrePaketZusammen(eigene, fremde, 'ergaenzen', '2026-10-18');
  gleich(zusammen.eingang.length, 3, 'nichts darf verloren gehen');
  gleich(zusammen.neu, 2);
  gleich(zusammen.umbenannt.size, 1, 'die doppelte Kennung muss weichen');
  const neueKennung = zusammen.umbenannt.get('AUF-2026-001');
  wahr(neueKennung && neueKennung !== 'AUF-2026-001', neueKennung);
  wahr(
    zusammen.eingang.some((a) => a.titel === 'Meine Liste' && a.id === 'AUF-2026-001'),
    'die eigene Aufnahme hat ihre Kennung verloren'
  );
  wahr(zusammen.eingang.some((a) => a.titel === 'Fremde Liste' && a.id === neueKennung), 'die fremde fehlt');

  // Die Strecken des Pakets zeigen danach auf die neuen Kennungen.
  const strecken = kern.streckenMitNeuenKennungen(
    [{ id: 'S', name: 'Weg', schritte: [{ art: 'schritt', aufnahmen: ['AUF-2026-001', 'AUF-2026-002'], text: 'x' }] }],
    zusammen.umbenannt
  );
  tieferGleich(strecken[0].schritte[0].aufnahmen, [neueKennung, 'AUF-2026-002']);

  // Ersetzen räumt den eigenen Bestand ab - und sagt es.
  const ersetzt = kern.fuehrePaketZusammen(eigene, fremde, 'ersetzen');
  gleich(ersetzt.eingang.length, 2);
  gleich(ersetzt.ersetzt, 1);
  gleich(ersetzt.umbenannt.size, 0);
});

/* ------------------------------- Das Fortschrittsblatt (1.46.0) */

const fortschrittGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '6', thema: 'Markt', ebene: 1 },
    { nummer: '6.1', thema: 'Einstellungen', ebene: 2 },
    { nummer: '6.2', thema: 'Vorlagen', ebene: 2 },
    { nummer: '7', thema: 'Zahlung', ebene: 1 },
    { nummer: '7.1', thema: 'Konten', ebene: 2 }
  ]
});

s.test('der Fortschritt zählt Stellen, nicht Bilder', () => {
  const bilder = [
    { id: 'A1', gliederung: '6.1', sprache: 'de' },
    { id: 'A2', gliederung: '6.1', sprache: 'en' },
    { id: 'A3', gliederung: '6.1', sprache: 'de' },
    { id: 'A4', gliederung: '7.1', sprache: 'de' },
    { id: 'A5', gliederung: '', sprache: 'de' }
  ];
  const daten = kern.fortschrittDaten(fortschrittGliederung, bilder, { achse: 'sprache' });
  gleich(daten.kapitel.length, 2);

  // Kapitel 6 hat zwei Stellen, belegt ist eine - trotz dreier Bilder.
  const sechs = daten.kapitel.find((k) => k.nummer === '6');
  gleich(sechs.stellen, 2);
  gleich(sechs.belegt, 1);
  gleich(sechs.anteil, 0.5);
  gleich(sechs.bilder, 3);
  tieferGleich(sechs.jeWert.map((w) => `${w.label}:${w.stellen}`), ['Deutsch:1', 'Englisch:1']);

  const sieben = daten.kapitel.find((k) => k.nummer === '7');
  gleich(sieben.belegt, 1);
  gleich(sieben.anteil, 1);
  gleich(sieben.jeWert.find((w) => w.wert === 'en').stellen, 0, 'Englisch fehlt in Kapitel 7');

  // Insgesamt: zwei von drei Stellen, ein Bild ohne Stelle.
  gleich(daten.gesamt.stellen, 3);
  gleich(daten.gesamt.belegt, 2);
  gleich(daten.gesamt.bilder, 5);
  gleich(daten.gesamt.ohneStelle, 1);
  wahr(kern.fortschrittText(daten).includes('2 von 3 Stellen belegt (67 %)'), kern.fortschrittText(daten));
  wahr(kern.fortschrittText(daten).includes('1 ohne Stelle'), kern.fortschrittText(daten));

  // Ohne Achse gibt es keine zweite Zeile.
  const ohne = kern.fortschrittDaten(fortschrittGliederung, bilder, { achse: '' });
  tieferGleich(ohne.werte, []);
  tieferGleich(ohne.kapitel[0].jeWert, []);
  // Ein leerer Bestand ist kein Fehler, sondern null Prozent.
  const leer = kern.fortschrittDaten(fortschrittGliederung, []);
  gleich(leer.gesamt.belegt, 0);
  gleich(leer.gesamt.anteil, 0);
  wahr(kern.fortschrittText(leer).includes('0 von 3'), kern.fortschrittText(leer));
});

/* ------------------------------- Der Rückweg aus Word (1.47.0) */

const wordXml = [
  '<?xml version="1.0"?><w:document xmlns:w="urn:w"><w:body>',
  '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>7 Zahlungsdaten</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>Im Haus neu geschrieben.</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>Fertig, wenn: der Beleg vorliegt</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="Bildunterschrift"/></w:pPr><w:r><w:t>Schritt 1 · Liste</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>7.5 Unterschrift</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>Erster Absatz.</w:t></w:r><w:r><w:t xml:space="preserve"> Noch im selben.</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>Zweiter Absatz mit &amp; und &lt;Klammer&gt;.</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Ohne Nummer</w:t></w:r></w:p>',
  '</w:body></w:document>'
].join('');

const wordGliederung = kern.leseGliederung({
  eintraege: [
    { nummer: '7', thema: 'Zahlungsdaten', ebene: 1, text: 0, kriterium: 1 },
    { nummer: '7.5', thema: 'Unterschrift', ebene: 2, text: 2 }
  ],
  texte: ['Alter Text', 'altes Kriterium', 'Erster Absatz. Noch im selben.\n\nZweiter Absatz mit & und <Klammer>.']
});

s.test('aus einer Word-Datei werden Stellen, Texte und Kriterien', () => {
  const absaetze = kern.docxAbsaetze(wordXml);
  // Zwei Läufe in einem Absatz sind ein Absatz, kein zweiter.
  wahr(
    absaetze.some((a) => a.text === 'Erster Absatz. Noch im selben.'),
    absaetze.map((a) => a.text).join(' | ')
  );
  // Die Maskierung wird zurückgenommen.
  wahr(absaetze.some((a) => a.text === 'Zweiter Absatz mit & und <Klammer>.'), 'die Maskierung blieb stehen');

  const stellen = kern.stellenAusDocx(absaetze);
  gleich(stellen.length, 2, 'eine Überschrift ohne Nummer ist keine Stelle');
  gleich(stellen[0].nummer, '7');
  gleich(stellen[0].thema, 'Zahlungsdaten');
  gleich(stellen[0].text, 'Im Haus neu geschrieben.');
  gleich(stellen[0].kriterium, 'der Beleg vorliegt', 'das Kriterium wird nicht erkannt');
  // Die Bildunterschrift gehört zum Bild, nicht zum Text der Stelle.
  wahr(!stellen[0].text.includes('Schritt 1'), stellen[0].text);
  gleich(stellen[1].text, 'Erster Absatz. Noch im selben.\n\nZweiter Absatz mit & und <Klammer>.');
});

s.test('der Vergleich zeigt, was sich ändern würde – bevor etwas geschieht', () => {
  const gelesen = kern.stellenAusDocx(kern.docxAbsaetze(wordXml));
  const vergleich = kern.vergleicheStellentexte(wordGliederung, gelesen, {});
  const sieben = vergleich.find((v) => v.nummer === '7');
  gleich(sieben.art, 'geaendert');
  tieferGleich(sieben.felder, ['text', 'kriterium']);
  gleich(sieben.alt.text, 'Alter Text');
  // 7.5 steht in der Datei genau so wie in der Gliederung.
  gleich(vergleich.find((v) => v.nummer === '7.5').art, 'gleich');
  // Eine Stelle, die es nicht gibt, wird benannt statt angelegt.
  const fremd = kern.vergleicheStellentexte(wordGliederung, [{ nummer: '9.9', thema: 'X', text: 'Y', kriterium: '' }], {});
  gleich(fremd[0].art, 'unbekannt');

  // Übernehmen schreibt nur die gewählten Stellen und nur gefüllte Felder.
  const eigene = kern.uebernimmStellentexte({}, vergleich, ['7'], '2026-10-18T00:00:00.000Z');
  tieferGleich(Object.keys(eigene), ['7']);
  gleich(eigene['7'].text, 'Im Haus neu geschrieben.');
  gleich(eigene['7'].geaendert_am, '2026-10-18T00:00:00.000Z');
  // Nichts gewählt heißt: nichts geschieht.
  tieferGleich(kern.uebernimmStellentexte({}, vergleich, []), {});

  // Mit den eigenen Texten darüber ist dieselbe Datei danach „gleich".
  const danach = kern.vergleicheStellentexte(wordGliederung, gelesen, eigene);
  gleich(danach.find((v) => v.nummer === '7').art, 'gleich');
});

s.test('die eigenen Texte legen sich über die Gliederung, ohne sie zu ändern', () => {
  const eigene = { '7': { text: 'Eigener Text', geaendert_am: '2026-10-18T00:00:00.000Z' } };
  const mit = kern.gliederungMitTexten(wordGliederung, eigene);
  gleich(mit.find((e) => e.nummer === '7').text, 'Eigener Text');
  gleich(mit.find((e) => e.nummer === '7').eigenerText, true);
  gleich(mit.find((e) => e.nummer === '7').kriterium, 'altes Kriterium', 'ein Feld ohne Änderung bleibt');
  // Die Gliederung des Projekts bleibt, wie sie war.
  gleich(wordGliederung.find((e) => e.nummer === '7').text, 'Alter Text');
  gleich(kern.gliederungMitTexten(wordGliederung, {}), wordGliederung, 'ohne eigene Texte dieselbe Liste');

  // Speichern und lesen: leere Felder fallen weg, Kaputtes gibt nichts.
  const gelesen = kern.leseStellentexte(kern.schreibeStellentexte({ ...eigene, '8': { text: '   ' } }));
  tieferGleich(Object.keys(gelesen), ['7']);
  tieferGleich(kern.leseStellentexte('{kaputt'), {});
  tieferGleich(kern.leseStellentexte(null), {});
});

/* ------------------------------- Die Sprache der Unterlagen (1.48.0) */

s.test('die Rahmentexte der Unterlagen wechseln die Sprache, die Inhalte nicht', () => {
  const info = {
    titel: '',
    quelle: 'Vorlagenliste öffnen',
    kapitel: '7.5.1',
    anzahl: 3,
    seiten: 2,
    vorlage: 'Quick Guide',
    projekt: 'oneSCM Portal',
    stand: '2026-10-18T08:00:00.000Z'
  };
  const deutsch = kern.deckblattZeilen(info);
  const englisch = kern.deckblattZeilen({ ...info, sprache: 'en' });
  gleich(deutsch.titel, 'Unterlage');
  gleich(englisch.titel, 'Document');
  tieferGleich(deutsch.paare.map(([schild]) => schild).slice(0, 3), ['Inhalt', 'Stelle im Handbuch', 'Bilder']);
  tieferGleich(englisch.paare.map(([schild]) => schild).slice(0, 3), ['Content', 'Section in the manual', 'Images']);
  // Der Inhalt bleibt, wie er erfasst wurde - übersetzt wird der Rahmen.
  gleich(englisch.paare.find(([, wert]) => wert === 'Vorlagenliste öffnen')[1], 'Vorlagenliste öffnen');

  gleich(kern.seitenzahlText(2, 5, 'de'), 'Seite 2 von 5');
  gleich(kern.seitenzahlText(2, 5, 'en'), 'Page 2 of 5');
  tieferGleich(kern.zeilenTeile(['seitenzahl'], { nummer: 1, von: 3, sprache: 'en' }), ['Page 1 of 3']);

  // Ein unbekannter Schlüssel oder eine unbekannte Sprache fällt auf Deutsch
  // zurück, statt leer zu bleiben.
  gleich(kern.sagen('fertigWenn', 'en'), 'Done when:');
  gleich(kern.sagen('fertigWenn', 'kl'), 'Fertig, wenn:');
  gleich(kern.sagen('gibtsnicht', 'en'), 'gibtsnicht');
});

s.test('Handbuch und Fortschritt sprechen dieselbe gewählte Sprache', () => {
  const teile = [
    {
      nummer: '7.5',
      thema: 'Digitale Unterschrift',
      ebene: 2,
      text: 'Hier wird unterschrieben.',
      kriterium: 'Beleg liegt vor',
      notiz: '',
      bilder: [{ id: 'A1', titel: 'Liste', sprache: 'de', begriffe: [] }],
      schritte: [{ nummer: 1, text: 'Liste öffnen', aufnahme: 'A1' }],
      nachkommen: 1,
      folge: 'Weg A'
    }
  ];
  const html = kern.handbuchHtml(teile, { sprache: 'en', bilder: new Map() });
  wahr(html.includes('<html lang="en"'), 'die Sprache steht nicht am Dokument');
  wahr(html.includes('Completion criterion'), 'das Kriterium ist nicht übersetzt');
  wahr(html.includes('Sequence: Weg A'), 'die Folge ist nicht übersetzt');
  wahr(html.includes('<title>User manual</title>'), 'der Titel fehlt');
  // Der Inhalt bleibt deutsch - er wurde deutsch erfasst.
  wahr(html.includes('Hier wird unterschrieben.'), 'der Inhalt wurde angefasst');

  const docx = Buffer.from(
    kern.docxAusHandbuch(teile, { sprache: 'en', bilder: new Map() })
  ).toString('utf8');
  wahr(docx.includes('Done when: Beleg liegt vor'), 'das Word-Kriterium ist nicht übersetzt');
  wahr(docx.includes('<dc:title>User manual</dc:title>'), 'der Word-Titel fehlt');
  wahr(docx.includes('Step 1 · Liste öffnen'), 'die Bildunterschrift ist nicht übersetzt');

  const daten = kern.fortschrittDaten(fortschrittGliederung, [{ id: 'A', gliederung: '6.1' }]);
  wahr(kern.fortschrittText(daten, 'en').includes('sections covered'), kern.fortschrittText(daten, 'en'));
  wahr(kern.fortschrittText(daten).includes('Stellen belegt'), kern.fortschrittText(daten));

  // Die Wahl liegt bei den Einstellungen des Studios.
  gleich(kern.leseDesignEinstellungen(JSON.stringify({ sprache: 'en' })).sprache, 'en');
  gleich(kern.leseDesignEinstellungen(JSON.stringify({ sprache: 'kl' })).sprache, 'de', 'eine fremde Sprache gilt nicht');
  gleich(kern.leereDesignEinstellungen().sprache, 'de');
});

/* ------------------------------- Suche über die Lesungen (1.49.0) */

s.test('die Suche findet, was im Bild steht – wenn eine Lesung vorliegt', () => {
  const liste = [
    { ...kern.leereAufnahme('2026-10-18'), id: 'A1', titel: 'Übersicht', begriffe: [] },
    { ...kern.leereAufnahme('2026-10-18'), id: 'A2', titel: 'Formular', begriffe: [] }
  ];
  const texte = { A1: { text: 'Offene Freigaben 47 · Termintreue 92,4 %' } };

  // Ohne Lesungen findet die Suche nichts - das Wort steht in keinem Feld.
  gleich(kern.filtereEingang(liste, { suche: 'termintreue' }).length, 0);
  tieferGleich(kern.filtereEingang(liste, { suche: 'termintreue' }, texte).map((a) => a.id), ['A1']);
  // Zwei Wörter müssen beide vorkommen - auch über Feld und Lesung hinweg.
  tieferGleich(kern.filtereEingang(liste, { suche: 'übersicht termintreue' }, texte).map((a) => a.id), ['A1']);
  gleich(kern.filtereEingang(liste, { suche: 'formular termintreue' }, texte).length, 0);
  // Die Umlautschreibweise greift auch in der Lesung.
  gleich(kern.filtereEingang(liste, { suche: 'uebersicht' }, texte).length, 1);

  // Die Karte soll sagen, woher der Treffer kommt.
  gleich(kern.trefferAusLesung(liste[0], 'termintreue', texte), true);
  gleich(kern.trefferAusLesung(liste[0], 'übersicht', texte), false, 'der Titel ist kein Bildtext');
  gleich(kern.trefferAusLesung(liste[1], 'termintreue', texte), false);
  gleich(kern.trefferAusLesung(liste[0], '', texte), false, 'ohne Suche kein Treffer');

  // Der Merkzettel der Lesung hängt am Satz, nicht an der Kennung.
  const eintrag = { text: 'Freigabe' };
  const erst = kern.ocrSuchIndex(eintrag);
  gleich(kern.ocrSuchIndex(eintrag), erst);
  wahr(kern.ocrSuchIndex({ text: 'Vertrag' }).includes('vertrag'), 'ein neuer Satz bekommt seinen eigenen Text');
  gleich(kern.ocrSuchIndex(null), '');
});

/* ------------------------------- Die Hausmarke als Datei (1.49.0) */

s.test('die Hausmarke lässt sich als Datei sichern und wieder lesen', () => {
  const einstellungen = {
    ...kern.leereDesignEinstellungen(),
    sprache: 'en',
    kopf: ['titel', 'seitenzahl'],
    fuss: ['stand'],
    deckblatt: true,
    marke: { akzent: '#00adef', tinte: '#1a1a1a', schrift: 'arial', logo: 'data:image/png;base64,AAA' },
    eigene: [kern.eigeneVorlage({ label: 'Hausblatt', spalten: 2, zeilen: 2, textspalte: 0.3, textlaenge: 200 })],
    titel: 'Nur der Inhalt'
  };
  const datei = kern.markendateiAngaben(einstellungen, { anwendung: '1.49.0', stand: '2026-10-19T08:00:00.000Z' });
  gleich(datei.hausmarke, kern.MARKENDATEI_VERSION);
  // Der Titel ist Inhalt, kein Erscheinungsbild - er reist nicht mit.
  wahr(!('titel' in datei), 'der Titel liegt in der Markendatei');

  const gelesen = kern.leseMarkendatei(JSON.stringify(datei));
  gleich(gelesen.ok, true);
  gleich(gelesen.marke.akzent, '#00adef');
  gleich(gelesen.sprache, 'en');
  tieferGleich(gelesen.kopf, ['titel', 'seitenzahl']);
  gleich(gelesen.deckblatt, true);
  gleich(gelesen.vorlagen.length, 1);
  gleich(gelesen.vorlagen[0].label, 'Hausblatt');
  wahr(kern.markendateiBericht(gelesen).includes('Akzent #00adef'), kern.markendateiBericht(gelesen));
  wahr(kern.markendateiBericht(gelesen).includes('1 eigene Vorlage(n)'), kern.markendateiBericht(gelesen));

  // Fremdes wird benannt, nicht geglaubt.
  gleich(kern.leseMarkendatei('{kaputt').ok, false);
  gleich(kern.leseMarkendatei(JSON.stringify({ marke: { akzent: '#000000' } })).ok, false);
  wahr(kern.markendateiBericht(kern.leseMarkendatei('null')).includes('keine Hausmarke'), 'der Grund fehlt');
  // Eine Farbe, die keine ist, kommt auch aus der Datei nicht durch.
  gleich(kern.leseMarkendatei(JSON.stringify({ hausmarke: 1, marke: { akzent: 'blau' } })).marke.akzent, '');
  // Eine neuere Fassung wird gelesen und als solche genannt.
  gleich(kern.leseMarkendatei(JSON.stringify({ ...datei, hausmarke: 9 })).kuenftig, true);
});

s.test('folgende Stellen laufen das Kapitel entlang (1.50.0)', () => {
  const gliederung = [
    { nummer: '7', thema: 'Signatur', ebene: 1 },
    { nummer: '7.5', thema: 'Signatur anstoßen', ebene: 2 },
    { nummer: '7.5.1', thema: 'Signaturanfrage senden', ebene: 3 },
    { nummer: '7.5.2', thema: 'Signaturergebnis prüfen', ebene: 3 },
    { nummer: '7.6', thema: 'Signatur widerrufen', ebene: 2 },
    { nummer: '8', thema: 'Abrechnung', ebene: 1 },
    { nummer: '8.1', thema: 'Rechnung stellen', ebene: 2 }
  ];
  // Nur Blätter: 7.5.1, 7.5.2, 7.6, 8.1 - dort hängen die Bilder.
  tieferGleich(kern.folgendeStellen(gliederung, '7.5.1', 3), ['7.5.1', '7.5.2', '7.6']);
  // Über das Kapitel hinaus wird weitergezählt, aber nichts erfunden.
  tieferGleich(kern.folgendeStellen(gliederung, '7.6', 5), ['7.6', '8.1']);
  tieferGleich(kern.folgendeStellen(gliederung, '7.5.2', 1), ['7.5.2']);
  // Mit Zwischenstellen zählt die ganze Ordnung mit.
  tieferGleich(kern.folgendeStellen(gliederung, '7.5', 3, { nurBlaetter: false }), ['7.5', '7.5.1', '7.5.2']);
  // Eine Stelle, die es nicht gibt, bringt nichts zurück.
  tieferGleich(kern.folgendeStellen(gliederung, '9.9', 3), []);
  // Eine Zwischenstelle ist kein Blatt - ohne Blattsuche findet sie sich nicht.
  tieferGleich(kern.folgendeStellen(gliederung, '7.5', 2), []);
  tieferGleich(kern.folgendeStellen(gliederung, '7.5.1', 0), []);
  tieferGleich(kern.folgendeStellen([], '1', 2), []);
  // Übergänge stehen nicht im Handbuch und bekommen keine Bilder.
  const mitUebergang = [...gliederung, { nummer: '7.7', thema: 'Hinweis', ebene: 2, art: 'uebergang' }];
  wahr(!kern.folgendeStellen(mitUebergang, '7.6', 3).includes('7.7'), 'ein Übergang bekam eine Folie');
});

s.test('die Stelle aus dem Folientext wird erkannt oder bleibt leer (1.50.0)', () => {
  const gliederung = [
    { nummer: '7.5.1', thema: 'Signaturanfrage senden', ebene: 3 },
    { nummer: '7.5.2', thema: 'Signaturergebnis prüfen', ebene: 3 },
    { nummer: '8.1', thema: 'Rechnung stellen', ebene: 2 }
  ];
  gleich(kern.stelleAusText(gliederung, 'Signaturergebnis prüfen'), '7.5.2');
  gleich(kern.stelleAusText(gliederung, 'Folie 4: Rechnung stellen im Portal'), '8.1');
  // Eine Nummer im Text entscheidet, auch gegen ein fremdes Thema.
  gleich(kern.stelleAusText(gliederung, '7.5.1 – Rechnung stellen'), '7.5.1');
  // Ein einzelnes Wort von zwei ist Zufall, kein Treffer.
  gleich(kern.stelleAusText(gliederung, 'Hallo Welt'), '');
  gleich(kern.stelleAusText(gliederung, 'Rechnung'), '');
  gleich(kern.stelleAusText(gliederung, ''), '');
  gleich(kern.stelleAusText(gliederung, 'ab'), '');
  gleich(kern.stelleAusText([], 'Signaturergebnis prüfen'), '');
  // Eine Nummer, die nicht in der Gliederung steht, zählt nicht.
  gleich(kern.stelleAusText(gliederung, '9.9.9 Unbekanntes'), '');
});

s.test('Zeitangaben eines Videos – lesbar und als Dateiname (1.55.0)', () => {
  gleich(kern.zeitText(0), '00:00,0');
  gleich(kern.zeitText(83.47), '01:23,4');
  gleich(kern.zeitText(599.99), '09:59,9');
  gleich(kern.zeitText(3600), '60:00,0', 'über eine Stunde wird weitergezählt, nicht umgebrochen');
  // Was keine Zahl ist, ergibt keine erfundene Zeit.
  gleich(kern.zeitText(-5), '00:00,0');
  gleich(kern.zeitText('abc'), '00:00,0');
  gleich(kern.zeitKennung(83.47), '01m23s4', 'im Dateinamen darf kein Doppelpunkt stehen');
  gleich(kern.istVideo('Vertrag anlegen.MP4'), true);
  gleich(kern.istVideo('bild.png'), false);
  gleich(kern.istVideo(''), false);
});

s.test('die Abtaststellen liegen in der Mitte der Abschnitte (1.55.0)', () => {
  tieferGleich(kern.videoSchritte(10, 4), [1.25, 3.75, 6.25, 8.75]);
  // Kein Punkt bei 0 und keiner am Ende: ein Videoanfang ist oft schwarz.
  const alle = kern.videoSchritte(8, 24);
  gleich(alle.length, 24);
  wahr(alle[0] > 0, 'die erste Stelle liegt bei 0');
  wahr(alle[alle.length - 1] < 8, 'die letzte Stelle liegt am Ende');
  tieferGleich(kern.videoSchritte(0, 4), []);
  tieferGleich(kern.videoSchritte(-3, 4), []);
  gleich(kern.videoSchritte(10, 0).length, 1, 'eine Stelle bleibt immer');
  // Ein Ausschnitt wird eingehalten.
  const teil = kern.videoSchritte(10, 2, { ab: 4, bis: 6 });
  tieferGleich(teil, [4.5, 5.5]);
});

s.test('behalten wird, was sich geändert hat (1.55.0)', () => {
  const flaeche = (breite, hoehe, farbe) => {
    const daten = new Uint8ClampedArray(breite * hoehe * 4);
    for (let i = 0; i < breite * hoehe; i++) {
      daten[i * 4] = farbe[0];
      daten[i * 4 + 1] = farbe[1];
      daten[i * 4 + 2] = farbe[2];
      daten[i * 4 + 3] = 255;
    }
    return { daten, breite, hoehe };
  };
  const blau = (zeit) => ({ zeit, ...flaeche(48, 32, [20, 40, 80]) });
  const rot = (zeit) => ({ zeit, ...flaeche(48, 32, [160, 40, 30]) });

  // Vier gleiche Bilder: nur das erste wird behalten.
  const gleiche = kern.videoWahl([blau(1), blau(2), blau(3), blau(4)]);
  gleich(gleiche.length, 1);
  gleich(gleiche[0].grund, 'erstes Bild');

  // Ein Wechsel in der Mitte: zwei Bilder.
  const wechsel = kern.videoWahl([blau(1), blau(2), rot(3), rot(4)]);
  tieferGleich(wechsel.map((b) => b.zeit), [1, 3]);
  wahr(wechsel[1].grund.includes('%'), wechsel[1].grund);

  // Eine hohe Schwelle lässt den Wechsel durchgehen? Nein - er ist vollständig.
  gleich(kern.videoWahl([blau(1), rot(2)], { anteil: 0.5 }).length, 2);
  // Eine Obergrenze schneidet, behält aber das erste und die größten Änderungen.
  const viele = kern.videoWahl([blau(1), rot(2), blau(3), rot(4)], { hoechstens: 2 });
  gleich(viele.length, 2);
  gleich(viele[0].zeit, 1);
  // Ohne Bilder kommt nichts zurück.
  tieferGleich(kern.videoWahl([]), []);
  // Verschiedene Maße: lieber behalten als verwerfen.
  const anders = kern.videoWahl([blau(1), { zeit: 2, ...flaeche(24, 16, [20, 40, 80]) }]);
  gleich(anders.length, 2, 'ein unvergleichbares Bild wurde weggeworfen');
});

s.test('Name, Aufforderung und Deutung eines Videobildes (1.55.0)', () => {
  gleich(kern.videoBildname('Vertrag anlegen.mp4', 83.4, 3), 'Vertrag anlegen 03 01m23s4');
  // Zeichen, die in keinen Dateinamen gehören, fallen weg.
  gleich(kern.videoBildname('a/b:c*.webm', 0, 1), 'abc 01 00m00s0');
  gleich(kern.videoBildname('', 0, 1), 'video 01 00m00s0');

  const text = kern.videoAufforderung({}, { titel: 'Vertrag.mp4', stelle: '7.5.1', nummer: 2, von: 5 });
  wahr(text.includes('Bild 2 von 5'), text);
  wahr(text.includes('Imperativ'), text);
  wahr(text.includes('7.5.1'), text);
  // Einzeln steht kein Folgehinweis drin.
  wahr(!kern.videoAufforderung({}, { nummer: 1, von: 1 }).includes('von 1 einer Folge'), 'der Folgehinweis steht unnötig da');

  // Die Antwort wird von Nummer und Anführungszeichen befreit, nicht erfunden.
  gleich(kern.videoText('Bild 2: „Im Feld Vertragsnummer tippen."'), 'Im Feld Vertragsnummer tippen.');
  gleich(kern.videoText('3) Auf Suchen klicken.'), 'Auf Suchen klicken.');
  gleich(kern.videoText('Erste Zeile\nzweite Zeile'), 'Erste Zeile zweite Zeile');
  gleich(kern.videoText(''), '');
  gleich(kern.videoText(null), '');
});

s.test('der Browser wird nach den Formaten gefragt, nicht geraten (1.55.0)', () => {
  gleich(kern.videoFormatBericht({ mp4: 'probably', webm: 'probably' }).ok, true);
  wahr(kern.videoFormatBericht({ mp4: 'probably', webm: '' }).text.includes('MP4'), 'MP4 wird nicht genannt');
  // Ohne MP4 ist „als MP4 exportieren" der falsche Rat - das darf nicht dastehen.
  const ohne = kern.videoFormatBericht({ mp4: '', webm: 'probably' });
  gleich(ohne.ok, false);
  wahr(ohne.text.includes('kein MP4'), ohne.text);
  wahr(ohne.text.includes('Chrome'), ohne.text);
  const nichts = kern.videoFormatBericht({});
  gleich(nichts.ok, false);
  wahr(nichts.text.includes('weder MP4 noch WebM'), nichts.text);
});

s.test('der Stand der Videoansicht zählt, was da ist (1.55.0)', () => {
  gleich(kern.videoStand([]), 'noch kein Bild herausgenommen');
  gleich(kern.videoStand([{ zeit: 1 }], 12), '1 Bild · 00:01,0 bis 00:01,0 von 00:12,0');
  gleich(kern.videoStand([{ zeit: 1, text: 'a' }, { zeit: 9 }], 12), '2 Bilder · 00:01,0 bis 00:09,0 von 00:12,0 · 1 gedeutet');
});

s.test('der Gebrauch wird gezählt, ohne den alten Stand zu verändern (1.56.0)', () => {
  const leer = kern.leseGebrauch(null, '2026-10-01');
  tieferGleich(leer, { seit: '2026-10-01', befehle: {}, ansichten: {} });

  const eins = kern.zaehleGebrauch(leer, 'befehl', 'beleg-oeffnen', '2026-10-01');
  gleich(eins.befehle['beleg-oeffnen'], 1);
  tieferGleich(leer.befehle, {}, 'der alte Stand wurde verändert');

  const zwei = kern.zaehleGebrauch(eins, 'befehl', 'beleg-oeffnen', '2026-10-01');
  gleich(zwei.befehle['beleg-oeffnen'], 2);
  const mitAnsicht = kern.zaehleGebrauch(zwei, 'ansicht', 'video', '2026-10-01');
  gleich(mitAnsicht.ansichten.video, 1);
  gleich(mitAnsicht.befehle['beleg-oeffnen'], 2, 'die Befehle gingen beim Zählen der Ansicht verloren');

  // Ein leerer Name zählt nicht - sonst stünde da ein Eintrag ohne Befehl.
  gleich(kern.zaehleGebrauch(leer, 'befehl', '').befehle[''], undefined);
  gleich(kern.zaehleGebrauch(leer, 'befehl', '   '), leer);

  // Schreiben und wieder lesen ergibt denselben Stand.
  tieferGleich(kern.leseGebrauch(kern.schreibeGebrauch(mitAnsicht)), mitAnsicht);
  // Unsinn im Speicher gilt als kein Stand, nicht als Fehler.
  tieferGleich(kern.leseGebrauch('{kaputt', '2026-10-01'), { seit: '2026-10-01', befehle: {}, ansichten: {} });
  tieferGleich(kern.leseGebrauch('"text"', '2026-10-01').befehle, {});
  // Werte, die keine Zahlen sind, kommen nicht durch.
  const schmutz = kern.leseGebrauch(JSON.stringify({ seit: 'x', befehle: { a: 'viel', b: -2, c: 3 } }));
  tieferGleich(schmutz.befehle, { c: 3 });
});

s.test('die Tage werden gezählt, nicht geschätzt (1.56.0)', () => {
  gleich(kern.tageSeit('2026-10-01', '2026-10-24'), 23);
  gleich(kern.tageSeit('2026-10-24', '2026-10-24'), 1, 'der erste Tag zählt als einer');
  gleich(kern.tageSeit('', '2026-10-24'), 0);
  gleich(kern.tageSeit('2026-10-24', '2026-10-01'), 0, 'rückwärts gibt es keine Tage');
});

s.test('der Bericht sortiert, statt zu urteilen (1.56.0)', () => {
  const ohne = kern.gebrauchBericht(kern.leseGebrauch(null, '2026-10-24'), '2026-10-24');
  gleich(ohne.gesamt, 0);
  wahr(ohne.urteil.includes('Noch nichts gezählt'), ohne.urteil);

  // Eine Woche ist zu kurz - das sagt der Bericht selbst.
  let stand = kern.leseGebrauch(null, '2026-10-20');
  stand = kern.zaehleGebrauch(stand, 'befehl', 'strecke-bpmn', '2026-10-20');
  const kurz = kern.gebrauchBericht(stand, '2026-10-23');
  wahr(kurz.urteil.includes('zu wenig für ein Urteil'), kurz.urteil);

  // Lange genug, und ein Befehl ist oft gedrückt: er steht unter „benutzt".
  let lang = kern.leseGebrauch(null, '2026-08-01');
  for (let i = 0; i < 5; i++) lang = kern.zaehleGebrauch(lang, 'befehl', 'strecke-bpmn', '2026-08-01');
  lang = kern.zaehleGebrauch(lang, 'befehl', 'beleg-oeffnen', '2026-08-01');
  const bericht = kern.gebrauchBericht(lang, '2026-10-24');
  gleich(bericht.benutzt.map((b) => b.kennung).join(), 'strecke-bpmn');
  gleich(bericht.selten.map((b) => b.kennung).join(), 'beleg-oeffnen');
  wahr(bericht.nie.length > 0, 'nichts steht unter „nie"');
  wahr(bericht.urteil.includes('nie gedrückt'), bericht.urteil);
  // Kein Urteil, nur ein Grund zu fragen.
  wahr(bericht.urteil.includes('nicht zu löschen'), bericht.urteil);

  // Was sich durch Zählen nicht beantworten lässt, steht als solches da.
  gleich(bericht.nichtMessbar.length, 1);
  wahr(bericht.nichtMessbar[0].feature.includes('F-08'), bericht.nichtMessbar[0].feature);
  wahr(bericht.nichtMessbar.every((b) => b.zahl === undefined), 'eine Zahl, wo es keine gibt');
});

s.test('der Gebrauch als Text nennt die Herkunft der Zahlen (1.56.0)', () => {
  let stand = kern.leseGebrauch(null, '2026-08-01');
  stand = kern.zaehleGebrauch(stand, 'befehl', 'beleg-oeffnen', '2026-08-01');
  stand = kern.zaehleGebrauch(stand, 'ansicht', 'video', '2026-08-01');
  const text = kern.gebrauchText(kern.gebrauchBericht(stand, '2026-10-24'));
  wahr(text.startsWith('Gebrauch'), text.slice(0, 40));
  wahr(text.includes('Nie gedrückt'), text);
  wahr(text.includes('Ansichten geöffnet'), text);
  wahr(text.includes('video – 1×'), text);
  // Der Satz, der sagt, wohin die Zahlen nicht gehen.
  wahr(text.includes('allein im Browser dieses Rechners'), text);
});

s.test('aus Videobildern wird eine Strecke in zeitlicher Folge (1.57.0)', () => {
  const bilder = [
    { uebernommen: 'AUF-2026-003', zeit: 6.1, text: 'Auf Speichern klicken.' },
    { uebernommen: 'AUF-2026-001', zeit: 0.1, text: 'Die Maske öffnen.' },
    { uebernommen: 'AUF-2026-002', zeit: 3.2, text: '' }
  ];
  const strecke = kern.streckeAusVideo(bilder, 'Vertrag anlegen', 1700000000000);
  gleich(strecke.name, 'Vertrag anlegen');
  // Die Reihenfolge kommt aus der Zeit, nicht aus der Liste.
  tieferGleich(strecke.schritte.map((s) => s.aufnahmen[0]), ['AUF-2026-001', 'AUF-2026-002', 'AUF-2026-003']);
  gleich(strecke.schritte[0].text, 'Die Maske öffnen.');
  gleich(strecke.schritte[1].text, '', 'ein fehlender Text wird nicht erfunden');
  gleich(strecke.schritte[0].art, 'schritt');

  // Ein Bild ohne Kennung im Eingang kann kein Schritt sein.
  const ohne = kern.streckeAusVideo([...bilder, { uebernommen: '', zeit: 1, text: 'nie übernommen' }], 'X');
  gleich(ohne.schritte.length, 3);
  // Die übergebene Liste bleibt, wie sie war.
  gleich(bilder[0].uebernommen, 'AUF-2026-003', 'die Liste wurde umsortiert');
  // Ohne Bilder eine leere Strecke, keine erfundene.
  gleich(kern.streckeAusVideo([], 'Leer').schritte.length, 0);
  gleich(kern.streckeAusVideo([], '').name, 'Video');
});

s.test('der Name der Strecke kommt aus dem Dateinamen (1.57.0)', () => {
  gleich(kern.streckenNameAusVideo('Vertrag_anlegen.mp4'), 'Vertrag anlegen');
  gleich(kern.streckenNameAusVideo('Quick-Guide-Signatur.webm'), 'Quick Guide Signatur');
  // Nur die Endung faellt weg, nicht jeder Punkt im Namen.
  gleich(kern.streckenNameAusVideo('Aufnahme.2026.10.24.mp4'), 'Aufnahme.2026.10.24');
  gleich(kern.streckenNameAusVideo(''), 'Video');
  gleich(kern.streckenNameAusVideo('.mp4'), 'Video');
});

s.test('ein Durchgang hält fest, womit er lief und was herauskam (1.59.0)', () => {
  const lauf = kern.videoLauf(1, 'abtastung', { anzahl: 24, anteil: 0.02, hoechstens: 20 }, { zahl: 4, gefunden: 4 });
  gleich(lauf.nummer, 1);
  gleich(lauf.art, 'abtastung');
  gleich(kern.laufText(lauf), 'Abtastung 24 Stellen · Schwelle 2 % · Höchstens 20 Bilder');
  // „Höchstens 0" heißt: alle, nicht null.
  wahr(kern.laufText(kern.videoLauf(1, 'abtastung', { anzahl: 12, anteil: 0.08, hoechstens: 0 }, {})).includes('Höchstens alle'),
    kern.laufText(kern.videoLauf(1, 'abtastung', { anzahl: 12, anteil: 0.08, hoechstens: 0 }, {})));
  // Eine erfundene Nummer gibt es nicht.
  gleich(kern.videoLauf(0, 'abtastung', {}, {}).nummer, 1);
  gleich(kern.videoLauf(3, 'deutung', { stufe: 'complex' }, {}).art, 'deutung');
  wahr(kern.laufText(kern.videoLauf(3, 'deutung', { stufe: 'complex' }, {})).includes('gründlich'), 'die Stufe fehlt');
});

s.test('der Vergleich sagt, was geändert wurde und was es gebracht hat (1.59.0)', () => {
  const a = kern.videoLauf(1, 'abtastung', { anzahl: 24, anteil: 0.02, hoechstens: 20 }, { zahl: 0 });
  const b = kern.videoLauf(2, 'abtastung', { anzahl: 24, anteil: 0.005, hoechstens: 20 }, { zahl: 11 });
  gleich(kern.laufVergleich(b, a), 'Schwelle 2 % → 0,5 % · 0 → 11');
  // Ohne Vorgänger gibt es nichts zu vergleichen - und nichts zu erfinden.
  gleich(kern.laufVergleich(a, null), '');
  // Zwei Regler auf einmal werden beide genannt.
  const c = kern.videoLauf(3, 'abtastung', { anzahl: 48, anteil: 0.005, hoechstens: 10 }, { zahl: 10 });
  wahr(kern.laufVergleich(c, b).includes('Abtastung'), kern.laufVergleich(c, b));
  wahr(kern.laufVergleich(c, b).includes('Höchstens'), kern.laufVergleich(c, b));
  // Dieselben Regler, dasselbe Ergebnis: auch das wird gesagt.
  const d = kern.videoLauf(4, 'abtastung', { anzahl: 48, anteil: 0.005, hoechstens: 10 }, { zahl: 10 });
  gleich(kern.laufVergleich(d, c), 'nichts geändert, gleiches Ergebnis');
  // Dieselben Regler, ein anderes Ergebnis - das liegt am Film.
  const e = kern.videoLauf(5, 'abtastung', { anzahl: 48, anteil: 0.005, hoechstens: 10 }, { zahl: 7 });
  wahr(kern.laufVergleich(e, d).includes('nichts geändert, trotzdem 10 → 7'), kern.laufVergleich(e, d));
  // Abtastung und Deutung werden nicht gegeneinander verglichen.
  gleich(kern.laufVergleich(kern.videoLauf(6, 'deutung', { stufe: 'default' }, { zahl: 3 }), e), '');
});

s.test('die Diagnose nennt eine Stellschraube, nicht drei (1.59.0)', () => {
  const leer = kern.laufDiagnose(kern.videoLauf(1, 'abtastung', { anzahl: 24, anteil: 0.02 }, { zahl: 0 }));
  gleich(leer.ok, false);
  wahr(leer.text.includes('Schwelle senken'), leer.text);
  wahr(leer.text.includes('nicht drei'), leer.text);

  // Die Grenze hat geschnitten - dann ist sie die Stellschraube.
  const voll = kern.laufDiagnose(
    kern.videoLauf(2, 'abtastung', { anzahl: 96, anteil: 0.005, hoechstens: 10 }, { zahl: 10, gefunden: 41 })
  );
  gleich(voll.ok, false);
  wahr(voll.text.includes('41 gefunden, 10 behalten'), voll.text);

  // Fast jede Stelle zaehlt: die Schwelle ist zu niedrig.
  const rauschen = kern.laufDiagnose(kern.videoLauf(3, 'abtastung', { anzahl: 24, anteil: 0.005 }, { zahl: 22, gefunden: 22 }));
  gleich(rauschen.ok, false);
  wahr(rauschen.text.includes('Mauszeiger'), rauschen.text);

  const gut = kern.laufDiagnose(kern.videoLauf(4, 'abtastung', { anzahl: 24, anteil: 0.02 }, { zahl: 6, gefunden: 6 }));
  gleich(gut.ok, true);

  // Deutung: gescheiterte Bilder bekommen ihren eigenen Rat.
  const halb = kern.laufDiagnose(kern.videoLauf(5, 'deutung', { stufe: 'default' }, { zahl: 4, gescheitert: 2 }));
  gleich(halb.ok, false);
  wahr(halb.text.includes('2 Bild(er) ohne Antwort'), halb.text);
  const nichts = kern.laufDiagnose(kern.videoLauf(6, 'deutung', { stufe: 'default' }, { zahl: 0 }));
  wahr(nichts.text.includes('Bilder sehen darf'), nichts.text);
});

s.test('das Vorgehen überdauert den einzelnen Film (1.59.0)', () => {
  const standard = kern.leseVorgehen(null);
  gleich(standard.stufe, 'default');
  gleich(standard.aufforderung, '');
  // 0,2 % und nicht 2 %: an einem Messfilm gefunden (1.62.0) – bei 2 %
  // wurden 3 von 10 echten Änderungen gefunden, bei 0,2 % alle zehn.
  gleich(standard.anteil, 0.002);

  const eigenes = { aufforderung: 'Beschreibe knapp.', stufe: 'complex', anzahl: 48, anteil: 0.005, hoechstens: 0 };
  tieferGleich(kern.leseVorgehen(kern.schreibeVorgehen(eigenes)), eigenes);

  // Unsinn kommt nicht durch, und nichts wird erfunden.
  gleich(kern.leseVorgehen('{kaputt').stufe, 'default');
  gleich(kern.leseVorgehen(JSON.stringify({ stufe: 'teuer' })).stufe, 'default');
  gleich(kern.leseVorgehen(JSON.stringify({ anzahl: -5 })).anzahl, 24);
  gleich(kern.leseVorgehen(JSON.stringify({ anteil: -1 })).anteil, 0.002);
  gleich(kern.leseVorgehen(JSON.stringify({ aufforderung: 42 })).aufforderung, '');
});

s.test('die Durchgänge als Text nennen Ergebnis, Änderung und Rat (1.59.0)', () => {
  const laeufe = [
    kern.videoLauf(1, 'abtastung', { anzahl: 24, anteil: 0.02, hoechstens: 20 }, { zahl: 0 }),
    kern.videoLauf(2, 'abtastung', { anzahl: 24, anteil: 0.005, hoechstens: 20 }, { zahl: 7, gefunden: 7 })
  ];
  const text = kern.laeufeText(laeufe, 'Vertrag.mp4');
  wahr(text.includes('Vertrag.mp4'), text.slice(0, 60));
  wahr(text.includes('V1'), text);
  wahr(text.includes('V2'), text);
  wahr(text.includes('Geändert: Schwelle 2 % → 0,5 %'), text);
  wahr(!text.includes('**'), 'im Text stehen Sternchen aus der Oberfläche');
  wahr(kern.laeufeText([]).includes('Noch kein Durchgang'), kern.laeufeText([]));
});

s.test('das Vorgehen reist in der Projektdatei mit (1.60.0)', () => {
  const vorgehen = { aufforderung: 'Nenne nur die Maske.', stufe: 'complex', anzahl: 48, anteil: 0.005, hoechstens: 0 };
  const angaben = kern.paketAngaben({ eingang: [], vorgehen, anwendung: '1.60.0' });
  tieferGleich(angaben.vorgehen, vorgehen);

  const gelesen = kern.lesePaketAngaben(JSON.stringify(angaben));
  gleich(gelesen.ok, true);
  tieferGleich(gelesen.vorgehen, vorgehen);
  wahr(kern.paketBericht(gelesen).includes('Vorgehen für das Register Video'), kern.paketBericht(gelesen));

  // Eine Datei ohne Vorgehen bringt keines mit - und erfindet keines.
  const ohne = kern.lesePaketAngaben(JSON.stringify(kern.paketAngaben({ eingang: [] })));
  gleich(ohne.vorgehen, null);
  wahr(!kern.paketBericht(ohne).includes('Vorgehen'), kern.paketBericht(ohne));
});

s.test('die Ursache wird genannt, nicht geraten (1.61.0)', () => {
  const kannBeides = { mp4: 'probably', webm: 'probably' };
  const kannNurWebm = { mp4: '', webm: 'probably' };

  // Der Browser kennt das Verfahren nicht: dann ist es das Verfahren.
  const format = kern.videoFehlerBericht({ kann: kannNurWebm, typ: 'video/mp4', groesse: 900 });
  gleich(format.grund, 'format');
  wahr(format.text.includes('kein MP4'), format.text);

  // Er kennt es: dann ist „als MP4 exportieren" ein Rat ins Leere – und
  // bei kleiner Datei ist erst einmal der zweite Weg dran.
  gleich(kern.videoFehlerBericht({ kann: kannBeides, typ: 'video/mp4', groesse: 900 }).grund, 'zweiter-weg');
  gleich(kern.videoFehlerBericht({ kann: kannBeides, typ: 'video/webm', groesse: kern.VIDEO_ZWEITER_WEG }).grund, 'zweiter-weg');

  // Zu groß für den zweiten Weg, oder er ist schon gescheitert.
  const gross = kern.videoFehlerBericht({ kann: kannBeides, typ: 'video/mp4', groesse: kern.VIDEO_ZWEITER_WEG + 1 });
  gleich(gross.grund, 'unbekannt');
  const schon = kern.videoFehlerBericht({ kann: kannBeides, typ: 'video/mp4', groesse: 900, zweiterWegGenutzt: true });
  gleich(schon.grund, 'unbekannt');
  // Und dieser Text behauptet gerade *nicht*, es liege am Format.
  wahr(schon.text.includes('liegt also nicht daran'), schon.text);
  wahr(!schon.text.includes('kein MP4'), schon.text);
  // Er nennt einen Weg, der weiterhilft, statt nur zu bedauern.
  wahr(schon.text.includes('Register Import'), schon.text);

  // Ein Browser, der gar nichts kann, bekommt die Formatauskunft.
  gleich(kern.videoFehlerBericht({ kann: {}, typ: 'video/mp4', groesse: 900 }).grund, 'format');
});

s.test('der geänderte Bereich wird zu einem Fingerzeig, nicht zu einem Rahmen um alles (1.63.0)', () => {
  const bild = (bereiche) => ({ ok: true, breite: 192, hoehe: 108, bereiche });

  // Ein Feld und ein wandernder Mauszeiger: der Zeiger bleibt draußen.
  const mitZeiger = kern.bereichAusVergleich(
    bild([{ x: 20, y: 30, breite: 40, hoehe: 12, kacheln: 9 }, { x: 150, y: 90, breite: 8, hoehe: 7, kacheln: 1 }])
  );
  gleich(mitZeiger.teile, 1, 'der Mauszeiger wurde eingerahmt');
  nahe(mitZeiger.breite, 40 / 192, 0.001);

  // Zwei Felder nebeneinander gehören zusammen.
  const zweiFelder = kern.bereichAusVergleich(
    bild([{ x: 20, y: 30, breite: 40, hoehe: 12, kacheln: 9 }, { x: 70, y: 32, breite: 30, hoehe: 12, kacheln: 8 }])
  );
  gleich(zweiFelder.teile, 2);
  nahe(zweiFelder.breite, 80 / 192, 0.001);

  // Ein zweiter Bereich, der den Rahmen über die Hälfte des Bildes blähen
  // würde, bleibt draußen – auch wenn er ins Gewicht fällt.
  const weitAuseinander = kern.bereichAusVergleich(
    bild([{ x: 0, y: 0, breite: 40, hoehe: 40, kacheln: 9 }, { x: 150, y: 90, breite: 40, hoehe: 18, kacheln: 8 }])
  );
  gleich(weitAuseinander.teile, 1);

  // Ohne Vergleich gibt es keinen Bereich – und keinen erfundenen.
  gleich(kern.bereichAusVergleich({ ok: false }), null);
  gleich(kern.bereichAusVergleich(bild([])), null);
});

s.test('aus dem Bereich wird ein Rahmen in Bildpunkten – oder keiner (1.63.0)', () => {
  const bereich = { x: 0.1, y: 0.2, breite: 0.2, hoehe: 0.1 };
  const rahmen = kern.rahmenAusBereich(bereich, 1280, 720);
  // Mit etwas Luft darum, aber innerhalb des Bildes.
  wahr(rahmen.x < 0.1 * 1280 && rahmen.x >= 0, JSON.stringify(rahmen));
  wahr(rahmen.breite > 0.2 * 1280, JSON.stringify(rahmen));
  wahr(rahmen.x + rahmen.breite <= 1280, JSON.stringify(rahmen));
  wahr(rahmen.y + rahmen.hoehe <= 720, JSON.stringify(rahmen));

  // Ein Rahmen um fast alles sagt nichts – dann kommt keiner.
  gleich(kern.rahmenAusBereich({ x: 0, y: 0, breite: 1, hoehe: 1 }, 1280, 720), null);
  gleich(kern.rahmenAusBereich({ x: 0, y: 0, breite: 0.95, hoehe: 0.9 }, 1280, 720), null);
  // Ohne Bereich oder ohne Maße ebenso.
  gleich(kern.rahmenAusBereich(null, 1280, 720), null);
  gleich(kern.rahmenAusBereich(bereich, 0, 0), null);
  // Am Rand wird nicht über das Bild hinaus gezeichnet.
  const amRand = kern.rahmenAusBereich({ x: 0, y: 0, breite: 0.1, hoehe: 0.1 }, 1280, 720);
  gleich(amRand.x, 0);
  gleich(amRand.y, 0);
});

s.test('die Auswahl trägt den Bereich mit, nicht nur die Zeit (1.63.0)', () => {
  const flaeche = (breite, hoehe, farbe, kasten) => {
    const daten = new Uint8ClampedArray(breite * hoehe * 4);
    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        const drin = kasten && x >= kasten.x && x < kasten.x + kasten.b && y >= kasten.y && y < kasten.y + kasten.h;
        const i = (y * breite + x) * 4;
        const wert = drin ? [250, 250, 250] : farbe;
        daten[i] = wert[0];
        daten[i + 1] = wert[1];
        daten[i + 2] = wert[2];
        daten[i + 3] = 255;
      }
    }
    return { daten, breite, hoehe };
  };
  const leer = { zeit: 0, ...flaeche(96, 64, [30, 50, 90], null) };
  const mitFeld = { zeit: 1, ...flaeche(96, 64, [30, 50, 90], { x: 10, y: 8, b: 30, h: 6 }) };
  const gewaehlt = kern.videoWahl([leer, mitFeld], { anteil: 0.002 });
  gleich(gewaehlt.length, 2);
  // Das erste Bild hat keinen Vorgänger, also auch keinen Bereich.
  gleich(gewaehlt[0].bereich, null);
  wahr(gewaehlt[1].bereich, 'der geänderte Bereich fehlt am zweiten Bild');
  // Er liegt dort, wo das Feld ist – links oben, nicht über dem ganzen Bild.
  wahr(gewaehlt[1].bereich.x < 0.3, JSON.stringify(gewaehlt[1].bereich));
  wahr(gewaehlt[1].bereich.breite < 0.7, JSON.stringify(gewaehlt[1].bereich));
});

export default s;
