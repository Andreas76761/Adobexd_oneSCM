# Feature-Katalog

Stand: Anwendung **v1.9.0**, Datenbestand **1.0.0**.

Jede Funktion hat eine feste Kennung. Sie bleibt bestehen, auch wenn sich die
Funktion später ändert; die Spalte „Version“ nennt dann zusätzlich die Änderung.
„Prüfung“ verweist auf den Testfall, der die Funktion absichert
(siehe [testkonzept.md](../testkonzept.md)).

## Übersicht

| Kennung | Funktion | Seit | Umsetzung | Prüfung |
| --- | --- | --- | --- | --- |
| F-01 | Belegraster mit Vorher/Nachher-Vorschau | 1.0.0 | `app/src/ui.js` → `zeichneKarte` | Oberfläche: „Grundzustand zeigt die aktiven Belege“ |
| F-02 | Volltextsuche | 1.0.0 | `app/src/core.mjs` → `suchIndex`, `passtZuSuche` | Kernlogik: 4 Fälle · Oberfläche: „Suche grenzt ein …“ |
| F-03 | Facettenfilter mit Zählern | 1.0.0 | `core.mjs` → `filtere`, `facetten` | Kernlogik: 3 Fälle · Oberfläche: „Facettenfilter und Zähler …“ |
| F-04 | Archivumschalter | 1.0.0 | `core.mjs` → `filtere`; `ui.js` → `zeichneFacetten` | Kernlogik + Oberfläche: „Archivansicht …“ |
| F-05 | Sortierungen | 1.0.0 | `core.mjs` → `sortiere` | Kernlogik: „Sortierungen ordnen wie erwartet“ |
| F-06 | Vergleichsarten in der Detailansicht | 1.0.0 | `ui.js` → `buehne` | Oberfläche: „Vergleichsarten …“, „Schieberegler …“ |
| F-07 | Begründungspanel | 1.0.0 | `ui.js` → `zeichneDetail` | Daten + Oberfläche: „Detailansicht zeigt Vergleich und Begründung“ |
| F-08 | Kennzahlenvergleich | 1.0.0 | `core.mjs` → `verbesserung`; `ui.js` → `balken` | Kernlogik: „Wirkung berücksichtigt die Richtung …“ |
| F-09 | Kennzahlenleiste | 1.0.0 | `core.mjs` → `kennzahlen` | Kernlogik: 2 Fälle · Oberfläche: Kennzahl folgt der Suche |
| F-10 | Zustand in der Adresszeile | 1.0.0 | `core.mjs` → `zustandZuQuery`, `queryZuZustand` | Kernlogik: 3 Fälle · Oberfläche: 2 Fälle |
| F-11 | Tastaturbedienung | 1.0.0 | `ui.js` → Ereignisse auf `document` und `dialog` | Oberfläche: „Blättern und Schließen …“, „Tastenkürzel …“ |
| F-12 | Helles und dunkles Thema | 1.0.0 | `app/src/styles.css` | Build: 2 Fälle · Oberfläche: „dunkles Thema bleibt lesbar“ |
| F-13 | Reaktionsfähiges Layout | 1.0.0 | `styles.css`, `ui.js` → `richteSchub` | Oberfläche: „kein waagerechter Überlauf …“, „Filterleiste klappt …“ |
| F-14 | Eingebettete Aufnahmen | 1.0.0 | `data/generator/`, `app/build/build.mjs` | Aufnahmen: 5 Fälle · Build: „lädt von außen nur erlaubte Schriftquellen“ |
| F-15 | Gemerkte Vergleichsart | 1.0.0 | `ui.js` → `leseModus`, `merkeModus` | Oberfläche: „Vergleichsarten lassen sich umschalten“ |
| F-16 | Portalnavigation | 1.1.0, erweitert 1.7.0 | `ui.js` → `zeigeAnsicht` | Aufnahme: „Portalnavigation …“ · Ausschneiden: „Die Navigation führt …“ |
| F-17 | Aufnahmestudio mit vier Quellen | 1.1.0, erweitert 1.3.0 und 1.4.0 | `aufnahme.js` → `quelleBildschirm`, `quelleZwischenablage`, `warteAufEinfuegen` | Aufnahme: 11 Fälle |
| F-18 | Wahl des Bildschirmausschnitts | 1.1.0 | `core.mjs` → `begrenzeAusschnitt`, `presetAusschnitt`; `aufnahme.js` → `verdrahteBuehne` | Kernlogik: 2 Fälle · Aufnahme: 5 Fälle |
| F-19 | Metadaten und Datum | 1.1.0 | `core.mjs` → `pruefeEntwurf`, `titelVorschlag`; `aufnahme.js` → `baueFormular` | Kernlogik: 5 Fälle · Aufnahme: 3 Fälle |
| F-20 | Auslösen mit der Leertaste | 1.1.0, erweitert 1.4.0 | `aufnahme.js` → `loeseAus`, `schneideAus`, `sichereEingang` | Aufnahme: 8 Fälle |
| F-21 | Eingang mit Nachpflege | 1.1.0 | `core.mjs` → `filtereEingang`, `istVollstaendig`; `aufnahme.js` → `zeichneEingang` | Kernlogik: 6 Fälle · Aufnahme: 7 Fälle |
| F-22 | Eingang als JSON sichern | 1.1.0 | `core.mjs` → `eingangAlsExport`; `aufnahme.js` → `sichereAlsDatei` | Kernlogik: 1 Fall · Aufnahme: „Sichern bietet … Ersatzweg“ |
| F-27 | Aufnahmen und Ordner im Archiv sichtbar | 1.8.0 | `ui.js` → `zeichneEigeneAufnahmen`, `zeigeOrdnerImArchiv`; `schnipsel.js` → `liesOrdnerBilder` | Ausschneiden: 4 Fälle |
| F-26 | Ausschneiden mit wählbarer Ablage | 1.7.0, erweitert 1.9.0 | `core.mjs` → `dateinameAus`, `pruefeAblage`, `baueBeipackzettel`; `schnipsel.js` | Kernlogik: 10 Fälle · Ausschneiden: 22 Fälle |
| F-25 | Bilderstapel | 1.6.0 | `aufnahme.js` → `quelleDateien`, `zeigeStapelbild` | Aufnahme: 5 Fälle |
| F-24 | Kompakter Aufnahmemodus | 1.5.0 | `aufnahme.js` → `setzeKompakt`; `styles.css` → `body.kompakt` | Aufnahme: 9 Fälle |
| F-23 | Kontaktbogen als eine Datei | 1.2.0 | `core.mjs` → `baueKontaktbogen`, `maskiereHtml`; `aufnahme.js` → `sichereKontaktbogen`, `uebergebeDatei` | Kernlogik: 8 Fälle · Aufnahme: 6 Fälle |

---

## F-01 · Belegraster mit Vorher/Nachher-Vorschau

**Zweck** Der Bestand soll wie ein Kontaktbogen überflogen werden können: Was
wurde geändert, und sieht man den Unterschied schon in der Vorschau?

**Bedienung** Jede Karte zeigt beide Aufnahmen nebeneinander, darunter Kennung,
Status, Titel, Anlass, Projekt mit Seitenpfad und die gemessene Wirkung.
Klick, `Enter` oder `Leertaste` öffnen die Detailansicht.

**Umsetzung** Die Vorschau übernimmt das Seitenverhältnis des Aufnahmeformats
(`--seiten`), damit Desktop- und Telefonaufnahmen nicht verzerrt werden;
sehr hohe Telefonaufnahmen werden bei 260 px abgeschnitten.

---

## F-02 · Volltextsuche

**Zweck** Ein Beleg wird meist über ein Stichwort aus der Begründung gesucht,
nicht über seine Kennung.

**Bedienung** Suchfeld in der Kopfzeile, `/` springt hinein. Mehrere Begriffe
werden UND-verknüpft.

**Umsetzung** Durchsucht werden Kennung, Titel, Projekt, Seitenpfad, Kategorie,
Status, Autor, Browser, Datum, Schlagworte, alle vier Begründungsfelder, der
Archivgrund und die Kennzahlnamen. Der Index liegt in zwei Schreibweisen vor
(`prüfung` → `prufung` **und** `pruefung`), damit beide Tippweisen treffen.

---

## F-03 · Facettenfilter mit Zählern

**Zweck** Eingrenzen, ohne in eine leere Trefferliste zu laufen.

**Bedienung** Projekt, Kategorie, Status und Aufnahmeformat. Mehrfachauswahl je
Gruppe wirkt als ODER, verschiedene Gruppen als UND. Werte ohne Treffer sind
abgeblendet und nicht anwählbar.

**Umsetzung** Der Zähler einer Gruppe wird berechnet, *ohne* die eigene Gruppe
zu filtern – sonst zeigten alternative Werte immer null.

---

## F-04 · Archivumschalter

**Zweck** Abgelöste Belege verschwinden aus dem Alltag, bleiben aber als
Nachweis auffindbar.

**Bedienung** Drei Ansichten: „Aktiv“ (Vorgabe), „Archiv“, „Alle“. Archivierte
Belege tragen im Raster die Marke *Archiv* und in der Detailansicht den Grund
der Archivierung samt Datum.

---

## F-05 · Sortierungen

Neueste zuerst (Vorgabe), Älteste zuerst, Stärkste Wirkung, Titel A–Z.
Bei gleichem Datum entscheidet der Titel, damit die Reihenfolge stabil bleibt.
Belege ohne berechenbare Wirkung stehen bei „Stärkste Wirkung“ am Ende.

---

## F-06 · Vergleichsarten in der Detailansicht

**Schieberegler** Beide Aufnahmen liegen deckungsgleich übereinander, die
Trennkante folgt dem Regler (Maus, Finger, Pfeiltasten).
**Nebeneinander** Beide Aufnahmen vollständig, für Formatunterschiede.
**Umschalten** Eine Aufnahme, Klick wechselt – zeigt kleine Unterschiede am
deutlichsten, weil sich der Blick nicht bewegt.

---

## F-07 · Begründungspanel

Vier feste Felder, die jeder Beleg führen muss: **Anlass** (was war das
Problem), **Änderung** (was wurde getan), **Wirkung** (was kam heraus),
**Quelle** (worauf stützt sich das). Die Datenprüfung lehnt Belege ab, bei
denen eines der Felder fehlt oder zu knapp ist.

---

## F-08 · Kennzahlenvergleich

Je Kennzahl werden Vorher- und Nachher-Wert als Balkenpaar gezeigt, jeder
Balken direkt beschriftet. Die Farbe steht für die Aufnahme (blau = vorher,
rot = nachher), nicht für „gut“ oder „schlecht“ – die Bewertung trägt die
Wirkungsmarke mit Vorzeichen, Symbol und Prozentwert.

Die Wirkung berücksichtigt die Richtung der Kennzahl: bei `kleiner_besser`
ist ein Rückgang eine Verbesserung. So weist ein verworfener Versuch korrekt
eine negative Wirkung aus.

---

## F-09 · Kennzahlenleiste

Fünf Kacheln über der Trefferliste: Belege, Aufnahmen, Übernommen (mit
Aufschlüsselung), Projekte samt Zeitraum, mittlere Wirkung. Alle Werte beziehen
sich auf die aktuelle Auswahl und ändern sich mit jedem Filter.

---

## F-10 · Zustand in der Adresszeile

Suche, alle Filter, Ansicht, Sortierung und der geöffnete Beleg stehen im
Adress-Anhang (`#q=…&p=…&id=…`). Eine so kopierte Adresse stellt genau denselben
Blick wieder her. Unbekannte Werte fallen still auf die Vorgabe zurück.

---

## F-11 · Tastaturbedienung

| Taste | Wirkung |
| --- | --- |
| `/` | Springt in das Suchfeld |
| `Enter` / `Leertaste` | Öffnet den fokussierten Beleg |
| `←` `→` | Blättert in der Detailansicht durch die Trefferliste |
| `←` `→` auf dem Regler | Verschiebt die Trennkante |
| `Esc` | Schließt die Detailansicht, der Fokus kehrt auf die Karte zurück |

---

## F-12 · Helles und dunkles Thema

Alle Farben liegen als Token im hellen Grundzustand vor. Das dunkle Thema
überschreibt nur Token – einmal für die Systemvorgabe
(`@media (prefers-color-scheme: dark)`, abgesichert gegen eine ausdrückliche
helle Wahl) und einmal für `:root[data-theme="dark"]`. Der Build prüft, dass
kein Farbwert ausschließlich im dunklen Zweig steht.

---

## F-13 · Reaktionsfähiges Layout

Ab 900 px steht die Filterleiste dauerhaft links und bleibt beim Scrollen
stehen. Darunter klappt sie zu einem Schub zusammen, dessen Titel die Zahl der
aktiven Filter nennt. Die Trefferliste ist so auf dem Telefon ohne langes
Wischen erreichbar. Geprüft wird zusätzlich, dass die Seite bei 390, 1024 und
1600 px nicht waagerecht überläuft.

---

## F-14 · Eingebettete Aufnahmen

Die Aufnahmen sind als SVG in die Seite geschrieben. Grund: das veröffentlichte
Artifact darf keine externen Bilder laden (Inhaltsrichtlinie), und SVG bleibt
bei 40 Aufnahmen unter 600 kB. Die Aufnahmen vergeben keine IDs und enthalten
keine Verweise nach außen, damit 40 Stück in einer Seite nicht kollidieren.
Einzige externe Quelle sind die Schriften von `fonts.googleapis.com`.

---

## F-15 · Gemerkte Vergleichsart

Die zuletzt gewählte Vergleichsart wird je Betrachter im Browser gemerkt
(`localStorage`, Schlüssel `screenarchiv:vergleichsmodus`). Ist der Speicher
nicht verfügbar, gilt der Schieberegler als Vorgabe; ein Fehler entsteht nicht.


---

## F-16 · Portalnavigation

**geändert in** 1.51.0 (siehe F-70)

Oben links, unter dem Titel, stehen die **dreizehn** Ansichten – seit 1.51.0
in fünf benannten Aufgaben (Bestand, Hereinholen, Aufbereiten, Ordnen und
prüfen, Ausgeben), davor als eine Reihe. Am Eingang zeigt eine Marke, wie
viele Aufnahmen dort liegen. Die Ansicht steht in der Adresszeile
(`#ans=aufnahme`) und lässt sich verlinken; die Adressen haben sich beim
Gruppieren nicht geändert. Die Suche im Kopf gehört zum Archiv und tritt in
den anderen Ansichten zurück; der Eingang hat seine eigene.

---

## F-17 · Aufnahmestudio mit vier Quellen

| Quelle | Wofür | Hinweis |
| --- | --- | --- |
| **Bildschirm freigeben** | laufende Ansicht des Bildschirms | Der Browser fragt um Erlaubnis. In der eingebetteten Vorschau des Artifacts ist das durch die Richtlinie der Ansicht gesperrt – die Seite kann das nicht aufheben und sagt es. |
| **Aus Zwischenablage** | Bildschirmfoto der Systemtaste | Der verlässliche Weg in der eingebetteten Ansicht: `Druck` / `Windows+Umschalt+S` / `Umschalt+Cmd+4`, dann `Strg+V` bzw. `Cmd+V`. |
| **Bild öffnen** | vorhandene Bilddateien, auch mehrere und per Ablegen auf der Bühne | Das Bild verlässt den Browser nicht. Mehrere werden zum Stapel (F-25). |
| **Beispielquelle** | Ausprobieren ohne eigenes Material | Nimmt eine Aufnahme aus dem Archiv. |

