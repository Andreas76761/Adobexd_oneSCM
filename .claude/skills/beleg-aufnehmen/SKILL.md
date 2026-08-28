---
name: beleg-aufnehmen
description: Nimmt einen neuen Vorher/Nachher-Beleg in das Screenarchiv auf - Datensatz anlegen, Aufnahmen erzeugen, Seite bauen, Prüfungen laufen lassen und die Dokumentation nachziehen. Auch für die Übernahme gesicherter Aufnahmen aus dem Eingang. Verwenden, wenn eine Bildschirmänderung dokumentiert, ein Beleg ergänzt, ein Beleg archiviert oder der Bestand des Archivs gepflegt werden soll.
---

# Beleg in das Screenarchiv aufnehmen

## Wann

Wenn eine Änderung an einer Bildschirmoberfläche belegt werden soll: eine
Aufnahme vorher, eine nachher, die Begründung und die gemessene Wirkung.

## Fehlende Angaben zuerst klären

Ein Beleg ohne Begründung ist wertlos. Vor dem Anlegen müssen vorliegen:

1. **Anlass** – welches Problem war zu sehen, und woher weiß man das
2. **Änderung** – was wurde konkret anders gemacht
3. **Wirkung** – was kam heraus, mit Zahl wenn vorhanden
4. **Quelle** – Test, Audit, Telemetrie, Ticket, mit Datum oder Kennung
5. **Kennzahlen** – Name, Einheit, Wert vorher, Wert nachher und die Richtung
   (`kleiner_besser` oder `groesser_besser`)

Fehlt eines davon, nachfragen statt erfinden. Die Datenprüfung weist
unvollständige Belege ohnehin ab.

## Ablauf

1. **Kennung vergeben** – `SCR-<Jahr>-<laufende Nummer, dreistellig>`, an das
   Ende von `data/eintraege.json` anfügen.
2. **Vokabular prüfen** – `projekt`, `kategorie`, `status` und `viewport`
   müssen im Kopf der Datei unter `vokabular` stehen. Neuer Wert heißt: erst
   das Vokabular ergänzen, sonst schlägt der Datentest fehl.
3. **Aufnahmen beschreiben** – unter `screen` einen der sechs Archetypen wählen
   (`uebersicht`, `liste`, `formular`, `checkout`, `fehler`, `diagramm`) und in
   `vorher` / `nachher` **nur die Schalter unterschiedlich setzen, um die es im
   Beleg geht**. Verfügbare Schalter: `kontrast`, `dichte`, `hierarchie`,
   `primaer`, `symbole`, `fehlerAmFeld`, `leerzustand`, `spalten`, `hinweis`,
   `doppelachse`, `skelett`, `sticky`, `suchfeld`, `panel`.
4. **Daten stimmig halten** – `datum` entspricht dem Datum der Nachher-Aufnahme,
   die Vorher-Aufnahme ist älter. Wird archiviert: `archiviert: true`,
   `archiviert_am` und ein `archiv_grund` von mehr als 20 Zeichen.
5. **Erzeugen und prüfen**

   ```bash
   npm run alles     # screens → build → test
   ```

6. **Bestand fortschreiben** – neue Belege sind ein Patch: Version in
   `package.json` erhöhen und im `Dokumentation/CHANGELOG.md` vermerken. Neue
   Felder oder Schalter sind ein Minor und brauchen zusätzlich einen Eintrag im
   Feature-Katalog sowie einen Testfall.

## Aus dem Eingang in den Bestand

Die veröffentlichte Seite hat einen Aufnahmemodus: dort entstehen einzelne
Bilder, die im Browser des Betrachters liegen und über „Als JSON sichern“
herauskommen. Diese Aufnahmen sind **keine Belege** – ein Beleg braucht zwei
Bilder und eine Begründung.

Aus einer gesicherten Datei entsteht ein Beleg so:

1. Zwei Aufnahmen desselben Zusammenhangs suchen (Rolle `vorher` / `nachher`).
2. Deren Metadaten in einen neuen Eintrag in `data/eintraege.json` übertragen.
3. Die vier Begründungsfelder ergänzen – sie fehlen im Eingang und sind der
   eigentliche Wert des Belegs.
4. Kennzahlen mit Richtung ergänzen.
5. `screen.archetyp` und die Schalter setzen, damit der Generator die Aufnahmen
   zeichnet. Die Bilder aus dem Eingang ersetzen die erzeugten Aufnahmen nicht
   automatisch; sie dienen als Vorlage für die Beschreibung.

## Verwerfen und Archivieren

* **Verworfen** ist ein Status, kein Löschgrund: Der Beleg bleibt sichtbar und
  erklärt im Wirkungstext, warum die Variante nicht kam. Der Test verlangt das
  Wort „verworfen“ in diesem Text.
* **Archiviert** heißt abgelöst, nicht falsch. Der Grund nennt, was an die
  Stelle getreten ist.

## Nicht tun

* `dist/index.html` von Hand ändern – die Datei wird erzeugt.
* Aufnahmen in `data/screens/` bearbeiten – sie werden bei jedem Lauf neu
  geschrieben.
* Externe Bildadressen eintragen – im Artifact werden sie blockiert.
