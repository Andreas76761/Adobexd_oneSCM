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
│   │   ├── core.mjs           Kernlogik ohne DOM (Suche, Filter, Wirkung, Zustand)
│   │   ├── ui.js              Oberfläche, nutzt die Kernlogik
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
       app/build/build.mjs  ◀── app/src/{core.mjs, ui.js, styles.css, index.template.html}
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
