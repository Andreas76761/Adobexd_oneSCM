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

## [1.23.0] – Designstudio: aus Bildern wird ein Blatt

### Neu
* Neue Ansicht **Design** mit vier Vorlagen (F-38): **Quick Guide** (A4 quer,
  bis 6 Bilder), **One Pager** (A4 hoch, 4), **Releaseletter** (2 je Seite mit
  Fließtext), **Handbuchseite** (3 je Seite, Text in der Spalte daneben)
* Als Inhalt dient eine **Strecke** oder **jede Stelle der Gliederung** mit
  Bildern; die Bilder kommen in voller Auflösung, gerechnet wird auf A4 bei
  **300 dpi**
* **Texte aus dem Handbuch** zuschaltbar: Thema und Abschlusskriterium der
  Stelle unter der Anweisung. Ohne sie steht nur die Anweisung da
* **Labels** zuschaltbar: Gliederungsnummer, Sprache, Rolle, Sparte, Markt
  unter jedem Bild
* Ausgabe als **PNG je Seite** oder als **eine HTML-Datei zum Drucken** –
  daraus macht der Browser das PDF

### Kern
* `FORMATE`, `VORLAGEN`, `seitenAufteilung`, `schrittText`, `kuerzeText`,
  `seitenName` – die Seitenrechnung läuft ohne DOM und ist damit prüfbar

### Prüfung
* Neue Datei `12-design.e2e.mjs`; 12 neue Prüfungen, zusammen 287

## [1.22.0] – Labels und Teilschritte

### Neu
* **Labels je Bild** (F-37): Sprache (21 zur Wahl), Rolle (Dealer, Market, HQ,
  MO), Sparte (Pkw, Van) aus fester Auswahl; Markt, Domäne, Reiter und
  Schritt als Text mit Vorschlägen aus dem, was schon verwendet wurde
* **Labels im Bild**: „Labels ins Bild setzen“ legt für jedes gesetzte Label
  eine Marke an – verschiebbar wie jede Marke, einzeln oder gesammelt wieder
  zu entfernen. Die Angaben bleiben dabei an der Aufnahme
* **Marken lassen sich verschieben**: ziehen statt entfernen und neu aufziehen
  (die Grenze aus 1.17.0 ist damit weg)
* **Teilschritte** rechts neben der Gliederung (F-37): welche Sprachen,
  Rollen, Sparten, Märkte, Domänen, Reiter und Schritte an einer Stelle
  liegen – jeweils mit Zahl, mit eigenem Symbol
* **Beschreibung je Stelle**: Abschlusskriterium, Nachweis und Quelle aus der
  Arbeitsmappe, unter den Teilschritten (F-36)
* Eigener Symbolvorrat als Inline-SVG – keine externen Bilder

### Geändert
* `data/gliederung/gliederung.json` trägt die Beschreibungen; gleiche Texte
  stehen einmal in einer Tabelle, die Einträge verweisen darauf

### Prüfung
* 9 neue Prüfungen, zusammen 275

## [1.21.0] – Die Gliederung des Handbuchs

### Neu
* Die Gliederung aus `Gliederung_oneSCM12102026.xlsx` liegt in der Seite:
  **1153 Stellen** – 23 Kapitel, 204 Unterkapitel, 919 Stellen auf der
  dritten Ebene, dazu neun Anhänge und sieben Übergänge (F-36)
* Neue Ansicht **Gliederung**: der Baum mit der Zahl der Bilder je Stelle –
  eigene und die der Unterkapitel (`0 (3)`), dazu Kennzahlen, Suche über
  Nummer und Thema und ein Filter „mit / ohne Bilder“
* Im Editor ersetzt ein Feld **Stelle im Handbuch** die beiden Zahlen: tippen,
  aus bis zu 60 Vorschlägen wählen; das Thema steht darunter, eine unbekannte
  Nummer wird beanstandet
* „Bilder zeigen“ an einer Stelle führt in den Eingang, gefiltert auf diese
  Nummer

