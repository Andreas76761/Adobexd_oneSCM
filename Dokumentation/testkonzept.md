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
| `04-build.test.mjs` | `dist/index.html`: Aktualität, Titel, Gerüst, externe Quellen, Größe, Farbtoken, doppelte Selektoren | 14 |
| `05-oberflaeche.e2e.mjs` | die Seite im Browser: Suchen, Filtern, Archiv, Detail, Tastatur, Adresszeile, Themen, Überlauf | 16 |
| `06-aufnahme-kern.test.mjs` | Kernlogik von Aufnahme, Eingang, Ablage, Beipackzettel, Übernahme, Nachpflege, Ordnersuche, Belegentwurf, PNG-Metadaten, Fähigkeiten, Marken, Fassungen, Gliederung, Labels, Strecken, Designvorlagen, Archive, Suchchat, Agenten, Designstudio, Verzeichnis, Varianten, Handbuch, Labels am Entwurf, Zählung, Suchtext, Projekte nach Version und Land, Arbeitsmenge, Projektvergleich, PDF, ZIP mit Word und PowerPoint, Ausgabeplan, Lupe, OCR, Bildvergleich, Agent Sprache, Word-Handbuch, Hausmarke, Projektdatei, Fortschritt, Rückweg aus Word, Sprache der Unterlagen, Hausmarke als Datei, Suche über die Lesungen, Stapel beim Import, Video und Kontaktbogen | 188 |
| `07-aufnahme.e2e.mjs` | Aufnahmemodus im Browser: Navigation, Quellen, Bilderstapel, Zwischenablage, Live-Freigabe, Navigation in fünf Aufgaben, Übersicht „Weitergeben“, Kompaktmodus, Ausschnitt mit der Maus, Auslösen, Fehlerwege, Eingang, Nachpflege, Labels am Entwurf, Kontaktbogen, Werkbank, Bild mit Zettel | 70 |

| `08-ausschneiden.e2e.mjs` | Schnipsel-Modus im Browser: Ablageziele, Namensmuster, Freigabe, Aufziehen, Ordner, Datei, Beipackzettel, Beenden, Sichtbarkeit im Archiv, Zettel im Ordnerband, Übernahme, Nachpflege, verwaiste Zettel, Tastatur, Filter, Metadaten im Bild, „Was hier geht“ | 34 |

| `09-markieren.e2e.mjs` | Editor im Browser: unkenntlich machen, Rückgängig, Auflösung, Rahmen, Klickstrecke, Fassungen, Gliederung, Stellenwahl, Zeichen je Label, Speicher und Vorschauen, Direkteinstieg | 18 |

| `10-strecke.e2e.mjs` | Strecke im Browser: Folge anlegen, Reihenfolge, Blatt als Bild, Beständigkeit, parallele Bilder, Platzhalter, Prozess als BPMN und als Bild | 9 |

| `11-gliederung.e2e.mjs` | Gliederung im Browser: Baum, Suche, Zählung je Stelle, Zuordnung, Labels, Teilschritte, Fortschrittsblatt, Rückweg aus Word | 10 |

| `12-design.e2e.mjs` | Designstudio im Browser: Vorlagen, Format, Texte, Ausgabe, Deckblatt, Kopf- und Fußzeile, eigene Vorlagen, PDF in A4 und 300 dpi, ganzes Handbuch als HTML und als Word, Hausmarke mit Farbe und Logo, englische Unterlagen, Hausmarke als Datei | 16 |

| `13-import.e2e.mjs` | Import im Browser: PNG, Präsentation je Folie, Word, altes Format, PDF ohne Bilder, Übernahme in den Eingang, Lupe, Stellenwahl, Stapel mit fortlaufenden Stellen, Stellen aus dem Folientext und gemeinsamen Labels | 13 |

| `14-chat.e2e.mjs` | Suchchat im Browser: Fenster über jeder Ansicht, Deutung der Frage, Treffer, Weg in Editor und Strecke, Ziehen und Lage | 6 |

