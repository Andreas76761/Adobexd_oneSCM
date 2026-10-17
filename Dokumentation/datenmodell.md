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

## Eingangssatz (Aufnahme, ab v1.1.0)

Aufnahmen aus dem Aufnahmemodus sind **keine** Belege: ein Beleg braucht zwei
Bilder und eine Begründung, eine Aufnahme ist ein einzelnes Bild. Sie liegen
deshalb getrennt im Eingang und tragen ein eigenes Format:

| Feld | Bedeutung |
| --- | --- |
| `id` | `AUF-<Jahr>-<Nummer>`, je Jahr fortlaufend |
| `titel` | eigener Titel oder Vorschlag aus Projekt, Seite und Nummer |
| `projekt`, `seite` | wie beim Beleg, dürfen zunächst leer bleiben |
| `kategorie`, `status`, `rolle` | Rolle ist `vorher`, `nachher` oder `einzeln` |
| `begriffe` | vereinheitlichte Schlagworte, höchstens zwölf |
| `datum` | vom Betrachter angegeben, nie in der Zukunft |
| `notiz` | Freitext |
| `ausschnitt` | `x`, `y`, `breite`, `hoehe` in Bildpunkten der Quelle |
| `quelle` | `art` (`bildschirm`, `datei`, `beispiel`), `name`, `breite`, `hoehe` |
| `erfasst_am` | Zeitpunkt der Aufnahme |
| `bild` | **Vorschau** als JPEG-Datenadresse, 760 Bildpunkte breit |

Eine Aufnahme gilt als **vollständig**, sobald Titel, Projekt, Kategorie und
mindestens ein Begriff vorliegen. Bis dahin ist sie im Eingang markiert – das
ist der Sinn der Ansicht: schnell aufnehmen, später ordnen.

### Was später dazukam

| Feld | Seit | Bedeutung |
| --- | --- | --- |
| `herkunft` | 1.9.0 | `ordner`, `datei`, `zettel`, `uebernommen_am` – die abgelegte Datei |
| `marken` | 1.17.0 | Marken auf dem Bild: `art` (`unkenntlich`, `rahmen`, `schritt`, `label`), Lage, Text, Stufe, Nummer, Feld |
| `fassungen` | 1.18.0 | bearbeitete Fassungen: `nummer`, `bild`, `marken`, `notiz`, `erstellt_am`. Das Original bleibt unangetastet |
| `voll`, `breite`, `hoehe` | 1.20.0 | das volle Bild liegt in der Browserdatenbank; die Maße gehören zu ihm |
| `gliederung` | 1.21.0 | Stelle im Handbuch, z. B. `7.5.2`; Grundlage für Kapitelnummer und Zählung |
| `kapitel`, `unterkapitel` | 1.18.0 | abgeleitete Zahlen für die Sortierung |
| `sprache`, `rolle_label`, `sparte`, `markt`, `domaene`, `reiter`, `schritt_label` | 1.22.0 | Labels: feste Vokabulare für Sprache (21), Rolle (Dealer, Market, HQ, MO) und Sparte (Pkw, Van), freier Text für die übrigen |
| `einfuhr` | 1.24.0 | Herkunft aus dem Import: `datei`, `art`, `bild`, `seite`, `uebernommen_am` |
| `variante` | 1.30.0 | Kennung der Variantengruppe – dieselbe Maske in anderer Sprache, Rolle, Sparte oder Markt |

Alle Felder sind freiwillig: eine Aufnahme ohne Labels ist eine Aufnahme ohne
Labels, kein Fehler. Was fehlt, zählen die Agenten (F-43) und die
Deckungsmatrix (F-46).

## Was neben dem Eingang im Browser liegt

| Schlüssel | Inhalt |
| --- | --- |
| `screenarchiv:strecken` | Klickstrecken: `{ id, name, spalten, schritte: [{ art, aufnahmen: [...], text }] }` |
| `screenarchiv:ablage` | Ablageziele und Namensmuster der Ansicht Ausschneiden |
| `screenarchiv:design` | Einstellungen des Designstudios samt eigener Vorlagen |
| `screenarchiv:verzeichnis` | Muster und Schalter der Ansicht Verzeichnis |
| `screenarchiv:chat` | Lage, Größe und Zustand des Suchchats |

Ein Streckenschritt trägt seit 1.25.0 eine **Liste** von Bildern (`aufnahmen`)
und eine `art`: `schritt` oder `platzhalter`. Der alte Satz mit einem Bild je
Schritt wandert beim Lesen mit.

## Die Gliederung des Handbuchs

`data/gliederung/gliederung.json` trägt 1153 Stellen aus der Arbeitsmappe des
Projekts:

```json
{ "eintraege": [ { "nummer": "7.5.2", "thema": "Signaturergebnis", "ebene": 3,
                   "kriterium": 12, "notiz": 4, "text": 0 } ],
  "texte": [ "…" ] }
```

`kriterium`, `notiz` und `text` verweisen in die Tabelle `texte` – dieselbe
Begründung steht an 159 Stellen, sie tausendfach abzulegen wäre Verschwendung.
`art: "uebergang"` kennzeichnet die sieben Übergänge zwischen Kapiteln; sie
zählen nicht als Stelle.

Aus Aufnahmen werden Belege, indem man sie als JSON sichert und in
`data/eintraege.json` einträgt: zwei Aufnahmen desselben Zusammenhangs werden
zu `vorher` und `nachher`, die Begründung kommt hinzu.

## Neuen Beleg aufnehmen

1. Eintrag in `data/eintraege.json` ergänzen (Kennung fortlaufend).
2. `npm run screens` – erzeugt beide Aufnahmen.
3. `npm run build` – schreibt die Seite neu.
4. `npm test` – prüft Daten, Aufnahmen, Build und Oberfläche.

Neue Belege sind ein Patch (`1.0.1`), neue Felder ein Minor.