Die freigegebene Bildschirmansicht läuft als laufendes Bild auf der Bühne –
aufgenommen wird das Bild in dem Augenblick, in dem ausgelöst wird. Endet die
Freigabe, meldet die Seite es und sperrt den Auslöser.

**Einfügen** greift nur in der Ansicht *Aufnahme* und nur bei Bildern;
eingefügter Text landet weiterhin dort, wo er hingehört. Die Schaltfläche
„Aus Zwischenablage“ gibt den Hinweis auf die Einfügetaste sofort und versucht
das Lesen der Zwischenablage nur nebenher mit Zeitgrenze – sonst bliebe ein
Klick ohne Rückmeldung, wenn die Erlaubnisfrage unbeantwortet bleibt.

**Meldungen der Bildschirmfreigabe** unterscheiden Sperre durch die Richtlinie,
Abbruch durch die Person und sonstige Fehler; die Tastenbezeichnungen richten
sich nach dem System.

**Bereit zum Einfügen** (ab 1.4.0) Ist die Freigabe gesperrt oder wird „Aus
Zwischenablage“ gedrückt, wird die Bühne zur hervorgehobenen Fläche mit Marke,
Tastenangabe und dem Hinweis, notfalls einmal hineinzuklicken – in einer
eingebetteten Ansicht muss die Tastenkombination in der Seite ankommen, nicht
im Fenster darum herum. Der Zustand endet, sobald ein Bild eintrifft.

---

## F-18 · Wahl des Bildschirmausschnitts

Auf der Bühne wird der Ausschnitt mit gedrückter Maustaste aufgezogen, an den
vier Ecken in der Größe verändert und in der Mitte verschoben. Deckt die
Auswahl die ganze Quelle, zieht ein Zug darin sofort einen neuen Ausschnitt
auf – sonst käme man aus dem Vollbild nicht heraus.

Vier Vorgaben setzen gängige Formate mittig auf die Quelle: **Ganze Quelle**,
**Desktop**, **Tablet**, **Mobil**. Pfeiltasten verschieben punktgenau, mit
Umschalt in Zehnerschritten. Die Maße stehen immer daneben
(`x 208 · y 66 · 1024 × 768`). Der Ausschnitt bleibt stets innerhalb der
Quelle und misst mindestens 32 × 32 Bildpunkte.

---

## F-19 · Metadaten und Datum

Rechts stehen die Angaben für die **nächste** Aufnahme: Titel, Projekt (mit
Vorschlagsliste), Seite, Datum, Rolle (Vorher, Nachher, Einzelaufnahme),
Kategorie, Status, erfasst von, Browser, Begriffe und Notiz.

Blockierend sind nur drei Dinge: eine fehlende Quelle, ein zu kleiner
Ausschnitt und ein fehlendes oder in der Zukunft liegendes Datum. Alles andere
darf offen bleiben – ein leerer Titel wird beim Auslösen zu einem Vorschlag
aus Projekt, Seite und laufender Nummer. Der Browser ist beim Öffnen bereits
eingetragen.

---

## F-20 · Auslösen mit der Leertaste

**Leertaste** legt den Ausschnitt sofort in den Eingang. Die Aufnahme bekommt
eine Kennung `AUF-<Jahr>-<Nummer>`, wird als JPEG (höchstens 1100 Bildpunkte
breit) eingebettet und mit Ausschnittmaßen, Quelle und Zeitpunkt abgelegt. Ein
kurzer Blitz und eine Meldung bestätigen.

Die Taste greift nur in der Ansicht *Aufnahme*, nie während in einem Feld
getippt wird und nie bei offenem Dialog. Wer lieber klickt, nimmt die
Schaltfläche daneben. Nach dem Auslösen bleiben alle Angaben stehen, nur der
Titel wird geleert – so entsteht eine Reihe von Aufnahmen ohne erneutes
Ausfüllen.

**Wenn etwas schiefgeht** (ab 1.4.0) Drei Wege sind auseinandergehalten, weil
sie verschiedene Folgen haben:

* **Speicher voll** – die Aufnahme wird zurückgenommen, damit Anzeige und
  Speicher nicht auseinanderlaufen; gemeldet wird der Rat, den Kontaktbogen zu
  sichern und Aufnahmen zu löschen.
* **Speicher gesperrt** – kommt in eingebetteten Ansichten vor. Die Aufnahme
  **bleibt** für diese Sitzung im Eingang; gemeldet wird, dass sie kein
  Neuladen übersteht. Dieser Hinweis erscheint nur einmal.
* **Ausschneiden verweigert** – der Browser schützt fremde Bildinhalte. Statt
  seiner Fehlermeldung steht dort der Weg, der funktioniert.

---

## F-21 · Eingang mit Nachpflege

Der Eingang zeigt jede Aufnahme mit Vorschau, Kennung, Datum, Titel, Projekt,
Kategorie und Begriffen. Fehlt Kategorie oder Begriff, trägt die Karte die
Marke **unvollständig** und einen farbigen Rand.

Ein Klick öffnet die Nachpflege: Titel, Projekt, Seite, Kategorie, Status,
Datum, Rolle, Begriffe und Notiz – dazu das Bild in voller Größe mit Angabe
der Quelle und des Ausschnitts. Begriffe werden beim Sichern vereinheitlicht
(klein, ohne Rauten, ohne Dubletten, höchstens zwölf).

Darüber: Suche über alle Felder einschließlich Notiz und Begriffen, Filter
*Alle / Unvollständig / Vollständig*, vier Sortierungen und eine Kennzahlzeile
mit Anzahl, offenen Aufnahmen, Projekten, Begriffen und belegtem Speicher.
Löschen geht je Aufnahme im Dialog; „Eingang leeren“ fragt einmal nach.

---

## F-22 · Eingang als JSON sichern

**geändert in** 1.53.0 (siehe F-71): die Datei nimmt keine Bilder mit, und
die Meldung sagt das jetzt. Zum Weitergeben ist die Projektdatei (F-63) der
Weg; dies hier ist eine Sicherung des eigenen Speichers.

**Als JSON sichern** übergibt den Eingang mitsamt Bildern an die
Ablagefähigkeit des Artifacts (`downloads`). Die veröffentlichte Seite hat
keinen Server – das ist der Weg, auf dem Aufnahmen in `data/eintraege.json`
gelangen.

Fehlt die Fähigkeit oder lehnt der Betrachter ab, erscheint statt einer Datei
ein Textfeld mit den Metadaten zum Herauskopieren; die Bilder bleiben dann im
Browser. Der Unterschied wird benannt, nicht verschwiegen.


---

## F-23 · Kontaktbogen als eine Datei

**Zweck** Die Aufnahmen sollen den Browser verlassen können – in ein Laufwerk,
ein Ticket, eine Ablage wie SharePoint. Einzelbilder wären mühsam: die
Ablagefähigkeit des Artifacts lässt immer nur **eine** Abfrage gleichzeitig zu
und der Betrachter bestätigt jede Datei einzeln. Also ein Blatt für alles.

**Bedienung** Im Eingang „Kontaktbogen sichern“. Gesichert wird, was gerade
sichtbar ist – gefiltert und sortiert wie am Bildschirm. Ist die Auswahl
eingeschränkt, steht das im Blatt.

**Das Blatt** Kopf mit Stempel und Stand, eine Zeile mit Anzahl, offenen
Aufnahmen, Projekten und Begriffen, dann je Aufnahme das Bild neben Kennung,
Datum, Titel, Projekt, Seite, Kategorie, Status, Rolle, erfassender Person,
Browser, Begriffen, Notiz und einer Herkunftszeile mit Quelle, Ausschnittmaßen
und Erfassungszeitpunkt. Unvollständige Aufnahmen sind markiert.

**Beschaffenheit** Ein vollständiges HTML-Dokument mit eingebetteten Bildern,
Systemschriften, **ohne externen Verweis und ohne Skript**. Es öffnet sich in
jedem Browser, ist durchsuchbar und wird mit Strg+P zum PDF; die Druckregeln
verhindern, dass ein Satz über die Seitenkante bricht.

**Sicherheit** Alle Metadaten stammen aus Eingabefeldern und werden beim Bauen
maskiert. Ein Titel wie `<script>…</script>` erscheint als Text, nicht als
Markup – geprüft.

**Wenn es nicht geht** Jeder Ausgang der Ablagefähigkeit hat eine eigene
Meldung: bestätigt (mit Größe), abgebrochen, Abfrage noch offen, über 16 MB,
Format nicht erlaubt. Ein abgelehntes Format stößt bewusst **keinen** stillen
Ersatzweg an. Fehlt die Fähigkeit ganz, erscheint das Textfeld mit den
Metadaten zum Herauskopieren – mit dem Hinweis, dass die Bilder dabei im
Browser bleiben.


---

## F-24 · Kompakter Aufnahmemodus

**Zweck** Serienaufnahmen vom geteilten Bildschirm. Ausschnitt einmal
festlegen, Metadaten einmal eintragen, dann nur noch auslösen – ohne dass die
Bedienung den Blick auf das verdeckt, was aufgenommen wird.

**Wann** Von selbst, sobald der Bildschirm freigegeben ist. Von Hand über den
Schalter **Kompakt** in der Werkzeugleiste – auch bei anderen Quellen.

**Was sich ändert** Untertitel, Portalnavigation, Kopfsuche und Kennzahlen
treten zurück; die Live-Ansicht bekommt den übrigen Platz (mindestens 72 % der
Fensterhöhe), rechts bleiben 272 Bildpunkte für die zuletzt aufgenommene
Aufnahme mit Kennung und Zähler sowie die Metadaten der nächsten. Der Fokus
springt auf die Bühne, damit die Leertaste sofort greift. Unter 1000 Bildpunkten
Breite stapeln sich beide Bereiche wieder.

**Bedienung unverändert** Der Kompaktmodus ändert die Darstellung, nicht die
Bedienung: der Ausschnitt lässt sich weiterhin frei mit der Maus aufziehen, in
der Mitte verschieben, an den vier Ecken in der Größe ändern und mit den
Pfeiltasten punktgenau rücken – über der laufenden Bildschirmfreigabe genauso
wie über einem stehenden Bild. Geprüft mit echten Zeigerbewegungen.

**Zurück** Schalter, `Esc`, Wechsel in eine andere Ansicht – oder von selbst,
wenn die Bildschirmfreigabe endet.

**Grenze** Der Modus verkleinert die Seite, nicht das Browserfenster: eine
Webseite darf weder das Fenster bewegen noch über dem Betriebssystem schweben.
Damit der echte Bildschirm daneben sichtbar bleibt, gehört das Browserfenster
auf eine Bildschirmhälfte oder einen zweiten Bildschirm.


---

## F-25 · Bilderstapel

**Zweck** Der Weg ohne Zwischenablage: Bildschirmfotos, die die Systemtaste als
**Datei** ablegt (`Windows+Druck` → *Bilder\Bildschirmfotos*, auf dem Mac
`Umschalt+Cmd+3/4` → Schreibtisch), gesammelt abarbeiten.

**Bedienung** Mehrere Dateien über „Bild öffnen“ auswählen oder zusammen auf
die Bühne ablegen. Über der Bühne erscheint eine Leiste mit dem Stand
(`Bild 2 von 4`), dem Dateinamen und *Zurück* / *Weiter*. Jedes Bild lässt sich
einzeln zuschneiden und aufnehmen – auch mehrfach, für mehrere Ausschnitte aus
demselben Bild. Die Metadaten bleiben über den ganzen Stapel stehen; die
Herkunft jeder Aufnahme hält den Dateinamen fest.

**Ende** Eine andere Quelle – Bildschirmfreigabe, Zwischenablage oder
Beispielquelle – beendet den Stapel und blendet die Leiste aus.

**Ziehen aus einer anderen Seite** funktioniert bewusst nicht: Ein von dort
gezogenes Bild kommt nur als Verweis an, und die Seite darf nichts nachladen.
Statt still nichts zu tun, nennt die App den Grund und die beiden Wege, die
gehen – Datei speichern und ablegen, oder den Bildschirm freigeben.


---

## F-26 · Ausschneiden mit wählbarer Ablage

**Zweck** Der Ablauf eines Ausschneidewerkzeugs, aber in der Seite: aufziehen,
loslassen, fertig – ohne zweiten Tastendruck, ohne Bestätigung, und dorthin,
wo es vorher festgelegt wurde.

**Was die Seite nicht kann** Das Ausschneidewerkzeug des Betriebssystems
starten. Kein Browser erlaubt einer Seite, eine fremde Anwendung zu öffnen.
Browser und Anwendung startet die Person selbst und gibt sie frei.

**Ablauf** Ablage festlegen → *Ausschneiden starten* (der Browser fragt nach
Bildschirm, Fenster oder Tab) → Bereich aufziehen, der Rahmen zeigt die Maße
mit → loslassen. Die Freigabe bleibt bestehen, der nächste Zug ist der nächste
Schnipsel. `Esc`, *Beenden*, ein Ansichtswechsel oder das Ende der Freigabe
halten an und stoppen den Datenstrom.

**Ablageziele** (einzeln oder gemeinsam)

| Ziel | Was passiert | Wo es geht |
| --- | --- | --- |
| Eingang in dieser Seite | JPEG im Browser, mit Kennung und Metadaten wie jede Aufnahme | überall |
| Ordner auf dem Rechner | einmal wählen, danach schreibt die Seite jedes PNG still hinein | Chrome und Edge, wenn die umgebende Seite es zulässt |
| Einzeln als Datei sichern | jedes PNG wird einzeln bestätigt | wo die Ablagefähigkeit besteht |

Ohne Ziel bleibt der Start gesperrt – eine Aufnahme ohne Ort wäre verloren.
Der Ordnerzugriff gilt nur für die Sitzung; die übrigen Einstellungen bleiben
gespeichert.

**Beipackzettel** (ab 1.9.0) Neben jedes abgelegte Bild kommt eine gleichnamige
`.json` mit allen Metadaten – ohne sie trüge die Datei nur, was ins
Namensmuster passt. Feste Feldfolge, auch bei leeren Werten: Zettelversion,
erzeugende Anwendung, Bildname, Erfassungszeitpunkt, Datum, Titel, Projekt,
Seite, Kategorie, Status, Rolle, Begriffe, Notiz, Autor, Browser, Ausschnitt,
Quelle. Abschaltbar; das Kästchen erscheint nur bei Ordner- oder Dateizielen
und nennt die zweite Bestätigung beim Sichern als Einzeldatei. Im Archiv ist er
seit 1.10.0 lesbar, ohne den Dateimanager zu öffnen – siehe F-27.

