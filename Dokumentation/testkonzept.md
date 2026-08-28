# Testkonzept

## Ausführung

```bash
npm test                     # alle Stufen
npm test -- --nur=kern       # eine Datei
npm run test:e2e             # nur die Browserprüfung
```

Der Runner (`Testing/run-tests.mjs`) lädt jede Datei aus `Testing/tests/`,
führt ihre Fälle der Reihe nach aus und schreibt zusätzlich einen Bericht nach
`Testing/berichte/letzter-lauf.md`. Rückgabewert 1 bei mindestens einem Fehler –
so ist der Lauf ohne weitere Einbindung in einer Pipeline verwendbar.

Es gibt keine Testabhängigkeiten außer `playwright-core` für die
Browserprüfung. Fehlt das Paket oder Chromium, meldet sich die Stufe als
„übersprungen“ statt zu scheitern.

## Stufen

| Datei | Prüft | Fälle |
| --- | --- | --- |
| `01-daten.test.mjs` | Bestand gegen Schema und inhaltliche Regeln | 10 |
| `02-kern.test.mjs` | Kernlogik ohne DOM: Suche, Filter, Facetten, Wirkung, Sortierung, Zustand, Formate | 19 |
| `03-aufnahmen.test.mjs` | erzeugte SVG-Aufnahmen: Vollständigkeit, Maße, Sauberkeit, Determinismus | 8 |
| `04-build.test.mjs` | `dist/index.html`: Aktualität, Titel, Gerüst, externe Quellen, Größe, Farbtoken | 12 |
| `05-oberflaeche.e2e.mjs` | die Seite im Browser: Suchen, Filtern, Archiv, Detail, Tastatur, Adresszeile, Themen, Überlauf | 16 |
| `06-aufnahme-kern.test.mjs` | Kernlogik von Aufnahme und Eingang: Kennungen, Begriffe, Prüfregeln, Ausschnitt, Filter, Speicher | 19 |
| `07-aufnahme.e2e.mjs` | Aufnahmemodus im Browser: Navigation, Quellen, Ausschnitt, Auslösen, Eingang, Nachpflege, Sichern | 27 |

Summe: **111 Prüfungen**.

## Eigene Helfer

* `hilfen/pruefe.mjs` – kleiner Testbaukasten (`suite`, `wahr`, `gleich`,
  `nahe`, `enthaelt`, `tieferGleich`).
* `hilfen/schema.mjs` – JSON-Schema-Prüfer für die genutzte Teilmenge
  (`type`, `required`, `enum`, `pattern`, `$ref`, `additionalProperties`, …).
* `hilfen/seite.mjs` – baut `dist/index.html` in dieselbe Hülle, die das
  Artifact beim Veröffentlichen ergänzt, und findet den vorinstallierten
  Chromium.
* `hilfen/browser.mjs` – startet den Browser je Testdatei, öffnet für jeden
  Fall eine frische Ansicht (eigener Speicher!), ersetzt die Schriften lokal
  und lässt jeden Fall an einem Konsolenfehler scheitern.
* `hilfen/bild.mjs` – erzeugt ein PNG ohne fremde Pakete, damit der
  Bild-Upload im Aufnahmestudio echt geprüft werden kann.

## Absichten hinter einzelnen Prüfungen

* **„dist/index.html ist aktuell“** baut die Seite erneut und vergleicht – so
  kann keine Fassung veröffentlicht werden, die nicht zu den Quellen passt.
* **„lädt von außen nur erlaubte Schriftquellen“** hält die Seite innerhalb der
  Inhaltsrichtlinie des Artifacts; ein versehentlich verlinktes Bild fiele auf.
* **„Farbwerte sind vollständig im hellen Grundzustand definiert“** verhindert
  den häufigsten Artifact-Fehler: eine Farbe, die nur im dunklen Zweig steht und
  in der Systemvorgabe fehlt.
* **„keine kollidierenden IDs“** – 40 Aufnahmen liegen in derselben Seite;
  gleiche IDs würden sich gegenseitig überschreiben.
* **„Erzeugung ist wiederholbar“** stellt sicher, dass ein erneuter Lauf von
  `npm run screens` keinen Rauschdiff erzeugt.
* **„Fehler in der Browserkonsole“** wird in jedem Oberflächenfall mitgeprüft.
* **„die Leertaste löst nicht aus, während getippt wird“** sichert die Grenze
  zwischen Tastenkürzel und Texteingabe – der Fehler wäre im Betrieb ärgerlich
  und im Nachhinein schwer zu finden.
* **„das gespeicherte Bild trägt die Maße des Ausschnitts“** lädt das abgelegte
  Bild wieder und misst es. Damit ist belegt, dass wirklich der gewählte
  Ausschnitt gespeichert wurde und nicht die ganze Quelle.
* **„der Eingang überlebt das Neuladen“** prüft die Ablage im Browser; jeder
  Fall startet mit leerem Speicher, sodass sich die Fälle nicht beeinflussen.

Zwei Fehler hat diese Stufe bei der Entwicklung von v1.1.0 gefunden: ein leer
bleibendes Ausgabefeld (`value` ist bei `<textarea>` kein Attribut) und eine
formatfüllende Auswahl, aus der sich kein neuer Ausschnitt aufziehen ließ.

## Was nicht geprüft wird

Das Aussehen selbst. Dafür gibt es `npm run schuss`: das Skript legt fünf
Bildschirmaufnahmen der fertigen Seite ab (Liste hell und dunkel, Detailansicht
hell und dunkel, Telefon) – zum Ansehen, nicht zum automatischen Vergleichen.
Automatisiert wird nur, was sich eindeutig entscheiden lässt.