| `15-pruefung.e2e.mjs` | Prüfung im Browser: vier Agenten, Kennzahlen, Befunde mit Weg, Bericht, Kommentar von Claude, Projektvergleich zweier Fassungen als Tabelle und als Text, Bildvergleich zweier Aufnahmen, Agent Sprache mit eigener Wortliste | 11 |

| `16-verzeichnis.e2e.mjs` | Verzeichnis im Browser: Plan vor der Datei, Muster, Schalter, Schreiben mit Unterordnern, Bericht, Projektdatei im vollen Umlauf | 8 |

| `17-varianten.e2e.mjs` | Varianten im Browser: verbinden und lösen, Deckungsmatrix, Ausgabe in einer anderen Sprache | 5 |

| `18-begehung.e2e.mjs` | Begehung: jeder sichtbare Befehl in **jeder der vierzehn** Ansichten (seit 1.51.0 auch Output und OCR, seit 1.55.0 Video), die zerstörenden Befehle, die Tastatur | 4 |

| `22-video.e2e.mjs` | Video im Browser: Grenze und Formate benannt, Video öffnen, Nichtvideo abweisen, automatisch abtasten, Bild von Hand, Stellen und Labels, Übernahme in den Eingang, Verwerfen. Das Prüfvideo entsteht in der Seite selbst (`captureStream` + `MediaRecorder`) – keine Beispieldatei im Repo | 8 |

| `21-ocr.e2e.mjs` | OCR im Browser: Bilder wählen, Lesen über Claude (nachgebildet), Kacheln, Text ändern, in die Notiz übernehmen, Textdatei und Word-Datei, fehlende Bilderlaubnis, Suche über die Lesungen | 6 |

| `20-output.e2e.mjs` | Output im Browser: Inhalte nach Kapiteln, ein Dokument je Variante, Vorschau mit Kapitel und Labels, Sicherung als PDF, Word und PowerPoint, Ablage im Verzeichnis, die Lupe | 7 |

| `19-projekte.e2e.mjs` | Projekte im Browser: anlegen, wählen, zählen, löschen, Vorschläge aus dem Bestand, Version und Land am Bild und im Eingangsdialog, die Arbeitsmenge in Eingang, Gliederung, Verzeichnis und Editor | 12 |

Summe: **493 Prüfungen**.

## Eigene Helfer

* `hilfen/dateien.mjs` – baut echte Testdateien: PNG (mit eigener CRC32),
  ZIP mit Deflate, daraus PPTX und DOCX, dazu eine PDF mit und ohne
  eingebetteten JPEG-Block. So liegt keine Beispieldatei im Repo.
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

Das Aussehen selbst. Dafür gibt es `npm run schuss`: das Skript legt
Bildschirmaufnahmen der fertigen Seite ab – Liste, Detailansicht, Telefon,
Aufnahmestudio, Kompaktmodus, Ausschneiden, Eingang, Nachpflege, Werkbank,
Editor, Strecke, Gliederung, Designstudio, Import, Prüfung, Verzeichnis,
Suchchat, Deckungsmatrix und Handbuch, die wichtigsten hell und dunkel –
sowie einen echten Kontaktbogen und ein echtes Handbuch samt Bild davon. Zum Ansehen, nicht zum automatischen
Vergleichen: Automatisiert wird nur, was sich eindeutig entscheiden lässt.

Dass auch das nötig bleibt, hat 1.31.0 gezeigt: Prüfung und Verzeichnis
standen hinter dem Seitenfuß und damit ohne Rand – jede Zusicherung war grün,
das Bild zeigte es sofort. Ebenso das Wort „null" in einer Importkarte.

Dass das nötig bleibt, hat v1.5.0 gezeigt – der liegen gebliebene Auslöseblitz
war für jede Zusicherung unsichtbar und fiel erst auf einem Bild mit
Verzögerung auf.
