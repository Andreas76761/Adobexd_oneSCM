# Durchsicht 1.50.0 – 69 Funktionen in dreizehn Ansichten

Stand 2026-10-19, nach F-69. Diese Seite ist keine Funktion, sondern eine
Bestandsaufnahme: **was gehört zusammen, was liegt an der falschen Stelle,
was ist wahrscheinlich tot** – geschrieben, bevor die nächste Funktion
dazukommt.

## Was hier *nicht* drinsteht

**Es gibt keine Nutzungsdaten.** Die Seite zählt nichts und schickt nichts
weg; das ist Absicht (sie läuft in einem Artifact, ohne Netz). Jedes Urteil
„selten benutzt“ unten ist darum **aus der Struktur** geschlossen, nicht
gemessen:

* Wie viele Klicks führen dorthin?
* Hat eine jüngere Funktion dieselbe Aufgabe besser gelöst?
* Steht sie noch im Dienst des Zwecks (Handbuch, Releaseletter, One Pager,
  Quick Guide) – oder im Dienst des Zwecks von 1.0 (Belegarchiv)?

Wo das nicht reicht, steht es als Frage da, nicht als Befund.

## Der Bestand in Zahlen

| | |
| --- | --- |
| Funktionen (F-01 … F-69) | 69 |
| Ansichten in der Navigation | 13 |
| Kernlogik `core.mjs` | 7 000 Zeilen, ohne DOM |
| Oberflächenmodule | 11, zusammen 9 700 Zeilen |
| Prüfungen | 477 |

## Die dreizehn Ansichten in fünf Aufgaben

Die Navigation zeigt dreizehn gleich aussehende Knöpfe in einer Reihe. Dreizehn
ist genau die Zahl, bei der eine Reihe aufhört, eine Reihe zu sein: man liest
sie nicht mehr, man sucht in ihr. Dabei fallen sie sauber in fünf Aufgaben –
die Reihe sagt es nur nicht.

| Aufgabe | Ansichten | |
| --- | --- | --- |
| **Bestand** | Archiv, Eingang | was da ist |
| **Hereinholen** | Aufnahme, Import, Ausschneiden | wie Bilder hereinkommen |
| **Aufbereiten** | Editor, Strecke, OCR | was mit einem Bild geschieht |
| **Ordnen und prüfen** | Gliederung, Prüfung | wo es hingehört, und ob es stimmt |
| **Ausgeben** | Design, Output, Verzeichnis | was herauskommt |

Das ist der **erste Befund** und die einzige Änderung, die diese Durchsicht
unmittelbar nach sich zieht: die Navigation bekommt diese fünf Überschriften.
Keine Ansicht verschwindet, keine zieht um – die Reihe wird nur lesbar.

## Drei Paare, die man für Doppelungen hält

### Design und Output

Beide zeigen eine Vorschau, beide sichern PDF und Word. Sie sind trotzdem
nicht dasselbe:

| | Design | Output |
| --- | --- | --- |
| Gegenstand | **ein** Blatt | **ein Satz** Dokumente |
| Frage | Wie sieht es aus? | Welche Fassungen brauche ich? |
| Ergebnis | eine Datei, die man ansieht | ein Ordner, den man weitergibt |

Design richtet das Aussehen ein (Vorlage, Farbe, Schrift, Logo, Sprache),
Output wendet es auf alle Varianten an. Die Teilung bleibt – sie war bisher
nur nirgends aufgeschrieben. **Das steht jetzt hier.**

### Verzeichnis und Output

Verzeichnis schreibt **Bilder** auf die Platte (Namensmuster, Unterordner),
Output schreibt **Dokumente** – und zwar in dasselbe Verzeichnis. Richtig so;
ein zweiter Ordnerzugriff wäre eine Zumutung.

### Ausschneiden und Verzeichnis

Beide greifen auf einen Ordner zu. Ausschneiden legt beim Aufnehmen ab,
Verzeichnis am Ende. Derselbe Zugriff, zwei Zeitpunkte. Kein Grund zu
handeln, aber der Grund, warum der Ordnerzugriff in der Datenbank liegt
(`zugriffe`) und nicht in einer Ansicht.

## Vier Wege, den Bestand weiterzugeben – in drei Ansichten