### Geändert
* `kapitelKennung` nimmt zuerst die Stelle im Handbuch; die beiden Zahlen aus
  1.18.0 gelten weiter, wo keine Stelle gesetzt ist
* Die Portalnavigation trägt sieben Einträge und darf die ganze Breite nehmen

### Daten
* `data/gliederung/gliederung.json` (82 kB) wird in den Build eingebettet

### Prüfung
* Neue Datei `11-gliederung.e2e.mjs`; 5 neue Prüfungen, zusammen 266

## [1.20.0] – Volle Auflösung und Rückgängig

### Neu
* **Rückgängig und Wiederholen** im Editor: `Strg+Z` und
  `Strg+Umschalt+Z`, dazu zwei Knöpfe. Jede Marke – auch eine abgedeckte
  Stelle – lässt sich zurücknehmen (F-31)
* Die abgelegte Fassung heißt nach dem, was mit ihr geschah:
  `…_blurrt_2.png`, wenn etwas abgedeckt wurde, sonst `…_markiert_2.png`
  (F-33)

### Geändert
* **Volle Auflösung**: Aufnahmen werden nicht mehr auf 1100 Bildpunkte
  heruntergerechnet, sondern verlustfrei in der Auflösung der Quelle
  abgelegt – beim Hineinzoomen bleibt die Schrift lesbar
* Die Bilder liegen in der Browserdatenbank (`screenarchiv`, Speicher
  `bilder`), im `localStorage` steht nur eine Vorschau mit 760 Bildpunkten.
  Der Speicher fasst rund fünf Megabyte, die Datenbank ein Vielfaches
* Der Editor lädt und rechnet auf dem vollen Bild; die Meldung nennt die
  Auflösung

### Behoben
* Das nebenherlaufende Ablegen des vollen Bildes ersetzte die Aufnahme im
  Eingang und löschte dabei die Herkunft, die das Ausschneiden gerade
  angehängt hatte

### Prüfung
* 3 neue Prüfungen, zusammen 261

## [1.19.0] – Strecke: mehrere Screens, ein Blatt

### Neu
* Neue Ansicht **Strecke**: mehrere Aufnahmen als Folge ablegen, jede mit
  ihrer Anweisung und ihrer Stelle in der Reihenfolge. Verschieben mit ↑ ↓,
  entfernen, umbenennen; mehrere Strecken nebeneinander (F-35)
* **Blatt als Bild sichern**: alle Schritte in einem Bild – Kopfzeile mit
  Name und Datum, je Kachel Nummernkreis, Anweisung und die Bildunterschrift
  mit Gliederung und Zeitstempel. Aufteilung wahlweise ein-, zwei- oder
  dreispaltig (F-35)
* Gezeigt wird immer die **jüngste Fassung** einer Aufnahme – also mit
  abgedeckten Stellen und Marken, nicht das Original
* Die Vorschau im Panel zeigt dasselbe Blatt und läuft beim Tippen mit
* Strecken liegen im Browser (`screenarchiv:strecken`) und überleben das
  Neuladen; eine gelöschte Strecke lässt die Aufnahmen unberührt

### Kern
* `leereStrecke`, `streckeSchritt`, `verschiebeSchritt`, `streckeMitAufnahmen`,
  `pruefeStrecke`, `streckeAlsText`, `blattRaster`, `leseStrecken`,
  `schreibeStrecken`

### Prüfung
* Neue Datei `10-strecke.e2e.mjs`; 11 neue Prüfungen, zusammen 258

## [1.18.0] – Editor, Fassungen, Gliederung

### Neu
* Der Editor ist von überall erreichbar: **Im Editor öffnen** an der zuletzt
  gemachten Aufnahme, **Im Editor bearbeiten** auf jeder Karte im Eingang.
  Die Portalnavigation heißt dort jetzt **Editor** (F-33)
* **Fassungen statt einer Kopie**: jedes Sichern legt eine weitere Fassung
  neben das Original – mit Nummer, Zeitpunkt und den Marken, aus denen sie
  entstand. Jede lässt sich wieder öffnen, weiterbearbeiten oder verwerfen
  (F-33)