**Namensmuster** `{datum}` `{zeit}` `{nummer}` `{projekt}` `{titel}`
`{kategorie}`, mit lebendem Beispiel. Namen werden entschärft: Umlaute
aufgelöst, Sonderzeichen und Pfadangaben entfernt, auf 60 Zeichen begrenzt. Ein
unbekannter Baustein wird als Wort übernommen, damit ein Tippfehler auffällt.


---

## F-27 · Aufnahmen und Ordner im Archiv sichtbar

**Zweck** Im Archiv wird zuerst gesucht. Bis v1.7.0 erschienen dort nur die
Belege aus `data/eintraege.json` – aufgenommene Bilder lagen im Eingang und
waren nicht zu finden, ohne dass man wusste, wo man suchen muss.

**Band „Eigene Aufnahmen“** Über dem Belegbestand: die letzten zwölf Aufnahmen
aus dem Eingang als Streifen, mit Kennung, Anzahl und dem Hinweis, wie viele
noch ohne Kategorie oder Begriffe sind. Ein Klick auf ein Bild führt in den
Eingang. Ein Satz erklärt den Unterschied: ein Beleg braucht zwei Aufnahmen und
eine Begründung, eine Aufnahme ist ein einzelnes Bild.

**Band „Im Ordner ⟨Name⟩“** Der tatsächliche Inhalt des Ordners, der in der
Ansicht Ausschneiden gewählt wurde – aus dem Dateisystem gelesen, neueste
zuerst, mit Dateinamen und Größe im Tooltip. Das ist bewusst keine Aufstellung
aus dem Gedächtnis der Seite: es zeigt, was wirklich dort liegt, auch von
früheren Sitzungen. „Neu lesen“ frischt auf. Gezeigt werden zwölf Bilder, die
Gesamtzahl steht daneben.

**Beipackzettel an der Kachel** (ab 1.10.0) Jede Kachel im Ordnerband trägt
die Marke `Zettel` oder `kein Zettel` – gefunden über den gleichen Namen mit
Endung `.json`, also auch für Zettel aus früheren Sitzungen oder von Hand
dazugelegte. Ein Klick auf eine Kachel mit Zettel öffnet die Schau unter dem
Streifen: alle 16 Zeilen in der Folge der Datei, leere Felder als „—“ statt als
Lücke, Ausschnitt und Quelle lesbar gefasst, darunter die Datei im Original
zum Aufklappen. Der Stand neben dem Ordnernamen zählt die Zettel mit und nennt
eine `.json` ohne Bild eigens. Ein Zettel, der sich nicht lesen lässt, eine
höhere Zettelversion, fremde Felder und unbrauchbare Werte werden benannt –
die Datei liegt im Dateisystem und kann von Hand geändert worden sein.

**Filter, Umfang, Tastatur** (ab 1.13.0) Ein Filterfeld sucht im Dateinamen
(Teiltreffer, Umlaute aufgelöst), **Mehr zeigen** holt je zwölf weitere Bilder
nach. Der Stand sagt, was davon zu sehen ist: „4 von 14 Bildern gefiltert ·
neueste 12 gezeigt“. Ein Zettel ohne Bild steht als eigene Kachel (`{ }`,
Marke „ohne Bild“) und lässt sich lesen – übernehmen nicht, dazu fehlt das
Bild. Die Zettelschau nimmt beim Öffnen den Fokus, **Esc** schließt sie und
gibt ihn an die Kachel zurück. Beim Betreten des Archivs wird der Ordner neu
gelesen; eine offene Schau bleibt dabei stehen und zeigt den neuen Stand.

Beide Bänder bleiben verborgen, solange es nichts zu zeigen gibt.

**Ordner über Sitzungen** Der Zugriff liegt in der Browserdatenbank
(IndexedDB) – als Text ließe er sich nicht ablegen. Beim Öffnen wird er
zurückgeholt: besteht die Schreiberlaubnis noch, ist der Ordner sofort wieder
da; sonst wartet er auf einen Klick, weil eine Erlaubnis nur nach einer
Handlung erfragt werden darf.


---

## F-28 · Übernahme aus dem Ordner

**Zweck** Bis 1.10.0 war die Ablage eine Einbahnstraße: die Seite schrieb Bild
und Beipackzettel auf die Platte und konnte beides nie wieder lesen. Nach einer
Pause war die Arbeit da, nur nicht mehr in der Anwendung.

**Der Weg zurück** In der Zettelschau des Ordnerbands steht **In den Eingang
übernehmen**. Die Metadaten kommen allein aus dem Zettel – fehlt eine Angabe,
bleibt sie leer, statt erfunden zu werden. Datum und Erfassungszeitpunkt
stammen aus der Aufnahme, nicht aus dem Tag der Übernahme; die Kennung wird
nach dem Aufnahmejahr vergeben.

**Das Bild wird neu gefasst** Ein PNG aus dem Ordner wandert als JPEG in den
Eingang – wie bei einer eigenen Aufnahme. Ein Ordner voller PNG sprengte sonst
den Browserspeicher nach wenigen Dateien.

**Nur einmal** Jede übernommene Aufnahme trägt ihre Herkunft (`herkunft`:
Ordner, Datei, Zettel, Zeitpunkt). Daran wird die Datei wiedererkannt – über
Ordner und Namen, Groß- und Kleinschreibung egal, auch nach einem Neuladen.
Die Kachel trägt dann die Kennung, und der Knopf heißt **Im Eingang zeigen**.

**Im Bild selbst** (ab 1.15.0) Dieselben Angaben stehen zusätzlich in der
PNG-Datei: ein `iTXt`-Abschnitt `screenarchiv` mit dem ganzen Zettel, eine
lesbare Zeile unter `Description` und die Anwendung unter `Software`. `iTXt`
statt `tEXt`, weil nur der UTF-8 kann – `tEXt` verstümmelte „Prüfung“. Die
Bilddaten werden nicht neu kodiert, der Abschnitt wird vor `IEND`
eingeschoben. Wird ein solches Bild in der Aufnahme geöffnet, füllt es die
**leeren** Felder; ausgefüllte bleiben unberührt, und die Meldung nennt, was
zurückkam. Der Zettel daneben bleibt trotzdem: ihn kann jedes Werkzeug lesen,
einen PNG-Abschnitt nicht.

**Nachpflegen bis in die Datei** (ab 1.12.0) Kategorie und Begriffe entstehen
oft erst später. Im Eingangsdialog steht darum bei jeder Aufnahme aus einer
Ordnerdatei **Zettel ⟨name⟩ neu schreiben** – der gepflegte Stand geht damit
zurück in die `.json` neben dem Bild. Das Bild selbst bleibt unangetastet.
Ist der Ordner nicht geöffnet oder ein anderer, steht dort statt des Knopfes
der Grund samt Ordnername. Seit 1.12.0 merkt sich **jede** in einen Ordner
geschriebene Aufnahme ihre Datei, nicht nur die übernommene.

**Grenzen** Ein Bild ohne Zettel lässt sich nicht übernehmen: ohne Metadaten
wäre es nur ein Bild ohne Zusammenhang. Ein unlesbarer Zettel ebenso – das
sagt die Schau dann auch.


---

## F-29 · Beleg bilden in der Seite

**Zweck** Der Belegbestand entstand bisher nur im Projekt. Wer in der Seite
zwei Aufnahmen hatte, konnte sie nicht zu dem zusammenfügen, worum es im
Archiv geht: vorher, nachher und die Begründung dazwischen.

**Die Werkbank** Im Eingang öffnet **Beleg bilden** eine Werkbank über dem
Raster. Zwei Auswahlfelder bestimmen, welche Aufnahme *vorher* und welche
*nachher* ist – vorgeschlagen werden die älteste und die neueste. Darüber
stehen beide Bilder nebeneinander, darunter das Formular.

**Vorausgefüllt wird, was bekannt ist** Projekt, Seite, Kategorie, Browser,
Datum der Nachher-Aufnahme und die Schlagworte beider Aufnahmen. Der Titel des
Belegs nicht: er beschreibt die Änderung, nicht das Bild.

**Geprüft wird wie im Bestand** Vokabular für Projekt, Kategorie, Status und
Viewport; Anlass, Änderung und Wirkung mindestens 20 Zeichen; Quelle gesetzt;
mindestens eine Kennzahl mit Name, Einheit, beiden Werten und Richtung; die
Vorher-Aufnahme nicht jünger als die Nachher-Aufnahme; bei Status
*verworfen* das Wort „verworfen“ im Wirkungstext. Eine Kennzahl ist entweder
leer oder vollständig – halb gilt nicht. Was fehlt, steht laufend unter dem
Formular, und der Sicherungsknopf bleibt gesperrt.

**Die Wirkung wird gerechnet** Neben jeder Kennzahl steht die prozentuale
Verbesserung, in der Richtung, die dort gewählt ist – dieselbe Rechnung wie im
Archiv.

**Heraus kommt ein Entwurf, kein Beleg** `belegentwurf-scr-JJJJ-NNN.json`
enthält den Eintrag in der Feldfolge des Bestands und die beiden echten Bilder
daneben. `screen` steht auf `null`: Archetyp und Schalter für die gezeichneten
Aufnahmen entstehen im Projekt, und die Seite behauptet nichts, was sie nicht
weiß. Der Weg von dort steht im Skill `beleg-aufnehmen`.


---

## F-30 · Was hier geht

**Zweck** Die Seite kann nicht überall dasselbe. Ob ein Ordner gewählt werden
darf, ob der Bildschirm freigegeben wird, ob Dateien abgelegt werden dürfen,
ob der Speicher hält – das entscheiden Browser, Gerät und die Hülle, in der
die Seite läuft. Bis 1.15.0 merkte man das erst, wenn etwas nicht ging.

**Sechs Zeilen, gemessen** In der Ansicht Ausschneiden steht ausklappbar
**Was hier geht**. Jede Zeile wird geprüft, nicht vermutet: die Ordnerwahl am
Vorhandensein von `showDirectoryPicker`, die Ablage am tatsächlich
angeforderten `downloads`, die Freigabe an `getDisplayMedia` **und** der
Berechtigungsrichtlinie, der Speicher an einem geschriebenen und wieder
gelesenen Probewert. Die Kurzfassung daneben zählt, wie viele Wege hier
fehlen.

**Jede Absage nennt einen Weg** Kein „geht nicht“ ohne Fortsetzung: ohne
Ordnerwahl bleiben Eingang und Einzeldatei, ohne Freigabe das Bildschirmfoto,
auf dem Telefon „Bild öffnen“. Die Zeile zur Netzablage sagt, dass die
Inhaltsrichtlinie des Artifacts jede Verbindung nach außen sperrt – und nennt
den Umweg: ein Ordner, der mit SharePoint oder OneDrive synchronisiert wird.


---

## F-31 · Unkenntlich machen

**Zweck** Ein Bildschirmfoto aus einem echten System zeigt echte Daten:
Benutzerkennung, FIN, Adresse, Name, Vertragsnummer. Wer es weitergibt, gibt
sie mit. Bis 1.16.0 half nur, den Ausschnitt so zu legen, dass nichts
Persönliches hineingerät – was selten geht.

**Wie abgedeckt wird** Rechteck über der Stelle aufziehen. Der Bereich wird
auf ein grobes Raster heruntergerechnet und wieder vergrößert; was dabei
verloren geht, ist wirklich weg. Kein Weichzeichner: der verschmiert nur und
lässt sich unter Umständen zurückrechnen. Drei Stärken stehen zur Wahl – grob
(24 px), mittel (12 px), fein (6 px).

**Das Original bleibt** Die Marken liegen als Angaben neben der Aufnahme
(`marken`), die abgedeckte Fassung entsteht daraus als Kopie
(`bild_markiert`). Beide stehen im Eingang; die Marken lassen sich später
verschieben, ändern oder entfernen. „Alle Marken entfernen“ und sichern führt
zurück zum Original.

**Wo die Fassung erscheint** Eingangskarte und Kontaktbogen zeigen die
bearbeitete Fassung, sobald es eine gibt – und nennen sie: „bearbeitet – 1
Stelle abgedeckt“. Ein stillschweigend verändertes Bild wäre unredlich. Der
Beipackzettel trägt seit Version 2 `unkenntlich_gemacht` und `marken`.

---

## F-32 · Rahmen, Kommentar und Klickstrecke

**Zweck** Ein Bildschirmfoto zeigt alles gleich wichtig. Wer erklären will,
wo zu klicken ist, braucht einen Rand um die Bedienfläche und einen Text
daneben – und für einen Ablauf mehrere davon in Reihenfolge.

**Rahmen** Rechteck aufziehen, fertig: ein Rand in der Akzentfarbe. Eine
Beschriftung ist freiwillig; sie steht als Band über dem Rahmen, oder
darunter, wenn oben kein Platz ist.

**Schritt der Klickstrecke** Derselbe Rahmen, zusätzlich mit einer Nummer im
Kreis und Pflichttext. Die Nummern vergibt die Seite in der Reihenfolge der
Marken; wird ein Schritt gelöscht, wird neu durchgezählt – eine Strecke mit
1, 3, 4 liest sich wie ein Fehler.

**Die Strecke als Text** Neben dem Bild steht die ganze Klickstrecke
untereinander („1. Auf ‚Bestellung anlegen‘ klicken“), zum Mitlesen und
Herauskopieren. Ein Schritt ohne Text wird beim Sichern benannt.

**Bedienung** Klick auf eine Marke wählt sie, `Entf` entfernt die gewählte,
die Liste rechts zeigt Maße, Text und Raster. Die Marken liegen in
Bildpunkten des Originals, nicht in Bildschirmpunkten – die Fassung stimmt
auch dann, wenn die Ansicht kleiner skaliert ist.


---

## F-33 · Editor und Fassungen

**Zweck** Bis 1.17.0 führte der Weg zum Bearbeiten immer über die Auswahl in
der Markieransicht, und jede Bearbeitung ersetzte die vorige. Wer zwei Stände
brauchte – einen für intern, einen für außen –, hatte Pech.

**Von überall hinein** **Im Editor öffnen** steht an der zuletzt gemachten
Aufnahme, **Im Editor bearbeiten** auf jeder Karte im Eingang; die
Portalnavigation heißt **Editor**. Geladen wird immer das **Original**, nie
eine Fassung – bearbeitet wird vom unberührten Stand aus.

**Fassungen** Jedes Sichern legt eine weitere Fassung an:

| Feld | Inhalt |
| --- | --- |
| `nummer` | 1, 2, 3 … fortlaufend je Aufnahme |
| `bild` | die gerechnete Fassung als JPEG |
| `marken` | die Marken, aus denen sie entstand |
| `erstellt_am` | Zeitpunkt der Bearbeitung |

Die Liste im Editor zeigt das Original und jede Fassung mit Zeitpunkt und
Markenzahl. **Öffnen** holt die Marken einer Fassung zurück auf die
Arbeitsfläche, **Verwerfen** entfernt sie. Das Original bleibt immer.

**Wo die jüngste Fassung erscheint** Karte im Eingang und Kontaktbogen zeigen
sie und nennen sie beim Namen („Fassung 2 – 1 Stelle abgedeckt“). Ein
Stand aus einer früheren Programmfassung (`bild_markiert`) wird als Fassung 1
gelesen.