Das ist der **zweite Befund**, und der unangenehmste:

| Weg | Seit | Liegt in | Enthält |
| --- | --- | --- | --- |
| Eingang als JSON (F-22) | 1.x | Eingang | Metadaten, keine Bilder |
| Kontaktbogen (F-23) | 1.x | Eingang | eine HTML-Datei zum Verschicken |
| Projektdatei (F-63) | 1.45.0 | Verzeichnis | **alles**: Bilder, Strecken, Gliederungstexte, Hausmarke, Lesungen |
| Hausmarkendatei (F-67) | 1.49.0 | Design | nur das Aussehen |

Die Projektdatei kann, was „Eingang als JSON“ kann, und mehr. Der
Kontaktbogen kann etwas, was keine der anderen kann (ohne diese Seite
lesbar sein) – der bleibt.

**Vorschlag, nicht umgesetzt:** „Eingang als JSON sichern“ als Weg zum
Weitergeben zurücknehmen und als das benennen, was es noch ist – eine
Sicherung des eigenen Speichers. Nicht umgesetzt, weil der Knopf seit 1.0
dort steht und jemand ihn in einer Anleitung stehen haben könnte. Das ist
genau der Fall, in dem Nutzungsdaten fehlen.

> **Erledigt in 1.53.0 (F-71)** – auf dem dritten Weg: der Knopf bleibt, und
> eine Übersicht im Eingang sagt, was jeder der vier Wege kann. „Als JSON
> sichern“ meldet beim Sichern mit, dass keine Bilder mitgehen. Nicht
> wegnehmen, sondern aufhören, es als etwas anzubieten, das es nicht ist.

## Was wahrscheinlich tot ist

Sechs Verdachtsfälle, nach Härte des Verdachts geordnet. Keiner wird in
dieser Fassung entfernt – entfernt wird, was nachweislich niemand braucht,
und dieser Nachweis fehlt.

| | Funktion | Der Verdacht |
| --- | --- | --- |
| 1 | **F-08 Kennzahlenvergleich**, **F-09 Kennzahlenleiste** | Aus der Zeit, als die Seite ein Belegarchiv war. Sie zählen Wirkung von Belegen – in einem Handbuchprojekt zählt die Gliederung, und das macht das Fortschrittsblatt (F-64) besser |
| 2 | **F-06 Vergleichsarten**, **F-15 gemerkte Vergleichsart** | Vier Arten, ein Vorher/Nachher anzusehen. Der Bildvergleich (F-59) beantwortet die eigentliche Frage („was hat sich geändert“) direkt |
| 3 | **F-41 Prozess als BPMN 2.0** | Eine Strecke als BPMN-XML. Eindrucksvoll, aber wer ein BPMN-Werkzeug hat, zeichnet dort; wer keines hat, braucht die Datei nicht |
| 4 | **F-29 Beleg bilden in der Seite** | Zwei Aufnahmen zu einem Beleg verbinden. Der Beleg war das Ziel von 1.0; heute ist das Ziel die Stelle im Handbuch |
| 5 | **F-30 „Was hier geht“** | Eine Liste der Befehle im Ausschneiden-Modus. Gute Idee, aber nur in einer von dreizehn Ansichten – also entweder überall oder nirgends |
| 6 | ~~**F-23 Kontaktbogen**~~ | ~~Der Verdacht gilt seiner Größe (eine HTML-Datei mit allen Bildern)~~ — **in 1.72.0 gemessen und ausgeräumt**: elf Bilder ergeben **306 kB**, weil der Bogen die Vorschauen einbettet und nicht die vollen Bilder. Das Word-Handbuch mit denselben elf Bildern wiegt 615 kB, das HTML-Handbuch 758 kB. Der Bogen ist der **kleinste** der Wege nach draußen |

> **Einer ist erledigt (1.72.0).** Nummer 6 brauchte keine Nutzungsdaten,
> sondern eine Waage: 306 kB für elf Bilder. Von den sechs Verdachtsfällen
> bleiben **fünf**, und die brauchen weiterhin Benutzung.
>
> Daran ist auch etwas über die Durchsicht selbst zu lernen: die Liste
> führte „zu groß" und „wird nicht gebraucht" als eine Art Verdacht. Das
> erste lässt sich messen, das zweite nicht. Hätte jemand früher
> nachgewogen, hätte dieser Eintrag nie zwei Jahre dort gestanden.

