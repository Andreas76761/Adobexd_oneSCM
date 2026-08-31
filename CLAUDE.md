# Projektgedächtnis

Screenarchiv – Bilddatenbank für Bildschirmaufnahmen aus dem Browser mit
Vorher/Nachher-Vergleich und Begründung. Ergebnis ist eine einzelne HTML-Datei,
die über das Artifact-Werkzeug veröffentlicht wird.

Ausführliche Unterlagen: `Dokumentation/README.md`.
Claude-eigene Ergänzungen (Skills, Einstellungen): `.claude/`.

## Ebenen nicht vermischen

| Ordner | Rolle |
| --- | --- |
| `data/` | Inhalt und dessen Erzeugung. Kennt die Oberfläche nicht. |
| `app/` | Anwendung: Kernlogik, Oberfläche, Stil, Build. |
| `dist/` | Ergebnis des Builds. **Nie von Hand bearbeiten.** |
| `Dokumentation/` | Feature-Katalog, Versionen, Architektur, Testkonzept. |
| `Testing/` | Runner, Helfer, Testfälle. |

## Arbeitsablauf nach jeder Änderung

```bash
npm run screens   # nur nötig, wenn data/ oder der Generator sich geändert hat
npm run build     # schreibt dist/index.html
npm test          # muss vollständig grün sein
```

`npm run alles` führt die drei Schritte nacheinander aus.

## Regeln

* **Kernlogik gehört in `app/src/core.mjs`**, nicht in die Oberflächenmodule. Nur so ist sie ohne Browser testbar. `core.mjs` darf kein DOM
  anfassen.
* **`ui.js`, `aufnahme.js` und `schnipsel.js` landen in einer gemeinsamen
  Klammer.** Sie teilen sich dadurch `el`, `$`, `zustand` und `zeichne`. Der
  Start steht in `starte()` (erklärt in `ui.js`) und wird in der **letzten
  Zeile der letzten Datei** aufgerufen – derzeit `schnipsel.js`. Kommt ein
  weiteres Oberflächenmodul dazu, wandert der Aufruf ans neue Ende; vorher
  stehen dortige `const`/`let` noch nicht bereit.
* **Keine externen Ressourcen** in der Seite außer den Schriften von
  `fonts.googleapis.com` / `fonts.gstatic.com`. Bilder, Skripte und Daten
  werden eingebettet – alles andere blockiert die Inhaltsrichtlinie des
  Artifacts stillschweigend.
* **Keine Gerüst-Tags** (`<html>`, `<head>`, `<body>`, Doctype) in
  `dist/index.html`; die ergänzt das Artifact beim Veröffentlichen.
* **Farben nur über Token** aus `:root`. Ein Farbwert, der ausschließlich im
  dunklen Zweig steht, macht die Seite in der Systemvorgabe unlesbar – der
  Build-Test schlägt darauf an.
* **Oberfläche und Daten sind deutsch.** Bezeichner im Code ebenfalls, damit
  Code und Inhalt dieselbe Sprache sprechen.
* **Jede neue Funktion** bekommt eine Kennung in
  `Dokumentation/features/FEATURES.md`, einen Eintrag im `CHANGELOG.md` und
  mindestens einen Testfall.
* Version in `package.json` und Datenversion in `data/eintraege.json` werden
  getrennt geführt; die Regeln stehen im `CHANGELOG.md`.

* **Aufnahmen liegen im Browser des Betrachters** (`localStorage`, Schlüssel
  `screenarchiv:eingang`). Kein Schreibzugriff auf `data/` zur Laufzeit – der
  Weg dorthin führt über „Als JSON sichern“.

## Veröffentlichen

Nur `dist/index.html` an das Artifact-Werkzeug geben. Aktualisierungen gehen
über denselben Dateipfad, damit die Adresse erhalten bleibt. Die Seite braucht
beim Veröffentlichen die Fähigkeit `downloads` (Sichern des Eingangs).
