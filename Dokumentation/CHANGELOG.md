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

## [1.91.0] – Ein französischer Quick Guide mit deutschem Bild

### Behoben
* **Das Register Output verschwieg die Schritte ohne Entsprechung** (F-46, F-56).
  Eine Strecke in einer anderen Sprache tauscht je Schritt das Bild; wo
  keines vorliegt, bleibt das bisherige stehen. `streckeInVariante()` gibt
  diese Lücken zurück, das Designstudio nennt sie seit jeher – der Plan warf
  sie weg. Gerade Output rechnet den **ganzen Satz** auf einmal: wer zwanzig
  Quick Guides in fünf Sprachen erzeugt, erfuhr in keinem, welche gemischt
  sind. Neu: `ausgabeLuecken()`, jeder Auftrag trägt `luecken`
* Im Register stehen sie jetzt in der **Zeile** (Marke mit den betroffenen
  Schritten im Titel, Streifen in Warnfarbe) und in der **Meldung nach dem
  Erzeugen**, die dann als Warnung dasteht. Nur Strecken können lücken –
  ein Kapitel filtert nach dem Labelwert; das hält die Prüfung fest

### Prüfung
* **Ein Fehlschlag aus einem fremden Bereich, der keiner sein wollte.** Der
  volle Durchlauf meldete einmal „Suchbegriff fehlt in der Adresse"; einzeln
  bestand die Prüfung zweimal. Es war ein echtes Wettrennen: die Suche
  schreibt die Adresse gedrosselt, der Klick auf das Segment sofort, und die
  Prüfung wartete nur auf das zweite. Gewartet wird jetzt auf beides
* 1 neue Kernprüfung und 1 neue Browserprüfung, letztere gegengeprüft.
  Zusammen 570

## [1.90.0] – Die fremde Lesung auf dem eigenen Bild

### Behoben
* **Die Lesungen des Registers OCR wurden beim Einlesen nicht umbenannt**
  (F-63, F-74). Kollidiert eine Kennung, wird die fremde Aufnahme umbenannt
  und die Strecken werden umgeschrieben – die Lesungen blieben auf der alten
  Kennung liegen. Das ist nicht „verloren", sondern schlechter: der **fremde
  Text landet auf dem eigenen Bild**, und das Bild, zu dem er gehört, steht
  ohne da. Gelesener Text geht von dort in die Suche, in den Agenten und auf
  Knopfdruck in die Notiz – und von dort ins Handbuch. Neu:
  `ocrMitNeuenKennungen()`

### Prüfung
* `PAKET_INHALT` sagt jetzt mit `kennungen: true`, welcher Speicher auf
  Aufnahmen zeigt; der Build hält die Liste gegen `ablage.js` – zu jedem
  solchen Feld muss dort `<feld>MitNeuenKennungen(` stehen. Gegengeprüft
* Die übrigen sieben mitreisenden Speicher wurden durchgesehen: keiner zeigt
  auf Aufnahmen
* Zwei bestehende Prüfungen geschärft statt zweier neuer daneben; die
  Kernprüfung prüft jetzt auch die Umkehrung, dass **jede Lesung nach dem
  Zusammenführen eine Aufnahme trifft**. Zusammen weiterhin 568

## [1.89.0] – „Ohne Bilder", mit Bildern

### Behoben
* **„Als JSON sichern" sagte „nur die Metadaten, ohne Bilder" und legte die
  Vorschauen ab** (F-22). Zehn Aufnahmen wiegen so 363 kB statt 1 kB; in
  derselben Meldung stand „ohne Bilder" direkt neben „gesichert (38 kB)".
  Der Aufruf war irgendwann auf `true` umgestellt worden, Meldung, Kommentar
  und die Tafel „Vier Wege" blieben beim alten Stand. Wer gesagt bekommt,
  dass keine Bilder in der Datei sind, gibt sie anders weiter als jemand,
  der weiß, dass jede aufgenommene Maske darin zu sehen ist
* Die Datei bleibt, wie sie ist – sie ist die einzige Sicherung, die eine
  einzelne Datei ist. Richtiggestellt wird, was über sie gesagt wird; die
  Tafel nennt jetzt auch, dass sich das Format **nirgends einlesen** lässt

### Prüfung
* **Zwei Prüfungen sicherten den falschen Satz ab** – beide hielten die
  Meldung gegen eine abgeschriebene Zeichenkette (`includes('ohne Bilder')`)
  und waren grün, solange die Aussage falsch blieb. Sie halten sie jetzt
  gegen die **Datei**: trägt sie Vorschauen, darf keine Zeile „ohne Bilder"
  sagen
* **Der Ablage-Nachbau merkte sich nur den Dateinamen** – kein Test konnte
  je nachsehen, was in der Datei steht. Er nimmt jetzt den Inhalt mit. *Ein
  Nachbau, der enger ist als der Vertrag, verbirgt Code*, derselbe Satz wie
  in 1.68.0
* Gegengeprüft: mit dem alten Satz schlägt die Prüfung an. Zusammen 568

## [1.88.0] – Sieben von neun, eine Ebene tiefer

### Behoben
* **Der Beipackzettel trug sieben der neun Labelfelder nicht** (F-26, F-45). Er
  liegt neben jedem Bild und steht noch einmal als `tEXt`-Block **in** der
  PNG-Datei – er ist das, was ein Bild bei sich trägt, wenn es allein
  weitergereicht wird. Die zwei, die dastanden, standen nur dort, weil
  `version` und `land` zufällig auch eigene Felder des Zettels sind. Jetzt
  führt er sie in einem Satz `labels`, aus `LABEL_FELDER` gebildet statt von
  Hand aufgezählt; gelesen wird er als Klartextzeile
* **Zettelversion 3** – dieselbe Regel wie bei Fassung 2 (1.17.0, Marken).
  Ein Zettel der Fassung 2 bleibt lesbar, seine Labelzeile ist dann leer.
  `version` und `land` bleiben zusätzlich oben: dort standen sie, bevor es
  `labels` gab

### Prüfung
* **Drei Prüfungen hielten ihre eigene Abschrift** – die Feldfolge als
  Zeichenkettenliste, die Feldzahl als `21`, die leeren Felder als Liste.
  Keine hätte je gemeldet, dass sieben Labels fehlen; sie meldeten nur, dass
  ich etwas hinzugefügt habe. Jetzt abgeleitet: Folge und Zahl aus
  `BEIPACK_FELDER`, und bei den leeren Feldern wird aufgezählt, was
  **gefüllt** ist – das ist die kurze, stabile Seite
* 1 neue Kernprüfung mit denselben drei Richtungen wie bei der Galerie:
  jedes Labelfeld im Zettel, kein fremdes Feld beim Lesen, Klartext in der
  Anzeige. Dazu der Fall des alten Zettels. Zusammen 568

## [1.87.0] – Drei Labels, die den Ordner nie erreichten

### Behoben
* **Die Übersicht der Galerie ließ drei Labelfelder weg** (F-45). `domaene`,
  `reiter` und `schritt` fehlten in `index.json` **und** in `index.csv`; in
  der CSV zusätzlich `kategorie` und `notiz`, die die Übersicht sehr wohl
  führt. Es sind keine vergessenen Reste: der Editor baut aus `LABEL_FELDER`
  für jedes ein Eingabefeld. Wer sie ausfüllte, füllte ein Feld, das es bis
  in den Ordner nicht schaffte

### Prüfung
* **Die Prüfung hielt eine Liste gegen ihre eigene Abschrift.** Es gab eine
  grüne Prüfung „die Übersicht trägt Datei, Stelle und Labels"; sie verglich
  die Kopfzeile der CSV mit einer abgeschriebenen Zeichenkette und
  bestätigte damit nur, dass sich nichts geändert hat. Dasselbe Muster wie
  bei `PAKET_INHALT` (1.82.0) und den vier Listen der Ansichten (1.84.0)
* Neu: `GALERIE_SPALTEN` und `GALERIE_OHNE_SPALTE` (je mit Grund). Die
  Prüfung hält drei Richtungen gegeneinander – jedes Labelfeld in der
  Übersicht, jedes Feld der Übersicht in der Tabelle oder mit Grund draußen,
  keine Spalte ohne Füllung. Übrig bleibt `einfuhr`: ein Gebilde, keine Zelle
* 1 neue Kernprüfung, gegengeprüft; die Browserprüfung füllt die drei Felder
  jetzt im Editor aus, statt sie leer zu lassen. Zusammen 567

### Geändert
* Die Kopfzeile von `index.csv` trägt sieben Spalten mehr. Wer sie nach
  **Spaltennummer** liest, muss nachziehen; wer sie nach Namen liest, merkt
  nichts

## [1.86.0] – Das Blatt zur Durchsicht kannte die Labels nicht

### Behoben
* **Der Kontaktbogen trug kein einziges Labelfeld** (F-23). Er nannte
  Projekt, Status, Rolle und Browser – aber nicht Sprache, Rolle, Sparte,
  Markt, Domäne, Reiter, Schritt, Version und Land. Das sind genau die
  Felder, nach denen der Eingang gefiltert und die Ausgabe gerechnet wird;
  wer den Bogen zur Durchsicht in der Hand hielt, sah nicht, worüber er
  entscheiden soll. `labelListe()` gibt es im Kern seit langem – Editor,
  Lupe und Suche nutzen sie, der Kontaktbogen nicht
* **Vorgemerktes war auf dem Bogen nicht gekennzeichnet** (F-79). Dieselbe
  Frage wie in 1.83.0, an einer übersehenen Stelle: der Kontaktbogen ist
  eine Datei, die das Haus verlässt. Der betroffene Satz trägt jetzt eine
  Marke, oben steht „Nicht zur Weitergabe – 1 von 2 Aufnahmen hängt an einem
  vorgemerkten Abschnitt." Eigene Worte, nicht die des Handbuchs: ein
  Kontaktbogen ist keine „interne Fassung", sondern ein Blatt zur Durchsicht
* **Die Beugung folgte der falschen Zahl.** Das Substantiv folgt der
  Gesamtzahl, das Verb der betroffenen – geprüft für 1 von 1, 1 von 2 und
  2 von 3

### Gemessen, nicht geraten
* Drei Fehlalarme beim Messen, alle aus derselben Quelle: eine Wortsuche
  über ein ganzes HTML-Dokument findet den Stilblock und die Überschriften
  mit. Gemessen wird jetzt nur im Artikelteil, und die Prüfung tut es ebenso.
  Zwei weitere Verdächtige lösten sich auf: der kaputte Datumstitel war eine
  falsche Testeingabe (`formatiereDatum` bekommt überall nur `JJJJ-MM-TT`),
  und „unvollständig" stimmte – `istVollstaendig` verlangt eine Kategorie

### Prüfung
* 1 neue Kernprüfung und 1 neue Browserprüfung. Die Browserprüfung wurde
  gegengeprüft: ohne die Gliederung im Aufruf schlägt sie an. Zusammen 566

## [1.85.0] – Die Suche fand nur, was geliefert wurde

### Behoben
* **Eigene Texte waren unauffindbar** (F-65). `sucheGliederung()` durchsuchte
  nur Nummer und Thema. Jeder im Haus geschriebene Satz – der ganze Zweck
  des Rückwegs aus Word – war über kein Wort daraus zu finden; bei 1161
  Stellen heißt das: er ist weg, auch wenn er dasteht. Gesucht wird jetzt
  auch im **Text**, in allen drei Suchen (Gliederung, Editor, Eingang), und
  alle drei bekommen die gelebte Gliederung statt der gelieferten
* **Ein Filter, der zuklappt, filtert nicht.** Aufgeklappt wurde der Baum
  nur bei einer Suche, nicht bei einem Filter – „Mit Bildern“ zeigte eine
  Handvoll zugeklappter Kapitel, und die Treffer steckten darin

### Neu
* **Filter „Vorgemerkte“** neben „Alle · Mit Bildern · Ohne Bilder“ (F-79).
  Vorgemerktes trug seit 1.79.0 seine Marke im Baum, war aber nicht zu
  **finden**: die Wortsuche nach „Intern“ lieferte 12.7, 14.5.4 und 24 –
  zwei Kapitel, die das Wort zufällig führen, und von acht vorgemerkten
  Stellen genau eine. Der Stand und die Kennzahl „Kapitel“ nennen jetzt
  auch die Zahl; letztere ist die Brücke zum Fortschrittsblatt, das 23
  Kapitel und 1123 Stellen zählt

### Gemessen, nicht geraten
* `kriterium` und `notiz` bleiben aus dem Heuhaufen draußen: sie stehen an
  **jeder** Stelle und sind weitgehend gleichlautend. Mit `kriterium` fände
  „Freigabe“ 1150 statt 41 Stellen und „Scope“ 970 statt 33; mit `notiz`
  fände „Status“ 1025 statt 43. Eine Suche, die fast alles findet, findet
  nichts

### Prüfung
* 1 neue Kernprüfung und 1 neue Browserprüfung. Die bestehende Suchprüfung
  erwartet jetzt zwei Treffer statt einem: der Übergang T7-8 nennt das
  Signaturergebnis in seinem Text. Zusammen 564

## [1.84.0] – Ein Rückstand, den niemand aufholen soll

### Behoben
* **Das Fortschrittsblatt zählte die Kapitel 24 und 25 mit** (F-79). Es
  heißt „Stand des Handbuchs"; Vorgemerktes kommt nie ins Handbuch. Zwei
  Kapitel standen für immer bei null Prozent – ein Rückstand, den niemand
  aufholen kann und auch nicht aufholen soll. Statt 25 Kapitel und 1129
  Stellen jetzt 23 und 1123, mit dem Zusatz „6 vorgemerkte Stellen bleiben
  außen vor": weggelassen, aber nicht verschwiegen
* **Das Register Gliederung gab dem Blatt die gelieferte Gliederung** – die
  kennt nur die Vormerkung der Kapitel 24 und 25, nicht die von Hand
  gesetzten. Derselbe Fehler wie beim Baum (1.79.0) und beim Register
  Output (1.80.0), an einer dritten Stelle
