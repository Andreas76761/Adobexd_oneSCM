# Architektur

## Trennung der Ebenen

```
Adobexd_oneSCM/
├── data/                      DATEN – Inhalt, unabhängig von der Darstellung
│   ├── eintraege.json         der Bestand (Belege + Vokabular)
│   ├── schema/                JSON-Schema des Bestands
│   ├── generator/             erzeugt aus den Daten die Aufnahmen
│   │   ├── screens.mjs        Zeichenwerk (SVG-Archetypen)
│   │   └── erzeuge-screens.mjs Aufruf, schreibt data/screens/
│   └── screens/               erzeugte Aufnahmen + manifest.json
│
├── app/                       ANWENDUNG
│   ├── src/
│   │   ├── core.mjs           Kernlogik ohne DOM (Suche, Filter, Wirkung, Zustand,
│   │   │                      Aufnahme-Entwurf, Ausschnitt, Eingang, Marken,
│   │   │                      Fassungen, Gliederung, Labels, Strecken, BPMN,
│   │   │                      Designvorlagen, Archive, Suchchat, Agenten,
│   │   │                      Varianten, Verzeichnisplan)
│   │   ├── ui.js              Navigation, Archivansicht, Detailansicht
│   │   ├── aufnahme.js        Aufnahmestudio und Eingang
│   │   ├── schnipsel.js       Ausschneiden, Ordnerzugriff, Beipackzettel
│   │   ├── markieren.js       Editor, Strecke, Gliederung, Deckungsmatrix
│   │   ├── design.js          Designstudio (Blätter, Deckblatt, Vorlagen)
│   │   ├── import.js          Import aus PNG, PPTX, DOCX, XLSX, PDF
│   │   ├── chat.js            Suchchat (frei bewegliches Fenster)
│   │   ├── pruefung.js        die drei Agenten
│   │   ├── ablage.js          Verzeichnis – die Galerie auf die Platte
│   │   ├── styles.css         Gestaltung, Farbtoken für beide Themen
│   │   └── index.template.html Gerüst mit Platzhaltern
│   └── build/build.mjs        setzt alles zu einer Datei zusammen
│
├── dist/index.html            ERGEBNIS – genau diese Datei wird veröffentlicht
│
├── Dokumentation/             DOKUMENTATION (dieses Verzeichnis)
├── Testing/                   PRÜFUNG (Runner, Helfer, Testfälle)
└── .claude/                   CLAUDE – Projektgedächtnis und Skill
```

## Datenfluss

```
data/eintraege.json ──▶ data/generator ──▶ data/screens/*.svg + manifest.json
        │                                            │
        └──────────────┬─────────────────────────────┘
                       ▼
       app/build/build.mjs  ◀── app/src/{core.mjs, die neun Oberflächenmodule,
                       ▼                  styles.css, index.template.html}
                       ▼
              dist/index.html  ──▶ Artifact
```

## Warum eine einzelne Datei

Das Artifact veröffentlicht genau eine HTML-Datei; sie wird beim Veröffentlichen
in ein `<!doctype html> … <body>`-Gerüst gehüllt. Deshalb enthält
`dist/index.html` weder `<html>` noch `<head>` noch `<body>`. Alles Weitere –
Stil, Kernlogik, Oberfläche, Daten und die 40 Aufnahmen – steht inline in der
Datei. Externe Abrufe scheitern an der Inhaltsrichtlinie der Vorschau; erlaubt
sind allein Schriften von `fonts.googleapis.com` / `fonts.gstatic.com`.

## Ein Skriptbereich, neun Oberflächendateien

Alle Oberflächenmodule werden vom Build in **dieselbe** Klammer geschrieben:

```js
(function () { 'use strict';
  /* ui.js, aufnahme.js, schnipsel.js, markieren.js, design.js,
     import.js, chat.js, pruefung.js, ablage.js */
})();
```

Sie teilen sich damit Helfer (`el`, `$`, `zustand`, `setze`, `zeichne`) und
Zustand (`eingang`, `strecken`, `GLIEDERUNG`) ohne globale Namen. Weil
`aufnahme.js` Werte anlegt, die `ui.js` liest, steht der Start am Ende:
`ui.js` erklärt `starte()`, aufgerufen wird es in der **letzten Zeile der
letzten Datei** – derzeit `ablage.js`. Funktionserklärungen werden vorgezogen,
`const`/`let` nicht; deshalb diese Reihenfolge.

Eine gemeinsame Klammer hat einen Preis: **zwei gleiche Namen sind einer zu
viel.** Für den Browser ist das kein Fehler – die spätere Erklärung gewinnt
stumm, und die früheren Aufrufe laufen in die falsche Funktion. Genau das
passierte in 1.28.0 mit `zeichneStudio` (Aufnahme und Design): die Aufnahme
ließ sich nicht mehr auslösen, ohne eine einzige Fehlermeldung. Seither prüft
der Build die Namen aller Module gegeneinander und bricht ab, bevor so etwas
in die Seite kommt.