---

## F-34 · Gliederung und Zeitstempel

**Zweck** Wer eine Anleitung aus Bildern baut, braucht Ordnung und Beleg:
welche Stelle im Ablauf, und wann aufgenommen. Beides stand bisher nur in den
Metadaten, nicht im Bild – und ein weitergereichtes Bild verlor es.

**Die Nummer** Kapitel und Unterkapitel stehen als Felder im Editor; die Seite
schlägt die nächste freie Unternummer im Kapitel vor, gesetzt wird sie von
Hand. Daraus wird `2.3`.

**Der Streifen** Unter dem Bild – nicht darüber gelegt – steht
`2.3 · Titel · 17.10.2026, 08:14`. Er wird in die Fassung gebrannt und
verlässt damit die Seite mit dem Bild. Abschaltbar über das Kästchen
**Nummer und Zeitstempel ins Bild**.

**Wo die Nummer sonst steht** Auf der Karte im Eingang vor der Kennung, im
Kontaktbogen in der Kopfzeile des Satzes und über den Baustein `{kapitel}` im
Namensmuster (aus `2.3` wird dort `2-3`).


---

## F-35 · Strecke: mehrere Screens, ein Blatt

**Zweck** Ein Ablauf besteht selten aus einem Bild. Wer erklären will, wie
eine Vorlage angelegt wird, braucht drei, vier Screens in Reihenfolge – und
am Ende ein Blatt, das man weitergeben kann.

**Die Folge** In der Ansicht **Strecke** entsteht eine benannte Folge: oben
eine Aufnahme wählen und anhängen, darunter steht sie als Schritt mit
Vorschau, Anweisung und Gliederungsnummer. ↑ und ↓ verschieben, **Entfernen**
nimmt heraus. Mehrere Strecken liegen nebeneinander; die Auswahl oben wechselt
zwischen ihnen.

**Gezeigt wird die jüngste Fassung** – also mit abgedeckten Stellen und
Marken aus dem Editor (F-33). Was herausgeht, ist das Bearbeitete, nicht das
Original.

**Das Blatt** **Blatt als Bild sichern** rechnet alle Schritte in ein PNG:
Kopfzeile mit Name, Schrittzahl und Datum; je Kachel das Bild, ein
Nummernkreis, die Anweisung und darunter die Bildunterschrift mit Gliederung
und Zeitstempel (F-34). Die Aufteilung ist wählbar – untereinander, zwei oder
drei nebeneinander –, die Kacheln rechnen sich auf die Spaltenbreite, und die
Zeilen wachsen mit dem höchsten Bild. Die Vorschau daneben zeigt dasselbe
Blatt und läuft beim Tippen mit.

**Was geprüft wird** Name gesetzt, mindestens zwei Schritte, jede Anweisung
gefüllt, jede Aufnahme noch im Eingang. Fehlt etwas, steht es in einem Satz
darunter und der Knopf bleibt gesperrt. Eine gelöschte Aufnahme sprengt die
Strecke nicht – der Schritt wird benannt und beim Zeichnen übergangen.

**Ablage** Strecken liegen im Browser unter `screenarchiv:strecken` und
überleben das Neuladen. Eine gelöschte Strecke lässt die Aufnahmen unberührt;
sie verweist nur auf sie.


---

## F-36 · Gliederung des Handbuchs

**Zweck** Die Bilder gehören in ein Handbuch mit fester Ordnung. Bis 1.20.0
trug ein Bild zwei frei gewählte Zahlen; welche Stellen es überhaupt gibt,
wusste die Seite nicht.

**Die Quelle** `Gliederung_oneSCM12102026.xlsx` aus dem Projekt, eingelesen
und als `data/gliederung/gliederung.json` in die Seite gebaut:

| Ebene | Anzahl | Beispiel |
| --- | --- | --- |
| 1 Kapitel | 23 | `7 Zahlungsdaten, Dokumente und Unterschrift` |
| 2 Unterkapitel | 204 | `7.5 Digitale Unterschrift` |
| 3 Stellen | 919 | `7.5.2 Signaturergebnis` |
| Anhänge | 9 Gruppen | `A.1 Glossar und Abkürzungen` |
| Übergänge | 7 | `T7-8 Von Dokumenten und Signatur zur Aktivierungsprüfung` |

Übergänge tragen keine Nummer in der Ordnung und erscheinen nicht im Baum.
Fehlt eine Zwischenstufe – die Anhänge führen kein eigenes „A“ –, wird sie
ergänzt, damit nichts an der Wurzel hängt, wo es nicht hingehört.

**Die Ansicht** Der Baum zeigt je Stelle zwei Zahlen: die eigenen Bilder und
die Summe mit allen Unterkapiteln (`0 (3)`). Darüber Kennzahlen – zugeordnete
Bilder, belegte Stellen, Bilder ohne Stelle, unbekannte Nummern. Die Suche
geht über Nummer und Thema und zeigt Treffer mit ihrem Zusammenhang; der
Filter trennt belegte von leeren Stellen. „Bilder zeigen“ führt in den
Eingang, gefiltert auf die Nummer.

**Die Zuordnung** Im Editor steht das Feld **Stelle im Handbuch**: tippen,
aus bis zu 60 Vorschlägen wählen. Das Thema steht darunter; eine Nummer, die
es nicht gibt, wird benannt statt stillschweigend genommen. Die Stelle geht in
die Bildunterschrift, auf die Karte im Eingang, in den Kontaktbogen und über
`{kapitel}` in den Dateinamen.


---

## F-37 · Labels und Teilschritte

**Zweck** Ein Bild allein sagt nicht, für wen es gilt. Dieselbe Maske sieht
für Dealer und HQ verschieden aus, in Pkw anders als in Van, auf Deutsch
anders als auf Koreanisch. Ohne diese Angaben lässt sich kein Handbuch je
Rolle, Sparte und Sprache zusammenstellen.

**Die sieben Felder**

| Feld | Werte |
| --- | --- |
| Sprache | feste Auswahl, 21 Sprachen von Deutsch bis Arabisch |
| Rolle | Dealer, Market, HQ, MO |
| Sparte | Pkw, Van |
| Markt | Text, Vorschläge aus der bisherigen Arbeit |
| Domäne | Text – etwa „Templates – Market Settings“ |
| Reiter | Text – etwa „Documents“, „Emails“, „System Notifications“ |
| Schritt | Text – etwa „Auswahl Template“, „Create Template“, „Actions“ |

Markt, Domäne, Reiter und Schritt kommen aus dem System und wären als feste
Liste schon morgen falsch; dort wird getippt, und die Seite schlägt vor, was
schon verwendet wurde. So entsteht das Vokabular aus der Arbeit.

**Labels im Bild** „Labels ins Bild setzen“ legt für jedes gesetzte Label
eine Marke an – ein gefülltes Feld mit Text, untereinander in der linken
oberen Ecke. Jede lässt sich **ziehen**, einzeln entfernen oder gesammelt
wieder herausnehmen; die Angaben bleiben dabei an der Aufnahme. Seit 1.22.0
lässt sich **jede** Marke verschieben, nicht nur ein Label.

**Teilschritte** Rechts neben der Gliederung steht, was an der gewählten
Stelle liegt: Sprachen, Rollen, Sparten, Märkte, Domänen, Reiter und Schritte
mit Zahl, jeweils mit eigenem Symbol. Ohne gewählte Stelle gelten alle
Bilder. Darunter die Beschreibung der Stelle aus der Arbeitsmappe –
Abschlusskriterium, Nachweis und Quelle.

**Symbole** Ein eigener Vorrat als Inline-SVG (Sprache, Rolle, Sparte, Markt,
Domäne, Reiter, Schritt, Kapitel, Bild). Externe Symbolschriften verbietet
die Inhaltsrichtlinie des Artifacts – und sie würden offline fehlen.


---

## F-38 · Designstudio

**Zweck** Der eigentliche Grund für die Galerie: aus den Bildern entstehen
Unterlagen – Benutzerhandbuch, Releaseletter, One Pager, Quick Guide – in der
Auflösung, die der Druck braucht.

**Vier Vorlagen**

| Vorlage | Format | Bilder je Seite | Text |
| --- | --- | --- | --- |
| Quick Guide | A4 quer | 6 (3 × 2) | unter dem Bild |
| One Pager | A4 hoch | 4 (2 × 2) | unter dem Bild |
| Releaseletter | A4 hoch | 2 | in der Spalte daneben (38 %) |
| Handbuchseite | A4 hoch | 3 | in der Spalte daneben (34 %) |

Gerechnet wird bei **300 dpi** – A4 hoch sind 2480 × 3508 Bildpunkte. Was
auf Papier soll, muss in dieser Auflösung vorliegen; mit den Bildern aus
1.20.0 ist das gegeben.

**Inhalt** Eine Strecke (Reihenfolge und Anweisungen kommen von dort) oder
jede Stelle der Gliederung mit Bildern (Reihenfolge nach Gliederungsnummer).

**Texte aus dem Handbuch** Zuschaltbar: unter der Anweisung stehen Thema und
Abschlusskriterium der Stelle, gekürzt auf die Länge, die die Vorlage
vorsieht. Abgeschaltet steht nur die Anweisung da – für Unterlagen, die ohne
Begleittext auskommen.

**Satz** Die Kopfzeile trägt Titel, Vorlage und Seitenzahl; der Titel wird
beschnitten, bevor er in die Seitenzahl läuft. Text, der nicht mehr auf die
Kachel passt, endet dort – er wandert nicht in die nächste. Eine Seite mit
weniger Bildern als Plätzen rechnet mit den Zeilen, die sie braucht, statt
halb leer zu bleiben.

**Ausgabe** PNG je Seite (Name: Vorlage, Inhalt, Seitenzahl) oder eine
HTML-Datei mit allen Blättern, eingerichtet für den Druck: `@page` auf A4 in
der richtigen Lage, ein Blatt je Seite. Das PDF macht der Browser – ein
selbstgebautes PDF wäre schlechter als der Druckweg.

---

## F-39 · Import bestehender Dateien

**Seit** 1.24.0 · **Ansicht** Import

**Zweck** Was schon gezeichnet ist, muss nicht neu aufgenommen werden:
Screenshots, Präsentationen und Dokumente geben ihre Bilder an die Galerie ab.

| Dateiart | Was gelesen wird |
| --- | --- |
| PNG, JPEG, GIF, WebP | das Bild selbst, in voller Auflösung |
| PPTX | die eingebetteten Bilder **je Folie**, dazu der Text der Folie |
| DOCX | die eingebetteten Bilder, dazu der Text des Dokuments |
| XLSX | die eingebetteten Bilder, dazu die Zeichenkettentabelle |
| PDF | die eingebetteten **JPEG**-Bilder |
| PPT, DOC, XLS | nichts – das alte Format ist kein Archiv; der Hinweis sagt es |

**Wie das ohne Fremdcode geht** PPTX, DOCX und XLSX sind ZIP-Archive. Das
Verzeichnis am Dateiende wird selbst gelesen (`leseZipVerzeichnis`), die
Einträge mit `DecompressionStream('deflate-raw')` ausgepackt – das bringt der
Browser mit. Welches Bild zu welcher Folie gehört, steht nicht in den Medien
selbst, sondern in der Beziehungsdatei der Folie (`medienAusRels`); erst
darüber wird aus einem Topf voller `image7.png` eine Folge von Folien.

**Grenze, ausdrücklich** Ganze PDF-**Seiten** zu zeichnen kann die Seite
nicht. Dafür bräuchte es einen PDF-Zeichner, und ein fremdes Skript lässt die
Inhaltsrichtlinie des Artifacts nicht zu. Eingebettete JPEG-Bilder kommen
heraus, EMF und WMF werden genannt und übergangen – der Browser zeigt sie
nicht.

**Je Bild** Titel (Vorschlag aus dem Dateinamen), Rezept (Vorschlag aus dem
Text der Folie), Stelle im Handbuch (einzeln oder für alle), Haken zum
Wählen, Lupe auf volle Auflösung.

**Übernehmen** Die gewählten Bilder gehen in den Eingang: die Vorschau in den
Browserspeicher, das volle Bild in die Datenbank. An der Aufnahme bleibt
`einfuhr` stehen – Datei, Dateiart, Bildname, Folie –, damit später zu
erkennen ist, woher sie kam. Von dort aus stehen sie dem Editor, der Strecke
und dem Designstudio zur Verfügung.

---

## F-40 · Parallele Bilder und Platzhalter in der Strecke

**Seit** 1.25.0 · **Ansicht** Strecke

**Parallel** Ein Schritt kann mehrere Bilder tragen. Das heißt nicht
„danach“, sondern „zugleich“: zwei Rollen sehen denselben Schritt
verschieden, oder zwei Reiter werden nebeneinander gefüllt. Im Blatt werden
sie als `3a`, `3b` gezählt, im Prozess zu einer parallelen Teilung.

**Platzhalter** Ein Schritt ohne Bild, der sagt, welches Bild fehlt. Eine
Lücke, die man sieht, wird gefüllt; eine, die fehlt, wird vergessen. Der
Platzhalter steht in der Folge, im Text (`2. [Bild fehlt] …`) und im Blatt
(gestrichelter Rahmen). Ohne Beschreibung gilt er als unfertig. Wird ihm ein
Bild zugewiesen, ist er ein gewöhnlicher Schritt – die Anweisung bleibt.

**Datensatz** Ein Schritt ist `{ art, aufnahmen: [...], text }`. Der alte
Satz (`aufnahme` als eine Kennung) wandert beim Lesen mit.

---

## F-41 · Prozess aus der Strecke (BPMN 2.0)

**Seit** 1.25.0 · **Ansicht** Strecke

Aus der Folge wird ein Prozess: Start, je Schritt eine Aufgabe (`userTask`),
Ende. Ein Schritt mit mehreren Bildern wird zu `parallelGateway` → Zweige →
`parallelGateway`. Ein Platzhalter bleibt eine Aufgabe, gestrichelt und als
`task` ohne Rolle – er ist noch nicht belegt.

**Mit Diagramm** Die Datei trägt `bpmndi:BPMNDiagram` samt Koordinaten; in
bpmn.io, Camunda oder Signavio steht der Prozess damit gelegt da statt leer.
Die Rechnung (`bpmnAufbau`) läuft ohne DOM: Knoten, Kanten, Maße und Lage
sind prüfbar.

**Ausgabe** `prozess-<name>.bpmn` (XML) und `prozess-<name>.png` (dasselbe
Bild, in doppelter Auflösung gezeichnet). Die Vorschau in der Ansicht hängt
an derselben Rechnung – was dort steht, steht in der Datei.

**Dokumentation am Knoten** Jede Aufgabe trägt `bpmn:documentation` mit
Aufnahmekennung und Stelle im Handbuch; so bleibt der Weg zurück zum Bild
offen. Freitext wird maskiert – ein Name mit `<` zerlegt das Dokument nicht.

---

## F-42 · Suchchat – nach Bildern fragen

