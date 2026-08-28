# Feature-Katalog

Stand: Anwendung **v1.0.0**, Datenbestand **1.0.0**.

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
