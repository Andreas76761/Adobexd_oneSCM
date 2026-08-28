# Dokumentation – Screenarchiv

Bilddatenbank für Bildschirmaufnahmen aus dem Browser: jeder Beleg besteht aus
einer Aufnahme *vorher*, einer Aufnahme *nachher* und der Begründung, warum
geändert wurde. Abgelöste Belege bleiben im Archiv erhalten.

| Dokument | Inhalt |
| --- | --- |
| [features/FEATURES.md](features/FEATURES.md) | Katalog aller Funktionen mit Version, Umsetzung und zugehörigem Test |
| [CHANGELOG.md](CHANGELOG.md) | Versionsverlauf und Versionierungsregeln |
| [versionen/v1.0.0.md](versionen/v1.0.0.md) | Ausgabehinweise zur jeweiligen Version |
| [architektur.md](architektur.md) | Ordnerstruktur, Datenfluss, Build |
| [datenmodell.md](datenmodell.md) | Felder eines Belegs, Vokabular, Regeln |
| [gestaltung.md](gestaltung.md) | Farben, Schriften, Layout und deren Prüfung |
| [testkonzept.md](testkonzept.md) | Teststufen, Ausführung, Abdeckung |

## Kurzanleitung

```bash
npm install          # nur für die Browserprüfung nötig (playwright-core)
npm run screens      # Aufnahmen aus den Daten erzeugen  → data/screens/
npm run build        # Seite zusammensetzen              → dist/index.html
npm test             # alle Prüfungen
npm run alles        # die drei Schritte nacheinander
```

Veröffentlicht wird ausschließlich `dist/index.html` über das Artifact-Werkzeug.