**Die Probe, die das entscheiden würde:** eine Fassung, in der diese Knöpfe
nicht verschwinden, sondern an eine Stelle rutschen, die man aufklappen muss.
Fehlt sie niemandem, ist der Fall klar. Dafür braucht es jemanden, der die
Seite benutzt – nicht noch eine Überlegung.

> **Gebaut in 1.56.0 (F-73)**, auf dem besseren Weg: nichts rutscht irgendwo
> hin. Stattdessen zählt die Seite mit, welcher Befehl gedrückt wird – im
> Browser dieses Rechners, nirgendwo sonst. Nach ein paar Wochen Arbeit
> steht im Register Prüfung, was nie gebraucht wurde. Damit ist die Probe
> bereit; **entschieden ist sie erst durch Benutzung.** Für die
> Kennzahlenleiste gibt sie nichts her – die wird angesehen, nicht gedrückt,
> und das steht auch so da.

## Wo die Last wirklich liegt

Nicht in der Zahl der Funktionen, sondern in zwei Dateien:

| Datei | Zeilen | |
| --- | --- | --- |
| `core.mjs` | 7 000 | alles ohne DOM, in **einer** Datei |
| ~~`markieren.js`~~ | ~~2 500~~ | ~~Editor **und** Gliederung **und** Fortschrittsblatt **und** Rückweg aus Word~~ — **in 1.52.0 geteilt** in `markieren.js` (1 240), `strecke.js` (640) und `gliederung.js` (645) |
| ~~`aufnahme.js`~~ | ~~2 200~~ | ~~Aufnahmestudio **und** Eingang **und** Archiv~~ — **in 1.54.0 geteilt** in `aufnahme.js` (1 395) und `eingang.js` (830) |

`core.mjs` ist lang, aber geordnet und ohne Browser prüfbar – das ist der
Grund für die Regel, und die Länge ist der Preis. Die beiden
Oberflächenmodule sind etwas anderes: in `markieren.js` stecken vier
Ansichten, weil sie sich eine Gliederung teilen. Das ist der **dritte
Befund** und die Arbeit, die als nächste lohnt – **nicht** eine weitere
Funktion.

Dass das überhaupt geht, hängt an der gemeinsamen Klammer (alle
Oberflächenmodule in einem Gültigkeitsbereich): ein Modul teilen heißt
Dateien verschieben, nicht Schnittstellen erfinden. Zwei gleiche Namen sind
dabei einer zu viel, und der Build sagt es.

## Was diese Durchsicht nach sich zieht

**Jetzt (1.51.0)**
* Die Navigation bekommt die fünf Aufgaben als Überschriften (F-70)
* Die Teilung Design / Output steht in beiden Ansichten als ein Satz

**Erledigt in 1.52.0**
* `markieren.js` in Editor, Strecke und Gliederung geteilt. Die Probe: die
  gebaute Seite war danach zeichengleich mit der Fassung davor

**Erledigt in 1.53.0**
* Der zweite Befund: eine Übersicht im Eingang nennt die vier Wege und führt
  zu den zweien, die anderswo liegen (F-71)

**Erledigt in 1.54.0**
* `aufnahme.js` in Studio und Eingang geteilt. Die Probe lief hier über den
  Bestand der Zeilen: keine ausführbare Zeile ist verschwunden

**Erledigt in 1.56.0**
* Die Probe ist gebaut (F-73): die Seite zählt den Gebrauch im eigenen
  Browser, und das Register Prüfung sagt, was nie gedrückt wurde

**Was jetzt nur noch Zeit braucht**
* **Die Probe laufen lassen.** Alle Befunde dieser Durchsicht sind
  abgearbeitet; was bleibt, ist keine Arbeit mehr, sondern Benutzung. In
  ein paar Wochen sagt der Gebrauch, welche der sechs Funktionen wirklich
  tot sind – und dann wird entschieden, nicht geraten.

**Bewusst nicht**
* Funktionen entfernen, die nur verdächtig sind
* `core.mjs` aufteilen – die Länge ist der Preis für die Prüfbarkeit
* Eine vierzehnte Ansicht, die die dreizehn erklärt
