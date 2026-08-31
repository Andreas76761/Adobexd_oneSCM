# Versionsverlauf

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionsnummern nach [Semantic Versioning](https://semver.org/lang/de/).

## Versionierungsregeln

Es werden zwei Nummern getrennt geführt:

| Nummer | Ort | Bedeutung |
| --- | --- | --- |
| Anwendungsversion | `package.json` → `version` | Funktionsumfang der Seite. Sie steht im Seitenfuß und wird im Build geprüft. |
| Datenversion | `data/eintraege.json` → `version` | Aufbau des Datenbestands. Sie steigt, wenn sich Felder oder Vokabular ändern, nicht bei neuen Belegen. |

* **Major** – Feld entfällt oder ändert seine Bedeutung; gespeicherte Adressen (`#q=…`) verlieren ihre Gültigkeit.
* **Minor** – neue Funktion oder neues optionales Feld, alles Bisherige bleibt gültig.
* **Patch** – Fehlerbehebung, Textkorrektur, neue Belege im Bestand.

Jede Funktion trägt im [Feature-Katalog](features/FEATURES.md) eine Kennung
(`F-01` …) und die Version, seit der es sie gibt. Wird eine Funktion geändert,
bleibt die Kennung bestehen und die Zeile „geändert in“ wird ergänzt.

## [1.8.0] – Aufnahmen im Archiv sichtbar

### Neu
* Band **Eigene Aufnahmen** im Archiv: die letzten zwölf Aufnahmen aus dem
  Eingang mit Vorschau, Zahl und einem Satz, warum sie nicht im Belegbestand
  stehen. Ein Klick führt in den Eingang. (F-27)
* Band **Im Ordner ⟨Name⟩** im Archiv: der tatsächliche Inhalt des in der
  Ansicht Ausschneiden gewählten Ordners, aus dem Dateisystem gelesen,
  neueste zuerst, mit „Neu lesen“. (F-27)
* Der Ordnerzugriff wird in der Browserdatenbank gemerkt und beim nächsten
  Öffnen zurückgeholt, sofern die Schreiberlaubnis noch besteht.

### Behoben
* Der Ordnername stand in Versalien, weil er in einer Abschnittsüberschrift
  sitzt – ein Name behält seine Schreibweise.

### Prüfung
* 178 Prüfungen, alle bestanden. Der Ordner-Nachbau listet jetzt auch auf,
  sodass das Lesen aus dem Dateisystem mitgeprüft ist.

## [1.7.0] – Ausschneiden

### Neu
* Vierter Eintrag in der Portalnavigation: **Ausschneiden**. Bildschirm
  freigeben, Bereich aufziehen, beim Loslassen ist der Schnipsel gemacht und
  abgelegt; die Freigabe bleibt für den nächsten Zug bestehen (F-26)
* Ablage vorher festlegen: Eingang, Ordner auf dem Rechner, einzelne Datei –
  einzeln oder gemeinsam. Ohne Ziel bleibt der Start gesperrt.
* Namensmuster mit Bausteinen und lebendem Beispiel; Namen werden entschärft
* Eingang bekommt JPEG, Ordner und Datei bekommen PNG

### Behoben
* Die Bühne wurde höher als das Fenster – die Ablage rutschte beim Ziehen aus
  dem Blick; die Leinwand ist jetzt in der Höhe begrenzt
* Die Maßangabe im Rahmen war durch eine geerbte Zeilenhöhe von 0 zerdrückt
* Der Fokus auf die Bühne scrollte die Einstellungen weg (`preventScroll`)

### Prüfung
* 174 Prüfungen, alle bestanden. Ordnerwahl und Schreibzugriff werden
  nachgebildet, sodass der ganze Weg bis in die Datei geprüft ist.

## [1.6.0] – Bilderstapel

### Neu
* Mehrere Bilddateien lassen sich zugleich öffnen oder ablegen. Die Leiste über
  der Bühne zeigt Stand und Dateinamen, *Zurück* / *Weiter* gehen durch den
  Stapel; jedes Bild kann einzeln zugeschnitten und aufgenommen werden (F-25)
* Ein aus einer anderen Seite gezogener Verweis wird erkannt und erklärt, statt
  wirkungslos zu bleiben (F-17)

### Behoben
* Die Stilregeln des Bilderstapels waren durch eine Ersetzung ohne Begrenzung
  dreifach eingefügt; die letzte Kopie hob die Korrektur der ersten auf. Eine
  neue Build-Prüfung lässt doppelt gesetzte Selektoren nicht mehr durch.
* „Bild 2 von 4“ stand in Versalien – ein Wert, keine Beschriftung.

### Prüfung
* 153 Prüfungen, alle bestanden

## [1.5.0] – Kompakter Aufnahmemodus

### Neu
* Kompakter Aufnahmemodus: bei freigegebenem Bildschirm zieht sich die App auf
  eine schmale Leiste rechts zusammen, die Live-Ansicht bekommt den Rest.
  Ausschnitt und Metadaten bleiben stehen, die Leertaste löst in Serie aus.
  Ein- und ausschaltbar über den Schalter, `Esc` oder das Ende der Freigabe (F-24)
* Die Leiste zeigt die zuletzt aufgenommene Aufnahme mit Kennung und Zähler

### Behoben
* Der Auslöseblitz blieb nach der Animation als deckend weiße Fläche über der
  Bühne liegen und verdeckte die Live-Ansicht (Ruhewert der Deckung fehlte)
* Undurchsichtige Kennungen des Datenstroms wurden als Quellenname angezeigt

### Prüfung
* 147 Prüfungen, alle bestanden. Der Live-Pfad wird erstmals vollständig
  geprüft: ein Leinwand-Datenstrom vertritt die Bildschirmfreigabe, sodass
  Video, Ausschnitt, Serienauslösung und das Ende der Freigabe echt durchlaufen.
* Nachgereicht: das Ziehen des Ausschnitts mit der Maus im Kompaktmodus
  (aufziehen, verschieben, Ecke fassen, Begrenzung auf die Quelle). Das
  Verhalten war bereits richtig, war aber nicht abgesichert.

## [1.4.0] – Bereit zum Einfügen, ehrliche Fehlermeldungen

### Neu
* Sichtbarer Bereitschaftszustand der Bühne: Marke „Bereit zum Einfügen“, die
  Systemtaste und der Hinweis, dass die Tastenkombination in der Seite ankommen
  muss. Erscheint bei gesperrter Freigabe und auf „Aus Zwischenablage“ (F-17)

### Behoben
* Ein **gesperrter** Browserspeicher wurde als **voller** Speicher gemeldet und
  die gelungene Aufnahme verworfen. Jetzt bleibt sie für die Sitzung erhalten,
  und die Meldung nennt die tatsächliche Einschränkung (F-20)
* Ein verweigertes Ausschneiden warf dem Betrachter die Fehlermeldung des
  Browsers vor die Füße; jetzt steht dort der Weg, der funktioniert (F-20)
* Die Meldung „Zuerst eine Quelle wählen“ nannte die Zwischenablage nicht

### Prüfung
* 136 Prüfungen, alle bestanden. Neu: voller Speicher, gesperrter Speicher und
  verweigertes Ausschneiden werden im Browser nachgestellt.

## [1.3.0] – Bildschirmfoto aus der Zwischenablage

### Neu
* Vierte Quelle im Aufnahmestudio: eingefügte Bildschirmfotos (`Strg+V` / `Cmd+V`)
  und die Schaltfläche „Aus Zwischenablage“ (F-17)

### Geändert
* Die Bildschirmfreigabe unterscheidet jetzt zwischen einer Sperre durch die
  Richtlinie der Ansicht und einem Abbruch durch die Person; beide Meldungen
  nennen die Tastenkürzel des jeweiligen Systems und die Auswege.
* Der leere Bühnentext erklärt den Weg über das Bildschirmfoto.

### Behoben
* Ein Klick auf „Aus Zwischenablage“ blieb ohne Rückmeldung, wenn der Browser
  die Erlaubnisfrage zum Lesen der Zwischenablage nie beantwortet. Der Hinweis
  erscheint jetzt sofort, das Lesen läuft mit Zeitgrenze im Hintergrund.

### Prüfung
* 132 Prüfungen, alle bestanden. Der Browsertest löst ein echtes
  Einfüge-Ereignis mit einem erzeugten PNG aus und stellt die gesperrte
  Richtlinie nach.

## [1.2.0] – Kontaktbogen

### Neu
* Der Eingang lässt sich als Kontaktbogen sichern: eine in sich geschlossene
  HTML-Datei mit allen Bildern, allen Metadaten, Druckregeln für den Weg ins
  PDF und ohne jeden externen Verweis (F-23)

### Geändert
* Gesichert wird die **sichtbare Auswahl** – gefiltert und sortiert wie am
  Bildschirm. Das gilt nun auch für „Als JSON sichern“, das zuvor immer den
  ganzen Eingang ausgab.
* Jeder Ausgang der Ablagefähigkeit wird benannt: bestätigt, abgebrochen,
  Abfrage offen, zu groß, Format nicht erlaubt, gar nicht möglich. Ein
  abgelehntes Format stößt keinen stillen Ersatzweg mehr an.

### Prüfung
* 126 Prüfungen, alle bestanden. Zwei Build-Prüfungen wurden geschärft: sie
  betrachten jetzt nur noch das Markup der Seite, weil im Skriptbereich
  bewusst `<!doctype` und `<img` als Text stehen – der Kontaktbogen wird dort
  erzeugt.

## [1.1.0] – Aufnahme und Eingang

### Neu
* Portalnavigation oben links: Archiv, Aufnahme, Eingang (F-16)
* Aufnahmestudio mit drei Quellen – Bildschirmfreigabe, Bilddatei, Beispielquelle (F-17)
* Wahl des Bildschirmausschnitts: aufziehen, an den Ecken fassen, Vorgabeformate, Pfeiltasten (F-18)
* Metadaten und Datum für die nächste Aufnahme, mit Titelvorschlag bei leerem Feld (F-19)
* Auslösen mit der Leertaste – nie, während in einem Feld getippt wird (F-20)
* Eingang: Vorschau, Suche, Filter nach Vollständigkeit, vier Sortierungen, nachträgliches
  Ergänzen von Kategorie, Begriffen und übrigen Angaben, Löschen (F-21)
* Eingang als JSON sichern, mit Ersatzweg ohne Ablagefähigkeit (F-22)

### Geändert
* `app/src/ui.js` und `app/src/aufnahme.js` werden vom Build in **eine** Klammer
  geschrieben; der Start liegt in `starte()` am Ende von `aufnahme.js`.
* Der Zustand der Adresszeile führt zusätzlich die Ansicht (`ans=`).

### Behoben
* `el()` setzte `value` auch bei `<textarea>` als Attribut – das Feld blieb leer.
  Gefunden von der Prüfung „Sichern bietet ohne Ablagefähigkeit einen Ersatzweg“.
* Deckte die Auswahl die ganze Quelle, ließ sich kein neuer Ausschnitt aufziehen,
  weil jeder Zug als Verschieben galt.

### Prüfung
* 111 Prüfungen in sieben Dateien, alle bestanden

## [1.0.0] – 2025-06-30

### Neu
* Belegraster als Kontaktbogen mit geteilter Vorher/Nachher-Vorschau (F-01)
* Volltextsuche über Titel, Projekt, Begründung, Schlagworte und Kennung (F-02)
* Facettenfilter für Projekt, Kategorie, Status und Aufnahmeformat mit mitlaufenden Zählern (F-03)
* Archivumschalter „Aktiv / Archiv / Alle“ samt Archivbegründung im Beleg (F-04)
* Vier Sortierungen, darunter „Stärkste Wirkung“ (F-05)
* Detailansicht mit drei Vergleichsarten: Schieberegler, Nebeneinander, Umschalten (F-06)
* Begründungspanel mit Anlass, Änderung, Wirkung und Quelle (F-07)
* Kennzahlenvergleich mit gerichteter Wirkungsberechnung (F-08)
* Kennzahlenleiste über der Trefferliste (F-09)
* Zustand in der Adresszeile, Verweis auf einzelne Belege (F-10)
* Tastaturbedienung: `/`, `←`/`→`, `Esc` (F-11)
* Helles und dunkles Thema, beide eigenständig gesetzt (F-12)
* Reaktionsfähiges Layout mit einklappbarer Filterleiste auf dem Telefon (F-13)
* Aufnahmen vollständig eingebettet, keine externen Abrufe außer Schriften (F-14)
* Gemerkte Vergleichsart je Betrachter (F-15)

### Daten
* Beispielbestand mit 20 Belegen, 40 Aufnahmen, vier Projekten, Zeitraum 04/2024 – 06/2025
* JSON-Schema `data/schema/eintraege.schema.json` (Datenversion 1.0.0)

### Prüfung
* 64 Prüfungen in vier Stufen: Daten, Kernlogik, Aufnahmen, Build, Oberfläche im Browser