**Seit** 1.26.0 · **überall** (frei bewegliches Fenster)

**Zweck** Bei einer Galerie mit hunderten Bildern ist die Frage schneller als
jeder Filter: „Dealer in Kapitel 6 auf Englisch“ – und die Bilder stehen da.

**Frei beweglich** Das Fenster liegt über jeder Ansicht, lässt sich am Kopf
ziehen, an der Ecke in der Größe ändern und behält Lage, Größe und Zustand
(`screenarchiv:chat`). Es wird vom Rahmen im Bild gehalten: ein Fenster
außerhalb des Fensters wäre unerreichbar. Escape schließt.

**Was erkannt wird** Rolle (Dealer, Market, HQ, MO), Sparte (Pkw, Van),
Sprache (21), Markt, Stelle der Gliederung (`Kapitel 6.2`, `6.2.3` oder ein
Thema, wenn es eindeutig ist), eine Anzahl („die letzten 5“) und die
Eigenschaften `unkenntlich`, `markiert`, `import`, `ohne Stelle`,
`unvollständig`. Alles andere wird als Text über Titel, Notiz, Begriffe,
Projekt und Kennung gesucht.

**Die Antwort nennt die Deutung** „1 von 3 Bildern: Rolle Dealer, Stelle 6.2
Market Settings.“ Eine stille Deutung wäre schlimmer als keine – und ohne
Treffer steht da, woran es lag, nicht nur „nichts gefunden“.

**Der Weg weiter** Jeder Treffer als Vorschau mit zwei Knöpfen: **Editor**
(öffnet die Aufnahme) und **→ Strecke** (hängt sie an die offene Strecke; gibt
es keine, entsteht eine).

**Claude darf deuten, nicht antworten** Steht die Fähigkeit `sample` zur
Verfügung, übersetzt Claude dieselbe Frage in denselben Filter – gefiltert
wird in jedem Fall in der Seite, und was die Seite sicher erkannt hat (festes
Vokabular), bleibt stehen. Damit kann im Fenster nie ein Bild stehen, das es
nicht gibt. Fehlt die Fähigkeit oder scheitert der Aufruf, bleibt die Deutung
der Seite – die Antwort kommt immer.

---

## F-43 · Drei Agenten: roter Faden, Audit, Empfehlung

**Seit** 1.27.0 · **Ansicht** Prüfung

Alle drei prüfen **nach Regeln** (im Kern, ohne DOM): was sie sagen, lässt
sich am Bestand nachrechnen, und jeder Befund nennt die Bilder, um die es
geht, samt dem Weg dorthin (Editor, Gliederung, Strecke, Designstudio,
Aufnahme). Befunde sind `fehler`, `warnung` oder `hinweis` und nach Gewicht
sortiert – das Wichtigste oben.

**Roter Faden** – prüft die Folge: Schritte ohne Anweisung, Platzhalter,
Folgen mit weniger als zwei Schritten, gemischte Sprachen oder Rollen in
einer Folge, Folgen, die gegen die Gliederung laufen, Stellen mit Bildern
ohne Folge, Lücken mitten in einer Reihe von Unterkapiteln, Bilder ohne
Stelle und Nummern, die es in der Gliederung nicht gibt.

**Audit** – prüft jedes Bild: Vollständigkeit, Auflösung unter 1280 px (für
A4 bei 300 dpi zu wenig), Bilder, von denen nur die Vorschau da ist,
fehlende Labels, doppelte und zu knappe Titel, Verweise auf gelöschte
Bilder, Stellen, die es nicht gibt. Dazu ein Hinweis, wo im Text
personenbezogene Daten genannt sind (FIN, User ID, Adresse …), ohne dass am
Bild etwas unkenntlich gemacht wurde – kein Urteil, nur ein Blick, der sich
lohnt.

**Empfehlung** – sagt, was als nächstes zu tun ist: Bilder zuordnen,
Platzhalter füllen, aus Bildern eine Folge machen, aus einer fertigen Folge
ein Blatt, das größte leere Kapitel aufnehmen, die zweite Sprache und die
fehlenden Rollen. Kennzahlen: belegte Kapitel, Deckung in Prozent, fertige
Folgen, Platzhalter.

**Bericht** Alle gelaufenen Agenten als Textdatei
(`pruefbericht-2026-10-17.txt`) mit Kennzahlen, Befunden und betroffenen
Kennungen.

**Claude kommentiert** Steht `sample` zur Verfügung, liest Claude den
fertigen Bericht eines Agenten und schreibt höchstens fünf Sätze dazu. Der
Kommentar steht als Kommentar da und ist so gekennzeichnet; die Befunde
stehen fest, bevor er kommt. Fehlt die Fähigkeit, sagt die Seite das – und
die Befunde bleiben.

---

## F-44 · Designstudio vollständig: Deckblatt, Zeilen, eigene Vorlagen

**Seit** 1.28.0 · **Ansicht** Design (ergänzt F-38)

**Deckblatt** Zuschaltbar, steht vor den Seiten: Titel, Untertitel und die
Angaben als Paare – Inhalt, Stelle im Handbuch, Zahl der Bilder und Seiten,
Vorlage, gemeinsame Labels, Projekt, Stand – dazu der Hinweis unten. Was
nicht bekannt ist, steht nicht da (keine leere Zeile als Platzhalter). Was
allen Bildern gemeinsam ist, wird genannt; was sich unterscheidet, gezählt
(„2 Sprachen“).

**Kopf- und Fußzeile** aus wählbaren Teilen. Kopf: Titel, Stelle im
Handbuch, Projekt, Vorlage, Seitenzahl. Fuß: Herkunft, Stand, Labels,
eigener Hinweis, Seitenzahl. Die Seitenzahl steht rechts, alles andere
links; ein Teil ohne Wert fällt weg, nicht die Zeile. Die Folge der Teile
ist die der Liste, nicht die des Anklickens – so sieht jede Seite gleich aus.

**Eigene Vorlagen** Name, Spalten (1–4), Zeilen (1–6), Breite der Textspalte
(0–60 %), Textlänge (40–900) und Format. Sie haben die Form der eingebauten:
Seitenrechnung, Dateinamen und Ausgabe unterscheiden nicht, ob eine Vorlage
eingebaut oder selbst eingerichtet ist. Gespeichert wird unter dem Namen –
dieselbe Vorlage erneut gespeichert wird geändert, nicht verdoppelt.

**Beständig** Alle Einstellungen des Studios liegen in
`screenarchiv:design` – Vorlage, Format, Texte, Labels, Deckblatt, Zeilen,
Titel, Untertitel, Hinweis und die eigenen Vorlagen. Eine Vorlage, die man
einmal einrichtet, findet man wieder.

---

## F-45 · Verzeichnis: die Galerie auf die Platte

**Seit** 1.29.0 · **Ansicht** Verzeichnis

**Zweck** Der Eingang liegt im Browser – wer die Browserdaten löscht, löscht
ihn. Dauerhaft wird eine Aufnahme erst als Datei. Diese Ansicht schreibt die
ganze Galerie samt Zusatzdaten in ein lokales Verzeichnis.

**Was geschrieben wird**

| Datei | Inhalt |
| --- | --- |
| `…/<name>.png` | das Bild in voller Auflösung, mit Beipackzettel im PNG |
| `…/<name>.json` | der Beipackzettel daneben (abschaltbar) |
| `index.json` | Übersicht: Datei, Stelle, Thema, Labels, Maße, Einfuhr |
| `index.csv` | dieselbe Übersicht für eine Tabelle (Semikolon getrennt) |
| `strecken.json` | alle Strecken im Format der Seite |
| `prozesse/<name>.bpmn` | je Strecke der Prozess (F-41) |

**Die Ordnung ist das Muster** Vorgabe
`{sparte}/{sprache}/{kapitel}/{rolle}/{datum}_{kennung}_{titel}` – also
Datum, Sprache, Kapitel und Rolle, die Ordnung, in der später gesucht wird.
Platzhalter: `sparte, sprache, rolle, markt, kapitel, thema, datum, jahr,
monat, kennung, titel, projekt, kategorie`. Ein Schrägstrich macht einen
Ordner; Unterordner entstehen beim Schreiben. Was an einem Bild fehlt, wird
benannt (`ohne-sprache`) statt weggelassen – sonst lägen ungelabelte Bilder
zwischen den gelabelten. Ein unbekannter Platzhalter bleibt als Text stehen,
damit ein Tippfehler im Muster auffällt.

**Erst der Plan, dann die Datei** Die Vorschau zeigt jede Datei mit ihrem
Pfad, bevor eine entsteht. Gleiche Pfade bekommen eine Nummer – zwei Bilder
dürfen sich nicht gegenseitig überschreiben.

**Jüngste Fassung** Zuschaltbar (Vorgabe): geschrieben wird die jüngste
Fassung – also mit abgedeckten Stellen und Marken – statt des Originals.

**Fehler halten nicht auf** Eine Datei, die scheitert, stoppt die übrigen
nicht; am Ende steht, was liegt und was fehlte. Eine halbe Galerie auf der
Platte ist mehr wert als keine.

**Grenze** Ordnerzugriff gibt es nur in Chromium (Chrome, Edge). Fehlt er,
sagt die Ansicht es und nennt den Weg über „Als JSON sichern“ im Eingang.

---

## F-46 · Varianten, Deckungsmatrix und Ausgabe je Sprache

**Seit** 1.30.0 · **Ansichten** Editor, Gliederung, Design

**Das Problem** Ein Label sagt, *was* ein Bild ist. Es sagt nicht, dass zwei
Bilder dieselbe Maske zeigen – einmal auf Deutsch, einmal auf Englisch. Genau
das braucht ein Handbuch in 21 Sprachen und vier Rollen.

**Variantengruppe** Im Editor lassen sich Aufnahmen verbinden. Die Gruppe
steht als `variante` an jeder Aufnahme – eine Kennung, kein Zeiger auf ein
„Original“: unter Entsprechungen gibt es keine Rangfolge. Ein zweites
Verbinden führt die bestehende Gruppe weiter (sonst fielen die bisherigen
Entsprechungen auseinander); treffen zwei Gruppen aufeinander, gewinnt die
größere. „Aus der Gruppe nehmen“ löst eine einzelne; bleibt eine allein
übrig, löst sich die Gruppe ganz.

**Was fehlt, steht da** Der Block nennt die Werte, die es **im Bestand** gibt
und in dieser Gruppe nicht – nicht alle 21 Sprachen, sondern die, mit denen
tatsächlich gearbeitet wird.

**Deckungsmatrix** (Gliederung): eine Zeile je Stelle mit Bildern, eine
Spalte je Wert, der im Bestand vorkommt, umschaltbar nach **Sprache, Rolle,
Sparte, Markt**. Eine leere Zelle ist eine Lücke; ein Klick auf eine gefüllte
öffnet das erste Bild im Editor. Dazu Summenzeile, Spalte „ohne“ (Bilder ohne
dieses Label) und der Stand: wie viele Stellen in jedem Wert belegt sind.

**Ausgabe in einer Variante** (Designstudio): „Ausgabe in – Sprache:
Englisch“ tauscht je Schritt das Bild gegen seine Entsprechung. Wo keine
vorliegt, bleibt das bisherige stehen und wird **genannt** („1 Schritt ohne
Entsprechung: 2“) – lieber eine gemischte Seite als ein Loch, von dem niemand
weiß. Bei einem Kapitel als Inhalt wirkt die Wahl als Filter; die Anweisungen
der Strecke bleiben in jedem Fall.

---

## F-47 · Das ganze Handbuch als ein Dokument

**Seit** 1.32.0 · **Ansicht** Design (Studio → Ganzes Handbuch)

**Zweck** Das Designstudio setzt Blätter – eine Strecke, ein Kapitel, eine
Vorlage. Das Handbuch ist das andere Ende: die **ganze Gliederung in einem
Stück**, in ihrer Ordnung.

**Was darin steht** Deckzeile mit Titel, Untertitel und Stand (Kapitel,
Stellen, Bilder, offene Stellen), ein **Inhaltsverzeichnis** mit Sprungmarken
und Bildzahl je Stelle, dann je Stelle: Überschrift mit Nummer, die Texte der
Gliederung (Abschlusskriterium, Nachweis und Quelle, Übergang – abschaltbar
mit „Texte aus dem Handbuch“), die Bilder in der Reihenfolge der Gliederung
und – wo eine **Strecke** die Bilder dieser Stelle erzählt – deren Anweisungen
als Nummer über der Bildunterschrift. Gewählt wird die Strecke, die die
meisten Bilder dieser Stelle zeigt.

**Lücken** Eine Stelle ohne Bilder, unter der auch keine liegen, wird als
Lücke benannt. Ein Kapitel, dessen Unterkapitel Bilder haben, nicht – das wäre
Rauschen.

**Umfang** Alle Stellen mit Bildern (Vorgabe), die ganze Gliederung mit ihren
leeren Stellen, oder nur das im Studio gewählte Kapitel. Vor dem Rechnen steht
da, was herauskäme.

**Bilder** In voller Auflösung (PNG) oder auf 1600 bzw. 2400 px begrenzt
(JPEG). Die Grenze ist kein Schmuck: 300 Seiten in voller Auflösung sprengen
die 16-MB-Grenze einer Datei – was passiert, sagt die Meldung samt Ausweg.

**Ausgabe** Eine HTML-Datei mit `@page A4` und Seitenumbruch je Kapitel; der
Browser macht daraus das PDF. Sie kommt ohne jeden Verweis nach außen aus –
Bilder stecken als Datenadressen darin.

---

## F-48 · Labels ab der Aufnahme, Stellenwahl, Zeichen je Wert

**Seit** 1.33.0 · **Ansichten** Aufnahme, Eingang, Editor, Import, Gliederung

**Labels schon beim Aufnehmen** Das Aufnahmeformular trägt einen Block
**Labels**: Sprache, Rolle (Dealer, Market, HQ, MO), Sparte (PC, Van) und
Markt. Was dort steht, wandert in **jede** weitere Aufnahme, bis es geändert
wird – wer eine Reihe aufnimmt, nimmt sie in einer Sprache und für eine Rolle
auf. Dieselben Felder stehen im Eingangsdialog, zusammen mit der Stelle im
Handbuch: nachziehen, ohne in den Editor zu wechseln.

**Die Sparten heißen PC und Van** – wie im Haus. Die Kennung bleibt `pkw`,
damit abgelegte Bilder ihre Zuordnung behalten. Die Suche kennt beide Namen
(`Pkw`, `Passenger Cars`, `PC`) und ebenso die deutschen Namen der Rollen
(`Händler`, `Zentrale`, `Landesgesellschaft`, `Marktorganisation`).

**Stelle wählen statt tippen** Im Editor und im Import stehen drei
Auswahlfelder: **Kapitel → Unterkapitel → Stelle**, jedes mit Nummer *und*
Namen, jede Ebene gefiltert nach der darüber. Das Textfeld bleibt daneben –
wer die Nummer kennt, tippt sie; beide Wege halten sich gegenseitig aktuell.
Eine zurückgenommene Wahl fällt auf die Ebene darüber zurück, statt die
Zuordnung zu löschen. Die Nummern von Hand (für Bilder ohne Stelle) stehen
hinter einem Aufklapper.

