# Dokumentation – Screenarchiv

Bilddatenbank für Bildschirmaufnahmen aus dem Browser: jeder Beleg besteht aus
einer Aufnahme *vorher*, einer Aufnahme *nachher* und der Begründung, warum
geändert wurde. Abgelöste Belege bleiben im Archiv erhalten.

| Dokument | Inhalt |
| --- | --- |
| [features/FEATURES.md](features/FEATURES.md) | Katalog aller Funktionen mit Version, Umsetzung und zugehörigem Test |
| [CHANGELOG.md](CHANGELOG.md) | Versionsverlauf und Versionierungsregeln |
| [versionen/v1.9.0.md](versionen/v1.9.0.md) | Beipackzettel – Metadaten neben jedem abgelegten Bild |
| [versionen/v1.8.0.md](versionen/v1.8.0.md) | Aufnahmen im Archiv sichtbar – und wohin sie gehen |
| [versionen/v1.7.0.md](versionen/v1.7.0.md) | Ausschneiden – Schnipsel mit wählbarer Ablage |
| [versionen/v1.6.0.md](versionen/v1.6.0.md) | Bilderstapel – der Weg ohne Zwischenablage |
| [versionen/v1.5.0.md](versionen/v1.5.0.md) | Kompakter Aufnahmemodus – Serien vom geteilten Bildschirm |
| [versionen/v1.4.0.md](versionen/v1.4.0.md) | Bereit zum Einfügen, ehrliche Fehlermeldungen |
| [versionen/v1.3.0.md](versionen/v1.3.0.md) | Bildschirmfoto aus der Zwischenablage – wenn die Freigabe gesperrt ist |
| [versionen/v1.2.0.md](versionen/v1.2.0.md) | Kontaktbogen – wie Aufnahmen die Seite verlassen |
| [versionen/v1.1.0.md](versionen/v1.1.0.md) | Aufnahme und Eingang – was neu ist und wo die Aufnahmen liegen |
| [versionen/v1.0.0.md](versionen/v1.0.0.md) | erste Fassung |
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
