# Screenarchiv

Bilddatenbank für Bildschirmaufnahmen aus dem Browser. Jeder Beleg besteht aus
einer Aufnahme **vorher**, einer Aufnahme **nachher** und der **Begründung**,
warum geändert wurde – samt gemessener Wirkung. Abgelöste Belege bleiben im
Archiv auffindbar.

Ergebnis ist eine einzelne, in sich geschlossene HTML-Datei
(`dist/index.html`), die über das Artifact-Werkzeug veröffentlicht wird.

## Loslegen

```bash
npm install        # nur für die Browserprüfung nötig
npm run alles      # Aufnahmen erzeugen, Seite bauen, alles prüfen
```

Einzeln:

| Befehl | Wirkung |
| --- | --- |
| `npm run screens` | erzeugt aus `data/eintraege.json` die 40 Aufnahmen in `data/screens/` |
| `npm run build` | setzt Daten, Aufnahmen, Logik, Stil und Oberfläche zu `dist/index.html` zusammen |
| `npm test` | 65 Prüfungen: Daten, Kernlogik, Aufnahmen, Build, Oberfläche im Browser |
| `npm run test:e2e` | nur die Browserprüfung |

## Aufbau

```
data/           Inhalt: Bestand, Schema, Generator, erzeugte Aufnahmen
app/            Anwendung: Kernlogik, Oberfläche, Stil, Build
dist/           Ergebnis des Builds – wird veröffentlicht, nicht bearbeitet
Dokumentation/  Feature-Katalog mit Versionierung, Architektur, Testkonzept
Testing/        Testrunner, Helfer, Testfälle
.claude/        Projektgedächtnis-Ergänzungen, Skill, Freigaben
```

Die Trennung ist bewusst: `data/` kennt die Oberfläche nicht, `app/src/core.mjs`
kennt kein DOM (und ist deshalb ohne Browser prüfbar), `dist/` ist reines
Ergebnis.

## Funktionsumfang

Suche über den Volltext aller Begründungen, Facettenfilter mit mitlaufenden
Zählern, Archivumschalter, vier Sortierungen, Detailansicht mit drei
Vergleichsarten (Schieberegler, nebeneinander, umschalten), Kennzahlenvergleich
mit gerichteter Wirkungsberechnung, Zustand in der Adresszeile, Tastaturbedienung,
helles und dunkles Thema.

Der vollständige Katalog mit Versionen steht in
[`Dokumentation/features/FEATURES.md`](Dokumentation/features/FEATURES.md).

## Beispielbestand

20 Belege aus vier fiktiven Anwendungen, Zeitraum April 2024 bis Juni 2025,
darunter vier archivierte und zwei verworfene Varianten. Die Aufnahmen sind
gezeichnete Oberflächen (SVG), keine Fotos – echte Aufnahmen ersetzen sie
später ohne Änderung am Datenmodell.