**Zeichen je Wert** Jede Rolle und jede Sparte hat ihr eigenes Symbol
(Dealer, Market, HQ, MO, PC, Van) – im Labelfeld, in den Teilschritten und
**im Bild**: die eingebrannte Labelmarke zeichnet das Symbol aus demselben
Vorrat wie die Oberfläche. Zwei Sätze Zeichen wären zwei Wahrheiten; darum
liest die Leinwand das SVG der Seite und zeichnet es mit `Path2D` nach.

---

## F-49 · Begehung: jeder Befehl wird gedrückt

**Seit** 1.34.0 · `Testing/tests/18-begehung.e2e.mjs`

Die übrigen Prüfungen fragen, ob ein Weg zum richtigen Ergebnis führt. Diese
fragt etwas Gröberes und darum Wichtiges: **bricht irgendwo etwas, wenn man
einfach alles drückt?** Sie legt einen Grundbestand an, bereitet jede Ansicht
so vor, dass ihre Befehle etwas zu tun haben, und drückt dann jeden
sichtbaren, nicht gesperrten Knopf – über 90 in elf Ansichten. Gezählt werden
Seitenfehler, Fehler in der Konsole und eine Seite, die nicht mehr antwortet.
Ein eigener Fall drückt zuletzt die zerstörenden Befehle (Löschen, Verwerfen,
Leeren), ein dritter die Tastaturbefehle (`/`, Leertaste, Strg+Z).

---

## F-50 · Die Vorschauen liegen in der Datenbank

**Seit** 1.34.0 · betrifft Eingang, Start, Speicher

**Das Problem** Eine Vorschau wiegt 37 kB, die Metadaten einer Aufnahme ein
halbes. Beides zusammen im `localStorage` heißt: bei **135 Aufnahmen** ist
Schluss – bei einem Handbuch mit 1153 Stellen eine ernste Grenze.

**Die Lösung** Der `localStorage` trägt nur noch die Metadaten
(`version: 2`, `vorschauen: "datenbank"`), die Vorschauen liegen in der
Browserdatenbank (`screenarchiv` → `vorschauen`, Schlüssel ist die Kennung).
Geschrieben wird in *einem* Vorgang je Sicherung, und nur, was noch nicht
abgelegt ist. Beim Start holt die Seite alle Vorschauen auf einmal zurück und
zeichnet nach; bis dahin steht ein Platzhalter statt eines kaputten Bildes.
Ein älterer Stand mit eingebetteten Vorschauen wird gelesen und beim nächsten
Sichern umgezogen.

**Wirkung** 502 Byte statt 37,9 kB je Aufnahme: rund **10 800 statt 135**
Aufnahmen. Mit 300 Aufnahmen startet die Seite in 194 ms, der Eingang
zeichnet in 227 ms.

**Dazu zwei Rechnungen, die mitwuchsen**

* `zaehleBilder` summiert jetzt von unten nach oben (jede belegte Stelle
  zählt sich ihren Vorfahren zu) statt jede der 1153 Stellen gegen jede
  belegte zu prüfen: bei 1000 Bildern **15-mal** schneller.
* `eingangSuchIndex` merkt sich den Suchtext je Satz (`WeakMap`); er verfällt
  von selbst, weil geänderte Aufnahmen neue Objekte sind. Filtern über 1000
  Aufnahmen: **2,4-mal** schneller.

## F-51 · Projekte nach Version und Land

**Seit** 1.35.0 · betrifft Aufnahme, Eingang, Verzeichnis, Beipackzettel

**Das Problem** „oneSCM Portal“ allein sagt zu wenig. Dieselbe Maske sieht in
Fassung 2.3 anders aus als in 2.4, und in Korea anders als in Deutschland. Wer
den Projektnamen in jedes Bild tippt, hat am Ende „oneSCM Portal“,
„oneSCM-Portal“ und „onescm portal“ im Bestand – und keine Möglichkeit, das
Handbuch einer Fassung von dem einer anderen zu trennen.

**Die Lösung** Ein Projekt ist ein Dreiklang aus **Name, Version und Land**. Es
wird **angelegt**, nicht getippt: im Aufnahmeformular unter „Projekte“ stehen
die drei Felder und darüber die Liste der angelegten Projekte. Ein Klick auf
ein Projekt setzt alle drei Werte für die nächsten Aufnahmen; die Zeile nennt,
wie viele Bilder daran hängen. Was beim Anlegen fehlt oder doppelt ist, wird
benannt statt stillschweigend angenommen: ohne Namen kein Projekt, dieselben
drei Teile gibt es nur einmal.

Projekte, die an Bildern stehen, aber nicht angelegt sind – aus einem älteren
Stand oder von Hand getippt –, werden als Vorschlag „aus dem Bestand“ gezeigt
und auf Klick übernommen. Ein gelöschtes Projekt nimmt keine Bilder mit; es
steht danach wieder als Vorschlag da.

**Wo Version und Land auftauchen**

| Ort | Form |
| --- | --- |
| Aufnahmeformular | zwei Felder neben Projekt und Seite |
| Eingangsdialog | nachtragbar wie Titel und Seite |
| Suche im Eingang | Teil des Suchtextes (`Korea` findet die koreanischen Bilder) |
| Verzeichnis | Platzhalter `{version}` und `{land}` im Muster |
| `index.json`, `index.csv` | eigene Spalten |
| Beipackzettel | eigene Zeilen (Zettelversion unverändert) |

**Kennung** `PRJ-<name>-<version>-<land>`, aus den bereinigten Teilen –
zweimal dasselbe gibt dieselbe Kennung, und sie ist zugleich der Schlüssel der
Zählung.

## F-52 · Die Arbeitsmenge: in einem Projekt arbeiten

**Seit** 1.36.0 · betrifft Kopf, Eingang, Gliederung, Editor, Strecke, Design,
Prüfung, Verzeichnis, Suchchat

**Das Problem** Mit Projekten (F-51) liegen die Bilder mehrerer Fassungen und
Länder im selben Eingang. Wer das Handbuch für **2.4 in Deutschland** baut,
bekam bis dahin die koreanischen Bilder mitgezählt, mitgeprüft, mitgeschrieben
– und in jeder Auswahlliste angeboten.

**Die Lösung** Eine **Arbeitsmenge** im Seitenkopf, neben der Navigation: ein
Auswahlfeld mit „alle Projekte“, jedem angelegten Projekt samt Bildzahl und
„ohne Projekt“. Die Wahl gilt für jede Ansicht:

| Ansicht | was die Arbeitsmenge dort tut |
| --- | --- |
| Eingang | Karten, Kennzahlen, „Als JSON sichern“ und Kontaktbogen |
| Gliederung | Zählung je Stelle, Kacheln, Deckungsmatrix |
| Editor | die Auswahlliste der Bilder |
| Strecke | die Auswahlliste der Bilder |
| Design | Quellen, Kapitelbilder, Variantenwahl, Handbuchumfang |
| Prüfung | alle drei Agenten |
| Verzeichnis | Plan, Index und was geschrieben wird |
| Suchchat | die durchsuchten Bilder |

Was nicht zur Arbeitsmenge gehört, wird **nicht gelöscht und nicht
verschoben** – es wird nur nicht gezeigt. Zwei Ausnahmen, damit nichts unter
der Hand verschwindet: das Bild, das im Editor gerade offen ist, bleibt in
seiner Liste, und eine Strecke behält ihre Schritte.

Die Zeile im Kopf nennt den Schnitt (`2 von 3 Bildern`), die Projektliste
schaltet mit **„Nur dieses“** direkt um, und die Wahl überlebt das Neuladen
(sie liegt bei den Projekten in `screenarchiv:projekte`). Eine Wahl, deren
Projekt gelöscht wurde, bleibt sichtbar, statt stumm auf „alles“ zu springen.

## F-53 · Version und Land als Labelfeld und Variantenachse

**Seit** 1.36.0 · betrifft Editor, Gliederung, Design

**Das Problem** Version und Land standen am Bild (F-51), aber nicht dort, wo
mit Labels gearbeitet wird: nicht im Labelblock des Editors, nicht als Achse
der Deckungsmatrix, nicht als Variante.

**Die Lösung** Beide sind jetzt gewöhnliche Labelfelder mit eigenem Zeichen –
frei getippt wie der Markt – und Teil der Variantenachsen. Daraus folgt
unmittelbar:

* Die **Deckungsmatrix** kennt „Version“ und „Land“ als Spaltenachse: welche
  Stelle gibt es in 2.4, welche nur in 2.3?
* Der **Variantenblock** im Editor nennt die fehlende Fassung („Version: 2.3“)
  genauso wie die fehlende Sprache.
* Das **Designstudio** kann dieselbe Strecke in der Variante einer anderen
  Version ausgeben – die Grundlage eines Releaseletters.

## F-54 · Projektvergleich – der erste Entwurf eines Releaseletters

**Seit** 1.37.0 · betrifft Prüfung

**Das Problem** Ein Releaseletter beantwortet eine einzige Frage: *was ist in
der neuen Fassung dazugekommen, was ist weggefallen?* Mit Projekten (F-51) und
der Arbeitsmenge (F-52) liegen beide Fassungen im selben Bestand – verglichen
hat sie bis dahin niemand. Von Hand zwei Listen nebeneinanderzulegen ist genau
die Arbeit, für die es diese Seite gibt.

**Die Lösung** In der Ansicht **Prüfung** steht unter den Agenten der Block
*Projektvergleich*: zwei Auswahlfelder (vorher / nachher) über allen bekannten
Projekten, darunter eine Tabelle mit einer Zeile je Stelle der Gliederung:

| Stelle | Thema | Lage | vorher | nachher |
| --- | --- | --- | --- | --- |
| 6.2 | Market Settings | in beiden | 1 | 2 |
| 6.3 | Vorlagen | **neu** | 0 | 1 |
| 6.4 | Freigaben | **entfallen** | 1 | 0 |

**Verglichen werden Stellen, nicht Bilder.** Ein zweiter Screenshot derselben
Maske ist keine neue Funktion – die Bildzahlen stehen daneben, entscheiden tut
die Stelle. Ein Klick auf die Nummer führt in die Gliederung.

Was keine Stelle trägt, kann nicht verglichen werden; es wird darum unter der
Tabelle gezählt genannt, statt stillschweigend zu fehlen. Dieselbe Fassung
zweimal zu wählen sagt die Tabelle, statt eine leere Liste zu zeigen.

**Als Text sichern** legt den Vergleich als `projektvergleich-JJJJ-MM-TT.txt`
ab: Kopf mit beiden Projekten und Bildzahlen, dann die drei Blöcke *Neu in …*,
*Nur in …* und *In beiden*. Das ist der Entwurf, aus dem ein Releaseletter
geschrieben wird – die Seite behauptet nicht, ihn zu schreiben.

## F-55 · PDF aus den Blättern – 300 dpi, ohne Umweg

**Seit** 1.38.0 · betrifft Designstudio

**Das Problem** Das Studio rechnet die Blätter in Druckauflösung, lieferte sie
aber nur als PNG je Seite oder als HTML zum Drucken. Der Weg zum PDF ging über
den Druckdialog des Browsers – mit dessen Rändern, Kopfzeilen und
Überraschungen.

**Die Lösung** „Als PDF sichern“ baut die Datei selbst. Ein PDF ist ein Kopf,
nummerierte Objekte, eine Tabelle ihrer Byte-Abstände und ein Schluss; ein
JPEG wandert unverändert als Strom hinein (`DCTDecode`). Darum braucht es
weder eine fremde Bibliothek – die Inhaltsrichtlinie des Artifacts ließe keine
zu – noch eine eingebettete Schrift: auf den Blättern steht der Text bereits
im Bild.

* Das Seitenformat folgt den Bildpunkten bei **300 dpi**: 2480 × 3508 Punkte
  werden 595,2 × 841,92 pt, also A4.
* Der Titel steht als UTF-16 im PDF, damit „Prüfung“ eine Prüfung bleibt.
* Geprüft wird die Datei nicht nur auf ihren Kopf: die Testfälle lesen die
  Objekttabelle und rechnen nach, dass jeder Abstand auf sein Objekt zeigt.

Das ganze Handbuch bleibt HTML – dort ist Text Text und soll es bleiben. Das
PDF entsteht aus den gerenderten Blättern.

## F-56 · Register Output – fertige Dokumente in jeder Variante

**Seit** 1.39.0 · betrifft Output, Design, Verzeichnis

**Das Problem** Das Designstudio rechnet *ein* Blatt nach dem anderen: eine
Vorlage, ein Inhalt, eine Variante. Ein Handbuch für drei Sprachen und zwei
Rollen heißt aber sechsmal dasselbe von Hand – und am Ende liegen die Dateien
irgendwo.

**Die Lösung** Ein eigenes Register. Ein Dokument ist dort ein Dreiklang aus
**Vorlage × Inhalt × Variante**; aus zwei Inhalten und drei Sprachen werden
sechs Dokumente, mit drei Formaten achtzehn Dateien.

* **Inhalte nach Kapiteln geordnet**: Strecken zuerst, danach je Kapitel seine
  Stellen mit Bildern – eine flache Liste mit 1153 Stellen wäre keine Auswahl.
* **Achse** ist jedes Labelfeld: Sprache, Rolle, Sparte, Markt, Version, Land.
  Die Werte stehen mit ihrer Bildzahl daneben.
* **Vorschau** je Dokument: die gerechneten Blätter, die Bilder einzeln (jedes
  mit der Lupe), dazu Kapitel und gemeinsame Labels.
* **Formate**: PDF, Word (`.docx`), PowerPoint (`.pptx`) und HTML. Word und
  PowerPoint sind ZIP-Archive mit XML – beide baut die Seite selbst, ohne
  fremde Bibliothek, mit einem Blatt je Seite bzw. Folie im Format des Blattes.
* **In den Ordner schreiben** legt alles unter `output/<Variante>/<Vorlage>/`
  ab; dieselbe Ordnerwahl wie im Register Verzeichnis.

Ein Auftrag ohne Bild bleibt in der Liste und wird als leer ausgewiesen: wer
drei Sprachen erwartet und zwei bekommt, soll die Lücke sehen.

## F-57 · Die Lupe – ein Bild groß, mit allem, was dazugehört

**Seit** 1.39.0 · betrifft Eingang, Suchchat, Editor, Output

**Das Problem** Die Karten im Eingang sind Briefmarken. Ob ein Screenshot
wirklich die richtige Maske in der richtigen Fassung zeigt, lässt sich daran
nicht entscheiden – und die Angaben dazu stehen in vier verschiedenen
Ansichten.

**Die Lösung** Ein Knopf mit der Lupe auf jeder Bildkarte öffnet ein eigenes
Fenster: links das Bild groß (die jüngste Fassung in voller Auflösung, bis sie
geladen ist die Vorschau), rechts vier Abschnitte:

