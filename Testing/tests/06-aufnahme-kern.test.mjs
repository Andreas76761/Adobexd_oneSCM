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
     'status', 'rolle', 'begriffe', 'notiz', 'autor', 'browser', 'ausschnitt', 'quelle'],
    'die Feldfolge ist nicht stabil'
  );
});

s.test('der Beipackzettel bleibt auch ohne Angaben vollständig geformt', () => {
  const zettel = JSON.parse(kern.baueBeipackzettel({ bildname: 'a.png' }));
  gleich(Object.keys(zettel).length, 17, 'Felder fehlen, wenn nichts eingetragen ist');
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
    ['seite', 'status', 'rolle', 'autor', 'browser'],
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

s.test('die Wahl des Beipackzettels wird gespeichert', () => {
  gleich(kern.ABLAGE_STANDARD.beipack, true, 'der Zettel ist nicht voreingestellt');
  gleich(kern.leseAblage(kern.schreibeAblage({ beipack: false })).beipack, false);
  gleich(kern.leseAblage('{}').beipack, true, 'ohne Angabe fehlt die Vorgabe');
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

export default s;