* **Gliederung und Zeitstempel** (F-34): jedes Bild bekommt Kapitel und
  Unterkapitel (2.3) und einen Zeitstempel. Beides wird als Streifen unter
  das Bild gebrannt – abschaltbar – und steht auf der Karte im Eingang, im
  Kontaktbogen und über `{kapitel}` im Namensmuster

### Geändert
* Eingangskarte und Kontaktbogen zeigen die jüngste Fassung und nennen sie
  („Fassung 2 – 1 Stelle abgedeckt“)
* Eine Aufnahme aus älterem Stand (`bild_markiert`) wird als Fassung 1
  gelesen; es geht nichts verloren

### Kern
* `leseFassungen`, `neuesteFassung`, `baueFassung`, `naechsteFassungsnummer`,
  `anzeigeBild`, `kapitelKennung`, `naechsteUnterkapitelnummer`,
  `sortiereNachKapitel`, `formatiereZeitpunkt`, `bildunterschrift`

### Prüfung
* 7 neue Prüfungen, zusammen 247

## [1.17.0] – Markieren: unkenntlich machen und erklären

### Neu
* Neue Ansicht **Markieren** in der Portalnavigation: eine Aufnahme aus dem
  Eingang wählen, Rechtecke aufziehen, Marken setzen
* **Unkenntlich machen** (F-31): personenbezogene Stellen – Benutzerkennung,
  FIN, Adresse, Name – werden auf ein Raster heruntergerechnet und wieder
  vergrößert. Was dabei verloren geht, ist weg; drei Stärken zur Wahl
* **Rahmen und Klickstrecke** (F-32): Bedienflächen mit Rand hervorheben, mit
  Beschriftung versehen und als nummerierte Schritte zu einer Klickstrecke
  verketten. Die Strecke steht daneben als Text
* Das **Original bleibt unangetastet**: die Marken liegen als Angaben neben
  der Aufnahme, die bearbeitete Fassung entsteht daraus als Kopie und lässt
  sich jederzeit ändern oder verwerfen
* Eingangskarte und Kontaktbogen zeigen die bearbeitete Fassung, wenn es eine
  gibt – und sagen, dass es eine ist
* „Als Datei sichern“ legt die Fassung als `…-markiert.png` ab, mit
  Beipackzettel in der Datei

### Geändert
* Beipackzettel auf **Version 2**: zwei neue Felder, `unkenntlich_gemacht` und
  `marken`. Ein Eingriff ins Bild soll in den Metadaten stehen
* Der Start der Seite (`starte()`) steht jetzt am Ende von `markieren.js`

### Kern
* `MARKEN_ARTEN`, `UNKENNTLICH_STUFEN`, `leereMarke`, `begrenzeMarke`,
  `nummeriereSchritte`, `markenZusammenfassung`, `pruefeMarken`,
  `klickstreckeAlsText`, `markenAlsAblage`, `leseMarken`, `rasterZuStufe`,
  `markiertName`

### Prüfung
* Neue Datei `09-markieren.e2e.mjs`; 15 neue Prüfungen, zusammen 240

## [1.16.0] – Was hier geht

### Neu
* In der Ansicht Ausschneiden steht ausklappbar **Was hier geht**: sechs
  Zeilen, jede gemessen statt vermutet – Ordner, Einzeldatei,
  Bildschirmfreigabe, Zwischenablage, Speicher, Netzablage. Zu jeder fehlenden
  steht der Weg, der statt dessen geht (F-30)
* Die Kurzfassung in der Kopfzeile nennt, wie viele Wege hier fehlen
* Auf Telefon und Tablet nennt die Zeile zur Bildschirmfreigabe den dort
  gangbaren Weg statt der Hülle

### Dokumentation
* `Dokumentation/grenzen.md`: was die Seite nicht kann und warum – Netzablage,
  Browser, Gerät – und welcher Weg jeweils bleibt

