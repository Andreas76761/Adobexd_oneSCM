# Feature-Katalog

Stand: Anwendung **v1.8.0**, Datenbestand **1.0.0**.

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
| F-26 | Ausschneiden mit wählbarer Ablage | 1.7.0 | `core.mjs` → `dateinameAus`, `pruefeAblage`; `schnipsel.js` | Kernlogik: 6 Fälle · Ausschneiden: 15 Fälle |
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

Oben links, unter dem Titel, steht die Gruppe **Portal** mit vier Ansichten:
**Archiv** (der Bestand), **Aufnahme** (Quelle wählen und auslösen),
**Ausschneiden** (Schnipsel vom geteilten Bildschirm, F-26) und **Eingang**
(die aufgenommenen Bilder). Am Eingang zeigt eine Marke, wie viele Aufnahmen dort
liegen. Die Ansicht steht in der Adresszeile (`#ans=aufnahme`) und lässt sich
verlinken. Die Suche im Kopf gehört zum Archiv und tritt in den anderen
Ansichten zurück; der Eingang hat seine eigene.

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

Beide Bänder bleiben verborgen, solange es nichts zu zeigen gibt.

**Ordner über Sitzungen** Der Zugriff liegt in der Browserdatenbank
(IndexedDB) – als Text ließe er sich nicht ablegen. Beim Öffnen wird er
zurückgeholt: besteht die Schreiberlaubnis noch, ist der Ordner sofort wieder
da; sonst wartet er auf einen Klick, weil eine Erlaubnis nur nach einer
Handlung erfragt werden darf.
