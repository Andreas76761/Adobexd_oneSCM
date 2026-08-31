# Screenarchiv

Bilddatenbank für Bildschirmaufnahmen aus dem Browser. Jeder Beleg besteht aus
einer Aufnahme **vorher**, einer Aufnahme **nachher** und der **Begründung**,
warum geändert wurde – samt gemessener Wirkung. Abgelöste Belege bleiben im
Archiv auffindbar.

Dazu ein **Aufnahmemodus**: Quelle wählen, Bildschirmausschnitt aufziehen,
Metadaten und Datum eintragen, **Leertaste** – das Bild liegt sofort im
**Eingang**, wo Kategorie und Begriffe nachgetragen werden.

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
| `npm test` | 174 Prüfungen: Daten, Kernlogik, Aufnahmen, Build, Oberfläche, Aufnahmemodus |
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

**Archiv** – Suche über den Volltext aller Begründungen, Facettenfilter mit
mitlaufenden Zählern, Archivumschalter, vier Sortierungen, Detailansicht mit drei
Vergleichsarten (Schieberegler, nebeneinander, umschalten), Kennzahlenvergleich
mit gerichteter Wirkungsberechnung.

**Aufnahme** – vier Quellen (Bildschirmfreigabe, eingefügtes Bildschirmfoto,
Bilddatei oder ganzer Bilderstapel, Beispiel), kompakter Aufnahmemodus für
Serien vom geteilten Bildschirm,
Ausschnitt per Maus, Ecken, Vorgabeformaten oder Pfeiltasten, Metadaten und
Datum, Auslösen mit der Leertaste.

**Ausschneiden** – Bildschirm freigeben, Bereich aufziehen, beim Loslassen ist
der Schnipsel gemacht. Wohin er geht, wird vorher festgelegt: Eingang, ein
Ordner auf dem Rechner oder eine einzelne Datei, mit eigenem Namensmuster.

**Eingang** – Vorschau aller Aufnahmen, Marke für Unvollständiges, Nachtragen
von Kategorie, Begriffen und übrigen Angaben, Suche, Filter, Sortierung.
Sichern als **Kontaktbogen**: eine in sich geschlossene HTML-Datei mit allen
Bildern und Metadaten, im Browser zum PDF druckbar – oder als JSON.

Durchgehend: Zustand in der Adresszeile, Tastaturbedienung, helles und dunkles
Thema.

Der vollständige Katalog mit Versionen steht in
[`Dokumentation/features/FEATURES.md`](Dokumentation/features/FEATURES.md).

## Wo die Aufnahmen liegen

Aufgenommene Bilder liegen im Browser des Betrachters (`localStorage`) – die
veröffentlichte Seite hat keinen Server. Sie überstehen dort das Neuladen,
sind aber nicht zwischen Geräten geteilt. „Als JSON sichern“ reicht sie an
`data/eintraege.json` weiter, „Kontaktbogen sichern“ auf ein Laufwerk oder in
eine Ablage. Ein direkter Upload zu SharePoint ist nicht möglich – die Gründe
stehen in [`Dokumentation/versionen/v1.2.0.md`](Dokumentation/versionen/v1.2.0.md),
die Ablageentscheidung in
[`v1.1.0.md`](Dokumentation/versionen/v1.1.0.md).

## Beispielbestand

20 Belege aus vier fiktiven Anwendungen, Zeitraum April 2024 bis Juni 2025,
darunter vier archivierte und zwei verworfene Varianten. Die Aufnahmen sind
gezeichnete Oberflächen (SVG), keine Fotos – echte Aufnahmen ersetzen sie
später ohne Änderung am Datenmodell.