## [1.15.0] – Metadaten im Bild

### Neu
* Die abgelegte PNG-Datei trägt den Beipackzettel jetzt **in sich**: ein
  `iTXt`-Abschnitt mit dem ganzen Zettel, dazu eine lesbare Zeile
  (`Description`) und die erzeugende Anwendung (`Software`) (F-26)
* Wird ein solches Bild in der Aufnahme geöffnet, kommen die Angaben in die
  **leeren** Felder zurück – ausgefüllte bleiben unberührt, und die Meldung
  nennt, was übernommen wurde
* Beides hängt am selben Kästchen wie der Zettel daneben

### Kern
* `legeTextInPng`, `liesTextAusPng`, `pngTexte`, `PNG_SCHLUESSEL`: eigener
  PNG-Abschnittsleser, UTF-8 über `iTXt`; die Bilddaten werden nicht neu
  kodiert, nur ein Abschnitt vor `IEND` eingeschoben

### Prüfung
* 8 neue Prüfungen, zusammen 222, alle bestanden

## [1.14.0] – Beleg bilden in der Seite

### Neu
* **Beleg bilden** im Eingang: zwei Aufnahmen als vorher und nachher paaren,
  Begründung in vier Feldern, Kennzahlen mit Richtung und laufend gerechneter
  Wirkung. Heraus kommt `belegentwurf-scr-JJJJ-NNN.json` (F-29)
* Die Werkbank prüft wie die Datenprüfung des Bestands: Vokabular,
  Mindestlänge der Begründung, mindestens eine vollständige Kennzahl,
  Reihenfolge der Aufnahmen, Wort „verworfen“ im Wirkungstext. Was fehlt,
  steht laufend unter dem Formular; gesichert wird erst, wenn nichts fehlt
* Was die Aufnahmen schon wissen – Projekt, Seite, Kategorie, Browser, Datum,
  Schlagworte – steht vorausgefüllt da

### Kern
* `leererBelegentwurf`, `pruefeBelegentwurf`, `metrikenAusEntwurf`,
  `baueBelegentwurf`, `naechsteBelegKennung`, `RICHTUNGEN`

### Dokumentation
* Der Skill `beleg-aufnehmen` beschreibt den Weg vom Belegentwurf in den
  Bestand – `eintrag` übernehmen, Kennung prüfen, `screen` setzen

## [1.13.0] – Das Ordnerband wird brauchbar

### Neu
* Ein Beipackzettel **ohne Bild** steht jetzt als eigene Kachel im Streifen
  (`{ }`, Marke „ohne Bild“) und lässt sich lesen – bisher wurde er nur gezählt
  (F-27)
* Filterfeld für Dateinamen und **Mehr zeigen**: das Band ist nicht mehr auf
  zwölf Bilder festgelegt, der Stand nennt „4 von 14 Bildern gefiltert“
* Das Archiv liest den Ordner beim Betreten neu – es behauptet, den
  tatsächlichen Inhalt zu zeigen

### Barrierefreiheit
* Die Zettelschau nimmt beim Öffnen den Fokus (`role="region"`), **Esc**
  schließt sie und gibt den Fokus an die Kachel zurück

### Behoben
* Ein spätes Neulesen schloss eine gerade geöffnete Zettelschau. Sie bleibt
  jetzt stehen und zeigt den frisch gelesenen Stand; nur eine verschwundene
  Datei schließt sie

### Kern
* `passtDateiname`: Teiltreffer im Dateinamen, Umlaute auf beiden Seiten
  aufgelöst – abgelegte Namen sind entschärft (`gruen-…`), getippt wird `grün`

### Prüfung
* 4 neue Prüfungen, zusammen 204, alle bestanden

## [1.12.0] – Nachpflegen bis in die Datei

### Neu
* Im Eingangsdialog steht bei jeder Aufnahme aus einer Ordnerdatei **Zettel
  ⟨name⟩ neu schreiben**: nachgetragene Kategorie, Begriffe, Notiz und Titel
  gehen damit zurück in die `.json` neben dem Bild (F-28)