## Wo die Aufnahmen liegen

Der Eingang liegt im Browser des Betrachters (`localStorage`, Schlüssel
`screenarchiv:eingang`). Das veröffentlichte Artifact hat keinen Server, und
der Weg über `artifact.publish` – die Seite schreibt sich selbst neu – wurde
verworfen: er würde bei jeder Auslösung die vollständige Seite neu
veröffentlichen und alle offenen Ansichten neu laden. Ausführlich in
[versionen/v1.1.0.md](versionen/v1.1.0.md).

## Kernlogik doppelt genutzt

`app/src/core.mjs` ist ein gewöhnliches ES-Modul.

* Die **Tests** importieren es direkt (`import * as kern from '.../core.mjs'`).
* Der **Build** entfernt die `export`-Schlüsselwörter und schreibt den Rest in
  dasselbe `<script>`-Element wie die Oberfläche.

Damit prüft der Unit-Test genau den Code, der später ausgeliefert wird. Der
Build bricht ab, wenn nach dem Entfernen noch ein `export` übrig bleibt.

## Aufnahmen

Die Aufnahmen sind keine Fotos, sondern gezeichnete Bildschirmoberflächen. Der
Generator kennt sechs Archetypen (`uebersicht`, `liste`, `formular`, `checkout`,
`fehler`, `diagramm`) und zeichnet sie anhand weniger Schalter je Aufnahme –
`kontrast`, `dichte`, `hierarchie`, `primaer`, `symbole`, `fehlerAmFeld`,
`leerzustand`, `spalten`, `hinweis`, `doppelachse`, `skelett`, `sticky`,
`suchfeld`, `panel`. Vorher und Nachher unterscheiden sich genau in den
Schaltern, um die es im Beleg geht. Die Erzeugung ist deterministisch: derselbe
Datensatz ergibt Byte-gleiche Dateien, was ein Test absichert.

## Wo die Daten des Betrachters liegen

| Schlüssel | Ort | Inhalt |
| --- | --- | --- |
| `screenarchiv:eingang` | `localStorage` | Aufnahmen **ohne** Vorschau – 502 Byte je Satz (seit 1.34.0) |
| `screenarchiv:strecken` | `localStorage` | Klickstrecken mit Schritten |
| `screenarchiv:ablage` | `localStorage` | Ablageziele und Namensmuster |
| `screenarchiv:design` | `localStorage` | Einstellungen des Designstudios |
| `screenarchiv:verzeichnis` | `localStorage` | Muster und Schalter des Verzeichnisses |
| `screenarchiv:chat` | `localStorage` | Lage und Größe des Suchchats |
| `screenarchiv:ocr` | `localStorage` | die Lesungen des Registers OCR je Bild (seit 1.40.0) |
| `screenarchiv:woerter` | `localStorage` | die Wortliste des Agenten Sprache (seit 1.42.0) |
| `screenarchiv:projekte` | `localStorage` | angelegte Projekte (Name, Version, Land) und die gewählte Arbeitsmenge (seit 1.35.0) |
| `screenarchiv` → `bilder` | IndexedDB | Bilder in voller Auflösung (`AUF-…`, `AUF-…:<Fassung>`) |
| `screenarchiv` → `vorschauen` | IndexedDB | die Vorschauen je Aufnahme (seit 1.34.0) |
| `screenarchiv` → `zugriffe` | IndexedDB | der gemerkte Ordnerzugriff |

Nichts davon verlässt den Browser, solange der Betrachter es nicht selbst
ablegt: über „Als JSON sichern", den Kontaktbogen, eine Einzeldatei oder die
Ansicht **Verzeichnis**.

## Was Claude in der Seite tut – und was nicht

Zwei Stellen fragen Claude, wenn der Betrachter die Fähigkeit `sample` gibt:
der **Suchchat** (er lässt die Frage deuten) und die **Agenten** (sie lassen
den fertigen Bericht kommentieren). Beide sind so gebaut, dass die Seite ohne
Claude vollständig arbeitet:

* Der Chat **filtert immer selbst**. Von Claude kommt höchstens ein Filter,
  nie eine Antwort – darum kann im Fenster kein Bild stehen, das es nicht gibt.
* Die Agenten **urteilen immer nach Regeln**. Der Kommentar steht hinter den
  Befunden und ist als Kommentar gekennzeichnet.

Fehlt die Fähigkeit oder verweigert sie der Betrachter, sagt die Seite das und
arbeitet weiter.