| Abschnitt | Inhalt |
| --- | --- |
| **Text** | Titel, Notiz, Seite, Begriffe, Projekt mit Version und Land |
| **Kapitel** | der Weg von oben (7 › 7.5 › 7.5.2) und der Sprung in die Gliederung |
| **Labels** | jedes gesetzte Label mit seinem Zeichen |
| **Rezept** | Quelle, Ausschnitt, Einfuhr, Bearbeitungen, Fassungen, Erfasser – und in welchem Schritt welcher Strecke das Bild steht |

Dazu zwei Wege hinaus: in den Editor oder in den Eingangsdialog.

## F-58 · Register OCR – den Text aus den Bildern holen

**Seit** 1.40.0 · betrifft OCR, Eingang

**Das Problem** In den Bildschirmfotos steckt Text: Feldbeschriftungen,
Tabellenzeilen, Meldungen. Für ein Handbuch wird er gebraucht – abgetippt
wird er heute von Hand.

**Die Lösung** Ein eigenes Register. Links die Bilder der Arbeitsmenge mit
Kästchen („alle“, „keines“, „nur ungelesene“), rechts je gewähltem Bild ein
Textfeld. „Text erkennen“ holt den Text, das Feld zeigt ihn – **änderbar**,
denn eine Lesung ist keine Messung.

**Wer liest.** Nicht die Seite: ein Texterkenner wäre ein fremdes Programm,
und die Inhaltsrichtlinie des Artifacts lässt keines zu (eine mitgelieferte
WASM-Erkennung samt Sprachdaten wäre zudem ein Vielfaches der ganzen Seite).
Lesen kann **Claude** über die Fähigkeit `sample`, die Bilder mitnimmt. Die
Seite schickt das Bild und eine Aufforderung, die sagt, was zu tun ist: Text
Zeile für Zeile, Tabellenspalten mit `|` getrennt, nichts deuten, nichts
ergänzen, Unleserliches als `[…]`.

**Kacheln.** Jedes gesendete Bild wird auf rund 1,2 Megapixel verkleinert –
bei kleiner Schrift wäre das der Unterschied zwischen Lesen und Raten. Bilder
darüber werden darum in waagerechte, leicht überlappende Kacheln zerlegt
(höchstens sechs) und Kachel für Kachel gelesen; die Antworten werden
zusammengefügt. Ein Bildschirmfoto in 1440 × 900 ergibt zwei Kacheln.

**Was mit dem Text geschieht**

| Weg | Ergebnis |
| --- | --- |
| Textfeld | ändern, ergänzen, von Hand eintragen – auch ganz ohne Claude |
| In die Notiz übernehmen | der Text steht an der Aufnahme (auf 2000 Zeichen gekürzt) und ist damit durchsuchbar |
| Als Textdatei | `texte-JJJJ-MM-TT.txt`, je Bild ein Abschnitt mit Stelle und Kennung |
| Als Word | `texte-JJJJ-MM-TT.docx` – echter Text, kein Bild: weiterschreibbar |

Die Lesungen liegen im Browser (`screenarchiv:ocr`) und überleben das
Neuladen. Fehlt die Fähigkeit oder darf sie keine Bilder sehen, sagt die
Ansicht das und bleibt als Schreibfläche brauchbar.

## F-59 · Bildvergleich – was sich zwischen zwei Fassungen geändert hat

**Seit** 1.41.0 · betrifft Prüfung (Projektvergleich)

**Das Problem** Der Projektvergleich (F-54) sagt, welche *Stelle* neu ist
oder entfallen. Die Frage davor bleibt offen: Hat sich die Maske selbst
geändert – und wo? Für einen Releaseletter ist genau das der Inhalt.

**Die Lösung** Jede Zeile „in beiden“ bekommt den Knopf **Bilder
vergleichen**. Er öffnet ein Fenster mit drei Bildern: *vorher*, *nachher*
und *Unterschied* – das zweite Bild mit roten Rahmen um die veränderten
Bereiche. Darüber steht der Satz: `1,1 % der Fläche verändert · 2 Bereiche ·
kleine Änderungen`.

**Wie gerechnet wird** Beide Bilder werden auf das Maß des ersten gebracht
und Punkt für Punkt verglichen; als verschieden gilt ein Punkt ab einem
Abstand von 36 über R, G und B zusammen. Gezählt wird in einem Raster von
24 × 16 Kacheln; eine Kachel gilt ab 1,5 % veränderter Punkte als verändert,
und benachbarte veränderte Kacheln werden zu Bereichen zusammengefasst – so
stehen drei Stellen da statt 384 Kästchen.

**Was der Vergleich nicht kann** Er sieht Bildpunkte, keine Bedeutung. Ein
verschobener Block ist für ihn eine große Änderung, eine geänderte Zahl eine
kleine. Darum nennt er Anteile und Bereiche und urteilt nicht darüber, ob die
Änderung wichtig ist. Sind die Maße verschieden, steht das dabei – das ist
selbst schon eine Änderung. Gibt es an einer Stelle mehr als ein Bild je
Fassung, wird das erste verglichen und die Zahl der übrigen genannt.

Der Vergleich lässt sich als PNG sichern – mit den roten Rahmen darin.

## F-60 · Der Agent Sprache – heißt dasselbe überall gleich?

**Seit** 1.42.0 · betrifft Prüfung

**Das Problem** Die drei Agenten prüften Vollständigkeit und Ordnung, nicht
die Begriffe. In einem Handbuch für Händler steht dann an einer Stelle
„Dealer“, an der nächsten „Händler“, und „oneSCM“ ist dreimal anders
geschrieben. Das fällt beim Lesen auf, nicht beim Sammeln.

**Die Lösung** Ein vierter Agent, der die Texte prüft – Titel, Notiz,
Begriffe, die Schritttexte der Strecken und, wenn vorhanden, die Lesungen aus
dem Register OCR. Er prüft vier Dinge:

| Prüfung | Beispiel |
| --- | --- |
| **Wortliste** | „Dealer“ steht an einem Bild mit Sprache `de`, die Liste sieht „Händler“ vor |
| **Schreibweise** | „OneSCM“ statt „oneSCM“ – eine Regel, die nur die Schreibweise meint, achtet auf Groß und Klein und trifft das Richtige nicht mit |
| **Sprache gegen Label** | ein englischer Titel an einem Bild mit Label „Deutsch“ (geraten an häufigen Wörtern, und ohne deutliches Übergewicht gibt es keinen Befund) |
| **Uneinheitliche Schreibweise** | dasselbe Wort in den Titeln verschieden geschrieben, mit Häufigkeit je Form |

**Die Wortliste** steht in der Ansicht und lässt sich ändern: eine Regel je
Zeile, `falsch -> richtig`, dahinter in Klammern die Sprache, für die sie
gilt. Ohne Sprache gilt die Regel überall; eine Regel *mit* Sprache gilt nur
für Bilder, die diese Sprache tragen. Zeilen mit `#` werden übersprungen. Die
Liste liegt in `screenarchiv:woerter`, überlebt das Neuladen, und „Vorgabe
wiederherstellen“ holt den Anfangsbestand zurück.

Der Agent urteilt nach Regeln, nicht nach Geschmack: **was nicht in der Liste
steht, wird nicht geprüft.** Claude darf den Bericht hinterher kommentieren –
wie bei den anderen dreien.

## F-61 · Das Handbuch als Word-Datei – Text bleibt Text

**Seit** 1.43.0 · betrifft Designstudio

**Das Problem** Das ganze Handbuch gab es als HTML (gut zum Lesen und
Drucken) und als Blätter in PDF, Word oder PowerPoint (gut zum Weitergeben) –
dort ist jede Seite aber ein **Bild**. Wer im Haus weiterschreibt,
kommentiert, ein Inhaltsverzeichnis erzeugen oder einen Absatz übersetzen
will, braucht Text.

**Die Lösung** „Handbuch als Word sichern“ schreibt eine `.docx`, in der

* jede Stelle der Gliederung eine **echte Überschrift** ist (Heading 1–3 mit
  `outlineLvl`): die Navigation in Word ist gefüllt, ein Inhaltsverzeichnis
  lässt sich mit einem Klick erzeugen,
* die Texte der Gliederung (Beschreibung, Abschlusskriterium, Notiz) als
  Absätze stehen – such- und kopierbar,
* die Bilder **inline** liegen, seitenbreit skaliert, jedes mit einer
  Bildunterschrift aus Schrittnummer, Anweisung und Labelkette,
* Titel, Untertitel und Hinweis aus dem Studio oben stehen.

Der Schalter „Texte aus dem Handbuch“ wirkt auch hier: ohne ihn bleiben
Überschriften und Bilder, die Erläuterungen entfallen. Die Bildgröße folgt
der Wahl im Studio.

Gegengeprüft mit LibreOffice: das Dokument öffnet, die Überschriften stehen
in der Gliederung, die Bilder sind drin, der Umlaut im Titel stimmt.

## F-62 · Die Hausmarke – Farbe, Schrift und Logo der Unterlagen

**Seit** 1.44.0 · betrifft Designstudio, alle Blätter und Deckblätter

**Das Problem** Die Blätter sahen aus wie die Anwendung. Für eine Unterlage,
die im Haus herumgeht, ist das die falsche Handschrift – und ohne die
Vorlagen des Hauses lässt sich das Richtige nicht erraten.

**Die Lösung** Ein Block **Hausmarke** im Studio mit drei Angaben und einem
Bild:

| Angabe | Wirkung |
| --- | --- |
| **Akzentfarbe** | das Band auf dem Deckblatt, die Schrittnummern, die Marken |
| **Textfarbe** | Überschriften und Fließtext der Blätter |
| **Schrift** | Archivo (wie die Seite), IBM Plex Sans, Arial, Helvetica, Georgia oder Verdana |
| **Logo** | PNG, JPEG, SVG oder WebP bis 200 kB – steht oben rechts auf dem Deckblatt |

Ohne Angabe gilt das Aussehen der Anwendung; „Hausmarke zurücksetzen“ stellt
das wieder her. Die Angaben liegen bei den Studio-Einstellungen
(`screenarchiv:design`) und überleben das Neuladen.

**Was die Seite nicht kann:** die Hausschrift laden. Die Inhaltsrichtlinie
des Artifacts lässt nur die Schriften von Google Fonts zu, und eine
Unternehmensschrift liegt dort nicht. Zur Wahl stehen darum die Schriften der
Seite und die, die auf jedem Rechner vorhanden sind – Arial ist in den
meisten Häusern die zugelassene Ersatzschrift. Die Festbreitenschrift für
Kennungen und Zahlen bleibt in jedem Fall, sonst stünden Spalten nicht mehr
untereinander.

Ein Logo wird nicht nachgeladen, sondern als Datei übernommen und eingebettet
– die Seite erreicht kein Netz.

## F-63 · Die Projektdatei – den Bestand weitergeben

**Seit** 1.45.0 · betrifft Verzeichnis, Eingang, Strecke, Design, OCR

**Das Problem** Der Bestand liegt im Browser eines Menschen. „Als JSON
sichern“ nimmt die Metadaten mit, nicht die Bilder; das Verzeichnis legt
Dateien auf eine Platte, aber keinen Arbeitsstand. Zwischen zwei Menschen gab
es keinen Weg – und zwischen zwei Rechnern derselben Person auch nicht.

**Die Lösung** Eine **Projektdatei**: ein ZIP mit allem darin.

| Im Paket | Form |
| --- | --- |
| Aufnahmen samt Labels, Stellen, Marken, Fassungen | `screenarchiv.json` |
| Strecken, Projekte, Einstellungen des Studios, Wortliste, Lesungen aus OCR | dieselbe Datei |
| Jedes Bild in **voller Auflösung**, jede Fassung einzeln | `bilder/auf-2026-001.jpeg`, `…--f2.jpeg` |
| Wie man sie einliest | `LIESMICH.txt` |

Die **Vorschauen bleiben draußen** – sie wären der größte Teil der Datei und
entstehen beim Einlesen neu aus dem vollen Bild.

**Beim Einlesen** entscheidet eine Wahl: *ergänzen* behält den eigenen
Bestand und hängt das Paket an; *ersetzen* gibt ihn auf. Beim Ergänzen
bekommt eine Kennung, die schon vergeben ist, eine neue – und die Strecken
des Pakets werden auf die neuen Kennungen umgeschrieben, damit kein Schritt
ins Leere zeigt. Was umbenannt wurde, steht im Bericht.

Gelesen wird nachsichtig: eine Datei aus einer neueren Fassung wird
eingelesen und als solche genannt; ein Bild, das sich nicht entpacken lässt,
fehlt und wird im Bericht benannt; eine fremde Datei bekommt den Grund
gesagt, statt stumm zu scheitern.

## F-64 · Das Fortschrittsblatt – wie weit ist das Handbuch?

**Seit** 1.46.0 · betrifft Gliederung

**Das Problem** Die Gliederung hat 1153 Stellen. „Wie weit sind wir?“ lässt
sich daran nicht ablesen, und eine Zahl allein („312 Bilder“) sagt nicht, ob
das viel ist. Für die Statusrunde fehlte ein Blatt.

**Die Lösung** Unter der Deckungsmatrix entsteht ein **Blatt in A4 quer und
300 dpi**: oben der Stand in einem Satz und als Balken, darunter je Kapitel
eine Zeile mit Balken, `belegt/gesamt Stellen`, Zahl der Bilder und – wenn
eine zweite Achse gewählt ist – wie viele Stellen je Sprache, Rolle, Sparte,
Markt, Version oder Land belegt sind.

**Gezählt werden Stellen, nicht Bilder.** Zehn Bilder an einer Stelle machen
ein Kapitel nicht fertiger als eines; das steht auch auf dem Blatt.

Alle Kapitel kommen aufs Blatt – statt zu kürzen wird die Schrift kleiner:
ein Stand, dem Kapitel fehlen, ist keiner. Das Blatt folgt der Arbeitsmenge
(F-52) und der Hausmarke (F-62) und lässt sich als **PNG** oder **PDF**
sichern.

## F-65 · Der Rückweg aus Word – geänderte Texte zurück in die Gliederung

**Seit** 1.47.0 · betrifft Gliederung, Designstudio, Handbuch

**Das Problem** Das Handbuch geht als Word-Datei ins Haus (F-61). Dort wird
daran geschrieben: ein Satz genauer, ein Kriterium klarer. Bisher endete der
Weg dort – die Seite kannte diese Änderungen nicht, und beim nächsten Export
waren sie wieder weg.

**Die Lösung** In der Gliederung liest ein Block **Texte aus Word zurück**:
die Überschriften nennen die Stelle (`7.5.1 Dokumentierte Signaturwege`), die
Absätze darunter sind ihr Text, `Fertig, wenn: …` ist das Kriterium –
genau so, wie die Seite es geschrieben hat. Bildunterschriften werden
übergangen, Überschriften ohne Nummer beenden die laufende Stelle.

**Erst die Liste, dann die Entscheidung.** Die Datei ändert nichts: sie
erzeugt einen Vergleich – je Stelle `geändert` (mit altem und neuem Text),
`unverändert` oder `nicht in der Gliederung`. Angekreuzt wird, was
übernommen werden soll.