* Ist der Ordner nicht geöffnet oder ein anderer, steht dort statt des Knopfes
  der Grund – mit dem Ordnernamen und dem Weg dorthin
* Jede in einen Ordner geschriebene Aufnahme merkt sich jetzt ihre Datei
  (`herkunft`), nicht nur die übernommenen. Damit ist überhaupt erst bekannt,
  welcher Zettel zu welcher Aufnahme gehört

### Kern
* `zettelZiel`: entscheidet ohne DOM, ob und wohin nachgeschrieben werden kann,
  und nennt bei einer Absage den Grund

### Prüfung
* 4 neue Prüfungen, zusammen 200, alle bestanden

## [1.11.0] – Übernahme aus dem Ordner

### Neu
* **In den Eingang übernehmen** in der Zettelschau: Bild und Beipackzettel aus
  dem Ordner werden wieder zu einer Aufnahme im Eingang. Die Ablage ist damit
  keine Einbahnstraße mehr (F-28)
* Jede übernommene Aufnahme trägt ihre Herkunft (Ordner, Datei, Zettel,
  Zeitpunkt); dieselbe Datei kommt kein zweites Mal herein. Die Kachel zeigt
  dann die Kennung, der Knopf führt in den Eingang
* Das Bild wird beim Übernehmen als JPEG neu gefasst – ein Ordner voller PNG
  sprengte den Browserspeicher

### Kern
* `aufnahmeAusZettel`, `findeUebernahme`, `herkunftSchluessel`: Metadaten
  kommen allein aus dem Zettel, Datum und Erfassungszeitpunkt aus der
  Aufnahme, nicht aus dem Tag der Übernahme

### Prüfung
* 5 neue Prüfungen, zusammen 196, alle bestanden

## [1.10.0] – Beipackzettel im Archiv

### Neu
* Im Archivband **Im Ordner** trägt jede Kachel, ob der Beipackzettel daneben
  liegt: Marke `Zettel` oder `kein Zettel`. Die Zuordnung läuft über den
  Dateinamen, also auch für Zettel aus früheren Sitzungen (F-27)
* Ein Klick auf eine Kachel mit Zettel öffnet die Schau darunter: alle 16
  Zeilen in der Folge der Datei, leere Felder als „—“, Ausschnitt und Quelle
  lesbar gefasst, dazu die Datei im Original zum Aufklappen (F-26)
* Der Stand neben dem Ordnernamen zählt die Zettel mit und nennt eine `.json`
  ohne Bild eigens

### Geändert
* Das Ordnerband liest jetzt auch `.json`-Dateien, legt sie aber keinem
  eigenen Platz im Streifen bei – sie gehören zu ihrem Bild

### Kern
* `leseBeipackzettel` und `BEIPACK_FELDER`: ein Zettel aus dem Dateisystem
  kann von Hand geändert sein; kaputtes JSON, eine höhere Zettelversion,
  fremde Felder und unbrauchbare Werte werden benannt statt verschluckt

### Prüfung
* 6 neue Prüfungen, zusammen 191, alle bestanden
* Sichtprüfung: `archiv-zettel.png` und `archiv-zettel-dunkel.png`

## [1.9.0] – Beipackzettel

### Neu
* Neben jedem in Ordner oder Datei abgelegten Bild entsteht eine gleichnamige
  `.json` mit allen Metadaten – Titel, Projekt, Seite, Kategorie, Status,
  Rolle, Begriffe, Notiz, Autor, Browser, Ausschnitt, Quelle und Zeitpunkt.
  Feste Feldfolge, auch bei leeren Werten (F-26)
* Kästchen zum Abschalten; es erscheint nur bei Ordner- oder Dateizielen und
  nennt die zweite Bestätigung beim Sichern als Einzeldatei

### Geändert
* Bisher trug eine abgelegte Datei nur, was ins Namensmuster passte

### Prüfung
* 185 Prüfungen, alle bestanden

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
