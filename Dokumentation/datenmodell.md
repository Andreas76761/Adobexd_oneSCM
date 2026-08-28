# Datenmodell

Maßgeblich ist `data/schema/eintraege.schema.json`; dieses Dokument erklärt die
Absicht hinter den Feldern. Der Test „entspricht dem JSON-Schema“ prüft den
Bestand bei jedem Lauf.

## Kopf

| Feld | Beispiel | Bedeutung |
| --- | --- | --- |
| `version` | `"1.0.0"` | Version des Datenaufbaus, nicht des Bestands |
| `stand` | `"2025-06-30"` | Datenstand, erscheint im Seitenfuß |
| `vokabular` | – | erlaubte Werte für Projekt, Kategorie, Status, Aufnahmeformat |

Ein Beleg darf nur Werte aus dem Vokabular verwenden – geprüft von
„nutzt ausschließlich Werte aus dem Vokabular“. So bleiben die Facetten
vollständig und schreibweisenrein.

## Beleg

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `id` | ja | `SCR-JJJJ-NNN`, eindeutig, erscheint als Kennung |
| `titel` | ja | Was wurde geändert – aus Sicht der Nutzenden formuliert |
| `projekt`, `seite` | ja | Anwendung und Seitenpfad, auf dem die Aufnahme entstand |
| `kategorie` | ja | Art der Änderung (Layout, Barrierefreiheit, …) |
| `status` | ja | `übernommen`, `in Prüfung`, `verworfen` |
| `viewport` | ja | Aufnahmeformat, verweist auf `vokabular.viewports[].id` |
| `browser`, `autor` | ja | Herkunft der Aufnahme |
| `datum` | ja | Belegdatum; muss dem Datum der Nachher-Aufnahme entsprechen |
| `tags` | ja | Schlagworte, gehen in die Suche ein |
| `begruendung` | ja | `anlass`, `aenderung`, `wirkung`, `quelle` |
| `metriken` | ja | Liste gemessener Kennzahlen |
| `archiviert` | ja | steuert die Ansicht Aktiv/Archiv |
| `archiviert_am`, `archiv_grund` | wenn archiviert | Datum und Grund der Ablösung |
| `screen` | ja | Archetyp und die Schalter je Aufnahme |

## Kennzahl

```json
{ "name": "Abbruchquote", "einheit": "%", "vorher": 24.5, "nachher": 16.2,
  "richtung": "kleiner_besser" }
```

`richtung` entscheidet, ob ein Rückgang eine Verbesserung ist. Ohne dieses Feld
ließe sich „Abbruchquote 24,5 → 16,2“ nicht von „Erfolgsquote 24,5 → 16,2“
unterscheiden. `vorher` darf nicht 0 sein, sonst ist die relative Wirkung nicht
definiert – beides wird geprüft.

## Regeln, die über das Schema hinausgehen

Diese Regeln setzt `Testing/tests/01-daten.test.mjs` durch:

1. Kennungen sind eindeutig.
2. Die Vorher-Aufnahme ist älter als die Nachher-Aufnahme.
3. Das Belegdatum entspricht dem Datum der Nachher-Aufnahme.
4. Vorher und Nachher unterscheiden sich in mindestens einem Schalter – sonst
   zeigte der Vergleich nichts.
5. Archivierte Belege haben Datum **und** einen Grund von mehr als 20 Zeichen;
   nicht archivierte haben kein Archivdatum.
6. Alle vier Begründungsfelder sind gefüllt.
7. Verworfene Belege erklären im Wirkungstext, warum verworfen wurde.
8. Jeder Beleg hat mindestens eine Kennzahl mit unterschiedlichen Werten.

## Neuen Beleg aufnehmen

1. Eintrag in `data/eintraege.json` ergänzen (Kennung fortlaufend).
2. `npm run screens` – erzeugt beide Aufnahmen.
3. `npm run build` – schreibt die Seite neu.
4. `npm test` – prüft Daten, Aufnahmen, Build und Oberfläche.

Neue Belege sind ein Patch (`1.0.1`), neue Felder ein Minor.
