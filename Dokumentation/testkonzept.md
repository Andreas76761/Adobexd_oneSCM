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
| `04-build.test.mjs` | `dist/index.html`: Aktualität, Titel, Gerüst, externe Quellen, Größe, Farbtoken, doppelte Selektoren | 15 |
| `05-oberflaeche.e2e.mjs` | die Seite im Browser: Suchen, Filtern, Archiv, Detail, Tastatur, Adresszeile, Themen, Überlauf | 16 |
| `06-aufnahme-kern.test.mjs` | Kernlogik von Aufnahme, Eingang, Ablage, Beipackzettel und Kontaktbogen | 37 |
| `07-aufnahme.e2e.mjs` | Aufnahmemodus im Browser: Navigation, Quellen, Bilderstapel, Zwischenablage, Live-Freigabe, Kompaktmodus, Ausschnitt mit der Maus, Auslösen, Fehlerwege, Eingang, Nachpflege, Kontaktbogen | 59 |

| `08-ausschneiden.e2e.mjs` | Schnipsel-Modus im Browser: Ablageziele, Namensmuster, Freigabe, Aufziehen, Ordner, Datei, Beipackzettel, Beenden, Sichtbarkeit im Archiv | 22 |

Summe: **185 Prüfungen**.

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
* **„kein Selektor ist doppelt gesetzt“** entstand aus einem echten Fehler:
  eine Ersetzung ohne Begrenzung fügte einen Stilblock dreifach ein, und die
  letzte Kopie hob die Korrektur der ersten still wieder auf.
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

* **Das Einfügen wird mit einem echten Ereignis geprüft.** Der Test baut aus
  einem erzeugten PNG ein `ClipboardEvent` mit `DataTransfer` – so wie ein
  Bildschirmfoto aus der Systemtaste – und prüft, dass daraus eine Quelle wird.
  Ein zweiter Fall stellt die gesperrte Richtlinie nach und verlangt, dass die
  Meldung Ursache **und** Ausweg nennt.
* **Der Beipackzettel wird aus dem Nachbau zurückgelesen.** Der Test schreibt
  einen Schnipsel in den nachgebildeten Ordner, holt die abgelegte `.json`
  wieder heraus und vergleicht jedes Feld mit dem, was in der Ansicht Aufnahme
  eingetragen wurde – einschließlich der vereinheitlichten Begriffe.
* **Der Ordner-Nachbau listet auch auf.** Er hält nicht nur jeden
  Schreibvorgang fest, sondern gibt die geschriebenen Dateien über einen
  Iterator zurück – so ist geprüft, dass das Archivband wirklich aus dem
  Dateisystem liest und die neuesten zuerst zeigt.
* **Ordnerwahl und Schreibzugriff werden nachgebildet.** Der Test schiebt ein
  `showDirectoryPicker` unter, das jeden Schreibvorgang festhält – so ist der
  ganze Weg bis in die Datei geprüft, samt Dateiname aus dem Muster und PNG als
  Format, ohne dass etwas auf die Platte gelangt.
* **Die Bildschirmfreigabe wird durch einen Leinwand-Datenstrom vertreten.**
  `canvas.captureStream()` liefert einen echten `MediaStream`; damit laufen
  Video, laufende Vorschau, Ausschnitt, Serienauslösung und das Ende der
  Freigabe wirklich durch – ohne Berechtigung und ohne Person am Bildschirm.
  Dieser Weg war vorher gar nicht geprüft.
* **Das Ziehen mit der Maus wird im Kompaktmodus geprüft**, mit echten
  Zeigerbewegungen über der laufenden Quelle: neu aufziehen, verschieben, an
  der Ecke fassen – jeweils in Bildpunkten der Quelle nachgerechnet. Ein
  zweiter Fall zieht absichtlich über den Rand hinaus und verlangt, dass der
  Ausschnitt in der Quelle bleibt und die Mindestgröße hält.
* **Die Fehlerwege des Auslösers werden nachgestellt**, weil sie sich anders
  nicht auslösen lassen: `Storage.prototype.setItem` wirft einmal
  `QuotaExceededError` (voll) und einmal `SecurityError` (gesperrt),
  `toDataURL` wirft den Schutzfehler des Browsers. Geprüft wird jeweils, ob die
  Meldung stimmt **und** ob die Aufnahme das richtige Schicksal hat.
* **Der Kontaktbogen wird gegen eine nachgebildete Ablagefähigkeit geprüft.**
  Der Test schiebt vor dem Laden ein `window.claude` unter, das jede Übergabe
  festhält oder mit einem gewählten Fehlercode scheitert. So sind der echte
  Übergabeweg, der Dateiname, der Inhalt und jeder Fehlerausgang geprüft, ohne
  dass eine Datei entsteht.

Zwei Fehler hat diese Stufe bei der Entwicklung von v1.1.0 gefunden: ein leer
bleibendes Ausgabefeld (`value` ist bei `<textarea>` kein Attribut) und eine
formatfüllende Auswahl, aus der sich kein neuer Ausschnitt aufziehen ließ.
In v1.2.0 kamen zwei Treffer der Build-Stufe dazu: `<!doctype` und `<img`
tauchten in der Seite auf, weil der Kontaktbogen-Erzeuger sie als Text enthält.
Die Prüfungen betrachten seither nur noch das Markup außerhalb des Skripts –
geschärft, nicht aufgeweicht.

## Was nicht geprüft wird

Ob ein gemerkter Ordner nach dem Neuladen zurückkommt. Der Nachbau eines
Ordnerzugriffs enthält Funktionen und lässt sich deshalb nicht in die
Browserdatenbank kopieren – echte Zugriffe sind dafür eigens vorgesehen.
Geprüft ist, dass das Merken stattfindet; das Zurückholen bleibt der
Sichtprüfung im Browser vorbehalten.

Das Aussehen selbst. Dafür gibt es `npm run schuss`: das Skript legt dreizehn
Bildschirmaufnahmen der fertigen Seite ab (Liste, Detailansicht, Telefon,
Aufnahmestudio, Kompaktmodus, Ausschneiden, Eingang, Nachpflege – hell und
dunkel) sowie
einen echten Kontaktbogen samt Bild davon. Zum Ansehen, nicht zum automatischen
Vergleichen: Automatisiert wird nur, was sich eindeutig entscheiden lässt.

Dass das nötig bleibt, hat v1.5.0 gezeigt – der liegen gebliebene Auslöseblitz
war für jede Zusicherung unsichtbar und fiel erst auf einem Bild mit
Verzögerung auf.