* **Prüfung und Regelwerk trugen dasselbe Symbol** in der Navigation. Ein
  Symbol, das zwei Dinge meint, bezeichnet keines. Das Regelwerk hat jetzt
  seine Waage

### Prüfung
* **Vier Listen, eine Ansicht.** Eine Ansicht steht in `ANSICHTEN`
  (`core.mjs`), in `ABSCHNITTE` (`ui.js`), als Knopf in der Vorlage und in
  der Liste der Begehung. Beim Regelwerk fehlte 1.78.0 der Eintrag im Kern:
  der Knopf war da, der Abschnitt war da, und `#ans=regelwerk` öffnete
  nichts. Der Build hält die vier jetzt gegeneinander – dazu: keine zwei
  Ansichten auf demselben Abschnitt, kein Symbol zweimal
* 1 neue Buildprüfung und 1 neue Kernprüfung; das Fortschrittsblatt im
  Browser prüft jetzt auch seine Zahlen. Zusammen 562

## [1.83.0] – Eine interne Fassung, die es selbst sagt

### Neu
* **Jede interne Fassung trägt ihren Vermerk** (F-79). Der Inhalt stimmte
  schon; die *Datei* sagte nichts: gleicher Name, gleiches Deckblatt wie die
  freigegebene Unterlage, nur mit Kapitel 24 darin. Innerhalb der Seite
  warnt der Schalter, außerhalb warnte niemand. Jetzt steht der Vermerk
  über dem Titel (Handbuch HTML und Word, Deckblatt), in der Fußzeile
  **jeder** Seite, im Dateinamen (`handbuch-intern-…`, `intern-quickguide-…`)
  und im Ordner (`output/intern/…`). Der Vermerk in der Fußzeile lässt sich
  nicht abwählen: er ist keine Einstellung, sondern eine Eigenschaft des
  Blattes
* **Gemessen wird am Blatt, nicht am Schalter.** Eine Unterlage ist intern,
  wenn *ihre Bilder* an vorgemerkten Stellen hängen. Mit Schalter, aber ohne
  vorgemerktes Bild bleibt sie die gewöhnliche Unterlage – ein Vermerk, der
  immer dasteht, wird nicht gelesen. Umgekehrt trägt auch die Vorschau von
  Kapitel 24 im Designstudio den Vermerk, ohne dass jemand einen Schalter
  berührt hat

### Prüfung
* 1 neue Kernprüfung (Vermerk lang und kurz, HTML, Plan, Dateiname, Ordner)
  und 1 neue Browserprüfung (ohne Schalter kein Vermerk, mit Schalter Name
  **und** Dokument). Zusammen 560
* Die erste Fassung der Kernprüfung baute die `teile` von Hand und traf das
  Feld `schritte` als `strecken` – `handbuchHtml()` stürzte ab. Sie kommen
  jetzt aus `handbuchTeile()`: *ein zu kleines Prüfmaterial prüft die eigene
  Vorstellung statt den Code*

## [1.82.0] – „2 Regel(n)“ stand im Bericht, angekommen ist keine

### Behoben
* **Das Regelwerk reiste nicht mit** (F-80, F-63). `PAKET_INHALT` sagte
  `reist: true`, der Kern konnte es, und die Oberfläche packte es nie ein
  und nie aus: `ablage.js` übergab `paketAngaben()` neun Felder und
  `regeln` nicht, und beim Einlesen gab es keinen `gelesen.regeln`-Zweig.
  Wer den Bestand bekam, bekam nicht den Maßstab, an dem er gemessen wird
* **Zwei Regeln konnten dieselbe Kennung tragen.** `leereRegel()` baut sie
  aus `Date.now()`; „Ausschalten“ und „Löschen“ gehen im Register über
  die Kennung und hätten beide getroffen. Neu: `vereineRegeln()` benennt
  eine vergebene fremde Kennung um und lässt dieselbe Regel nicht zweimal
  herein – „Regel anlegen“ sagt dann „Diese Regel gibt es schon“ statt
  stumm eine zweite Zeile zu setzen

### Prüfung
* **Die Prüfung schaute an die falsche Stelle.** Es gab eine Prüfung zu
  `PAKET_INHALT`, und sie war grün: sie hält die Liste gegen die
  *Schlüssel des Kerns*. Ob die Oberfläche jedes mitreisende Feld auch
  übergibt, prüfte niemand. Der Build prüft jetzt beides – die Namen
  liest er aus der **Signatur** von `paketAngaben()`, nicht aus einer
  zweiten Liste
* 1 neue Buildprüfung, 1 neue Kernprüfung, 1 neue Browserprüfung, und der
  Umlauf der Projektdatei prüft jetzt auch das Regelwerk. Zusammen 558

## [1.81.0] – Eine Regel, die nie erfüllbar war

### Behoben
* **„Nichts Vorgemerktes in der Ausgabe“ maß den Bestand, nicht die
  Ausgabe** (F-80). Als Pflichtregel hielt sie jede Ausgabe an, solange
  irgendwo unter einer vorgemerkten Stelle ein Bild lag – und das ist der
  Normalfall, denn die Kapitel 24 und 25 sind dafür da. In der Ausgabe stand
  dabei nichts Vorgemerktes: es fällt von sich aus weg (F-79). Die Regel war
  als Pflicht **nie erfüllbar**; wer sie anlegte, sperrte sich dauerhaft
  aus. `pruefeRegeln()` und `regelSperre()` nehmen jetzt `mitVorgemerkten`
  entgegen – denselben Schalter, den Designstudio und Output führen. Ohne
  Schalter eingehalten, mit Schalter angehalten
* **„Heute: eingehalten“ war die halbe Wahrheit.** Eine Regel, die nur
  erfüllt ist, *weil* ein Schalter aus steht, nennt jetzt auch die
  Bedingung. Liegt kein Bild unter einer vorgemerkten Stelle, steht nichts
  da – ein Hinweis über nichts wäre Lärm

### Prüfung
* 1 neue Kernprüfung (Sperre ohne und mit Schalter, Befundart, der Fall
  ohne vorgemerktes Bild) und 1 neue Browserprüfung (Regel anlegen, ohne
  Schalter läuft das Handbuch durch, mit Schalter hält es an). Zusammen 555

## [1.80.0] – Vorgemerkt ist das Bild, nicht nur die Stelle

Schließt die Grenze, die 1.79.0 sich selbst aufgeschrieben hat – sie war
weiter als dort beschrieben.

### Behoben
* **Vorgemerktes fiel nur an der gewählten Stelle weg, nicht am Bild**
  (F-79). 7.5 ist nicht vorgemerkt, 7.5.1 ist es: wer das Oberkapitel
  wählte, bekam das Bild der vorgemerkten Unterstelle trotzdem – dieselbe
  Aufnahme war im Handbuch weg und im Quick Guide drin. Eine Klickstrecke
  brachte es ohnehin mit. `ausgabeBilder()` filtert jetzt am **Bild**, in
  beiden Zweigen; der Maßstab steht als `ohneVorgemerkteBilder()` einmal da
* **Die Inhaltsliste nannte eine Zahl, die der Plan nicht rechnete.**
  „Kapitel · 7.5 (1)" versprach ein Bild, die Ausgabe brachte keins. Die
  Liste rechnet jetzt mit demselben Maßstab; die Stelle bleibt mit „(0)"
  stehen, damit niemand seine Wahl stumm verliert
* **Das Register Output gab dem Plan die gelieferte Gliederung** – die kennt
  nur die Vormerkung der Kapitel 24 und 25, nicht die von Hand gesetzten.
  Derselbe Fehler wie beim Baum in 1.79.0, an einer anderen Stelle

### Prüfung
* 1 neue Kernprüfung (Kapitel, Strecke, Plan und der Fall ohne Gliederung)
  und 1 neue Browserprüfung (Oberkapitel wählen, Unterstelle vormerken,
  Zahl und Zeile prüfen). Zusammen 553
* **Das Testkonzept zählte falsch.** Die Tabelle summierte sich auf 535,
  der Durchlauf meldete 553: fünf Zeilen (04, 05, 06, 15, 21) waren
  stehengeblieben, während die Gesamtzahl darunter nachgeführt wurde. Jetzt
  stimmen Tabelle und Summe mit dem Durchlauf überein

## [1.79.0] – Zwei Wege, zwei Antworten

Schließt, was 1.78.0 offen gelassen hat. Beides fiel beim Nachfahren auf.

### Behoben
* **Das Register Output filterte Vorgemerktes nicht mit** (F-79). Dieselbe
  Stelle, zwei Wege, zwei Antworten: über das Designstudio fiel sie weg,
  über Output wurde sie gerechnet – ohne Hinweis. Output hat jetzt denselben
  Schalter und dieselbe Vorgabe, und daneben steht, wie viele Abschnitte
  weggelassen wurden. Wer eine wählt und den Schalter wieder ausmacht,
  rechnet sie nicht stillschweigend weiter: die Wahl wird bereinigt
* **Der Baum der Gliederung zeigte die Vormerkung nicht** – sie stand erst
  nach dem Anklicken in der Beschreibung. Bei 1161 Stellen heißt das
  unsichtbar. Der Baum wird dafür aus der Gliederung **mit den eigenen
  Texten darüber** gebaut; die rohe kennt nur die Vormerkung der Kapitel

### Zum dritten Mal
* `allInnerTexts()` liefert, was man **sieht**: `text-transform: uppercase`
  machte aus „Intern" ein „INTERN", und die erste Fassung der Prüfung
  meldete einen Fehler, den es nicht gab. Gelesen wird `textContent`

### Prüfung
* 2 neue Browserprüfungen (Output lässt Vorgemerktes weg und bereinigt die
  Wahl; der Baum zeigt die Marke). Zusammen 551

## [1.78.0] – Regeln, Vormerkungen und eine dritte Sparte

### Neu
* **Sparte „Beide" – und sie ist die Vorgabe.** Das meiste in oneSCM gilt
  für Pkw und Van gleichermaßen; Spartenspezifisches wird ausdrücklich auf
  PC oder Van gesetzt. Bus und Truck standen schon vorher nicht in der Liste
* **Vormerken: intern und in Planung** (F-79). Zwei neue Kapitel – **24
  Intern** und **25 In Planung** – sind vorgemerkt geboren; jede andere
  Stelle lässt sich in der Gliederung vormerken, und „keine" hebt die
  Vormerkung eines Kapitels für eine einzelne Stelle auf. Vorgemerktes fällt
  aus der Ausgabe, **schon im Umfang**, und der Umfang sagt auch, was
  wegfällt. Der Schalter „Vorgemerktes mitnehmen" holt es für eine interne
  Fassung zurück. Die Vormerkung liegt bei den eigenen Texten und reist
  damit in der Projektdatei
* **Register Regelwerk** (F-80), das fünfzehnte: Regeln, allgemein oder je
  Kapitel, **Pflicht** oder **Hinweis**. Zehn Arten, die sich rechnen
  lassen, und eine freie, die in Worten dasteht. Geprüft an drei Stellen –
  im Eingang an der Karte, im Register Prüfung als fünfter Agent, und vor
  dem Erzeugen in Design und Output, wo eine Pflichtregel anhält
* Die Regeln reisen mit der Projektdatei. Der Riegel aus 1.68.0 hat das
  erzwungen: ein neuer Speicherschlüssel ohne Eintrag in `PAKET_INHALT`
  lässt die Prüfung fallen

### Ausdrücklich
* **Die freie Regel ist eine Deutung, keine Rechnung.** Sie wird im Bericht
  genannt, nicht geprüft, und hält auch als Pflichtregel nichts an – sonst
  stünde dort eine Antwort, die niemand gegeben hat. Geprüft wird sie über
  Claude, im Kommentar des Agenten, und steht dort als Kommentar

### Nachgezogen
* Sechs Prüfungen, die nach der neuen Vorgabe **richtig falsch** waren:
  ein ungelabeltes Bild liegt jetzt unter `beide/`, „Labels ins Bild"
  schreibt zwei Marken statt einer. Die zweite prüft nun, dass die
  *gewählte* Marke da ist, statt auf eine feste Zahl zu zählen

### Prüfung
* 5 neue Kernprüfungen, 5 neue Browserprüfungen in
  `23-regelwerk.e2e.mjs`, die Begehung läuft durch fünfzehn Ansichten.
  Zusammen 549

## [1.77.0] – 798 Textstellen, zwei Zahlen

Die Kontrastprüfung sah zwei Textstellen an. Die Frage gilt allen.