**Die Gliederung im Projekt bleibt unangetastet.** Übernommene Texte liegen
als **eigene Texte** daneben (`screenarchiv:texte`) und legen sich über die
Gliederung – im Handbuch, auf den Blättern und in der Ansicht, wo ein
Hinweis „eigener Text“ darunter steht. „Eigene Texte verwerfen“ stellt den
Stand des Projekts wieder her.

Damit ist der Kreis geschlossen: Gliederung → Blätter und Word-Handbuch →
Änderungen im Haus → zurück in die Seite → nächste Ausgabe.

## F-66 · Die Sprache der Unterlagen

**Seit** 1.48.0 · betrifft Designstudio, Handbuch, Fortschrittsblatt

**Das Problem** Die Bilder gibt es in jeder Sprache (Varianten, F-46) – der
**Rahmen** um sie herum war immer deutsch: „Seite 2 von 5“, „Stelle im
Handbuch“, „Fertig, wenn:“, „Stand“. Für einen Markt außerhalb DACH ist eine
Unterlage damit nicht fertig.

**Die Lösung** Im Studio steht „Sprache der Unterlagen“ (Deutsch, English).
Umgestellt werden alle Texte, die die Seite **selbst schreibt**:

| Ort | Beispiel |
| --- | --- |
| Deckblatt | `Content`, `Section in the manual`, `Images`, `As of` |
| Kopf- und Fußzeile | `Page 2 of 5` |
| Handbuch (HTML und Word) | `User manual`, `Completion criterion`, `Sequence:`, `Done when:` |
| Bildunterschriften | `Step 3 · …` |
| Fortschrittsblatt | `State of the manual`, `87 of 1123 sections covered` |
| Sprachkennung | `<html lang="en">`, Titel in den Word-Angaben |

**Was nicht übersetzt wird: die Inhalte.** Titel, Notizen und die Texte der
Gliederung stehen so da, wie sie erfasst wurden – eine Maschine, die sie
überträgt, würde behaupten, sie verstünde sie. Für eine andere Sprache gibt
es die Varianten (dieselbe Maske auf Englisch) und die eigenen Texte (F-65).

**Die Oberfläche bleibt deutsch.** Sie bedient das Team; die Unterlagen gehen
in den Markt. Eine weitere Sprache braucht nur einen Eintrag in `WORTE` –
unbekannte Schlüssel fallen auf Deutsch zurück, es bleibt also nie etwas leer.

## F-67 · Die Hausmarke als eigene Datei

**Seit** 1.49.0 · betrifft Designstudio

**Das Problem** Die Hausmarke (F-62) lag nur im Browser dessen, der sie
eingerichtet hat. Sie reiste zwar in der Projektdatei (F-63) mit – aber wer
nur das Erscheinungsbild braucht und nicht den ganzen Bestand, musste es
nachstellen: Farbe tippen, Logo suchen, Vorlagen neu bauen.

**Die Lösung** „Hausmarke sichern“ schreibt `hausmarke-….json` mit dem
**Erscheinungsbild allein**: Akzent- und Textfarbe, Schrift, Logo
(eingebettet), Sprache der Unterlagen, Kopf- und Fußzeile, Deckblattschalter,
gewählte Vorlage und die **eigenen Vorlagen**. „Hausmarke aus Datei laden“
übernimmt alles davon; eigene Vorlagen gleichen Namens weichen den neuen,
die übrigen bleiben.

**Was nicht mitreist:** Titel, Untertitel und Hinweis – das ist Inhalt, nicht
Erscheinungsbild. So wird aus der Datei keine halbe Unterlage.

Gelesen wird nachsichtig: eine Farbe, die keine ist, kommt auch aus der Datei
nicht durch; eine fremde Datei bekommt den Grund gesagt; eine neuere Fassung
wird gelesen und als solche genannt.

## F-68 · Suche über die Lesungen – finden, was im Bild steht

**Seit** 1.49.0 · betrifft Eingang, OCR

**Das Problem** Das Register OCR (F-58) holt den Text aus den Bildern – und
legte ihn in ein Feld, das nur dort zu sehen war. Wer das Bild suchte, auf
dem „Termintreue“ steht, fand es nicht: Titel, Notiz und Begriffe kennen das
Wort nicht.

**Die Lösung** Die Suche im Eingang durchsucht die Lesungen mit. Eine Karte,
deren Treffer **nur** aus der Lesung kommt, trägt die Marke „im Bildtext“ –
so ist nie unklar, warum sie dasteht.

Gesucht wird wie überall in zwei Schreibweisen (mit und ohne Umlaute), und
mehrere Wörter müssen alle vorkommen – auch über Feld und Lesung hinweg
(„Übersicht Termintreue“ trifft nur, wo beides steht). Der Suchtext einer
Lesung wird je Satz einmal gerechnet und gemerkt; er verfällt, wenn die
Lesung sich ändert.

## F-69 · Stapelverarbeitung beim Import – ein Durchgang statt vierzig Handgriffe

**Seit** 1.50.0 · betrifft Import, Gliederung, Labels

**Das Problem** Der Import (F-19) legt jedes Folienbild als eigene Karte hin:
Titel, Rezept, Stelle. Bei drei Folien ist das richtig, bei vierzig ist es
vierzigmal dasselbe Auswahlfeld und vierzigmal dieselbe Sprache, Rolle und
derselbe Markt. Ein Foliensatz läuft aber ein Kapitel entlang und trägt für
alle Folien dieselben Labels.

**Die Lösung** Ein Aufklapper **Stapel** über der Liste, der den ganzen
Durchgang bedient:

* **Alle wählen / Keines** über alle eingelesenen Dateien zugleich
* **Stellen fortlaufend vergeben** – die gewählten Bilder bekommen in ihrer
  Reihenfolge die folgenden Blätter der Gliederung, ab der oben gewählten
  Stelle. Reicht das Kapitel nicht, bleibt der Rest leer und das steht da
* **Stellen aus dem Folientext** – je Bild die Stelle, deren Thema im Text
  vorkommt. Eine Nummer im Text entscheidet; sonst braucht es **mehr als die
  Hälfte** der Themenwörter, sonst bleibt es leer
* **Stellen leeren** als Weg zurück
* **Sechs Labelfelder** (Sprache, Rolle, Sparte, Markt, Version, Land), die
  für alle Bilder dieses Durchgangs gelten

Der Kopf des Bandes sagt zugeklappt, was ansteht: „40 gewählt · 40 mit Stelle
· 3 Label“.

Gemeinsam sind die Labels, nicht die Stelle – jede Folie behält die ihre. Ein
Bild mit eigener Stelle in seiner Karte behält sie; die Stelle oben gilt nur
für die ohne.

**Kern** `folgendeStellen(gliederung, start, anzahl, { nurBlaetter })` und
`stelleAusText(gliederung, text)` – beide ohne Oberfläche, beide geprüft.

## F-70 · Die Navigation in fünf Aufgaben

**Seit** 1.51.0 · betrifft Kopf, alle Ansichten · **ändert** F-16

**Das Problem** Dreizehn gleich aussehende Knöpfe in einer Reihe. Dreizehn ist
genau die Zahl, bei der eine Reihe aufhört, eine Reihe zu sein: man liest sie
nicht mehr, man sucht in ihr. Dabei fallen die Ansichten sauber in fünf
Aufgaben – die Reihe sagte es nur nicht.

**Die Lösung** Die Register stehen in fünf benannten Aufgaben, in der
Reihenfolge, in der die Arbeit läuft:

| Aufgabe | Ansichten |
| --- | --- |
| **Bestand** | Archiv, Eingang |
| **Hereinholen** | Aufnahme, Import, Ausschneiden |
| **Aufbereiten** | Editor, Strecke, OCR |
| **Ordnen und prüfen** | Gliederung, Prüfung |
| **Ausgeben** | Design, Output, Verzeichnis |

Keine Ansicht verschwindet, keine zieht um, kein Befehl ändert sich; die
Adressen (`#ans=ocr`) gelten unverändert. Der Schriftzug „Portal“ vor der
Reihe ist entfallen – vor fünf Überschriften war er eine sechste, die nichts
sagt.

Dazu steht in **Design** und **Output** je ein Satz, der auf das andere
zeigt: Design richtet das Aussehen **eines** Blattes ein, Output erzeugt
**den Satz** Dokumente daraus. Das war die Teilung von Anfang an, stand aber
nirgends.

Grundlage ist die [Durchsicht](../durchsicht.md) über 69 Funktionen in
dreizehn Ansichten. Sie nennt auch, was **nicht** geändert wurde und warum.

## F-71 · Weitergeben – vier Wege, einer je Zweck

**Seit** 1.53.0 · betrifft Eingang, Verzeichnis, Design · **ändert** F-22

**Das Problem** Vier Wege, den Bestand weiterzugeben, in drei Ansichten:
Eingang als JSON (F-22) und Kontaktbogen (F-23) im Eingang, Projektdatei
(F-63) im Verzeichnis, Hausmarkendatei (F-67) im Design. Jeder entstand da,
wo sein Inhalt herkommt – nur half das niemandem, der *einen* davon suchte.
Und einer, „Als JSON sichern“, bot sich als Weg zum Weitergeben an, obwohl
er die Bilder nicht mitnimmt.

**Die Lösung** Ein Aufklapper **„Weitergeben“** im Eingang mit einer Tafel:
je Weg, was mitreist, wofür er taugt und wo er liegt. Die beiden fernen Wege
bekommen einen Knopf, der hinführt (**Im Verzeichnis**, **Im Design** – dort
klappt das Studio gleich auf); die beiden im Eingang stehen oben in der
Leiste und werden nicht verdoppelt.

Darunter der Satz, der die Entscheidung abnimmt: **im Zweifel die
Projektdatei**, weil eine JSON-Datei allein beim Empfänger leere Karten
ergibt.

**Als JSON sichern** meldet seit dieser Fassung beim Sichern mit, was
**nicht** in der Datei steht („nur die Metadaten, ohne Bilder. Zum
Weitergeben die Projektdatei im Verzeichnis.“). Der Knopf bleibt – er ist
eine Sicherung des eigenen Speichers und seit 1.0 an seinem Platz; er hört
nur auf, sich als etwas anzubieten, das er nicht ist.

Verzeichnis und Design zeigen mit je einem Satz auf die Übersicht zurück.

## F-72 · Register Video – aus Bildschirmvideos werden Handbuchbilder

**Seit** 1.55.0 · betrifft Video, Eingang, Gliederung, Labels

**Das Problem** Mit dem Snipping Tool aufgenommene Videos zeigen eine Folge
von Masken – genau das, was ein Handbuch braucht. Der Weg dorthin führte
über Standbilder von Hand: abspielen, anhalten, Bildschirmfoto, von vorn.
Bei vierzig Masken ist das kein Weg mehr.

**Die Lösung** Ein Register **Video**: Datei ablegen, Einzelbilder
herausnehmen, Text deuten lassen, in den Eingang übernehmen.

* **Automatisch**: das Video wird an 12 bis 96 Stellen abgetastet; behalten
  wird ein Bild nur, wenn es sich vom zuletzt behaltenen um mehr als die
  gewählte Schwelle (0,5 / 2 / 8 %) unterscheidet. Gerechnet wird mit dem
  Bildvergleich aus F-59. An jedem Bild steht, **warum** es dasteht
* **Von Hand**: im Spieler an eine Stelle gehen, „Bild an dieser Stelle“
* **Text deuten lassen** über `sample` wie in F-58: je Bild ein bis zwei
  Sätze, was der Benutzer dort tut – im Imperativ, als Anweisung. Der Text
  wird beim Übernehmen zum Rezept
* **Übernehmen** wie der Stapel im Import (F-69): Stelle für alle, Stellen
  fortlaufend, Stellen aus dem Text, sechs Labelfelder für den Durchgang

Jedes Bild entsteht in der **vollen Auflösung des Videos**. An der Aufnahme
bleibt die Herkunft (`einfuhr`: Datei, Bild, Sekunde), und der Zeitpunkt
steht als Seitenangabe (`00:06,1`) daran.

**Was nicht geht, und warum** Die Seite **holt kein Video ab**: sie darf
nichts aus dem Netz laden (Inhaltsrichtlinie des Artifacts), und Clipchamp
gibt seine Projekte nicht als Datei heraus. Der Weg ist Export als MP4 und
Ablegen der Datei; sie wird nicht hochgeladen. Kein Ton, kein Schnitt.

Weil Clipchamp MP4 mit H.264 exportiert und dieses Verfahren manchen
Browsern unter Linux fehlt, steht **über** dem Dateifeld, was dieser Browser
abspielt – gefragt mit `canPlayType`, nicht geraten.

**Kern** `videoSchritte`, `videoWahl`, `zeitText`, `zeitKennung`,
`videoBildname`, `videoAufforderung`, `videoText`, `videoFormatBericht`,
`videoStand`, `istVideo`, `VIDEO_FORMATE` – alle ohne Oberfläche, alle
geprüft.

## F-73 · Gebrauch – die Probe mit den Verdachtsfällen

**Seit** 1.56.0 · betrifft Prüfung, alle Ansichten

**Das Problem** Die [Durchsicht](../durchsicht.md) nannte sechs Funktionen,
die wahrscheinlich tot sind, und konnte nichts entscheiden: es gab **keine
Nutzungsdaten**. Die Seite zählt nichts und schickt nichts weg – das ist
Absicht und bleibt. Aber was jemand selbst benutzt, darf er selbst wissen.

**Die Lösung** Ein einziger Zuhörer auf der Seite vermerkt, welcher Befehl
gedrückt und welche Ansicht geöffnet wurde, im `localStorage` dieses
Browsers (`screenarchiv:gebrauch`). Im Register **Prüfung** steht der
Aufklapper *„Gebrauch: was Sie benutzen – und was nicht“* mit vier Listen:
nie gedrückt, selten (unter dreimal), benutzt, und **durch Zählen nicht zu
beantworten**.

Der Bericht urteilt nicht, er sortiert – und sagt, wie lange schon gezählt
wird, weil eine Woche nichts beweist. Steht etwas unter „nie“, heißt der
Satz: *ein Grund zu fragen, nicht zu löschen.*

**Wo die Zahlen bleiben** Im Browser dieses Rechners. Sie werden nicht
verschickt, reisen nicht in der Projektdatei mit, und ein Knopf setzt sie
zurück (zweimal gedrückt – eine Zählung entsteht in Wochen). Gezählt wird
die Kennung des Knopfes, sonst nichts: keine Zeiten, keine Inhalte, keine
Reihenfolge.

**Was sich so nicht beantworten lässt** Eine Kennzahlenleiste (F-08, F-09)
wird angesehen, nicht gedrückt. Statt eine Zahl zu erfinden, steht sie in
einer eigenen Liste.

**Kern** `GEBRAUCH_SCHLUESSEL`, `GEBRAUCH_SELTEN`, `BEOBACHTETE`,
`leseGebrauch`, `schreibeGebrauch`, `zaehleGebrauch`, `tageSeit`,
`gebrauchBericht`, `gebrauchText`.