### Behoben
* **798 Textstellen im hellen und 71 im dunklen Thema lagen unter den
  4,5:1 von WCAG 2.1 AA** – fast alle an einem einzigen Token.
  `--tinte-3` (#77839A), die Farbe jedes Hinweises, Labels und jeder
  Zahl daneben, erreichte je nach Grund nur 3,11 bis 3,82:1. Jetzt
  #5F687A (4,56–5,60:1); im dunklen Thema #8691A5 statt #7B8698
  (4,54–5,86:1 statt 3,92–5,06:1)
* Beide bleiben in derselben Farbrichtung und zwischen `--tinte-2` und
  dem Grund – die Abstufung Überschrift / Text / Nebensache bleibt

### Bemerkenswert
* Das **dunkle** Thema war das bessere (71 gegen 798) – und genau das
  einzige, das geprüft wurde

### Prüfung
* 1 neue Build-Prüfung, die **rechnet** statt zu messen: jede `--tinte-*`
  gegen jede `--grund`/`--flaeche*`, beide Themen, 24 Paare in
  Millisekunden. Gegengeprobt – mit dem alten Wert fällt sie
* 1 neue Browserprüfung, die **misst**: alle vierzehn Ansichten in beiden
  Themen, jeder sichtbare Text gegen seinen wirklichen Grund. Sie fängt,
  was die Rechnung nicht sieht – eine Farbe, die nicht aus einem Token
  kommt. Neu: `Testing/messungen/kontrast.mjs`. Zusammen 538

## [1.76.0] – Vierzehn Ansichten, nie auf einem Telefon

Jede Prüfung und jede Messung lief bisher bei 1400 bis 1500 px Breite.

### Behoben
* **Vier von vierzehn Ansichten scrollten bei 320 px zur Seite** (Archiv
  +36, Prüfung +36, Design +76, Eingang +49), zwei noch bei 360 px.
  Ursache zum einen **zwanzig starre Gitter**: `minmax(380px, 1fr)` ist
  eine Spalte von *mindestens* 380 px, auch wenn nur 374 da sind –
  `auto-fit` verringert die Zahl der Spalten, nicht ihre Mindestbreite.
  Jetzt `minmax(min(380px, 100%), 1fr)`: wo der Platz reicht, ändert das
  nichts
* Zum anderen **zwei Flex-Reihen ohne `flex-wrap`** (`.zeile-meta`,
  `.eingang-aktionen`), die bei 320 px breiter bleiben als der Schirm

### Nachgesehen, nicht angenommen
* Auf 1480 px ist alles unverändert: Archiv dreispaltig, fünf
  Kennzahlen, jedes Gitter mit derselben Spaltenzahl wie zuvor

### Bewusst nicht geändert
* **Ankreuzfelder unter 24 px** (Gliederung 56, Design 13). Ein Daumen
  trifft sie schlecht – aber die Seite braucht Bildschirmfreigabe und
  Ordnerzugriff, die es nur auf dem Rechner gibt: ein Telefon liest hier,
  es arbeitet nicht. Größere Felder zögen jede Liste dort auseinander, wo
  die Arbeit stattfindet. Die Zahl steht in der Messung, damit sie nicht
  vergessen ist

### Prüfung
* 1 neue Build-Prüfung (kein `minmax(<zahl>px` in einem
  `auto-fit`-Gitter) und 1 neue Browserprüfung (alle vierzehn Ansichten
  bei 320 px, Querscrollen gemessen). Neu:
  `Testing/messungen/schmal.mjs`. Zusammen 536

## [1.75.0] – Der PDF-Weg hält, und vier Abschriften werden eine

### Angesehen, nicht beanstandet
* **Der PDF-Import, erstmals mit echten PDFs** (aus LibreOffice statt aus
  dem Prüfbaukasten): 11 von 11 Bildern, in voller Auflösung 1280 × 720;
  eine PDF aus PNG-Quellen gibt 2 von 2, die Flate-Ströme daneben sind
  Masken und werden nicht mitgezählt. Text je Bild gibt eine PDF nicht
  her – und die Seite behauptet es auch nicht

### Aufgeräumt
* **Vier Prüfstände hatten je eine eigene Abschrift derselben
  fünfundzwanzig Zeilen.** Das hat sich gerächt: der Nachbau von
  `downloads.save` musste in **drei** Dateien repariert werden, die
  Wartezeile `/gerechnet/` in **zwei**. `Testing/messungen/hilfen.mjs`
  trägt sie jetzt einmal – 135 Zeilen weniger, und die Stelle, an der ein
  Nachbau falsch sein kann, ist eine statt vier
* Geprüft wurde das nicht durch die Suite (die Messskripte laufen nicht
  darin), sondern durch **Fahren**: alle drei liefern Zeichen für Zeichen
  dieselbe Ausgabe wie vorher

### Unverändert
* Die Anwendung selbst. `dist/index.html` ist dasselbe wie in 1.74.0 –
  diese Fassung betrifft nur den Werkzeugkasten

## [1.74.0] – Die Datei war noch nie in Word

Acht Fassungen lang blieb die Datei zwischen Schreiben und Lesen
**unberührt**. Genau das tut sie im Leben nie: den Rückweg aus Word gibt
es, weil die Datei im Haus geöffnet und gespeichert wird. Also einmal
durch ein echtes Office geschickt (`soffice --convert-to docx`).

### Behoben
* **Nach einem Durchlauf durch LibreOffice bot der Rückweg wieder elf von
  elf Stellen als geändert an** (F-65). Aus der Kennung `Bildunterschrift`
  war `Caption` geworden, und die Unterschriften wurden als Text der
  Stelle gelesen
* **Überschriften wurden nur an `Heading1` erkannt.** Ein deutsches Word
  schreibt die Kennung `berschrift1` – eine solche Datei hätte **gar keine
  Stelle** ergeben. Das war nie aufgefallen, weil hier nie ein deutsches
  Word im Spiel war
* Gelesen wird jetzt `word/styles.xml`: dort steht zu jeder Kennung ihr
  **Name**, und daraus wird die Rolle. Fehlt die Datei, wird an den
  gängigen Kennungen geraten. Dieselbe Karte bekommt der Import (F-39),
  der ein Dokument ebenso an den Überschriften teilt

### Angesehen, nicht beanstandet
* Die eigene Vorlage `Quellhinweis` aus 1.66.0 überlebt den Durchlauf mit
  Kennung und Namen; alle elf `r:embed` bleiben im Text; der Import
  derselben Datei ergibt 11 Bilder und 11 verschiedene Stellen; die
  PowerPoint-Datei bleibt unverändert lesbar

### Selbst eingebaut und gefunden
* Die erste Fassung las `styles.xml` richtig und fand **null** Stellen:
  `rolle.slice(13)` statt `slice(12)` – „ueberschrift" hat zwölf Zeichen.
  Aufgefallen beim Nachmessen, nicht beim Lesen

### Prüfung
* 1 neue Kernprüfung mit fremden Kennungen (`berschrift1`,
  `Beschriftung`), mit und ohne `styles.xml`, für Rückweg und Import.
  Sie hält auch die **Grenze** fest: eine frei vergebene Kennung kann der
  Rateweg nicht kennen. Zusammen 534

## [1.73.0] – Der Zettel zeigte auf nichts

Zwei Wege nach draußen waren noch nie angesehen worden: die BPMN-Datei und
der Ordner, den das Register Verzeichnis schreibt.

### Behoben
* **Der Beipackzettel nannte eine Datei, die es in seinem Ordner nicht
  gibt.** `zettelFuer` setzte fest `AUF-2026-001.png`, während die
  Bilddatei nach dem Muster des Verzeichnisses heißt. Zettel und Bild
  finden sich zwar über den gemeinsamen Dateinamen, aber wer den Zettel
  liest, um das Bild zu finden, greift ins Leere – und genau dafür ist das
  Feld da (F-28). Der Name kommt jetzt aus dem Plan

### Angesehen, nicht beanstandet
* **Die BPMN-Datei hängt zusammen**: kein Fluss ins Leere, keine Form ohne
  Element, kein Knoten ohne Form, ein vollständiges `BPMNDiagram` mit
  Koordinaten. Ein Platzhalter steht als schlichtes `task` da, mit Text
* **Der Ordnerbaum stimmt**: 26 Dateien, Namen nach Muster, Bilder in
  voller Auflösung, Übersicht und Prozesse an ihrem Platz

### Warum keine Prüfung das sah
* Der Ordner-Nachbau hielt nur Pfad, Größe und Typ fest – **nicht den
  Inhalt**. Was nicht festgehalten wird, lässt sich nicht prüfen. Er hält
  jetzt beides fest, dazu die ersten Bytes: `Blob.text()` entfernt ein
  führendes BOM (so ist UTF-8-Dekodierung spezifiziert), und die erste
  Fassung dieser Prüfung fiel genau darauf herein
* Die BPMN-Prüfung **zählte** acht Flüsse und acht Formen. Das bleibt
  richtig, auch wenn ein Fluss ins Leere zeigt

### Prüfung
* Die BPMN-Prüfung prüft den Zusammenhang statt der Zahl und einen
  Platzhalter; die Ordnerprüfung liest den Beipackzettel und die Bytes von
  `index.csv` (BOM) und `index.json` (keines). Neu:
  `Testing/messungen/ordner.mjs`. Zusammen 533

## [1.72.0] – Dieselbe Falle, eine Datei weiter

### Behoben
* **Die `index.csv` trug kein Byte Order Mark.** Excel rät das Format einer
  CSV und rät ohne BOM Windows-1252: aus „Prüfung der Signaturwege" wurde
  „PrÃ¼fung der Signaturwege". Das ist genau die Falle, die der Kern seit
  1.15.0 beim PNG umgeht (`iTXt` statt `tEXt`) – mit demselben Wort im
  Kommentar. Dazu **CRLF** nach RFC 4180; ein Umbruch *in* einer Zelle
  bleibt ein `\n` in Anführungszeichen

### Geprüft und unverändert
* `index.json`, Beipackzettel und `strecken.json` bekommen **kein** BOM –
  JSON darf keines haben. BPMN deklariert `encoding="UTF-8"` selbst, die
  HTML-Ausgaben tragen `<meta charset>`, und die OCR-Textdatei geht in
  einen Editor, nicht in Excel. Die CSV war die einzige Datei, die ihr
  Format weder erklärt noch mitteilt

### Gemessen statt vermutet
* **Der Kontaktbogen (F-23) ist der kleinste Weg nach draußen**, nicht der
  größte: elf Bilder ergeben **306 kB**, weil er die Vorschauen einbettet.
  Zum Vergleich: Handbuch als Word 615 kB, als HTML 758 kB, Blätter als
  HTML 1640 kB. Der sechste der sechs Verdachtsfälle der Durchsicht ist
  damit ausgeräumt – es bleiben fünf
* Dazu etwas über die Durchsicht selbst: sie führte „zu groß" und „wird
  nicht gebraucht" als **eine** Art Verdacht. Das erste lässt sich in einer
  Minute wiegen, das zweite braucht Wochen echter Benutzung

### Prüfung
* Die CSV-Prüfung verlangt jetzt BOM, CRLF, kein nacktes `\n` zwischen den
  Zeilen und einen Umlaut, der den Weg durch UTF-8 übersteht. Zusammen 533

## [1.71.0] – Der offene Punkt aus 1.70.0

OCR und Video blieben in 1.70.0 ausdrücklich liegen: beide brauchen ein
Bild bzw. einen Film im Browser. Jetzt gefahren – der Prüfstand legt sich
sein Bild selbst an und öffnet den Messfilm.

### Behoben
* **Die Schlusszeile überschrieb den Grund** (Register OCR). Der Fangzweig
  schrieb „Das Lesen wurde nicht erlaubt" bzw. „Zu viele Anfragen", und
  eine Zeile später stand dort „0 von 1 Bildern gelesen, 1 nicht." – für
  zwei ganz verschiedene Lagen dieselbe Zeile. Der Grund steht jetzt voran
* **Eine leere Antwort löschte den vorhandenen Text** (Register OCR). Sie
  zählte als gelesen, und `setzeOcrText('')` löscht den Eintrag – ein
  Verlust, als Gelingen gemeldet. Jetzt zählt nur ein nichtleerer Text,
  und die Meldung sagt: „der vorhandene Text bleibt stehen"
* **Die Fortschrittszeile blieb stehen** (Register Video). Bei leerer
  Antwort lief kein Zweig der Schlussmeldung, und „Bild bei 00:00,0 wird
  gedeutet …" blieb da, obwohl der Lauf vorbei war

### Angesehen, nicht beanstandet
* Kein Lauf hängt, kein Knopf bleibt gesperrt, keine Seite wirft einen
  Fehler – in keinem der vier Register, in keinem Ausgang. Alle vier sagen
  bei fehlender Fähigkeit genau, was stattdessen geht

### Was die drei gemeinsam haben
* Keiner ist ein Absturz; alle drei sind **Meldungen, die nicht stimmen**,
  und zwei melden Erfolg, wo keiner war
* Keiner saß in der Fehlerbehandlung, sondern **dahinter**. Die Fangzweige
  waren sorgfältig geschrieben – es fehlte der Blick auf die Zeile danach

### Prüfung
* 2 neue Browserprüfungen für OCR (Grund in der Schlusszeile, leere
  Antwort löscht nichts), 1 für Video (Fortschrittszeile). Der Deutungsweg
  des Registers Video wurde damit überhaupt zum ersten Mal mit einem
  Claude-Nachbau gefahren. Zusammen 533

## [1.70.0] – Claude löschte, was die Seite gefunden hatte

Derselbe Satz wie in 1.69.0, diesmal auf `sample` angewandt: jeden Ausgang
nachbauen, den der Vertrag kennt, und jedes Register damit fahren.

### Behoben
* **Der Suchchat verlor sein Suchwort, sobald Claude antwortete.** Aus
  „Zeig mir die Formulare auf Englisch" wurde „Sprache Englisch" – ohne
  das Wort, nach dem gefragt war. Der Schutz „Claude darf ergänzen, nicht
  widersprechen" galt nur für die fünf Felder mit festem Vokabular;
  `text`, `markt` und `grenze` kamen ungeprüft von Claude. Das traf nicht
  den Fehlerfall, sondern die **wahrscheinlichste** Antwort: Sprache
  erkannt, `text` leer. Jetzt vereint `vereineFilter` jedes Feld
* **„Kommentar steht" bei leerer Antwort** (Register Prüfung). Darunter
  stand nichts. Jetzt: „Claude hat nichts geschrieben. Die Befunde stehen
  trotzdem."

### Angesehen, nicht beanstandet
* **Die Fehlerwege selbst sind in Ordnung.** Fähigkeit fehlt, `not_granted`,
  `rate_limited`: kein Lauf hängt, kein Knopf bleibt gesperrt, keine Seite
  wirft einen Fehler, jede Meldung sagt, was los ist. Der Suchchat sucht
  ohne Claude weiter und schreibt „gedeutet in der Seite" darunter

### Neu
* **`Testing/messungen/fehlschlag.mjs`**: jedes Register durch jeden
  Ausgang, mit drei Fragen – sagt die Seite was los ist, ist der Knopf
  danach offen, bleibt die Seite fehlerfrei

### Offen
* **OCR und Video** ließen sich so nicht fahren: beide brauchen ein Bild
  bzw. einen Film im Browser. Ihre Fehlerwege sind gelesen, nicht gefahren

### Prüfung
* 1 neue Kernprüfung (`vereineFilter` mit leerer, ergänzender und
  widersprechender Antwort), 1 neue Browserprüfung (leere Antwort im
  Register Prüfung). Zusammen 530

## [1.69.0] – Ein Nachbau, der enger ist als der Vertrag

Die drei HTML-Ausgaben zum ersten Mal angesehen – deutsch und englisch,
und ohne Netz geöffnet.

### Angesehen, nicht beanstandet
* **Alle drei Dateien stehen für sich**: Handbuch, Blätter zum Drucken und
  das Format HTML im Register Output holen **nichts** von draußen. Keine
  nachgeladene Schrift, kein nachgeladenes Bild – auch hinter einer
  Firewall nicht leer. Das war die wichtigste Frage bei HTML

### Behoben
* **Die Sprache stand nicht am Dokument** (F-66). Die Blätter zum Drucken
  und das Output-HTML trugen `lang="de"`, auch bei englischer Ausgabe – ein
  Vorleseprogramm spricht sie dann deutsch aus, der Browser trennt nach
  deutschen Regeln. Das Handbuch machte es seit 1.48.0 richtig
* **Der Bildtext hieß dreimal „Blatt"**. Jetzt `Blatt 1/3` bzw. `Sheet 1/3`
* **Drei Browserprüfungen warteten auf `/gerechnet/`** – das trifft schon
  die Meldung „… wird gerechnet – 1 von 3 …" und drückt zu früh. Sie warten
  jetzt auf `Dokument(e) gerechnet`

### Warum keine Prüfung das sah
* `downloads.save` nimmt laut Vertrag auch eine **Zeichenkette**, und die
  Blätter zum Drucken geben genau die. Der Nachbau in den Prüfungen kannte
  nur `data.text()`; eine Zeichenkette ließ ihn scheitern, die Ablage
  meldete still „fehlgeschlagen", und keine Prüfung konnte je in diese
  Datei hineinsehen. **Ein Nachbau, der enger ist als der Vertrag, verbirgt
  Code**

### Neu
* **`Testing/messungen/netzseite.mjs`**: die drei HTML-Ausgaben erzeugen,
  ohne Netz öffnen und jede Anfrage nach draußen nennen

### Prüfung
* Der Nachbau nimmt beides, Blob und Zeichenkette; die englische Ausgabe
  prüft die Blätter mit. Zusammen 528

## [1.68.0] – Was die Projektdatei vergaß

Der dritte Umlauf, und der wichtigste: der Bestand von einem Menschen zum
nächsten. Er *wurde* geprüft, seit 1.45.0, und die Prüfung war grün.

### Behoben
* **Die eigenen Texte aus dem Rückweg aus Word reisten nicht mit** (F-63,
  F-65). Sie sind Inhalt – im Haus geschriebene Sätze, die es sonst nirgends
  gibt. Wer den Bestand weitergab, gab sie verloren, lautlos und mit grünem
  Bericht. Beim Ergänzen verdrängen sie nichts: wer dieselbe Stelle selbst
  geschrieben hat, behält seinen Satz
* **Das Namensmuster des Verzeichnisses** reist ebenfalls mit – aus
  demselben Grund wie das Vorgehen in 1.60.0: wer anders ablegt, legt
  anderswohin ab

### Neu
* **`PAKET_INHALT`**: jeder Speicherschlüssel sagt, ob er mitreist – auch
  jeder, der bleiben soll, mit seinem Grund (`:ablage` hängt am
  Ordnerzugriff, `:chat` ist ein Gespräch, `:gebrauch` zählt diesen
  Browser). Eine Kernprüfung hält die Liste gegen die Schlüssel des Kerns:
  ein neuer ohne Eintrag lässt sie fallen, ein Eintrag ohne Grund auch

### Warum der Riegel und nicht nur die Behebung
* Derselbe Fehler war 1.60.0 schon einmal passiert (das Vorgehen des
  Registers Video). Zweimal derselbe Fehler heißt: es fehlt nicht ein Feld,
  es fehlt eine **Stelle, an der die Frage gestellt wird**
* Der Riegel kann eine Entscheidung erzwingen, nicht treffen. Wer
  `reist: false` einträgt und eine Begründung dazuschreibt, kommt durch

### Prüfung
* 1 neue Kernprüfung (eine Millisekunde, kein Browser); der Umlauf der
  Projektdatei prüft eigene Texte und Namensmuster mit. Zusammen 528

## [1.67.0] – Elf Bilder, eine Stelle

Derselbe Umlauf wie in 1.66.0, nur in die andere Richtung: die Word-Datei
geht nicht in die **Gliederung** zurück, sondern über das Register Import
wieder in die **Galerie**.

### Behoben
* **Ein Word-Dokument war ein einziger Träger** (F-39): jedes Bild bekam den
  Text des **ganzen** Dokuments. Beim Umlauf mit dem eigenen Handbuch (elf
  Kapitel, elf Bilder) meldete „Stellen aus dem Folientext" darauf *11 von 11
  zugeordnet* – und setzte alle elf auf **dieselbe** Stelle (7.5). Eine
  Fehlmeldung ist schlimmer als keine Zuordnung
* Ein Dokument wird jetzt an seinen **Überschriften** geteilt
  (`wordAbschnitte`). Aus elf Bildern werden elf Stellen: 7.5.1 bis 7.7.3
* Nennt der Text des Dokuments kein einziges Bild – weil ein fremdes
  Programm sie anders einbindet –, bleibt es beim einen Träger wie bisher.
  Gelesen werden `r:embed` und das ältere `r:id`

### Neu
* **`Testing/messungen/einfuhr.mjs`**: der Umlauf durch das Register Import,
  mit einer Datei, die die Seite selbst geschrieben hat

### Gemessen
| mit dem eigenen Handbuch | vorher | nachher |
| --- | --- | --- |
| verschiedene Texte je Bild | 1 von 11 | **11 von 11** |
| verschiedene Stellen | **1** (alle auf 7.5) | **11** |

### Prüfung
* 1 neue Kernprüfung (`wordAbschnitte` samt Verweis, der kein Bild meint,
  und Dokument ohne Überschrift), 1 neue Browserprüfung mit einem
  Word-Handbuch aus zwei Kapiteln. Zusammen 527

## [1.66.0] – Der Rückweg aus Word bot alles an

Die zweite Hälfte der Durchsicht aus 1.65.0: nicht nur ansehen, was die
Seite schreibt, sondern es **wieder hineingeben**.

### Behoben
* **Der unveränderte Umlauf bot jede Stelle als geändert an** (F-65). Am
  echten Handbuch: **15 von 15**, alle vorangekreuzt. Der Quellhinweis
  („Quelle: …", das Feld `notiz`) stand im Word als gewöhnlicher Absatz da;
  der Leser kannte nur Überschrift und Bildunterschrift als „kein Text der
  Stelle" und hielt ihn darum für neu geschriebenen Text
* Der Hinweis trägt jetzt eine **eigene Vorlage** (`Quellhinweis`), wie die
  Bildunterschrift eine hat, und der Leser übergeht ihn
* **Altlast**: Dateien aus früheren Fassungen tragen ihn ohne Vorlage. Steht
  als „neuer Text" genau die Notiz, die die Stelle ohnehin führt, ist das
  keine Änderung

### Neu
* **`Testing/messungen/rueckweg.mjs`**: derselbe Umlauf durch die fertige
  Seite, mit `--aendern` auch mit genau **einer** echten Änderung. Gepackt
  und entpackt wird mit den Werkzeugen der Seite selbst

### Warum keine Prüfung das fand
* Es gab Prüfungen seit 1.47.0, und sie waren nicht falsch: sie gaben dem
  **Leser** ein von Hand geschriebenes Word-XML. Keine prüfte, ob das, was
  der **Schreiber** schreibt, durch den Leser unverändert herauskommt – zwei
  Hälften, jede für sich geprüft, dazwischen eine Lücke

### Prüfung
* 1 neue Kernprüfung, die den Kreis schließt: Gliederung → `docxAusHandbuch`
  → ZIP wieder auf → `docxAbsaetze` → `stellenAusDocx` →
  `vergleicheStellentexte`, erwartet null. Ohne Browser, in Millisekunden.
  Zusammen 525

## [1.65.0] – Das Register Output stand in einer Sackgasse

Aus der Durchsicht von **Word und PowerPoint** an echtem Bildschirminhalt –
gefunden wurde nicht dort, sondern auf dem Weg dorthin.

### Behoben
* **Im Register Output konnte mit der Vorgabe nie ein Dokument entstehen**
  (F-56). Die Achse stand anfangs auf „Sprache" **ohne Werte**, und ein Plan
  entsteht nur mit Werten. Wer Vorlage und Inhalt wählte, bekam denselben
  Satz wie vorher – und der nannte die Achse „wenn gewünscht". Die Achse
  steht jetzt auf **keine**; Vorlage und Inhalt allein ergeben ein Dokument

### Neu
* **Der leere Plan nennt seinen Grund** (`ausgabeGrund`): welche Angabe
  fehlt, und bei einer Achse ohne Werte, ob Ankreuzen hilft oder erst ein
  Label im Editor nachzutragen ist
* **`Testing/messungen/word.mjs`**: Word und PowerPoint an echtem
  Bildschirminhalt erzeugen und zum Ansehen hinlegen

### Angesehen, nicht beanstandet
* **Das Handbuch als `.docx`**: 615 kB, 68 Absätze, 2 × Heading1,
  3 × Heading2, 11 × Heading3, 11 Bildunterschriften, 11 eingebettete
  JPEGs, als A4-PDF sieben Seiten. Die Überschriftenebenen stehen wirklich
  im Dokument – daran hängt der Rückweg aus Word (F-65)
* **Der Bildschirmablauf als `.pptx`**: drei Folien im A4-Hochmaß, je ein
  Blatt als Bild, Rahmen sichtbar, Text lesbar. Zum ersten Mal angesehen

### Prüfung
* 1 neue Kernprüfung (`ausgabeGrund` mit allen fünf Fällen, dazu die
  Vorgabe des Registers), 1 neue Browserprüfung (die Sackgasse im Register
  selbst); drei bestehende Browserprüfungen stellen die Achse jetzt
  ausdrücklich ein. Zusammen 524

## [1.64.0] – Eine Vorlage für Bildschirmfilme

Aus der Durchsicht **aller vier** Unterlagen an echtem Bildschirminhalt.

### Neu
* **Vorlage „Bildschirmablauf“** (F-78): A4 hoch, 1 Spalte, 4 Zeilen,
  Textspalte 42 % – vier breite Bildschirmfotos je Seite, Anweisung daneben.
  Für elf Schritte **drei** Seiten mit **1 %** Rest

### Gemessen
* Ein Mitschnitt ist 16:9, die Vorlagen stammen aus einer Zeit mit 16:10 in
  kleiner Zahl. Für elf Schritte blieben leer: Releaseletter **49 %** (sechs
  Seiten), One Pager 43 %, Quick Guide 22 %, Handbuchseite 16 %

### Nicht geändert
* Die vier bestehenden Vorlagen. Sie sind nicht falsch – ein Releaseletter
  mit zwei großen Bildern und Fließtext ist, was sein Name sagt. Wer sie
  heute benutzt, bekommt morgen dasselbe Blatt

### Prüfung
* 1 neue Kernprüfung, die den Zuschnitt **nachrechnet** statt ihn zu
  behaupten; zwei Listen der Vorlagen nachgezogen. Zusammen 522

## [1.63.0] – Der Fingerzeig im Bild

Aus der ersten Prüfung der **ganzen Kette** an echtem Bildschirminhalt:
Messfilm → Video → Strecke → Designstudio → Quick Guide als PDF
(`Testing/messungen/kette.mjs`).

### Behoben
* **Die Bilder im Quick Guide waren unlesbar.** Ein Bildschirmfoto von
  1280 × 720 steht dort in einer Spalte von neun Zentimetern; welches Feld
  ausgefüllt wurde, war nicht zu sehen – das Einzige, was ein Quick Guide
  über einen Bildschirmablauf sagen muss

### Neu
* **Rahmen um den geänderten Bereich** (F-77): `bildUnterschied` wusste
  längst, *wo* sich etwas geändert hat; `videoWahl` warf es weg. Jetzt reist
  der Bereich mit, und beim Übernehmen wird ein Rahmen in der Akzentfarbe in
  voller Auflösung ins Bild gezeichnet. Er geht danach durch Editor,
  Strecke, Designstudio und Output mit
* Der wandernde Mauszeiger bleibt draußen; eine Änderung über fast das ganze
  Bild bekommt keinen Rahmen; das erste Bild hat keinen Vorgänger und darum
  keinen. Abschaltbar
* `Testing/messungen/kette.mjs` – die ganze Kette einmal durch, mit einer
  PDF am Ende, die man ansehen kann

### Nicht geändert
* Unter jedem Schritt steht derselbe Satz aus der Gliederung. Das sieht nach
  einem Fehler aus, ist aber der Text, der dort steht – für diese Kapitel
  derselbe. Eine Anwendung, die Daten „verbessert“, wäre schlimmer als eine,
  die langweilige Daten zeigt

### Kern
* `bereichAusVergleich`, `rahmenAusBereich`; `videoWahl` gibt den Bereich mit

### Prüfung
* 3 neue Kernprüfungen, 2 neue Browserprüfungen (am **Bildpunkt** geprüft,
  nicht an einer Einstellung); zusammen 521

## [1.62.0] – Gemessen statt geraten

Mit einem selbst gebauten Messfilm, bei dem bekannt ist, wann sich etwas
ändert – siehe `Testing/messungen/`.

### Behoben
* **Die Schwellen der Abtastung waren eine Größenordnung zu hoch.** Die
  Voreinstellung (2 %) fand **3 von 10** Änderungen; auch die feinste
  angebotene Stufe (0,5 %) verpasste vier. Ein ausgefülltes Feld ist in
  einer Maske von 1280 × 720 nur zwei Promille der Fläche. Neue Stufen:
  0,1 / **0,2 (Vorgabe)** / 0,5 / 2 / 8 %
* **Beim Verkleinern ging die Schrift verloren.** 1280 px in einem Schritt
  auf 192 heißt für den Browser: Punkte abtasten statt mitteln. Verkleinert
  wird jetzt stufenweise, höchstens auf die Hälfte je Schritt – 8 von 10
  wurden damit 10 von 10

### Entfernt
* Ein Umbau des Springens mit `requestVideoFrameCallback`, eingebaut auf
  Verdacht: die Messung zeigte **kein einziges geändertes Ergebnis** bei bis
  zu 120 ms Kosten je Abtaststelle

### Neu
* `Testing/messungen/` – `erzeuge-film.mjs` baut einen Bildschirmfilm einer
  oneSCM-ähnlichen Maske samt `wahrheit.json`, `miss-abtastung.mjs` misst
  die fertige Seite dagegen, `miss-kern.mjs` die Kernlogik ohne Browser.
  Nicht Teil von `npm test`: dauert Minuten, braucht ffmpeg

### Ergebnis
* gefunden von 10 echten Änderungen: **3 → 10**, bei 11 statt 4 Bildern und
  unverändert einem zusätzlichen (dem wandernden Mauszeiger)

## [1.61.0] – Zwei Wege ins Video, und eine ehrliche Ursache

### Behoben
* **Die Seite gab bei jedem Fehlschlag die Formatauskunft aus** („Dieser
  Browser spielt kein MP4 …“). Das ist falsch, sobald der Browser sagt, er
  *könne* das Format – dann ist „als MP4 exportieren“ ein Rat ins Leere. Sie
  nennt jetzt drei mögliche Ursachen, keine davon als sicher, und den Weg,
  der weiterhilft (Register Import)

### Neu
* **Ein zweiter Weg ins Video**: scheitert die Objektadresse (`blob:`),
  versucht die Seite es über eine Datenadresse – bei Dateien bis 8 MB.
  Manche Umgebung verwehrt das eine und erlaubt das andere
* `mitSeite` nimmt `erwarteteFehler`: ein Prüffall, der einen Fehler
  absichtlich auslöst, nennt ihn vorher; alles andere bleibt ein Grund zum
  Scheitern

### Nicht behauptet
* Ob die veröffentlichte Seite Objektadressen abspielen darf, entscheidet
  die Inhaltsrichtlinie ihres Rahmens. Sie ist von hier aus nicht zu lesen –
  der Abruf endet ohne Antwort. Diese Fassung macht nur, dass ein Scheitern
  nicht falsch erklärt wird und dass es einen zweiten Versuch gibt

### Kern
* `videoFehlerBericht`, `VIDEO_ZWEITER_WEG`

### Prüfung
* 1 neue Kernprüfung, 1 neue Browserprüfung (sie **versperrt** den ersten
  Weg und verlangt, dass das Video trotzdem öffnet); zusammen 516

## [1.60.0] – Ein `fetch`, das nie gelaufen wäre

### Behoben
* **Das Register Video holte ein Bild mit `fetch` von einer Datenadresse** –
  die einzige Stelle im Code mit einer Netzanfrage. In der veröffentlichten
  Seite wäre sie **stillschweigend** abgewiesen worden: für die
  Inhaltsrichtlinie des Artifacts ist auch eine Datenadresse eine
  Netzanfrage. „Text deuten lassen“ hätte dort nie etwas getan. Das Bild
  geht jetzt über die Leinwand, wie überall sonst
* Keine Prüfung konnte das finden: die Browserprüfungen laufen über
  `file://`, und dort gibt es keine Inhaltsrichtlinie. Grüne Prüfungen,
  kaputte Seite
* **Das Vorgehen des Registers Video reiste nicht in der Projektdatei mit**
  (F-63), obwohl die Wortliste es tut. Es ist dieselbe Art Sache: eine
  Arbeitsweise, kein Bestand

### Neu
* **Riegel gegen Netzanfragen** in der Build-Prüfung: `fetch`,
  `XMLHttpRequest`, `EventSource`, `WebSocket`, `sendBeacon` und
  `importScripts` dürfen im Text der fertigen Seite nicht vorkommen. Geprüft
  wird die Datei, die veröffentlicht wird – nicht ein Verhalten in einer
  Umgebung ohne Richtlinie

### Prüfung
* 1 neue Kernprüfung, 1 neue Build-Prüfung; der Umlauf der Projektdatei
  prüft das Vorgehen mit (zweiter, leerer Browser). Zusammen 514

## [1.59.0] – Durchgänge: V1, V2, V3

### Neu
* **Durchgänge im Register Video** (F-76): jeder Lauf bleibt mit seinen
  Einstellungen und seinem Ergebnis stehen. Dazu, was sich gegenüber dem
  vorigen geändert hat und was es gebracht hat (`3 → 11`), und eine
  **Diagnose**, die *eine* Stellschraube nennt – nicht drei
* **„Einstellungen übernehmen“** holt die Regler eines Laufs zurück
* **Vorgehen**: die Aufforderung an Claude und die Modellstufe (schnell,
  normal, gründlich) überdauern den einzelnen Film
  (`screenarchiv:videovorgehen`). Die eingebaute Aufforderung steht zum
  Abschauen daneben
* „Als Textdatei“ gibt die Durchgänge heraus

### Kern
* `videoLauf`, `laufText`, `laufVergleich`, `laufDiagnose`, `laeufeText`,
  `leseVorgehen`, `schreibeVorgehen`, `MODELLSTUFEN`, `LAUF_REGLER`,
  `VORGEHEN_SCHLUESSEL`, `STANDARD_VORGEHEN`

### Behoben
* Der Spieler zog jedes Video auf die volle Breite; ein Film mit 320 px
  wurde unscharf aufgeblasen und drückte alles darunter aus dem Bild. Er
  wird jetzt begrenzt, nicht gestreckt

### Prüfung
* 5 neue Kernprüfungen, 3 neue Browserprüfungen; zusammen 512

## [1.58.0] – Die Stelle schon beim Aufnehmen

Aus einer Durchsicht des Codes: welche Ausfuhr des Kerns benutzt niemand?

### Behoben
* **`{kapitel}` im Namensmuster wurde beim Ausschneiden nicht gefüllt** –
  der Editor füllte es, und beide teilen sich denselben Muster-Text. Wer
  `{kapitel}/{titel}` einstellte, verlor beim Ausschneiden still eine
  Ordnerebene, ohne Fehlermeldung
* Die Bausteinliste unter dem Musterfeld war von Hand geschrieben und ließ
  `{kapitel}` aus, obwohl der Kern-Eintrag `MUSTER_FELDER` ihn kennt. Sie
  kommt jetzt von dort – eine Quelle statt zwei
* Im Feature-Katalog drei Zahlen berichtigt: F-16 sprach von dreizehn
  Ansichten (es sind vierzehn), F-49 von „elf Ansichten“, und F-70 ließ
  Video in der Aufgabe *Hereinholen* aus

### Neu
* **Feld „Stelle im Handbuch“ in der Ansicht Aufnahme** (F-75): ohne es
  konnte das Ausschneiden die Stelle gar nicht kennen – sie entstand erst in
  der Nachpflege, also nach dem Ablegen der Datei. Die Stelle bleibt über das
  Auslösen hinaus stehen, wie die Labels; darunter steht das Thema der
  gewählten Stelle

### Entfernt
* `markiertName` aus dem Kern: seit 1.20.0 erledigt `fassungName` dieselbe
  Aufgabe besser (mit Art und Nummer der Fassung). Die Funktion stand
  unbenutzt da und wurde nur von ihrer eigenen Prüfung am Leben gehalten –
  die prüft jetzt dasselbe Versprechen an `fassungName`

### Prüfung
* 2 neue Browserprüfungen (die Stelle am Entwurf, `{kapitel}` im Muster);
  zusammen 504. Von 347 Ausfuhren des Kerns werden 345 benutzt – kein toter
  Code sonst

## [1.57.0] – Aus dem Video wird eine Strecke

### Neu
* **„Als Strecke übernehmen“ im Register Video** (F-74): die Bilder gehen in
  den Eingang wie bisher, und zusätzlich entsteht eine Klickstrecke – ein
  Schritt je Bild, in der Reihenfolge des Films, der gedeutete Text als
  Anweisung. Benannt nach der Videodatei
* Damit ist die Kette geschlossen: Clipchamp → MP4 → Video → Bilder →
  Strecke → Designstudio → Quick Guide. Vorher riss sie zwischen Bildern und
  Strecke und wurde von Hand gefüllt

### Kern
* `streckeAusVideo(bilder, name, zeit)`, `streckenNameAusVideo(dateiname)`

### Prüfung
* 2 neue Kernprüfungen, 1 neue Browserprüfung; zusammen 502

## [1.56.0] – Gebrauch: die Probe mit den Verdachtsfällen

Der letzte offene Posten der [Durchsicht](durchsicht.md).

### Neu
* **Gebrauch zählen** (F-73): ein Zuhörer vermerkt, welcher Befehl gedrückt
  und welche Ansicht geöffnet wurde – im `localStorage` dieses Browsers.
  Nichts wird verschickt, nichts reist in der Projektdatei mit, ein Knopf
  setzt zurück (zweimal gedrückt)
* **Aufklapper „Gebrauch“ im Register Prüfung**: nie gedrückt, selten,
  benutzt – und **durch Zählen nicht zu beantworten**, für alles Passive wie
  die Kennzahlenleiste
* Der Bericht urteilt nicht, er sortiert, und nennt die Dauer der Zählung;
  unter sieben Tagen sagt er ausdrücklich, dass es zu wenig ist. Steht etwas
  unter „nie“: *ein Grund zu fragen, nicht zu löschen*
* „Als Textdatei“ gibt dieselbe Auskunft zum Weitergeben – mit dem Satz,
  dass die Zahlen allein in diesem Browser stehen

### Kern
* `GEBRAUCH_SCHLUESSEL`, `GEBRAUCH_SELTEN`, `BEOBACHTETE`, `leseGebrauch`,
  `schreibeGebrauch`, `zaehleGebrauch`, `tageSeit`, `gebrauchBericht`,
  `gebrauchText`

### Beim Bauen aufgefallen
* Der erste Entwurf las die Zählung beim Laden von `ui.js` und brach den
  Start der Seite ab: `heute` steht in `aufnahme.js`, also dahinter, und ein
  `const` wird nicht vorgezogen – genau der Fall, vor dem das
  Projektgedächtnis warnt. Gelesen wird jetzt in `verdrahteGebrauch()` aus
  `starte()` heraus

### Prüfung
* 4 neue Kernprüfungen, 2 neue Browserprüfungen; zusammen 499

## [1.55.0] – Register Video: aus Bildschirmvideos werden Handbuchbilder

### Neu
* **Register Video** (F-72), die vierzehnte Ansicht, in der Aufgabe
  *Hereinholen*: ein Bildschirmvideo ablegen, Einzelbilder in voller
  Auflösung herausnehmen, den Inhalt deuten lassen, in den Eingang
  übernehmen
* **Automatisch herausnehmen**: an 12 bis 96 Stellen abtasten, behalten was
  sich um mehr als 0,5 / 2 / 8 % vom zuletzt behaltenen unterscheidet –
  gerechnet mit dem Bildvergleich aus F-59. An jedem Bild steht, warum es
  dasteht
* **Von Hand**: „Bild an dieser Stelle“; dieselbe Stelle zweimal gibt kein
  zweites Bild
* **Text deuten lassen** über `sample`: je Bild ein bis zwei Sätze im
  Imperativ, die beim Übernehmen zum Rezept werden
* **Übernehmen** wie der Stapel im Import: Stelle für alle, Stellen
  fortlaufend, Stellen aus dem Text, sechs Labelfelder. Die Herkunft bleibt
  an der Aufnahme (`einfuhr` mit Datei, Bild und Sekunde)
* **Was dieser Browser abspielt**, steht über dem Dateifeld – gefragt mit
  `canPlayType`, nicht geraten. Clipchamp exportiert MP4 mit H.264, und das
  fehlt manchen Browsern unter Linux

### Kern
* `VIDEO_FORMATE`, `istVideo`, `zeitText`, `zeitKennung`, `videoSchritte`,
  `videoWahl`, `videoBildname`, `videoAufforderung`, `videoText`,
  `videoFormatBericht`, `videoStand`

### Behoben
* `.video-flaeche video { display: block }` schlug das `hidden`-Attribut des
  Spielers – eine abgewiesene Datei ließ den leeren Spieler stehen. Von der
  neuen Browserprüfung aufgedeckt

### Grenzen
* Die Seite **holt kein Video ab**: sie darf nichts aus dem Netz laden, und
  Clipchamp gibt seine Projekte nicht als Datei heraus. Der Weg ist Export
  als MP4 und Ablegen der Datei – sie wird nicht hochgeladen
* Kein Ton, kein Schnitt. Die Abtastung sieht Bildpunkte, nicht Bedeutung

### Prüfung
* 6 neue Kernprüfungen, 7 neue Browserprüfungen (`22-video.e2e.mjs`, 8 mit dem Schließen); die
  Begehung deckt die Ansicht mit ab. Zusammen 493
* Die Browserprüfung **nimmt ihr Video selbst auf** – eine Leinwand mit vier
  Masken über `captureStream` und `MediaRecorder`. Kein fremdes Werkzeug,
  keine Beispieldatei im Repo

## [1.54.0] – `aufnahme.js` geteilt

Nach `markieren.js` (1.52.0) die zweite große Datei – damit ist die
[Durchsicht](durchsicht.md) abgearbeitet, bis auf die Probe, die Benutzung
braucht.

### Geändert
* **`aufnahme.js` ist in zwei Dateien geteilt**: `aufnahme.js` (Studio,
  1 395 Zeilen) und `eingang.js` (Eingang, Werkbank, Eingangsdialog,
  Ordnerband, Sichern – 830 Zeilen)
* Die Verdrahtung war **eine** Funktion für beide Hälften; sie ist jetzt
  `verdrahteAufnahme()` und `verdrahteEingang()`. **Beide werden am Ende von
  `eingang.js` aufgerufen**, an derselben Stelle wie vorher der eine Aufruf –
  der Text liegt in zwei Dateien, der Start läuft in derselben Reihenfolge
* `app/build/build.mjs` kennt einen Platzhalter mehr (`/*%EINGANG%*/`); der
  Riegel gegen doppelte Namen prüft vierzehn Module

### Prüfung
* Keine neuen Prüffälle. Die Probe lief über den Bestand der Zeilen in
  `dist/index.html`: **keine einzige ausführbare Zeile ist verschwunden**,
  neu sind nur `function verdrahteEingang() {`, die schließende Klammer und
  der Aufruf – der Rest ist Kommentar. Dazu die 479 Prüfungen, die in der
  Begehung jeden sichtbaren Befehl in jeder Ansicht drücken

## [1.53.0] – Weitergeben: vier Wege, einer je Zweck

Der zweite Befund der [Durchsicht](durchsicht.md) – damit sind alle drei
abgearbeitet.

### Neu
* **Übersicht „Weitergeben“ im Eingang** (F-71): eine Tafel mit den vier
  Wegen – was mitreist, wofür er taugt, wo er liegt. Die beiden fernen Wege
  bekommen einen Knopf, der hinführt (Verzeichnis, Design – dort klappt das
  Studio gleich auf)

### Geändert
* **„Als JSON sichern“ sagt beim Sichern, was fehlt**: „nur die Metadaten,
  ohne Bilder. Zum Weitergeben die Projektdatei im Verzeichnis.“ Der Knopf
  bleibt – er ist eine Sicherung des eigenen Speichers, kein Weg zum
  Weitergeben, und hört nur auf, sich als einer anzubieten
* Projektdatei (Verzeichnis) und Hausmarke (Design) zeigen mit je einem Satz
  auf die Übersicht zurück

### Prüfung
* 2 neue Browserprüfungen (die Tafel samt den beiden Wegen dorthin; die
  Meldung beim Sichern, mit einer Ablage, die gelingt); zusammen 479

## [1.52.0] – `markieren.js` geteilt

Der dritte Befund der [Durchsicht](durchsicht.md), ohne neue Fähigkeit.

### Geändert
* **`markieren.js` ist in drei Dateien geteilt**: `markieren.js` (Editor,
  1 240 Zeilen), `strecke.js` (640) und `gliederung.js` (645, mit
  Deckungsmatrix, Rückweg aus Word und Fortschrittsblatt). Die Reihenfolge in
  der gemeinsamen Klammer bleibt dieselbe
* Jede der drei Dateien sagt im Kopf, woher sie kommt und was sie mit den
  anderen teilt – vor allem, dass `GLIEDERUNG` erst in `gliederung.js`
  entsteht und von früheren Modulen nur aus Funktionen heraus gelesen wird
* `app/build/build.mjs` kennt zwei Platzhalter mehr (`/*%STRECKE%*/`,
  `/*%GLIEDERUNG%*/`); der Riegel gegen doppelte Namen prüft dreizehn Module

### Behoben
* Die Architekturbeschreibung zählte **neun** Oberflächendateien (es sind
  dreizehn), nannte `ablage.js` als letzte Datei (es ist `ocr.js` seit
  1.40.0), kannte `output.js` und `ocr.js` nicht und sprach von **drei**
  Agenten (es sind vier seit 1.42.0)

### Prüfung
* Keine neuen Prüffälle. Die Teilung selbst ist stärker belegt als durch
  Prüfungen: `dist/index.html` war danach **zeichengleich** mit der Fassung
  davor (`diff` ohne Ausgabe). Erst die Kopfnoten ändern die Seite.
  Zusammen weiter 477

## [1.51.0] – Aufräumen: dreizehn Register in fünf Aufgaben

Keine neue Fähigkeit, sondern das Ergebnis einer
[Durchsicht](durchsicht.md) über 69 Funktionen in dreizehn Ansichten.

### Geändert
* **Die Navigation steht in fünf Aufgaben** (F-70): Bestand, Hereinholen,
  Aufbereiten, Ordnen und prüfen, Ausgeben – in der Reihenfolge, in der die
  Arbeit läuft. Keine Ansicht verschwindet, keine zieht um, die Adressen
  (`#ans=ocr`) gelten unverändert
* Der Schriftzug „Portal“ vor der Reihe ist entfallen; vor fünf Überschriften
  war er eine sechste, die nichts sagt
* **Design** und **Output** nennen ihre Teilung: Design richtet das Aussehen
  eines Blattes ein, Output erzeugt den Satz Dokumente daraus

### Behoben
* Die Begehung (F-49) kannte **Output** und **OCR** nicht – „jeder Befehl
  wird gedrückt“ galt für elf von dreizehn Ansichten. Jetzt für dreizehn

### Dokumentation
* `Dokumentation/durchsicht.md` – die Bestandsaufnahme: drei Befunde, sechs
  Verdachtsfälle auf tote Funktionen, und was bewusst nicht geändert wurde

### Prüfung
* Keine neuen Prüffälle; die Begehung deckt zwei Ansichten mehr ab und die
  Navigationsprüfung prüft die fünf Aufgaben mit. Zusammen weiter 477

## [1.50.0] – Stapelverarbeitung beim Import

### Neu
* **Stapel beim Import** (F-69): ganze Foliensätze in einem Durchgang statt
  Bild für Bild. Alle wählen über alle Dateien, **Stellen fortlaufend**
  entlang der Gliederung ab der gewählten Stelle, **Stellen aus dem
  Folientext**, Stellen leeren – und sechs Labelfelder (Sprache, Rolle,
  Sparte, Markt, Version, Land), die für den ganzen Durchgang gelten
* Der Kopf des Bandes sagt zugeklappt, was ansteht: „40 gewählt · 40 mit
  Stelle · 3 Label“

### Kern
* `folgendeStellen(gliederung, start, anzahl, { nurBlaetter })` – die
  folgenden Blätter der Gliederung in der Ordnung des Handbuchs
* `stelleAusText(gliederung, text)` – die Stelle zum Folientext; eine Nummer
  entscheidet, sonst braucht es mehr als die Hälfte der Themenwörter, sonst
  bleibt es leer

### Geändert
* Der Hinweis zu den Dateiformaten im Import steht nun hinter dem
  Stapel-Aufklapper; die Prüfung sucht ihn als direktes Kind der Ansicht

### Prüfung
* 2 neue Kernprüfungen, 4 neue Browserprüfungen; zusammen 477

## [1.49.0] – Hausmarke als Datei, Suche über die Lesungen

### Neu
* **Hausmarke sichern und laden** (F-67): das Erscheinungsbild allein als
  `hausmarke-….json` – Farben, Schrift, Logo, Sprache, Kopf- und Fußzeile,
  Deckblatt und die eigenen Vorlagen. Titel und Hinweis reisen nicht mit, das
  ist Inhalt
* **Die Suche im Eingang durchsucht die Lesungen** (F-68): „Termintreue“
  findet das Bild, auf dem das Wort steht. Eine Karte, deren Treffer nur aus
  der Lesung kommt, trägt die Marke „im Bildtext“

### Kern
* `markendateiAngaben`, `leseMarkendatei`, `markendateiBericht`,
  `MARKENDATEI_VERSION`
* `ocrSuchIndex`, `trefferAusLesung`; `filtereEingang` nimmt die Lesungen
  als drittes Argument

### Prüfung
* 2 neue Kernprüfungen, 2 neue Browserprüfungen; zusammen 471

## [1.48.0] – Die Sprache der Unterlagen

### Neu
* **Sprache der Unterlagen** (F-66) im Studio: Deutsch oder English für alle
  Texte, die die Seite selbst schreibt – Deckblatt, Kopf- und Fußzeile,
  Bildunterschriften, Handbuch (HTML und Word) und Fortschrittsblatt, samt
  `<html lang>` und Word-Titel
* Die Inhalte bleiben unangetastet: übersetzt wird der Rahmen, nicht das
  Erfasste

### Kern
* `AUSGABE_SPRACHEN`, `WORTE`, `sagen`, `seitenzahlText`; `sprache` in
  `deckblattZeilen`, `zeilenTeile`, `handbuchHtml`, `docxAusHandbuch`,
  `fortschrittText` und den Studio-Einstellungen

### Prüfung
* 2 neue Kernprüfungen, 1 neue Browserprüfung; zusammen 467

## [1.47.0] – Der Rückweg aus Word

### Neu
* **Texte aus Word zurücklesen** (F-65) in der Gliederung: Überschriften mit
  Nummer werden zu Stellen, die Absätze darunter zu ihrem Text,
  „Fertig, wenn: …“ zum Kriterium. Der Vergleich zeigt je Stelle geändert,
  unverändert oder nicht in der Gliederung – übernommen wird, was angekreuzt
  ist
* Übernommene Texte liegen als **eigene Texte** (`screenarchiv:texte`) über
  der Gliederung des Projekts und wirken im Handbuch, auf den Blättern und in
  der Ansicht; „Eigene Texte verwerfen“ nimmt sie zurück

### Geändert
* Die Ansicht Gliederung weist einen eigenen Text als solchen aus
* Blätter und Handbuch nehmen die Gliederung mit den eigenen Texten darüber

### Kern
* `leseStellentexte`, `schreibeStellentexte`, `gliederungMitTexten`,
  `docxAbsaetze`, `stellenAusDocx`, `vergleicheStellentexte`,
  `uebernimmStellentexte`, `TEXTE_SCHLUESSEL`

### Prüfung
* 3 neue Kernprüfungen, 1 neue Browserprüfung (Word-Datei bauen, einlesen,
  übernehmen, in der Gliederung nachsehen, verwerfen); zusammen 464

## [1.46.0] – Das Fortschrittsblatt

### Neu
* **Fortschrittsblatt** (F-64) in der Gliederung: je Kapitel ein Balken aus
  belegten Stellen, die Zahl der Bilder und eine wählbare zweite Achse
  (Sprache, Rolle, Sparte, Markt, Version, Land) – A4 quer, 300 dpi, als PNG
  oder PDF zu sichern
* Alle Kapitel kommen aufs Blatt; statt zu kürzen wird die Schrift kleiner

### Kern
* `fortschrittDaten`, `fortschrittText`

### Prüfung
* 1 neue Kernprüfung, 1 neue Browserprüfung (sie misst die Maße des Blattes
  und sieht nach, dass es gezeichnet ist); zusammen 460

## [1.45.0] – Die Projektdatei

### Neu
* **Projektdatei** (F-63) im Register Verzeichnis: ein ZIP mit Aufnahmen,
  Strecken, Projekten, Studio-Einstellungen, Wortliste, Lesungen und allen
  Bildern in voller Auflösung – zum Weitergeben an einen Kollegen oder auf
  einen anderen Rechner
* Einlesen wahlweise **ergänzend** (doppelte Kennungen werden umbenannt, die
  Strecken des Pakets mitgeschrieben) oder **ersetzend**; der Bericht nennt,
  was ankam und was umbenannt wurde
* Die Vorschauen liegen nicht im Paket – sie werden beim Einlesen aus dem
  vollen Bild neu gerechnet

### Kern
* `paketAngaben`, `lesePaketAngaben`, `paketBildname`, `paketBildschluessel`,
  `fuehrePaketZusammen`, `streckenMitNeuenKennungen`, `paketBericht`,
  `PAKET_VERSION`, `PAKET_NAME`

### Prüfung
* 3 neue Kernprüfungen, 2 neue Browserprüfungen (darunter ein vollständiger
  Umlauf: schreiben, in einem leeren Browser einlesen, Bilder und
  Datenbank nachsehen); zusammen 458

## [1.44.0] – Die Hausmarke

### Neu
* **Hausmarke** (F-62) im Designstudio: Akzentfarbe, Textfarbe, Schrift und
  Logo gelten für alle Blätter und Deckblätter; ohne Angabe gilt das Aussehen
  der Anwendung, „Hausmarke zurücksetzen“ stellt es wieder her
* Das Logo wird als Datei übernommen (PNG, JPEG, SVG, WebP bis 200 kB) und
  eingebettet – die Seite lädt nichts von außen; es steht oben rechts auf dem
  Deckblatt

### Geändert
* Die Zeichenfunktionen des Studios fragen `designFarbe` und
  `designSchriftart` statt der Token der Seite; die Festbreitenschrift bleibt
  unangetastet, damit Kennungen und Zahlen untereinander stehen

### Kern
* `leereHausmarke`, `leseHausmarke`, `markenSchrift`, `MARKEN_SCHRIFTEN`,
  `LOGO_GRENZE`; `marke` in den Studio-Einstellungen

### Prüfung
* 2 neue Kernprüfungen, 2 neue Browserprüfungen (darunter eine, die die Farbe
  im gezeichneten Blatt Punkt für Punkt nachmisst); zusammen 453

## [1.43.0] – Das Handbuch als Word-Datei

### Neu
* **„Handbuch als Word sichern“** (F-61): das ganze Handbuch als `.docx` mit
  echten Überschriften (Heading 1–3 mit `outlineLvl`), den Texten der
  Gliederung als Absätzen und den Bildern inline samt Bildunterschrift –
  Text bleibt Text, nicht ein Bild einer Seite
* Der Schalter „Texte aus dem Handbuch“ und die Bildgröße aus dem Studio
  wirken auch auf die Word-Datei

### Kern
* `docxAusHandbuch` samt Formatvorlagen (`styles.xml`)

### Prüfung
* 1 neue Kernprüfung, 1 neue Browserprüfung; zusammen 449. Das Ergebnis wurde
  zusätzlich mit LibreOffice geöffnet und nach PDF gewandelt

## [1.42.0] – Der Agent Sprache

### Neu
* **Vierter Agent „Sprache“** (F-60): prüft Titel, Notiz, Begriffe,
  Schritttexte und die Lesungen aus dem Register OCR gegen eine Wortliste,
  findet uneinheitliche Schreibweisen und Texte, die nicht zur Sprache ihres
  Labels passen
* **Wortliste in der Ansicht**: eine Regel je Zeile (`falsch -> richtig (de)`),
  änderbar, gespeichert in `screenarchiv:woerter`, mit „Vorgabe
  wiederherstellen“

### Geändert
* Aus drei Agenten werden vier – die Meldung zählt sie jetzt, statt „Drei“ zu
  behaupten
* `fuehreAgent` nimmt ein fünftes Argument (Wortliste, Lesungen); die
  übrigen Agenten übergehen es

### Kern
* `pruefeSprache`, `spracheDesTextes`, `schreibweisen`, `leseWortliste`,
  `schreibeWortliste`, `wortlisteAusText`, `wortlisteAlsText`,
  `STANDARD_WORTLISTE`, `WORTLISTE_SCHLUESSEL`

### Prüfung
* 4 neue Kernprüfungen, 1 neue Browserprüfung; zusammen 447

## [1.41.0] – Bildvergleich: was sich geändert hat

### Neu
* **Bildvergleich** (F-59) im Projektvergleich: jede Zeile „in beiden“ öffnet
  vorher, nachher und den Unterschied – das zweite Bild mit roten Rahmen um
  die veränderten Bereiche, darüber Anteil, Zahl der Bereiche und ein Urteil
* Verschiedene Maße und weitere Bilder an derselben Stelle werden genannt,
  nicht übergangen; der Vergleich lässt sich als PNG sichern

### Kern
* `bildUnterschied`, `unterschiedText`, `vergleichsPaare`,
  `VERGLEICH_RASTER`, `VERGLEICH_SCHWELLE`

### Prüfung
* 5 neue Kernprüfungen, 1 neue Browserprüfung; zusammen 442

## [1.40.0] – Register OCR: den Text aus den Bildern holen

### Neu
* **Register OCR** (F-58): Bilder wählen, „Text erkennen“, Text im Feld
  ändern – und als Textdatei oder Word-Datei (echter Text, kein Bild)
  sichern oder in die Notiz der Aufnahme übernehmen
* Gelesen wird über **Claude** (`sample` mit `images`); große Bilder werden
  in waagerechte, überlappende Kacheln zerlegt, weil jedes gesendete Bild auf
  rund 1,2 Megapixel verkleinert wird
* Die Lesungen liegen in `screenarchiv:ocr` und überleben das Neuladen; ohne
  die Fähigkeit bleibt die Ansicht als Schreibfläche brauchbar

### Kern
* `OCR_SCHLUESSEL`, `OCR_VERSION`, `OCR_GRENZE`, `ocrKacheln`,
  `ocrAufforderung`, `leseOcr`, `schreibeOcr`, `ocrZusammenfuegen`,
  `ocrAlsText`, `docxAusText`

### Geändert
* Neues Oberflächenmodul `ocr.js`; der Start steht jetzt in dessen letzter
  Zeile (vorher `output.js`)

### Prüfung
* Neue Datei `21-ocr.e2e.mjs` (5 Fälle), 4 neue Kernprüfungen; zusammen 436

## [1.39.0] – Register Output und die Lupe

### Neu
* **Register Output** (F-56): Vorlage × Inhalt × Variante ergibt je ein
  Dokument – mit Vorschau, Kapitel, Labels und den Formaten PDF, Word,
  PowerPoint und HTML; „In den Ordner schreiben“ legt alles unter
  `output/<Variante>/<Vorlage>/` ab
* Die Inhalte stehen **nach Kapiteln geordnet** zur Wahl; die Achse ist jedes
  Labelfeld samt Bildzahl je Wert
* **Die Lupe** (F-57) auf jeder Bildkarte: ein eigenes Fenster mit dem Bild in
  voller Auflösung und vier Abschnitten – Text, Kapitel (mit dem Weg von
  oben), Labels und Rezept (Quelle, Ausschnitt, Einfuhr, Bearbeitungen,
  Schritte in Strecken)

### Kern
* `zipSchreiben`, `docxAusSeiten`, `pptxAusSeiten`
* `ausgabePlan`, `ausgabeBilder`, `ausgabeInhaltName`, `ausgabeDateiname`,
  `ausgabeOrdner`, `ausgabeUmfang`, `AUSGABE_FORMATE`
* `bildRezept`, `kapitelPfad`, `QUELLEN_NAMEN`; `ANSICHTEN` kennt `output`

### Geändert
* Neues Oberflächenmodul `output.js`; der Start steht jetzt in dessen letzter
  Zeile (vorher `ablage.js`)
* Die Prüfung der externen Quellen lässt die XML-Namensräume von Word und
  PowerPoint zu – Namen, keine Adressen

### Prüfung
* Neue Datei `20-output.e2e.mjs` (7 Fälle), 7 neue Kernprüfungen; zusammen 426
* Das Ziehen im Schnipsel-Modus scrollt die Leinwand ins Bild: der Kopf ist
  seit 1.36.0 eine Zeile höher

## [1.38.0] – PDF aus den Blättern

### Neu
* **Als PDF sichern** (F-55) im Designstudio: die Blätter in einer Datei, A4
  und 300 dpi, von der Seite selbst gebaut – ohne fremde Bibliothek, ohne
  Druckdialog. Die JPEG-Blätter wandern unverändert in den Datenstrom

### Geändert
* „Als HTML zum Drucken“ heißt in der Meldung jetzt, wozu es gut ist: ansehen
  und drucken – das fertige PDF gibt der neue Knopf

### Kern
* `pdfAusSeiten`

### Prüfung
* 3 neue Kernprüfungen (Aufbau, Objekttabelle, leere Eingaben), 1 neue
  Browserprüfung; zusammen 413

## [1.37.0] – Projektvergleich: was ist neu in 2.4?

### Neu
* **Projektvergleich** (F-54) in der Ansicht Prüfung: zwei Projekte
  nebeneinander, eine Zeile je Stelle der Gliederung mit „neu“, „entfallen“
  oder „in beiden“ und den Bildzahlen beider Fassungen
* Ein Klick auf die Stelle führt in die Gliederung; was ohne Stelle ist, wird
  gezählt genannt statt verschwiegen
* **Als Text sichern**: `projektvergleich-JJJJ-MM-TT.txt` mit den drei Blöcken
  „Neu in …“, „Nur in …“ und „In beiden“ – der Entwurf eines Releaseletters

### Kern
* `vergleicheProjekte`, `vergleichAlsText`

### Prüfung
* 2 neue Kernprüfungen, 3 neue Browserprüfungen; zusammen 409

## [1.36.0] – Die Arbeitsmenge: in einem Projekt arbeiten

### Neu
* **Arbeitsmenge im Kopf** (F-52): ein Auswahlfeld neben der Navigation mit
  „alle Projekte“, jedem Projekt samt Bildzahl und „ohne Projekt“. Die Wahl
  gilt in Eingang, Gliederung, Editor, Strecke, Design, Prüfung, Verzeichnis
  und Suchchat – gezeigt wird weniger, gelöscht wird nichts
* „Nur dieses“ in der Projektliste schaltet direkt um; die Wahl überlebt das
  Neuladen und bleibt sichtbar, auch wenn das Projekt gelöscht wurde
* **Version und Land als Labelfeld und Variantenachse** (F-53): beide stehen
  im Labelblock des Editors, sind Spaltenachse der Deckungsmatrix („welche
  Stelle gibt es in 2.4, welche nur in 2.3?“) und wählbare Variante im
  Designstudio

### Geändert
* Die Kachel „Bilder zugeordnet“ in der Gliederung zählt die Arbeitsmenge und
  sagt das auch („von 2 in der Arbeitsmenge“)
* Der leere Eingang und der leere Verzeichnisplan nennen die Arbeitsmenge als
  Grund, statt „keine Aufnahme“ zu behaupten
* Das im Editor offene Bild bleibt in seiner Auswahlliste, auch wenn es nicht
  zur Arbeitsmenge gehört

### Kern
* `projektFilter`, `leseProjektwahl`, `projektWahlText`; `schreibeProjekte`
  nimmt die Wahl als zweiten Wert
* `version` und `land` in `LABEL_FELDER` und `VARIANTEN_FELDER`

### Prüfung
* 4 neue Kernprüfungen, 4 neue Browserprüfungen; zusammen 404

## [1.35.0] – Projekte nach Version und Land

### Neu
* **Projekte anlegen** (F-51): ein Projekt ist ein Dreiklang aus Name,
  Version und Land – angelegt, nicht getippt. Der Block „Projekte“ im
  Aufnahmeformular zeigt die Liste, zählt die Bilder je Projekt, setzt mit
  einem Klick alle drei Werte für die nächsten Aufnahmen und löscht ein
  Projekt, ohne seine Bilder mitzunehmen
* **Version und Land** als Felder im Aufnahmeformular und im Eingangsdialog;
  beide sind Teil des Suchtextes
* Projekte, die an Bildern stehen, aber nicht angelegt sind, werden als
  Vorschlag „aus dem Bestand“ gezeigt und auf Klick übernommen
* Beim Anlegen wird geprüft: ohne Namen kein Projekt, eine Version von mehr
  als 20 Zeichen ist keine, und dieselben drei Teile gibt es nur einmal

### Geändert
* Das Verzeichnismuster kennt `{version}` und `{land}`; was fehlt, heißt
  `ohne-version` bzw. `ohne-land`
* `index.json` und `index.csv` führen beide Felder als eigene Spalten
* Der Beipackzettel trägt zwei neue Zeilen (`version`, `land`) – 21 Felder
  statt 19, die Zettelversion bleibt

### Kern
* `PROJEKTE_SCHLUESSEL`, `PROJEKTE_VERSION`, `projektSatz`,
  `projektKennzeichen`, `projektKennung`, `pruefeProjekt`, `leseProjekte`,
  `schreibeProjekte`, `zaehleJeProjekt`, `projekteAusBestand`
* `version` und `land` in `leereAufnahme`, `baueAufnahme`,
  `eingangSuchIndex`, `VERZEICHNIS_FELDER`, `verzeichnisPfad`,
  `galerieIndex`, `galerieCsv`, `baueBeipackzettel`, `BEIPACK_FELDER`

### Prüfung
* Neue Datei `19-projekte.e2e.mjs` mit 7 Browserprüfungen; 5 neue
  Kernprüfungen; zusammen 396

## [1.34.0] – Begehung und Leistung: die Decke steigt von 135 auf 10 800

### Neu
* **Begehung** (F-49): eine Prüfung drückt jeden sichtbaren Befehl in jeder
  Ansicht – über 90 – und achtet auf Seitenfehler, Konsolenfehler und eine
  Seite, die nicht mehr antwortet; dazu die zerstörenden Befehle und die
  Tastaturbefehle

### Geändert
* **Die Vorschauen liegen in der Browserdatenbank** (F-50), der
  `localStorage` trägt nur noch die Metadaten: 502 Byte statt 37,9 kB je
  Aufnahme, also rund **10 800 statt 135** Aufnahmen. Beim Start kommen sie
  in einem Vorgang zurück; ein älterer Stand zieht beim nächsten Sichern um
* Speicherformat `version: 2` mit `vorschauen: "datenbank"`
* `zaehleBilder` summiert von unten nach oben – bei 1000 Bildern 15-mal
  schneller; `eingangSuchIndex` merkt sich den Suchtext je Satz – Filtern
  2,4-mal schneller
* Fehlt eine Vorschau für einen Augenblick, steht ein Platzhalter statt eines
  kaputten Bildes

### Kern
* `offeneVorschauen`, `PLATZHALTER_BILD`; `schreibeEingang` lässt die
  Vorschauen draußen, `leseEingang` nimmt Sätze ohne Bild an

### Prüfung
* Neue Datei `18-begehung.e2e.mjs`; 2 neue Kernprüfungen (Zählung, Suchtext),
  1 neue Browserprüfung (Speicher und Rückkehr der Vorschauen); zusammen 383

## [1.33.0] – Labels ab der Aufnahme, Stelle zum Auswählen

### Neu
* **Labels im Aufnahmeformular** (F-48): Sprache, Rolle, Sparte und Markt
  schon beim Aufnehmen; sie gelten für jede weitere Aufnahme, bis sie
  geändert werden
* Dieselben Labels **und die Stelle im Handbuch** im Eingangsdialog
* **Kapitel → Unterkapitel → Stelle als Auswahlfelder** im Editor und im
  Import – jedes mit Nummer und Namen, gefiltert nach der Ebene darüber. Das
  Textfeld bleibt daneben; beide Wege halten sich aktuell
* **Ein Zeichen je Wert**: Dealer, Market, HQ, MO, PC und Van haben ihr
  eigenes Symbol – im Feld, in den Teilschritten und in der Labelmarke im
  Bild (gezeichnet aus demselben SVG-Vorrat wie die Oberfläche)

### Geändert
* Die Sparten heißen **PC** und **Van** (Kennung bleibt `pkw`); im Verzeichnis
  heißt der Ordner damit `pc/` statt `pkw/`
* Die Suche kennt die gebräuchlichen Namen: `Pkw`, `Passenger Cars`,
  `Händler`, `Zentrale`, `Landesgesellschaft`, `Marktorganisation`
* Der Suchchat liest eine Frage, die **genau eine Stelle** der Gliederung
  nennt, als diese Stelle – „Market Settings" ist das Kapitel, nicht die Rolle
* Die Nummern von Hand im Editor stehen hinter einem Aufklapper

### Kern
* `stelleTeile`, `gliederungEbene`, `stelleLabel`, `symbolZuLabel`; Labels und
  Stelle in `leereAufnahme` und `baueAufnahme`; `alias` und `lang` in den
  Vokabularen

### Prüfung
* 4 neue Kernprüfungen, 5 neue Browserprüfungen; zusammen 376

## [1.32.1] – Dokumentation nachgezogen

### Geändert
* `architektur.md`: alle neun Oberflächenmodule, der Riegel gegen doppelte
  Namen, wo die Daten des Betrachters liegen und was Claude in der Seite tut
* `datenmodell.md`: die Felder, die seit 1.9.0 dazukamen (Herkunft, Marken,
  Fassungen, volle Auflösung, Gliederung, Labels, Einfuhr, Variante), die
  weiteren Schlüssel im Browser und der Aufbau der Gliederungsdatei

## [1.32.0] – Das ganze Handbuch als ein Dokument

### Neu
* **Handbuch-Export** (F-47): die ganze Gliederung in einem Stück – Titel,
  Stand, Inhaltsverzeichnis mit Sprungmarken, je Stelle die Texte des
  Handbuchs, die Bilder und die Anweisungen der Strecke, die sie erzählt
* **Umfang wählbar**: alle Stellen mit Bildern, die ganze Gliederung samt
  leeren Stellen, oder nur das gewählte Kapitel – die Zahl steht vor dem
  Rechnen da
* **Bildgröße wählbar**: voll (PNG) oder auf 1600/2400 px begrenzt (JPEG);
  wird die Datei zu groß für die 16-MB-Grenze, sagt die Meldung den Ausweg
* Ausgabe als HTML mit `@page A4` und Seitenumbruch je Kapitel, ohne jeden
  Verweis nach außen – der Browser macht daraus das PDF
* Die Sichtprüfung erzeugt das Handbuch mit und legt ein Bild davon ab

### Kern
* `handbuchTeile`, `handbuchUmfang`, `handbuchHtml`, `streckeFuerStelle`

### Prüfung
* 4 neue Kernprüfungen, 1 neue Browserprüfung; zusammen 367

## [1.31.0] – Symbole, Sichtprüfung und drei Behebungen

### Neu
* **Symbole in der Portalnavigation**: jede der elf Ansichten trägt ihr
  Zeichen – im selben Strichstil wie die Labelsymbole, als Teil des
  eingebetteten SVG-Vorrats (keine Datei von außen)
* Die **Sichtprüfung** (`node Testing/schuss.mjs`) deckt nun auch Import,
  Prüfung, Verzeichnis, Suchchat und Deckungsmatrix ab – 36 Bilder

### Behoben
* **Prüfung und Verzeichnis standen außerhalb der Seite**: beide Abschnitte
  lagen hinter dem Seitenfuß und damit ohne Breitenbegrenzung und Rand. Sie
  stehen jetzt bei den übrigen Ansichten
* **„null" in der Importkarte**: eine leere Stelle wurde als Wort angezeigt,
  weil `append(null)` die Zeichenfolge schreibt. Die Karte sammelt ihre Teile
  jetzt und wirft die leeren weg; eine Prüfung hält das fest
* Der **Suchchat** öffnet sich unten rechts statt über dem Kopf, und sein
  Knopf bleibt rechts, auch wo die Archivsuche daneben fehlt

## [1.30.0] – Varianten: dieselbe Maske in jeder Sprache

### Neu
* **Variantengruppen** (F-46): im Editor lassen sich Aufnahmen verbinden, die
  dieselbe Maske in anderer Sprache, Rolle, Sparte oder Markt zeigen. Der
  Block zeigt die Gruppe, öffnet ihre Mitglieder und nennt, welche Werte des
  Bestands ihr noch fehlen
* **Deckungsmatrix** in der Gliederung: Stelle × Wert, umschaltbar nach
  Sprache, Rolle, Sparte, Markt – mit Summen, Spalte „ohne“ und dem Stand,
  wie viele Stellen vollständig belegt sind. Ein Klick auf eine Zelle öffnet
  das erste Bild
* **Ausgabe in einer Variante** im Designstudio: dieselbe Strecke in einer
  anderen Sprache; fehlende Entsprechungen bleiben stehen und werden genannt.
  Bei einem Kapitel wirkt die Wahl als Filter

### Kern
* `VARIANTEN_FELDER`, `neueVariantengruppe`, `variantengruppe`,
  `variantenVon`, `verbindeVarianten`, `loeseVariante`, `findeVariante`,
  `fehlendeVarianten`, `deckungsMatrix`, `streckeInVariante`

### Prüfung
* Neue Datei `17-varianten.e2e.mjs`; 4 neue Kernprüfungen, 5
  Browserprüfungen, zusammen 362

## [1.29.0] – Verzeichnis: die Galerie auf die Platte

### Neu
* Neue Ansicht **Verzeichnis** (F-45): die ganze Galerie in einen lokalen
  Ordner – Bilder in voller Auflösung (mit Beipackzettel im PNG), Zettel
  daneben, `index.json`, `index.csv`, `strecken.json` und je Strecke der
  Prozess als BPMN unter `prozesse/`
* Die Ordnung entsteht aus einem **Muster**:
  `{sparte}/{sprache}/{kapitel}/{rolle}/{datum}_{kennung}_{titel}` – dazu
  `markt, thema, jahr, monat, projekt, kategorie`. Unterordner entstehen beim
  Schreiben; was fehlt, heißt `ohne-sprache` statt zu verschwinden
* **Erst der Plan, dann die Datei**: die Vorschau zeigt jeden Pfad, bevor
  etwas entsteht; gleiche Pfade bekommen eine Nummer
* Zuschaltbar: jüngste Fassung statt Original, Zettel, Übersicht, Strecken
* Eine Datei, die scheitert, hält die übrigen nicht auf – der Bericht nennt,
  was liegt und was fehlte

### Kern
* `VERZEICHNIS_SCHLUESSEL`, `VERZEICHNIS_MUSTER`, `VERZEICHNIS_FELDER`,
  `leereVerzeichnisWahl`, `leseVerzeichnisWahl`, `schreibeVerzeichnisWahl`,
  `verzeichnisPfad`, `verzeichnisPlan`, `galerieIndex`, `galerieCsv`,
  `verzeichnisBericht`

### Prüfung
* Neue Datei `16-verzeichnis.e2e.mjs` mit nachgebildetem Ordnerzugriff samt
  Unterordnern; 5 neue Kernprüfungen, 6 Browserprüfungen, zusammen 353

## [1.28.0] – Designstudio vollständig

### Neu
* **Deckblatt** zuschaltbar (F-44): Titel, Untertitel, die Angaben als Paare
  und der Hinweis unten; es steht vor den Seiten und geht in beide Ausgaben
* **Kopf- und Fußzeile aus wählbaren Teilen**: Titel, Stelle im Handbuch,
  Projekt, Vorlage, Seitenzahl – Herkunft, Stand, Labels, eigener Hinweis
* **Eigene Vorlagen**: Name, Spalten, Zeilen, Textspalte, Textlänge, Format;
  sie stehen neben den eingebauten in der Auswahl
* Titel, Untertitel und Hinweis als Felder – sie gelten für Deckblatt,
  Kopf- und Fußzeile
* Alle Einstellungen des Studios bleiben erhalten (`screenarchiv:design`)

### Geändert
* Der Build bricht ab, wenn zwei Oberflächenmodule denselben Namen erklären –
  in einer gemeinsamen Klammer gewinnt sonst die spätere Erklärung stumm, und
  die früheren Aufrufe laufen in die falsche Funktion

### Behoben
* `zeichneStudio` gab es zweimal (Aufnahme und Design); seit dem Namen
  `zeichneStudioeinstellungen` ist die Aufnahme wieder auslösbar
* Die Meldung nach „Vorlage speichern“ wird nicht mehr von der Meldung des
  Neuzeichnens überschrieben

### Kern
* `DESIGN_SCHLUESSEL`, `KOPF_TEILE`, `FUSS_TEILE`,
  `leereDesignEinstellungen`, `leseDesignEinstellungen`,
  `schreibeDesignEinstellungen`, `eigeneVorlage`, `alleVorlagen`,
  `vorlageAus`, `zeilenTeile`, `deckblattZeilen`, `gemeinsameLabels`

### Prüfung
* 5 neue Kernprüfungen, 3 neue Browserprüfungen in `12-design.e2e.mjs`;
  zusammen 342

## [1.27.0] – Drei Agenten: roter Faden, Audit, Empfehlung

### Neu
* Neue Ansicht **Prüfung** mit drei Agenten (F-43), die nach Regeln prüfen:
  **Roter Faden** (Folge, Lücken, Sprünge, gemischte Sprachen und Rollen),
  **Audit** (Vollständigkeit, Auflösung, Labels, doppelte Titel, verwaiste
  Verweise, Hinweis auf personenbezogene Daten ohne Abdeckung) und
  **Empfehlung** (was als nächstes zu tun ist, nach Gewicht sortiert)
* Jeder Befund nennt **Art, Gewicht, betroffene Bilder und den Weg dorthin**;
  eine Kennung öffnet das Bild im Editor
* **Bericht sichern** als Textdatei mit allen gelaufenen Agenten
* **Claude kommentiert** den fertigen Bericht, wenn `sample` da ist – als
  Kommentar gekennzeichnet, nach den Befunden, nie an ihrer Stelle

### Kern
* `AGENTEN`, `PRUEF_GRENZEN`, `pruefeFaden`, `pruefeAudit`, `empfehlungen`,
  `fuehreAgent`, `berichtAlsText`, `vergleicheKapitel`

### Prüfung
* Neue Datei `15-pruefung.e2e.mjs`; 7 neue Kernprüfungen, 6 Browserprüfungen,
  zusammen 334

## [1.26.0] – Suchchat: nach Bildern fragen

### Neu
* **Suchchat** (F-42) als frei bewegliches Fenster über jeder Ansicht:
  ziehen, in der Größe ändern, Lage bleibt erhalten; Escape schließt
* Die Frage wird in der Seite gedeutet: Rolle, Sparte, Sprache, Markt,
  Stelle der Gliederung, Anzahl („die letzten 5“) und Eigenschaften wie
  `unkenntlich`, `aus dem Import`, `ohne Stelle`. Der Rest ist Textsuche
* Die Antwort **nennt ihre Deutung** und zeigt die Treffer als Vorschauen –
  jede mit dem Weg weiter: Editor oder an die offene Strecke
* Fünf Beispielfragen als Knöpfe; ein Klick genügt
* **Claude darf deuten, nicht antworten**: steht `sample` zur Verfügung,
  übersetzt Claude die Frage in denselben Filter; gefiltert wird in der Seite.
  Ohne die Fähigkeit bleibt die Deutung der Seite

### Kern
* `deuteFrage`, `findeBilder`, `chatAntwortText`, `leseChatlage`,
  `schreibeChatlage`, `haltImBild`, `CHAT_BEISPIELE`, `CHAT_FELDER`

### Prüfung
* Neue Datei `14-chat.e2e.mjs`; 4 neue Kernprüfungen, 6 Browserprüfungen,
  zusammen 321

## [1.25.0] – Strecke: parallel, lückenlos, als Prozess

### Neu
* Ein Schritt kann **mehrere Bilder parallel** tragen (F-40): im Blatt als
  `3a`, `3b` gezählt, im Prozess eine parallele Teilung
* **Platzhalter** für fehlende Bilder (F-40): sie stehen in der Folge, im
  Text als `[Bild fehlt]` und im Blatt als gestrichelter Rahmen. Ohne
  Beschreibung gelten sie als unfertig; mit Bild werden sie zum Schritt
* **Prozess aus der Strecke als BPMN 2.0** (F-41) – mit Diagrammteil, also
  im fremden Werkzeug gelegt statt leer. Dazu derselbe Prozess als **Bild**
  und eine Vorschau in der Ansicht
* Jede Aufgabe trägt `bpmn:documentation` mit Aufnahmekennung und Stelle im
  Handbuch; Freitext wird maskiert

### Geändert
* Ein Streckenschritt ist jetzt `{ art, aufnahmen: [...], text }`; abgelegte
  Strecken des alten Satzes (`aufnahme`) wandern beim Lesen mit
* `blattRaster` kennt Marken und Platzhalter; eine leere Kachel bekommt das
  Seitenverhältnis eines Bildschirms, damit die Zeile nicht einbricht

### Kern
* `platzhalterSchritt`, `fuegeParallelHinzu`, `entferneParallel`,
  `schrittMarke`, `blattBilder`, `BPMN_MASSE`, `bpmnAufbau`, `streckeAlsBpmn`

### Prüfung
* 4 neue Kernprüfungen, 3 neue Browserprüfungen in `10-strecke.e2e.mjs`;
  zusammen 311

## [1.24.0] – Import: aus bestehenden Dateien wird Galerie

### Neu
* Neue Ansicht **Import** (F-39): **PNG, JPEG, GIF, WebP** unmittelbar,
  **PPTX, DOCX, XLSX** als Archiv, **PDF** mit seinen eingebetteten
  JPEG-Bildern. Wählen oder hierher ziehen
* Bei einer Präsentation steht jedes Bild **an seiner Folie** – gelesen aus
  der Beziehungsdatei der Folie –, der Text der Folie wird zum **Rezept**
* Je Bild: Titel aus dem Dateinamen, Rezept, Stelle im Handbuch (einzeln oder
  für alle), Haken zum Wählen, **Lupe auf volle Auflösung**
* Übernommene Bilder gehen in den Eingang: Vorschau in den Browserspeicher,
  volles Bild in die Datenbank; `einfuhr` hält Datei, Art, Bildname und Folie
* Was nicht geht, steht da: ganze PDF-**Seiten** zu zeichnen braucht einen
  PDF-Zeichner, den die Inhaltsrichtlinie nicht zulässt; EMF und WMF werden
  genannt und übergangen; `.ppt`, `.doc`, `.xls` sind keine Archive

### Kern
* `leseZipVerzeichnis`, `entpackeZipEintrag`, `officeBilder`, `officeFolien`,
  `medienAusRels`, `officeText`, `pdfBilder`, `dateiArt`, `bildTyp`,
  `natuerlich`, `importTitel` – das Auspacken läuft ohne DOM und ist prüfbar

### Prüfung
* Neue Hilfe `Testing/hilfen/dateien.mjs`: baut PNG, ZIP, PPTX, DOCX und PDF
  im Test selbst – es liegt keine Beispieldatei im Repo
* Neue Datei `13-import.e2e.mjs`; 17 neue Prüfungen, zusammen 304

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
